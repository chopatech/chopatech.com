const express = require("express");
const prisma = require("../utils/prisma");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    res.json(await prisma.notification.findMany({ orderBy: { createdAt: "desc" }, take: 30 }));
  } catch (err) { next(err); }
});

router.post("/:id/read", async (req, res, next) => {
  try {
    res.json(await prisma.notification.update({ where: { id: req.params.id }, data: { readAt: new Date() } }));
  } catch (err) { next(err); }
});

module.exports = router;
