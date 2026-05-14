// server/routes/vulnerable.routes.js
//
// ⚠️ ROUTER NÀY CHỈ ĐƯỢC MOUNT KHI LAB_MODE=true (xem app.js).
// Toàn bộ endpoint dưới đây CỐ Ý có lỗ hổng để minh hoạ OWASP Top 10
// trong môi trường lab học thuật cục bộ.
//
// CẶP ĐỐI XỨNG:
//   /api/vulnerable/login          ↔ /api/auth/login  +  /api/hardened/login
//   /api/vulnerable/search         ↔ /api/hardened/search
//   /api/vulnerable/comments       ↔ /api/hardened/comments
//   /api/vulnerable/echo           ↔ /api/hardened/echo
//   /api/vulnerable/transfer       ↔ /api/hardened/transfer
//   /api/vulnerable/vault/:id      ↔ /api/hardened/vault/:id
//   /api/vulnerable/headers-demo   ↔ /api/hardened/headers-demo

const router = require('express').Router();
const c = require('../controllers/vulnerable.controller');

// CỐ Ý: KHÔNG dùng helmet, KHÔNG rate-limit, KHÔNG validation middleware,
// KHÔNG csrf — đây chính là điểm khác biệt với hardened router (Step 5).

// 1. SQL Injection (login)
router.post('/login', c.vulnerableLogin);

// 2. SQL Injection qua search (LIKE)
router.get('/search', c.vulnerableSearch);

// 3. XSS — stored + reflected
router.post('/comments', c.addComment);
router.get('/comments', c.listComments);
router.get('/echo', c.reflectEcho);

// 4. CSRF — chấp nhận cả GET và POST, không token
router.get('/transfer', c.transfer);
router.post('/transfer', c.transfer);
router.get('/transfers', c.listTransfers);

// 5. IDOR — không check ownership
router.get('/vault/:id', c.getVaultItemUnsafe);

// 6. CSP / Security Headers — không apply helmet
router.get('/headers-demo', c.headersDemo);

module.exports = router;
