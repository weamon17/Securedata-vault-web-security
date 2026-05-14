// client/src/utils/formatters.js
// Helper định dạng dữ liệu cho UI.

// SQLite trả "YYYY-MM-DD HH:MM:SS" ở UTC. Convert sang local time.
export function formatDateTime(value) {
  if (!value) return '—';
  // Nếu đã có ký tự T hoặc Z thì coi như ISO chuẩn rồi.
  const iso = /[TZ]/.test(value) ? value : value.replace(' ', 'T') + 'Z';
  try {
    return new Date(iso).toLocaleString();
  } catch (_) {
    return value;
  }
}

// Cắt chuỗi dài cho cell trong table.
export function truncate(s, n = 80) {
  if (s === null || s === undefined) return '';
  const str = String(s);
  return str.length <= n ? str : str.slice(0, n) + '…';
}

// "LOGIN_FAILED" → "Login Failed"
export function humanizeEventType(t) {
  if (!t) return '';
  return String(t)
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Format số có dấu phân cách hàng nghìn.
export function formatNumber(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '0';
  return Number(n).toLocaleString();
}
