import { Hono } from "hono";
import { first, run, now } from "../lib/db.js";
import { requireRole } from "../middleware/auth.js";
import { newId } from "../lib/voucherCode.js";

const portal = new Hono();

const DEFAULTS = { template: "Modern", welcomeText: "Welcome to CHOPA WiFi", primaryColor: "#2563EB", buttonColor: "#FF5B34" };

portal.get("/", async (c) => {
  const db = c.env.DB;
  const routerId = c.req.query("routerId") || null;
  const row = routerId
    ? await first(db, `SELECT * FROM Portal WHERE routerId = ?`, [routerId])
    : await first(db, `SELECT * FROM Portal WHERE routerId IS NULL`);
  return c.json(row || DEFAULTS);
});

portal.put("/", requireRole("SUPER_ADMIN", "ADMIN", "MANAGER"), async (c) => {
  const db = c.env.DB;
  const body = await c.req.json();
  const { routerId = null, ...data } = body;

  const existing = routerId
    ? await first(db, `SELECT * FROM Portal WHERE routerId = ?`, [routerId])
    : await first(db, `SELECT * FROM Portal WHERE routerId IS NULL`);

  if (existing) {
    await run(
      db,
      `UPDATE Portal SET template=COALESCE(?,template), welcomeText=COALESCE(?,welcomeText), primaryColor=COALESCE(?,primaryColor),
       buttonColor=COALESCE(?,buttonColor), logoUrl=COALESCE(?,logoUrl), backgroundUrl=COALESCE(?,backgroundUrl),
       supportPhone=COALESCE(?,supportPhone), footerText=COALESCE(?,footerText), updatedAt=? WHERE id=?`,
      [data.template ?? null, data.welcomeText ?? null, data.primaryColor ?? null, data.buttonColor ?? null, data.logoUrl ?? null, data.backgroundUrl ?? null, data.supportPhone ?? null, data.footerText ?? null, now(), existing.id]
    );
    return c.json(await first(db, `SELECT * FROM Portal WHERE id = ?`, [existing.id]));
  }

  const id = newId();
  await run(
    db,
    `INSERT INTO Portal (id, routerId, template, welcomeText, primaryColor, buttonColor, logoUrl, backgroundUrl, supportPhone, footerText, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, routerId, data.template || DEFAULTS.template, data.welcomeText || DEFAULTS.welcomeText, data.primaryColor || DEFAULTS.primaryColor, data.buttonColor || DEFAULTS.buttonColor, data.logoUrl || null, data.backgroundUrl || null, data.supportPhone || null, data.footerText || null, now()]
  );
  return c.json(await first(db, `SELECT * FROM Portal WHERE id = ?`, [id]));
});

export default portal;
