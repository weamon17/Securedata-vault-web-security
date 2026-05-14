// server/db/seed.js
// Idempotent seeder: creates the two demo accounts referenced in the
// README, a couple of vault items, and a representative set of audit
// log rows so the analytics dashboard isn't empty on first run.
//
// Usage:
//   npm run db:seed              insert only what's missing
//   npm run db:reset             drop + recreate + seed (destructive)

const bcrypt = require('bcrypt');
const db = require('./database');
const config = require('../config');

const ADMIN = {
  username: 'admin',
  email:    'admin@securevault.local',
  password: 'Admin123!',
  role:     'admin',
};

const USER = {
  username: 'demo',
  email:    'user@securevault.local',
  password: 'User123!',
  role:     'user',
};

function ensureUser({ username, email, password, role }) {
  const row = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (row) return row.id;
  const hash = bcrypt.hashSync(password, config.BCRYPT_ROUNDS);
  const res = db
    .prepare(`
      INSERT INTO users (username, email, password_hash, role)
      VALUES (?, ?, ?, ?)
    `)
    .run(username, email, hash, role);
  return Number(res.lastInsertRowid);
}

function ensureVaultItems(userId) {
  const { c } = db
    .prepare('SELECT COUNT(*) AS c FROM vault_items WHERE user_id = ?')
    .get(userId);
  if (c > 0) return;
  const insert = db.prepare(`
    INSERT INTO vault_items
      (user_id, title, content_plaintext, content_encrypted, is_encrypted)
    VALUES (?, ?, ?, ?, ?)
  `);
  // Two starter notes. Real encryption happens via the API in Step 6;
  // these placeholders simply give the UI something to render after seeding.
  insert.run(userId, 'Welcome note',
    'This is a plaintext sample item (vulnerable-mode style).', null, 0);
  insert.run(userId, 'Personal reminder',
    'Try editing me from the hardened vault page to see AES encryption in action.',
    null, 0);
}

function ensureAuditSamples() {
  const { c } = db.prepare('SELECT COUNT(*) AS c FROM audit_logs').get();
  if (c > 0) return;
  const insert = db.prepare(`
    INSERT INTO audit_logs
      (user_id, event_type, endpoint, http_method, ip_address, user_agent,
       payload_summary, risk_score, severity, status, mode, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
  `);
  // Mix of events across time/severity/mode so the dashboard charts have data.
  const rows = [
    [null, 'LOGIN_SUCCESS',      '/api/auth/login',          'POST', '127.0.0.1', 'seed', '{}',                                 5,  'Low',      'allowed',  'hardened',   '-2 hours'],
    [null, 'LOGIN_FAILED',       '/api/auth/login',          'POST', '127.0.0.1', 'seed', 'email=admin@securevault.local',     15, 'Low',      'allowed',  'hardened',   '-1 hours'],
    [null, 'SUSPECTED_SQLI',     '/api/vulnerable/login',    'POST', '127.0.0.1', 'seed', "email=' OR 1=1 --",                 60, 'High',     'observed', 'vulnerable', '-50 minutes'],
    [null, 'SUSPECTED_XSS',      '/api/vulnerable/comments', 'POST', '127.0.0.1', 'seed', '<script>alert(1)</script>',         55, 'High',     'observed', 'vulnerable', '-40 minutes'],
    [null, 'CSRF_TOKEN_MISSING', '/api/hardened/transfer',   'POST', '127.0.0.1', 'seed', 'missing X-CSRF-Token',              25, 'Low',      'blocked',  'hardened',   '-30 minutes'],
    [null, 'IDOR_ATTEMPT',       '/api/hardened/vault/3',    'GET',  '127.0.0.1', 'seed', 'requested item not owned by user',  45, 'Medium',   'blocked',  'hardened',   '-20 minutes'],
    [null, 'REQUEST_BLOCKED',    '/api/hardened/search',     'GET',  '127.0.0.1', 'seed', 'risk_score=78 above threshold',     78, 'Critical', 'blocked',  'hardened',   '-10 minutes'],
    [null, 'DATA_CREATED',       '/api/vault/items',         'POST', '127.0.0.1', 'seed', 'encrypted=true',                    0,  'Low',      'allowed',  'hardened',   '-5 minutes'],
  ];
  const tx = db.transaction((batch) => {
    for (const row of batch) insert.run(...row);
  });
  tx(rows);
}

function seed() {
  // eslint-disable-next-line no-console
  console.log(`[seed] DB: ${config.DB_PATH}`);
  const adminId = ensureUser(ADMIN);
  const userId  = ensureUser(USER);
  ensureVaultItems(userId);
  ensureAuditSamples();
  // eslint-disable-next-line no-console
  console.log(
    `[seed] Admin: ${ADMIN.email} / ${ADMIN.password}  (id=${adminId})\n` +
    `[seed] User : ${USER.email} / ${USER.password}  (id=${userId})\n` +
    '[seed] Done.'
  );
}

if (require.main === module) {
  if (process.argv.includes('--reset')) {
    // eslint-disable-next-line no-console
    console.log('[seed] --reset: dropping and recreating schema...');
    db.reset();
  }
  seed();
}

module.exports = { seed, ADMIN, USER };
