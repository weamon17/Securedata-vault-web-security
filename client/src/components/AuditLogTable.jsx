// client/src/components/AuditLogTable.jsx
// Bảng audit log tái sử dụng — dark theme.

import { RiskBadge } from './RiskBadge.jsx';
import { formatDateTime, humanizeEventType, truncate } from '../utils/formatters.js';
import { Loader2 } from 'lucide-react';

export function AuditLogTable({ logs = [], loading = false, payloadLength = 80 }) {
  return (
    <div className="overflow-x-auto">
      <table className="table-dark">
        <thead>
          <tr>
            <th>Time</th>
            <th>Event</th>
            <th>Severity</th>
            <th>Endpoint</th>
            <th>Mode</th>
            <th>Status</th>
            <th>Payload</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={7} className="py-10 text-center text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                Loading...
              </td>
            </tr>
          ) : logs.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-10 text-center text-slate-500">
                Chưa có log nào.
              </td>
            </tr>
          ) : (
            logs.map((l) => (
              <tr key={l.id}>
                <td className="text-xs text-slate-500 whitespace-nowrap">
                  {formatDateTime(l.created_at)}
                </td>
                <td className="font-medium text-slate-200 whitespace-nowrap">
                  {humanizeEventType(l.event_type)}
                </td>
                <td>
                  <RiskBadge severity={l.severity} score={l.risk_score} />
                </td>
                <td className="font-mono text-xs text-slate-400">
                  <span className="text-slate-600">{l.http_method}</span> {l.endpoint}
                </td>
                <td className="text-xs">
                  <span className={
                    l.mode === 'vulnerable' ? 'text-red-400' :
                    l.mode === 'hardened'   ? 'text-emerald-400' :
                    'text-slate-500'
                  }>
                    {l.mode}
                  </span>
                </td>
                <td className="text-xs">
                  <span className={
                    l.status === 'blocked'  ? 'text-red-400' :
                    l.status === 'allowed'  ? 'text-emerald-400' :
                    'text-slate-400'
                  }>
                    {l.status}
                  </span>
                </td>
                <td className="text-xs text-slate-500 max-w-[200px] truncate" title={l.payload_summary}>
                  {truncate(l.payload_summary, payloadLength)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
