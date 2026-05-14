// client/src/services/analyticsApi.js
// Wrapper cho /api/analytics/* (admin only).

import { api } from './api.js';

export const getSummary = () =>
  api.get('/analytics/summary').then((r) => r.data);

export const getByType = () =>
  api.get('/analytics/by-type').then((r) => r.data.events);

export const getRiskDistribution = () =>
  api.get('/analytics/risk-distribution').then((r) => r.data.distribution);

export const getFailedLoginTrend = (days = 7) =>
  api.get('/analytics/failed-login-trend', { params: { days } }).then((r) => r.data.trend);

export const getTopEndpoints = (limit = 10) =>
  api.get('/analytics/top-endpoints', { params: { limit } }).then((r) => r.data.endpoints);

// params: { limit, severity, type, mode }
export const getAuditLogs = (params = {}) =>
  api.get('/analytics/audit-logs', { params }).then((r) => r.data.logs);
