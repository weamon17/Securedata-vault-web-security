// client/src/components/CompareSplit.jsx
// Layout 2 cột: Vulnerable (đỏ) vs Hardened (xanh lá) — dark theme.

import { TriangleAlert, ShieldCheck } from 'lucide-react';

export function CompareSplit({ vulnerable, hardened }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

      {/* Vulnerable — đỏ */}
      <section className="rounded-xl border border-red-900/50 bg-red-950/20 overflow-hidden">
        <header className="flex items-center gap-2 px-4 py-3 bg-red-950/40 border-b border-red-900/40">
          <TriangleAlert className="w-4 h-4 text-red-400" />
          <span className="text-xs font-bold text-red-400 uppercase tracking-widest">Vulnerable</span>
          <span className="ml-auto font-mono text-[10px] text-red-700/80">/api/vulnerable</span>
        </header>
        <div className="p-4">
          {vulnerable}
        </div>
      </section>

      {/* Hardened — xanh lá */}
      <section className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 overflow-hidden">
        <header className="flex items-center gap-2 px-4 py-3 bg-emerald-950/40 border-b border-emerald-900/40">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Hardened</span>
          <span className="ml-auto font-mono text-[10px] text-emerald-700/80">/api/hardened</span>
        </header>
        <div className="p-4">
          {hardened}
        </div>
      </section>

    </div>
  );
}
