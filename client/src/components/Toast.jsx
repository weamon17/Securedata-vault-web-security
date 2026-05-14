// client/src/components/Toast.jsx
// Global toast notification system — context + hook + renderer.

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const ToastContext = createContext(null);

const CONFIG = {
  success: {
    Icon: CheckCircle2,
    icon: 'text-emerald-400',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/8',
    bar: 'bg-emerald-500',
  },
  error: {
    Icon: AlertCircle,
    icon: 'text-red-400',
    border: 'border-red-500/30',
    bg: 'bg-red-500/8',
    bar: 'bg-red-500',
  },
  warning: {
    Icon: AlertTriangle,
    icon: 'text-amber-400',
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/8',
    bar: 'bg-amber-500',
  },
  info: {
    Icon: Info,
    icon: 'text-indigo-400',
    border: 'border-indigo-500/30',
    bg: 'bg-indigo-500/8',
    bar: 'bg-indigo-500',
  },
};

const DURATION = 3500;

function ToastItem({ id, type, message, onDismiss }) {
  const c = CONFIG[type] || CONFIG.info;
  const { Icon } = c;

  useEffect(() => {
    const t = setTimeout(() => onDismiss(id), DURATION);
    return () => clearTimeout(t);
  }, [id, onDismiss]);

  return (
    <div
      className={`
        relative flex items-start gap-3 w-80 max-w-[calc(100vw-2rem)]
        rounded-xl border ${c.border} bg-slate-900 ${c.bg}
        px-4 py-3 shadow-xl overflow-hidden
        animate-toast-in
      `}
    >
      {/* Progress bar */}
      <div
        className={`absolute bottom-0 left-0 h-[2px] ${c.bar} opacity-40`}
        style={{ animation: `shrink ${DURATION}ms linear forwards` }}
      />

      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${c.icon}`} />
      <span className="text-sm text-slate-200 flex-1 leading-snug">{message}</span>
      <button
        onClick={() => onDismiss(id)}
        className="text-slate-600 hover:text-slate-300 transition-colors flex-shrink-0 -mr-1 -mt-0.5 p-1 rounded"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const add = useCallback((message, type = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev.slice(-4), { id, message, type }]);
  }, []);

  const toast = {
    success: (msg) => add(msg, 'success'),
    error:   (msg) => add(msg, 'error'),
    warning: (msg) => add(msg, 'warning'),
    info:    (msg) => add(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Inject keyframe for progress bar shrink */}
      <style>{`@keyframes shrink { from { width: 100% } to { width: 0% } }`}</style>

      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem {...t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast phải dùng bên trong ToastProvider');
  return ctx;
}
