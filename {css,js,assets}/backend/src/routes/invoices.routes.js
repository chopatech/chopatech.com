const express = require("express");
const prisma = require("../utils/prisma");
const { ApiError } = require("../middleware/errorHandler");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    res.json(await prisma.invoice.findMany({ include: { customer: true, transaction: true }, orderBy: { createdAt: "desc" }, take: 200 }));
  } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id }, include: { customer: true, transaction: true } });
    if (!invoice) throw new ApiError(404, "Invoice not found");
    res.json(invoice);
  } catch (err) { next(err); }
});

module.exports = router;
