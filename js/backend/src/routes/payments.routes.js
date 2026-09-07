const express = require("express");
const crypto = require("crypto");
const { z } = require("zod");
const prisma = require("../utils/prisma");
const { authenticate } = require("../middleware/auth");
const { ApiError } = require("../middleware/errorHandler");
const { getPaymentProvider } = require("../integrations/payments");
const { hashPassword } = require("../utils/password");
const { generateUniqueCodes } = require("../utils/voucherCode");
const { getMikrotikAdapter } = require("../integrations/mikrotik");
const { writeAuditLog } = require("../services/audit.service");

const router = express.Router();

const createSchema = z.object({
  planId: z.string().uuid(),
  routerId: z.string().uuid(),
  phone: z.string().min(6),
  method: z.enum(["CASH", "MANUAL", "MOBILE_MONEY", "GATEWAY"]),
  provider: z.string().optional(), // e.g. "mpesa" — required for MOBILE_MONEY/GATEWAY
  idempotencyKey: z.string().min(8),
});

/**
 * Creates a payment record + (for mobile money/gateway) kicks off the
 * provider's payment flow. The voucher/package is NEVER activated here —
 * only once the webhook confirms success (see /webhook below).
 */
router.post("/create", authenticate, async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);

    const existing = await prisma.transaction.findUnique({ where: { idempotencyKey: body.idempotencyKey } });
    if (existing) return res.json(existing); // idempotent replay

    const [plan, routerRow] = await Promise.all([
      prisma.plan.findUnique({ where: { id: body.planId } }),
      prisma.router.findUnique({ where: { id: body.routerId } }),
    ]);
    if (!plan || !routerRow) throw new ApiError(404, "Plan or router not found");

    const reference = `TXN-${Date.now().toString(36).toUpperCase()}`;
    const transaction = await prisma.transaction.create({
      data: {
        reference, amount: plan.price, method: body.method, provider: body.provider,
        routerId: routerRow.id, status: body.method === "CASH" ? "SUCCESS" : "PENDING",
        idempotencyKey: body.idempotencyKey,
      },
    });

    if (body.method === "CASH") {
      await activateVoucherForTransaction(transaction.id, plan, routerRow);
      return res.status(201).json(await prisma.transaction.findUnique({ where: { id: transaction.id } }));
    }

    if (!body.provider) throw new ApiError(400, "provider is required for mobile money / gateway payments");
    const gateway = getPaymentProvider(body.provider);
    const result = await gateway.createPayment({ amount: Number(plan.price), phone: body.phone, reference });

    await prisma.payment.create({
      data: { transactionId: transaction.id, provider: body.provider, externalId: result.externalId, status: result.status || "PENDING" },
    });

    res.status(201).json({ transaction, gateway: result });
  } catch (err) {
    next(err.issues ? new ApiError(400, "Invalid payment request", err.issues) : err);
  }
});

router.get("/:id/status", authenticate, async (req, res, next) => {
  try {
    const transaction = await prisma.transaction.findUnique({ where: { id: req.params.id }, include: { payment: true } });
    if (!transaction) throw new ApiError(404, "Transaction not found");
    res.json(transaction);
  } catch (err) { next(err); }
});

/**
 * Webhook — mounted with express.raw() in server.js so we can verify the
 * provider's HMAC signature against the exact bytes received.
 * Idempotent: replays of the same externalId short-circuit to the stored result.
 */
router.post("/webhook", async (req, res, next) => {
  try {
    const providerKey = req.query.provider; // e.g. ?provider=mpesa
    const gateway = getPaymentProvider(providerKey);

    const result = await gateway.handleCallback({ headers: req.headers, rawBody: req.body });

    const payment = await prisma.payment.findFirst({ where: { externalId: result.externalId } });
    if (!payment) return res.status(202).json({ ok: true, note: "No matching payment (ignored)" });

    if (payment.webhookVerified) {
      return res.json({ ok: true, idempotent: true }); // already processed
    }

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({ where: { id: payment.id }, data: { status: result.status, webhookVerified: true } });
      const transaction = await tx.transaction.update({
        where: { id: payment.transactionId },
        data: { status: result.status, rawWebhook: result.raw },
      });

      if (result.status === "SUCCESS") {
        const full = await tx.transaction.findUnique({ where: { id: transaction.id }, include: { router: true } });
        const plan = await tx.plan.findFirst({ where: { price: full.amount } }); // simplified lookup for demo purposes
        if (plan) await activateVoucherForTransaction(transaction.id, plan, full.router, tx);
      }
    });

    await writeAuditLog({ action: "PAYMENT_WEBHOOK_PROCESSED", resource: "Payment", resourceId: payment.id, metadata: { status: result.status } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/**
 * Shared logic: once a payment is confirmed successful, generate+activate a
 * single voucher and attach it to the transaction. Runs inside a DB
 * transaction where possible so the money record and voucher stay in sync.
 */
async function activateVoucherForTransaction(transactionId, plan, routerRow, tx = prisma) {
  const credential = await tx.routerCredential.findUnique({ where: { routerId: routerRow.id } });
  const adapter = getMikrotikAdapter(routerRow, credential);
  const [code] = generateUniqueCodes(1, 8, "CHOPA");
  const plainPassword = crypto.randomBytes(4).toString("hex");

  await adapter.createHotspotUser({ username: code, password: plainPassword, profile: plan.name });

  const voucher = await tx.voucher.create({
    data: {
      code, username: code, passwordHash: await hashPassword(plainPassword),
      planId: plan.id, routerId: routerRow.id, status: "ACTIVE", mikrotikSynced: true, activatedAt: new Date(),
    },
  });
  await tx.transaction.update({ where: { id: transactionId }, data: { voucherId: voucher.id } });
  return voucher;
}

module.exports = router;
