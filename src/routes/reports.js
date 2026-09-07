import { Hono } from "hono";
import { all, first } from "../lib/db.js";

const reports = new Hono();

reports.get("/revenue", async (c) => {
  const { from, to, routerId } = c.req.query();
  const db = c.env.DB;
  const clauses = ["status = 'SUCCESS'"];
  const params = [];
  if (routerId) { clauses.push("routerId = ?"); params.push(routerId); }
  if (from) { clauses.push("createdAt >= ?"); params.push(from); }
  if (to) { clauses.push("createdAt <= ?"); params.push(to); }
  const where = `WHERE ${clauses.join(" AND ")}`;

  const total = await first(db, `SELECT COALESCE(SUM(amount),0) AS total, COUNT(*) AS n FROM "Transaction" ${where}`, params);
  const byMethod = await all(db, `SELECT method, COALESCE(SUM(amount),0) AS total FROM "Transaction" ${where} GROUP BY method`, params);

  return c.json({
    totalRevenue: Number(total.total || 0),
    totalTransactions: total.n,
    byMethod: byMethod.map((m) => ({ method: m.method, amount: Number(m.total || 0) })),
  });
});

reports.get("/vouchers", async (c) => {
  const rows = await all(c.env.DB, `SELECT status, COUNT(*) AS n FROM Voucher GROUP BY status`);
  return c.json(rows.map((r) => ({ status: r.status, count: r.n })));
});

reports.get("/routers", async (c) => {
  const db = c.env.DB;
  const rows = await all(db, `SELECT routerId, COALESCE(SUM(amount),0) AS total FROM "Transaction" WHERE status='SUCCESS' AND routerId IS NOT NULL GROUP BY routerId`);
  const routerIds = rows.map((r) => r.routerId);
  let routerRows = [];
  if (routerIds.length) {
    routerRows = await all(db, `SELECT id, name FROM Router WHERE id IN (${routerIds.map(() => "?").join(",")})`, routerIds);
  }
  return c.json(rows.map((r) => ({ router: routerRows.find((x) => x.id === r.routerId)?.name || "Unknown", revenue: Number(r.total || 0) })));
});

export default reports;
