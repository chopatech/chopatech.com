-- CHOPA TECH — D1 (SQLite) schema
-- Ported from the original Postgres/Prisma schema. Notes on what changed:
--   * Postgres enums -> TEXT columns with CHECK constraints (SQLite has no enum type)
--   * Prisma Decimal -> REAL (floating point). Fine for display; if you need
--     exact accounting precision later, store amounts as INTEGER cents instead.
--   * Json columns -> TEXT (store with JSON.stringify, read with JSON.parse)
--   * Booleans -> INTEGER (0/1)
--   * BigInt byte counters -> INTEGER (SQLite ints are 64-bit, and this avoids
--     JavaScript BigInt/JSON serialization headaches in the Worker)
--   * All ids are TEXT (uuid v4, generated in the Worker with crypto.randomUUID())

CREATE TABLE User (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  username      TEXT NOT NULL UNIQUE,
  email         TEXT NOT NULL UNIQUE,
  passwordHash  TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'OPERATOR'
                CHECK (role IN ('SUPER_ADMIN','ADMIN','MANAGER','OPERATOR','RESELLER','VIEWER')),
  status        TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','DISABLED')),
  lastLoginAt   TEXT,
  createdAt     TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt     TEXT NOT NULL DEFAULT (datetime('now')),
  deletedAt     TEXT
);

