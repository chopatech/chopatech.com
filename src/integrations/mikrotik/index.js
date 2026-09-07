import { RouterOsAdapter } from "./RouterOsAdapter.js";
import { MockAdapter } from "./MockAdapter.js";
import { decrypt } from "../../lib/crypto.js";

/**
 * Returns a connected-capable adapter for the given router + credential rows.
 * Falls back to the MOCK adapter ONLY when there are no stored credentials
 * for the router — never silently in a way that hides missing setup.
 *
 * @param {object} router - a row from the Router table
 * @param {object|null} credential - a row from the RouterCredential table
 * @param {object} env - the Worker's env (for ROUTER_CREDENTIALS_ENCRYPTION_KEY)
 */
export async function getMikrotikAdapter(router, credential, env) {
  const noCredentials = !credential || !credential.passwordEnc;
  if (noCredentials) {
    return new MockAdapter({ host: router.host, port: router.apiPort });
  }

  return new RouterOsAdapter({
    host: router.host,
    port: router.apiPort,
    user: credential.username,
    password: await decrypt(credential.passwordEnc, env.ROUTER_CREDENTIALS_ENCRYPTION_KEY),
    useSsl: !!router.useSsl,
  });
}
