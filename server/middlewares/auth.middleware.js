// server/middlewares/auth.middleware.js
// Bộ middleware liên quan tới xác thực JWT cookie.
//
// 3 middleware export ra:
//   - attachUser    : "soft" — đọc cookie, nếu hợp lệ thì gắn req.user; KHÔNG lỗi nếu thiếu.
//   - requireAuth   : "hard" — bắt buộc đã đăng nhập, ngược lại trả 401.
//   - requireAdmin  : "hard" — bắt buộc role === 'admin', ngược lại 403.
//
// attachUser được apply global trong app.js để mọi route đều có thể đọc req.user.

const { verifyToken } = require('../services/auth.service');
const config = require('../config');

// Đọc JWT từ cookie và gắn req.user nếu token hợp lệ.
// Không throw khi thiếu cookie hoặc token sai — chỉ để req.user undefined.
function attachUser(req, res, next) {
  const token = req.cookies && req.cookies[config.COOKIE_NAME];
  if (!token) return next();

  try {
    const payload = verifyToken(token);
    req.user = {
      id: payload.sub,
      username: payload.username,
      email: payload.email,
      role: payload.role,
    };
  } catch (_) {
    // Token sai hoặc hết hạn → xoá cookie để browser không gửi lại mỗi request.
    res.clearCookie(config.COOKIE_NAME, { path: '/' });
  }
  return next();
}

// Bắt buộc đã login. Đặt sau attachUser.
function requireAuth(req, _res, next) {
  if (!req.user) {
    if (req.audit) {
      req.audit.log({
        eventType: 'UNAUTHORIZED_ACCESS',
        mode: 'hardened',
        status: 'blocked',
        payloadSummary: 'không có JWT cookie hợp lệ',
      });
    }
    const e = new Error('Bạn cần đăng nhập để thực hiện thao tác này');
    e.status = 401;
    e.code = 'UNAUTHENTICATED';
    return next(e);
  }
  return next();
}

// Bắt buộc role admin. Đặt sau requireAuth.
function requireAdmin(req, _res, next) {
  if (!req.user || req.user.role !== 'admin') {
    const e = new Error('Yêu cầu quyền admin');
    e.status = 403;
    e.code = 'FORBIDDEN';
    return next(e);
  }
  return next();
}

module.exports = { attachUser, requireAuth, requireAdmin };
