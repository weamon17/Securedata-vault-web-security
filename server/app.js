// server/app.js
// Express app factory. Wires global middlewares and route mounts.
//
// Design notes:
// • We deliberately do NOT apply helmet, CSRF, or rate-limit GLOBALLY,
//   because /api/vulnerable must demonstrate insecure defaults. Those
//   protections are applied per-router inside `routes/hardened.routes.js`
//   and `routes/vault.routes.js` (added in later steps).
// • Route files are introduced one step at a time. Each `app.use(...)`
//   below is gated with an "ENABLE IN STEP N" comment so the server can
//   already boot after Step 1 (only /api/health is live).

const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const config = require('./config');

function createApp() {
  const app = express();

  // Behind a reverse proxy in production; harmless locally.
  // Needed for req.ip to reflect the real client when audit logging.
  app.set('trust proxy', 1);

  // ─── Global middlewares (safe for BOTH modes) ──────────────
  app.use(cors({
    origin: config.CLIENT_ORIGIN,
    credentials: true, // allow HttpOnly cookies from the React client
  }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());

  // ─── Đọc JWT cookie để gắn req.user (soft attach) ──────────
  // Đặt sau cookieParser và TRƯỚC mọi route. Không lỗi nếu thiếu cookie —
  // các route protected sẽ tự dùng requireAuth/requireAdmin để kiểm tra.
  app.use(require('./middlewares/auth.middleware').attachUser);

  // ─── Audit capture (Step 7) ────────────────────────────────
  // Gắn req.audit cho mọi route. Đặt SAU attachUser để có req.user,
  // và TRƯỚC mọi route mount.
  app.use(require('./middlewares/auditCapture.middleware'));

  // ─── Health probe (always available) ───────────────────────
  // Used by the README quick-start to verify the boot succeeded.
  app.get('/api/health', (req, res) => {
    res.json({
      ok: true,
      data: {
        status: 'up',
        env: config.NODE_ENV,
        labMode: config.LAB_MODE,
        time: new Date().toISOString(),
      },
    });
  });

  // ─── Route mounts ──────────────────────────────────────────
  // Step 3 — Authentication module (register / login / logout / me)
  app.use('/api/auth', require('./routes/auth.routes'));

  // Step 5 — Hardened mirrors của các demo lab (helmet + CSRF + rate-limit + validation)
  app.use('/api/hardened', require('./routes/hardened.routes'));

  // Step 6 — User-facing vault (hardened-only, AES-256-GCM encryption at rest)
  app.use('/api/vault', require('./routes/vault.routes'));

  // Step 9 — Security analytics dashboard API (admin only)
  app.use('/api/analytics', require('./routes/analytics.routes'));

  // Step 4 — Vulnerable lab routes (CHỈ mount khi LAB_MODE bật)
  if (config.LAB_MODE) {
    app.use('/api/vulnerable', require('./routes/vulnerable.routes'));
    // eslint-disable-next-line no-console
    console.warn(
      '\n[SecureData Vault] LAB_MODE=true → /api/vulnerable đã được ENABLE.\n' +
      '  Các endpoint này CỐ Ý chứa lỗ hổng cho mục đích GIÁO DỤC LOCAL.\n' +
      '  Tuyệt đối không deploy public.\n'
    );
  }

  // ─── Production: serve built React frontend ───────────────
  // Build trước bằng: cd client && npm run build
  // Sau đó server tự phục vụ luôn frontend tại cùng origin → không cần CORS,
  // không cần Vite proxy, deploy 1 service duy nhất.
  if (config.isProd) {
    const clientDist = path.join(__dirname, '..', 'client', 'dist');
    app.use(express.static(clientDist));
    // SPA fallback: trả index.html cho mọi route không phải /api/*
    app.get(/^\/(?!api\/).*/, (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  // ─── 404 handler (API routes không tìm thấy) ───────────────
  app.use((req, res) => {
    res.status(404).json({
      ok: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${req.method} ${req.path} not found`,
      },
    });
  });

  // ─── Error handler ─────────────────────────────────────────
  // Must be the LAST middleware. Converts any thrown error into the
  // { ok:false, error:{code,message} } JSON contract.
  app.use(require('./middlewares/errorHandler.middleware'));

  return app;
}

module.exports = createApp;
