const prisma = require("../utils/prisma");

async function writeAuditLog({ userId, action, resource, resourceId, ip, metadata }) {
  try {
    await prisma.auditLog.create({
      data: { userId, action, resource, resourceId, ipAddress: ip, metadata },
    });
  } catch (e) {
    // Auditing must never crash the request it's observing.
    // eslint-disable-next-line no-console
    console.error("Failed to write audit log:", e.message);
  }
}

module.exports = { writeAuditLog };
