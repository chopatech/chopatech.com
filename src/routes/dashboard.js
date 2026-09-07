import { Hono } from "hono";
import { all, first } from "../lib/db.js";

const dashboard = new Hono();

function startOfDayIso() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}
function startOfMonthIso() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

dashboard.get("/", async (c) => {
  const db = c.env.DB;
  const today = startOfDayIso();
  const monthStart = startOfMonthIso();

  const [
    todayRevenue,
    monthRevenue,
    activeSessions,
    pendingApprovals,
    routersTotal,
    routersOnline,
    activeVouchers,
    usedVouchers,
    expiredVouchers,
  ] = await Promise.all([
    first(db, `SELECT COALESCE(SUM(amount),0) AS total FROM "Transaction" WHERE status='SUCCESS' AND createdAt >= ?`, [today]),
    first(db, `SELECT COALESCE(SUM(amount),0) AS total FROM "Transaction" WHERE status='SUCCESS' AND createdAt >= ?`, [monthStart]),
    first(db, `SELECT COUNT(*) AS n FROM HotspotSession WHERE status='ACTIVE'`),
    first(db, `SELECT COUNT(*) AS n FROM "Transaction" WHERE status='PENDING'`),
    first(db, `SELECT COUNT(*) AS n FROM Router WHERE deletedAt IS NULL`),
    first(db, `SELECT COUNT(*) AS n FROM Router WHERE status='ONLINE' AND deletedAt IS NULL`),
    first(db, `SELECT COUNT(*) AS n FROM Voucher WHERE status='ACTIVE'`),
    first(db, `SELECT COUNT(*) AS n FROM Voucher WHERE status='USED'`),
    first(db, `SELECT COUNT(*) AS n FROM Voucher WHERE status='EXPIRED'`),
  ]);

  // Package mix — grouped by plan for vouchers issued this month.
  const planGroups = await all(
    db,
    `SELECT planId, COUNT(*) AS n FROM Voucher WHERE createdAt >= ? GROUP BY planId`,
    [monthStart]
  );
  const planIds = planGroups.map((p) => p.planId);
  let plans = [];
  if (planIds.length) {
    plans = await all(db, `SELECT id, name FROM Plan WHERE id IN (${planIds.map(() => "?").join(",")})`, planIds);
  }
  const totalIssued = planGroups.reduce((s, g) => s + g.n, 0) || 1;
  const colors = ["var(--signal)", "var(--violet)", "var(--amber)", "var(--green)"];
  const planMix = planGroups.map((g, i) => ({
    label: plans.find((p) => p.id === g.planId)?.name || "Unknown",
    value: Math.round((g.n / totalIssued) * 100),
    color: colors[i % 4],
  }));

  return c.json({
    kpis: {
      todayRevenue: Number(todayRevenue.total || 0),
      todayRevenueDelta: 0,
      activeSessions: activeSessions.n,
      activeSessionsDelta: 0,
      pendingApprovals: pendingApprovals.n,
      pendingApprovalsDelta: 0,
      monthRevenue: Number(monthRevenue.total || 0),
      monthRevenueDelta: 0,
      routersConnected: routersOnline.n,
      routersTotal: routersTotal.n,
      activeVouchers: activeVouchers.n,
      usedVouchers: usedVouchers.n,
      expiredVouchers: expiredVouchers.n,
      smsCredits: 0,
      servicePlan: "Starter Plan",
    },
    revenueSeries: { "7d": [], "30d": [], "12m": [] }, // TODO: fill from a materialized daily-revenue table for performance
    planMix,
  });
});

export default dashboard;
