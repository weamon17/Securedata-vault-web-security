// server/controllers/vulnerable.controller.js
//
// ⚠️ CẢNH BÁO ⚠️
// File này CỐ Ý chứa các lỗ hổng bảo mật (SQLi, XSS, CSRF, IDOR, CSP missing)
// để minh hoạ rủi ro cho mục đích học thuật trong môi trường LAB nội bộ.
// KHÔNG được sao chép pattern này vào production hoặc deploy public.
//
// Tương ứng từng demo sẽ có endpoint hardened cùng tên ở /api/hardened (Step 5)
// để frontend hiển thị so sánh side-by-side.

const db = require('../db/database');
const config = require('../config');
const authService = require('../services/auth.service');
const { detectSqli, detectXss } = require('../services/auditLog.service');
const { decrypt } = require('../services/encryption.service');

// In-memory store cho 2 demo không cần persist:
//   - comments (XSS demo)
//   - transfers (CSRF demo)
// Reset khi server restart — đủ cho mục đích minh hoạ.
const COMMENTS = [];
const TRANSFERS = [];

// Helper set cookie JWT giống auth.controller, nhưng KHÔNG dùng options
// chặt chẽ — minh hoạ rằng vulnerable mode không quan tâm cookie hardening.
function setSessionCookie(res, user) {
  const token = authService.issueToken(user);
  res.cookie(config.COOKIE_NAME, token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
  });
}

// ─────────────────────────────────────────────────────────────────
// 1) POST /api/vulnerable/login   — SQL Injection demo
// ─────────────────────────────────────────────────────────────────
// CỐ Ý: nối thẳng input người dùng vào câu SQL bằng string template.
// Payload mẫu cho phần báo cáo / video demo:
//   email    = admin@securevault.local' OR '1'='1
//   password = anything
// Hoặc:
//   email    = ' OR 1=1 --
//   password = anything
async function vulnerableLogin(req, res, next) {
  try {
    const { email = '', password = '' } = req.body || {};

    // ❌ Anti-pattern: string concat.
    const sql =
      "SELECT id, username, email, role FROM users WHERE email = '" +
      email +
      "' AND password_hash = '" +
      password +
      "'";

    // Phát hiện pattern SQLi và audit log (KHÔNG block — đây là vulnerable mode).
    if (detectSqli(email) || detectSqli(password)) {
      req.audit && req.audit.log({
        eventType: 'SUSPECTED_SQLI',
        mode: 'vulnerable',
        status: 'observed',
        payloadSummary: `email=${email}`,
      });
    }

    let row;
    try {
      row = db.prepare(sql).get();
    } catch (sqlErr) {
      // ❌ Leak nguyên message lỗi + raw SQL cho client — minh hoạ rủi ro
      //   information disclosure trong vulnerable mode.
      return res.status(400).json({
        ok: false,
        error: { code: 'SQL_ERROR', message: sqlErr.message, sql },
      });
    }

    if (!row) {
      return res
        .status(401)
        .json({ ok: false, error: { code: 'NO_MATCH', message: 'No matching user', sql } });
    }

    // Phát hành JWT để FE hiện trạng thái "đã đăng nhập" — minh hoạ
    // rằng SQLi đã bypass auth thành công.
    setSessionCookie(res, row);

    return res.json({
      ok: true,
      data: {
        user: row,
        sql,
        warning:
          'Đăng nhập thành công qua vulnerable endpoint (raw SQL concat). ' +
          'So sánh với /api/auth/login để thấy cách hardened version chặn payload tương tự.',
      },
    });
  } catch (e) {
    next(e);
  }
}

