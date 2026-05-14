// client/src/router.jsx
// Full routing với 2 guard:
//   - RequireAuth  : phải đã đăng nhập (Vault)
//   - RequireAdmin : phải role === 'admin' (Audit logs, Dashboard ở Step 12)

import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider, useAuth } from './components/AuthContext.jsx';
import { ToastProvider } from './components/Toast.jsx';

import { HomePage } from './pages/HomePage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';
import { VaultPage } from './pages/VaultPage.jsx';
import { VulnerabilityLab } from './pages/VulnerabilityLab.jsx';
import { SqlInjectionDemo } from './pages/SqlInjectionDemo.jsx';
import { XssDemo } from './pages/XssDemo.jsx';
import { CsrfDemo } from './pages/CsrfDemo.jsx';
import { IdorDemo } from './pages/IdorDemo.jsx';
import { CspDemo } from './pages/CspDemo.jsx';
import { AuditLogsPage } from './pages/AuditLogsPage.jsx';
import { SecurityDashboard } from './pages/SecurityDashboard.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';

// Spinner đơn giản trong khi AuthContext fetch /auth/me lần đầu.
function AuthGate({ allowAnonymous = false, allowAdminOnly = false, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center gap-2 justify-center py-12 text-sm text-slate-500">
        <span className="w-4 h-4 border-2 border-slate-700 border-t-indigo-500 rounded-full animate-spin" />
        Đang xác thực phiên...
      </div>
    );
  }
  if (!allowAnonymous && !user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (allowAdminOnly && (!user || user.role !== 'admin')) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function RequireAuth() {
  return (
    <AuthGate>
      <Outlet />
    </AuthGate>
  );
}

function RequireAdmin() {
  return (
    <AuthGate allowAdminOnly>
      <Outlet />
    </AuthGate>
  );
}

function Root() {
  return (
    <AuthProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AuthProvider>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },

      // Vault: phải login
      {
        element: <RequireAuth />,
        children: [
          { path: 'vault', element: <VaultPage /> },
        ],
      },

      // Lab: public (anyone)
      {
        path: 'lab',
        children: [
          { index: true, element: <VulnerabilityLab /> },
          { path: 'sqli', element: <SqlInjectionDemo /> },
          { path: 'xss', element: <XssDemo /> },
          { path: 'csrf', element: <CsrfDemo /> },
          { path: 'idor', element: <IdorDemo /> },
          { path: 'csp', element: <CspDemo /> },
        ],
      },

      // Admin only
      {
        element: <RequireAdmin />,
        children: [
          { path: 'audit', element: <AuditLogsPage /> },
          { path: 'dashboard', element: <SecurityDashboard /> },
        ],
      },

      // 404 fallback
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
