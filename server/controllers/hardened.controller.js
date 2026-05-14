// server/controllers/hardened.controller.js
// Mirror các demo trong vulnerable.controller.js NHƯNG dùng:
//   - prepared statements
//   - bcrypt (qua auth.service.login)
//   - escape HTML output
//   - ownership check
//   - validation đã chạy ở middleware
//
// CSRF token, rate limit, security headers, requireAuth được apply
// ở routes/hardened.routes.js (Step 5).

const db = require('../db/database');
const config = require('../config');
const authService = require('../services/auth.service');
const riskScoring = require('../services/riskScoring.service');
const { authCookieOptions } = require('./auth.controller');

// In-memory store riêng cho hardened mode (KHÔNG dùng chung với vulnerable
// để dashboard / UI compare tách bạch).
const HARDENED_COMMENTS = [];
const HARDENED_TRANSFERS = [];

// Escape các ký tự nguy hiểm khi inject vào HTML.
// Tối thiểu cần: & < > " '
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─────────────────────────────────────────────────────────────────
// 1) POST /api/hardened/login   — counter-part của vulnerable login
// ─────────────────────────────────────────────────────────────────
async function hardenedLogin(req, res, next) {
  try {
    const { email, password } = req.body;
    // auth.service.login dùng prepared statement + bcrypt.compare.
    // Cùng payload SQLi với vulnerable mode sẽ thất bại 401.
    const user = await authService.login({ email, password });

    const token = authService.issueToken(user);
    res.cookie(config.COOKIE_NAME, token, authCookieOptions());

    req.audit && req.audit.log({
      userId: user.id,
      eventType: 'LOGIN_SUCCESS',
      mode: 'hardened',
      status: 'allowed',
    });

    return res.json({ ok: true, data: { user, mode: 'hardened' } });
  } catch (e) {
    if (e && e.code === 'INVALID_CREDENTIALS') {
      riskScoring.notifyLoginFailed(req.ip);
      if (req.audit) {
        req.audit.log({
          eventType: 'LOGIN_FAILED',
          mode: 'hardened',
          status: 'allowed',
          payloadSummary: `email=${req.body && req.body.email}`,
        });
      }
    }
    return next(e);
  }
}

// ─────────────────────────────────────────────────────────────────
// 2) GET /api/hardened/search?q=
// ─────────────────────────────────────────────────────────────────
function hardenedSearch(req, res, next) {
  try {
    const q = String(req.query.q || '');
    // Prepared statement: q chỉ đóng vai trò DATA, không bao giờ được parse như SQL.
    // Wildcard '%' của user vẫn được phép search rộng — đó là feature, không phải SQLi.
    const pattern = `%${q}%`;
    const rows = db
      .prepare('SELECT id, user_id, title FROM vault_items WHERE title LIKE ? LIMIT 50')
      .all(pattern);
    return res.json({
      ok: true,
      data: {
        rows,
        note: 'Prepared statement: input chỉ là data, không thể đổi cấu trúc SQL.',
      },
    });
  } catch (e) {
    next(e);
  }
}

// ─────────────────────────────────────────────────────────────────
// 3) POST /api/hardened/comments   — chống XSS (escape khi output)
// ─────────────────────────────────────────────────────────────────
// Chiến lược: LƯU raw để khi sửa vẫn có nguyên text gốc, ESCAPE khi
// trả ra cho client. FE render bằng textContent là an toàn tuyệt đối.
function addComment(req, res) {
  const { author = 'anonymous', body } = req.body;
  const entry = {
    id: HARDENED_COMMENTS.length + 1,
    author: String(author),
    body: String(body),
    createdAt: new Date().toISOString(),
  };
  HARDENED_COMMENTS.push(entry);
  req.audit && req.audit.log({
    eventType: 'DATA_CREATED',
    mode: 'hardened',
    status: 'allowed',
    payloadSummary: `hardened comment id=${entry.id} (escaped)`,
  });
  return res.status(201).json({
    ok: true,
    data: {
      id: entry.id,
      author: escapeHtml(entry.author),
      body: escapeHtml(entry.body),
      createdAt: entry.createdAt,
    },
  });
}

function listComments(_req, res) {
  // Escape khi output. FE có thể render an toàn bằng textContent hoặc innerHTML.
  const safe = HARDENED_COMMENTS.map((c) => ({
    ...c,
    author: escapeHtml(c.author),
    body: escapeHtml(c.body),
  }));
  return res.json({
    ok: true,
    data: {
      comments: safe,
      note: 'HTML entities được escape phía server trước khi trả về.',
    },
  });
}

