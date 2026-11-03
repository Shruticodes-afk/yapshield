'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
  Cell,
} from 'recharts';

interface AuditRow {
  id: number;
  user_id: string | null;
  action: string;
  categories: string[];
  risk_score: number;
  masked_prompt: string;
  decision: string;
  prev_hash: string;
  hash: string;
  created_at: string;
}

interface Aggregates {
  totalScans: number;
  blockedCount: number;
  injectionCount: number;
  averageRisk: number;
  categoriesCount: Record<string, number>;
  decisionsCount: Record<string, number>;
  riskOverTime: Array<{ date: string; averageRisk: number; count: number }>;
}

interface LogsApiResponse {
  rows: AuditRow[];
  aggregates: Aggregates;
  error?: string;
}

interface VerifyResult {
  valid: boolean;
  checked?: number;
  brokenAtId?: number;
  error?: string;
}

export default function DashboardPage() {
  // Passcode kept ONLY in React state (never in localStorage/sessionStorage)
  const [passcode, setPasscode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Dashboard Data State
  const [isLoading, setIsLoading] = useState(false);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [aggregates, setAggregates] = useState<Aggregates | null>(null);

  // Filters
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterDecision, setFilterDecision] = useState<string>('all');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [limit, setLimit] = useState<number>(200);

  // Integrity Check State
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<VerifyResult | null>(null);

  // Fetch Logs from Server Route
  const fetchLogs = useCallback(
    async (codeToUse: string) => {
      if (!codeToUse) return;
      setIsLoading(true);
      setAuthError(null);

      try {
        const queryParams = new URLSearchParams();
        if (filterAction !== 'all') queryParams.set('action', filterAction);
        if (filterDecision !== 'all') queryParams.set('decision', filterDecision);
        if (filterLevel !== 'all') queryParams.set('level', filterLevel);
        queryParams.set('limit', String(limit));

        const res = await fetch(`/api/audit/logs?${queryParams.toString()}`, {
          method: 'GET',
          headers: {
            'x-dashboard-passcode': codeToUse,
          },
        });

        if (res.status === 401) {
          setIsAuthenticated(false);
          setAuthError('Invalid dashboard passcode. Access denied.');
          return;
        }

        const data: LogsApiResponse = await res.json();

        if (data.error) {
          setAuthError(data.error);
        } else {
          setRows(data.rows || []);
          setAggregates(data.aggregates || null);
          setIsAuthenticated(true);
        }
      } catch {
        setAuthError('Network error: Unable to fetch audit telemetry.');
      } finally {
        setIsLoading(false);
      }
    },
    [filterAction, filterDecision, filterLevel, limit]
  );

  // Handle Passcode Unlock Submission
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setAuthError('Please enter a passcode.');
      return;
    }
    await fetchLogs(passcode);
  };

  // Re-fetch when filters change if authenticated
  useEffect(() => {
    if (isAuthenticated && passcode) {
      fetchLogs(passcode);
    }
  }, [fetchLogs, isAuthenticated, passcode]);

  // Handle Verify Cryptographic Integrity
  const handleVerifyChain = async () => {
    if (!passcode) return;
    setIsVerifying(true);
    setVerifyStatus(null);

    try {
      const res = await fetch('/api/audit/verify', {
        method: 'GET',
        headers: {
          'x-dashboard-passcode': passcode,
        },
      });

      const data: VerifyResult = await res.json();
      setVerifyStatus(data);
    } catch {
      setVerifyStatus({
        valid: false,
        error: 'Network failure during integrity check.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Safe CSV Cell Sanitizer (Escaping and Formula Injection Prevention)
  const sanitizeCsvCell = (value: unknown): string => {
    if (value === null || value === undefined) return '""';
    let str = String(value);

    // Prefix cells starting with =, +, -, @, \t, \r with a single quote to prevent spreadsheet formula injection
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }

    // Escape internal double quotes by doubling them
    str = str.replace(/"/g, '""');
    return `"${str}"`;
  };

  // Download Filtered CSV
  const handleDownloadCsv = () => {
    if (!rows || rows.length === 0) return;

    const headers = [
      'ID',
      'Timestamp',
      'Action',
      'Decision',
      'Risk Score',
      'Categories',
      'Masked Prompt (Sanitized)',
      'Prev Hash',
      'Hash',
    ];

    const csvLines = [headers.map(sanitizeCsvCell).join(',')];

    for (const r of rows) {
      const cats = Array.isArray(r.categories) ? r.categories.join(';') : '';
      const line = [
        sanitizeCsvCell(r.id),
        sanitizeCsvCell(r.created_at),
        sanitizeCsvCell(r.action),
        sanitizeCsvCell(r.decision),
        sanitizeCsvCell(r.risk_score),
        sanitizeCsvCell(cats),
        sanitizeCsvCell(r.masked_prompt),
        sanitizeCsvCell(r.prev_hash),
        sanitizeCsvCell(r.hash),
      ].join(',');
      csvLines.push(line);
    }

    const csvContent = csvLines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `yapshield_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Helper for Category Detections Chart
  const categoryChartData = aggregates
    ? Object.entries(aggregates.categoriesCount).map(([category, count]) => ({
        category,
        count,
      }))
    : [];

  // Helper for Decisions Chart
  const decisionChartData = aggregates
    ? Object.entries(aggregates.decisionsCount).map(([decision, count]) => ({
        decision: decision.toUpperCase(),
        count,
      }))
    : [];

  const getDecisionBarColor = (dec: string) => {
    switch (dec.toLowerCase()) {
      case 'block':
        return '#f43f5e';
      case 'sanitize':
        return '#3b82f6';
      case 'review':
        return '#eab308';
      case 'allow':
        return '#10b981';
      default:
        return '#64748b';
    }
  };

  // Helper for Risk Level pill
  const getRiskColor = (score: number) => {
    if (score >= 85) return 'text-red-400 bg-red-950/80 border-red-800';
    if (score >= 60) return 'text-orange-400 bg-orange-950/80 border-orange-800';
    if (score >= 30) return 'text-yellow-400 bg-yellow-950/80 border-yellow-800';
    return 'text-emerald-400 bg-emerald-950/80 border-emerald-800';
  };

  // Render Passcode Gate if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-3xl">
              🛡️
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Security Dashboard Access
            </h1>
            <p className="text-xs text-slate-400">
              Enter your administrative passcode to decrypt and view live audit telemetry.
            </p>
          </div>

          {authError && (
            <div className="p-3 bg-red-950/80 border border-red-800 text-red-200 text-xs rounded-xl flex items-center gap-2">
              <span>⚠️</span>
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="passcodeInput" className="text-xs font-semibold text-slate-300">
                Dashboard Passcode
              </label>
              <input
                id="passcodeInput"
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter DASHBOARD_PASSCODE..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                autoFocus
              />
              <p className="text-[11px] text-slate-500">
                Credentials are kept solely in active memory and never written to storage.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || !passcode.trim()}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying Credentials...
                </>
              ) : (
                'Unlock Dashboard'
              )}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-slate-800">
            <Link href="/" className="text-xs text-slate-400 hover:text-white transition">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Dashboard Action Sub-header */}
      <div className="border-b border-slate-800/80 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Security Telemetry</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Cryptographic audit verification, threat telemetry, and risk distribution
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleVerifyChain}
              disabled={isVerifying}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center gap-1.5 transition"
              title="Recomputes cryptographic SHA-256 chain across every stored audit row"
            >
              {isVerifying ? (
                <>
                  <span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <span>🔗</span> Verify Integrity
                </>
              )}
            </button>

            <button
              onClick={handleDownloadCsv}
              disabled={rows.length === 0}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <span>📥</span> Download CSV
            </button>

            <Link
              href="/playground"
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition"
            >
              Playground →
            </Link>

            <button
              onClick={() => {
                setIsAuthenticated(false);
                setPasscode('');
                setRows([]);
                setAggregates(null);
                setVerifyStatus(null);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition"
            >
              Lock
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl w-full mx-auto px-4 py-8 space-y-8 flex-1">
        {/* Verification Status Toast / Banner */}
        {verifyStatus && (
          <div
            className={`p-4 rounded-xl border text-sm flex items-center justify-between shadow-lg ${
              verifyStatus.valid
                ? 'bg-emerald-950/80 border-emerald-800 text-emerald-200'
                : 'bg-red-950/80 border-red-800 text-red-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{verifyStatus.valid ? '✅' : '🚨'}</span>
              <div>
                <p className="font-bold">
                  {verifyStatus.valid
                    ? `Chain valid, ${verifyStatus.checked ?? 0} entries checked`
                    : `Tampering detected at entry ID ${verifyStatus.brokenAtId ?? 'unknown'}`}
                </p>
                <p className="text-xs opacity-80">
                  {verifyStatus.valid
                    ? 'All hashes and cryptographic prev_hash links successfully verified against SHA-256 genesis specifications.'
                    : 'A hash mismatch or broken chain link was discovered. Audit records may have been tampered with or deleted.'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setVerifyStatus(null)}
              className="text-xs font-mono opacity-60 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        )}

        {/* 1. Summary Metrics Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Total Scans</span>
              <span className="text-slate-600 font-mono text-base">📊</span>
            </div>
            <div className="mt-2 text-3xl font-extrabold text-white">
              {aggregates ? aggregates.totalScans : '—'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Audit log records queried</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Blocked Prompts</span>
              <span className="text-rose-500 font-mono text-base">🚫</span>
            </div>
            <div className="mt-2 text-3xl font-extrabold text-rose-400">
              {aggregates ? aggregates.blockedCount : '—'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Violated guardrail policy</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Injection Attempts</span>
              <span className="text-amber-500 font-mono text-base">⚡</span>
            </div>
            <div className="mt-2 text-3xl font-extrabold text-amber-400">
              {aggregates ? aggregates.injectionCount : '—'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Jailbreak & override vectors</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Average Risk Score</span>
              <span className="text-emerald-500 font-mono text-base">🛡️</span>
            </div>
            <div className="mt-2 text-3xl font-extrabold text-emerald-400">
              {aggregates ? aggregates.averageRisk : '—'}
              <span className="text-slate-500 text-sm font-normal"> / 100</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Weighted severity index</div>
          </div>
        </section>

        {/* 2. Charts Section (Recharts wrapped in ResponsiveContainer) */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart 1: Detections by Category */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col">
            <div className="pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-sm font-semibold text-white">Detections by Category</h3>
              <p className="text-xs text-slate-400">Frequency of sensitive entity types detected</p>
            </div>
            <div className="flex-1 min-h-[260px]">
              {categoryChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="category"
                      stroke="#94a3b8"
                      fontSize={11}
                      angle={-25}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  No categorical findings recorded in current filter.
                </div>
              )}
            </div>
          </div>

          {/* Chart 2: Policy Decisions */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col">
            <div className="pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-sm font-semibold text-white">Policy Decisions</h3>
              <p className="text-xs text-slate-400">Resolution breakdown across scanned requests</p>
            </div>
            <div className="flex-1 min-h-[260px]">
              {decisionChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={decisionChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="decision" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {decisionChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getDecisionBarColor(entry.decision)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  No decisions recorded yet.
                </div>
              )}
            </div>
          </div>

          {/* Chart 3: Risk Over Time */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col">
            <div className="pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-sm font-semibold text-white">Daily Average Risk</h3>
              <p className="text-xs text-slate-400">Chronological trend of threat severity</p>
            </div>
            <div className="flex-1 min-h-[260px]">
              {aggregates && aggregates.riskOverTime.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={aggregates.riskOverTime} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                    <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="averageRisk"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ r: 4, fill: '#f59e0b' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  No chronological risk points to plot.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 3. Filterable Logs Table */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-semibold text-white">Cryptographic Audit Trail</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Every prompt, decision, and override is recorded in an immutable hash-chained sequence.
              </p>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">Action: All</option>
                <option value="scan">Action: Scan</option>
                <option value="forward">Action: Forward</option>
                <option value="block">Action: Block</option>
                <option value="override">Action: Override</option>
              </select>

              <select
                value={filterDecision}
                onChange={(e) => setFilterDecision(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">Decision: All</option>
                <option value="allow">Decision: Allow</option>
                <option value="sanitize">Decision: Sanitize</option>
                <option value="review">Decision: Review</option>
                <option value="block">Decision: Block</option>
              </select>

              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">Risk: All</option>
                <option value="low">Risk: Low (0-29)</option>
                <option value="medium">Risk: Medium (30-59)</option>
                <option value="high">Risk: High (60-84)</option>
                <option value="critical">Risk: Critical (85+)</option>
              </select>

              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value={50}>Limit 50</option>
                <option value={100}>Limit 100</option>
                <option value={200}>Limit 200</option>
                <option value={500}>Limit 500</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium">
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Decision</th>
                  <th className="py-2.5 px-3">Risk</th>
                  <th className="py-2.5 px-3">Categories</th>
                  <th className="py-2.5 px-3">Sanitized Prompt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {rows.length > 0 ? (
                  rows.map((row) => {
                    const shortenedPrompt =
                      row.masked_prompt && row.masked_prompt.length > 80
                        ? row.masked_prompt.slice(0, 80) + '...'
                        : row.masked_prompt || '';

                    return (
                      <tr key={row.id} className="hover:bg-slate-950/40 transition">
                        <td className="py-3 px-3 font-mono text-slate-400 whitespace-nowrap">
                          {row.created_at
                            ? new Date(row.created_at).toLocaleString()
                            : '—'}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium uppercase bg-slate-950 border border-slate-800">
                            {row.action}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                              row.decision === 'block'
                                ? 'bg-red-950 text-red-400 border border-red-800'
                                : row.decision === 'review'
                                ? 'bg-yellow-950 text-yellow-400 border border-yellow-800'
                                : row.decision === 'sanitize'
                                ? 'bg-blue-950 text-blue-400 border border-blue-800'
                                : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            }`}
                          >
                            {row.decision}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] border ${getRiskColor(
                              row.risk_score
                            )}`}
                          >
                            {row.risk_score}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {Array.isArray(row.categories) && row.categories.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {row.categories.map((c, i) => (
                                <span
                                  key={i}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-950 text-slate-400 border border-slate-800"
                                >
                                  {c}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-400 text-xs max-w-xs truncate" title={row.masked_prompt}>
                          {shortenedPrompt}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      {isLoading ? 'Loading audit records...' : 'No audit entries match current filter criteria.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        YapShield Guardrail Gateway • Cryptographic SHA-256 Audit Chain Active
      </footer>
    </div>
  );
}
