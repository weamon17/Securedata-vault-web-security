// server/middlewares/auditCapture.middleware.js
// Gắn req.audit để mọi controller/middleware có thể ghi audit log gọn:
//
//   req.audit.log({
//     eventType: 'LOGIN_FAILED',
//     mode: 'hardened',
//     status: 'allowed',
//     payloadSummary: `email=${email}`,
//   });
//
// Middleware tự động điền userId (từ req.user), endpoint, http_method,
// ip_address, user_agent — controller chỉ cần khai báo những trường thay đổi.
//
// Đặt SAU attachUser và TRƯỚC mọi route trong app.js để req.user (nếu có)
// được dùng làm userId default.

const auditService = require('../services/auditLog.service');

function auditCapture(req, _res, next) {
  // Lấy IP — req.ip dùng trust proxy = 1 đã set trong app.js, đảm bảo
  // lấy đúng IP client kể cả khi server đứng sau reverse proxy.
  const ip = req.ip || (req.socket && req.socket.remoteAddress) || null;
  const ua = req.get('user-agent') || null;
  const endpointBase = req.originalUrl.split('?')[0];

  req.audit = {
    log(opts = {}) {
      try {
        return auditService.log({
          // Default đến từ request — caller override khi cần.
          userId:     req.user ? req.user.id : null,
          endpoint:   endpointBase,
          httpMethod: req.method,
          ipAddress:  ip,
          userAgent:  ua,
          ...opts,
        });
      } catch (e) {
        // Không bao giờ làm hỏng request chính vì audit log fail.
        // eslint-disable-next-line no-console
        console.error('[audit] log failed:', e.message);
        return null;
      }
    },
  };

  return next();
}

module.exports = auditCapture;
