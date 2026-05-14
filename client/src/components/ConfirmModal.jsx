// client/src/components/ConfirmModal.jsx
// Custom confirm dialog — thay thế window.confirm(). Đồng bộ dark theme.

import { useEffect } from 'react';
import { AlertTriangle, Trash2, X, ShieldAlert } from 'lucide-react';

const VARIANTS = {
  danger: {
    Icon: Trash2,
    iconWrap: 'bg-red-500/10 border-red-500/25 text-red-400',
    confirm: 'bg-red-600 hover:bg-red-500 border border-red-500 text-white',
  },
  warning: {
    Icon: AlertTriangle,
    iconWrap: 'bg-amber-500/10 border-amber-500/25 text-amber-400',
    confirm: 'bg-amber-600 hover:bg-amber-500 border border-amber-500 text-white',
  },
  info: {
    Icon: ShieldAlert,
    iconWrap: 'bg-indigo-500/10 border-indigo-500/25 text-indigo-400',
    confirm: 'bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 text-white',
  },
};

export function ConfirmModal({
  open,
  title       = 'Xác nhận',
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel  = 'Huỷ',
  variant      = 'danger',
  onConfirm,
  onCancel,
}) {
  // Đóng bằng Escape
  useEffect(() => {
    if (!open) return;
    const fn = (e) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [open, onCancel]);

  // Khoá scroll body khi modal mở
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const v = VARIANTS[variant] || VARIANTS.danger;
  const { Icon } = v;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
      />

      {/* Modal card */}
      <div className="relative z-10 w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 animate-scale-in">

        {/* Header row */}
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${v.iconWrap}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white text-base leading-snug">{title}</h3>
            {message && (
              <p className="text-sm text-slate-400 mt-1 leading-relaxed">{message}</p>
            )}
          </div>
          <button
            onClick={onCancel}
            className="text-slate-600 hover:text-slate-300 transition-colors p-1 rounded-lg hover:bg-slate-800 flex-shrink-0 -mr-1 -mt-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-6 justify-end">
          <button
            onClick={onCancel}
            className="btn-secondary px-4 py-2 text-sm"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all active:scale-95 ${v.confirm}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
