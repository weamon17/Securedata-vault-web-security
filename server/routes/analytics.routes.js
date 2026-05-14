// server/routes/analytics.routes.js
// Mount tại /api/analytics. CHỈ admin mới xem được.
//
// Chuỗi middleware:
//   1. securityHeaders()    helmet + CSP
//   2. generalLimiter       rate limit
//   3. issueCsrfToken       (admin nếu cần POST sau này thì đã có token sẵn)
//   4. riskScoringGuard     defense in depth (admin cũng có thể bị compromise)
//   5. requireAuth          phải login
//   6. requireAdmin         role === 'admin'

const router = require('express').Router();
const { query } = require('express-validator');

const securityHeaders = require('../middlewares/securityHeaders.middleware');
const { issueCsrfToken } = require('../middlewares/csrf.middleware');
const { generalLimiter } = require('../middlewares/rateLimit.middleware');
const { handleValidation } = require('../middlewares/validation.middleware');
const { requireAuth, requireAdmin } = require('../middlewares/auth.middleware');
const riskScoringGuard = require('../middlewares/riskScoring.middleware');
const c = require('../controllers/analytics.controller');

// ─── Middleware áp cho mọi route ─────────────────────────────────
router.use(securityHeaders());
router.use(generalLimiter);
router.use(issueCsrfToken);
router.use(riskScoringGuard);
router.use(requireAuth);
router.use(requireAdmin);

// ─── Endpoints ───────────────────────────────────────────────────
router.get('/summary',           c.summary);
router.get('/by-type',           c.byType);
router.get('/risk-distribution', c.riskDistribution);

router.get(
  '/failed-login-trend',
  query('days').optional().isInt({ min: 1, max: 60 }).withMessage('days 1-60'),
  handleValidation,
  c.failedLoginTrend
);

router.get(
  '/top-endpoints',
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit 1-100'),
  handleValidation,
  c.topEndpoints
);

router.get(
  '/audit-logs',
  query('limit').optional().isInt({ min: 1, max: 500 }).withMessage('limit 1-500'),
  query('severity').optional().isIn(['Low', 'Medium', 'High', 'Critical']),
  query('type').optional().isString().isLength({ max: 50 }),
  query('mode').optional().isIn(['vulnerable', 'hardened', 'neutral']),
  handleValidation,
  c.auditLogs
);

module.exports = router;
