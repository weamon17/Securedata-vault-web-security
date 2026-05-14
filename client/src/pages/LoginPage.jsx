// client/src/pages/LoginPage.jsx
// Form đăng nhập dark theme. Redirect về state.from hoặc /vault sau khi thành công.

import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ShieldCheck, Mail, KeyRound, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../components/AuthContext.jsx';

function FieldError({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-red-400">
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
      {message}
    </div>
  );
}

function validate({ email, password }) {
  const errors = {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Email không hợp lệ.';
  }
  if (!password) {
    errors.password = 'Vui lòng nhập mật khẩu.';
  }
  return errors;
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm]               = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [submitting, setSubmitting]   = useState(false);

  const update = (k) => (e) => {
    setForm((prev) => ({ ...prev, [k]: e.target.value }));
    if (fieldErrors[k]) {
      setFieldErrors((prev) => { const { [k]: _, ...rest } = prev; return rest; });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);

    const errors = validate(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      await login(form.email, form.password);
      const dest = location.state?.from || '/vault';
      navigate(dest, { replace: true });
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-indigo-600/15 border border-indigo-500/30 items-center justify-center mb-4 shadow-glow-sm">
            <ShieldCheck className="w-7 h-7 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Đăng nhập</h1>
          <p className="text-slate-500 text-sm mt-1">SecureData Vault — Local Lab</p>
        </div>

        {/* Form card */}
        <div className="card-glow space-y-5">
          <form onSubmit={handleSubmit} noValidate className="space-y-4">

            {/* Email */}
            <div>
              <label className="field-label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  className={`input pl-9 ${fieldErrors.email ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/30' : ''}`}
                  placeholder="admin@securevault.local"
                  value={form.email}
                  onChange={update('email')}
                  autoComplete="email"
                />
              </div>
              <FieldError message={fieldErrors.email} />
            </div>

            {/* Password */}
            <div>
              <label className="field-label">Password</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  type="password"
                  className={`input pl-9 ${fieldErrors.password ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/30' : ''}`}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={update('password')}
                  autoComplete="current-password"
                />
              </div>
              <FieldError message={fieldErrors.password} />
            </div>

            {/* Server error */}
            {serverError && (
              <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {serverError}
              </div>
            )}

            <button type="submit" className="btn-primary w-full py-2.5" disabled={submitting}>
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang đăng nhập...
                </span>
              ) : (
                <><LogIn className="w-4 h-4" /> Đăng nhập</>
              )}
            </button>
          </form>

          <div className="border-t border-slate-800 pt-4 text-center text-sm text-slate-500">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
              Đăng ký
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