// ─────────────────────────────────────────────────────────────────
// 2) GET /api/vulnerable/search?q=   — SQLi qua LIKE
// ─────────────────────────────────────────────────────────────────
// Payload mẫu:
//   ?q=%25' UNION SELECT id, email, password_hash, role FROM users --
//   (URL-encoded của: %' UNION SELECT id, email, password_hash, role FROM users --)
function vulnerableSearch(req, res, next) {
  try {
    const q = String(req.query.q || '');

    // ❌ Anti-pattern: nội suy thẳng input vào LIKE clause.
    const sql =
      "SELECT id, user_id, title, content_plaintext FROM vault_items WHERE title LIKE '%" +
      q +
      "%'";

    let rows;
    try {
      rows = db.prepare(sql).all();
    } catch (sqlErr) {
      return res
        .status(400)
        .json({ ok: false, error: { code: 'SQL_ERROR', message: sqlErr.message, sql } });
    }

    if (detectSqli(q)) {
      req.audit && req.audit.log({
        eventType: 'SUSPECTED_SQLI',
        mode: 'vulnerable',
        status: 'observed',
        payloadSummary: `q=${q}`,
      });
    }
    return res.json({ ok: true, data: { rows, sql } });
  } catch (e) {
    next(e);
  }
}

// ─────────────────────────────────────────────────────────────────
// 3) POST /api/vulnerable/comments   — Stored XSS demo
//    GET  /api/vulnerable/comments   — trả list raw để FE render unsafe
//    GET  /api/vulnerable/echo?msg=  — Reflected XSS demo
// ─────────────────────────────────────────────────────────────────
// Payload mẫu:
//   body = <script>alert('XSS')</script>
//   body = <img src=x onerror="alert(document.cookie)">
function addComment(req, res, next) {
  try {
    const { author = 'anonymous', body = '' } = req.body || {};

    // ❌ Lưu raw HTML, không sanitize. FE vulnerable sẽ render bằng
    //    dangerouslySetInnerHTML → kích hoạt script.
    const entry = {
      id: COMMENTS.length + 1,
      author: String(author),
      body: String(body),
      createdAt: new Date().toISOString(),
    };
    COMMENTS.push(entry);

    if (detectXss(body) || detectXss(author)) {
      req.audit && req.audit.log({
        eventType: 'SUSPECTED_XSS',
        mode: 'vulnerable',
        status: 'observed',
        payloadSummary: `body=${body}`,
      });
    }
    return res.status(201).json({ ok: true, data: entry });
  } catch (e) {
    next(e);
  }
}

function listComments(_req, res) {
  return res.json({ ok: true, data: { comments: COMMENTS } });
}

function reflectEcho(req, res) {
  // ❌ Reflected: trả lại raw msg cho FE render trực tiếp.
  return res.json({
    ok: true,
    data: {
      echoed: String(req.query.msg || ''),
      note: 'Vulnerable: server không escape, FE có thể render bằng innerHTML.',
    },
  });
}

// ─────────────────────────────────────────────────────────────────
// 4) GET/POST /api/vulnerable/transfer   — CSRF demo
// ─────────────────────────────────────────────────────────────────
// Tại sao GET đủ để minh hoạ CSRF:
//   - State-change qua GET có thể trigger bằng <img src=".../transfer?to=evil&amount=1000">
//     mà attacker nhúng vào trang khác → cookie session vẫn được browser gửi kèm.
//   - Vulnerable mode chấp nhận cả GET lẫn POST, KHÔNG kiểm tra CSRF token,
//     KHÔNG check origin/referer.
function transfer(req, res) {
  const to = req.query.to || (req.body && req.body.to) || 'unknown';
  const amount = Number(req.query.amount || (req.body && req.body.amount) || 0);
  // req.user có thể có (nếu user đã login) hoặc undefined (anonymous).
  const from = req.user ? req.user.username : 'anonymous';

  const entry = {
    id: TRANSFERS.length + 1,
    from,
    to: String(to),
    amount,
    method: req.method,
    at: new Date().toISOString(),
  };
  TRANSFERS.push(entry);

  // Mỗi transfer ở vulnerable mode đều là CSRF risk vì không yêu cầu token.
  req.audit && req.audit.log({
    eventType: 'CSRF_TOKEN_MISSING',
    mode: 'vulnerable',
    status: 'observed',
    payloadSummary: `${req.method} to=${entry.to} amount=${entry.amount}`,
  });

  return res.json({
    ok: true,
    data: {
      entry,
      warning:
        'Transfer thực thi mà KHÔNG có CSRF token và CHẤP NHẬN cả GET. ' +
        'Đây là điều kiện cần và đủ cho tấn công CSRF cổ điển.',
    },
  });
}

