// server/services/riskScoring.service.js
// Rule-based risk scoring engine.
//
// Cách dùng:
//   const r = riskScoring.evaluate(req);
//   // r = { score: 0..100, severity: 'Low'|...'Critical', signals: [...] }
//
// Một số rule cần state cross-request (ví dụ "đăng nhập thất bại N lần trong
// 15 phút") — giữ trong Map in-memory. Reset khi server restart, đủ cho demo
// học thuật. Trong production sẽ thay bằng Redis hoặc rate-limit store riêng.
//
// 7 rule được mô tả trong báo cáo:
//   1. FAILED_LOGIN   : +10 mỗi attempt, cap 40, window 15 phút (theo IP)
//   2. SQLI_PATTERN   : +25 nếu input match SQL injection pattern
//   3. XSS_PATTERN    : +25 nếu input match XSS pattern
//   4. CSRF_MISSING   : +20  (handled bởi csrf.middleware → log trực tiếp)
//   5. OWNERSHIP_VIOLATION (IDOR): +30  (handled bởi controller)
//   6. RATE_BURST     : +15 khi vượt 30 req/phút theo IP
//   7. UNAUTH_PROTECTED: +20 (handled bởi auth.middleware.requireAuth)
//
// Middleware riskScoring.middleware.js sẽ chỉ tính các rule "pre-controller"
// (1, 2, 3, 6). Các rule 4/5/7 do middleware/controller chuyên trách log.

const { detectSqli, detectXss } = require('./auditLog.service');

// ─── State in-memory (per IP) ────────────────────────────────────
const FAILED_LOGINS = new Map();   // ip → { count, ts }
const REQUEST_RATE  = new Map();   // ip → { count, windowStart }

const FAILED_LOGIN_WINDOW_MS = 15 * 60 * 1000;   // 15 phút
const RATE_WINDOW_MS         = 60 * 1000;        // 1 phút
const RATE_THRESHOLD         = 30;               // > 30 req/phút mới cộng điểm

const RULES = Object.freeze({
  FAILED_LOGIN:        { name: 'FAILED_LOGIN',        pointsPerHit: 10, cap: 40 },
  SQLI_PATTERN:        { name: 'SQLI_PATTERN',        points: 25 },
  XSS_PATTERN:         { name: 'XSS_PATTERN',         points: 25 },
  CSRF_MISSING:        { name: 'CSRF_MISSING',        points: 20 },
  OWNERSHIP_VIOLATION: { name: 'OWNERSHIP_VIOLATION', points: 30 },
  RATE_BURST:          { name: 'RATE_BURST',          points: 15 },
  UNAUTH_PROTECTED:    { name: 'UNAUTH_PROTECTED',    points: 20 },
});

// ─── Helpers state ───────────────────────────────────────────────

function recordFailedLogin(ip) {
  if (!ip) return;
  const now = Date.now();
  const cur = FAILED_LOGINS.get(ip);
  if (!cur || now - cur.ts > FAILED_LOGIN_WINDOW_MS) {
    FAILED_LOGINS.set(ip, { count: 1, ts: now });
  } else {
    cur.count += 1;
    cur.ts = now;
  }
}

function getFailedLoginCount(ip) {
  if (!ip) return 0;
  const cur = FAILED_LOGINS.get(ip);
  if (!cur) return 0;
  if (Date.now() - cur.ts > FAILED_LOGIN_WINDOW_MS) {
    FAILED_LOGINS.delete(ip);
    return 0;
  }
  return cur.count;
}

function recordRequest(ip) {
  if (!ip) return 0;
  const now = Date.now();
  const cur = REQUEST_RATE.get(ip);
  if (!cur || now - cur.windowStart > RATE_WINDOW_MS) {
    REQUEST_RATE.set(ip, { count: 1, windowStart: now });
    return 1;
  }
  cur.count += 1;
  return cur.count;
}

// ─── Severity mapping (đồng bộ với auditLog.severityFromRisk) ────
function severityFromScore(score) {
  const s = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
  if (s >= 76) return 'Critical';
  if (s >= 51) return 'High';
  if (s >= 26) return 'Medium';
  return 'Low';
}

// ─── Inspect input ───────────────────────────────────────────────
// Gom tất cả giá trị string từ query/body/params để scan pattern.
function gatherInputs(req) {
  const parts = [];
  const push = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (typeof v === 'string') parts.push(v);
      else if (v != null && typeof v !== 'object') parts.push(String(v));
    }
  };
  push(req.query);
  push(req.body);
  push(req.params);
  return parts;
}

// ─── Main API ────────────────────────────────────────────────────
// Tính điểm risk cho 1 request, KHÔNG có side-effect ngoài việc tăng
// counter rate burst (cần đếm cùng lúc với evaluate).
function evaluate(req) {
  const ip = req.ip || 'unknown';
  const signals = [];
  let score = 0;

  // Rule 6 — Rate burst (đếm và check ngay)
  const reqCount = recordRequest(ip);
  if (reqCount > RATE_THRESHOLD) {
    signals.push({
      rule: RULES.RATE_BURST.name,
      points: RULES.RATE_BURST.points,
      evidence: `${reqCount} req/min from ${ip}`,
    });
    score += RULES.RATE_BURST.points;
  }

  // Rule 2 — SQLI pattern (scan toàn bộ input)
  const inputs = gatherInputs(req);
  for (const v of inputs) {
    if (detectSqli(v)) {
      signals.push({
        rule: RULES.SQLI_PATTERN.name,
        points: RULES.SQLI_PATTERN.points,
        evidence: v.slice(0, 80),
      });
      score += RULES.SQLI_PATTERN.points;
      break;                       // cộng điểm 1 lần cho mỗi rule
    }
  }

  // Rule 3 — XSS pattern
  for (const v of inputs) {
    if (detectXss(v)) {
      signals.push({
        rule: RULES.XSS_PATTERN.name,
        points: RULES.XSS_PATTERN.points,
        evidence: v.slice(0, 80),
      });
      score += RULES.XSS_PATTERN.points;
      break;
    }
  }

  // Rule 1 — Failed login burst (sử dụng counter đã được login controller cập nhật)
  const failCount = getFailedLoginCount(ip);
  if (failCount > 0) {
    const points = Math.min(failCount * RULES.FAILED_LOGIN.pointsPerHit, RULES.FAILED_LOGIN.cap);
    signals.push({
      rule: RULES.FAILED_LOGIN.name,
      points,
      evidence: `${failCount} failed login(s) trong 15 phút gần nhất`,
    });
    score += points;
  }

  score = Math.min(100, score);

  return {
    score,
    severity: severityFromScore(score),
    signals,
  };
}

// API tiện cho login controller báo "vừa fail" → cộng vào rule #1.
function notifyLoginFailed(ip) {
  recordFailedLogin(ip);
}

module.exports = {
  evaluate,
  notifyLoginFailed,
  severityFromScore,
  RULES,
  // export để testing nếu cần
  _state: { FAILED_LOGINS, REQUEST_RATE },
};
