import { PaymentProvider } from "./PaymentProvider.js";

/**
 * MOCK IMPLEMENTATION — used when PAYMENTS_MODE=mock (the default). Never
 * processes a real transaction. Clearly tagged mock:true on every response
 * so the frontend can flag it. Do not enable in production; switch
 * PAYMENTS_MODE=live and configure a real adapter instead.
 */
export class MockProvider extends PaymentProvider {
  async createPayment({ amount, phone, reference }) {
    return { externalId: `MOCK-${reference}`, status: "PENDING", mock: true, raw: { amount, phone } };
  }

  async checkPaymentStatus(externalId) {
    return { status: "SUCCESS", mock: true, raw: { externalId } };
  }

  async handleCallback(req) {
    let payload = {};
    try {
      payload = JSON.parse(new TextDecoder().decode(req.rawBody));
    } catch {
      // ignore malformed body
    }
    return { externalId: payload.externalId || "MOCK-UNKNOWN", status: "SUCCESS", amount: payload.amount, mock: true, raw: payload };
  }

  async refundPayment(externalId, amount) {
    return { ok: true, mock: true, externalId, amount };
  }
}

export default MockProvider;
