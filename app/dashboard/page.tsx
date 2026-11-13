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
  // Passcode kept ONLY in active React memory (NEVER in localStorage or sessionStorage)
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Dashboard Telemetry Data
  const [isLoading, setIsLoading] = useState(false);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [aggregates, setAggregates] = useState<Aggregates | null>(null);

  // Requirement 3: Date Range and Decision Filter State
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [filterDecision, setFilterDecision] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [limit, setLimit] = useState<number>(200);

  // Requirement 4: Table Pagination & Row Expansion State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);

  // Requirement 5: Cryptographic Chain Integrity State
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<VerifyResult | null>(null);

  // Copy feedback for expanded hashes
  const [copiedHashId, setCopiedHashId] = useState<number | null>(null);

  // Fetch telemetry logs from server
  const fetchLogs = useCallback(
    async (codeToUse: string) => {
      if (!codeToUse) return;
      setIsLoading(true);
      setAuthError(null);

      try {
        const queryParams = new URLSearchParams();
        if (fromDate) queryParams.set('from', `${fromDate}T00:00:00.000Z`);
        if (toDate) queryParams.set('to', `${toDate}T23:59:59.999Z`);
        if (filterDecision !== 'all') queryParams.set('decision', filterDecision);
        if (filterAction !== 'all') queryParams.set('action', filterAction);
        if (filterLevel !== 'all') queryParams.set('level', filterLevel);
        queryParams.set('limit', String(limit));

        const res = await fetch(`/api/audit/logs?${queryParams.toString()}`, {
          method: 'GET',
          headers: {
            'x-dashboard-passcode': codeToUse,
          },
        });

        // Requirement 1: Clear error text for wrong passcode and 429
        if (res.status === 429) {
          setIsAuthenticated(false);
          setAuthError('Too many attempts, try again later');
          return;
        }

        if (res.status === 401) {
          setIsAuthenticated(false);
          setAuthError('Incorrect passcode. Please check your credentials and try again.');
          return;
        }

        const data: LogsApiResponse = await res.json();

        if (data.error) {
          setAuthError(data.error);
        } else {
          setRows(data.rows || []);
          setAggregates(data.aggregates || null);
          setIsAuthenticated(true);
          setCurrentPage(1); // Reset pagination on new fetch
        }
      } catch {
        setAuthError('Network error: Unable to reach audit telemetry API.');
      } finally {
        setIsLoading(false);
      }
    },
    [fromDate, toDate, filterDecision, filterAction, filterLevel, limit]
  );

  // Handle Passcode Submission
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

  // Requirement 3: Clear Filters Button Handler
  const handleClearFilters = () => {
    setFromDate('');
    setToDate('');
    setFilterDecision('all');
    setFilterAction('all');
    setFilterLevel('all');
    setLimit(200);
    setCurrentPage(1);
  };

  // Requirement 5: Verify Integrity with loading state and banner
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

  // Requirement 8: Safe CSV Cell Sanitizer (Formula Injection Protection)
  const sanitizeCsvCell = (value: unknown): string => {
    if (value === null || value === undefined) return '""';
    let str = String(value);

    // Neutralize spreadsheet formula injection by prefixing =, +, -, @, \t, \r with single quote
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }

    // Escape internal double quotes by doubling them
    str = str.replace(/"/g, '""');
    return `"${str}"`;
  };

  // CSV Export Download
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

  // Copy hash helper
  const handleCopyHash = async (id: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedHashId(id);
      setTimeout(() => setCopiedHashId(null), 2000);
    } catch {
      // Fallback
    }
  };

  // Requirement 4: Readable Risk Badges (Low, Medium, High, Critical with icons)
  const getRiskBadge = (score: number) => {
    if (score >= 85) {
      return {
        icon: '🔴',
        label: 'Critical',
        classes: 'bg-red-950/80 text-red-300 border-red-700',
      };
    }
    if (score >= 60) {
      return {
        icon: '🟠',
        label: 'High',
        classes: 'bg-orange-950/80 text-orange-300 border-orange-700',
      };
    }
    if (score >= 30) {
      return {
        icon: '🟡',
        label: 'Medium',
        classes: 'bg-yellow-950/80 text-yellow-300 border-yellow-700',
      };
    }
    return {
      icon: '🟢',
      label: 'Low',
      classes: 'bg-emerald-950/80 text-emerald-300 border-emerald-700',
    };
  };

  // Chart Data Helpers
  const categoryChartData = aggregates
    ? Object.entries(aggregates.categoriesCount).map(([category, count]) => ({
        category,
        count,
      }))
    : [];

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
        return '#38bdf8';
      case 'review':
        return '#facc15';
      case 'allow':
        return '#34d399';
      default:
        return '#94a3b8';
    }
  };

  // Requirement 4: Pagination Slice
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const paginatedRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // =========================================================================
  // 1. Passcode Screen (Centered Card with Show/Hide Toggle)
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-3xl shadow-lg shadow-emerald-950/50" aria-hidden="true">
              🛡️
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Security Dashboard Access
            </h1>
            <p className="text-xs text-slate-400">
              Enter your administrative passcode to decrypt and view live audit telemetry.
            </p>
          </div>

          {/* Error Notice */}
          {authError && (
            <div
              role="alert"
              className="p-3.5 bg-red-950/90 border border-red-700 text-red-200 text-xs rounded-xl flex items-center gap-2.5 shadow-md"
            >
              <span className="text-red-400 text-base font-bold" aria-hidden="true">⚠️</span>
              <span className="font-medium leading-relaxed">{authError}</span>
            </div>
          )}

          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="passcodeInput" className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Dashboard Passcode</span>
                <span className="text-[11px] text-slate-500 font-normal">Active memory only</span>
              </label>

              <div className="relative">
                <input
                  id="passcodeInput"
                  type={showPasscode ? 'text' : 'password'}
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter DASHBOARD_PASSCODE..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-4 pr-11 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 transition"
                  autoFocus
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  aria-label={showPasscode ? 'Hide passcode' : 'Show passcode'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-200 transition focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-lg text-sm"
                >
                  {showPasscode ? '🙈' : '👁️'}
                </button>
              </div>

              <p className="text-[11px] text-slate-500">
                Credentials are kept solely in volatile memory and never stored in localStorage.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || !passcode.trim()}
              aria-label="Unlock Security Dashboard"
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                'Unlock Dashboard'
              )}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-slate-800">
            <Link
              href="/"
              className="text-xs text-slate-400 hover:text-white transition focus-visible:ring-2 focus-visible:ring-emerald-400 rounded px-2 py-1"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. Main Dashboard (Authenticated View)
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-12">
      {/* Dashboard Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <span aria-hidden="true">🛡️</span> Security Telemetry & Audit Logs
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Cryptographic SHA-256 audit chain verification, threat telemetry, and risk distribution
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Requirement 5: Verify Integrity button with loading state */}
            <button
              type="button"
              onClick={handleVerifyChain}
              disabled={isVerifying}
              aria-label="Verify cryptographic hash chain integrity"
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center gap-1.5 transition focus-visible:ring-2 focus-visible:ring-emerald-400"
              title="Recomputes cryptographic SHA-256 chain across every stored audit row"
            >
              {isVerifying ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-emerald-400/40 border-t-emerald-400 rounded-full animate-spin" aria-hidden="true" />
                  <span>Verifying Chain...</span>
                </>
              ) : (
                <>
                  <span aria-hidden="true">🔗</span>
                  <span>Verify Integrity</span>
                </>
              )}
            </button>

            {/* CSV Export Button */}
            <button
              type="button"
              onClick={handleDownloadCsv}
              disabled={rows.length === 0}
              aria-label="Download audit logs as CSV"
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center gap-1.5 transition disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <span aria-hidden="true">📥</span>
              <span>Download CSV</span>
            </button>

            <Link
              href="/playground"
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition focus-visible:ring-2 focus-visible:ring-emerald-400 shadow-sm"
            >
              Playground →
            </Link>

            <button
              type="button"
              onClick={() => {
                setIsAuthenticated(false);
                setPasscode('');
                setRows([]);
                setAggregates(null);
                setVerifyStatus(null);
              }}
              aria-label="Lock dashboard session"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              Lock
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-4 py-6 space-y-6 flex-1">
        {/* Requirement 5: Cryptographic Verification Result Banner */}
        {verifyStatus && (
          <div
            role="status"
            aria-live="polite"
            className={`p-4 rounded-xl border text-sm flex items-center justify-between shadow-xl transition ${
              verifyStatus.valid
                ? 'bg-emerald-950/90 border-emerald-600 text-emerald-200'
                : 'bg-red-950/90 border-red-600 text-red-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl" aria-hidden="true">
                {verifyStatus.valid ? '✅' : '🚨'}
              </span>
              <div>
                <p className="font-extrabold text-sm sm:text-base">
                  {verifyStatus.valid
                    ? `Chain valid, ${verifyStatus.checked ?? 0} entries checked`
                    : `Tampering detected at entry ID ${verifyStatus.brokenAtId ?? 'unknown'}`}
                </p>
                <p className="text-xs opacity-90 mt-0.5">
                  {verifyStatus.valid
                    ? 'All hashes and cryptographic prev_hash links successfully verified against SHA-256 genesis specifications.'
                    : 'A hash mismatch or severed link was discovered. Audit records may have been modified or deleted.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setVerifyStatus(null)}
              aria-label="Dismiss integrity notification"
              className="text-xs font-mono px-2 py-1 rounded hover:bg-black/20 transition focus-visible:ring-2 focus-visible:ring-current"
            >
              ✕
            </button>
          </div>
        )}

        {/* Requirement 2: Summary Cards at the Top (Plain Labels, Mobile Stacked) */}
        <section
          aria-labelledby="metrics-heading"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <h2 id="metrics-heading" className="sr-only">Audit Telemetry Metrics</h2>

          {/* Card 1: Total scans */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Total scans</span>
              <span className="text-emerald-400 font-mono text-base" aria-hidden="true">📊</span>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-white">
              {aggregates ? aggregates.totalScans.toLocaleString() : '—'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Audit log records queried</div>
          </div>

          {/* Card 2: Blocked prompts */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Blocked prompts</span>
              <span className="text-rose-400 font-mono text-base" aria-hidden="true">🚫</span>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-rose-400">
              {aggregates ? aggregates.blockedCount.toLocaleString() : '—'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Violated guardrail policy</div>
          </div>

          {/* Card 3: Injection attempts */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Injection attempts</span>
              <span className="text-amber-400 font-mono text-base" aria-hidden="true">⚡</span>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-amber-400">
              {aggregates ? aggregates.injectionCount.toLocaleString() : '—'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Adversarial instruction overrides</div>
          </div>

          {/* Card 4: Average risk */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Average risk</span>
              <span className="text-emerald-400 font-mono text-base" aria-hidden="true">🛡️</span>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-emerald-400">
              {aggregates ? aggregates.averageRisk : '—'}
              <span className="text-slate-500 text-sm font-normal"> / 100</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Weighted prompt threat index</div>
          </div>
        </section>

        {/* Requirement 2 & 6: Charts in the Middle (Titles, Axis Labels, High Contrast, Text Alternative) */}
        <section
          aria-labelledby="charts-heading"
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          <h2 id="charts-heading" className="sr-only">Threat and Policy Analytics Charts</h2>

          {/* Chart 1: Detections by Category */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
            <div>
              <div className="pb-3 border-b border-slate-800 mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>🔍</span> Detections by Category
                  </h3>
                  <p className="text-xs text-slate-400">Frequency of sensitive entity types detected</p>
                </div>
              </div>

              <div className="min-h-[240px] pt-2">
                {categoryChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart
                      data={categoryChartData}
                      margin={{ top: 10, right: 10, left: -15, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis
                        dataKey="category"
                        stroke="#94a3b8"
                        fontSize={11}
                        angle={-25}
                        textAnchor="end"
                        interval={0}
                        label={{ value: 'Category', position: 'insideBottom', offset: -18, fill: '#64748b', fontSize: 10 }}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        fontSize={11}
                        label={{ value: 'Count', angle: -90, position: 'insideLeft', offset: 10, fill: '#64748b', fontSize: 10 }}
                      />
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
                  <div className="h-[240px] flex items-center justify-center text-xs text-slate-500">
                    No categorical findings recorded in current filter.
                  </div>
                )}
              </div>
            </div>

            {/* Requirement 6: Text alternative summary for screen readers & quick scanning */}
            <div className="text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-slate-800/80">
              <span className="font-semibold text-slate-300">Summary: </span>
              {categoryChartData.length > 0 ? (
                <span>
                  {categoryChartData.length} category {categoryChartData.length === 1 ? 'type' : 'types'} identified. Top: {categoryChartData.slice().sort((a, b) => b.count - a.count)[0].category} ({categoryChartData.slice().sort((a, b) => b.count - a.count)[0].count} events).
                </span>
              ) : (
                <span>No categorical entity detections recorded.</span>
              )}
            </div>
          </div>

          {/* Chart 2: Policy Decisions Breakdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
            <div>
              <div className="pb-3 border-b border-slate-800 mb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>⚖️</span> Policy Decisions
                </h3>
                <p className="text-xs text-slate-400">Resolution breakdown across scanned requests</p>
              </div>

              <div className="min-h-[240px] pt-2">
                {decisionChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart
                      data={decisionChartData}
                      margin={{ top: 10, right: 10, left: -15, bottom: 15 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis
                        dataKey="decision"
                        stroke="#94a3b8"
                        fontSize={11}
                        label={{ value: 'Decision', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 10 }}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        fontSize={11}
                        label={{ value: 'Count', angle: -90, position: 'insideLeft', offset: 10, fill: '#64748b', fontSize: 10 }}
                      />
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
                  <div className="h-[240px] flex items-center justify-center text-xs text-slate-500">
                    No decisions recorded yet.
                  </div>
                )}
              </div>
            </div>

            {/* Requirement 6: Text alternative summary */}
            <div className="text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-slate-800/80">
              <span className="font-semibold text-slate-300">Summary: </span>
              {decisionChartData.length > 0 ? (
                <span>
                  {decisionChartData.map((d) => `${d.decision}: ${d.count}`).join(', ')}.
                </span>
              ) : (
                <span>No policy decision events logged yet.</span>
              )}
            </div>
          </div>

          {/* Chart 3: Daily Average Risk Trend */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
            <div>
              <div className="pb-3 border-b border-slate-800 mb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>📈</span> Daily Average Risk
                </h3>
                <p className="text-xs text-slate-400">Chronological trend of threat severity</p>
              </div>

              <div className="min-h-[240px] pt-2">
                {aggregates && aggregates.riskOverTime.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart
                      data={aggregates.riskOverTime}
                      margin={{ top: 10, right: 10, left: -15, bottom: 15 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis
                        dataKey="date"
                        stroke="#94a3b8"
                        fontSize={11}
                        label={{ value: 'Date', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 10 }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        stroke="#94a3b8"
                        fontSize={11}
                        label={{ value: 'Score', angle: -90, position: 'insideLeft', offset: 10, fill: '#64748b', fontSize: 10 }}
                      />
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
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#f59e0b' }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[240px] flex items-center justify-center text-xs text-slate-500">
                    No chronological risk points to plot.
                  </div>
                )}
              </div>
            </div>

            {/* Requirement 6: Text alternative summary */}
            <div className="text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-slate-800/80">
              <span className="font-semibold text-slate-300">Summary: </span>
              {aggregates && aggregates.riskOverTime.length > 0 ? (
                <span>
                  Tracked across {aggregates.riskOverTime.length} {aggregates.riskOverTime.length === 1 ? 'day' : 'days'}. Average severity: {aggregates.averageRisk} / 100.
                </span>
              ) : (
                <span>No chronological trend points logged yet.</span>
              )}
            </div>
          </div>
        </section>

        {/* Requirement 2 & 4: Cryptographic Audit Trail Table & Filter Bar */}
        <section
          aria-labelledby="audit-trail-heading"
          className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4"
        >
          {/* Header & Results Count */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 id="audit-trail-heading" className="text-base font-bold text-white flex items-center gap-2">
                <span>🔐</span> Cryptographic Audit Trail
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Every prompt, decision, and override is permanently sealed in an immutable SHA-256 hash-chain.
              </p>
            </div>

            {/* Requirement 3: Result Count Display */}
            <div className="text-xs text-slate-300 font-medium">
              Showing <span className="text-emerald-400 font-bold">{rows.length}</span> {rows.length === 1 ? 'record' : 'records'}
              {aggregates && aggregates.totalScans > rows.length && (
                <span className="text-slate-500"> (filtered from {aggregates.totalScans.toLocaleString()} total)</span>
              )}
            </div>
          </div>

          {/* Requirement 3 & 7: Filter Bar (Date Range, Decision, Clear Filters, Mobile Wrapping) */}
          <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              {/* Date Range: From */}
              <div className="flex items-center gap-1.5">
                <label htmlFor="fromDateInput" className="text-slate-400 font-medium text-[11px]">
                  From:
                </label>
                <input
                  id="fromDateInput"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                />
              </div>

              {/* Date Range: To */}
              <div className="flex items-center gap-1.5">
                <label htmlFor="toDateInput" className="text-slate-400 font-medium text-[11px]">
                  To:
                </label>
                <input
                  id="toDateInput"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                />
              </div>

              {/* Decision Filter */}
              <div className="flex items-center gap-1.5">
                <label htmlFor="decisionSelect" className="text-slate-400 font-medium text-[11px]">
                  Decision:
                </label>
                <select
                  id="decisionSelect"
                  value={filterDecision}
                  onChange={(e) => setFilterDecision(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  <option value="all">All Decisions</option>
                  <option value="allow">Allow</option>
                  <option value="sanitize">Sanitize</option>
                  <option value="review">Review</option>
                  <option value="block">Block</option>
                </select>
              </div>

              {/* Action Filter */}
              <div className="flex items-center gap-1.5">
                <label htmlFor="actionSelect" className="text-slate-400 font-medium text-[11px]">
                  Action:
                </label>
                <select
                  id="actionSelect"
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  <option value="all">All Actions</option>
                  <option value="scan">Scan</option>
                  <option value="forward">Forward</option>
                  <option value="block">Block</option>
                  <option value="override">Override</option>
                </select>
              </div>

              {/* Risk Level Filter */}
              <div className="flex items-center gap-1.5">
                <label htmlFor="levelSelect" className="text-slate-400 font-medium text-[11px]">
                  Risk:
                </label>
                <select
                  id="levelSelect"
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  <option value="all">All Levels</option>
                  <option value="low">Low (0-29)</option>
                  <option value="medium">Medium (30-59)</option>
                  <option value="high">High (60-84)</option>
                  <option value="critical">Critical (85+)</option>
                </select>
              </div>
            </div>

            {/* Clear Filters Button */}
            <div className="flex items-center gap-2">
              {(fromDate || toDate || filterDecision !== 'all' || filterAction !== 'all' || filterLevel !== 'all') && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  aria-label="Clear active filters"
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  Clear Filters ✕
                </button>
              )}

              {/* Fetch limit */}
              <select
                aria-label="Limit results fetched from server"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                <option value={50}>Limit 50</option>
                <option value={100}>Limit 100</option>
                <option value={200}>Limit 200</option>
                <option value={500}>Limit 500</option>
              </select>
            </div>
          </div>

          {/* Requirement 4 & 7: Table Container with Sticky Header & Mobile Horizontal Scroll */}
          <div className="overflow-x-auto w-full border border-slate-800 rounded-xl max-h-[560px]">
            <table className="w-full text-left text-xs border-collapse">
              {/* Sticky Table Header */}
              <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold z-10 shadow-sm">
                <tr>
                  <th scope="col" className="py-2.5 px-3 w-8">
                    <span className="sr-only">Expand details</span>
                  </th>
                  <th scope="col" className="py-2.5 px-3 whitespace-nowrap">Time</th>
                  <th scope="col" className="py-2.5 px-3">Action</th>
                  <th scope="col" className="py-2.5 px-3">Decision</th>
                  <th scope="col" className="py-2.5 px-3">Risk Level</th>
                  <th scope="col" className="py-2.5 px-3">Categories</th>
                  <th scope="col" className="py-2.5 px-3">Sanitized Prompt</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {paginatedRows.length > 0 ? (
                  paginatedRows.map((row) => {
                    const isExpanded = expandedRowId === row.id;
                    const badge = getRiskBadge(row.risk_score);
                    const shortenedPrompt =
                      row.masked_prompt && row.masked_prompt.length > 70
                        ? row.masked_prompt.slice(0, 70) + '...'
                        : row.masked_prompt || '';

                    return (
                      <React.Fragment key={row.id}>
                        <tr
                          onClick={() => setExpandedRowId(isExpanded ? null : row.id)}
                          className={`hover:bg-slate-950/60 cursor-pointer transition ${
                            isExpanded ? 'bg-slate-950/70 border-l-2 border-emerald-500' : ''
                          }`}
                        >
                          {/* Expand chevron button */}
                          <td className="py-2.5 px-3 text-slate-500 text-center font-mono text-[11px]">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedRowId(isExpanded ? null : row.id);
                              }}
                              aria-expanded={isExpanded}
                              aria-label={`Toggle details for audit entry ${row.id}`}
                              className="p-1 hover:text-white rounded focus-visible:ring-1 focus-visible:ring-emerald-400"
                            >
                              {isExpanded ? '▼' : '▶'}
                            </button>
                          </td>

                          {/* Timestamp */}
                          <td className="py-2.5 px-3 font-mono text-slate-400 whitespace-nowrap text-[11px]">
                            {row.created_at ? new Date(row.created_at).toLocaleString() : '—'}
                          </td>

                          {/* Action */}
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium uppercase bg-slate-950 border border-slate-800">
                              {row.action}
                            </span>
                          </td>

                          {/* Decision */}
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                row.decision === 'block'
                                  ? 'bg-red-950 text-red-300 border-red-800'
                                  : row.decision === 'review'
                                  ? 'bg-yellow-950 text-yellow-300 border-yellow-800'
                                  : row.decision === 'sanitize'
                                  ? 'bg-blue-950 text-blue-300 border-blue-800'
                                  : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              }`}
                            >
                              {row.decision}
                            </span>
                          </td>

                          {/* Requirement 4: Readable Risk Badges */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.classes}`}
                            >
                              <span aria-hidden="true">{badge.icon}</span>
                              <span>{badge.label} ({row.risk_score})</span>
                            </span>
                          </td>

                          {/* Categories */}
                          <td className="py-2.5 px-3">
                            {Array.isArray(row.categories) && row.categories.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {row.categories.map((c, i) => (
                                  <span
                                    key={i}
                                    className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-950 text-slate-300 border border-slate-800"
                                  >
                                    {c}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>

                          {/* Shortened Prompt text with tooltip */}
                          <td
                            className="py-2.5 px-3 font-mono text-slate-300 text-xs max-w-xs truncate"
                            title={row.masked_prompt}
                          >
                            {shortenedPrompt}
                          </td>
                        </tr>

                        {/* Requirement 4: Expandable Row Details */}
                        {isExpanded && (
                          <tr className="bg-slate-950 border-b border-slate-800/80">
                            <td colSpan={7} className="p-4 space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                {/* Sanitized Prompt Box */}
                                <div className="space-y-1">
                                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                    Full Sanitized Prompt (Plain Text):
                                  </div>
                                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                                    {row.masked_prompt}
                                  </div>
                                </div>

                                {/* Cryptographic Hashes */}
                                <div className="space-y-2.5">
                                  <div>
                                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold uppercase">
                                      <span>Entry SHA-256 Hash:</span>
                                      <button
                                        type="button"
                                        onClick={() => handleCopyHash(row.id, row.hash)}
                                        aria-label="Copy entry SHA-256 hash"
                                        className="text-emerald-400 hover:text-emerald-300 font-mono text-[10px]"
                                      >
                                        {copiedHashId === row.id ? '✓ Copied' : 'Copy'}
                                      </button>
                                    </div>
                                    <code className="block p-2 bg-slate-900 border border-slate-800 rounded font-mono text-[11px] text-emerald-300 break-all select-all">
                                      {row.hash}
                                    </code>
                                  </div>

                                  <div>
                                    <div className="text-[11px] text-slate-400 font-semibold uppercase">
                                      Previous Row Link (prev_hash):
                                    </div>
                                    <code className="block p-2 bg-slate-900 border border-slate-800 rounded font-mono text-[11px] text-slate-400 break-all select-all">
                                      {row.prev_hash}
                                    </code>
                                  </div>

                                  <div className="flex items-center gap-4 text-[11px] text-slate-500 font-mono pt-1">
                                    <span>ID: #{row.id}</span>
                                    <span>User: {row.user_id || 'anonymous'}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  /* Requirement 4: Empty State with link to Playground */
                  <tr>
                    <td colSpan={7} className="py-12 px-4 text-center">
                      <div className="max-w-md mx-auto space-y-3">
                        <div className="text-3xl" aria-hidden="true">🛡️</div>
                        <h4 className="text-sm font-bold text-white">
                          No scans yet, try the Playground
                        </h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          No audit telemetry matches your current filter criteria. Run an inspection in the playground sandbox to generate cryptographic audit records.
                        </p>
                        <div className="pt-2">
                          <Link
                            href="/playground"
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-950 transition focus-visible:ring-2 focus-visible:ring-emerald-400"
                          >
                            <span>🚀</span>
                            <span>Open Playground</span>
                          </Link>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Requirement 4: Pagination Controls */}
          {rows.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  aria-label="Select rows per page"
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-slate-950 border border-slate-800 text-slate-200 rounded px-2 py-1 focus-visible:ring-1 focus-visible:ring-emerald-400"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400">
                  Page <strong className="text-white">{currentPage}</strong> of <strong className="text-white">{totalPages}</strong>
                </span>

                <div className="inline-flex gap-1 ml-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    aria-label="Go to previous page"
                    className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 transition focus-visible:ring-1 focus-visible:ring-emerald-400"
                  >
                    ← Prev
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    aria-label="Go to next page"
                    className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 transition focus-visible:ring-1 focus-visible:ring-emerald-400"
                  >
                    Next →
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>


    </div>
  );
}