function listTransfers(_req, res) {
  return res.json({ ok: true, data: { transfers: TRANSFERS } });
}

// ─────────────────────────────────────────────────────────────────
// 5) GET /api/vulnerable/vault/:id   — IDOR demo
// ─────────────────────────────────────────────────────────────────
// CỐ Ý: query item theo id mà không kiểm tra user_id === req.user.id.
// Kể cả khi user A login, vẫn xem được item của user B chỉ bằng cách
// đổi số trong URL.
function getVaultItemUnsafe(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res
        .status(400)
        .json({ ok: false, error: { code: 'BAD_ID', message: 'id phải là số' } });
    }

    // ❌ Không có "AND user_id = :me"
    const row = db
      .prepare(
        `SELECT id, user_id, title,
                content_plaintext, content_encrypted, is_encrypted,
                created_at
         FROM vault_items WHERE id = ?`
      )
      .get(id);

    if (!row) {
      return res
        .status(404)
        .json({ ok: false, error: { code: 'NOT_FOUND', message: 'Item không tồn tại' } });
    }

    // Resolve content: item cũ dùng plaintext, item mới dùng AES-256-GCM.
    // Endpoint này CỐ Ý decrypt luôn để minh hoạ: IDOR không chỉ lộ metadata
    // mà còn lộ toàn bộ nội dung — kể cả khi nội dung đã được mã hoá at rest.
    let content = row.content_plaintext;
    if (!content && row.is_encrypted && row.content_encrypted) {
      try {
        content = decrypt(row.content_encrypted);
      } catch (_) {
        content = '[encrypted — decryption failed]';
      }
    }

    // Chỉ ghi IDOR khi user đã login VÀ truy cập item của người khác.
    if (req.user && row.user_id !== req.user.id) {
      req.audit && req.audit.log({
        eventType: 'IDOR_ATTEMPT',
        mode: 'vulnerable',
        status: 'observed',
        payloadSummary: `id=${id} ownerId=${row.user_id} requesterId=${req.user.id}`,
      });
    }

    return res.json({
      ok: true,
      data: {
        item: {
          id:         row.id,
          user_id:    row.user_id,
          title:      row.title,
          content,                       // đã decrypt — lộ toàn bộ nội dung
          is_encrypted: !!row.is_encrypted,
          created_at: row.created_at,
        },
        requestedBy: req.user ? req.user.id : null,
        warning:
          'Không kiểm tra ownership. Bất kỳ id nào tồn tại đều xem được — ' +
          'kể cả nội dung đã mã hoá AES-256-GCM cũng bị lộ vì server tự decrypt.',
      },
    });
  } catch (e) {
    next(e);
  }
}

// ─────────────────────────────────────────────────────────────────
// 6) GET /api/vulnerable/headers-demo   — CSP / Security headers missing
// ─────────────────────────────────────────────────────────────────
// Trả JSON liệt kê các header response — FE sẽ so sánh với hardened để thấy
// thiếu CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy...
function headersDemo(_req, res) {
  // ❌ KHÔNG apply helmet hoặc CSP.
  const sent = res.getHeaders();
  return res.json({
    ok: true,
    data: {
      mode: 'vulnerable',
      sentHeaders: Object.keys(sent),
      missingHardeningHeaders: [
        'content-security-policy',
        'x-content-type-options',
        'x-frame-options',
        'strict-transport-security',
        'referrer-policy',
        'permissions-policy',
      ],
      note:
        'Response không có CSP và các security headers tiêu chuẩn. ' +
        'So sánh với /api/hardened/headers-demo (dùng helmet) để thấy khác biệt.',
    },
  });
}

module.exports = {
  vulnerableLogin,
  vulnerableSearch,
  addComment,
  listComments,
  reflectEcho,
  transfer,
  listTransfers,
  getVaultItemUnsafe,
  headersDemo,
};