CREATE TABLE ResellerProfile (
  id            TEXT PRIMARY KEY,
  userId        TEXT NOT NULL UNIQUE REFERENCES User(id),
  balance       REAL NOT NULL DEFAULT 0,
  commissionPct REAL NOT NULL DEFAULT 0,
  routerLimit   INTEGER NOT NULL DEFAULT 1,
  createdAt     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE Router (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  host        TEXT NOT NULL,
  apiPort     INTEGER NOT NULL DEFAULT 8728,
  useSsl      INTEGER NOT NULL DEFAULT 0,
  location    TEXT,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'OFFLINE' CHECK (status IN ('ONLINE','OFFLINE','ERROR','CONNECTING')),
  routerOsVer TEXT,
  lastSeenAt  TEXT,
  createdAt   TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt   TEXT NOT NULL DEFAULT (datetime('now')),
  deletedAt   TEXT
);
CREATE INDEX idx_router_status ON Router(status);

-- Credentials stored separately and encrypted at rest (see src/lib/crypto.js).
-- Never returned by any API response.
CREATE TABLE RouterCredential (
  id          TEXT PRIMARY KEY,
  routerId    TEXT NOT NULL UNIQUE REFERENCES Router(id),
  username    TEXT NOT NULL,
  passwordEnc TEXT NOT NULL, -- AES-256-GCM ciphertext, base64
  updatedAt   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE Plan (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  price        REAL NOT NULL,
  durationMins INTEGER NOT NULL,
  downloadMbps INTEGER,
  uploadMbps   INTEGER,
  dataLimitMb  INTEGER,
  simultaneous INTEGER NOT NULL DEFAULT 1,
  status       TEXT NOT NULL DEFAULT 'ACTIVE',
  routerId     TEXT REFERENCES Router(id), -- null = applies to all routers
  createdAt    TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt    TEXT NOT NULL DEFAULT (datetime('now')),
  deletedAt    TEXT
);

CREATE TABLE VoucherBatch (
  id          TEXT PRIMARY KEY,
  quantity    INTEGER NOT NULL,
  prefix      TEXT NOT NULL,
  codeLength  INTEGER NOT NULL,
  planId      TEXT REFERENCES Plan(id),
  routerId    TEXT REFERENCES Router(id),
  createdById TEXT NOT NULL REFERENCES User(id),
  succeeded   INTEGER NOT NULL DEFAULT 0,
  failed      INTEGER NOT NULL DEFAULT 0,
  createdAt   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE Voucher (
  id             TEXT PRIMARY KEY,
  code           TEXT NOT NULL UNIQUE,
  username       TEXT NOT NULL,
  passwordHash   TEXT NOT NULL, -- hashed hotspot password, never plaintext at rest
  planId         TEXT NOT NULL REFERENCES Plan(id),
  routerId       TEXT NOT NULL REFERENCES Router(id),
  batchId        TEXT REFERENCES VoucherBatch(id),
  status         TEXT NOT NULL DEFAULT 'AVAILABLE'
                 CHECK (status IN ('AVAILABLE','ACTIVE','USED','EXPIRED','DISABLED')),
  mikrotikSynced INTEGER NOT NULL DEFAULT 0,
  activatedAt    TEXT,
  expiresAt      TEXT,
  createdAt      TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_voucher_status ON Voucher(status);
CREATE INDEX idx_voucher_router ON Voucher(routerId);

CREATE TABLE Customer (
  id        TEXT PRIMARY KEY,
  name      TEXT,
  phone     TEXT UNIQUE,
  email     TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "Transaction" (
  id             TEXT PRIMARY KEY,
  reference      TEXT NOT NULL UNIQUE,
  customerId     TEXT REFERENCES Customer(id),
  amount         REAL NOT NULL,
  method         TEXT NOT NULL CHECK (method IN ('CASH','MANUAL','MOBILE_MONEY','GATEWAY')),
  provider       TEXT,
  voucherId      TEXT REFERENCES Voucher(id),
  routerId       TEXT REFERENCES Router(id),
  status         TEXT NOT NULL DEFAULT 'PENDING'
                 CHECK (status IN ('PENDING','SUCCESS','FAILED','CANCELLED','REFUNDED')),
  idempotencyKey TEXT NOT NULL UNIQUE,
  rawWebhook     TEXT, -- JSON string
  createdAt      TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE Payment (
  id              TEXT PRIMARY KEY,
  transactionId   TEXT NOT NULL UNIQUE REFERENCES "Transaction"(id),
  provider        TEXT NOT NULL,
  externalId      TEXT,
  status          TEXT NOT NULL DEFAULT 'PENDING'
                  CHECK (status IN ('PENDING','SUCCESS','FAILED','CANCELLED','REFUNDED')),
  webhookVerified INTEGER NOT NULL DEFAULT 0,
  createdAt       TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE Invoice (
  id            TEXT PRIMARY KEY,
  number        TEXT NOT NULL UNIQUE,
  customerId    TEXT REFERENCES Customer(id),
  transactionId TEXT UNIQUE REFERENCES "Transaction"(id),
  subtotal      REAL NOT NULL,
  tax           REAL NOT NULL DEFAULT 0,
  total         REAL NOT NULL,
  status        TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PAID','VOID')),
  createdAt     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE HotspotUser (
  id         TEXT PRIMARY KEY,
  username   TEXT NOT NULL,
  routerId   TEXT NOT NULL REFERENCES Router(id),
  profile    TEXT NOT NULL,
  ipAddress  TEXT,
  macAddress TEXT,
  status     TEXT NOT NULL DEFAULT 'OFFLINE' CHECK (status IN ('ONLINE','OFFLINE','EXPIRED')),
  dataUsedMb INTEGER NOT NULL DEFAULT 0,
  createdAt  TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_hotspotuser_router ON HotspotUser(routerId);

CREATE TABLE HotspotSession (
  id         TEXT PRIMARY KEY,
  voucherId  TEXT REFERENCES Voucher(id),
  routerId   TEXT NOT NULL REFERENCES Router(id),
  ipAddress  TEXT,
  macAddress TEXT,
  startedAt  TEXT NOT NULL DEFAULT (datetime('now')),
  endedAt    TEXT,
  bytesIn    INTEGER NOT NULL DEFAULT 0,
  bytesOut   INTEGER NOT NULL DEFAULT 0,
  status     TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','EXPIRED','DISCONNECTED'))
);
CREATE INDEX idx_session_router ON HotspotSession(routerId);
CREATE INDEX idx_session_status ON HotspotSession(status);

CREATE TABLE SMSProvider (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  isActive   INTEGER NOT NULL DEFAULT 0,
  configJson TEXT, -- non-secret config only; API keys live in Worker secrets
  createdAt  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE SMSMessage (
  id          TEXT PRIMARY KEY,
  "to"        TEXT NOT NULL,
  body        TEXT NOT NULL,
  template    TEXT,
  status      TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','SENT','FAILED')),
  providerRef TEXT,
  createdAt   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE Notification (
  id        TEXT PRIMARY KEY,
  title     TEXT NOT NULL,
  body      TEXT NOT NULL,
  type      TEXT NOT NULL, -- payment | voucher | router | sms | system
  tone      TEXT NOT NULL DEFAULT 'info', -- good | warn | bad | info
  readAt    TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE Portal (
  id            TEXT PRIMARY KEY,
  routerId      TEXT REFERENCES Router(id),
  template      TEXT NOT NULL DEFAULT 'Modern',
  welcomeText   TEXT NOT NULL DEFAULT 'Welcome to CHOPA WiFi',
  primaryColor  TEXT NOT NULL DEFAULT '#2563EB',
  buttonColor   TEXT NOT NULL DEFAULT '#FF5B34',
  logoUrl       TEXT,
  backgroundUrl TEXT,
  supportPhone  TEXT,
  footerText    TEXT,
  configJson    TEXT,
  updatedAt     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE AuditLog (
  id         TEXT PRIMARY KEY,
  userId     TEXT REFERENCES User(id),
  action     TEXT NOT NULL,
  resource   TEXT NOT NULL,
  resourceId TEXT,
  ipAddress  TEXT,
  metadata   TEXT, -- JSON string
  createdAt  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_audit_resource ON AuditLog(resource, resourceId);

CREATE TABLE Setting (
  key       TEXT PRIMARY KEY,
  value     TEXT NOT NULL, -- JSON string
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---- RADIUS-ready tables (unused until RADIUS_ENABLED=true) ----
CREATE TABLE RadCheck (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  username  TEXT NOT NULL,
  attribute TEXT NOT NULL,
  op        TEXT NOT NULL DEFAULT '==',
  value     TEXT NOT NULL
);
CREATE TABLE RadReply (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  username  TEXT NOT NULL,
  attribute TEXT NOT NULL,
  op        TEXT NOT NULL DEFAULT '=',
  value     TEXT NOT NULL
);
CREATE TABLE RadAcct (
  radacctid        INTEGER PRIMARY KEY AUTOINCREMENT,
  acctsessionid    TEXT NOT NULL,
  username         TEXT NOT NULL,
  nasipaddress     TEXT NOT NULL,
  acctstarttime    TEXT,
  acctstoptime     TEXT,
  acctinputoctets  INTEGER NOT NULL DEFAULT 0,
  acctoutputoctets INTEGER NOT NULL DEFAULT 0
);
