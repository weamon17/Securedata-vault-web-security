// server/middlewares/errorHandler.middleware.js
// Centralized error responder. Normalizes thrown errors into the
//   { ok: false, error: { code, message, details? } }
// shape used everywhere by the API.
//
// Convention for throwing from services / controllers:
//   const e = new Error('User not found');
//   e.status = 404;
//   e.code = 'USER_NOT_FOUND';
//   throw e;
//
// For validation errors carrying multiple problems:
//   e.details = [{ field: 'email', message: 'invalid' }, ...];

const config = require('../config');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const code   = err.code   || (status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST');

  // Log server-side. 4xx errors are only logged in dev to keep the
  // server console clean in production; 5xx are always logged.
  if (status >= 500 || config.isDev) {
    // eslint-disable-next-line no-console
    console.error(`[error] ${req.method} ${req.originalUrl} → ${status} ${code}`);
    if (status >= 500) {
      // eslint-disable-next-line no-console
      console.error(err.stack || err);
    }
  }

  // Hide internals from the client for unexpected 5xx errors.
  const safeMessage =
    status >= 500 && !config.isDev
      ? 'Internal server error'
      : err.message || 'Internal server error';

  res.status(status).json({
    ok: false,
    error: {
      code,
      message: safeMessage,
      ...(err.details ? { details: err.details } : {}),
    },
  });
}

module.exports = errorHandler;
