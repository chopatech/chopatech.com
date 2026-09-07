const express = require("express");
const { z } = require("zod");
const crypto = require("crypto");
const prisma = require("../utils/prisma");
const { requireRole } = require("../middleware/auth");
const { ApiError } = require("../middleware/errorHandler");
const { generateUniqueCodes } = require("../utils/voucherCode");
const { hashPassword } = require("../utils/password");
const { getMikrotikAdapter } = require("../integrations/mikrotik");
const { writeAuditLog } = require("../services/audit.service");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const { status, routerId, q } = req.query;
    const vouchers = await prisma.voucher.findMany({
      where: {
        status: status || undefined,
        routerId: routerId || undefined,
        code: q ? { contains: String(q), mode: "insensitive" } : undefined,
      },
      include: { plan: true, router: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json(vouchers);
  } catch (err) { next(err); }
});

const genSchema = z.object({
  quantity: z.number().int().min(1).max(5000),
  planId: z.string().uuid(),
  routerId: z.string().uuid(),
  prefix: z.string().max(12).default("CHOPA"),
  codeLength: z.number().int().min(6).max(16).default(8),
  expiresInMins: z.number().int().positive().optional(),
});

/**
 * Generates a voucher batch. Per RULE 11 of the product spec: a voucher is
 * only ever marked AVAILABLE in the database after the MikroTik hotspot
 * user was created successfully. Partial failures are recorded, not hidden.
 */
router.post("/generate", requireRole("SUPER_ADMIN", "ADMIN", "MANAGER", "RESELLER"), async (req, res, next) => {
  try {
    const body = genSchema.parse(req.body);

    const [plan, routerRow, credential] = await Promise.all([
      prisma.plan.findUnique({ where: { id: body.planId } }),
      prisma.router.findUnique({ where: { id: body.routerId } }),
      prisma.routerCredential.findUnique({ where: { routerId: body.routerId } }),
    ]);
    if (!plan) throw new ApiError(404, "Plan not found");
    if (!routerRow) throw new ApiError(404, "Router not found");

    const batch = await prisma.voucherBatch.create({
      data: { quantity: body.quantity, prefix: body.prefix, codeLength: body.codeLength, planId: plan.id, routerId: routerRow.id, createdById: req.user.id },
    });

    const codes = generateUniqueCodes(body.quantity, body.codeLength, body.prefix);
    const adapter = getMikrotikAdapter(routerRow, credential);

    let succeeded = 0, failed = 0;
    const failures = [];

    for (const code of codes) {
      const plainPassword = crypto.randomBytes(4).toString("hex");
      try {
        await adapter.createHotspotUser({ username: code, password: plainPassword, profile: plan.name });
        await prisma.voucher.create({
          data: {
            code, username: code, passwordHash: await hashPassword(plainPassword),
            planId: plan.id, routerId: routerRow.id, batchId: batch.id,
            status: "AVAILABLE", mikrotikSynced: true,
          },
        });
        succeeded++;
      } catch (mikrotikErr) {
        // DO NOT create a voucher row that looks successful — record the failure instead.
        failed++;
        failures.push({ code, error: mikrotikErr.message });
      }
    }

    await prisma.voucherBatch.update({ where: { id: batch.id }, data: { succeeded, failed } });
    await writeAuditLog({
      userId: req.user.id, action: "VOUCHER_BATCH_GENERATED", resource: "VoucherBatch", resourceId: batch.id,
      ip: req.ip, metadata: { requested: body.quantity, succeeded, failed },
    });

    res.status(201).json({ batchId: batch.id, requested: body.quantity, created: succeeded, failed, failures: failures.slice(0, 20) });
  } catch (err) {
    next(err.issues ? new ApiError(400, "Invalid voucher generation request", err.issues) : err);
  }
});

router.post("/:id/disable", requireRole("SUPER_ADMIN", "ADMIN", "MANAGER"), async (req, res, next) => {
  try {
    const voucher = await prisma.voucher.findUnique({ where: { id: req.params.id }, include: { router: true } });
    if (!voucher) throw new ApiError(404, "Voucher not found");
    const credential = await prisma.routerCredential.findUnique({ where: { routerId: voucher.routerId } });
    const adapter = getMikrotikAdapter(voucher.router, credential);
    await adapter.disableHotspotUser(voucher.username);

    const updated = await prisma.voucher.update({ where: { id: voucher.id }, data: { status: "DISABLED" } });
    await writeAuditLog({ userId: req.user.id, action: "VOUCHER_DISABLED", resource: "Voucher", resourceId: voucher.id, ip: req.ip });
    res.json(updated);
  } catch (err) { next(err); }
});

module.exports = router;
