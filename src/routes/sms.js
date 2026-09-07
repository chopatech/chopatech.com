import { Hono } from "hono";
import { z } from "zod";
import { all, run, first, now } from "../lib/db.js";
import { ApiError } from "../middleware/errorHandler.js";
import { getSmsProvider } from "../integrations/sms/index.js";
import { writeAuditLog } from "../lib/audit.js";
import { newId } from "../lib/voucherCode.js";

const sms = new Hono();

sms.get("/balance", async (c) => {
  return c.json(await getSmsProvider(c.env).getBalance());
});

sms.get("/messages", async (c) => {
  return c.json(await all(c.env.DB, `SELECT * FROM SMSMessage ORDER BY createdAt DESC LIMIT 100`));
});

const sendSchema = z.object({ to: z.string().min(6), body: z.string().min(1), template: z.string().optional() });

sms.post("/send", async (c) => {
  const parsed = sendSchema.safeParse(await c.req.json());
  if (!parsed.success) throw new ApiError(400, "Invalid SMS request", parsed.error.issues);
  const { to, body, template } = parsed.data;
  const db = c.env.DB;
  const user = c.get("user");

  const provider = getSmsProvider(c.env);
  const result = await provider.sendSms({ to, body });

  const id = newId();
  await run(
    db,
    `INSERT INTO SMSMessage (id, "to", body, template, status, providerRef, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, to, body, template || null, result.ok ? "SENT" : "FAILED", result.providerRef || null, now()]
  );
  await writeAuditLog(db, { userId: user?.id, action: "SMS_SENT", resource: "SMSMessage", resourceId: id, ip: c.req.header("cf-connecting-ip"), metadata: { mock: !!result.mock } });
  const record = await first(db, `SELECT * FROM SMSMessage WHERE id = ?`, [id]);
  return c.json({ ...record, mock: !!result.mock }, 201);
});

export default sms;
