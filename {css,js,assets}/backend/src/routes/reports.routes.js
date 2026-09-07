const express = require("express");
const prisma = require("../utils/prisma");

const router = express.Router();

router.get("/revenue", async (req, res, next) => {
  try {
    const { from, to, routerId } = req.query;
    const where = {
      status: "SUCCESS",
      routerId: routerId || undefined,
      createdAt: (from || to) ? { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined } : undefined,
    };
    const [total, byMethod] = await Promise.all([
      prisma.transaction.aggregate({ _sum: { amount: true }, _count: true, where }),
      prisma.transaction.groupBy({ by: ["method"], _sum: { amount: true }, where }),
    ]);
    res.json({
      totalRevenue: Number(total._sum.amount || 0),
      totalTransactions: total._count,
      byMethod: byMethod.map((m) => ({ method: m.method, amount: Number(m._sum.amount || 0) })),
    });
  } catch (err) { next(err); }
});

router.get("/vouchers", async (req, res, next) => {
  try {
    const grouped = await prisma.voucher.groupBy({ by: ["status"], _count: { _all: true } });
    res.json(grouped.map((g) => ({ status: g.status, count: g._count._all })));
  } catch (err) { next(err); }
});

router.get("/routers", async (req, res, next) => {
  try {
    const rows = await prisma.transaction.groupBy({ by: ["routerId"], _sum: { amount: true }, where: { status: "SUCCESS" } });
    const routers = await prisma.router.findMany({ where: { id: { in: rows.map((r) => r.routerId).filter(Boolean) } } });
    res.json(rows.map((r) => ({ router: routers.find((x) => x.id === r.routerId)?.name || "Unknown", revenue: Number(r._sum.amount || 0) })));
  } catch (err) { next(err); }
});

module.exports = router;
