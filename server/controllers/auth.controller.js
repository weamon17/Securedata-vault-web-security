// server/controllers/auth.controller.js
// Controller cho /api/auth/*. Nhận request đã được validate, gọi service,
// và set/clear cookie JWT. Không chứa nghiệp vụ — mọi logic ở auth.service.js.

const authService = require('../services/auth.service');
const riskScoring = require('../services/riskScoring.service');
const config = require('../config');

// Chuyển "2h", "30m", "7d"... → milliseconds. Dùng để set maxAge cho cookie
// khớp với hạn của JWT. Nếu parse không được, fallback 2 giờ.
function parseDurationMs(str) {
  const m = /^(\d+)\s*([smhd])$/i.exec(String(str || '').trim());
  if (!m) return 2 * 60 * 60 * 1000;
  const n = Number(m[1]);
  const mult = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[m[2].toLowerCase()];
  return n * mult;
}

// Option dùng chung khi set cookie JWT.
// Lưu ý vì sao chọn SameSite='Lax':
//   - 'Strict' chặn cả luồng login redirect → bất tiện cho demo.
//   - 'None' bắt buộc Secure=true và mở rộng diện CSRF — không hợp môi trường lab HTTP.
//   - 'Lax' là default hiện đại của trình duyệt; cookie vẫn được gửi với các request
//     từ React app (localhost:5173 và localhost:4000 cùng eTLD+1 = "localhost").
//   - Phần demo CSRF (Step 5) sẽ minh hoạ rằng SameSite=Lax KHÔNG đủ — vẫn cần CSRF token.
function authCookieOptions() {
  return {
    httpOnly: true,                              // JS không đọc được → giảm rủi ro XSS-stealing
    secure: config.COOKIE_SECURE,                // chỉ gửi qua HTTPS khi bật (production)
    sameSite: 'lax',
    path: '/',
    maxAge: parseDurationMs(config.JWT_EXPIRES_IN),
  };
}

// POST /api/auth/register
async function register(req, res, next) {
  try {
    const { username, email, password } = req.body;
    const user = await authService.register({ username, email, password });

    // Auto-login sau khi đăng ký để FE không phải gọi /login ngay sau đó.
    const token = authService.issueToken(user);
    res.cookie(config.COOKIE_NAME, token, authCookieOptions());

    req.audit && req.audit.log({
      userId: user.id,
      eventType: 'DATA_CREATED',
      mode: 'neutral',
      status: 'allowed',
      payloadSummary: `register user=${user.username}`,
    });

    return res.status(201).json({ ok: true, data: { user } });
  } catch (e) {
    return next(e);
  }
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await authService.login({ email, password });

    const token = authService.issueToken(user);
    res.cookie(config.COOKIE_NAME, token, authCookieOptions());

    req.audit && req.audit.log({
      userId: user.id,
      eventType: 'LOGIN_SUCCESS',
      mode: 'neutral',
      status: 'allowed',
    });

    return res.json({ ok: true, data: { user } });
  } catch (e) {
    if (e && e.code === 'INVALID_CREDENTIALS') {
      // Cộng counter cho rule FAILED_LOGIN (Step 8) — sẽ tham gia tính risk
      // ở các request kế tiếp từ cùng IP.
      riskScoring.notifyLoginFailed(req.ip);
      if (req.audit) {
        req.audit.log({
          eventType: 'LOGIN_FAILED',
          mode: 'neutral',
          status: 'allowed',
          payloadSummary: `email=${req.body && req.body.email}`,
        });
      }
    }
    return next(e);
  }
}

// POST /api/auth/logout
function logout(_req, res) {
  res.clearCookie(config.COOKIE_NAME, { path: '/' });
  // TODO Step 5: xoá luôn cookie CSRF khi áp dụng cho hardened routes
  return res.json({ ok: true, data: { loggedOut: true } });
}

// GET /api/auth/me
// Trả về user hiện tại nếu đã login, null nếu chưa.
function me(req, res) {
  return res.json({ ok: true, data: { user: req.user || null } });
}

module.exports = { register, login, logout, me, authCookieOptions };
