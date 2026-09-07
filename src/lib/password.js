// CHOPA TECH — password hashing for the Workers build.
//
// The original backend used bcryptjs. bcrypt is pure JavaScript and its cost
// factor is deliberately CPU-heavy (~50-300ms per hash depending on rounds),
// which eats into Workers' per-request CPU budget fast -- especially during
// voucher-batch generation, which hashes one password per voucher in a loop.
// Web Crypto's PBKDF2 is implemented natively by the runtime (not in JS), so
// it's dramatically faster here while still being a slow-by-design KDF.
//
// Stored format: pbkdf2$<iterations>$<saltHex>$<hashHex>

const ITERATIONS = 100_000;

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function fromHex(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}

async function deriveBits(plain, salt, iterations) {
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(plain), "PBKDF2", false, ["deriveBits"]);
  return crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, keyMaterial, 256);
}

export async function hashPassword(plain) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await deriveBits(plain, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${toHex(salt)}$${toHex(bits)}`;
}

export async function verifyPassword(plain, stored) {
  if (!stored || !stored.startsWith("pbkdf2$")) return false;
  const [, iterStr, saltHex, hashHex] = stored.split("$");
  const iterations = Number(iterStr);
  const salt = fromHex(saltHex);
  const bits = await deriveBits(plain, salt, iterations);
  const computedHex = toHex(bits);

  // Constant-time compare.
  if (computedHex.length !== hashHex.length) return false;
  let diff = 0;
  for (let i = 0; i < computedHex.length; i++) diff |= computedHex.charCodeAt(i) ^ hashHex.charCodeAt(i);
  return diff === 0;
}
