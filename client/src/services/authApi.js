// client/src/services/authApi.js
// Thin wrapper cho /api/auth/*.
// Mỗi hàm unwrap thêm 1 lớp `data.xxx` để caller dùng kết quả trực tiếp.

import { api } from './api.js';

export async function register({ username, email, password }) {
  const res = await api.post('/auth/register', { username, email, password });
  return res.data.user;
}

export async function login({ email, password }) {
  const res = await api.post('/auth/login', { email, password });
  return res.data.user;
}

export async function logout() {
  await api.post('/auth/logout');
}

export async function me() {
  const res = await api.get('/auth/me');
  return res.data.user; // có thể null nếu chưa login
}
