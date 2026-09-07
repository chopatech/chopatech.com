// Utility: generate a PBKDF2 hash in the same format the app uses, for
// manually seeding a user row. Usage: node scripts/hash-password.mjs "YourPassword123!"
import { webcrypto as crypto } from "node:crypto";

const ITERATIONS = 100_000;

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(plain) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(plain), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" }, keyMaterial, 256);
  return `pbkdf2$${ITERATIONS}$${toHex(salt)}$${toHex(bits)}`;
}

const plain = process.argv[2];
if (!plain) {
  console.error("Usage: node scripts/hash-password.mjs \"YourPassword\"");
  process.exit(1);
}
console.log(await hashPassword(plain));
