// client/src/pages/SecurityDashboard.jsx
// Dashboard bảo mật — admin only. Dark & Tech theme.

import { useEffect, useState } from 'react';
import { LayoutDashboard, ShieldOff, Lock, Zap, TrendingDown, BarChart3, Loader2 } from 'lucide-react';
import {
  getSummary, getByType, getRiskDistribution,
  getFailedLoginTrend, getTopEndpoints, getAuditLogs,
} from '../services/analyticsApi.js';
import { BarChart, DoughnutChart, LineChart } from '../components/SecurityChart.jsx';
import { AuditLogTable } from '../components/AuditLogTable.jsx';
import { SEVERITY_HEX, SEVERITY_LEVELS } from '../utils/severity.js';
import { formatNumber } from '../utils/formatters.js';

// Sinh 7 ngày gần nhất (YYYY-MM-DD)
function last7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
}

// Điền ngày thiếu với count=0
function fillTrend(trend = []) {
  const map = Object.fromEntries(trend.map((r) => [r.day, r.count]));
  return last7Days().map((day) => ({ day, count: map[day] ?? 0 }));
}

// Stat card với icon
function StatCard({ label, value, sub, icon: Icon, iconColor, cardBorder }) {
  return (
    <div className={`card border-slate-800 ${cardBorder || ''} flex items-center gap-4`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColor}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value ?? '—'}</div>
        <div className="text-sm text-slate-400">{label}</div>
        {sub && <div className="text-xs text-slate-600 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

export function SecurityDashboard() {
  const [summary, setSummary]           = useState(null);
  const [byType, setByType]             = useState([]);
  const [riskDist, setRiskDist]         = useState([]);
  const [loginTrend, setLoginTrend]     = useState([]);
  const [topEndpoints, setTopEndpoints] = useState([]);
  const [recentLogs, setRecentLogs]     = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [sum, types, dist, trend, endpoints, logs] = await Promise.all([
          getSummary(), getByType(), getRiskDistribution(),
          getFailedLoginTrend(7), getTopEndpoints(8), getAuditLogs({ limit: 10 }),
        ]);
        if (cancelled) return;
        setSummary(sum);
        setByType(types);
        setRiskDist(dist);
        setLoginTrend(fillTrend(trend));
        setTopEndpoints(endpoints);
        setRecentLogs(logs);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Chart: sự kiện theo loại
  const byTypeChart = {
    labels: byType.map((r) => r.eventType.replace(/_/g, ' ')),
    datasets: [{
      label: 'Events',
      data: byType.map((r) => r.count),
      backgroundColor: 'rgba(99,102,241,0.7)',
      borderColor: 'rgba(99,102,241,1)',
      borderWidth: 1,
      borderRadius: 6,
    }],
  };

  // Chart: risk distribution
  const riskMap = Object.fromEntries(riskDist.map((r) => [r.severity, r.count]));
  const riskDistChart = {
    labels: SEVERITY_LEVELS,
    datasets: [{
      data: SEVERITY_LEVELS.map((s) => riskMap[s] ?? 0),
      backgroundColor: SEVERITY_LEVELS.map((s) => SEVERITY_HEX[s] + 'CC'),
      borderColor: SEVERITY_LEVELS.map((s) => SEVERITY_HEX[s]),
      borderWidth: 2,
    }],
  };

  // Chart: failed login trend
  const trendChart = {
    labels: loginTrend.map((r) => r.day.slice(5)),
    datasets: [{
      label: 'Failed logins',
      data: loginTrend.map((r) => r.count),
      borderColor: '#ef4444',
      backgroundColor: 'rgba(239,68,68,0.08)',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: '#ef4444',
    }],
  };

  // Chart.js options cho dark background
  const darkGrid = {
    color: 'rgba(148,163,184,0.06)',
    drawBorder: false,
  };
  const darkTick = { color: '#64748b', font: { size: 11 } };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 gap-3 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin" />
        Đang tải dashboard...
      </div>
    );
  }

  if (error) {
    return <div className="card border-red-500/20 bg-red-500/10 text-red-400 text-sm py-4">{error}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
          <LayoutDashboard className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Security Dashboard</h1>
          <p className="text-xs text-slate-500">Tổng quan bảo mật hệ thống — admin only.</p>
        </div>
      </div>

      {/* 4 stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total events"
          value={formatNumber(summary?.total)}
          icon={BarChart3}
          iconColor="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400"
        />
        <StatCard
          label="Blocked requests"
          value={formatNumber(summary?.blocked)}
          icon={ShieldOff}
          iconColor="bg-red-500/10 border border-red-500/20 text-red-400"
          cardBorder="border-l-2 border-l-red-500/40"
        />
        <StatCard
          label="Encrypted records"
          value={formatNumber(summary?.encryptedRecords)}
          icon={Lock}
          iconColor="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
          cardBorder="border-l-2 border-l-emerald-500/40"
        />
        <StatCard
          label="Events (last hour)"
          value={formatNumber(summary?.lastHour)}
          sub="rolling window"
          icon={Zap}
          iconColor="bg-amber-500/10 border border-amber-500/20 text-amber-400"
        />
      </div>

      {/* Bar + Doughnut */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card border-slate-800 md:col-span-2">
          <h2 className="section-title">Events by Type</h2>
          <div className="h-64">
            <BarChart
              data={byTypeChart}
              options={{
                scales: {
                  x: { grid: darkGrid, ticks: { ...darkTick, font: { size: 10 } } },
                  y: { grid: darkGrid, ticks: darkTick },
                },
              }}
            />
          </div>
        </div>

        <div className="card border-slate-800">
          <h2 className="section-title">Risk Distribution</h2>
          <div className="h-64">
            <DoughnutChart
              data={riskDistChart}
              options={{ plugins: { legend: { labels: { color: '#94a3b8', boxWidth: 10 } } } }}
            />
          </div>
        </div>
      </div>

      {/* Trend + Top endpoints */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <h2 className="section-title mb-0">Failed Login Trend (7 days)</h2>
          </div>
          <div className="h-48">
            <LineChart
              data={trendChart}
              options={{
                scales: {
                  x: { grid: darkGrid, ticks: darkTick },
                  y: { grid: darkGrid, beginAtZero: true, ticks: { ...darkTick, stepSize: 1 } },
                },
              }}
            />
          </div>
        </div>

        <div className="card border-slate-800 overflow-x-auto">
          <h2 className="section-title">Top Endpoints by Total Risk</h2>
          <table className="table-dark">
            <thead>
              <tr>
                <th>Endpoint</th>
                <th className="text-right">Hits</th>
                <th className="text-right">Total risk</th>
              </tr>
            </thead>
            <tbody>
              {topEndpoints.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-slate-600">Chưa có dữ liệu.</td>
                </tr>
              ) : topEndpoints.map((ep, i) => (
                <tr key={i}>
                  <td className="font-mono text-xs">{ep.endpoint}</td>
                  <td className="text-right text-slate-400">{ep.hits}</td>
                  <td className="text-right">
                    <span className={`font-semibold ${ep.totalRisk >= 200 ? 'text-red-400' : ep.totalRisk >= 100 ? 'text-amber-400' : 'text-slate-400'}`}>
                      {ep.totalRisk}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent events */}
      <div className="card p-0 border-slate-800">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2">
          <h2 className="section-title mb-0">Recent Events</h2>
          <span className="text-xs text-slate-600">last 10</span>
        </div>
        <AuditLogTable logs={recentLogs} loading={false} payloadLength={60} />
      </div>
    </div>
  );
}
