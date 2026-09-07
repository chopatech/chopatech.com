import { Hono } from "hono";
import { z } from "zod";
import { all, first, run, now } from "../lib/db.js";
import { requireRole } from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";
import { hashPassword } from "../lib/password.js";
import { writeAuditLog } from "../lib/audit.js";
import { newId } from "../lib/voucherCode.js";

const staff = new Hono();

staff.get("/", requireRole("SUPER_ADMIN", "ADMIN", "MANAGER"), async (c) => {
  const rows = await all(
    c.env.DB,
    `SELECT id, name, username, email, role, status, lastLoginAt FROM User WHERE deletedAt IS NULL ORDER BY createdAt ASC`
  );
  return c.json(rows);
});

const createSchema = z.object({
  name: z.string().min(2),
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "MANAGER", "OPERATOR", "RESELLER", "VIEWER"]),
});

staff.post("/", requireRole("SUPER_ADMIN", "ADMIN"), async (c) => {
  const parsed = createSchema.safeParse(await c.req.json());
  if (!parsed.success) throw new ApiError(400, "Invalid staff details", parsed.error.issues);
  const body = parsed.data;
  const db = c.env.DB;
  const authUser = c.get("user");
  const id = newId();

  await run(
    db,
    `INSERT INTO User (id, name, username, email, passwordHash, role, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)`,
    [id, body.name, body.username, body.email, await hashPassword(body.password), body.role, now(), now()]
  );
  await writeAuditLog(db, { userId: authUser.id, action: "STAFF_CREATED", resource: "User", resourceId: id, ip: c.req.header("cf-connecting-ip") });
  return c.json({ id, name: body.name, role: body.role }, 201);
});

staff.put("/:id", requireRole("SUPER_ADMIN", "ADMIN"), async (c) => {
  const db = c.env.DB;
  const authUser = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json();

  await run(
    db,
    `UPDATE User SET name=COALESCE(?,name), role=COALESCE(?,role), status=COALESCE(?,status), updatedAt=? WHERE id=?`,
    [body.name ?? null, body.role ?? null, body.status ?? null, now(), id]
  );
  const user = await first(db, `SELECT id, name, role, status FROM User WHERE id = ?`, [id]);
  if (!user) throw new ApiError(404, "User not found");
  await writeAuditLog(db, { userId: authUser.id, action: "STAFF_UPDATED", resource: "User", resourceId: id, ip: c.req.header("cf-connecting-ip") });
  return c.json(user);
});

staff.delete("/:id", requireRole("SUPER_ADMIN"), async (c) => {
  const db = c.env.DB;
  const authUser = c.get("user");
  const id = c.req.param("id");
  await run(db, `UPDATE User SET deletedAt=?, status='DISABLED' WHERE id=?`, [now(), id]);
  await writeAuditLog(db, { userId: authUser.id, action: "STAFF_DELETED", resource: "User", resourceId: id, ip: c.req.header("cf-connecting-ip") });
  return c.body(null, 204);
});

export default staff;
