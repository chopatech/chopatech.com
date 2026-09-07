import { verifyToken } from "../lib/jwt.js";
import { ApiError } from "./errorHandler.js";

export async function authenticate(c, next) {
  const header = c.req.header("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new ApiError(401, "Missing authentication token");

  try {
    const payload = await verifyToken(token, c.env);
    c.set("user", payload); // { id, role, username }
  } catch {
    throw new ApiError(401, "Invalid or expired session");
  }
  await next();
}

// Usage: requireRole("ADMIN", "SUPER_ADMIN")
export function requireRole(...allowed) {
  return async (c, next) => {
    const user = c.get("user");
    if (!user) throw new ApiError(401, "Missing authentication token");
    if (!allowed.includes(user.role)) {
      throw new ApiError(403, "You do not have permission to perform this action");
    }
    await next();
  };
}
