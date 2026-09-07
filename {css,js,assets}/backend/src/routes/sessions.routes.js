const express = require("express");
const prisma = require("../utils/prisma");
const { requireRole } = require("../middleware/auth");
const { ApiError } = require("../middleware/errorHandler");
const { getMikrotikAdapter } = require("../integrations/mikrotik");
const { writeAuditLog } = require("../services/audit.service");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const { routerId, status } = req.query;
    const sessions = await prisma.hotspotSession.findMany({
      where: { routerId: routerId || undefined, status: status || undefined },
      include: { router: true, voucher: true },
      orderBy: { startedAt: "desc" },
      take: 200,
    });
    res.json(sessions);
  } catch (err) { next(err); }
});

router.post("/:id/disconnect", requireRole("SUPER_ADMIN", "ADMIN", "MANAGER", "OPERATOR"), async (req, res, next) => {
  try {
    const session = await prisma.hotspotSession.findUnique({ where: { id: req.params.id }, include: { router: true } });
    if (!session) throw new ApiError(404, "Session not found");

    const credential = await prisma.routerCredential.findUnique({ where: { routerId: session.routerId } });
    const adapter = getMikrotikAdapter(session.router, credential);
    await adapter.removeHotspotActiveSession(session.id);

    const updated = await prisma.hotspotSession.update({ where: { id: session.id }, data: { status: "DISCONNECTED", endedAt: new Date() } });
    await writeAuditLog({ userId: req.user.id, action: "SESSION_DISCONNECTED", resource: "HotspotSession", resourceId: session.id, ip: req.ip });
    res.json(updated);
  } catch (err) { next(err); }
});

module.exports = router;
