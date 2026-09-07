require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const logger = require("./src/utils/logger");
const errorHandler = require("./src/middleware/errorHandler");

const authRoutes = require("./src/routes/auth.routes");
const dashboardRoutes = require("./src/routes/dashboard.routes");
const routerRoutes = require("./src/routes/routers.routes");
const planRoutes = require("./src/routes/plans.routes");
const voucherRoutes = require("./src/routes/vouchers.routes");
const userRoutes = require("./src/routes/users.routes");
const sessionRoutes = require("./src/routes/sessions.routes");
const transactionRoutes = require("./src/routes/transactions.routes");
const paymentRoutes = require("./src/routes/payments.routes");
const invoiceRoutes = require("./src/routes/invoices.routes");
const reportRoutes = require("./src/routes/reports.routes");
const notificationRoutes = require("./src/routes/notifications.routes");
const staffRoutes = require("./src/routes/staff.routes");
const smsRoutes = require("./src/routes/sms.routes");
const settingsRoutes = require("./src/routes/settings.routes");
const portalRoutes = require("./src/routes/portal.routes");

const { authenticate } = require("./src/middleware/auth");

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || true, credentials: true }));
app.use(cookieParser(process.env.COOKIE_SECRET));

// Webhook routes need the raw body for signature verification, so they are
// mounted BEFORE the JSON body parser.
app.use("/api/payments/webhook", express.raw({ type: "*/*" }));

app.use(express.json({ limit: "2mb" }));

app.use(
  rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    max: Number(process.env.RATE_LIMIT_MAX || 300),
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/api/health", (req, res) => res.json({ ok: true, service: "chopa-tech-backend", time: new Date().toISOString() }));

// --- public routes ---
app.use("/api/auth", authRoutes);
app.use("/api/payments", paymentRoutes); // includes public webhook + authenticated create/status

// --- authenticated routes ---
app.use("/api/dashboard", authenticate, dashboardRoutes);
app.use("/api/routers", authenticate, routerRoutes);
app.use("/api/plans", authenticate, planRoutes);
app.use("/api/vouchers", authenticate, voucherRoutes);
app.use("/api/users", authenticate, userRoutes);
app.use("/api/sessions", authenticate, sessionRoutes);
app.use("/api/transactions", authenticate, transactionRoutes);
app.use("/api/invoices", authenticate, invoiceRoutes);
app.use("/api/reports", authenticate, reportRoutes);
app.use("/api/notifications", authenticate, notificationRoutes);
app.use("/api/staff", authenticate, staffRoutes);
app.use("/api/sms", authenticate, smsRoutes);
app.use("/api/settings", authenticate, settingsRoutes);
app.use("/api/portal", authenticate, portalRoutes);

app.use((req, res) => res.status(404).json({ error: { message: "Not found" } }));
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => logger.info(`CHOPA TECH backend listening on :${PORT}`));

module.exports = app;