function reflectEcho(req, res) {
  const msg = String(req.query.msg || '');
  return res.json({
    ok: true,
    data: {
      echoed: escapeHtml(msg),
      original: msg,
      note: 'Server escape HTML entities trước khi reflect.',
    },
  });
}

// ─────────────────────────────────────────────────────────────────
// 4) POST /api/hardened/transfer   — chống CSRF
// ─────────────────────────────────────────────────────────────────
// CHỈ chấp nhận POST (GET không được mount), verifyCsrfToken đã check
// header X-CSRF-Token === cookie sv_csrf, requireAuth đã enforce login.
function transfer(req, res) {
  const { to, amount } = req.body;
  const entry = {
    id: HARDENED_TRANSFERS.length + 1,
    from: req.user.username,
    to: String(to),
    amount: Number(amount),
    method: 'POST',
    at: new Date().toISOString(),
  };
  HARDENED_TRANSFERS.push(entry);
  req.audit && req.audit.log({
    eventType: 'DATA_CREATED',
    mode: 'hardened',
    status: 'allowed',
    payloadSummary: `transfer to=${entry.to} amount=${entry.amount}`,
  });
  return res.json({
    ok: true,
    data: {
      entry,
      note: 'Yêu cầu: POST + CSRF token hợp lệ + đã đăng nhập. 3 lớp bảo vệ.',
    },
  });
}

function listTransfers(_req, res) {
  return res.json({ ok: true, data: { transfers: HARDENED_TRANSFERS } });
}

// ─────────────────────────────────────────────────────────────────
// 5) GET /api/hardened/vault/:id   — chống IDOR
// ─────────────────────────────────────────────────────────────────
function getVaultItem(req, res, next) {
  try {
    const id = Number(req.params.id);
    // Query có "AND user_id = ?" để DB tự lọc theo owner.
    // Không bao giờ tin tưởng req.params.id một mình.
    const row = db
      .prepare(
        'SELECT id, user_id, title, content_plaintext, content_encrypted, is_encrypted, created_at, updated_at ' +
        'FROM vault_items WHERE id = ? AND user_id = ?'
      )
      .get(id, req.user.id);

    if (!row) {
      // KHÔNG phân biệt "không tồn tại" vs "không thuộc về user" để tránh
      // information disclosure (user enumeration / item enumeration).
      // Nhưng VẪN audit log để dashboard thấy attempt.
      // Check riêng xem item có tồn tại không để gắn cờ IDOR chính xác.
      const exists = db
        .prepare('SELECT user_id FROM vault_items WHERE id = ?')
        .get(id);
      if (exists && exists.user_id !== req.user.id) {
        req.audit && req.audit.log({
          eventType: 'IDOR_ATTEMPT',
          mode: 'hardened',
          status: 'blocked',
          payloadSummary: `id=${id} ownerId=${exists.user_id} requesterId=${req.user.id}`,
        });
      }
      const e = new Error('Item không tồn tại hoặc bạn không có quyền truy cập');
      e.status = 404;
      e.code = 'NOT_FOUND';
      return next(e);
    }
    return res.json({ ok: true, data: { item: row } });
  } catch (e) {
    next(e);
  }
}

// ─────────────────────────────────────────────────────────────────
// 6) GET /api/hardened/headers-demo   — show CSP đã apply
// ─────────────────────────────────────────────────────────────────
function headersDemo(_req, res) {
  // securityHeaders() đã apply ở router level. Đọc lại để hiển thị cho FE.
  const sent = res.getHeaders();
  return res.json({
    ok: true,
    data: {
      mode: 'hardened',
      sentHeaders: Object.keys(sent),
      csp:                      sent['content-security-policy']      || null,
      xContentTypeOptions:      sent['x-content-type-options']       || null,
      xFrameOptions:            sent['x-frame-options']              || null,
      referrerPolicy:           sent['referrer-policy']              || null,
      strictTransportSecurity:  sent['strict-transport-security']    || null,
      note: 'Helmet đã apply CSP + security headers tiêu chuẩn cho mọi response của router này.',
    },
  });
}

module.exports = {
  hardenedLogin,
  hardenedSearch,
  addComment,
  listComments,
  reflectEcho,
  transfer,
  listTransfers,
  getVaultItem,
  headersDemo,
};
