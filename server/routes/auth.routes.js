// server/routes/auth.routes.js
// Mount tại /api/auth trong app.js (Step 3).
//
// Note rate-limit:
//   Trong Step 5 sẽ thêm middleware rate-limit chuyên cho /login để demo
//   anti-brute-force. Hiện tại chỉ tập trung vào validation + service.

const router = require('express').Router();
const { body } = require('express-validator');

const { handleValidation } = require('../middlewares/validation.middleware');
const { loginLimiter } = require('../middlewares/rateLimit.middleware');
const authController = require('../controllers/auth.controller');

// ─── Đăng ký ─────────────────────────────────────────────────────
router.post(
  '/register',
  // Username: 3..32 ký tự, chỉ chữ/số/_/- để tránh các ký tự đặc biệt nhập nhằng.
  body('username')
    .isString().trim()
    .isLength({ min: 3, max: 32 }).withMessage('Username phải từ 3-32 ký tự')
    .matches(/^[A-Za-z0-9_.-]+$/).withMessage('Username chỉ chứa chữ, số, _ . -'),
  body('email')
    .isEmail().withMessage('Email không hợp lệ')
    .normalizeEmail(),
  body('password')
    .isString()
    .isLength({ min: 8, max: 128 }).withMessage('Password tối thiểu 8 ký tự'),
  handleValidation,
  authController.register
);

// ─── Đăng nhập ───────────────────────────────────────────────────
// loginLimiter chỉ đếm những lần login THẤT BẠI → user gõ sai password
// nhiều lần sẽ bị throttle, nhưng login thành công không bị ảnh hưởng.
router.post(
  '/login',
  loginLimiter,
  body('email')
    .isEmail().withMessage('Email không hợp lệ')
    .normalizeEmail(),
  body('password')
    .isString()
    .isLength({ min: 1, max: 128 }).withMessage('Password không được trống'),
  handleValidation,
  authController.login
);

// ─── Đăng xuất ───────────────────────────────────────────────────
router.post('/logout', authController.logout);

// ─── Lấy user hiện tại ───────────────────────────────────────────
// attachUser ở global level đã gắn req.user nếu cookie hợp lệ.
router.get('/me', authController.me);

module.exports = router;
