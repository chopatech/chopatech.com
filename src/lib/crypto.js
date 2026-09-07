// AES-256-GCM helpers for encrypting MikroTik router credentials at rest,
// using the Workers runtime's native Web Crypto (no Node "crypto" needed).
// ROUTER_CREDENTIALS_ENCRYPTION_KEY (a Worker secret) can be any string --
// it's normalized to 32 bytes via SHA-256 below.

async function getKey(envKey) {
  if (!envKey) throw new Error("ROUTER_CREDENTIALS_ENCRYPTION_KEY is not set");
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(envKey));
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

function toBase64(bytes) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}
function fromBase64(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function encrypt(plainText, envKey) {
  const key = await getKey(envKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(String(plainText)));
  const out = new Uint8Array(iv.length + ciphertext.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(ciphertext), iv.length);
  return toBase64(out);
}

export async function decrypt(payload, envKey) {
  const key = await getKey(envKey);
  const buf = fromBase64(payload);
  const iv = buf.slice(0, 12);
  const data = buf.slice(12);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new TextDecoder().decode(plain);
}
