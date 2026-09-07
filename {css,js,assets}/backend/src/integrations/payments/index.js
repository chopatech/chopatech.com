const MockProvider = require("./MockProvider");

const LIVE_PROVIDERS = {
  mpesa: () => require("./MpesaProvider"),
  // airtel_money, mixx_yas, halopesa: add adapters here following PaymentProvider.js
};

/**
 * @param {string} [providerKey] e.g. "mpesa" — required when PAYMENTS_MODE=live
 */
function getPaymentProvider(providerKey) {
  if ((process.env.PAYMENTS_MODE || "mock") !== "live") {
    return new MockProvider();
  }
  const loader = LIVE_PROVIDERS[providerKey];
  if (!loader) throw new Error(`No live payment provider registered for "${providerKey}"`);
  const ProviderClass = loader();
  return new ProviderClass();
}

module.exports = { getPaymentProvider };
