const express = require("express");
const prisma = require("../utils/prisma");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const rows = await prisma.setting.findMany();
    res.json(Object.fromEntries(rows.map((r) => [r.key, r.value])));
  } catch (err) { next(err); }
});

router.put("/", requireRole("SUPER_ADMIN", "ADMIN"), async (req, res, next) => {
  try {
    const entries = Object.entries(req.body || {});
    await Promise.all(entries.map(([key, value]) => prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } })));
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
