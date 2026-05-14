// server/services/auditLog.service.js
// Service tập trung để ghi và truy vấn bảng audit_logs.
//
// Mọi event quan trọng (login, suspected attack, blocked request, CRUD vault…)
// đều đi qua hàm log() bên dưới. Dashboard ở Step 9 chỉ đọc từ bảng này,
// không cần parse log file.

const db = require('../db/database');

// ─── Enum giá trị hợp lệ ─────────────────────────────────────────
// Trùng với CHECK constraint của bảng. Dùng object để IDE auto-complete
// và tránh typo khi gõ string trong controller.
const EVENT_TYPES = Object.freeze({
  LOGIN_SUCCESS:       'LOGIN_SUCCESS',
  LOGIN_FAILED:        'LOGIN_FAILED',
  SUSPECTED_SQLI:      'SUSPECTED_SQLI',
  SUSPECTED_XSS:       'SUSPECTED_XSS',
  CSRF_TOKEN_MISSING:  'CSRF_TOKEN_MISSING',
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  IDOR_ATTEMPT:        'IDOR_ATTEMPT',
  DATA_CREATED:        'DATA_CREATED',
  DATA_UPDATED:        'DATA_UPDATED',
  DATA_DELETED:        'DATA_DELETED',
  REQUEST_BLOCKED:     'REQUEST_BLOCKED',
  RATE_LIMIT_HIT:      'RATE_LIMIT_HIT',
});

const MODES    = Object.freeze({ VULNERABLE: 'vulnerable', HARDENED: 'hardened', NEUTRAL: 'neutral' });
const STATUSES = Object.freeze({ OBSERVED:   'observed',   ALLOWED:  'allowed',   BLOCKED: 'blocked' });

// risk_score mặc định cho từng loại event nếu caller không truyền.
// Step 8 (riskScoring) sẽ override các giá trị này bằng điểm tính động.
const DEFAULT_RISK = Object.freeze({
  LOGIN_SUCCESS:        5,
  LOGIN_FAILED:        15,
  SUSPECTED_SQLI:      60,
  SUSPECTED_XSS:       55,
  CSRF_TOKEN_MISSING:  25,
  UNAUTHORIZED_ACCESS: 20,
  IDOR_ATTEMPT:        45,
  DATA_CREATED:         0,
  DATA_UPDATED:         0,
  DATA_DELETED:         5,
  REQUEST_BLOCKED:     78,
  RATE_LIMIT_HIT:      30,
});

// ─── Helpers ─────────────────────────────────────────────────────

// Tính severity từ risk_score (0..100). Giống mapping ở config.RISK_BLOCK_THRESHOLD:
//   0–25: Low | 26–50: Medium | 51–75: High | 76–100: Critical
function severityFromRisk(score) {
  const s = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
  if (s >= 76) return 'Critical';
  if (s >= 51) return 'High';
  if (s >= 26) return 'Medium';
  return 'Low';
}

// Cắt chuỗi để tránh phình audit_logs.payload_summary.
function truncate(s, max = 500) {
  if (s === null || s === undefined) return null;
  const str = String(s);
  return str.length <= max ? str : str.slice(0, max) + '…';
}

