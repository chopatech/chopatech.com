import { Hono } from "hono";
import { z } from "zod";
import { all, first, run, now } from "../lib/db.js";
import { requireRole } from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";
import { encrypt } from "../lib/crypto.js";
import { getMikrotikAdapter } from "../integrations/mikrotik/index.js";
import { writeAuditLog } from "../lib/audit.js";
import { newId } from "../lib/voucherCode.js";

const routers = new Hono();

routers.get("/", async (c) => {
  const rows = await all(c.env.DB, `SELECT * FROM Router WHERE deletedAt IS NULL ORDER BY createdAt ASC`);
  return c.json(rows); // never includes RouterCredential
});

routers.get("/:id", async (c) => {
  const r = await first(c.env.DB, `SELECT * FROM Router WHERE id = ?`, [c.req.param("id")]);
  if (!r) throw new ApiError(404, "Router not found");
  return c.json(r);
});

const createSchema = z.object({
  name: z.string().min(2),
  host: z.string().min(3),
  apiPort: z.number().int().default(8728),
  useSsl: z.boolean().default(false),
  username: z.string().min(1),
  password: z.string().min(1),
  location: z.string().optional(),
  description: z.string().optional(),
});

routers.post("/", requireRole("SUPER_ADMIN", "ADMIN"), async (c) => {
  const parsed = createSchema.safeParse(await c.req.json());
  if (!parsed.success) throw new ApiError(400, "Invalid router details", parsed.error.issues);
  const body = parsed.data;
  const db = c.env.DB;
  const user = c.get("user");

  const id = newId();
  await run(
    db,
    `INSERT INTO Router (id, name, host, apiPort, useSsl, location, description, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'CONNECTING', ?, ?)`,
    [id, body.name, body.host, body.apiPort, body.useSsl ? 1 : 0, body.location || null, body.description || null, now(), now()]
  );
  const encPassword = await encrypt(body.password, c.env.ROUTER_CREDENTIALS_ENCRYPTION_KEY);
  await run(
    db,
    `INSERT INTO RouterCredential (id, routerId, username, passwordEnc, updatedAt) VALUES (?, ?, ?, ?, ?)`,
    [newId(), id, body.username, encPassword, now()]
  );

  // Attempt an immediate connection so the admin gets instant feedback.
  const routerRow = await first(db, `SELECT * FROM Router WHERE id = ?`, [id]);
  try {
    const adapter = await getMikrotikAdapter(routerRow, { username: body.username, passwordEnc: encPassword }, c.env);
    const result = await adapter.testConnection();
    await run(db, `UPDATE Router SET status='ONLINE', routerOsVer=?, lastSeenAt=?, updatedAt=? WHERE id=?`, [
      result.routerOsVersion || null,
      now(),
      now(),
      id,
    ]);
  } catch {
    await run(db, `UPDATE Router SET status='ERROR', updatedAt=? WHERE id=?`, [now(), id]);
  }

  await writeAuditLog(db, { userId: user.id, action: "ROUTER_ADDED", resource: "Router", resourceId: id, ip: c.req.header("cf-connecting-ip") });
  return c.json(await first(db, `SELECT * FROM Router WHERE id = ?`, [id]), 201);
});

routers.put("/:id", requireRole("SUPER_ADMIN", "ADMIN"), async (c) => {
  const db = c.env.DB;
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json();

  await run(
    db,
    `UPDATE Router SET name=COALESCE(?,name), location=COALESCE(?,location), description=COALESCE(?,description),
     apiPort=COALESCE(?,apiPort), useSsl=COALESCE(?,useSsl), updatedAt=? WHERE id=?`,
    [body.name ?? null, body.location ?? null, body.description ?? null, body.apiPort ?? null, body.useSsl === undefined ? null : (body.useSsl ? 1 : 0), now(), id]
  );
  const updated = await first(db, `SELECT * FROM Router WHERE id = ?`, [id]);
  if (!updated) throw new ApiError(404, "Router not found");
  await writeAuditLog(db, { userId: user.id, action: "ROUTER_UPDATED", resource: "Router", resourceId: id, ip: c.req.header("cf-connecting-ip") });
  return c.json(updated);
});

routers.delete("/:id", requireRole("SUPER_ADMIN", "ADMIN"), async (c) => {
  const db = c.env.DB;
  const user = c.get("user");
  const id = c.req.param("id");
  await run(db, `UPDATE Router SET deletedAt=? WHERE id=?`, [now(), id]);
  await writeAuditLog(db, { userId: user.id, action: "ROUTER_DELETED", resource: "Router", resourceId: id, ip: c.req.header("cf-connecting-ip") });
  return c.body(null, 204);
});

routers.post("/:id/test", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const routerRow = await first(db, `SELECT * FROM Router WHERE id = ?`, [id]);
  if (!routerRow) throw new ApiError(404, "Router not found");
  const credential = await first(db, `SELECT * FROM RouterCredential WHERE routerId = ?`, [id]);

  const adapter = await getMikrotikAdapter(routerRow, credential, c.env);
  try {
    const result = await adapter.testConnection();
    await run(db, `UPDATE Router SET status='ONLINE', routerOsVer=?, lastSeenAt=?, updatedAt=? WHERE id=?`, [
      result.routerOsVersion || null,
      now(),
      now(),
      id,
    ]);
    return c.json({ ok: true, ...result });
  } catch (connectErr) {
    await run(db, `UPDATE Router SET status='ERROR', updatedAt=? WHERE id=?`, [now(), id]);
    return c.json({
      ok: false,
      error: connectErr.message,
      troubleshooting: [
        "Check the IP/host and API port are correct",
        "Confirm the RouterOS API service is enabled (IP > Services)",
        "Verify the username/password",
        "Check firewall rules allow API access from Cloudflare's network",
        "Confirm the router has a public IP or port-forwarding configured",
      ],
    });
  }
});

export default routers;
