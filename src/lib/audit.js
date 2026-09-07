import { run, now, toJson } from "./db.js";
import { newId } from "./voucherCode.js";

export async function writeAuditLog(db, { userId, action, resource, resourceId, ip, metadata }) {
  try {
    await run(
      db,
      `INSERT INTO AuditLog (id, userId, action, resource, resourceId, ipAddress, metadata, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [newId(), userId || null, action, resource, resourceId || null, ip || null, toJson(metadata), now()]
    );
  } catch (e) {
    // Auditing must never crash the request it's observing.
    console.error("Failed to write audit log:", e.message);
  }
}