// ─── Detector heuristic đơn giản ─────────────────────────────────
// Dùng trong controllers vulnerable/hardened để gắn cờ input nghi ngờ.
// Step 8 (riskScoring) sẽ mở rộng thêm cộng-điểm, đếm tần suất, v.v.
//
// Cố tình giữ pattern "vừa đủ" — không bắt 100% (đó là việc của WAF thật),
// nhưng đủ để dashboard thấy được các payload demo cổ điển.
const SQLI_PATTERN = /('|--|;|\bUNION\b|\bSELECT\b|\bOR\b\s+\d+\s*=|\bDROP\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b)/i;
const XSS_PATTERN  = /(<\s*script|<\s*img[^>]*onerror|on\w+\s*=|javascript:|<\s*iframe|<\s*svg[^>]*on)/i;

function detectSqli(input) {
  return SQLI_PATTERN.test(String(input || ''));
}
function detectXss(input) {
  return XSS_PATTERN.test(String(input || ''));
}

// ─── Insert ──────────────────────────────────────────────────────
function log({
  userId         = null,
  eventType,
  endpoint,
  httpMethod     = null,
  ipAddress      = null,
  userAgent      = null,
  payloadSummary = null,
  riskScore,                       // bỏ qua → dùng DEFAULT_RISK
  severity,                        // bỏ qua → tính từ riskScore
  status         = STATUSES.OBSERVED,
  mode           = MODES.NEUTRAL,
} = {}) {
  if (!eventType || !endpoint) {
    throw new Error('auditLog.log: eventType và endpoint là bắt buộc');
  }

  const score = riskScore !== undefined
    ? Math.max(0, Math.min(100, Math.round(Number(riskScore) || 0)))
    : (DEFAULT_RISK[eventType] ?? 0);

  const sev = severity || severityFromRisk(score);

  const res = db
    .prepare(`
      INSERT INTO audit_logs
        (user_id, event_type, endpoint, http_method, ip_address, user_agent,
         payload_summary, risk_score, severity, status, mode)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      userId,
      eventType,
      String(endpoint),
      httpMethod,
      ipAddress,
      truncate(userAgent, 256),
      truncate(payloadSummary, 500),
      score,
      sev,
      status,
      mode,
    );

  return Number(res.lastInsertRowid);
}

// ─── Queries dùng cho /api/analytics (Step 9) ────────────────────

function recent({ limit = 50, severity, eventType, mode } = {}) {
  let sql = `
    SELECT id, user_id, event_type, endpoint, http_method, ip_address,
           payload_summary, risk_score, severity, status, mode, created_at
    FROM audit_logs
    WHERE 1=1
  `;
  const params = [];
  if (severity)  { sql += ' AND severity = ?';   params.push(severity); }
  if (eventType) { sql += ' AND event_type = ?'; params.push(eventType); }
  if (mode)      { sql += ' AND mode = ?';       params.push(mode); }
  sql += ' ORDER BY id DESC LIMIT ?';
  params.push(Math.max(1, Math.min(500, Number(limit) || 50)));
  return db.prepare(sql).all(...params);
}

function countByEventType() {
  return db
    .prepare(`
      SELECT event_type AS eventType, COUNT(*) AS count
      FROM audit_logs
      GROUP BY event_type
      ORDER BY count DESC
    `)
    .all();
}

function countBySeverity() {
  return db
    .prepare(`
      SELECT severity, COUNT(*) AS count
      FROM audit_logs
      GROUP BY severity
    `)
    .all();
}

function failedLoginTrend({ days = 7 } = {}) {
  const d = Math.max(1, Math.min(60, Number(days) || 7));
  return db
    .prepare(`
      SELECT date(created_at) AS day, COUNT(*) AS count
      FROM audit_logs
      WHERE event_type = 'LOGIN_FAILED'
        AND created_at >= datetime('now', ?)
      GROUP BY day
      ORDER BY day ASC
    `)
    .all(`-${d} days`);
}

function topEndpointsByRisk({ limit = 10 } = {}) {
  return db
    .prepare(`
      SELECT endpoint, SUM(risk_score) AS totalRisk, COUNT(*) AS hits
      FROM audit_logs
      GROUP BY endpoint
      ORDER BY totalRisk DESC
      LIMIT ?
    `)
    .all(Math.max(1, Math.min(100, Number(limit) || 10)));
}

function summary() {
  const total            = db.prepare('SELECT COUNT(*) AS c FROM audit_logs').get().c;
  const blocked          = db.prepare("SELECT COUNT(*) AS c FROM audit_logs WHERE status = 'blocked'").get().c;
  const encryptedRecords = db.prepare('SELECT COUNT(*) AS c FROM vault_items WHERE is_encrypted = 1').get().c;
  const lastHour         = db.prepare("SELECT COUNT(*) AS c FROM audit_logs WHERE created_at >= datetime('now','-1 hour')").get().c;
  return { total, blocked, encryptedRecords, lastHour };
}

module.exports = {
  EVENT_TYPES, MODES, STATUSES, DEFAULT_RISK,
  log, severityFromRisk, truncate,
  detectSqli, detectXss,
  recent, countByEventType, countBySeverity,
  failedLoginTrend, topEndpointsByRisk, summary,
};
