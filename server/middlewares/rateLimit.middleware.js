// server/middlewares/rateLimit.middleware.js
// Hai limiter:
//   - generalLimiter : áp cho toàn bộ /api/hardened/* — chống flood cơ bản
//   - loginLimiter   : áp riêng cho /login — chống brute-force, chỉ đếm
//                       request login THẤT BẠI (skipSuccessfulRequests).
//
// Mặc định window 15 phút (config.RATE_LIMIT_WINDOW_MS).

const rateLimit = require('express-rate-limit');
const config = require('../config');

// Custom handler để trả về theo contract { ok, error:{code,message} }.
function makeHandler(code, message) {
  return (_req, res, _next, opts) => {
    res.status(opts.statusCode || 429).json({
      ok: false,
      error: { code, message },
    });
  };
}

const generalLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX,
  standardHeaders: true,     // gửi RateLimit-* headers theo RFC
  legacyHeaders: false,      // tắt X-RateLimit-* cũ
  handler: makeHandler('RATE_LIMITED', 'Quá nhiều request, vui lòng thử lại sau'),
});

const loginLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.LOGIN_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  // Chỉ đếm những request login bị FAIL (status >= 400). Login thành công không bị tính.
  skipSuccessfulRequests: true,
  handler: makeHandler(
    'LOGIN_RATE_LIMITED',
    'Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau ít phút.'
  ),
});

module.exports = { generalLimiter, loginLimiter };
