const express = require("express");
const { z } = require("zod");
const prisma = require("../utils/prisma");
const { requireRole } = require("../middleware/auth");
const { ApiError } = require("../middleware/errorHandler");
const { encrypt } = require("../utils/crypto");
const { getMikrotikAdapter } = require("../integrations/mikrotik");
const { writeAuditLog } = require("../services/audit.service");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const routers = await prisma.router.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "asc" } });
    res.json(routers); // never includes RouterCredential
  } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const r = await prisma.router.findUnique({ where: { id: req.params.id } });
    if (!r) throw new ApiError(404, "Router not found");
    res.json(r);
  } catch (err) { next(err); }
});

const createSchema = z.object({
  name: z.string().min(2),
  host: z.string().min(3),
  apiPort: z.number().int().default(8728),
  useSsl: z.boolean().default(false),
  username: z.string().min(1),
  password: z.string().min(1),
  location: z.string().optional(),
  description: z.string().optional(),
});

router.post("/", requireRole("SUPER_ADMIN", "ADMIN"), async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);

    const routerRow = await prisma.router.create({
      data: {
        name: body.name, host: body.host, apiPort: body.apiPort, useSsl: body.useSsl,
        location: body.location, description: body.description, status: "CONNECTING",
      },
    });
    await prisma.routerCredential.create({
      data: { routerId: routerRow.id, username: body.username, passwordEnc: encrypt(body.password) },
    });

    // Attempt an immediate connection so the admin gets instant feedback (RULE per spec section 38).
    try {
      const adapter = getMikrotikAdapter(routerRow, { username: body.username, passwordEnc: encrypt(body.password) });
      const result = await adapter.testConnection();
      await prisma.router.update({
        where: { id: routerRow.id },
        data: { status: "ONLINE", routerOsVer: result.routerOsVersion, lastSeenAt: new Date() },
      });
    } catch (connectErr) {
      await prisma.router.update({ where: { id: routerRow.id }, data: { status: "ERROR" } });
    }

    await writeAuditLog({ userId: req.user.id, action: "ROUTER_ADDED", resource: "Router", resourceId: routerRow.id, ip: req.ip });
    res.status(201).json(await prisma.router.findUnique({ where: { id: routerRow.id } }));
  } catch (err) {
    next(err.issues ? new ApiError(400, "Invalid router details", err.issues) : err);
  }
});

router.put("/:id", requireRole("SUPER_ADMIN", "ADMIN"), async (req, res, next) => {
  try {
    const { name, location, description, apiPort, useSsl } = req.body;
    const updated = await prisma.router.update({
      where: { id: req.params.id },
      data: { name, location, description, apiPort, useSsl },
    });
    await writeAuditLog({ userId: req.user.id, action: "ROUTER_UPDATED", resource: "Router", resourceId: updated.id, ip: req.ip });
    res.json(updated);
  } catch (err) { next(err); }
});

router.delete("/:id", requireRole("SUPER_ADMIN", "ADMIN"), async (req, res, next) => {
  try {
    await prisma.router.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    await writeAuditLog({ userId: req.user.id, action: "ROUTER_DELETED", resource: "Router", resourceId: req.params.id, ip: req.ip });
    res.status(204).end();
  } catch (err) { next(err); }
});

router.post("/:id/test", async (req, res, next) => {
  try {
    const routerRow = await prisma.router.findUnique({ where: { id: req.params.id } });
    if (!routerRow) throw new ApiError(404, "Router not found");
    const credential = await prisma.routerCredential.findUnique({ where: { routerId: routerRow.id } });

    const adapter = getMikrotikAdapter(routerRow, credential);
    try {
      const result = await adapter.testConnection();
      await prisma.router.update({
        where: { id: routerRow.id },
        data: { status: "ONLINE", routerOsVer: result.routerOsVersion, lastSeenAt: new Date() },
      });
      res.json({ ok: true, ...result });
    } catch (connectErr) {
      await prisma.router.update({ where: { id: routerRow.id }, data: { status: "ERROR" } });
      res.json({
        ok: false,
        error: connectErr.message,
        troubleshooting: [
          "Check the IP/host and API port are correct",
          "Confirm the RouterOS API service is enabled (IP > Services)",
          "Verify the username/password",
          "Check firewall rules allow API access from this server",
          "Confirm the router is reachable on the network",
        ],
      });
    }
  } catch (err) { next(err); }
});

module.exports = router;
