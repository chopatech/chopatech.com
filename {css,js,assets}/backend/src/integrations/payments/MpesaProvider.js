const crypto = require("crypto");
const PaymentProvider = require("./PaymentProvider");
const { ApiError } = require("../../middleware/errorHandler");

/**
 * M-Pesa (Vodacom Tanzania) adapter skeleton.
 * -----------------------------------------------------------
 * This is a STRUCTURAL skeleton, not a working integration: M-Pesa's
 * exact API surface, auth flow and payload format depend on the
 * merchant agreement Vodacom issues you, and cannot be guessed here.
 * Fill in `baseUrl`, `getAccessToken()` and the request payloads once
 * you have real API docs and credentials from Vodacom, then set
 * PAYMENTS_MODE=live and MPESA_* in your .env.
 */
class MpesaProvider extends PaymentProvider {
  constructor() {
    super();
    this.consumerKey = process.env.MPESA_CONSUMER_KEY;
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    this.shortcode = process.env.MPESA_SHORTCODE;
    this.passkey = process.env.MPESA_PASSKEY;
    this.webhookSecret = process.env.MPESA_WEBHOOK_SECRET;
    if (!this.consumerKey || !this.consumerSecret) {
      throw new Error("MPESA_CONSUMER_KEY / MPESA_CONSUMER_SECRET are not configured");
    }
  }

  async createPayment({ amount, phone, reference, description }) {
    // TODO: implement the real STK-push / C2B request per Vodacom's docs.
    throw new ApiError(501, "M-Pesa live integration is not configured yet — see MpesaProvider.js");
  }

  async checkPaymentStatus(externalId) {
    throw new ApiError(501, "M-Pesa live integration is not configured yet — see MpesaProvider.js");
  }

  async handleCallback(req) {
    this.verifySignature(req);
    // TODO: parse the real M-Pesa webhook payload shape once available.
    throw new ApiError(501, "M-Pesa live integration is not configured yet — see MpesaProvider.js");
  }

  async refundPayment(externalId, amount) {
    throw new ApiError(501, "M-Pesa refunds are not configured yet — see MpesaProvider.js");
  }

  verifySignature(req) {
    const signature = req.headers["x-mpesa-signature"];
    if (!signature || !this.webhookSecret) throw new ApiError(401, "Invalid webhook signature");
    const expected = crypto.createHmac("sha256", this.webhookSecret).update(req.rawBody).digest("hex");
    const ok = signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    if (!ok) throw new ApiError(401, "Invalid webhook signature");
  }
}

module.exports = MpesaProvider;
