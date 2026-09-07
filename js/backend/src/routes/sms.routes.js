const express = require("express");
const { z } = require("zod");
const prisma = require("../utils/prisma");
const { ApiError } = require("../middleware/errorHandler");
const { getSmsProvider } = require("../integrations/sms");
const { writeAuditLog } = require("../services/audit.service");

const router = express.Router();

router.get("/balance", async (req, res, next) => {
  try {
    res.json(await getSmsProvider().getBalance());
  } catch (err) { next(err); }
});

router.get("/messages", async (req, res, next) => {
  try {
    res.json(await prisma.sMSMessage.findMany({ orderBy: { createdAt: "desc" }, take: 100 }));
  } catch (err) { next(err); }
});

const sendSchema = z.object({ to: z.string().min(6), body: z.string().min(1), template: z.string().optional() });

router.post("/send", async (req, res, next) => {
  try {
    const { to, body, template } = sendSchema.parse(req.body);
    const provider = getSmsProvider();
    const result = await provider.sendSms({ to, body });

    const record = await prisma.sMSMessage.create({
      data: { to, body, template, status: result.ok ? "SENT" : "FAILED", providerRef: result.providerRef },
    });
    await writeAuditLog({ userId: req.user?.id, action: "SMS_SENT", resource: "SMSMessage", resourceId: record.id, ip: req.ip, metadata: { mock: !!result.mock } });
    res.status(201).json({ ...record, mock: !!result.mock });
  } catch (err) {
    next(err.issues ? new ApiError(400, "Invalid SMS request", err.issues) : err);
  }
});

module.exports = router;
