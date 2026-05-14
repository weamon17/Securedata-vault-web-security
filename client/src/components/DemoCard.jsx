// client/src/components/DemoCard.jsx
// Card điều hướng từng demo trong Vulnerability Lab index.

import { Link } from 'react-router-dom';
import { Syringe, Code2, RefreshCw, Eye, Shield, ChevronRight } from 'lucide-react';

// Map slug → icon + màu accent
const ICON_MAP = {
  sqli:  { Icon: Syringe,   color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20',    glow: 'hover:border-red-500/40 hover:shadow-[0_0_20px_rgba(239,68,68,0.08)]' },
  xss:   { Icon: Code2,     color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', glow: 'hover:border-orange-500/40 hover:shadow-[0_0_20px_rgba(249,115,22,0.08)]' },
  csrf:  { Icon: RefreshCw, color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  glow: 'hover:border-amber-500/40 hover:shadow-[0_0_20px_rgba(245,158,11,0.08)]' },
  idor:  { Icon: Eye,       color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', glow: 'hover:border-yellow-500/40 hover:shadow-[0_0_20px_rgba(234,179,8,0.08)]' },
  csp:   { Icon: Shield,    color: 'text-pink-400',   bg: 'bg-pink-500/10',   border: 'border-pink-500/20',   glow: 'hover:border-pink-500/40 hover:shadow-[0_0_20px_rgba(236,72,153,0.08)]' },
};

// Lấy slug từ path cuối (vd: "/lab/sqli" → "sqli")
function getSlug(to) {
  return to.split('/').pop();
}

export function DemoCard({ to, title, owasp, summary, mitigations }) {
  const slug = getSlug(to);
  const { Icon, color, bg, border, glow } = ICON_MAP[slug] || { Icon: Shield, color: 'text-slate-400', bg: 'bg-slate-800', border: 'border-slate-700', glow: '' };

  return (
    <Link
      to={to}
      className={`card flex flex-col gap-3 transition-all duration-200 group ${border} ${glow}`}
    >
      {/* Icon + OWASP tag */}
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl ${bg} border ${border} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full">
          {owasp.split('—')[0].trim()}
        </span>
      </div>

      {/* Title + summary */}
      <div className="flex-1">
        <h3 className={`font-semibold text-white mb-1 group-hover:${color} transition-colors`}>{title}</h3>
        <p className="text-sm text-slate-400 leading-relaxed">{summary}</p>
      </div>

      {/* Mitigation footer */}
      {mitigations && (
        <div className="border-t border-slate-800 pt-2.5 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            <span className="text-emerald-500 font-medium">Phòng chống:</span>{' '}
            <span className="text-slate-400">{mitigations}</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all" />
        </div>
      )}
    </Link>
  );
}
