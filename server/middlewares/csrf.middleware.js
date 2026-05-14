// server/middlewares/csrf.middleware.js
// CSRF protection theo pattern "double-submit cookie".
//
// Cách hoạt động:
//   1. Server set một cookie 'sv_csrf' chứa token ngẫu nhiên (KHÔNG HttpOnly,
//      để JS của FE đọc được).
//   2. Mỗi request thay đổi state (POST/PUT/PATCH/DELETE), FE phải gửi lại
//      token đó trong header 'X-CSRF-Token' (hoặc trong body._csrf).
//   3. Server so sánh header với cookie. Nếu khớp → cho qua. Nếu khác /
//      thiếu → trả 403 CSRF_TOKEN_INVALID.
//
// Vì sao an toàn:
//   - Attacker ở site khác KHÔNG đọc được cookie 'sv_csrf' của origin chúng ta
//     (Same-Origin Policy).
//   - Cookie tự được browser gửi kèm (cross-site nếu SameSite=Lax cho phép), nhưng
//     attacker không thể tự thêm header X-CSRF-Token cho cross-origin request
//     khi không có CORS allow.
//   - Vì 2 giá trị phải KHỚP, attacker không đoán được giá trị token random 32-byte.

const crypto = require('crypto');
const config = require('../config');

const HEADER_NAME = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function generateToken() {
  // 32 bytes ngẫu nhiên → 64 hex chars, đủ entropy để không brute-force.
  return crypto.randomBytes(32).toString('hex');
}

// Middleware "phát hành" token: gắn cookie nếu chưa có.
// Apply ở mọi GET của router hardened để FE bootstrap được token ngay khi
// gọi /api/hardened/csrf-token hoặc bất kỳ GET nào.
function issueCsrfToken(req, res, next) {
  let token = req.cookies && req.cookies[config.CSRF_COOKIE_NAME];
  if (!token) {
    token = generateToken();
    res.cookie(config.CSRF_COOKIE_NAME, token, {
      httpOnly: false,                  // FE PHẢI đọc được → KHÔNG HttpOnly
      secure: config.COOKIE_SECURE,
      sameSite: 'lax',
      path: '/',
      // không set maxAge → session cookie, refresh khi mở tab mới
    });
  }
  req.csrfToken = token;                // controller có thể đọc qua req.csrfToken
  return next();
}

// Helper ghi audit khi CSRF check fail. req.audit luôn có sẵn vì
// auditCapture được apply global trong app.js (Step 7).
function auditBlocked(req, reason) {
  if (req.audit) {
    req.audit.log({
      eventType: 'CSRF_TOKEN_MISSING',
      mode: 'hardened',
      status: 'blocked',
      payloadSummary: reason,
    });
  }
}

// Middleware verify: so sánh cookie với header.
// Apply trước controller cho các route POST/PUT/PATCH/DELETE.
function verifyCsrfToken(req, _res, next) {
  // Request "an toàn" (chỉ đọc) thì không cần check.
  if (SAFE_METHODS.has(req.method)) return next();

  const cookieToken = req.cookies && req.cookies[config.CSRF_COOKIE_NAME];
  const headerToken = req.get(HEADER_NAME) || (req.body && req.body._csrf);

  if (!cookieToken || !headerToken) {
    auditBlocked(req, 'thiếu CSRF token (cookie hoặc header)');
    const e = new Error('Thiếu CSRF token');
    e.status = 403;
    e.code = 'CSRF_TOKEN_MISSING';
    return next(e);
  }

  // So sánh thời gian không đổi để chống timing attack (dù với token random 32 byte
  // thì timing attack thực tế gần như không có ý nghĩa — vẫn làm cho đúng best practice).
  const a = Buffer.from(cookieToken, 'utf8');
  const b = Buffer.from(headerToken, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    auditBlocked(req, 'CSRF token không khớp');
    const e = new Error('CSRF token không khớp');
    e.status = 403;
    e.code = 'CSRF_TOKEN_INVALID';
    return next(e);
  }

  return next();
}

module.exports = { issueCsrfToken, verifyCsrfToken, HEADER_NAME };
