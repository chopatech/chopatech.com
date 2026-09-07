import { Hono } from "hono";
import { all, run, now, parseJson, toJson } from "../lib/db.js";
import { requireRole } from "../middleware/auth.js";

const settings = new Hono();

settings.get("/", async (c) => {
  const rows = await all(c.env.DB, `SELECT * FROM Setting`);
  const out = {};
  for (const r of rows) out[r.key] = parseJson(r.value);
  return c.json(out);
});

settings.put("/", requireRole("SUPER_ADMIN", "ADMIN"), async (c) => {
  const db = c.env.DB;
  const body = (await c.req.json()) || {};
  for (const [key, value] of Object.entries(body)) {
    await run(
      db,
      `INSERT INTO Setting (key, value, updatedAt) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt`,
      [key, toJson(value), now()]
    );
  }
  return c.json({ ok: true });
});

export default settings;
