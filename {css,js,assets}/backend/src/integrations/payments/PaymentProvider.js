/**
 * CHOPA TECH — Payment provider interface
 * Every concrete adapter (M-Pesa, Airtel Money, Mixx by Yas, HaloPesa, ...)
 * must implement this shape. Controllers depend only on this interface,
 * never on a specific provider's SDK.
 */
class PaymentProvider {
  /**
   * @param {{amount:number, phone:string, reference:string, description?:string}} params
   * @returns {Promise<{externalId:string, status:'PENDING'|'SUCCESS'|'FAILED', raw?:any}>}
   */
  async createPayment(params) {
    throw new Error("createPayment() not implemented");
  }

  /**
   * @param {string} externalId
   * @returns {Promise<{status:'PENDING'|'SUCCESS'|'FAILED', raw?:any}>}
   */
  async checkPaymentStatus(externalId) {
    throw new Error("checkPaymentStatus() not implemented");
  }

  /**
   * Verifies the webhook signature and normalizes the payload.
   * MUST throw if the signature is invalid.
   * @param {{headers:object, rawBody:Buffer}} req
   * @returns {Promise<{externalId:string, status:'SUCCESS'|'FAILED', amount?:number, raw:any}>}
   */
  async handleCallback(req) {
    throw new Error("handleCallback() not implemented");
  }

  /**
   * @param {string} externalId
   * @param {number} amount
   */
  async refundPayment(externalId, amount) {
    throw new Error("refundPayment() not implemented");
  }
}

module.exports = PaymentProvider;
