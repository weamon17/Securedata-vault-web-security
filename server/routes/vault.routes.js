// server/routes/vault.routes.js
// Mount tại /api/vault. Đây là nơi user thực sự CRUD note riêng tư.
//
// Chuỗi middleware (toàn router):
//   1. securityHeaders()   helmet + CSP
//   2. generalLimiter      chống flood
//   3. issueCsrfToken      set cookie sv_csrf nếu chưa có
//   4. requireAuth         mọi endpoint vault đều cần đăng nhập
//
// Trên từng route POST/PUT/DELETE bổ sung:
//   - verifyCsrfToken
//   - express-validator + handleValidation

const router = require('express').Router();
const { body, param } = require('express-validator');

const securityHeaders = require('../middlewares/securityHeaders.middleware');
const { issueCsrfToken, verifyCsrfToken } = require('../middlewares/csrf.middleware');
const { generalLimiter } = require('../middlewares/rateLimit.middleware');
const { handleValidation } = require('../middlewares/validation.middleware');
const { requireAuth } = require('../middlewares/auth.middleware');
const riskScoringGuard = require('../middlewares/riskScoring.middleware');
const c = require('../controllers/vault.controller');

// ─── Middleware áp cho mọi route ─────────────────────────────────
router.use(securityHeaders());
router.use(generalLimiter);
router.use(issueCsrfToken);
router.use(riskScoringGuard);                 // Step 8: chặn theo risk_score
router.use(requireAuth);

// ─── CRUD ────────────────────────────────────────────────────────
// GET — không cần CSRF check (chỉ đọc).
router.get('/items', c.list);

router.get(
  '/items/:id',
  param('id').isInt({ min: 1 }).withMessage('id phải là số nguyên dương'),
  handleValidation,
  c.getOne
);

// POST/PUT/DELETE — bắt buộc CSRF token.
router.post(
  '/items',
  verifyCsrfToken,
  body('title').isString().trim().isLength({ min: 1, max: 200 }).withMessage('title 1-200 ký tự'),
  body('content').isString().isLength({ min: 1, max: 10000 }).withMessage('content 1-10000 ký tự'),
  handleValidation,
  c.create
);

router.put(
  '/items/:id',
  verifyCsrfToken,
  param('id').isInt({ min: 1 }),
  body('title').isString().trim().isLength({ min: 1, max: 200 }),
  body('content').isString().isLength({ min: 1, max: 10000 }),
  handleValidation,
  c.update
);

router.delete(
  '/items/:id',
  verifyCsrfToken,
  param('id').isInt({ min: 1 }),
  handleValidation,
  c.remove
);

module.exports = router;
