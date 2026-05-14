// client/src/App.jsx
// Shell layout — full-width dark bg, nội dung căn giữa max-w-7xl.

import { Outlet, Link } from 'react-router-dom';
import { Navbar } from './components/Navbar.jsx';
import { ShieldCheck, FlaskConical, Lock, BarChart2 } from 'lucide-react';

function Footer() {
  return (
    <footer className="border-t border-slate-800/60 bg-slate-950/80 mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid sm:grid-cols-3 gap-6 mb-6">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-semibold text-slate-200">SecureData Vault</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Nền tảng học bảo mật web OWASP Top 10. So sánh Vulnerable vs Hardened
              trên từng loại tấn công.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2.5">
              Điều hướng
            </p>
            <ul className="space-y-1.5">
              <li>
                <Link to="/lab" className="text-xs text-slate-400 hover:text-indigo-400 transition-colors flex items-center gap-1.5">
                  <FlaskConical className="w-3 h-3" /> Vulnerability Lab
                </Link>
              </li>
              <li>
                <Link to="/vault" className="text-xs text-slate-400 hover:text-indigo-400 transition-colors flex items-center gap-1.5">
                  <Lock className="w-3 h-3" /> Encrypted Vault
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-xs text-slate-400 hover:text-indigo-400 transition-colors flex items-center gap-1.5">
                  <BarChart2 className="w-3 h-3" /> Security Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Tech stack */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2.5">
              Tech Stack
            </p>
            <div className="flex flex-wrap gap-1.5">
              {['React 18', 'Node.js', 'Express', 'SQLite', 'AES-256-GCM', 'JWT', 'Tailwind'].map((t) => (
                <span
                  key={t}
                  className="text-[10px] px-1.5 py-0.5 rounded border border-slate-700 text-slate-500 bg-slate-800/50"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-slate-800/60 pt-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="text-[11px] text-slate-600">
            © {new Date().getFullYear()} SecureData Vault &nbsp;·&nbsp; Academic Midterm Project &nbsp;·&nbsp;
            <a
              href="https://github.com/weamon17"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-indigo-400 transition-colors"
            >
              @weamon17
            </a>
          </p>
          <p className="text-[11px] text-slate-700">
            ⚠ Educational lab only — do not deploy in production
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-[#070d1a] bg-grid-pattern">
      <Navbar />
      <main className="flex-1 w-full px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  );
}
