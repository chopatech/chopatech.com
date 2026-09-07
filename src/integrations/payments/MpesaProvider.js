import { PaymentProvider } from "./PaymentProvider.js";
import { ApiError } from "../../middleware/errorHandler.js";

/**
 * M-Pesa (Vodacom Tanzania) adapter skeleton.
 * -----------------------------------------------------------
 * This is a STRUCTURAL skeleton, not a working integration: M-Pesa's exact
 * API surface, auth flow and payload format depend on the merchant
 * agreement Vodacom issues you, and cannot be guessed here. Fill in
 * `baseUrl`, `getAccessToken()` and the request payloads once you have real
 * API docs and credentials from Vodacom, then set PAYMENTS_MODE=live and
 * the MPESA_* secrets via `wrangler secret put`.
 */
export class MpesaProvider extends PaymentProvider {
  constructor(env) {
    super();
    this.env = env;
    this.consumerKey = env.MPESA_CONSUMER_KEY;
    this.consumerSecret = env.MPESA_CONSUMER_SECRET;
    this.shortcode = env.MPESA_SHORTCODE;
    this.passkey = env.MPESA_PASSKEY;
    this.webhookSecret = env.MPESA_WEBHOOK_SECRET;
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
    await this.verifySignature(req);
    // TODO: parse the real M-Pesa webhook payload shape once available.
    throw new ApiError(501, "M-Pesa live integration is not configured yet — see MpesaProvider.js");
  }

  async refundPayment(externalId, amount) {
    throw new ApiError(501, "M-Pesa refunds are not configured yet — see MpesaProvider.js");
  }

  async verifySignature(req) {
    const signature = req.headers.get("x-mpesa-signature");
    if (!signature || !this.webhookSecret) throw new ApiError(401, "Invalid webhook signature");

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(this.webhookSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const mac = await crypto.subtle.sign("HMAC", key, req.rawBody);
    const expectedHex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");

    const ok = signature.length === expectedHex.length && timingSafeEqualHex(signature, expectedHex);
    if (!ok) throw new ApiError(401, "Invalid webhook signature");
  }
}

function timingSafeEqualHex(a, b) {
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export default MpesaProvider;
