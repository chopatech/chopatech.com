const express = require("express");
const prisma = require("../utils/prisma");
const { requireRole } = require("../middleware/auth");
const { ApiError } = require("../middleware/errorHandler");
const { getMikrotikAdapter } = require("../integrations/mikrotik");
const { writeAuditLog } = require("../services/audit.service");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const { routerId, status, q } = req.query;
    const users = await prisma.hotspotUser.findMany({
      where: {
        routerId: routerId || undefined,
        status: status || undefined,
        OR: q ? [
          { username: { contains: String(q), mode: "insensitive" } },
          { ipAddress: { contains: String(q) } },
          { macAddress: { contains: String(q), mode: "insensitive" } },
        ] : undefined,
      },
      include: { router: true },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });
    res.json(users);
  } catch (err) { next(err); }
});

router.post("/:id/disconnect", requireRole("SUPER_ADMIN", "ADMIN", "MANAGER", "OPERATOR"), async (req, res, next) => {
  try {
    const user = await prisma.hotspotUser.findUnique({ where: { id: req.params.id }, include: { router: true } });
    if (!user) throw new ApiError(404, "User not found");

    const activeSession = await prisma.hotspotSession.findFirst({ where: { routerId: user.routerId, status: "ACTIVE" } });
    if (activeSession) {
      const credential = await prisma.routerCredential.findUnique({ where: { routerId: user.routerId } });
      const adapter = getMikrotikAdapter(user.router, credential);
      await adapter.removeHotspotActiveSession(activeSession.id).catch(() => null);
      await prisma.hotspotSession.update({ where: { id: activeSession.id }, data: { status: "DISCONNECTED", endedAt: new Date() } });
    }

    const updated = await prisma.hotspotUser.update({ where: { id: user.id }, data: { status: "OFFLINE" } });
    await writeAuditLog({ userId: req.user.id, action: "USER_DISCONNECTED", resource: "HotspotUser", resourceId: user.id, ip: req.ip });
    res.json(updated);
  } catch (err) { next(err); }
});

router.post("/:id/disable", requireRole("SUPER_ADMIN", "ADMIN", "MANAGER"), async (req, res, next) => {
  try {
    const user = await prisma.hotspotUser.findUnique({ where: { id: req.params.id }, include: { router: true } });
    if (!user) throw new ApiError(404, "User not found");
    const credential = await prisma.routerCredential.findUnique({ where: { routerId: user.routerId } });
    const adapter = getMikrotikAdapter(user.router, credential);
    await adapter.disableHotspotUser(user.username);
    const updated = await prisma.hotspotUser.update({ where: { id: user.id }, data: { status: "OFFLINE" } });
    await writeAuditLog({ userId: req.user.id, action: "USER_DISABLED", resource: "HotspotUser", resourceId: user.id, ip: req.ip });
    res.json(updated);
  } catch (err) { next(err); }
});

router.delete("/:id", requireRole("SUPER_ADMIN", "ADMIN"), async (req, res, next) => {
  try {
    await prisma.hotspotUser.delete({ where: { id: req.params.id } });
    await writeAuditLog({ userId: req.user.id, action: "USER_DELETED", resource: "HotspotUser", resourceId: req.params.id, ip: req.ip });
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
