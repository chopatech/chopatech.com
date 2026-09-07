/* =========================================================
   CHOPA TECH — DEMO SEED DATA
   -----------------------------------------------------------
   This file is ONLY used by the frontend when it cannot reach
   the real backend API (see js/api.js -> USING_MOCK flag).
   It exists so the interface is reviewable before the backend,
   MikroTik router, and payment credentials are configured.
   It must never be mistaken for production data — every screen
   that renders from this file shows a "DEMO DATA" flag.
   ========================================================= */
const DEMO = {
  currentUser: { name:"Amani Mushi", role:"SUPER_ADMIN", email:"amani@chopatech.co.tz" },

  kpis: {
    todayRevenue: 12600, todayRevenueDelta: 8.4,
    activeSessions: 11, activeSessionsDelta: 2,
    pendingApprovals: 41, pendingApprovalsDelta: -5,
    monthRevenue: 73000, monthRevenueDelta: 12.1,
    routersConnected: 1, routersTotal: 4,
    activeVouchers: 62, usedVouchers: 118, expiredVouchers: 27,
    smsCredits: 0, servicePlan: "Starter Plan",
  },

  revenueSeries: {
    "7d": [4200,6100,5300,7600,8900,9100,12600],
    "30d": [3200,4100,3800,5200,6100,5900,7300,8100,7700,8900,9200,9800,10100,9600,8800,9400,10200,11000,10700,11400,12100,11800,12300,12600,12900,13100,12700,13400,13800,12600],
    "12m": [1800000,1950000,2100000,1980000,2250000,2400000,2600000,2550000,2700000,2900000,3100000,3250000],
  },

  planMix: [
    { label:"24 Hours", value:44, color:"var(--signal)" },
    { label:"7 Days", value:26, color:"var(--violet)" },
    { label:"1 Hour", value:18, color:"var(--amber)" },
    { label:"30 Days", value:12, color:"var(--green)" },
  ],

  routers: [
    { id:"r1", name:"CHOPA SHOP", host:"41.222.10.11", port:8728, status:"ONLINE", ver:"7.15.3", location:"Kariakoo, Dar es Salaam", uptime:"14d 6h", cpu:22, ram:41, users:11 },
    { id:"r2", name:"CHOPA CAFE", host:"41.222.10.24", port:8728, status:"OFFLINE", ver:"7.14.2", location:"Mikocheni, Dar es Salaam", uptime:"—", cpu:0, ram:0, users:0 },
    { id:"r3", name:"CHOPA OFFICE", host:"41.222.10.31", port:8728, status:"ERROR", ver:"7.13.5", location:"Masaki, Dar es Salaam", uptime:"—", cpu:0, ram:0, users:0 },
    { id:"r4", name:"BRANCH 02", host:"10.10.5.2", port:8729, status:"OFFLINE", ver:"—", location:"Arusha", uptime:"—", cpu:0, ram:0, users:0 },
  ],

  plans: [
    { id:"p1", name:"1 Hour", price:500, duration:"1 hour", down:5, up:2, data:"Unlimited", router:"All routers", users:1, status:"ACTIVE" },
    { id:"p2", name:"6 Hours", price:1000, duration:"6 hours", down:5, up:2, data:"Unlimited", router:"All routers", users:1, status:"ACTIVE" },
    { id:"p3", name:"24 Hours", price:2000, duration:"24 hours", down:8, up:3, data:"Unlimited", router:"All routers", users:2, status:"ACTIVE" },
    { id:"p4", name:"7 Days", price:7000, duration:"7 days", down:10, up:4, data:"50 GB", router:"CHOPA SHOP", users:2, status:"ACTIVE" },
    { id:"p5", name:"30 Days", price:20000, duration:"30 days", down:15, up:6, data:"200 GB", router:"CHOPA SHOP", users:3, status:"ACTIVE" },
  ],

  vouchers: [
    { code:"CHOPA-8F2K9X", user:"8F2K9X", pass:"a91js2", plan:"24 Hours", price:2000, router:"CHOPA SHOP", created:"2026-09-04 08:12", expiry:"2026-09-05 08:12", status:"ACTIVE" },
    { code:"CHOPA-3Q7L1M", user:"3Q7L1M", pass:"z12kd9", plan:"1 Hour", price:500, router:"CHOPA SHOP", created:"2026-09-04 09:40", expiry:"—", status:"AVAILABLE" },
    { code:"CHOPA-9T4R2N", user:"9T4R2N", pass:"p88xy1", plan:"7 Days", price:7000, router:"CHOPA CAFE", created:"2026-09-01 12:00", expiry:"2026-09-08 12:00", status:"USED" },
    { code:"CHOPA-5W1E6B", user:"5W1E6B", pass:"m30qq7", plan:"6 Hours", price:1000, router:"CHOPA SHOP", created:"2026-08-30 18:22", expiry:"2026-08-31 00:22", status:"EXPIRED" },
    { code:"CHOPA-2K8Y4P", user:"2K8Y4P", pass:"c77vn2", plan:"30 Days", price:20000, router:"CHOPA SHOP", created:"2026-08-20 10:05", expiry:"—", status:"DISABLED" },
  ],

  hotspotUsers: [
    { username:"8F2K9X", voucher:"CHOPA-8F2K9X", router:"CHOPA SHOP", profile:"24 Hours", ip:"10.5.50.12", mac:"AC:23:3F:11:9A:02", status:"ONLINE", start:"08:12", expiry:"tomorrow 08:12", data:"1.2 GB", session:"2h 10m" },
    { username:"9T4R2N", voucher:"CHOPA-9T4R2N", router:"CHOPA CAFE", profile:"7 Days", ip:"10.5.50.14", mac:"6C:71:D9:AE:00:5F", status:"ONLINE", start:"09:03", expiry:"Sep 8, 12:00", data:"640 MB", session:"55m" },
    { username:"1Z9X0Q", voucher:"CHOPA-1Z9X0Q", router:"CHOPA SHOP", profile:"1 Hour", ip:"10.5.50.19", mac:"88:E9:FE:12:44:71", status:"EXPIRED", start:"yesterday", expiry:"expired", data:"210 MB", session:"1h 0m" },
  ],

  transactions: [
    { id:"TXN-88213", customer:"Juma Hassan", amount:2000, method:"M-Pesa", plan:"24 Hours", router:"CHOPA SHOP", status:"SUCCESS", date:"2026-09-04 08:11", ref:"MP240904.1122.C1" },
    { id:"TXN-88214", customer:"Neema K.", amount:500, method:"Cash", plan:"1 Hour", router:"CHOPA SHOP", status:"SUCCESS", date:"2026-09-04 09:39", ref:"CASH-0093" },
    { id:"TXN-88215", customer:"Baraka M.", amount:7000, method:"Airtel Money", plan:"7 Days", router:"CHOPA CAFE", status:"PENDING", date:"2026-09-04 10:02", ref:"AIRTEL-77281" },
    { id:"TXN-88216", customer:"Fatma S.", amount:1000, method:"Mixx by Yas", plan:"6 Hours", router:"CHOPA SHOP", status:"FAILED", date:"2026-09-03 18:20", ref:"MIXX-10029" },
  ],

  sessions: [
    { username:"8F2K9X", router:"CHOPA SHOP", ip:"10.5.50.12", mac:"AC:23:3F:11:9A:02", start:"08:12", duration:"2h 10m", down:"1.1 GB", up:"140 MB", status:"ACTIVE" },
    { username:"9T4R2N", router:"CHOPA CAFE", ip:"10.5.50.14", mac:"6C:71:D9:AE:00:5F", start:"09:03", duration:"55m", down:"590 MB", up:"50 MB", status:"ACTIVE" },
  ],

  invoices: [
    { id:"INV-2026-0091", customer:"Juma Hassan", date:"2026-09-04", total:2000, status:"PAID" },
    { id:"INV-2026-0090", customer:"Baraka M.", date:"2026-09-04", total:7000, status:"PENDING" },
  ],

  notifications: [
    { icon:"payment", tone:"good", title:"Payment received", body:"TSH 2,000 · M-Pesa · Juma Hassan", time:"3m ago" },
    { icon:"router", tone:"bad", title:"Router offline", body:"CHOPA CAFE lost connection", time:"22m ago" },
    { icon:"ticket", tone:"info", title:"Voucher batch generated", body:"100 vouchers · 24 Hours · CHOPA SHOP", time:"1h ago" },
    { icon:"alert", tone:"warn", title:"Low SMS credits", body:"0 credits remaining", time:"2h ago" },
  ],

  staff: [
    { name:"Amani Mushi", username:"amani", email:"amani@chopatech.co.tz", role:"SUPER_ADMIN", status:"ACTIVE", last:"Today 08:02" },
    { name:"Grace Lyimo", username:"grace", email:"grace@chopatech.co.tz", role:"MANAGER", status:"ACTIVE", last:"Yesterday 17:41" },
    { name:"Ismail Ally", username:"ismail", email:"ismail@chopatech.co.tz", role:"OPERATOR", status:"DISABLED", last:"Aug 22, 09:12" },
  ],
};
