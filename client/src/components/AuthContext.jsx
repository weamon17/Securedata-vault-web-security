// client/src/components/AuthContext.jsx
// Context provider quản lý trạng thái đăng nhập của FE.
//
// useAuth() trả về:
//   { user, loading, refresh, login, logout }
//
// - user      : null khi chưa login | { id, username, email, role } khi đã login
// - loading   : true trong lần fetch /auth/me đầu tiên (sau bootstrap CSRF)
// - refresh() : gọi lại /auth/me để đồng bộ trạng thái sau action lạ
// - login()   : nhận (email, password), call /auth/login, cập nhật user
// - logout()  : call /auth/logout, clear user state

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as authApi from '../services/authApi.js';
import { bootstrapCsrf } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await authApi.me();
      setUser(me); // có thể là null
    } catch (_) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 1. Gọi /hardened/csrf-token trước để set cookie sv_csrf
    //    → mọi POST sau đó sẽ tự đính header X-CSRF-Token (xem api.js).
    // 2. Sau đó gọi /auth/me để biết đã login hay chưa.
    bootstrapCsrf().finally(refresh);
  }, [refresh]);

  const login = useCallback(async (email, password) => {
    const u = await authApi.login({ email, password });
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (_) {
      /* ignore */
    }
    setUser(null);
  }, []);

  const value = { user, loading, refresh, login, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải được dùng bên trong <AuthProvider>');
  return ctx;
}
