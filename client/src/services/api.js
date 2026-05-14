// client/src/services/api.js
// Axios instance dùng chung cho toàn bộ FE.
//
// 3 việc quan trọng:
//   1. withCredentials: true        → browser gửi cookie HttpOnly (sv_access) +
//                                     cookie thường (sv_csrf) cho mọi request.
//   2. CSRF auto-attach             → request POST/PUT/PATCH/DELETE tự đính
//                                     header X-CSRF-Token đọc từ cookie sv_csrf.
//   3. Response unwrap to body      → mọi response trả về body JSON đã parse
//                                     theo contract { ok, data, error }.

import axios from 'axios';

// ─── Cookie reader (browser) ─────────────────────────────────────
function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = document.cookie.match(new RegExp('(?:^|; )' + escaped + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

// ─── Axios instance ──────────────────────────────────────────────
export const api = axios.create({
  baseURL: '/api',          // được Vite proxy → http://localhost:4000/api
  withCredentials: true,    // gửi cookie session
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor: gắn CSRF token cho state-change ────────
const UNSAFE_METHODS = new Set(['post', 'put', 'patch', 'delete']);
api.interceptors.request.use((config) => {
  const method = (config.method || 'get').toLowerCase();
  if (UNSAFE_METHODS.has(method)) {
    const token = getCookie('sv_csrf');
    if (token) {
      config.headers['X-CSRF-Token'] = token;
    }
  }
  return config;
});

// ─── Response interceptor: unwrap body & normalize error ─────────
api.interceptors.response.use(
  (resp) => resp.data,                     // trả về thẳng body { ok, data, error }
  (err) => {
    const body = err.response && err.response.data;
    if (body && body.error) {
      const e = new Error(body.error.message || 'Request failed');
      e.code = body.error.code;
      e.details = body.error.details;
      e.status = err.response.status;
      return Promise.reject(e);
    }
    // Network / timeout / non-JSON errors
    const e = new Error(err.message || 'Network error');
    e.code = err.code || 'NETWORK_ERROR';
    e.status = err.response ? err.response.status : 0;
    return Promise.reject(e);
  }
);

// ─── Bootstrap CSRF ─────────────────────────────────────────────
// Gọi 1 lần khi FE khởi động hoặc trước form đầu tiên có POST.
// Backend trả về { ok, data: { csrfToken } } đồng thời set cookie sv_csrf.
export async function bootstrapCsrf() {
  try {
    const r = await api.get('/hardened/csrf-token');
    return r && r.data && r.data.csrfToken;
  } catch (_) {
    return null;
  }
}

// Re-export helper để tests / debug đọc cookie từ console.
export { getCookie };
