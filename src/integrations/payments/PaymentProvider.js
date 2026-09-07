/**
 * CHOPA TECH — Payment provider interface
 * Every concrete adapter (M-Pesa, Airtel Money, Mixx by Yas, HaloPesa, ...)
 * must implement this shape. Routes depend only on this interface, never on
 * a specific provider's SDK.
 */
export class PaymentProvider {
  /**
   * @param {{amount:number, phone:string, reference:string, description?:string}} params
   * @returns {Promise<{externalId:string, status:'PENDING'|'SUCCESS'|'FAILED', raw?:any}>}
   */
  async createPayment(params) {
    throw new Error("createPayment() not implemented");
  }

  /** @param {string} externalId */
  async checkPaymentStatus(externalId) {
    throw new Error("checkPaymentStatus() not implemented");
  }

  /**
   * Verifies the webhook signature and normalizes the payload.
   * MUST throw if the signature is invalid.
   * @param {{headers:Headers, rawBody:ArrayBuffer}} req
   */
  async handleCallback(req) {
    throw new Error("handleCallback() not implemented");
  }

  async refundPayment(externalId, amount) {
    throw new Error("refundPayment() not implemented");
  }
}

export default PaymentProvider;
