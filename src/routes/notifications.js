import { Hono } from "hono";
import { all, run, first, now } from "../lib/db.js";

const notifications = new Hono();

notifications.get("/", async (c) => {
  return c.json(await all(c.env.DB, `SELECT * FROM Notification ORDER BY createdAt DESC LIMIT 30`));
});

notifications.post("/:id/read", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  await run(db, `UPDATE Notification SET readAt = ? WHERE id = ?`, [now(), id]);
  return c.json(await first(db, `SELECT * FROM Notification WHERE id = ?`, [id]));
});

export default notifications;
