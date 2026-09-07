import { Hono } from "hono";
import { z } from "zod";
import { first, run, now } from "../lib/db.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { signToken } from "../lib/jwt.js";
import { ApiError } from "../middleware/errorHandler.js";
import { writeAuditLog } from "../lib/audit.js";
import { newId, randomHex } from "../lib/voucherCode.js";

const auth = new Hono();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(3).optional(),
});

auth.post("/register", async (c) => {
  const body = registerSchema.safeParse(await c.req.json());
  if (!body.success) throw new ApiError(400, "Invalid registration details", body.error.issues);
  const { name, email, password } = body.data;
  const username = body.data.username || email.split("@")[0];
  const db = c.env.DB;

  const existing = await first(db, `SELECT id FROM User WHERE email = ? OR username = ?`, [email, username]);
  if (existing) throw new ApiError(409, "An account with this email or username already exists");

  const id = newId();
  await run(
    db,
    `INSERT INTO User (id, name, username, email, passwordHash, role, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, 'ADMIN', 'ACTIVE', ?, ?)`, // first account for a new workspace defaults to ADMIN
    [id, name, username, email, await hashPassword(password), now(), now()]
  );

  await writeAuditLog(db, { userId: id, action: "USER_REGISTERED", resource: "User", resourceId: id, ip: c.req.header("cf-connecting-ip") });
  return c.json({ id, email, username }, 201);
});

const loginSchema = z.object({ username: z.string().min(1), password: z.string().min(1) });

auth.post("/login", async (c) => {
  const body = loginSchema.safeParse(await c.req.json());
  if (!body.success) throw new ApiError(400, "Invalid login details", body.error.issues);
  const { username, password } = body.data;
  const db = c.env.DB;

  const user = await first(
    db,
    `SELECT * FROM User WHERE (username = ? OR email = ?) AND deletedAt IS NULL`,
    [username, username]
  );
  if (!user || user.status !== "ACTIVE") throw new ApiError(401, "Invalid username or password");

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) throw new ApiError(401, "Invalid username or password");

  const token = await signToken({ id: user.id, role: user.role, username: user.username }, c.env);

  await run(db, `UPDATE User SET lastLoginAt = ? WHERE id = ?`, [now(), user.id]);
  await writeAuditLog(db, { userId: user.id, action: "USER_LOGIN", resource: "User", resourceId: user.id, ip: c.req.header("cf-connecting-ip") });

  return c.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

auth.post("/forgot-password", async (c) => {
  const body = z.object({ email: z.string().email() }).safeParse(await c.req.json());
  if (!body.success) throw new ApiError(400, "Invalid email");
  const db = c.env.DB;
  const user = await first(db, `SELECT id FROM User WHERE email = ?`, [body.data.email]);

  // Always respond the same way whether or not the account exists, so this
  // endpoint can't be used to enumerate registered emails.
  if (user) {
    const resetToken = randomHex(32);
    // TODO: store a hashed version of resetToken + expiry, and email/SMS it via your notification provider.
    await writeAuditLog(db, { userId: user.id, action: "PASSWORD_RESET_REQUESTED", resource: "User", resourceId: user.id, ip: c.req.header("cf-connecting-ip") });
  }
  return c.json({ ok: true });
});

auth.post("/reset-password", async (c) => {
  const body = z.object({ token: z.string(), newPassword: z.string().min(8) }).safeParse(await c.req.json());
  if (!body.success) throw new ApiError(400, "Invalid request", body.error.issues);
  // TODO: look up the hashed reset token, verify expiry, then update the user's passwordHash.
  throw new ApiError(501, "Password reset completion is not wired to an email/SMS delivery channel yet");
});

export default auth;
