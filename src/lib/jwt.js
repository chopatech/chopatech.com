// Session tokens, using jose instead of the original jsonwebtoken package.
// jose is built specifically for edge runtimes (Workers, Deno, etc.) and has
// no dependency on Node's "crypto" module, so it's the safer choice here.
import { SignJWT, jwtVerify } from "jose";

function getSecretKey(env) {
  if (!env.JWT_SECRET) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(env.JWT_SECRET);
}

// Accepts simple strings like "8h", "30m", "7d" (same format used elsewhere
// in the project) and converts to seconds for jose's expiration setter.
function expiryToSeconds(expiresIn) {
  const match = String(expiresIn || "8h").match(/^(\d+)([smhd])$/);
  if (!match) return 8 * 60 * 60;
  const n = Number(match[1]);
  const unit = { s: 1, m: 60, h: 3600, d: 86400 }[match[2]];
  return n * unit;
}

export async function signToken(payload, env) {
  const seconds = expiryToSeconds(env.JWT_EXPIRES_IN);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + seconds)
    .sign(getSecretKey(env));
}

export async function verifyToken(token, env) {
  const { payload } = await jwtVerify(token, getSecretKey(env));
  return payload; // { id, role, username, iat, exp }
}
