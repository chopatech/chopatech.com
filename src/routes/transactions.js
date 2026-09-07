import { Hono } from "hono";
import { all, first } from "../lib/db.js";

const transactions = new Hono();

transactions.get("/", async (c) => {
  const { status, method, routerId, from, to } = c.req.query();
  const db = c.env.DB;
  const clauses = [];
  const params = [];
  if (status) { clauses.push("t.status = ?"); params.push(status); }
  if (method) { clauses.push("t.method = ?"); params.push(method); }
  if (routerId) { clauses.push("t.routerId = ?"); params.push(routerId); }
  if (from) { clauses.push("t.createdAt >= ?"); params.push(from); }
  if (to) { clauses.push("t.createdAt <= ?"); params.push(to); }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const rows = await all(
    db,
    `SELECT t.*, c.name AS customerName, c.phone AS customerPhone, r.name AS routerName,
            v.code AS voucherCode, p.name AS planName
     FROM "Transaction" t
     LEFT JOIN Customer c ON c.id = t.customerId
     LEFT JOIN Router r ON r.id = t.routerId
     LEFT JOIN Voucher v ON v.id = t.voucherId
     LEFT JOIN Plan p ON p.id = v.planId
     ${where} ORDER BY t.createdAt DESC LIMIT 200`,
    params
  );
  return c.json(rows.map((row) => ({
    ...row,
    customer: row.customerName ? { name: row.customerName, phone: row.customerPhone } : null,
    router: row.routerName ? { name: row.routerName } : null,
    voucher: row.voucherCode ? { code: row.voucherCode, plan: row.planName ? { name: row.planName } : null } : null,
  })));
});

transactions.get("/:id", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const t = await first(db, `SELECT * FROM "Transaction" WHERE id = ?`, [id]);
  if (!t) return c.json(null);
  const [customer, voucher, routerRow, payment, invoice] = await Promise.all([
    t.customerId ? first(db, `SELECT * FROM Customer WHERE id = ?`, [t.customerId]) : null,
    t.voucherId ? first(db, `SELECT * FROM Voucher WHERE id = ?`, [t.voucherId]) : null,
    t.routerId ? first(db, `SELECT * FROM Router WHERE id = ?`, [t.routerId]) : null,
    first(db, `SELECT * FROM Payment WHERE transactionId = ?`, [id]),
    first(db, `SELECT * FROM Invoice WHERE transactionId = ?`, [id]),
  ]);
  return c.json({ ...t, customer, voucher, router: routerRow, payment, invoice });
});

export default transactions;
