import { Hono } from "hono";
import { cors } from "hono/cors";
import { errorHandler, ApiError } from "./middleware/errorHandler.js";
import { authenticate } from "./middleware/auth.js";

import authRoutes from "./routes/auth.js";
import dashboardRoutes from "./routes/dashboard.js";
import routerRoutes from "./routes/routers.js";
import planRoutes from "./routes/plans.js";
import voucherRoutes from "./routes/vouchers.js";
import userRoutes from "./routes/users.js";
import sessionRoutes from "./routes/sessions.js";
import transactionRoutes from "./routes/transactions.js";
import paymentRoutes from "./routes/payments.js";
import invoiceRoutes from "./routes/invoices.js";
import reportRoutes from "./routes/reports.js";
import notificationRoutes from "./routes/notifications.js";
import staffRoutes from "./routes/staff.js";
import smsRoutes from "./routes/sms.js";
import settingsRoutes from "./routes/settings.js";
import portalRoutes from "./routes/portal.js";

const app = new Hono();

// --- security headers (a lightweight stand-in for the original "helmet") ---
app.use("*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
});

app.use(
  "/api/*",
  cors({
    origin: (origin, c) => c.env.FRONTEND_URL || origin || "*",
    credentials: true,
  })
);

// NOTE on rate limiting: express-rate-limit's in-memory counter doesn't
// carry over between Workers isolates, so it isn't ported here. Use
// Cloudflare's dashboard-level Rate Limiting Rules (Security > WAF) instead
// -- they run in front of the Worker and don't cost you a request.

app.get("/api/health", (c) => c.json({ ok: true, service: "chopa-tech-backend", time: new Date().toISOString() }));

// --- public routes ---
app.route("/api/auth", authRoutes);
app.route("/api/payments", paymentRoutes); // mixes public (/webhook) and authenticated (/create, /:id/status) routes internally

// --- authenticated routes ---
app.use("/api/dashboard/*", authenticate);
app.route("/api/dashboard", dashboardRoutes);

app.use("/api/routers/*", authenticate);
app.route("/api/routers", routerRoutes);

app.use("/api/plans/*", authenticate);
app.route("/api/plans", planRoutes);

app.use("/api/vouchers/*", authenticate);
app.route("/api/vouchers", voucherRoutes);

app.use("/api/users/*", authenticate);
app.route("/api/users", userRoutes);

app.use("/api/sessions/*", authenticate);
app.route("/api/sessions", sessionRoutes);

app.use("/api/transactions/*", authenticate);
app.route("/api/transactions", transactionRoutes);

app.use("/api/invoices/*", authenticate);
app.route("/api/invoices", invoiceRoutes);

app.use("/api/reports/*", authenticate);
app.route("/api/reports", reportRoutes);

app.use("/api/notifications/*", authenticate);
app.route("/api/notifications", notificationRoutes);

app.use("/api/staff/*", authenticate);
app.route("/api/staff", staffRoutes);

app.use("/api/sms/*", authenticate);
app.route("/api/sms", smsRoutes);

app.use("/api/settings/*", authenticate);
app.route("/api/settings", settingsRoutes);

app.use("/api/portal/*", authenticate);
app.route("/api/portal", portalRoutes);

app.notFound((c) => c.json({ error: { message: "Not found" } }, 404));
app.onError(errorHandler);

export default app;
