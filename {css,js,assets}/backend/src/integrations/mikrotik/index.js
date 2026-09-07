const RouterOsAdapter = require("./RouterOsAdapter");
const MockAdapter = require("./MockAdapter");
const { decrypt } = require("../../utils/crypto");

/**
 * Returns a connected-capable adapter for the given router + credential rows.
 * Falls back to the MOCK adapter ONLY when explicitly running in development
 * without stored credentials — never silently in production.
 */
function getMikrotikAdapter(router, credential) {
  const noCredentials = !credential || !credential.passwordEnc;
  if (noCredentials) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Router ${router.name} has no stored credentials — cannot connect.`);
    }
    return new MockAdapter({ host: router.host, port: router.apiPort });
  }

  return new RouterOsAdapter({
    host: router.host,
    port: router.apiPort,
    user: credential.username,
    password: decrypt(credential.passwordEnc),
    useSsl: router.useSsl,
  });
}

module.exports = { getMikrotikAdapter };
