// server/middlewares/riskScoring.middleware.js
// Chèn vào router hardened (và vault) TRƯỚC controller.
//
// Cách hoạt động:
//   1. Tính riskScoring.evaluate(req) → { score, signals, severity }
//   2. Gán req.risk để controller có thể đọc và log với risk_score chính xác.
//   3. Nếu score >= config.RISK_BLOCK_THRESHOLD (mặc định 51) → BLOCK:
//      - audit log REQUEST_BLOCKED kèm signals
//      - throw 403 REQUEST_BLOCKED qua errorHandler
//   4. Nếu score < threshold nhưng có signal → audit log từng signal
//      (status='allowed') để dashboard quan sát mà không chặn user.

const config = require('../config');
const riskScoring = require('../services/riskScoring.service');

// Mỗi rule signal được map sang một event_type tương ứng để dashboard
// có thể group theo event. LOGIN_FAILED không map ở đây — login controller
// đã log riêng với context đầy đủ.
const SIGNAL_TO_EVENT = {
  SQLI_PATTERN: 'SUSPECTED_SQLI',
  XSS_PATTERN:  'SUSPECTED_XSS',
  RATE_BURST:   'RATE_LIMIT_HIT',
};

function riskScoringGuard(req, _res, next) {
  const risk = riskScoring.evaluate(req);
  req.risk = risk;

  // ─── Trường hợp BLOCK ────────────────────────────────────────
  if (risk.score >= config.RISK_BLOCK_THRESHOLD) {
    if (req.audit) {
      req.audit.log({
        eventType: 'REQUEST_BLOCKED',
        mode: 'hardened',
        status: 'blocked',
        riskScore: risk.score,
        severity: risk.severity,
        payloadSummary:
          'signals=' + risk.signals.map((s) => `${s.rule}(+${s.points})`).join(','),
      });
    }
    const e = new Error(
      `Request bị chặn: risk_score=${risk.score} >= ngưỡng ${config.RISK_BLOCK_THRESHOLD}`
    );
    e.status = 403;
    e.code = 'REQUEST_BLOCKED';
    e.details = risk.signals;
    return next(e);
  }

  // ─── Trường hợp PASS nhưng có signal — log để observe ────────
  if (req.audit && risk.signals.length > 0) {
    for (const sig of risk.signals) {
      const eventType = SIGNAL_TO_EVENT[sig.rule];
      if (!eventType) continue;       // skip rule không có event mapping
      req.audit.log({
        eventType,
        mode: 'hardened',
        status: 'allowed',
        riskScore: sig.points,
        payloadSummary: `signal=${sig.rule} evidence=${sig.evidence}`,
      });
    }
  }

  return next();
}

module.exports = riskScoringGuard;
