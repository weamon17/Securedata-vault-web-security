// server/db/database.js
// better-sqlite3 wrapper.
//
// On first require:
//   - opens (or creates) the SQLite file at config.DB_PATH
//   - turns on foreign keys + WAL journal
//   - applies schema.sql if the `users` table doesn't exist yet
//
// CLI:
//   node db/database.js --init     drop ALL tables and recreate (destructive)
//   node db/database.js --check    list tables (sanity check)

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config = require('../config');

const SCHEMA_PATH = path.resolve(__dirname, 'schema.sql');

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readSchema() {
  return fs.readFileSync(SCHEMA_PATH, 'utf8');
}

function openDatabase() {
  ensureDir(config.DB_PATH);
  const db = new Database(config.DB_PATH);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  return db;
}

function tableExists(db, name) {
  return !!db
    .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?")
    .get(name);
}

function applySchema(db) {
  db.exec(readSchema());
}

function dropAll(db) {
  // Drop in reverse-dependency order. FKs are enabled but DROP ignores them
  // with SQLite, so order is for clarity.
  db.exec(`
    DROP TABLE IF EXISTS audit_logs;
    DROP TABLE IF EXISTS vault_items;
    DROP TABLE IF EXISTS users;
  `);
}

// ─── Singleton ─────────────────────────────────────────────────────
// Open once per process. All controllers / services share this handle.
const db = openDatabase();

// First-boot bootstrap: idempotent because schema.sql uses CREATE TABLE IF NOT EXISTS,
// but we still gate on `users` to avoid noisy logs on every restart.
if (!tableExists(db, 'users')) {
  applySchema(db);
  // eslint-disable-next-line no-console
  console.log(`[db] Schema applied to ${config.DB_PATH}`);
}

// Attach helpers as static properties so `require('./database')` returns
// the singleton AND exposes admin operations for seed.js / CLI use.
db.applySchema = () => applySchema(db);
db.dropAll = () => dropAll(db);
db.reset = () => { dropAll(db); applySchema(db); };

module.exports = db;

// ─── CLI ───────────────────────────────────────────────────────────
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--init')) {
    // eslint-disable-next-line no-console
    console.log(`[db] --init: dropping & recreating schema at ${config.DB_PATH}`);
    db.reset();
    // eslint-disable-next-line no-console
    console.log('[db] Done.');
  } else if (args.includes('--check')) {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all();
    // eslint-disable-next-line no-console
    console.log('[db] Tables:', tables.map((t) => t.name).join(', ') || '(none)');
  } else {
    // eslint-disable-next-line no-console
    console.log('Usage: node db/database.js [--init|--check]');
  }
}
