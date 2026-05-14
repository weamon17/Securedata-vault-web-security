-- server/db/schema.sql
-- SecureData Vault — SQLite schema
-- Applied automatically on first server boot. Re-applied by:
--   npm run db:init        (drop + recreate, destructive)
--   npm run db:reset       (drop + recreate + seed demo data)

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- ─── users ─────────────────────────────────────────────────────────
-- Authentication store. `role` distinguishes admin (sees the analytics
-- dashboard) from a regular user (vault owner).
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user'
                  CHECK (role IN ('user','admin')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── vault_items ───────────────────────────────────────────────────
-- A user's private notes. The schema carries BOTH plaintext and
-- ciphertext columns so the vulnerable demo (plaintext) and the
-- hardened demo (AES-256-GCM) can coexist on the same table for
-- easy side-by-side comparison.
CREATE TABLE IF NOT EXISTS vault_items (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER NOT NULL,
  title             TEXT NOT NULL,
  content_plaintext TEXT,                   -- used by /api/vulnerable
  content_encrypted TEXT,                   -- base64(iv || tag || ciphertext)
  is_encrypted      INTEGER NOT NULL DEFAULT 0 CHECK (is_encrypted IN (0,1)),
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_vault_user ON vault_items(user_id);

-- ─── audit_logs ────────────────────────────────────────────────────
-- Single sink for every security-relevant event. Populated by both
-- vulnerable and hardened routes so the dashboard can compare them.
--
-- event_type  : enum (see services/auditLog.service.js EVENT_TYPES)
-- severity    : derived from risk_score in services/riskScoring.service.js
-- status      : 'observed'   — logged, request allowed through (vulnerable)
--               'allowed'    — passed risk check (hardened, normal)
--               'blocked'    — rejected by risk threshold or middleware
-- mode        : 'vulnerable' | 'hardened' | 'neutral' (auth, vault, etc.)
CREATE TABLE IF NOT EXISTS audit_logs (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER,
  event_type      TEXT NOT NULL,
  endpoint        TEXT NOT NULL,
  http_method     TEXT,
  ip_address      TEXT,
  user_agent      TEXT,
  payload_summary TEXT,
  risk_score      INTEGER NOT NULL DEFAULT 0
                    CHECK (risk_score BETWEEN 0 AND 100),
  severity        TEXT NOT NULL
                    CHECK (severity IN ('Low','Medium','High','Critical')),
  status          TEXT NOT NULL
                    CHECK (status IN ('observed','allowed','blocked')),
  mode            TEXT NOT NULL
                    CHECK (mode IN ('vulnerable','hardened','neutral')),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_created  ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_severity ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_event    ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_mode     ON audit_logs(mode);
