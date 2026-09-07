import { Hono } from "hono";
import { all, first, run, now } from "../lib/db.js";
import { requireRole } from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";
import { getMikrotikAdapter } from "../integrations/mikrotik/index.js";
import { writeAuditLog } from "../lib/audit.js";

const sessions = new Hono();

sessions.get("/", async (c) => {
  const { routerId, status } = c.req.query();
  const db = c.env.DB;
  const clauses = [];
  const params = [];
  if (routerId) { clauses.push("s.routerId = ?"); params.push(routerId); }
  if (status) { clauses.push("s.status = ?"); params.push(status); }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const rows = await all(
    db,
    `SELECT s.*, r.name AS routerName, v.code AS voucherCode FROM HotspotSession s
     LEFT JOIN Router r ON r.id = s.routerId LEFT JOIN Voucher v ON v.id = s.voucherId
     ${where} ORDER BY s.startedAt DESC LIMIT 200`,
    params
  );
  return c.json(rows.map((row) => ({
    ...row,
    router: row.routerName ? { name: row.routerName } : null,
    voucher: row.voucherCode ? { code: row.voucherCode } : null,
  })));
});

sessions.post("/:id/disconnect", requireRole("SUPER_ADMIN", "ADMIN", "MANAGER", "OPERATOR"), async (c) => {
  const db = c.env.DB;
  const user = c.get("user");
  const id = c.req.param("id");
  const session = await first(db, `SELECT * FROM HotspotSession WHERE id = ?`, [id]);
  if (!session) throw new ApiError(404, "Session not found");

  const routerRow = await first(db, `SELECT * FROM Router WHERE id = ?`, [session.routerId]);
  const credential = await first(db, `SELECT * FROM RouterCredential WHERE routerId = ?`, [session.routerId]);
  const adapter = await getMikrotikAdapter(routerRow, credential, c.env);
  try {
    await adapter.removeHotspotActiveSession(session.id);
  } finally {
    await adapter.disconnect();
  }

  await run(db, `UPDATE HotspotSession SET status='DISCONNECTED', endedAt=? WHERE id=?`, [now(), id]);
  await writeAuditLog(db, { userId: user.id, action: "SESSION_DISCONNECTED", resource: "HotspotSession", resourceId: id, ip: c.req.header("cf-connecting-ip") });
  return c.json(await first(db, `SELECT * FROM HotspotSession WHERE id = ?`, [id]));
});

export default sessions;
