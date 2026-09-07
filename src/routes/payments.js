import { Hono } from "hono";
import { z } from "zod";
import { first, run, now } from "../lib/db.js";
import { ApiError } from "../middleware/errorHandler.js";
import { getPaymentProvider } from "../integrations/payments/index.js";
import { hashPassword } from "../lib/password.js";
import { generateUniqueCodes, randomHex, newId } from "../lib/voucherCode.js";
import { getMikrotikAdapter } from "../integrations/mikrotik/index.js";
import { writeAuditLog } from "../lib/audit.js";
import { authenticate } from "../middleware/auth.js";

const payments = new Hono();

// Unlike the other route files, this router mixes a public endpoint
// (/webhook) with authenticated ones (/create, /:id/status) -- exactly like
// the original Express app did -- so `authenticate` is applied per-route
// here instead of once for the whole router in src/index.js.

const createSchema = z.object({
  planId: z.string(),
  routerId: z.string(),
  phone: z.string().min(6),
  method: z.enum(["CASH", "MANUAL", "MOBILE_MONEY", "GATEWAY"]),
  provider: z.string().optional(), // e.g. "mpesa" — required for MOBILE_MONEY/GATEWAY
  idempotencyKey: z.string().min(8),
});

/**
 * Creates a payment record + (for mobile money/gateway) kicks off the
 * provider's payment flow. The voucher/package is NEVER activated here —
 * only once the webhook confirms success (see POST /webhook below).
 * NOTE: this route is registered under `authenticate` in src/index.js.
 */
payments.post("/create", authenticate, async (c) => {
  const parsed = createSchema.safeParse(await c.req.json());
  if (!parsed.success) throw new ApiError(400, "Invalid payment request", parsed.error.issues);
  const body = parsed.data;
  const db = c.env.DB;

  const existing = await first(db, `SELECT * FROM "Transaction" WHERE idempotencyKey = ?`, [body.idempotencyKey]);
  if (existing) return c.json(existing); // idempotent replay

  const [plan, routerRow] = await Promise.all([
    first(db, `SELECT * FROM Plan WHERE id = ?`, [body.planId]),
    first(db, `SELECT * FROM Router WHERE id = ?`, [body.routerId]),
  ]);
  if (!plan || !routerRow) throw new ApiError(404, "Plan or router not found");

  const reference = `TXN-${Date.now().toString(36).toUpperCase()}`;
  const transactionId = newId();
  const status = body.method === "CASH" ? "SUCCESS" : "PENDING";
  await run(
    db,
    `INSERT INTO "Transaction" (id, reference, amount, method, provider, routerId, status, idempotencyKey, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [transactionId, reference, plan.price, body.method, body.provider || null, routerRow.id, status, body.idempotencyKey, now(), now()]
  );

  if (body.method === "CASH") {
    await activateVoucherForTransaction(db, c.env, transactionId, plan, routerRow);
    return c.json(await first(db, `SELECT * FROM "Transaction" WHERE id = ?`, [transactionId]), 201);
  }

  if (!body.provider) throw new ApiError(400, "provider is required for mobile money / gateway payments");
  const gateway = await getPaymentProvider(body.provider, c.env);
  const result = await gateway.createPayment({ amount: Number(plan.price), phone: body.phone, reference });

  await run(
    db,
    `INSERT INTO Payment (id, transactionId, provider, externalId, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [newId(), transactionId, body.provider, result.externalId || null, result.status || "PENDING", now(), now()]
  );

  return c.json({ transaction: await first(db, `SELECT * FROM "Transaction" WHERE id = ?`, [transactionId]), gateway: result }, 201);
});

payments.get("/:id/status", authenticate, async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const transaction = await first(db, `SELECT * FROM "Transaction" WHERE id = ?`, [id]);
  if (!transaction) throw new ApiError(404, "Transaction not found");
  const payment = await first(db, `SELECT * FROM Payment WHERE transactionId = ?`, [id]);
  return c.json({ ...transaction, payment });
});

/**
 * Webhook — reads the raw request body itself (rather than relying on
 * global JSON-parsing middleware) so the provider's HMAC signature can be
 * verified against the exact bytes received.
 * Idempotent: replays of the same externalId short-circuit to the stored result.
 * This route is mounted PUBLICLY (no authenticate middleware) in src/index.js.
 */
payments.post("/webhook", async (c) => {
  const db = c.env.DB;
  const providerKey = c.req.query("provider"); // e.g. ?provider=mpesa
  const gateway = await getPaymentProvider(providerKey, c.env);
  const rawBody = await c.req.raw.clone().arrayBuffer();

  const result = await gateway.handleCallback({ headers: c.req.raw.headers, rawBody });

  const payment = await first(db, `SELECT * FROM Payment WHERE externalId = ?`, [result.externalId]);
  if (!payment) return c.json({ ok: true, note: "No matching payment (ignored)" }, 202);

  if (payment.webhookVerified) {
    return c.json({ ok: true, idempotent: true }); // already processed
  }

  await run(db, `UPDATE Payment SET status=?, webhookVerified=1, updatedAt=? WHERE id=?`, [result.status, now(), payment.id]);
  await run(db, `UPDATE "Transaction" SET status=?, rawWebhook=?, updatedAt=? WHERE id=?`, [
    result.status,
    JSON.stringify(result.raw ?? null),
    now(),
    payment.transactionId,
  ]);

  if (result.status === "SUCCESS") {
    const transaction = await first(db, `SELECT * FROM "Transaction" WHERE id = ?`, [payment.transactionId]);
    const routerRow = await first(db, `SELECT * FROM Router WHERE id = ?`, [transaction.routerId]);
    // Simplified lookup for demo purposes, matching the original backend's behaviour.
    const plan = await first(db, `SELECT * FROM Plan WHERE price = ?`, [transaction.amount]);
    if (plan) await activateVoucherForTransaction(db, c.env, transaction.id, plan, routerRow);
  }

  await writeAuditLog(db, { action: "PAYMENT_WEBHOOK_PROCESSED", resource: "Payment", resourceId: payment.id, metadata: { status: result.status } });
  return c.json({ ok: true });
});

/**
 * Shared logic: once a payment is confirmed successful, generate+activate a
 * single voucher and attach it to the transaction.
 * NOTE: D1 doesn't support Prisma-style nested transactions across a mix of
 * a network call (MikroTik) and multiple writes, so this sequences the
 * MikroTik call first — the same ordering the original code used — and
 * only writes to D1 once that succeeds.
 */
async function activateVoucherForTransaction(db, env, transactionId, plan, routerRow) {
  const credential = await first(db, `SELECT * FROM RouterCredential WHERE routerId = ?`, [routerRow.id]);
  const adapter = await getMikrotikAdapter(routerRow, credential, env);
  const [code] = generateUniqueCodes(1, 8, "CHOPA");
  const plainPassword = randomHex(4);

  try {
    await adapter.createHotspotUser({ username: code, password: plainPassword, profile: plan.name });
  } finally {
    await adapter.disconnect();
  }

  const voucherId = newId();
  await run(
    db,
    `INSERT INTO Voucher (id, code, username, passwordHash, planId, routerId, status, mikrotikSynced, activatedAt, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', 1, ?, ?, ?)`,
    [voucherId, code, code, await hashPassword(plainPassword), plan.id, routerRow.id, now(), now(), now()]
  );
  await run(db, `UPDATE "Transaction" SET voucherId=?, updatedAt=? WHERE id=?`, [voucherId, now(), transactionId]);
  return voucherId;
}

export default payments;
