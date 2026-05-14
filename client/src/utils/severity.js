// client/src/utils/severity.js
// Palette dùng chung cho badge UI + màu chart.
// 4 mức tương ứng score 0–25 / 26–50 / 51–75 / 76–100.

export const SEVERITY_LEVELS = ['Low', 'Medium', 'High', 'Critical'];

// Tailwind class cho RiskBadge (Step 11)
export const SEVERITY_BADGE = {
  Low:      'bg-emerald-100 text-emerald-700 border-emerald-200',
  Medium:   'bg-amber-100   text-amber-700   border-amber-200',
  High:     'bg-red-100     text-red-700     border-red-200',
  Critical: 'bg-violet-100  text-violet-700  border-violet-200',
};

// Hex color cho Chart.js datasets (Step 12)
export const SEVERITY_HEX = {
  Low:      '#10b981',
  Medium:   '#f59e0b',
  High:     '#ef4444',
  Critical: '#7c3aed',
};

export function severityBadgeClass(severity) {
  return SEVERITY_BADGE[severity] || SEVERITY_BADGE.Low;
}

export function severityFromScore(score) {
  const s = Math.max(0, Math.min(100, Number(score) || 0));
  if (s >= 76) return 'Critical';
  if (s >= 51) return 'High';
  if (s >= 26) return 'Medium';
  return 'Low';
}
