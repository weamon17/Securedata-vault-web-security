// client/src/pages/RegisterPage.jsx
// Form đăng ký — custom validation thay thế browser native tooltip.

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, User, Mail, KeyRound, AlertCircle, ShieldCheck } from 'lucide-react';
import * as authApi from '../services/authApi.js';
import { useAuth } from '../components/AuthContext.jsx';

// Validate từng field, trả về object { field: 'thông báo lỗi' }
function validate({ username, email, password }) {
  const errors = {};
  if (!username || username.length < 3) {
    errors.username = 'Username phải có ít nhất 3 ký tự.';
  } else if (username.length > 32) {
    errors.username = 'Username tối đa 32 ký tự.';
  } else if (!/^[A-Za-z0-9_.\-]+$/.test(username)) {
    errors.username = 'Chỉ được dùng chữ, số, dấu _ . -';
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Email không hợp lệ.';
  }
  if (!password || password.length < 8) {
    errors.password = `Mật khẩu phải có ít nhất 8 ký tự (hiện tại: ${password?.length ?? 0}).`;
  }
  return errors;
}

// Hiển thị 1 dòng lỗi bên dưới field
function FieldError({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-red-400">
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
      {message}
    </div>
  );
}

export function RegisterPage() {
  const { refresh } = useAuth();
  const navigate = useNavigate();

  const [form, setForm]             = useState({ username: '', email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [submitting, setSubmitting]   = useState(false);

  const update = (k) => (e) => {
    const newForm = { ...form, [k]: e.target.value };
    setForm(newForm);
    // Xoá lỗi của field đó ngay khi user gõ lại
    if (fieldErrors[k]) {
      const { [k]: _, ...rest } = fieldErrors;
      setFieldErrors(rest);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setServerError(null);

    // Validate client-side trước
    const errors = validate(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      await authApi.register(form);
      await refresh();
      navigate('/vault', { replace: true });
    } catch (err) {
      if (err.details && err.details.length) {
        // Backend trả lỗi theo từng field
        const mapped = {};
        for (const d of err.details) mapped[d.field] = d.message;
        setFieldErrors(mapped);
      } else {
        setServerError(err.message);
      }
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
          <h1 className="text-2xl font-bold text-white">Tạo tài khoản</h1>
          <p className="text-slate-500 text-sm mt-1">SecureData Vault — Local Lab</p>
        </div>

        {/* Form — noValidate tắt browser native tooltip */}
        <div className="card-glow">
          <form onSubmit={submit} noValidate className="space-y-4">

            {/* Username */}
            <div>
              <label className="field-label">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  className={`input pl-9 ${fieldErrors.username ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/30' : ''}`}
                  placeholder="3–32 ký tự, chữ và số"
                  value={form.username}
                  onChange={update('username')}
                  autoComplete="username"
                />
              </div>
              <FieldError message={fieldErrors.username} />
            </div>

            {/* Email */}
            <div>
              <label className="field-label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  type="email"
                  className={`input pl-9 ${fieldErrors.email ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/30' : ''}`}
                  placeholder="you@example.com"
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
                  placeholder="Tối thiểu 8 ký tự"
                  value={form.password}
                  onChange={update('password')}
                  autoComplete="new-password"
                />
              </div>
              <FieldError message={fieldErrors.password} />
              {/* Strength hint */}
              {form.password.length > 0 && !fieldErrors.password && (
                <div className="flex items-center gap-2 mt-1.5">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-0.5 flex-1 rounded-full transition-colors ${
                        i < Math.min(Math.floor(form.password.length / 3), 4)
                          ? form.password.length >= 12 ? 'bg-emerald-500'
                          : form.password.length >= 8  ? 'bg-amber-500'
                          : 'bg-red-500'
                          : 'bg-slate-700'
                      }`}
                    />
                  ))}
                  <span className="text-[10px] text-slate-500 whitespace-nowrap">
                    {form.password.length < 8  ? 'Quá ngắn' :
                     form.password.length < 12 ? 'Trung bình' : 'Mạnh'}
                  </span>
                </div>
              )}
            </div>

            {/* Server error */}
            {serverError && (
              <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{serverError}</span>
              </div>
            )}

            <button type="submit" className="btn-primary w-full py-2.5" disabled={submitting}>
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang tạo tài khoản...
                </span>
              ) : (
                <><UserPlus className="w-4 h-4" /> Tạo tài khoản</>
              )}
            </button>
          </form>

          <div className="border-t border-slate-800 mt-5 pt-4 text-center text-sm text-slate-500">
            Đã có tài khoản?{' '}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
              Đăng nhập
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
