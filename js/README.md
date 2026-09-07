# CHOPA TECH — WiFi Billing & Hotspot Management System

Smart WiFi Billing & Network Management for ISPs, hotspot businesses, cyber cafés, hotels, restaurants, schools, offices, and anyone running a MikroTik-powered Wi-Fi network.

This repository contains:

```
/frontend   Plain HTML/CSS/JavaScript dashboard (no framework) matching the CHOPA TECH UI
/backend    Node.js + TypeScript-style Express API, Prisma ORM, MikroTik/payment/SMS adapters
```

> **Status note:** the frontend is a fully working, data-driven UI. It talks to the real backend
> API when one is running; if the backend is unreachable it falls back to a clearly-labeled
> **"Demo data — backend not connected"** view so the interface stays reviewable. The backend
> is a complete, runnable Express + Prisma project with real routes, RBAC, audit logging, and
> encrypted router credentials — but MikroTik, payment, and SMS integrations require **your own
> real credentials** to go live (see below). Nothing here fakes a connection to hardware or a
> payment provider you haven't configured.

---

## 1. Quick start (frontend only — instant preview)

The frontend has zero build step.

```bash
cd frontend
npx serve .          # or: python3 -m http.server 5173
```

Open the printed URL, then click **"Explore demo dashboard"** on the login screen. Every screen
that is showing demo data displays an explicit `Demo data — backend not connected` flag.

## 2. Full stack (frontend + real backend + database)

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- A MikroTik router running RouterOS 6.43+ with the API service enabled (optional for preview,
  required for real hotspot control — see `MIKROTIK_SETUP.md`)

### Backend setup

```bash
cd backend
cp .env.example .env        # fill in DATABASE_URL, JWT_SECRET, etc.
npm install
npx prisma migrate dev --name init
npm run prisma:seed         # creates one demo admin + one demo router (offline until you connect it)
npm run dev                 # starts the API on http://localhost:4000
```

Demo login created by the seed script:
- username: `amani`
- password: `ChangeMe123!` — **change this immediately in a real deployment.**

### Point the frontend at your backend

By default the frontend calls `/api` on the same origin. If you serve the frontend from a
different origin/port, set this before the other scripts load (e.g. in `index.html`):

```html
<script>window.CHOPA_API_BASE = "http://localhost:4000/api";</script>
```

### Run tests

```bash
cd backend
npm test
```

---

## 3. Environment variables

See `backend/.env.example` for the full list. Never commit a real `.env` file. Secrets that
must **never** reach the browser: `JWT_SECRET`, `ROUTER_CREDENTIALS_ENCRYPTION_KEY`, all
`MPESA_*` / `AIRTEL_MONEY_*` / `MIXX_YAS_*` / `HALOPESA_*` keys, and `SMS_API_KEY`.

## 4. Database & migrations

The schema lives in `backend/prisma/schema.prisma` and covers: User, Role/permissions (via
`Role` enum + `requireRole` middleware), Router, RouterCredential (encrypted), Plan, Voucher,
VoucherBatch, Transaction, Payment, Invoice, Customer, HotspotUser, HotspotSession, SMSMessage,
SMSProvider, Notification, Portal, AuditLog, Setting, and RADIUS-ready tables (RadCheck,
RadReply, RadAcct) for a future phase.

```bash
npx prisma migrate dev --name <description>   # create/apply a migration
npx prisma studio                              # browse the database visually
```

## 5. MikroTik configuration

See **`MIKROTIK_SETUP.md`** for step-by-step RouterOS configuration (API, hotspot, profiles,
firewall, NAT, DNS). Until you add real router credentials, `src/integrations/mikrotik/MockAdapter.js`
is used automatically in development so you can exercise voucher generation, plans, and the UI —
every response from it is tagged `mock: true` and is never written to the database as if it were
a real RouterOS confirmation for production (`NODE_ENV=production` refuses to fall back to the
mock adapter).

## 6. Payment configuration

`src/integrations/payments/PaymentProvider.js` defines the interface
(`createPayment / checkPaymentStatus / handleCallback / refundPayment`) that every provider
adapter implements. `MockProvider.js` is used by default (`PAYMENTS_MODE=mock`) so the checkout
flow can be tested end-to-end. `MpesaProvider.js` is a **structural skeleton** — Vodacom Tanzania's
exact request/response format depends on your merchant agreement, so fill in the TODOs with your
real API docs before setting `PAYMENTS_MODE=live`. Add `AirtelMoneyProvider.js`, `MixxYasProvider.js`,
and `HaloPesaProvider.js` following the same interface when you have their credentials.

**Webhook safety:** all webhook calls are signature-verified and processed idempotently
(`Payment.webhookVerified`, `Transaction.idempotencyKey`). A voucher is only ever activated after
a verified successful payment — never from a frontend redirect alone.

## 7. SMS configuration

`src/integrations/sms/SmsProvider.js` defines the interface; `MockSmsProvider.js` is the default.
Add a real provider (Beem, Africa's Talking, etc.) by implementing the same interface, then set
`SMS_MODE=live` and `SMS_PROVIDER`.

## 8. Roles & permissions

| Role | Typical use |
|---|---|
| SUPER_ADMIN | Full access, including staff & deleting routers |
| ADMIN | Manage routers, plans, vouchers, staff |
| MANAGER | Manage plans, vouchers, view reports |
| OPERATOR | Day-to-day voucher/session management |
| RESELLER | Generate vouchers against an allocated balance |
| VIEWER | Read-only |

Enforced by `src/middleware/auth.js` (`authenticate`, `requireRole(...)`) on every sensitive route.

## 9. Deployment targets

The backend is a standard Express + Prisma app — deployable to a VPS, Docker, Railway, Render,
Fly.io, or AWS ECS/EC2 with a managed Postgres instance. A `Dockerfile` and `docker-compose.yml`
are provided in `/docker` (see comments inside) as a starting point; adjust for your provider.
Cloudflare works well in front of the static frontend (Cloudflare Pages) with the backend hosted
separately, since the backend needs a persistent TCP connection to your MikroTik router(s).

## 10. Troubleshooting

| Symptom | Likely cause |
|---|---|
| Frontend shows "Demo data — backend not connected" everywhere | Backend isn't running, or `CHOPA_API_BASE` points to the wrong URL |
| Router status shows ERROR after adding it | Wrong IP/port/credentials, API service disabled, or firewall blocking API access — see `MIKROTIK_SETUP.md` |
| Voucher generation reports "failed" for some codes | The router rejected the hotspot-user creation (e.g. duplicate username, invalid profile) — check the `failures` array returned by `/api/vouchers/generate` |
| Webhook returns 401 | Signature verification failed — check the provider's webhook secret in `.env` |

## 11. Security checklist before going live

- [ ] Rotate `JWT_SECRET`, `ROUTER_CREDENTIALS_ENCRYPTION_KEY`, and all provider secrets
- [ ] Set `NODE_ENV=production` (disables the MikroTik mock fallback)
- [ ] Put the backend behind HTTPS (terminate TLS at your load balancer/Cloudflare)
- [ ] Restrict CORS `FRONTEND_URL` to your real domain
- [ ] Enable and monitor `AuditLog`
- [ ] Configure real payment + SMS providers and switch their `_MODE` env vars to `live`
- [ ] Back up PostgreSQL regularly
