// client/src/pages/AuditLogsPage.jsx
// Bảng audit logs với filter — admin only.

import { useEffect, useState } from 'react';
import { ScrollText, Filter, RotateCcw, Loader2 } from 'lucide-react';
import { getAuditLogs } from '../services/analyticsApi.js';
import { AuditLogTable } from '../components/AuditLogTable.jsx';

const EMPTY_FILTERS = { severity: '', type: '', mode: '', limit: 100 };

export function AuditLogsPage() {
  const [logs, setLogs]       = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const load = async (f = filters) => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      for (const k of Object.keys(f)) {
        if (f[k] !== '' && f[k] !== null) params[k] = f[k];
      }
      setLogs(await getAuditLogs(params));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(EMPTY_FILTERS); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const apply = (e) => { e.preventDefault(); load(filters); };
  const reset = () => { setFilters(EMPTY_FILTERS); load(EMPTY_FILTERS); };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
          <ScrollText className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Audit Logs</h1>
          <p className="text-xs text-slate-500">
            Mọi sự kiện bảo mật — risk engine tính điểm tự động theo Step 8.
          </p>
        </div>
        {loading && <Loader2 className="w-4 h-4 text-slate-500 animate-spin ml-auto" />}
      </div>

      {/* Filter bar */}
      <form onSubmit={apply} className="card border-slate-800 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <span className="section-title mb-0">Bộ lọc</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <select
            className="input"
            value={filters.severity}
            onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
          >
            <option value="">All severity</option>
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
            <option>Critical</option>
          </select>

          <select
            className="input"
            value={filters.mode}
            onChange={(e) => setFilters({ ...filters, mode: e.target.value })}
          >
            <option value="">All modes</option>
            <option value="vulnerable">vulnerable</option>
            <option value="hardened">hardened</option>
            <option value="neutral">neutral</option>
          </select>

          <input
            className="input"
            placeholder="Event type..."
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          />

          <input
            type="number"
            className="input"
            placeholder="Limit (1–500)"
            value={filters.limit}
            onChange={(e) => {
              const v = Math.min(500, Math.max(1, Number(e.target.value) || 100));
              setFilters({ ...filters, limit: v });
            }}
          />

          <button type="submit" className="btn-primary">
            <Filter className="w-3.5 h-3.5" /> Apply
          </button>
          <button type="button" className="btn-secondary" onClick={reset}>
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>
      </form>

      {error && (
        <div className="card border-red-500/20 bg-red-500/10 text-red-400 text-sm mb-4">{error}</div>
      )}

      {/* Count */}
      {!loading && (
        <div className="text-xs text-slate-500 mb-2 pl-1">{logs.length} records</div>
      )}

      {/* Table */}
      <div className="card p-0 border-slate-800">
        <AuditLogTable logs={logs} loading={loading} payloadLength={80} />
      </div>
    </div>
  );
}
