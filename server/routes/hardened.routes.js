// server/routes/hardened.routes.js
// Mount tại /api/hardened. Đây là counter-part "an toàn" của /api/vulnerable.
//
// Chuỗi middleware áp dụng cho TOÀN BỘ router (theo thứ tự):
//   1. securityHeaders() (helmet + CSP)
//   2. generalLimiter    (chống flood)
//   3. issueCsrfToken    (set cookie sv_csrf nếu chưa có; gắn req.csrfToken)
//
// Sau đó từng route bổ sung:
//   - loginLimiter (chỉ cho /login)
//   - verifyCsrfToken (cho POST/PUT/PATCH/DELETE)
//   - requireAuth (cho /transfer, /vault/:id)
//   - express-validator + handleValidation
//
// Risk scoring middleware sẽ được chèn thêm ở Step 8.

const router = require('express').Router();
const { body, query, param } = require('express-validator');

const securityHeaders = require('../middlewares/securityHeaders.middleware');
const { issueCsrfToken, verifyCsrfToken } = require('../middlewares/csrf.middleware');
const { generalLimiter, loginLimiter } = require('../middlewares/rateLimit.middleware');
const { handleValidation } = require('../middlewares/validation.middleware');
const { requireAuth } = require('../middlewares/auth.middleware');
const riskScoringGuard = require('../middlewares/riskScoring.middleware');
const c = require('../controllers/hardened.controller');

// ─── Middleware áp cho mọi route trong router này ────────────────
router.use(securityHeaders());
router.use(generalLimiter);
router.use(issueCsrfToken);
// Step 8: risk scoring — block khi score >= RISK_BLOCK_THRESHOLD (51)
router.use(riskScoringGuard);

// ─── Endpoint phụ trợ cho FE: lấy CSRF token ─────────────────────
// FE gọi 1 lần sau khi mount để có token cho các request POST sau đó.
router.get('/csrf-token', (req, res) => {
  res.json({ ok: true, data: { csrfToken: req.csrfToken } });
});

// ─── 1. Hardened login ───────────────────────────────────────────
router.post(
  '/login',
  loginLimiter,
  verifyCsrfToken,
  body('email').isEmail().withMessage('Email không hợp lệ').normalizeEmail(),
  body('password').isString().isLength({ min: 1, max: 128 }).withMessage('Password không được trống'),
  handleValidation,
  c.hardenedLogin
);

// ─── 2. Hardened search ──────────────────────────────────────────
router.get(
  '/search',
  query('q').optional().isString().isLength({ max: 200 }).withMessage('q tối đa 200 ký tự'),
  handleValidation,
  c.hardenedSearch
);

// ─── 3. Hardened comments (chống XSS) ────────────────────────────
router.post(
  '/comments',
  verifyCsrfToken,
  body('author').optional().isString().trim().isLength({ max: 64 }),
  body('body').isString().trim().isLength({ min: 1, max: 1000 }).withMessage('Nội dung 1-1000 ký tự'),
  handleValidation,
  c.addComment
);
router.get('/comments', c.listComments);

router.get(
  '/echo',
  query('msg').optional().isString().isLength({ max: 200 }),
  handleValidation,
  c.reflectEcho
);

// ─── 4. Hardened transfer (chống CSRF) ───────────────────────────
// CỐ Ý: chỉ chấp nhận POST. Không mount GET → trình duyệt không thể
// trigger qua <img src> hay link cross-site.
router.post(
  '/transfer',
  requireAuth,
  verifyCsrfToken,
  body('to').isString().trim().isLength({ min: 1, max: 64 }).withMessage('Trường "to" bắt buộc'),
  body('amount').isInt({ min: 1, max: 1_000_000 }).withMessage('Amount phải là số nguyên 1..1.000.000'),
  handleValidation,
  c.transfer
);
router.get('/transfers', requireAuth, c.listTransfers);

// ─── 5. Hardened vault item (chống IDOR) ─────────────────────────
router.get(
  '/vault/:id',
  requireAuth,
  param('id').isInt({ min: 1 }).withMessage('id phải là số nguyên dương'),
  handleValidation,
  c.getVaultItem
);

// ─── 6. Headers demo ─────────────────────────────────────────────
router.get('/headers-demo', c.headersDemo);

module.exports = router;
