// server/middlewares/validation.middleware.js
// Wrapper mỏng cho express-validator: gộp các lỗi validation lại và
// throw thành error 400 với code VALIDATION_FAILED, để errorHandler
// trả về theo đúng contract { ok:false, error:{code,message,details} }.
//
// Cách dùng trong file routes:
//
//   const { body } = require('express-validator');
//   const { handleValidation } = require('../middlewares/validation.middleware');
//
//   router.post('/login',
//     body('email').isEmail(),
//     body('password').isLength({ min: 1 }),
//     handleValidation,
//     authController.login
//   );

const { validationResult } = require('express-validator');

function handleValidation(req, _res, next) {
  const errs = validationResult(req);
  if (errs.isEmpty()) return next();

  // Chuẩn hoá danh sách lỗi để FE hiển thị theo field.
  const details = errs.array().map((x) => ({
    field: x.path || x.param || 'unknown',
    message: x.msg,
  }));

  const e = new Error('Dữ liệu đầu vào không hợp lệ');
  e.status = 400;
  e.code = 'VALIDATION_FAILED';
  e.details = details;
  return next(e);
}

module.exports = { handleValidation };
