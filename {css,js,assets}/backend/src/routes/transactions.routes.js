const express = require("express");
const prisma = require("../utils/prisma");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const { status, method, routerId, from, to } = req.query;
    const transactions = await prisma.transaction.findMany({
      where: {
        status: status || undefined,
        method: method || undefined,
        routerId: routerId || undefined,
        createdAt: (from || to) ? { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined } : undefined,
      },
      include: { customer: true, voucher: { include: { plan: true } }, router: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json(transactions);
  } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const t = await prisma.transaction.findUnique({
      where: { id: req.params.id },
      include: { customer: true, voucher: true, router: true, payment: true, invoice: true },
    });
    res.json(t);
  } catch (err) { next(err); }
});

module.exports = router;
