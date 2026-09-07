// AES-256-GCM helpers for encrypting MikroTik router credentials at rest.
// ROUTER_CREDENTIALS_ENCRYPTION_KEY must be a 32-byte value (e.g. base64 or hex encoded).
const crypto = require("crypto");

function getKey() {
  const raw = process.env.ROUTER_CREDENTIALS_ENCRYPTION_KEY;
  if (!raw) throw new Error("ROUTER_CREDENTIALS_ENCRYPTION_KEY is not set");
  return crypto.createHash("sha256").update(raw).digest(); // normalize to 32 bytes
}

function encrypt(plainText) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([cipher.update(String(plainText), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

function decrypt(payload) {
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

module.exports = { encrypt, decrypt };
