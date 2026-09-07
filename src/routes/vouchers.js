import { Hono } from "hono";
import { z } from "zod";
import { all, first, run, now } from "../lib/db.js";
import { requireRole } from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";
import { generateUniqueCodes, randomHex, newId } from "../lib/voucherCode.js";
import { hashPassword } from "../lib/password.js";
import { getMikrotikAdapter } from "../integrations/mikrotik/index.js";
import { writeAuditLog } from "../lib/audit.js";

const vouchers = new Hono();

vouchers.get("/", async (c) => {
  const { status, routerId, q } = c.req.query();
  const db = c.env.DB;
  const clauses = [];
  const params = [];
  if (status) { clauses.push("v.status = ?"); params.push(status); }
  if (routerId) { clauses.push("v.routerId = ?"); params.push(routerId); }
  if (q) { clauses.push("v.code LIKE ?"); params.push(`%${q}%`); }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const rows = await all(
    db,
    `SELECT v.*, p.name AS planName, p.price AS planPrice, r.name AS routerName
     FROM Voucher v LEFT JOIN Plan p ON p.id = v.planId LEFT JOIN Router r ON r.id = v.routerId
     ${where} ORDER BY v.createdAt DESC LIMIT 200`,
    params
  );
  const shaped = rows.map((row) => ({
    ...row,
    plan: row.planName ? { name: row.planName, price: row.planPrice } : null,
    router: row.routerName ? { name: row.routerName } : null,
  }));
  return c.json(shaped);
});

const genSchema = z.object({
  quantity: z.number().int().min(1).max(500), // capped lower than the original 5000 — see README (Worker CPU-time note)
  planId: z.string(),
  routerId: z.string(),
  prefix: z.string().max(12).default("CHOPA"),
  codeLength: z.number().int().min(6).max(16).default(8),
  expiresInMins: z.number().int().positive().optional(),
});

/**
 * Generates a voucher batch. A voucher is only ever marked AVAILABLE in the
 * database after the MikroTik hotspot user was created successfully.
 * Partial failures are recorded, not hidden.
 */
vouchers.post("/generate", requireRole("SUPER_ADMIN", "ADMIN", "MANAGER", "RESELLER"), async (c) => {
  const parsed = genSchema.safeParse(await c.req.json());
  if (!parsed.success) throw new ApiError(400, "Invalid voucher generation request", parsed.error.issues);
  const body = parsed.data;
  const db = c.env.DB;
  const user = c.get("user");

  const [plan, routerRow, credential] = await Promise.all([
    first(db, `SELECT * FROM Plan WHERE id = ?`, [body.planId]),
    first(db, `SELECT * FROM Router WHERE id = ?`, [body.routerId]),
    first(db, `SELECT * FROM RouterCredential WHERE routerId = ?`, [body.routerId]),
  ]);
  if (!plan) throw new ApiError(404, "Plan not found");
  if (!routerRow) throw new ApiError(404, "Router not found");

  const batchId = newId();
  await run(
    db,
    `INSERT INTO VoucherBatch (id, quantity, prefix, codeLength, planId, routerId, createdById, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [batchId, body.quantity, body.prefix, body.codeLength, plan.id, routerRow.id, user.id, now()]
  );

  const codes = generateUniqueCodes(body.quantity, body.codeLength, body.prefix);
  const adapter = await getMikrotikAdapter(routerRow, credential, c.env);

  let succeeded = 0;
  let failed = 0;
  const failures = [];

  try {
    for (const code of codes) {
      const plainPassword = randomHex(4);
      try {
        await adapter.createHotspotUser({ username: code, password: plainPassword, profile: plan.name });
        await run(
          db,
          `INSERT INTO Voucher (id, code, username, passwordHash, planId, routerId, batchId, status, mikrotikSynced, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'AVAILABLE', 1, ?, ?)`,
          [newId(), code, code, await hashPassword(plainPassword), plan.id, routerRow.id, batchId, now(), now()]
        );
        succeeded++;
      } catch (mikrotikErr) {
        // DO NOT create a voucher row that looks successful — record the failure instead.
        failed++;
        failures.push({ code, error: mikrotikErr.message });
      }
    }
  } finally {
    await adapter.disconnect();
  }

  await run(db, `UPDATE VoucherBatch SET succeeded=?, failed=? WHERE id=?`, [succeeded, failed, batchId]);
  await writeAuditLog(db, {
    userId: user.id,
    action: "VOUCHER_BATCH_GENERATED",
    resource: "VoucherBatch",
    resourceId: batchId,
    ip: c.req.header("cf-connecting-ip"),
    metadata: { requested: body.quantity, succeeded, failed },
  });

  return c.json({ batchId, requested: body.quantity, created: succeeded, failed, failures: failures.slice(0, 20) }, 201);
});

vouchers.post("/:id/disable", requireRole("SUPER_ADMIN", "ADMIN", "MANAGER"), async (c) => {
  const db = c.env.DB;
  const user = c.get("user");
  const id = c.req.param("id");
  const voucher = await first(db, `SELECT * FROM Voucher WHERE id = ?`, [id]);
  if (!voucher) throw new ApiError(404, "Voucher not found");
  const routerRow = await first(db, `SELECT * FROM Router WHERE id = ?`, [voucher.routerId]);
  const credential = await first(db, `SELECT * FROM RouterCredential WHERE routerId = ?`, [voucher.routerId]);
  const adapter = await getMikrotikAdapter(routerRow, credential, c.env);
  try {
    await adapter.disableHotspotUser(voucher.username);
  } finally {
    await adapter.disconnect();
  }

  await run(db, `UPDATE Voucher SET status='DISABLED', updatedAt=? WHERE id=?`, [now(), id]);
  await writeAuditLog(db, { userId: user.id, action: "VOUCHER_DISABLED", resource: "Voucher", resourceId: id, ip: c.req.header("cf-connecting-ip") });
  return c.json(await first(db, `SELECT * FROM Voucher WHERE id = ?`, [id]));
});

export default vouchers;
