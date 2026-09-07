const express = require("express");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const crypto = require("crypto");
const prisma = require("../utils/prisma");
const { hashPassword, verifyPassword } = require("../utils/password");
const { ApiError } = require("../middleware/errorHandler");
const { writeAuditLog } = require("../services/audit.service");

const router = express.Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(3).optional(),
});

router.post("/register", async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    const username = body.username || body.email.split("@")[0];

    const existing = await prisma.user.findFirst({ where: { OR: [{ email: body.email }, { username }] } });
    if (existing) throw new ApiError(409, "An account with this email or username already exists");

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        username,
        passwordHash: await hashPassword(body.password),
        role: "ADMIN", // first account for a new workspace defaults to ADMIN
      },
    });

    await writeAuditLog({ userId: user.id, action: "USER_REGISTERED", resource: "User", resourceId: user.id, ip: req.ip });
    res.status(201).json({ id: user.id, email: user.email, username: user.username });
  } catch (err) {
    next(err.issues ? new ApiError(400, "Invalid registration details", err.issues) : err);
  }
});

const loginSchema = z.object({ username: z.string().min(1), password: z.string().min(1) });

router.post("/login", async (req, res, next) => {
  try {
    const { username, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findFirst({
      where: { OR: [{ username }, { email: username }], deletedAt: null },
    });
    if (!user || user.status !== "ACTIVE") throw new ApiError(401, "Invalid username or password");

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) throw new ApiError(401, "Invalid username or password");

    const token = jwt.sign(
      { id: user.id, role: user.role, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
    );

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await writeAuditLog({ userId: user.id, action: "USER_LOGIN", resource: "User", resourceId: user.id, ip: req.ip });

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err.issues ? new ApiError(400, "Invalid login details", err.issues) : err);
  }
});

router.post("/forgot-password", async (req, res, next) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });

    // Always respond the same way whether or not the account exists,
    // so this endpoint can't be used to enumerate registered emails.
    if (user) {
      const resetToken = crypto.randomBytes(32).toString("hex");
      // TODO: store a hashed version of resetToken + expiry, and email it via your SMS/email provider.
      await writeAuditLog({ userId: user.id, action: "PASSWORD_RESET_REQUESTED", resource: "User", resourceId: user.id, ip: req.ip });
    }
    res.json({ ok: true });
  } catch (err) {
    next(new ApiError(400, "Invalid email"));
  }
});

router.post("/reset-password", async (req, res, next) => {
  try {
    const { token, newPassword } = z.object({ token: z.string(), newPassword: z.string().min(8) }).parse(req.body);
    // TODO: look up the hashed reset token, verify expiry, then update the user's passwordHash.
    throw new ApiError(501, "Password reset completion is not wired to an email/SMS delivery channel yet");
  } catch (err) {
    next(err);
  }
});

module.exports = router;
