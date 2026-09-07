const express = require("express");
const prisma = require("../utils/prisma");
const router = express.Router();

function startOfDay(d = new Date()) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function startOfMonth(d = new Date()) { return new Date(d.getFullYear(), d.getMonth(), 1); }

router.get("/", async (req, res, next) => {
  try {
    const today = startOfDay();
    const monthStart = startOfMonth();

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
      prisma.transaction.aggregate({ _sum: { amount: true }, where: { status: "SUCCESS", createdAt: { gte: today } } }),
      prisma.transaction.aggregate({ _sum: { amount: true }, where: { status: "SUCCESS", createdAt: { gte: monthStart } } }),
      prisma.hotspotSession.count({ where: { status: "ACTIVE" } }),
      prisma.transaction.count({ where: { status: "PENDING" } }),
      prisma.router.count({ where: { deletedAt: null } }),
      prisma.router.count({ where: { status: "ONLINE", deletedAt: null } }),
      prisma.voucher.count({ where: { status: "ACTIVE" } }),
      prisma.voucher.count({ where: { status: "USED" } }),
      prisma.voucher.count({ where: { status: "EXPIRED" } }),
    ]);

    // Package mix — grouped by plan name for vouchers issued this month.
    const planGroups = await prisma.voucher.groupBy({
      by: ["planId"],
      _count: { _all: true },
      where: { createdAt: { gte: monthStart } },
    });
    const plans = await prisma.plan.findMany({ where: { id: { in: planGroups.map((p) => p.planId) } } });
    const totalIssued = planGroups.reduce((s, g) => s + g._count._all, 0) || 1;
    const planMix = planGroups.map((g, i) => ({
      label: plans.find((p) => p.id === g.planId)?.name || "Unknown",
      value: Math.round((g._count._all / totalIssued) * 100),
      color: ["var(--signal)", "var(--violet)", "var(--amber)", "var(--green)"][i % 4],
    }));

    res.json({
      kpis: {
        todayRevenue: Number(todayRevenue._sum.amount || 0),
        todayRevenueDelta: 0,
        activeSessions,
        activeSessionsDelta: 0,
        pendingApprovals,
        pendingApprovalsDelta: 0,
        monthRevenue: Number(monthRevenue._sum.amount || 0),
        monthRevenueDelta: 0,
        routersConnected: routersOnline,
        routersTotal,
        activeVouchers,
        usedVouchers,
        expiredVouchers,
        smsCredits: 0,
        servicePlan: "Starter Plan",
      },
      revenueSeries: { "7d": [], "30d": [], "12m": [] }, // TODO: fill from a materialized daily-revenue table for performance
      planMix,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
