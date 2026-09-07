import { MockProvider } from "./MockProvider.js";

const LIVE_PROVIDERS = {
  mpesa: () => import("./MpesaProvider.js").then((m) => m.MpesaProvider),
  // airtel_money, mixx_yas, halopesa: add adapters here following PaymentProvider.js
};

/**
 * @param {string|undefined} providerKey e.g. "mpesa" — required when PAYMENTS_MODE=live
 * @param {object} env
 */
export async function getPaymentProvider(providerKey, env) {
  if ((env.PAYMENTS_MODE || "mock") !== "live") {
    return new MockProvider();
  }
  const loader = LIVE_PROVIDERS[providerKey];
  if (!loader) throw new Error(`No live payment provider registered for "${providerKey}"`);
  const ProviderClass = await loader();
  return new ProviderClass(env);
}
