// client/src/services/labApi.js
// Wrapper cho các demo endpoint Vulnerability Lab.
// Mỗi nhóm export 1 object có 2 method tương ứng vulnerable / hardened, để
// component CompareSplit ở Step 11 có thể gọi đối xứng:
//
//   const [v, h] = await Promise.all([sqli.vulnerable(...), sqli.hardened(...)]);

import { api } from './api.js';

// ─── 1. SQL Injection ────────────────────────────────────────────
export const sqli = {
  loginVulnerable: (email, password) =>
    api.post('/vulnerable/login', { email, password }),
  loginHardened: (email, password) =>
    api.post('/hardened/login', { email, password }),
  searchVulnerable: (q) =>
    api.get('/vulnerable/search', { params: { q } }),
  searchHardened: (q) =>
    api.get('/hardened/search', { params: { q } }),
};

// ─── 2. XSS (Stored + Reflected) ────────────────────────────────
export const xss = {
  addCommentVulnerable: (body, author = 'demo') =>
    api.post('/vulnerable/comments', { body, author }),
  listCommentsVulnerable: () => api.get('/vulnerable/comments'),
  addCommentHardened: (body, author = 'demo') =>
    api.post('/hardened/comments', { body, author }),
  listCommentsHardened: () => api.get('/hardened/comments'),
  echoVulnerable: (msg) => api.get('/vulnerable/echo', { params: { msg } }),
  echoHardened: (msg) => api.get('/hardened/echo', { params: { msg } }),
};

// ─── 3. CSRF ─────────────────────────────────────────────────────
export const csrf = {
  transferVulnerableGet: (to, amount) =>
    api.get('/vulnerable/transfer', { params: { to, amount } }),
  transferVulnerablePost: (to, amount) =>
    api.post('/vulnerable/transfer', { to, amount }),
  transferHardened: (to, amount) =>
    api.post('/hardened/transfer', { to, amount }),
  listVulnerable: () => api.get('/vulnerable/transfers'),
  listHardened: () => api.get('/hardened/transfers'),
};

// ─── 4. IDOR ─────────────────────────────────────────────────────
export const idor = {
  vulnerable: (id) => api.get(`/vulnerable/vault/${id}`),
  hardened: (id) => api.get(`/hardened/vault/${id}`),
};

// ─── 5. CSP / Security headers ───────────────────────────────────
export const headersDemo = {
  vulnerable: () => api.get('/vulnerable/headers-demo'),
  hardened: () => api.get('/hardened/headers-demo'),
};
