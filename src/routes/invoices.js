import { Hono } from "hono";
import { all, first } from "../lib/db.js";
import { ApiError } from "../middleware/errorHandler.js";

const invoices = new Hono();

invoices.get("/", async (c) => {
  const db = c.env.DB;
  const rows = await all(
    db,
    `SELECT i.*, c.name AS customerName, c.phone AS customerPhone, t.reference AS transactionReference
     FROM Invoice i LEFT JOIN Customer c ON c.id = i.customerId LEFT JOIN "Transaction" t ON t.id = i.transactionId
     ORDER BY i.createdAt DESC LIMIT 200`
  );
  return c.json(rows.map((row) => ({
    ...row,
    customer: row.customerName ? { name: row.customerName, phone: row.customerPhone } : null,
    transaction: row.transactionReference ? { reference: row.transactionReference } : null,
  })));
});

invoices.get("/:id", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const invoice = await first(db, `SELECT * FROM Invoice WHERE id = ?`, [id]);
  if (!invoice) throw new ApiError(404, "Invoice not found");
  const [customer, transaction] = await Promise.all([
    invoice.customerId ? first(db, `SELECT * FROM Customer WHERE id = ?`, [invoice.customerId]) : null,
    invoice.transactionId ? first(db, `SELECT * FROM "Transaction" WHERE id = ?`, [invoice.transactionId]) : null,
  ]);
  return c.json({ ...invoice, customer, transaction });
});

export default invoices;
