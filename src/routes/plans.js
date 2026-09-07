import { Hono } from "hono";
import { z } from "zod";
import { all, first, run, now } from "../lib/db.js";
import { requireRole } from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";
import { writeAuditLog } from "../lib/audit.js";
import { newId } from "../lib/voucherCode.js";

const plans = new Hono();

plans.get("/", async (c) => {
  return c.json(await all(c.env.DB, `SELECT * FROM Plan WHERE deletedAt IS NULL ORDER BY price ASC`));
});

const planSchema = z.object({
  name: z.string().min(1),
  price: z.number().nonnegative(),
  durationMins: z.number().int().positive(),
  downloadMbps: z.number().int().positive().optional(),
  uploadMbps: z.number().int().positive().optional(),
  dataLimitMb: z.number().int().positive().optional(),
  simultaneous: z.number().int().positive().default(1),
  routerId: z.string().optional(),
});

plans.post("/", requireRole("SUPER_ADMIN", "ADMIN", "MANAGER"), async (c) => {
  const parsed = planSchema.safeParse(await c.req.json());
  if (!parsed.success) throw new ApiError(400, "Invalid plan details", parsed.error.issues);
  const body = parsed.data;
  const db = c.env.DB;
  const user = c.get("user");
  const id = newId();

  await run(
    db,
    `INSERT INTO Plan (id, name, price, durationMins, downloadMbps, uploadMbps, dataLimitMb, simultaneous, routerId, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)`,
    [id, body.name, body.price, body.durationMins, body.downloadMbps ?? null, body.uploadMbps ?? null, body.dataLimitMb ?? null, body.simultaneous, body.routerId ?? null, now(), now()]
  );
  // NOTE: creating the RouterOS hotspot user-profile that matches this plan
  // happens in voucher generation / a dedicated sync job — see
  // src/integrations/mikrotik/RouterOsAdapter.js for the supported API calls.
  await writeAuditLog(db, { userId: user.id, action: "PLAN_CREATED", resource: "Plan", resourceId: id, ip: c.req.header("cf-connecting-ip") });
  return c.json(await first(db, `SELECT * FROM Plan WHERE id = ?`, [id]), 201);
});

plans.put("/:id", requireRole("SUPER_ADMIN", "ADMIN", "MANAGER"), async (c) => {
  const db = c.env.DB;
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json();

  await run(
    db,
    `UPDATE Plan SET name=COALESCE(?,name), price=COALESCE(?,price), durationMins=COALESCE(?,durationMins),
     downloadMbps=COALESCE(?,downloadMbps), uploadMbps=COALESCE(?,uploadMbps), dataLimitMb=COALESCE(?,dataLimitMb),
     simultaneous=COALESCE(?,simultaneous), status=COALESCE(?,status), updatedAt=? WHERE id=?`,
    [body.name ?? null, body.price ?? null, body.durationMins ?? null, body.downloadMbps ?? null, body.uploadMbps ?? null, body.dataLimitMb ?? null, body.simultaneous ?? null, body.status ?? null, now(), id]
  );
  const plan = await first(db, `SELECT * FROM Plan WHERE id = ?`, [id]);
  if (!plan) throw new ApiError(404, "Plan not found");
  await writeAuditLog(db, { userId: user.id, action: "PLAN_UPDATED", resource: "Plan", resourceId: id, ip: c.req.header("cf-connecting-ip") });
  return c.json(plan);
});

plans.delete("/:id", requireRole("SUPER_ADMIN", "ADMIN"), async (c) => {
  const db = c.env.DB;
  const user = c.get("user");
  const id = c.req.param("id");
  await run(db, `UPDATE Plan SET deletedAt=?, status='DISABLED' WHERE id=?`, [now(), id]);
  await writeAuditLog(db, { userId: user.id, action: "PLAN_DELETED", resource: "Plan", resourceId: id, ip: c.req.header("cf-connecting-ip") });
  return c.body(null, 204);
});

export default plans;
