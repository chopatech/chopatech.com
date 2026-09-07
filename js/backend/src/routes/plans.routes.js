const express = require("express");
const { z } = require("zod");
const prisma = require("../utils/prisma");
const { requireRole } = require("../middleware/auth");
const { ApiError } = require("../middleware/errorHandler");
const { writeAuditLog } = require("../services/audit.service");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    res.json(await prisma.plan.findMany({ where: { deletedAt: null }, orderBy: { price: "asc" } }));
  } catch (err) { next(err); }
});

const planSchema = z.object({
  name: z.string().min(1),
  price: z.number().nonnegative(),
  durationMins: z.number().int().positive(),
  downloadMbps: z.number().int().positive().optional(),
  uploadMbps: z.number().int().positive().optional(),
  dataLimitMb: z.number().int().positive().optional(),
  simultaneous: z.number().int().positive().default(1),
  routerId: z.string().uuid().optional(),
});

router.post("/", requireRole("SUPER_ADMIN", "ADMIN", "MANAGER"), async (req, res, next) => {
  try {
    const body = planSchema.parse(req.body);
    const plan = await prisma.plan.create({ data: body });
    // NOTE: creating the RouterOS hotspot user-profile that matches this plan
    // happens in voucher generation / a dedicated sync job — see
    // src/integrations/mikrotik/RouterOsAdapter.js for the supported API calls.
    await writeAuditLog({ userId: req.user.id, action: "PLAN_CREATED", resource: "Plan", resourceId: plan.id, ip: req.ip });
    res.status(201).json(plan);
  } catch (err) {
    next(err.issues ? new ApiError(400, "Invalid plan details", err.issues) : err);
  }
});

router.put("/:id", requireRole("SUPER_ADMIN", "ADMIN", "MANAGER"), async (req, res, next) => {
  try {
    const plan = await prisma.plan.update({ where: { id: req.params.id }, data: req.body });
    await writeAuditLog({ userId: req.user.id, action: "PLAN_UPDATED", resource: "Plan", resourceId: plan.id, ip: req.ip });
    res.json(plan);
  } catch (err) { next(err); }
});

router.delete("/:id", requireRole("SUPER_ADMIN", "ADMIN"), async (req, res, next) => {
  try {
    await prisma.plan.update({ where: { id: req.params.id }, data: { deletedAt: new Date(), status: "DISABLED" } });
    await writeAuditLog({ userId: req.user.id, action: "PLAN_DELETED", resource: "Plan", resourceId: req.params.id, ip: req.ip });
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
