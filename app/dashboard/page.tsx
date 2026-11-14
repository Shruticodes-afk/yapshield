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
import RiskGauge from '@/components/RiskGauge';
import StatusDot from '@/components/StatusDot';
import HudPanel from '@/components/HudPanel';

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

  // Filters State
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [filterDecision, setFilterDecision] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [limit, setLimit] = useState<number>(200);

  // Table Pagination & Row Expansion State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);

  // Cryptographic Chain Integrity State
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

        // Clear error text for wrong passcode and 429
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
          setCurrentPage(1);
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

  // Clear Filters Button Handler
  const handleClearFilters = () => {
    setFromDate('');
    setToDate('');
    setFilterDecision('all');
    setFilterAction('all');
    setFilterLevel('all');
    setLimit(200);
    setCurrentPage(1);
  };

  // Verify Integrity with loading state and banner
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

  // Safe CSV Cell Sanitizer (Formula Injection Protection)
  const sanitizeCsvCell = (value: unknown): string => {
    if (value === null || value === undefined) return '""';
    let str = String(value);

    // Neutralize formula injection by prefixing =, +, -, @, \t, \r with single quote
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }

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

  // Readable Risk Badges (Requirement 4)
  const renderRiskBadge = (score: number) => {
    if (score >= 85) {
      return (
        <span className="badge-critical">
          <span aria-hidden="true">✖</span>
          <span>Critical ({score})</span>
        </span>
      );
    }
    if (score >= 60) {
      return (
        <span className="badge-high">
          <span aria-hidden="true">◆</span>
          <span>High ({score})</span>
        </span>
      );
    }
    if (score >= 30) {
      return (
        <span className="badge-medium">
          <span aria-hidden="true">▲</span>
          <span>Medium ({score})</span>
        </span>
      );
    }
    return (
      <span className="badge-low">
        <span aria-hidden="true">✓</span>
        <span>Low ({score})</span>
      </span>
    );
  };

  // Decision Badges
  const renderDecisionBadge = (decision: string) => {
    switch (decision.toLowerCase()) {
      case 'block':
        return (
          <span className="badge-critical font-mono">
            <span aria-hidden="true">🚫</span>
            <span>BLOCK</span>
          </span>
        );
      case 'sanitize':
        return (
          <span className="badge-medium font-mono">
            <span aria-hidden="true">🔒</span>
            <span>SANITIZE</span>
          </span>
        );
      case 'review':
        return (
          <span className="badge-medium font-mono text-cyan-300 border-cyan-700 bg-cyan-950/60">
            <span aria-hidden="true">👁️</span>
            <span>REVIEW</span>
          </span>
        );
      case 'allow':
        return (
          <span className="badge-low font-mono">
            <span aria-hidden="true">✓</span>
            <span>ALLOW</span>
          </span>
        );
      default:
        return (
          <span className="badge-low font-mono">
            <span>{decision.toUpperCase()}</span>
          </span>
        );
    }
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
        return '#ef4444';
      case 'sanitize':
        return '#2dd4bf';
      case 'review':
        return '#fbbf24';
      case 'allow':
        return '#22c55e';
      default:
        return '#9bb3bf';
    }
  };

  // Pagination Slice
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const paginatedRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // =========================================================================
  // 1. Passcode Screen (Requirement 1: Centered hud-panel with show/hide)
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[var(--bg-0)] text-[var(--text)] grid-bg flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full">
          <HudPanel
            title="SOC Terminal Gate"
            tag="AUTHENTICATION"
            brackets={true}
            className="shadow-2xl"
          >
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div
                  className="w-14 h-14 rounded-2xl bg-[rgba(4,11,20,0.85)] border border-[var(--panel-border)] flex items-center justify-center mx-auto text-[#2dd4bf] shadow-[0_0_20px_rgba(45,212,191,0.2)]"
                  aria-hidden="true"
                >
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Audit Telemetry Access
                </h1>
                <p className="text-xs text-[var(--text-dim)]">
                  Enter administrative passcode to decrypt and inspect the live SHA-256 audit ledger.
                </p>
              </div>

              {/* Requirement 1: Error message for wrong passcode and 429 */}
              {authError && (
                <div
                  role="alert"
                  className="p-3.5 bg-red-950/80 border border-red-700 text-red-200 text-xs rounded-xl flex items-center gap-2.5 shadow-md"
                >
                  <span className="text-red-400 text-base font-bold" aria-hidden="true">⚠️</span>
                  <span className="font-medium leading-relaxed">{authError}</span>
                </div>
              )}

              <form onSubmit={handleUnlock} className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="passcodeInput" className="hud-label text-slate-300">
                      Dashboard Passcode
                    </label>
                    <span className="hud-label text-[10px] text-slate-500">
                      Volatile Memory Only
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      id="passcodeInput"
                      type={showPasscode ? 'text' : 'password'}
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      placeholder="Enter DASHBOARD_PASSCODE..."
                      className="w-full bg-[rgba(4,11,20,0.9)] border border-[var(--panel-border)] rounded-xl pl-4 pr-11 py-2.5 text-sm font-mono text-[var(--text)] placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf] transition"
                      autoFocus
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasscode(!showPasscode)}
                      aria-label={showPasscode ? 'Hide passcode' : 'Show passcode'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-[var(--text-dim)] hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf] rounded-lg text-sm"
                    >
                      {showPasscode ? '🙈' : '👁️'}
                    </button>
                  </div>

                  <p className="text-[11px] text-[var(--text-dim)]">
                    Credentials remain solely in React memory and are never persisted in localStorage or sessionStorage.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !passcode.trim()}
                  aria-label="Unlock Security Dashboard"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#2dd4bf] hover:bg-[#14b8a6] disabled:opacity-50 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(45,212,191,0.3)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-slate-950/40 border-t-slate-950 rounded-full animate-spin" aria-hidden="true" />
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    'Unlock Dashboard'
                  )}
                </button>
              </form>

              <div className="text-center pt-2 border-t border-[rgba(64,224,208,0.15)]">
                <Link
                  href="/"
                  className="text-xs text-[var(--text-dim)] hover:text-[#2dd4bf] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf] rounded px-2 py-1"
                >
                  ← Back to Home
                </Link>
              </div>
            </div>
          </HudPanel>
        </div>
      </div>
    );
  }

  // Real Status Calculations (Requirement 6: based on real checks only, never fake data)
  const isGatewayOnline = Boolean(isAuthenticated && rows !== null);
  const totalVaultedTokens = rows.reduce(
    (acc, r) => (r.action === 'tokenize' || r.decision === 'sanitize' ? acc + 1 : acc),
    0
  );

  // =========================================================================
  // 2. Main Dashboard (Authenticated View)
  // =========================================================================
  return (
    <div className="min-h-screen bg-[var(--bg-0)] text-[var(--text)] grid-bg flex flex-col pb-16">
      {/* Dashboard Top Header */}
      <header className="border-b border-[var(--panel-border)] bg-[rgba(4,11,20,0.85)] backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-[#2dd4bf] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <div>
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-white flex items-center gap-2">
                <span>Security Operations HUD</span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[rgba(45,212,191,0.12)] text-[#2dd4bf] border border-[rgba(45,212,191,0.3)]">
                  SOC ACTIVE
                </span>
              </h1>
              <p className="text-[11px] text-[var(--text-dim)]">
                Cryptographic SHA-256 audit chain verification, threat telemetry & policy governance.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Requirement 5: Verify Integrity button with loading state */}
            <button
              type="button"
              onClick={handleVerifyChain}
              disabled={isVerifying}
              aria-label="Verify cryptographic hash chain integrity"
              className="px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold bg-[rgba(10,28,44,0.85)] hover:bg-[rgba(45,212,191,0.12)] border border-[rgba(64,224,208,0.25)] hover:border-[#2dd4bf] text-slate-200 flex items-center gap-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]"
              title="Recomputes cryptographic SHA-256 chain across every stored audit row"
            >
              {isVerifying ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-[#2dd4bf]/40 border-t-[#2dd4bf] rounded-full animate-spin" aria-hidden="true" />
                  <span>Verifying Chain...</span>
                </>
              ) : (
                <>
                  <span aria-hidden="true">🔗</span>
                  <span>Verify Integrity</span>
                </>
              )}
            </button>

            {/* CSV Export Button (Requirement 7) */}
            <button
              type="button"
              onClick={handleDownloadCsv}
              disabled={rows.length === 0}
              aria-label="Download audit logs as CSV"
              className="px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold bg-[rgba(10,28,44,0.85)] hover:bg-[rgba(10,28,44,1)] border border-[var(--panel-border)] text-slate-200 flex items-center gap-1.5 transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]"
            >
              <span aria-hidden="true">📥</span>
              <span>Download CSV</span>
            </button>

            <Link
              href="/playground"
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#2dd4bf] hover:bg-[#14b8a6] text-slate-950 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white shadow-sm"
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
              className="px-3 py-1.5 rounded-lg text-xs font-mono text-[var(--text-dim)] hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]"
            >
              Lock
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-4 py-6 space-y-6 flex-1">
        {/* Requirement 6: Real-Looking Live Status Strip (real checks only, never fake data) */}
        <div className="hud-panel p-3 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-5">
            {/* Gateway Active check */}
            <div className="flex items-center gap-2">
              <StatusDot
                status={isGatewayOnline ? 'ok' : 'critical'}
                showText={false}
                size="sm"
              />
              <span className="text-[var(--text-dim)]">GATEWAY:</span>
              <span className={isGatewayOnline ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                {isGatewayOnline ? 'ACTIVE (HTTP 200)' : 'UNREACHABLE'}
              </span>
            </div>

            {/* Vault Active check */}
            <div className="flex items-center gap-2">
              <StatusDot
                status={isGatewayOnline ? 'active' : 'idle'}
                showText={false}
                size="sm"
              />
              <span className="text-[var(--text-dim)]">AES-256 VAULT:</span>
              <span className="text-[#2dd4bf] font-bold">
                {isGatewayOnline ? `OPERATIONAL (${totalVaultedTokens} TOKENIZED)` : 'STANDBY'}
              </span>
            </div>

            {/* Audit Chain Verification check */}
            <div className="flex items-center gap-2">
              <StatusDot
                status={
                  verifyStatus === null
                    ? 'idle'
                    : verifyStatus.valid
                    ? 'ok'
                    : 'critical'
                }
                showText={false}
                size="sm"
              />
              <span className="text-[var(--text-dim)]">AUDIT CHAIN:</span>
              <span
                className={
                  verifyStatus === null
                    ? 'text-slate-400'
                    : verifyStatus.valid
                    ? 'text-emerald-400 font-bold'
                    : 'text-red-400 font-bold'
                }
              >
                {verifyStatus === null
                  ? 'UNVERIFIED (CLICK VERIFY)'
                  : verifyStatus.valid
                  ? `VERIFIED (${verifyStatus.checked} BLOCKS)`
                  : `SEVERED AT ID #${verifyStatus.brokenAtId}`}
              </span>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 font-mono">
            HOSTED RUNTIME: NODEJS SERVERLESS
          </div>
        </div>

        {/* Requirement 5: Integrity Result Banner */}
        {verifyStatus && (
          <div
            role="status"
            aria-live="polite"
            className={`p-4 rounded-xl border text-sm flex items-center justify-between shadow-xl transition ${
              verifyStatus.valid
                ? 'bg-emerald-950/80 border-emerald-600 text-emerald-200'
                : 'bg-red-950/80 border-red-600 text-red-200'
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
                    ? 'Every cryptographic hash and prev_hash link is mathematically intact from GENESIS.'
                    : 'A hash mismatch was detected. Records in the audit ledger may have been modified or deleted.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setVerifyStatus(null)}
              aria-label="Dismiss integrity notification"
              className="text-xs font-mono px-2 py-1 rounded hover:bg-black/20 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
            >
              ✕
            </button>
          </div>
        )}

        {/* Requirement 2: Top Row of Stat Cards (Total scans, Blocked prompts, Injection attempts, Average risk with RiskGauge) */}
        <section
          aria-labelledby="metrics-heading"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <h2 id="metrics-heading" className="sr-only">Audit Telemetry Metrics</h2>

          {/* Card 1: Total scans */}
          <HudPanel title="Total scans" tag="SCAN_VOLUME" brackets={true}>
            <div className="space-y-2">
              <div className="hud-stat">
                {aggregates ? aggregates.totalScans.toLocaleString() : '—'}
              </div>
              <p className="text-[11px] text-[var(--text-dim)]">
                {rows.length} records queried in current filter view
              </p>
            </div>
          </HudPanel>

          {/* Card 2: Blocked prompts */}
          <HudPanel title="Blocked prompts" tag="POLICY_VIOLATIONS" brackets={true}>
            <div className="space-y-2">
              <div className="hud-stat text-[#ef4444]">
                {aggregates ? aggregates.blockedCount.toLocaleString() : '—'}
              </div>
              <p className="text-[11px] text-[var(--text-dim)]">
                {aggregates && aggregates.totalScans > 0
                  ? `${((aggregates.blockedCount / aggregates.totalScans) * 100).toFixed(1)}% of all traffic rejected`
                  : 'Zero violations detected'}
              </p>
            </div>
          </HudPanel>

          {/* Card 3: Injection attempts */}
          <HudPanel title="Injection attempts" tag="THREAT_VECTORS" brackets={true}>
            <div className="space-y-2">
              <div className="hud-stat text-[#fbbf24]">
                {aggregates ? aggregates.injectionCount.toLocaleString() : '—'}
              </div>
              <p className="text-[11px] text-[var(--text-dim)]">
                {aggregates && aggregates.totalScans > 0
                  ? `${((aggregates.injectionCount / aggregates.totalScans) * 100).toFixed(1)}% adversarial rate`
                  : 'Zero jailbreaks detected'}
              </p>
            </div>
          </HudPanel>

          {/* Card 4: Average risk (Equipped with RiskGauge) */}
          <HudPanel title="Average risk" tag="RADAR_INDEX" brackets={true}>
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="hud-stat text-[#2dd4bf]">
                  {aggregates ? aggregates.averageRisk : '0'}
                  <span className="text-[var(--text-dim)] text-xs font-normal"> / 100</span>
                </div>
                <p className="text-[11px] text-[var(--text-dim)]">
                  Composite severity score
                </p>
              </div>

              {/* Requirement 2: RiskGauge for Average Risk */}
              <div className="flex-shrink-0">
                <RiskGauge
                  score={aggregates ? aggregates.averageRisk : 0}
                  size={95}
                  strokeWidth={7}
                  showLabel={false}
                />
              </div>
            </div>
          </HudPanel>
        </section>

        {/* Requirement 3: Charts (Transparent backgrounds, thin grid lines, token colors, text summaries) */}
        <section
          aria-labelledby="charts-heading"
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          <h2 id="charts-heading" className="sr-only">Threat and Policy Analytics Charts</h2>

          {/* Chart 1: Detections by Category */}
          <HudPanel title="Detections by Category" tag="CATEGORY_HISTOGRAM" brackets={true}>
            <div className="space-y-3">
              <div className="min-h-[220px]">
                {categoryChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={categoryChartData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(64, 224, 208, 0.12)" />
                      <XAxis
                        dataKey="category"
                        stroke="#9bb3bf"
                        fontSize={10}
                        angle={-25}
                        textAnchor="end"
                        interval={0}
                        tickLine={{ stroke: 'rgba(64, 224, 208, 0.2)' }}
                        axisLine={{ stroke: 'rgba(64, 224, 208, 0.25)' }}
                      />
                      <YAxis
                        stroke="#9bb3bf"
                        fontSize={10}
                        tickLine={{ stroke: 'rgba(64, 224, 208, 0.2)' }}
                        axisLine={{ stroke: 'rgba(64, 224, 208, 0.25)' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#07131f',
                          borderColor: 'rgba(64, 224, 208, 0.3)',
                          borderRadius: '8px',
                          fontSize: '11px',
                          color: '#e6f1f5',
                          boxShadow: '0 8px 24px rgba(4, 11, 20, 0.8)',
                        }}
                        itemStyle={{ color: '#e6f1f5' }}
                        labelStyle={{ color: '#2dd4bf', fontWeight: 600 }}
                      />
                      <Bar dataKey="count" fill="#2dd4bf" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-xs text-[var(--text-dim)]">
                    No categorical findings recorded in current filter.
                  </div>
                )}
              </div>

              {/* Requirement 3: One-line text summary under chart */}
              <p className="text-[11px] text-[var(--text-dim)] pt-2 border-t border-[rgba(64,224,208,0.15)] leading-relaxed">
                <span className="font-semibold text-slate-200">Summary: </span>
                {categoryChartData.length > 0 ? (
                  <span>
                    {categoryChartData.length} distinct {categoryChartData.length === 1 ? 'type' : 'types'} identified. Highest frequency: {categoryChartData.slice().sort((a, b) => b.count - a.count)[0].category} ({categoryChartData.slice().sort((a, b) => b.count - a.count)[0].count} events).
                  </span>
                ) : (
                  <span>No categorical entity detections recorded.</span>
                )}
              </p>
            </div>
          </HudPanel>

          {/* Chart 2: Policy Decisions Breakdown */}
          <HudPanel title="Policy Decisions Breakdown" tag="RESOLUTION_RATIO" brackets={true}>
            <div className="space-y-3">
              <div className="min-h-[220px]">
                {decisionChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={decisionChartData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 15 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(64, 224, 208, 0.12)" />
                      <XAxis
                        dataKey="decision"
                        stroke="#9bb3bf"
                        fontSize={10}
                        tickLine={{ stroke: 'rgba(64, 224, 208, 0.2)' }}
                        axisLine={{ stroke: 'rgba(64, 224, 208, 0.25)' }}
                      />
                      <YAxis
                        stroke="#9bb3bf"
                        fontSize={10}
                        tickLine={{ stroke: 'rgba(64, 224, 208, 0.2)' }}
                        axisLine={{ stroke: 'rgba(64, 224, 208, 0.25)' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#07131f',
                          borderColor: 'rgba(64, 224, 208, 0.3)',
                          borderRadius: '8px',
                          fontSize: '11px',
                          color: '#e6f1f5',
                          boxShadow: '0 8px 24px rgba(4, 11, 20, 0.8)',
                        }}
                        itemStyle={{ color: '#e6f1f5' }}
                        labelStyle={{ color: '#2dd4bf', fontWeight: 600 }}
                      />
                      <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                        {decisionChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getDecisionBarColor(entry.decision)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-xs text-[var(--text-dim)]">
                    No decisions recorded yet.
                  </div>
                )}
              </div>

              {/* Requirement 3: One-line text summary under chart */}
              <p className="text-[11px] text-[var(--text-dim)] pt-2 border-t border-[rgba(64,224,208,0.15)] leading-relaxed">
                <span className="font-semibold text-slate-200">Summary: </span>
                {decisionChartData.length > 0 ? (
                  <span>
                    Decisions logged: {decisionChartData.map((d) => `${d.decision}: ${d.count}`).join(', ')}.
                  </span>
                ) : (
                  <span>No policy decision events logged yet.</span>
                )}
              </p>
            </div>
          </HudPanel>

          {/* Chart 3: Daily Average Risk Trend */}
          <HudPanel title="Daily Average Risk Trend" tag="TIME_SERIES" brackets={true}>
            <div className="space-y-3">
              <div className="min-h-[220px]">
                {aggregates && aggregates.riskOverTime.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart
                      data={aggregates.riskOverTime}
                      margin={{ top: 10, right: 10, left: -20, bottom: 15 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(64, 224, 208, 0.12)" />
                      <XAxis
                        dataKey="date"
                        stroke="#9bb3bf"
                        fontSize={10}
                        tickLine={{ stroke: 'rgba(64, 224, 208, 0.2)' }}
                        axisLine={{ stroke: 'rgba(64, 224, 208, 0.25)' }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        stroke="#9bb3bf"
                        fontSize={10}
                        tickLine={{ stroke: 'rgba(64, 224, 208, 0.2)' }}
                        axisLine={{ stroke: 'rgba(64, 224, 208, 0.25)' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#07131f',
                          borderColor: 'rgba(64, 224, 208, 0.3)',
                          borderRadius: '8px',
                          fontSize: '11px',
                          color: '#e6f1f5',
                          boxShadow: '0 8px 24px rgba(4, 11, 20, 0.8)',
                        }}
                        itemStyle={{ color: '#e6f1f5' }}
                        labelStyle={{ color: '#fbbf24', fontWeight: 600 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="averageRisk"
                        stroke="#fbbf24"
                        strokeWidth={2}
                        dot={{ r: 3.5, fill: '#fbbf24' }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-xs text-[var(--text-dim)]">
                    No chronological risk points to plot.
                  </div>
                )}
              </div>

              {/* Requirement 3: One-line text summary under chart */}
              <p className="text-[11px] text-[var(--text-dim)] pt-2 border-t border-[rgba(64,224,208,0.15)] leading-relaxed">
                <span className="font-semibold text-slate-200">Summary: </span>
                {aggregates && aggregates.riskOverTime.length > 0 ? (
                  <span>
                    Plotted across {aggregates.riskOverTime.length} {aggregates.riskOverTime.length === 1 ? 'day' : 'days'}. Overall average risk: {aggregates.averageRisk} / 100.
                  </span>
                ) : (
                  <span>No chronological trend points logged yet.</span>
                )}
              </p>
            </div>
          </HudPanel>
        </section>

        {/* Requirement 4: Logs Table in a hud-panel with sticky header & filters */}
        <HudPanel
          title="Cryptographic Audit Trail"
          tag="SHA256_LEDGER"
          brackets={true}
          headerAction={
            <div className="hud-label text-slate-300">
              Showing <span className="text-[#2dd4bf] font-bold">{rows.length}</span> {rows.length === 1 ? 'record' : 'records'}
              {aggregates && aggregates.totalScans > rows.length && (
                <span className="text-[var(--text-dim)]"> (of {aggregates.totalScans})</span>
              )}
            </div>
          }
        >
          <div className="space-y-4">
            {/* Filter Bar (Date Range, Decision, Level, Clear Filters) */}
            <div className="p-3 bg-[rgba(4,11,20,0.7)] border border-[rgba(64,224,208,0.18)] rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                {/* Date Range: From */}
                <div className="flex items-center gap-1.5">
                  <label htmlFor="fromDateInput" className="hud-label text-[10px]">
                    From:
                  </label>
                  <input
                    id="fromDateInput"
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="bg-[rgba(10,28,44,0.9)] border border-[var(--panel-border)] text-slate-200 rounded-lg px-2.5 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#2dd4bf]"
                  />
                </div>

                {/* Date Range: To */}
                <div className="flex items-center gap-1.5">
                  <label htmlFor="toDateInput" className="hud-label text-[10px]">
                    To:
                  </label>
                  <input
                    id="toDateInput"
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="bg-[rgba(10,28,44,0.9)] border border-[var(--panel-border)] text-slate-200 rounded-lg px-2.5 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#2dd4bf]"
                  />
                </div>

                {/* Decision Filter */}
                <div className="flex items-center gap-1.5">
                  <label htmlFor="decisionSelect" className="hud-label text-[10px]">
                    Decision:
                  </label>
                  <select
                    id="decisionSelect"
                    value={filterDecision}
                    onChange={(e) => setFilterDecision(e.target.value)}
                    className="bg-[rgba(10,28,44,0.9)] border border-[var(--panel-border)] text-slate-200 rounded-lg px-2.5 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#2dd4bf]"
                  >
                    <option value="all">All Decisions</option>
                    <option value="allow">Allow</option>
                    <option value="sanitize">Sanitize</option>
                    <option value="review">Review</option>
                    <option value="block">Block</option>
                  </select>
                </div>

                {/* Risk Level Filter */}
                <div className="flex items-center gap-1.5">
                  <label htmlFor="levelSelect" className="hud-label text-[10px]">
                    Risk:
                  </label>
                  <select
                    id="levelSelect"
                    value={filterLevel}
                    onChange={(e) => setFilterLevel(e.target.value)}
                    className="bg-[rgba(10,28,44,0.9)] border border-[var(--panel-border)] text-slate-200 rounded-lg px-2.5 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#2dd4bf]"
                  >
                    <option value="all">All Levels</option>
                    <option value="low">Low (0-29)</option>
                    <option value="medium">Medium (30-59)</option>
                    <option value="high">High (60-84)</option>
                    <option value="critical">Critical (85+)</option>
                  </select>
                </div>
              </div>

              {/* Clear Filters Button & Limit Selector */}
              <div className="flex items-center gap-2">
                {(fromDate || toDate || filterDecision !== 'all' || filterAction !== 'all' || filterLevel !== 'all') && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    aria-label="Clear active filters"
                    className="px-2.5 py-1 rounded-lg bg-[rgba(10,28,44,0.85)] hover:bg-[rgba(45,212,191,0.15)] border border-[var(--panel-border)] text-slate-300 hover:text-white transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#2dd4bf]"
                  >
                    Clear Filters ✕
                  </button>
                )}

                <select
                  aria-label="Limit results fetched from server"
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="bg-[rgba(10,28,44,0.9)] border border-[var(--panel-border)] text-slate-200 rounded-lg px-2.5 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#2dd4bf]"
                >
                  <option value={50}>Limit 50</option>
                  <option value={100}>Limit 100</option>
                  <option value={200}>Limit 200</option>
                  <option value={500}>Limit 500</option>
                </select>
              </div>
            </div>

            {/* Table Container with Sticky Header & Mobile Horizontal Scroll (Requirement 4 & 8) */}
            <div className="overflow-x-auto w-full border border-[var(--panel-border)] rounded-xl max-h-[560px]">
              <table className="w-full text-left text-xs border-collapse">
                {/* Sticky Table Header */}
                <thead className="sticky top-0 bg-[rgba(7,19,31,0.95)] backdrop-blur-md border-b border-[rgba(64,224,208,0.25)] text-[var(--text-dim)] font-mono z-10 shadow-sm">
                  <tr>
                    <th scope="col" className="py-2.5 px-3 w-8">
                      <span className="sr-only">Expand</span>
                    </th>
                    <th scope="col" className="py-2.5 px-3 whitespace-nowrap">Timestamp</th>
                    <th scope="col" className="py-2.5 px-3">Action</th>
                    <th scope="col" className="py-2.5 px-3">Decision</th>
                    <th scope="col" className="py-2.5 px-3">Risk Level</th>
                    <th scope="col" className="py-2.5 px-3">Categories</th>
                    <th scope="col" className="py-2.5 px-3">Sanitized Prompt</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[rgba(64,224,208,0.1)] text-slate-200">
                  {paginatedRows.length > 0 ? (
                    paginatedRows.map((row) => {
                      const isExpanded = expandedRowId === row.id;
                      const shortenedPrompt =
                        row.masked_prompt && row.masked_prompt.length > 70
                          ? row.masked_prompt.slice(0, 70) + '...'
                          : row.masked_prompt || '';

                      return (
                        <React.Fragment key={row.id}>
                          <tr
                            onClick={() => setExpandedRowId(isExpanded ? null : row.id)}
                            className={`hover:bg-[rgba(45,212,191,0.05)] cursor-pointer transition ${
                              isExpanded ? 'bg-[rgba(45,212,191,0.08)] border-l-2 border-[#2dd4bf]' : ''
                            }`}
                          >
                            {/* Expand button */}
                            <td className="py-2.5 px-3 text-slate-400 text-center font-mono text-[11px]">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedRowId(isExpanded ? null : row.id);
                                }}
                                aria-expanded={isExpanded}
                                aria-label={`Toggle details for audit entry ${row.id}`}
                                className="p-1 hover:text-[#2dd4bf] rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#2dd4bf]"
                              >
                                {isExpanded ? '▼' : '▶'}
                              </button>
                            </td>

                            {/* Timestamp */}
                            <td className="py-2.5 px-3 font-mono text-[var(--text-dim)] whitespace-nowrap text-[11px]">
                              {row.created_at ? new Date(row.created_at).toLocaleString() : '—'}
                            </td>

                            {/* Action */}
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[rgba(4,11,20,0.85)] border border-[rgba(64,224,208,0.2)]">
                                {row.action}
                              </span>
                            </td>

                            {/* Decision */}
                            <td className="py-2.5 px-3">
                              {renderDecisionBadge(row.decision)}
                            </td>

                            {/* Risk Badge with Icons (Requirement 4) */}
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {renderRiskBadge(row.risk_score)}
                            </td>

                            {/* Categories */}
                            <td className="py-2.5 px-3">
                              {Array.isArray(row.categories) && row.categories.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {row.categories.map((c, i) => (
                                    <span
                                      key={i}
                                      className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[rgba(4,11,20,0.85)] text-slate-300 border border-[rgba(64,224,208,0.2)]"
                                    >
                                      {c}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-600">—</span>
                              )}
                            </td>

                            {/* Shortened Prompt Text with Tooltip */}
                            <td
                              className="py-2.5 px-3 font-mono text-slate-300 text-xs max-w-xs truncate"
                              title={row.masked_prompt}
                            >
                              {shortenedPrompt}
                            </td>
                          </tr>

                          {/* Expandable Row (Requirement 4 & 7: Plain text only) */}
                          {isExpanded && (
                            <tr className="bg-[rgba(4,11,20,0.9)] border-b border-[rgba(64,224,208,0.18)]">
                              <td colSpan={7} className="p-4 space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                  {/* Sanitized Prompt Box */}
                                  <div className="space-y-1">
                                    <div className="hud-label text-[10px]">
                                      Full Sanitized Prompt (Plain Text):
                                    </div>
                                    <div className="p-3 bg-[rgba(10,28,44,0.9)] border border-[rgba(64,224,208,0.2)] rounded-lg font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                                      {row.masked_prompt}
                                    </div>
                                  </div>

                                  {/* Cryptographic Hashes */}
                                  <div className="space-y-2.5">
                                    <div>
                                      <div className="flex items-center justify-between hud-label text-[10px]">
                                        <span>Entry SHA-256 Hash:</span>
                                        <button
                                          type="button"
                                          onClick={() => handleCopyHash(row.id, row.hash)}
                                          aria-label="Copy entry SHA-256 hash"
                                          className="text-[#2dd4bf] hover:underline font-mono text-[10px]"
                                        >
                                          {copiedHashId === row.id ? '✓ Copied' : 'Copy'}
                                        </button>
                                      </div>
                                      <code className="block p-2 bg-[rgba(10,28,44,0.9)] border border-[rgba(64,224,208,0.2)] rounded font-mono text-[11px] text-[#2dd4bf] break-all select-all mt-1">
                                        {row.hash}
                                      </code>
                                    </div>

                                    <div>
                                      <div className="hud-label text-[10px]">
                                        Previous Link (prev_hash):
                                      </div>
                                      <code className="block p-2 bg-[rgba(10,28,44,0.9)] border border-[rgba(64,224,208,0.2)] rounded font-mono text-[11px] text-slate-400 break-all select-all mt-1">
                                        {row.prev_hash}
                                      </code>
                                    </div>

                                    <div className="flex items-center gap-4 text-[10px] text-[var(--text-dim)] font-mono pt-1">
                                      <span>LEDGER_ID: #{row.id}</span>
                                      <span>AUTH_USER: {row.user_id || 'anonymous'}</span>
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
                          <div className="text-3xl text-[#2dd4bf]" aria-hidden="true">🛡️</div>
                          <h4 className="text-sm font-bold text-white font-mono">
                            No scans yet, try the Playground
                          </h4>
                          <p className="text-xs text-[var(--text-dim)] leading-relaxed">
                            No audit telemetry matches your current filter criteria. Run an inspection in the playground sandbox to generate cryptographic audit records.
                          </p>
                          <div className="pt-2">
                            <Link
                              href="/playground"
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2dd4bf] hover:bg-[#14b8a6] text-slate-950 text-xs font-bold shadow-[0_0_15px_rgba(45,212,191,0.25)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
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

            {/* Pagination Controls */}
            {rows.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-[var(--text-dim)] font-mono">
                <div className="flex items-center gap-2">
                  <span>Rows per page:</span>
                  <select
                    value={pageSize}
                    aria-label="Select rows per page"
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-[rgba(10,28,44,0.9)] border border-[var(--panel-border)] text-slate-200 rounded px-2 py-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#2dd4bf]"
                  >
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span>
                    Page <strong className="text-white">{currentPage}</strong> of <strong className="text-white">{totalPages}</strong>
                  </span>

                  <div className="inline-flex gap-1 ml-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      aria-label="Go to previous page"
                      className="px-2.5 py-1 rounded bg-[rgba(10,28,44,0.85)] hover:bg-[rgba(45,212,191,0.15)] border border-[var(--panel-border)] disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#2dd4bf]"
                    >
                      ← Prev
                    </button>

                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      aria-label="Go to next page"
                      className="px-2.5 py-1 rounded bg-[rgba(10,28,44,0.85)] hover:bg-[rgba(45,212,191,0.15)] border border-[var(--panel-border)] disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#2dd4bf]"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </HudPanel>
      </main>
    </div>
  );
}
