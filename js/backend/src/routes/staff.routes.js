const express = require("express");
const { z } = require("zod");
const prisma = require("../utils/prisma");
const { requireRole } = require("../middleware/auth");
const { ApiError } = require("../middleware/errorHandler");
const { hashPassword } = require("../utils/password");
const { writeAuditLog } = require("../services/audit.service");

const router = express.Router();

router.get("/", requireRole("SUPER_ADMIN", "ADMIN", "MANAGER"), async (req, res, next) => {
  try {
    const staff = await prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, username: true, email: true, role: true, status: true, lastLoginAt: true },
      orderBy: { createdAt: "asc" },
    });
    res.json(staff);
  } catch (err) { next(err); }
});

const createSchema = z.object({
  name: z.string().min(2),
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "MANAGER", "OPERATOR", "RESELLER", "VIEWER"]),
});

router.post("/", requireRole("SUPER_ADMIN", "ADMIN"), async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const user = await prisma.user.create({
      data: { ...body, passwordHash: await hashPassword(body.password), password: undefined },
    });
    await writeAuditLog({ userId: req.user.id, action: "STAFF_CREATED", resource: "User", resourceId: user.id, ip: req.ip });
    res.status(201).json({ id: user.id, name: user.name, role: user.role });
  } catch (err) {
    next(err.issues ? new ApiError(400, "Invalid staff details", err.issues) : err);
  }
});

router.put("/:id", requireRole("SUPER_ADMIN", "ADMIN"), async (req, res, next) => {
  try {
    const { name, role, status } = req.body;
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { name, role, status } });
    await writeAuditLog({ userId: req.user.id, action: "STAFF_UPDATED", resource: "User", resourceId: user.id, ip: req.ip });
    res.json({ id: user.id, name: user.name, role: user.role, status: user.status });
  } catch (err) { next(err); }
});

router.delete("/:id", requireRole("SUPER_ADMIN"), async (req, res, next) => {
  try {
    await prisma.user.update({ where: { id: req.params.id }, data: { deletedAt: new Date(), status: "DISABLED" } });
    await writeAuditLog({ userId: req.user.id, action: "STAFF_DELETED", resource: "User", resourceId: req.params.id, ip: req.ip });
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
