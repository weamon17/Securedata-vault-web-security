// server/config.js
// Centralized configuration loader.
// Reads variables from the project-root .env (one level above /server),
// applies sensible defaults, and validates security-critical values.

const path = require('path');

// Load .env from the project root so both `node server.js` and `npm run db:init`
// see the same configuration regardless of cwd.
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const env = process.env;

// Treat "true" / "1" as truthy; fall back to `fallback` when the var is unset.
function bool(v, fallback) {
  if (v === undefined || v === '') return fallback;
  return String(v).toLowerCase() === 'true' || v === '1';
}

const NODE_ENV = env.NODE_ENV || 'development';
const isDev = NODE_ENV === 'development';
const isProd = NODE_ENV === 'production';

const config = Object.freeze({
  NODE_ENV,
  isDev,
  isProd,

  // ─── Server ────────────────────────────────────────────────
  PORT: Number(env.PORT) || 4000,
  CLIENT_ORIGIN: env.CLIENT_ORIGIN || 'http://localhost:5173',

  // ─── Lab gating ────────────────────────────────────────────
  // /api/vulnerable is only mounted when LAB_MODE is true.
  // Default ON in development, OFF otherwise — explicit env wins.
  LAB_MODE: bool(env.LAB_MODE, isDev),

  // ─── Auth: JWT in HttpOnly cookie ──────────────────────────
  JWT_SECRET: env.JWT_SECRET || 'dev-only-change-me-in-env',
  JWT_EXPIRES_IN: env.JWT_EXPIRES_IN || '2h',
  COOKIE_NAME: env.COOKIE_NAME || 'sv_access',
  COOKIE_SECURE: bool(env.COOKIE_SECURE, isProd),

  // ─── CSRF (double-submit cookie, hardened routes only) ─────
  CSRF_COOKIE_NAME: env.CSRF_COOKIE_NAME || 'sv_csrf',

  // ─── Encryption at rest (AES-256-GCM) ──────────────────────
  // Must be exactly 64 hex chars (= 32 bytes). Validated below.
  ENCRYPTION_KEY: env.ENCRYPTION_KEY || '',
  ENCRYPTION_ALGO: 'aes-256-gcm',

  // ─── Database ──────────────────────────────────────────────
  DB_PATH: env.DB_PATH || path.resolve(__dirname, 'db', 'vault.db'),

  // ─── Password hashing ──────────────────────────────────────
  BCRYPT_ROUNDS: Number(env.BCRYPT_ROUNDS) || 12,

  // ─── Rate limiting (hardened only) ─────────────────────────
  RATE_LIMIT_WINDOW_MS: Number(env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  RATE_LIMIT_MAX: Number(env.RATE_LIMIT_MAX) || 100,
  LOGIN_RATE_LIMIT_MAX: Number(env.LOGIN_RATE_LIMIT_MAX) || 10,

  // ─── Risk engine ───────────────────────────────────────────
  // Hardened routes return 403 + audit-log a REQUEST_BLOCKED event
  // when the computed risk_score is >= this threshold.
  RISK_BLOCK_THRESHOLD: Number(env.RISK_BLOCK_THRESHOLD) || 51,
});

// Validate security-sensitive values. Warn in dev, throw in prod.
function validate() {
  const problems = [];

  if (!config.ENCRYPTION_KEY) {
    problems.push(
      'ENCRYPTION_KEY is empty. Generate one with:\n' +
      '    node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  } else if (!/^[0-9a-fA-F]{64}$/.test(config.ENCRYPTION_KEY)) {
    problems.push('ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes).');
  }

  if (config.JWT_SECRET === 'dev-only-change-me-in-env') {
    problems.push('JWT_SECRET is using the insecure default. Set a strong value in .env.');
  }

  if (problems.length === 0) return;

  const banner = '[config] Configuration issues:\n  - ' + problems.join('\n  - ');
  if (isProd) {
    throw new Error(banner);
  } else {
    // eslint-disable-next-line no-console
    console.warn(banner + '\n[config] Continuing because NODE_ENV != production.\n');
  }
}
validate();

module.exports = config;
