import { Hono } from "hono";
import { all, first, run, now } from "../lib/db.js";
import { requireRole } from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";
import { getMikrotikAdapter } from "../integrations/mikrotik/index.js";
import { writeAuditLog } from "../lib/audit.js";

const users = new Hono();

users.get("/", async (c) => {
  const { routerId, status, q } = c.req.query();
  const db = c.env.DB;
  const clauses = [];
  const params = [];
  if (routerId) { clauses.push("u.routerId = ?"); params.push(routerId); }
  if (status) { clauses.push("u.status = ?"); params.push(status); }
  if (q) {
    clauses.push("(u.username LIKE ? OR u.ipAddress LIKE ? OR u.macAddress LIKE ?)");
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const rows = await all(
    db,
    `SELECT u.*, r.name AS routerName FROM HotspotUser u LEFT JOIN Router r ON r.id = u.routerId
     ${where} ORDER BY u.updatedAt DESC LIMIT 200`,
    params
  );
  return c.json(rows.map((row) => ({ ...row, router: row.routerName ? { name: row.routerName } : null })));
});

users.post("/:id/disconnect", requireRole("SUPER_ADMIN", "ADMIN", "MANAGER", "OPERATOR"), async (c) => {
  const db = c.env.DB;
  const authUser = c.get("user");
  const id = c.req.param("id");
  const hotspotUser = await first(db, `SELECT * FROM HotspotUser WHERE id = ?`, [id]);
  if (!hotspotUser) throw new ApiError(404, "User not found");

  const activeSession = await first(db, `SELECT * FROM HotspotSession WHERE routerId = ? AND status='ACTIVE'`, [hotspotUser.routerId]);
  if (activeSession) {
    const routerRow = await first(db, `SELECT * FROM Router WHERE id = ?`, [hotspotUser.routerId]);
    const credential = await first(db, `SELECT * FROM RouterCredential WHERE routerId = ?`, [hotspotUser.routerId]);
    const adapter = await getMikrotikAdapter(routerRow, credential, c.env);
    try {
      await adapter.removeHotspotActiveSession(activeSession.id).catch(() => null);
    } finally {
      await adapter.disconnect();
    }
    await run(db, `UPDATE HotspotSession SET status='DISCONNECTED', endedAt=? WHERE id=?`, [now(), activeSession.id]);
  }

  await run(db, `UPDATE HotspotUser SET status='OFFLINE', updatedAt=? WHERE id=?`, [now(), id]);
  await writeAuditLog(db, { userId: authUser.id, action: "USER_DISCONNECTED", resource: "HotspotUser", resourceId: id, ip: c.req.header("cf-connecting-ip") });
  return c.json(await first(db, `SELECT * FROM HotspotUser WHERE id = ?`, [id]));
});

users.post("/:id/disable", requireRole("SUPER_ADMIN", "ADMIN", "MANAGER"), async (c) => {
  const db = c.env.DB;
  const authUser = c.get("user");
  const id = c.req.param("id");
  const hotspotUser = await first(db, `SELECT * FROM HotspotUser WHERE id = ?`, [id]);
  if (!hotspotUser) throw new ApiError(404, "User not found");
  const routerRow = await first(db, `SELECT * FROM Router WHERE id = ?`, [hotspotUser.routerId]);
  const credential = await first(db, `SELECT * FROM RouterCredential WHERE routerId = ?`, [hotspotUser.routerId]);
  const adapter = await getMikrotikAdapter(routerRow, credential, c.env);
  try {
    await adapter.disableHotspotUser(hotspotUser.username);
  } finally {
    await adapter.disconnect();
  }
  await run(db, `UPDATE HotspotUser SET status='OFFLINE', updatedAt=? WHERE id=?`, [now(), id]);
  await writeAuditLog(db, { userId: authUser.id, action: "USER_DISABLED", resource: "HotspotUser", resourceId: id, ip: c.req.header("cf-connecting-ip") });
  return c.json(await first(db, `SELECT * FROM HotspotUser WHERE id = ?`, [id]));
});

users.delete("/:id", requireRole("SUPER_ADMIN", "ADMIN"), async (c) => {
  const db = c.env.DB;
  const authUser = c.get("user");
  const id = c.req.param("id");
  await run(db, `DELETE FROM HotspotUser WHERE id = ?`, [id]);
  await writeAuditLog(db, { userId: authUser.id, action: "USER_DELETED", resource: "HotspotUser", resourceId: id, ip: c.req.header("cf-connecting-ip") });
  return c.body(null, 204);
});

export default users;
