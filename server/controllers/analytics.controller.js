// server/controllers/analytics.controller.js
// Controller mỏng: chỉ wrap các query helper trong auditLog.service.
// requireAuth + requireAdmin được apply ở route level → admin mới gọi được.

const auditLog = require('../services/auditLog.service');

// GET /api/analytics/summary
function summary(_req, res, next) {
  try {
    return res.json({ ok: true, data: auditLog.summary() });
  } catch (e) {
    next(e);
  }
}

// GET /api/analytics/by-type
// Trả về danh sách { eventType, count } sắp xếp giảm dần.
function byType(_req, res, next) {
  try {
    return res.json({ ok: true, data: { events: auditLog.countByEventType() } });
  } catch (e) {
    next(e);
  }
}

// GET /api/analytics/risk-distribution
// Luôn trả về ĐỦ 4 mức severity (kể cả khi count=0) — biểu đồ pie/bar dễ vẽ.
function riskDistribution(_req, res, next) {
  try {
    const rows = auditLog.countBySeverity();
    const buckets = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    for (const r of rows) buckets[r.severity] = r.count;
    const distribution = ['Low', 'Medium', 'High', 'Critical'].map((s) => ({
      severity: s,
      count: buckets[s],
    }));
    return res.json({ ok: true, data: { distribution } });
  } catch (e) {
    next(e);
  }
}

// GET /api/analytics/failed-login-trend?days=7
function failedLoginTrend(req, res, next) {
  try {
    const days = Number(req.query.days) || 7;
    const trend = auditLog.failedLoginTrend({ days });
    return res.json({ ok: true, data: { trend, days } });
  } catch (e) {
    next(e);
  }
}

// GET /api/analytics/top-endpoints?limit=10
function topEndpoints(req, res, next) {
  try {
    const limit = Number(req.query.limit) || 10;
    return res.json({
      ok: true,
      data: { endpoints: auditLog.topEndpointsByRisk({ limit }) },
    });
  } catch (e) {
    next(e);
  }
}

// GET /api/analytics/audit-logs?limit=&severity=&type=&mode=
function auditLogs(req, res, next) {
  try {
    const { limit, severity, type, mode } = req.query;
    const logs = auditLog.recent({
      limit: Number(limit) || 50,
      severity: severity || undefined,
      eventType: type || undefined,
      mode: mode || undefined,
    });
    return res.json({ ok: true, data: { logs } });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  summary,
  byType,
  riskDistribution,
  failedLoginTrend,
  topEndpoints,
  auditLogs,
};
