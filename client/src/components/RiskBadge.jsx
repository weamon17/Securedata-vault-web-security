// client/src/components/RiskBadge.jsx
// Badge hiển thị severity + risk_score — dark theme.

import { severityBadgeClass } from '../utils/severity.js';

// Map severity → dark-theme badge class (override light version trong severity.js)
const DARK_BADGE = {
  Low:      'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
  Medium:   'bg-amber-500/15   text-amber-400   border border-amber-500/25',
  High:     'bg-red-500/15     text-red-400     border border-red-500/25',
  Critical: 'bg-violet-500/15  text-violet-400  border border-violet-500/25',
};

// Chấm màu nhỏ
const DOT = {
  Low:      'bg-emerald-400',
  Medium:   'bg-amber-400',
  High:     'bg-red-400',
  Critical: 'bg-violet-400',
};

export function RiskBadge({ severity = 'Low', score, className = '' }) {
  const cls = DARK_BADGE[severity] || DARK_BADGE.Low;
  const dot = DOT[severity] || DOT.Low;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2 py-0.5 ${cls} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot} flex-shrink-0`} />
      {severity}
      {score !== undefined && score !== null && (
        <span className="opacity-60 font-normal">· {score}</span>
      )}
    </span>
  );
}
