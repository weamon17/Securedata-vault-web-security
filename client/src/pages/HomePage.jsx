// client/src/pages/HomePage.jsx
// Landing trang chủ — hero + feature cards + demo credentials.

import { Link } from 'react-router-dom';
import { ShieldCheck, FlaskConical, Lock, Database, AlertTriangle, ChevronRight, Copy } from 'lucide-react';
import { useAuth } from '../components/AuthContext.jsx';
import { useState } from 'react';

// Danh sách 5 lỗ hổng demo
const DEMOS = [
  { label: 'SQL Injection',  color: 'text-red-400',    bg: 'bg-red-500/10',   border: 'border-red-500/20' },
  { label: 'XSS',            color: 'text-orange-400', bg: 'bg-orange-500/10',border: 'border-orange-500/20' },
  { label: 'CSRF',           color: 'text-amber-400',  bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  { label: 'IDOR',           color: 'text-yellow-400', bg: 'bg-yellow-500/10',border: 'border-yellow-500/20' },
  { label: 'CSP / Headers',  color: 'text-pink-400',   bg: 'bg-pink-500/10',  border: 'border-pink-500/20' },
];

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} className="text-slate-500 hover:text-indigo-400 transition-colors ml-1" title="Copy">
      <Copy className="w-3 h-3 inline" />
      {copied && <span className="text-[10px] text-indigo-400 ml-1">Copied!</span>}
    </button>
  );
}

export function HomePage() {
  const { user } = useAuth();

  return (
    <div className="max-w-5xl mx-auto">

      {/* ─── Hero ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-900 p-8 mb-8 shadow-glow-sm">
        {/* Decorative glow blobs */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-32 w-48 h-48 bg-violet-600/8 rounded-full blur-3xl pointer-events-none" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-8 h-8 text-indigo-400" />
            <span className="text-xs font-semibold uppercase tracking-widest text-indigo-400 border border-indigo-500/30 bg-indigo-500/10 px-2 py-1 rounded-full">
              OWASP Top 10 Lab
            </span>
          </div>

          <h1 className="text-4xl font-bold text-white mb-3 leading-tight">
            SecureData <span className="text-indigo-400">Vault</span>
          </h1>
          <p className="text-slate-400 mb-6 max-w-2xl leading-relaxed">
            Nền tảng học bảo mật web so sánh <span className="text-red-400 font-medium">Vulnerable</span> vs{' '}
            <span className="text-emerald-400 font-medium">Hardened</span> — SQL Injection, XSS, CSRF, IDOR, CSP.
            Mã hoá AES-256-GCM, Audit logging thời gian thực, Risk scoring engine.
          </p>

          {/* Demo vulnerability tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            {DEMOS.map((d) => (
              <span key={d.label} className={`text-xs font-medium px-2.5 py-1 rounded-full border ${d.color} ${d.bg} ${d.border}`}>
                {d.label}
              </span>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3">
            <Link to="/lab" className="btn-primary">
              <FlaskConical className="w-4 h-4" />
              Vulnerability Lab
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
            {user ? (
              <Link to="/vault" className="btn-secondary">
                <Lock className="w-4 h-4" />
                My Vault
              </Link>
            ) : (
              <Link to="/login" className="btn-secondary">
                <Lock className="w-4 h-4" />
                Login to Vault
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ─── Feature cards ────────────────────────────────── */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="card border-slate-800 hover:border-indigo-500/30 transition-colors">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-3">
            <FlaskConical className="w-5 h-5 text-indigo-400" />
          </div>
          <h2 className="font-semibold text-white mb-1.5">Vulnerability Lab</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            5 demo tấn công cạnh nhau: <code className="font-mono text-red-400 text-xs">/api/vulnerable</code>{' '}
            vs <code className="font-mono text-emerald-400 text-xs">/api/hardened</code>.
          </p>
        </div>

        <div className="card border-slate-800 hover:border-emerald-500/30 transition-colors">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
            <Lock className="w-5 h-5 text-emerald-400" />
          </div>
          <h2 className="font-semibold text-white mb-1.5">Encrypted Vault</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Bí mật lưu trữ với AES-256-GCM. Bcrypt cost 12 cho password. Ownership check chống IDOR.
          </p>
        </div>

        <div className="card border-slate-800 hover:border-violet-500/30 transition-colors">
          <div className="w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-3">
            <Database className="w-5 h-5 text-violet-400" />
          </div>
          <h2 className="font-semibold text-white mb-1.5">Audit & Analytics</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Mọi sự kiện bảo mật được log + tính risk score. Dashboard với Bar / Doughnut / Line chart.
          </p>
        </div>
      </div>

      {/* ─── Demo credentials ─────────────────────────────── */}
      <div className="card border-slate-800">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-slate-200">Tài khoản demo</span>
          <span className="text-xs text-amber-400 border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 rounded-full">
            local only
          </span>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-violet-400 mb-1.5">Admin</div>
            <div className="font-mono text-xs text-slate-300">
              admin@securevault.local <CopyButton text="admin@securevault.local" />
            </div>
            <div className="font-mono text-xs text-slate-400 mt-0.5">
              Admin123! <CopyButton text="Admin123!" />
            </div>
            <div className="text-[10px] text-slate-500 mt-1.5">Dashboard · Audit logs · Vault</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400 mb-1.5">User</div>
            <div className="font-mono text-xs text-slate-300">
              user@securevault.local <CopyButton text="user@securevault.local" />
            </div>
            <div className="font-mono text-xs text-slate-400 mt-0.5">
              User123! <CopyButton text="User123!" />
            </div>
            <div className="text-[10px] text-slate-500 mt-1.5">Vault only</div>
          </div>
        </div>
      </div>
    </div>
  );
}
