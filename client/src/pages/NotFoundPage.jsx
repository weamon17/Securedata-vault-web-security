// client/src/pages/NotFoundPage.jsx
// Trang 404 — hiển thị khi URL không khớp bất kỳ route nào.

import { Link, useLocation } from 'react-router-dom';
import { ShieldOff, Home, ChevronLeft } from 'lucide-react';

export function NotFoundPage() {
  const { pathname } = useLocation();

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center select-none">
      {/* Icon */}
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center shadow-lg">
          <ShieldOff className="w-12 h-12 text-slate-500" />
        </div>
        {/* Glow */}
        <div className="absolute inset-0 rounded-2xl bg-indigo-500/5 blur-xl" />
      </div>

      {/* Error code */}
      <h1 className="text-8xl font-bold text-slate-800 leading-none mb-1 tracking-tight">
        404
      </h1>
      <p className="text-xl font-semibold text-slate-300 mb-2">
        Trang không tồn tại
      </p>
      <p className="text-sm text-slate-500 mb-8 font-mono max-w-sm break-all">
        <span className="text-slate-600">Path: </span>
        <span className="text-slate-400">{pathname}</span>
      </p>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => window.history.back()}
          className="btn-secondary"
        >
          <ChevronLeft className="w-4 h-4" />
          Quay lại
        </button>
        <Link to="/" className="btn-primary">
          <Home className="w-4 h-4" />
          Trang chủ
        </Link>
      </div>
    </div>
  );
}
