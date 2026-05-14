// server/middlewares/securityHeaders.middleware.js
// Wrapper helmet với CSP rõ ràng để dễ giải thích trong báo cáo.
//
// Apply tại router level cho /api/hardened/* và /api/vault/* (Step 5, 6),
// KHÔNG apply global → /api/vulnerable/* không có CSP để minh hoạ.
//
// CSP chọn theo nguyên tắc "deny by default":
//   default-src 'self'          chỉ load resource cùng origin
//   script-src  'self'          chặn inline script + chặn cross-origin script
//   style-src   'self' 'unsafe-inline'  Tailwind/CSS-in-JS đôi khi cần inline
//   img-src     'self' data:    cho phép data URL cho icon nhỏ
//   object-src  'none'          chặn Flash / plugin
//   frame-ancestors 'none'      chống clickjacking (tương đương X-Frame-Options: DENY)
//   base-uri    'self'          chặn <base href> bị inject để đổi đích relative URL
//   form-action 'self'          form chỉ submit về cùng origin

const helmet = require('helmet');

function securityHeaders() {
  return helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc:      ["'self'"],
        scriptSrc:       ["'self'"],
        styleSrc:        ["'self'", "'unsafe-inline'"],
        imgSrc:          ["'self'", 'data:'],
        connectSrc:      ["'self'"],
        objectSrc:       ["'none'"],
        frameAncestors:  ["'none'"],
        baseUri:         ["'self'"],
        formAction:      ["'self'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'same-site' },
    referrerPolicy: { policy: 'no-referrer' },
    // HSTS chỉ có ý nghĩa với HTTPS. Helmet sẽ tự gửi nhưng browser bỏ qua trên HTTP local.
  });
}

module.exports = securityHeaders;
