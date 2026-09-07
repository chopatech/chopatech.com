const express = require("express");
const prisma = require("../utils/prisma");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const { routerId } = req.query;
    const portal = await prisma.portal.findFirst({ where: { routerId: routerId || null } });
    res.json(portal || { template: "Modern", welcomeText: "Welcome to CHOPA WiFi", primaryColor: "#2563EB", buttonColor: "#FF5B34" });
  } catch (err) { next(err); }
});

router.put("/", requireRole("SUPER_ADMIN", "ADMIN", "MANAGER"), async (req, res, next) => {
  try {
    const { routerId, ...data } = req.body;
    const existing = await prisma.portal.findFirst({ where: { routerId: routerId || null } });
    const saved = existing
      ? await prisma.portal.update({ where: { id: existing.id }, data })
      : await prisma.portal.create({ data: { routerId, ...data } });
    res.json(saved);
  } catch (err) { next(err); }
});

module.exports = router;
