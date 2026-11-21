'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
} from 'recharts';
import { HudPanel, RiskGauge, CountUp, getRiskSeverity } from '@/components';

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

interface CategoryDetail {
  category: string;
  count: number;
  blockedCount: number;
  averageRisk: number;
  maxRisk: number;
}

interface RecentFlaggedScan {
  createdAt: string;
  decision: string;
  riskScore: number;
  categories: string[];
}

interface ProtectionSummary {
  forwardedCount: number;
  forwardedWithFindingsCount: number;
  blockedCount: number;
  totalSensitiveItems: number;
}

interface Aggregates {
  totalScans: number;
  blockedCount: number;
  injectionCount: number;
  averageRisk: number;
  scansLast7Days: number;
  latestTimestamp: string | null;
  categoriesCount: Record<string, number>;
  categoryDetails: CategoryDetail[];
  recentFlaggedScans: RecentFlaggedScan[];
  protectionSummary?: ProtectionSummary;
  hourlyScans?: Array<{ hour: number; count: number }>;
  mostActiveHourText?: string | null;
  decisionsCount: Record<string, number>;
  riskOverTime: Array<{ date: string; averageRisk: number; count: number }>;
}

interface LogsApiResponse {
  rows: AuditRow[];
  totalCount?: number;
  nextCursor?: { createdAt: string; id: number } | null;
  hasMore?: boolean;
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
  // Passcode kept ONLY in active React memory (never in localStorage or sessionStorage)
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Telemetry Data & Status
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [aggregates, setAggregates] = useState<Aggregates | null>(null);

  // Theme tracking for Recharts SVG colors
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [hasAnimatedCharts, setHasAnimatedCharts] = useState(false);

  // Risk Trends range toggle ('7d' | '30d' | 'all')
  const [trendRange, setTrendRange] = useState<'7d' | '30d' | 'all'>('30d');

  // Category filter state (triggered by clicking categories in Data at Risk panel)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Filters State
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [filterDecision, setFilterDecision] = useState<string>('all');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);

  // Pagination & Cursor State
  const [totalCount, setTotalCount] = useState<number>(0);
  const [nextCursor, setNextCursor] = useState<{ createdAt: string; id: number } | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);

  // CSV Export Status
  const [csvNotice, setCsvNotice] = useState<string | null>(null);
  const [isExportingCsv, setIsExportingCsv] = useState<boolean>(false);

  // Hash Chain Integrity State & Block Animation
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyProgressIndex, setVerifyProgressIndex] = useState<number>(-1);
  const [verifyStatus, setVerifyStatus] = useState<VerifyResult | null>(null);

  // Copy feedback
  const [copiedHashId, setCopiedHashId] = useState<number | null>(null);

  // Accessible document title
  useEffect(() => {
    document.title = 'Audit Dashboard | YapShield';
  }, []);

  // Theme observer to dynamically update Recharts colors
  useEffect(() => {
    const updateTheme = () => {
      const activeTheme = document.documentElement.getAttribute('data-theme');
      setTheme(activeTheme === 'light' ? 'light' : 'dark');
    };
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  // Mark charts as animated after first render of data
  useEffect(() => {
    if (aggregates && !hasAnimatedCharts) {
      const timer = setTimeout(() => setHasAnimatedCharts(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [aggregates, hasAnimatedCharts]);

  // Fetch telemetry logs from server
  const fetchLogs = useCallback(
    async (codeToUse: string, isLoadMore = false) => {
      if (!codeToUse) return;
      if (isLoadMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setAuthError(null);
      setFetchError(null);

      try {
        const queryParams = new URLSearchParams();
        if (fromDate) queryParams.set('from', `${fromDate}T00:00:00.000Z`);
        if (toDate) queryParams.set('to', `${toDate}T23:59:59.999Z`);
        if (filterDecision !== 'all') queryParams.set('decision', filterDecision);
        if (filterLevel !== 'all') queryParams.set('level', filterLevel);
        queryParams.set('limit', String(rowsPerPage));
        queryParams.set('range', trendRange);

        const viewerTz =
          typeof Intl !== 'undefined' && Intl.DateTimeFormat
            ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
            : 'UTC';
        queryParams.set('timezone', viewerTz);

        if (isLoadMore && nextCursor) {
          queryParams.set('cursorCreatedAt', nextCursor.createdAt);
          queryParams.set('cursorId', String(nextCursor.id));
        }

        const res = await fetch(`/api/audit/logs?${queryParams.toString()}`, {
          method: 'GET',
          headers: {
            'x-dashboard-passcode': codeToUse,
          },
        });

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
          setFetchError(data.error);
        } else {
          if (isLoadMore) {
            setRows((prev) => [...prev, ...(data.rows || [])]);
          } else {
            setRows(data.rows || []);
          }
          setTotalCount(data.totalCount ?? data.aggregates?.totalScans ?? data.rows?.length ?? 0);
          setNextCursor(data.nextCursor ?? null);
          setHasMore(Boolean(data.hasMore));
          setAggregates(data.aggregates || null);
          setIsAuthenticated(true);
        }
      } catch {
        setFetchError('Network error: Unable to reach audit telemetry API.');
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [fromDate, toDate, filterDecision, filterLevel, rowsPerPage, trendRange, nextCursor]
  );

  // Handle Passcode Submission
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setAuthError('Please enter a passcode.');
      return;
    }
    await fetchLogs(passcode, false);
  };

  // Re-fetch when filters change if authenticated
  useEffect(() => {
    if (isAuthenticated && passcode) {
      setNextCursor(null);
      fetchLogs(passcode, false);
    }
  }, [fromDate, toDate, filterDecision, filterLevel, rowsPerPage, trendRange, isAuthenticated, passcode, fetchLogs]);

  // Clear Filters Handler
  const handleClearFilters = () => {
    setFromDate('');
    setToDate('');
    setFilterDecision('all');
    setFilterLevel('all');
    setSelectedCategory(null);
    setRowsPerPage(25);
    setNextCursor(null);
  };

  // Verify Integrity handler with sequential linked-block animation
  const handleVerifyChain = async () => {
    if (!passcode || isVerifying) return;
    setIsVerifying(true);
    setVerifyStatus(null);
    setVerifyProgressIndex(0);

    const totalCount = aggregates?.totalScans || rows.length || 8;
    const targetBlocks = Math.min(12, totalCount > 0 ? totalCount : 8);

    let step = 0;
    const interval = setInterval(() => {
      step++;
      setVerifyProgressIndex(step);
      if (step >= targetBlocks) {
        clearInterval(interval);
      }
    }, 70);

    try {
      const res = await fetch('/api/audit/verify', {
        method: 'GET',
        headers: {
          'x-dashboard-passcode': passcode,
        },
      });

      const data: VerifyResult = await res.json();

      setTimeout(() => {
        clearInterval(interval);
        setVerifyProgressIndex(targetBlocks);
        setVerifyStatus(data);
        setIsVerifying(false);
      }, Math.max(0, targetBlocks * 70));
    } catch {
      clearInterval(interval);
      setVerifyStatus({
        valid: false,
        error: 'Network failure during integrity check.',
      });
      setIsVerifying(false);
    }
  };

  // CSV Cell Sanitizer (Neutralizes spreadsheet formula injection)
  const sanitizeCsvCell = (value: unknown): string => {
    if (value === null || value === undefined) return '""';
    let str = String(value);
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }
    str = str.replace(/"/g, '""');
    return `"${str}"`;
  };

  // CSV Export Download (downloads up to 5,000 matching rows, capped notice, formula-injection protection)
  const handleDownloadCsv = async () => {
    if (isExportingCsv) return;
    setIsExportingCsv(true);
    setCsvNotice(null);

    try {
      const queryParams = new URLSearchParams();
      if (fromDate) queryParams.set('from', `${fromDate}T00:00:00.000Z`);
      if (toDate) queryParams.set('to', `${toDate}T23:59:59.999Z`);
      if (filterDecision !== 'all') queryParams.set('decision', filterDecision);
      if (filterLevel !== 'all') queryParams.set('level', filterLevel);
      queryParams.set('export', 'true');
      queryParams.set('limit', '5000');

      const viewerTz =
        typeof Intl !== 'undefined' && Intl.DateTimeFormat
          ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
          : 'UTC';
      queryParams.set('timezone', viewerTz);

      const res = await fetch(`/api/audit/logs?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'x-dashboard-passcode': passcode,
        },
      });

      if (!res.ok) {
        setCsvNotice('Failed to export CSV: server returned an error.');
        return;
      }

      const data: LogsApiResponse = await res.json();
      let exportRows = data.rows || [];

      if (selectedCategory) {
        exportRows = exportRows.filter(
          (r) => Array.isArray(r.categories) && r.categories.includes(selectedCategory)
        );
      }

      if (exportRows.length === 0) {
        setCsvNotice('No matching records found to export.');
        return;
      }

      if (data.rows && data.rows.length >= 5000) {
        setCsvNotice('Notice: CSV export is capped at the maximum limit of 5,000 rows.');
      }

      const headers = [
        'ID',
        'Timestamp',
        'Action',
        'Decision',
        'Risk Score',
        'Categories',
        'Sanitized Prompt',
        'Prev Hash',
        'Hash',
      ];

      const csvLines = [headers.map(sanitizeCsvCell).join(',')];

      for (const r of exportRows) {
        const cats = Array.isArray(r.categories) ? r.categories.join('; ') : '';
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
    } catch {
      setCsvNotice('Failed to export CSV due to a network error.');
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handleCopyHash = async (id: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedHashId(id);
      setTimeout(() => setCopiedHashId(null), 2000);
    } catch {
      // Fallback
    }
  };

  // Readable Risk Badges that include both an icon and text
  const renderRiskBadge = (score: number) => {
    if (score >= 85) {
      return (
        <span className="badge badge-critical inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border">
          <svg
            className="w-2.5 h-2.5 text-red-400 flex-shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>Critical ({score})</span>
        </span>
      );
    }
    if (score >= 60) {
      return (
        <span className="badge badge-high inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border">
          <svg
            className="w-2.5 h-2.5 text-rose-400 flex-shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>High ({score})</span>
        </span>
      );
    }
    if (score >= 30) {
      return (
        <span className="badge badge-warn inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border">
          <svg
            className="w-2.5 h-2.5 text-amber-400 flex-shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          <span>Medium ({score})</span>
        </span>
      );
    }
    return (
      <span className="badge badge-ok inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border">
        <svg
          className="w-2.5 h-2.5 text-emerald-400 flex-shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
        <span>Low ({score})</span>
      </span>
    );
  };

  // Decision Badges with icon and text
  const renderDecisionBadge = (decision: string) => {
    switch (decision.toLowerCase()) {
      case 'block':
        return (
          <span className="badge badge-critical inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border">
            <svg
              className="w-2.5 h-2.5 text-red-400 flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
            <span>BLOCK</span>
          </span>
        );
      case 'sanitize':
        return (
          <span className="badge badge-accent inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border">
            <svg
              className="w-2.5 h-2.5 text-[var(--accent)] flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>SANITIZE</span>
          </span>
        );
      case 'review':
        return (
          <span className="badge badge-warn inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border">
            <svg
              className="w-2.5 h-2.5 text-amber-400 flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            </svg>
            <span>REVIEW</span>
          </span>
        );
      case 'allow':
        return (
          <span className="badge badge-ok inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border">
            <svg
              className="w-2.5 h-2.5 text-emerald-400 flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>ALLOW</span>
          </span>
        );
      default:
        return (
          <span className="badge badge-neutral inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border">
            <span>{decision.toUpperCase()}</span>
          </span>
        );
    }
  };

  // Recharts Theme-Aware Color Palette
  const chartColors = useMemo(() => {
    if (theme === 'light') {
      return {
        accent: '#0891b2',
        accentStrong: '#0e7490',
        warn: '#b45309',
        grid: '#c9d6e2',
        text: '#4a5d6e',
        tooltipBg: '#ffffff',
        tooltipBorder: '#c9d6e2',
        tooltipText: '#0b1620',
      };
    }
    return {
      accent: '#22d3ee',
      accentStrong: '#06b6d4',
      warn: '#fbbf24',
      grid: 'rgba(45,212,191,0.22)',
      text: '#9bb3bf',
      tooltipBg: '#0a1724',
      tooltipBorder: 'rgba(45,212,191,0.22)',
      tooltipText: '#e6f1f5',
    };
  }, [theme]);

  // Formatted date string for "Last updated: ..."
  const formatLastUpdated = (timestamp: string | null) => {
    if (!timestamp) return 'No scans yet';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'No scans yet';
      return (
        date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
        ' (' +
        date.toLocaleDateString() +
        ')'
      );
    } catch {
      return 'No scans yet';
    }
  };


  // Chart Data: Top Detections Bar Chart
  const categoryChartData = useMemo(() => {
    if (!aggregates?.categoryDetails) return [];
    return aggregates.categoryDetails.slice(0, 8).map((c) => ({
      category: c.category,
      count: c.count,
    }));
  }, [aggregates]);

  // Viewer IANA timezone
  const viewerTz = useMemo(() => {
    return typeof Intl !== 'undefined' && Intl.DateTimeFormat
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      : 'UTC';
  }, []);

  // Chart Data: Risk Trends line chart with real calendar time axis and gaps
  const { chartTrendData, recordedDaysCount, latestTrendPoint } = useMemo(() => {
    const rawData = aggregates?.riskOverTime || [];
    const dataMap = new Map<string, { averageRisk: number; count: number }>();
    for (const item of rawData) {
      dataMap.set(item.date, { averageRisk: item.averageRisk, count: item.count });
    }

    const formatDateKey = (d: Date): string => {
      try {
        return new Intl.DateTimeFormat('en-CA', {
          timeZone: viewerTz,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(d);
      } catch {
        return d.toISOString().slice(0, 10);
      }
    };

    const now = new Date();
    const todayKey = formatDateKey(now);

    let dateList: string[] = [];

    if (trendRange === '7d') {
      // Last 7 calendar days including today
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        dateList.push(formatDateKey(d));
      }
      dateList = Array.from(new Set(dateList));
    } else if (trendRange === '30d') {
      // Last 30 calendar days including today
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        dateList.push(formatDateKey(d));
      }
      dateList = Array.from(new Set(dateList));
    } else {
      // All: continuous calendar span from earliest recorded scan to today
      if (rawData.length === 0) {
        dateList = [];
      } else {
        const sortedDates = rawData.map((d) => d.date).sort();
        const minDateStr = sortedDates[0];
        const maxDateStr =
          sortedDates[sortedDates.length - 1] > todayKey
            ? sortedDates[sortedDates.length - 1]
            : todayKey;

        const cur = new Date(minDateStr + 'T12:00:00Z');
        const end = new Date(maxDateStr + 'T12:00:00Z');
        const diffDays = Math.round(
          (end.getTime() - cur.getTime()) / (24 * 60 * 60 * 1000)
        );

        if (diffDays >= 0 && diffDays <= 365) {
          for (let d = new Date(cur); d <= end; d.setDate(d.getDate() + 1)) {
            dateList.push(formatDateKey(d));
          }
          dateList = Array.from(new Set(dateList));
        } else {
          dateList = sortedDates;
        }
      }
    }

    const points: Array<{ date: string; averageRisk: number | null; count: number }> = [];
    let recordedCount = 0;
    let latest: { date: string; averageRisk: number; count: number } | null = null;

    for (const dKey of dateList) {
      const entry = dataMap.get(dKey);
      if (entry && entry.count > 0) {
        recordedCount++;
        latest = { date: dKey, averageRisk: entry.averageRisk, count: entry.count };
        points.push({
          date: dKey,
          averageRisk: entry.averageRisk,
          count: entry.count,
        });
      } else {
        points.push({
          date: dKey,
          averageRisk: null,
          count: 0,
        });
      }
    }

    return {
      chartTrendData: points,
      recordedDaysCount: recordedCount,
      latestTrendPoint: latest,
    };
  }, [aggregates, trendRange, viewerTz]);

  // Filtered rows for logs table (incorporating selectedCategory from Data at Risk panel)
  const displayRows = useMemo(() => {
    if (!selectedCategory) return rows;
    return rows.filter(
      (r) => Array.isArray(r.categories) && r.categories.includes(selectedCategory)
    );
  }, [rows, selectedCategory]);

  // Linked Blocks Count calculation
  const totalEntriesForBlocks = aggregates?.totalScans || rows.length || 8;
  const displayBlockCount = Math.min(12, totalEntriesForBlocks > 0 ? totalEntriesForBlocks : 8);
  const overflowBlockCount = totalEntriesForBlocks > 12 ? totalEntriesForBlocks - 12 : 0;

  // Average risk severity metadata
  const avgRiskSeverity = useMemo(() => {
    return getRiskSeverity(aggregates ? Math.round(aggregates.averageRisk) : 0);
  }, [aggregates]);

  // =========================================================================
  // Passcode Screen (Centered .hud-panel)
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex flex-col justify-center items-center p-4 relative overflow-hidden">
        {/* Subtle grid background */}
        <div className="absolute inset-0 pointer-events-none grid-bg opacity-40" aria-hidden="true" />

        <div className="max-w-md w-full relative z-10">
          <HudPanel title="Audit Log Access" tag="AUTH_REQUIRED">
            <div className="space-y-6 pt-2">
              <div className="text-center space-y-1.5">
                <h1 className="text-lg font-semibold text-[var(--text)]">
                  Audit Log Access
                </h1>
                <p className="text-xs text-[var(--text-dim)] leading-relaxed">
                  Enter passcode to inspect audit logs, verify hash chain integrity, and review threat telemetry.
                </p>
              </div>

              {authError && (
                <div
                  role="alert"
                  className="p-3 bg-red-950/80 border border-red-700 text-red-200 text-xs rounded font-mono"
                >
                  {authError}
                </div>
              )}

              <form onSubmit={handleUnlock} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="passcodeInput"
                    className="text-xs text-[var(--text-dim)] block font-mono uppercase tracking-wider"
                  >
                    Passcode
                  </label>

                  <div className="relative">
                    <input
                      id="passcodeInput"
                      type={showPasscode ? 'text' : 'password'}
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      placeholder="Enter DASHBOARD_PASSCODE..."
                      className="w-full bg-[var(--bg)] border border-[var(--border)] rounded pl-3 pr-16 py-2.5 text-sm font-mono text-[var(--text)] placeholder:text-[var(--text-dim)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                      autoFocus
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasscode(!showPasscode)}
                      aria-label={showPasscode ? 'Hide passcode' : 'Show passcode'}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs text-[var(--text-dim)] hover:text-[var(--text)] font-mono rounded hover:bg-[var(--surface-2)] transition"
                    >
                      {showPasscode ? 'Hide' : 'Show'}
                    </button>
                  </div>

                  <p className="text-[11px] text-[var(--text-dim)] font-mono">
                    Passcode remains strictly in React memory and is never saved to localStorage.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !passcode.trim()}
                  className="btn-primary w-full disabled:opacity-50 h-10 text-xs font-semibold"
                >
                  {isLoading ? 'Verifying...' : 'Unlock dashboard'}
                </button>
              </form>

              <div className="text-center pt-3 border-t border-[var(--border)]">
                <Link
                  href="/"
                  className="text-xs text-[var(--text-dim)] hover:text-[var(--accent)] transition-colors font-mono"
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

  // =========================================================================
  // Authenticated Dashboard
  // =========================================================================
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col pb-16 transition-colors">
      {/* Top Header */}
      <header className="border-b border-[var(--border)] bg-[var(--surface)] sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-[var(--text)]">
                Cybersecurity Analytics Dashboard
              </h1>
              <span className="hud-label text-[10px] text-[var(--accent)] bg-[var(--surface-2)] px-2 py-0.5 rounded border border-[var(--border)]">
                IMMUTABLE_CHAIN
              </span>
            </div>
            <p className="text-xs text-[var(--text-dim)]">
              Real-time threat surface analysis, cryptographic integrity, and compliance telemetry.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Download CSV Button */}
            <button
              type="button"
              onClick={handleDownloadCsv}
              disabled={rows.length === 0}
              aria-label="Download audit logs as CSV"
              className="btn-secondary h-8 text-xs font-mono font-medium px-3 disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <svg
                className="w-3.5 h-3.5 text-[var(--text-dim)]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Download CSV</span>
            </button>

            <Link
              href="/playground"
              className="btn-primary h-8 text-xs font-semibold px-3 inline-flex items-center gap-1"
            >
              <span>Playground</span>
              <span>→</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                setIsAuthenticated(false);
                setPasscode('');
                setRows([]);
                setAggregates(null);
                setVerifyStatus(null);
                setSelectedCategory(null);
              }}
              aria-label="Lock dashboard session"
              className="text-xs font-mono text-[var(--text-dim)] hover:text-[var(--text)] px-2.5 py-1 rounded border border-transparent hover:border-[var(--border)] transition"
            >
              Lock
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-4 py-6 space-y-6 flex-1">
        {/* Error Banner with Retry Button */}
        {fetchError && (
          <div
            role="alert"
            className="p-3.5 rounded-lg bg-red-950/80 border border-red-700 text-red-200 text-xs font-mono flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-red-400 flex-shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{fetchError}</span>
            </div>
            <button
              type="button"
              onClick={() => fetchLogs(passcode)}
              className="px-3 py-1 rounded bg-red-900/60 hover:bg-red-800/80 border border-red-600 text-white font-mono text-xs transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading Skeletons */}
        {isLoading && !aggregates ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-4 h-36 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg animate-pulse" />
              <div className="lg:col-span-4 h-36 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg animate-pulse" />
              <div className="lg:col-span-4 lg:row-span-2 h-80 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg animate-pulse" />
              <div className="lg:col-span-8 h-64 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg animate-pulse" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="h-48 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg animate-pulse" />
              <div className="h-48 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg animate-pulse" />
              <div className="h-48 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg animate-pulse" />
            </div>
          </div>
        ) : !aggregates || aggregates.totalScans === 0 ? (
          /* Empty State */
          <div className="p-12 text-center rounded-lg bg-[var(--surface)] border border-[var(--border)] max-w-xl mx-auto space-y-4 my-8">
            <div className="mx-auto w-12 h-12 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)]">
              <svg
                className="w-6 h-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div className="space-y-1.5">
              <h2 className="text-base font-semibold text-[var(--text)]">
                No scans yet, try the Playground
              </h2>
              <p className="text-xs text-[var(--text-dim)] leading-relaxed">
                There are currently no audit telemetry records in the ledger. Run an interactive prompt scan in the Playground to generate live security records.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/playground"
                className="btn-primary inline-flex items-center px-4 py-2 text-xs font-semibold"
              >
                Open Playground →
              </Link>
            </div>
          </div>
        ) : (
          /* 12-Column Desktop Grid Layout (Two columns on tablet, stacked on mobile) */
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 items-stretch">
              {/* TOP ROW - Left Card: Total scans (lg:col-span-4) */}
              <div
                className="lg:col-span-4 hud-stagger-card"
                style={{ animationDelay: '0ms' }}
              >
                <HudPanel title="Total scans" tag="ALL_TIME">
                  <div className="pt-1 space-y-2">
                    <div className="text-3xl sm:text-4xl font-mono font-semibold text-[var(--text)]">
                      <CountUp value={aggregates.totalScans} />
                    </div>
                    <div className="text-xs text-[var(--text-dim)] font-mono flex items-center gap-1.5 pt-1 border-t border-[var(--border)]">
                      <span className="text-[var(--accent)] font-semibold">●</span>
                      <span>
                        last 7 days:{' '}
                        <strong className="text-[var(--text)]">
                          {aggregates.scansLast7Days.toLocaleString()}
                        </strong>
                      </span>
                    </div>
                  </div>
                </HudPanel>
              </div>

              {/* TOP ROW - Middle Card: Average risk (lg:col-span-4) */}
              <div
                className="lg:col-span-4 hud-stagger-card"
                style={{ animationDelay: '60ms' }}
              >
                <HudPanel title="Average risk" tag="RISK_SCORE">
                  <div className="pt-1 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl sm:text-4xl font-mono font-semibold text-[var(--accent)]">
                          <CountUp value={Math.round(aggregates.averageRisk)} />
                        </span>
                        <span className="text-xs text-[var(--text-dim)] font-mono">/ 100</span>
                      </div>
                      <div className="text-xs font-mono font-semibold" style={{ color: avgRiskSeverity.color }}>
                        {avgRiskSeverity.label} Risk
                      </div>
                      <div className="text-[11px] text-[var(--text-dim)] font-mono pt-1">
                        Last updated: {formatLastUpdated(aggregates.latestTimestamp)}
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      <RiskGauge
                        score={Math.round(aggregates.averageRisk)}
                        size={96}
                        strokeWidth={7}
                        labelPosition="below"
                      />
                    </div>
                  </div>
                </HudPanel>
              </div>

              {/* TOP & SECOND ROW - Right Column: Data at risk (lg:col-span-4 lg:row-span-2) */}
              <div
                className="lg:col-span-4 lg:row-span-2 hud-stagger-card flex flex-col"
                style={{ animationDelay: '120ms' }}
              >
                <HudPanel title="Data at risk" tag="THREAT_SURFACE">
                  <div className="pt-1 space-y-4 flex flex-col h-full">
                    <div>
                      <div className="flex items-center justify-between text-xs text-[var(--text-dim)] font-mono pb-1">
                        <span>Top detected categories</span>
                        {selectedCategory && (
                          <button
                            type="button"
                            onClick={() => setSelectedCategory(null)}
                            className="text-[var(--accent)] hover:underline text-[11px]"
                          >
                            Reset filter
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--text-dim)]">
                        Click a category to filter the audit log below.
                      </p>
                    </div>

                    {/* Scrollable list of categories */}
                    <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1" tabIndex={0} aria-label="Top detected categories list">
                      {aggregates.categoryDetails && aggregates.categoryDetails.length > 0 ? (
                        aggregates.categoryDetails.map((cat) => {
                          const isSelected = selectedCategory === cat.category;
                          return (
                            <button
                              key={cat.category}
                              type="button"
                              onClick={() =>
                                setSelectedCategory(isSelected ? null : cat.category)
                              }
                              className={`w-full text-left p-2 rounded border transition flex items-center justify-between gap-2 text-xs font-mono ${
                                isSelected
                                  ? 'border-[var(--accent)] bg-[var(--accent)]/15 ring-1 ring-[var(--accent)] text-[var(--text)]'
                                  : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--accent)]/60 text-[var(--text-dim)]'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-semibold text-[var(--text)] truncate">
                                  {cat.category}
                                </span>
                                <span className="text-[10px] opacity-80">
                                  ({cat.count})
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <span className="text-[10px] text-[var(--critical)]">
                                  {cat.blockedCount} blk
                                </span>
                                {renderRiskBadge(cat.averageRisk)}
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <div className="text-xs text-[var(--text-dim)] py-3 text-center font-mono">
                          No category detections recorded.
                        </div>
                      )}
                    </div>

                    {/* Protection summary - server computed, never leaks prompt text, user id, or IP */}
                    <div className="pt-3 border-t border-[var(--border)] space-y-2">
                      <div className="text-[11px] font-mono font-semibold text-[var(--text-dim)] uppercase tracking-wider">
                        Protection summary
                      </div>
                      {aggregates.protectionSummary ? (
                        <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                          <div className="p-2 rounded bg-[var(--surface-2)] border border-[var(--border)]">
                            <div className="text-[10px] text-[var(--text-dim)] truncate">Forwarded to AI</div>
                            <div className="text-base font-semibold text-[var(--text)] mt-0.5">
                              {aggregates.protectionSummary.forwardedCount.toLocaleString()}
                            </div>
                          </div>
                          <div className="p-2 rounded bg-[var(--surface-2)] border border-[var(--border)]">
                            <div className="text-[10px] text-[var(--text-dim)] truncate">Sanitized before AI</div>
                            <div className="text-base font-semibold text-[var(--accent)] mt-0.5">
                              {aggregates.protectionSummary.forwardedWithFindingsCount.toLocaleString()}
                            </div>
                          </div>
                          <div className="p-2 rounded bg-[var(--surface-2)] border border-[var(--border)]">
                            <div className="text-[10px] text-[var(--text-dim)] truncate">Stopped before AI</div>
                            <div className="text-base font-semibold text-[var(--critical)] mt-0.5">
                              {aggregates.protectionSummary.blockedCount.toLocaleString()}
                            </div>
                          </div>
                          <div className="p-2 rounded bg-[var(--surface-2)] border border-[var(--border)]">
                            <div className="text-[10px] text-[var(--text-dim)] truncate">Sensitive items found</div>
                            <div className="text-base font-semibold text-[var(--warn)] mt-0.5">
                              {aggregates.protectionSummary.totalSensitiveItems.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-[var(--text-dim)] font-mono py-2">
                          Protection summary unavailable
                        </div>
                      )}
                    </div>

                    {/* When scans happen - 24-hour activity bar chart in viewer timezone */}
                    <div className="pt-3 border-t border-[var(--border)] space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-dim)]">
                        <span className="font-semibold uppercase tracking-wider">When scans happen</span>
                        {aggregates.mostActiveHourText ? (
                          <span className="text-[10px] text-[var(--accent)] font-semibold">
                            Peak: {aggregates.mostActiveHourText}
                          </span>
                        ) : null}
                      </div>

                      <p className="sr-only">
                        24-bar distribution of scans by hour of day (0 to 23) in viewer timezone. {aggregates.mostActiveHourText ? `Most active hour: ${aggregates.mostActiveHourText}.` : 'No scans recorded.'}
                      </p>

                      {aggregates.hourlyScans && aggregates.hourlyScans.length === 24 ? (
                        <div className="h-16 w-full pt-1">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={aggregates.hourlyScans}
                              margin={{ top: 2, right: 2, left: 2, bottom: 2 }}
                            >
                              <Tooltip
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    const item = payload[0].payload;
                                    const h = item.hour % 24;
                                    const period = h >= 12 ? 'PM' : 'AM';
                                    const displayHour = h % 12 === 0 ? 12 : h % 12;
                                    const label12 = `${displayHour} ${period}`;
                                    return (
                                      <div
                                        style={{
                                          backgroundColor: chartColors.tooltipBg,
                                          borderColor: chartColors.tooltipBorder,
                                        }}
                                        className="p-1.5 border rounded shadow text-[10px] font-mono"
                                      >
                                        <span className="text-[var(--accent)] font-semibold">{label12}</span>:{' '}
                                        <span className="text-[var(--text)]">{item.count} scans</span>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Bar
                                dataKey="count"
                                fill={chartColors.accent}
                                radius={[1, 1, 0, 0]}
                                isAnimationActive={!hasAnimatedCharts}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                          <div className="flex justify-between text-[9px] text-[var(--text-dim)] font-mono px-0.5 mt-0.5">
                            <span>12 AM</span>
                            <span>6 AM</span>
                            <span>12 PM</span>
                            <span>6 PM</span>
                            <span>11 PM</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-[var(--text-dim)] font-mono py-2">
                          Hourly activity data unavailable
                        </div>
                      )}
                    </div>
                  </div>
                </HudPanel>
              </div>

              {/* SECOND ROW - Left Two-Thirds: Risk trends (lg:col-span-8) */}
              <div
                className="lg:col-span-8 hud-stagger-card"
                style={{ animationDelay: '180ms' }}
              >
                <HudPanel title="Risk trends" tag="DAILY_AVERAGE">
                  <div className="pt-1 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h2 className="text-sm font-semibold text-[var(--text)]">
                          Chronological composite prompt risk
                        </h2>
                        <p className="text-xs text-[var(--text-dim)]">
                          Daily composite risk severity tracking with real-time scan volume
                        </p>
                      </div>

                      {/* Range toggle 7 days, 30 days, All */}
                      <div
                        role="group"
                        aria-label="Risk trend time range selector"
                        className="inline-flex rounded border border-[var(--border)] bg-[var(--surface-2)] p-0.5 text-xs font-mono"
                      >
                        <button
                          type="button"
                          onClick={() => setTrendRange('7d')}
                          className={`px-2.5 py-0.5 rounded transition ${
                            trendRange === '7d'
                              ? 'bg-[var(--accent)] text-[var(--bg)] font-semibold'
                              : 'text-[var(--text-dim)] hover:text-[var(--text)]'
                          }`}
                        >
                          7 days
                        </button>
                        <button
                          type="button"
                          onClick={() => setTrendRange('30d')}
                          className={`px-2.5 py-0.5 rounded transition ${
                            trendRange === '30d'
                              ? 'bg-[var(--accent)] text-[var(--bg)] font-semibold'
                              : 'text-[var(--text-dim)] hover:text-[var(--text)]'
                          }`}
                        >
                          30 days
                        </button>
                        <button
                          type="button"
                          onClick={() => setTrendRange('all')}
                          className={`px-2.5 py-0.5 rounded transition ${
                            trendRange === 'all'
                              ? 'bg-[var(--accent)] text-[var(--bg)] font-semibold'
                              : 'text-[var(--text-dim)] hover:text-[var(--text)]'
                          }`}
                        >
                          All
                        </button>
                      </div>
                    </div>

                    <div className="min-h-[220px]">
                      {recordedDaysCount > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                          <LineChart
                            data={chartTrendData}
                            margin={{ top: 20, right: 20, left: -20, bottom: 20 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                            <XAxis
                              dataKey="date"
                              stroke={chartColors.text}
                              fontSize={11}
                              tickLine={{ stroke: chartColors.grid }}
                              axisLine={{ stroke: chartColors.grid }}
                              label={{
                                value: 'Date',
                                position: 'insideBottom',
                                offset: -12,
                                fill: chartColors.text,
                                fontSize: 10,
                              }}
                            />
                            <YAxis
                              domain={[0, 100]}
                              stroke={chartColors.text}
                              fontSize={11}
                              tickLine={{ stroke: chartColors.grid }}
                              axisLine={{ stroke: chartColors.grid }}
                              label={{
                                value: 'Risk (0-100)',
                                angle: -90,
                                position: 'insideLeft',
                                offset: 25,
                                fill: chartColors.text,
                                fontSize: 10,
                              }}
                            />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const item = payload[0].payload;
                                  return (
                                    <div
                                      style={{
                                        backgroundColor: chartColors.tooltipBg,
                                        borderColor: chartColors.tooltipBorder,
                                      }}
                                      className="p-2 border rounded shadow text-xs font-mono space-y-1"
                                    >
                                      <div className="font-semibold text-[var(--accent)]">
                                        Date: {item.date}
                                      </div>
                                      {item.averageRisk !== null ? (
                                        <>
                                          <div className="text-[var(--text)]">
                                            Average risk: <strong className="text-[var(--warn)]">{item.averageRisk}</strong> / 100
                                          </div>
                                          <div className="text-[var(--text-dim)]">
                                            Scans: {item.count}
                                          </div>
                                        </>
                                      ) : (
                                        <div className="text-[var(--text-dim)]">
                                          No scans recorded
                                        </div>
                                      )}
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey="averageRisk"
                              stroke={chartColors.warn}
                              strokeWidth={2}
                              connectNulls={false}
                              isAnimationActive={!hasAnimatedCharts}
                              animationDuration={800}
                              dot={(props: { cx?: number; cy?: number; index?: number; payload?: { date: string; averageRisk: number | null; count: number } }) => {
                                const { cx = 0, cy = 0, index = 0, payload } = props;
                                if (!payload || payload.averageRisk === null || payload.averageRisk === undefined) {
                                  return null;
                                }
                                const isLatest = latestTrendPoint && payload.date === latestTrendPoint.date;
                                if (isLatest) {
                                  return (
                                    <g key={`dot-${index}`}>
                                      <circle
                                        cx={cx}
                                        cy={cy}
                                        r={5}
                                        fill={chartColors.accent}
                                        stroke="var(--bg)"
                                        strokeWidth={2}
                                      />
                                      <circle
                                        cx={cx}
                                        cy={cy}
                                        r={9}
                                        fill="none"
                                        stroke={chartColors.accent}
                                        strokeWidth={1.5}
                                        opacity={0.7}
                                      />
                                      <text
                                        x={cx}
                                        y={cy - 12}
                                        textAnchor="middle"
                                        fill={chartColors.accent}
                                        fontSize={10}
                                        fontFamily="var(--font-mono)"
                                        fontWeight={600}
                                      >
                                        {payload.averageRisk}
                                      </text>
                                    </g>
                                  );
                                }
                                return (
                                  <circle
                                    key={`dot-${index}`}
                                    cx={cx}
                                    cy={cy}
                                    r={3}
                                    fill={chartColors.warn}
                                  />
                                );
                              }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[220px] flex items-center justify-center text-xs text-[var(--text-dim)] font-mono">
                          No scans in this range
                        </div>
                      )}
                    </div>

                    {/* Accessible summary */}
                    <p className="sr-only">
                      Line chart tracking average risk severity over {recordedDaysCount} recorded days with y-axis from 0 to 100.
                    </p>
                    <div className="flex items-center justify-between text-xs text-[var(--text-dim)] pt-2 border-t border-[var(--border)] font-mono">
                      <span>
                        {recordedDaysCount}{' '}
                        {recordedDaysCount === 1 ? 'day recorded' : 'days recorded'}
                      </span>
                      {latestTrendPoint && (
                        <span>
                          Latest point:{' '}
                          <strong className="text-[var(--accent)]">
                            {latestTrendPoint.averageRisk}/100
                          </strong>{' '}
                          on {latestTrendPoint.date} ({latestTrendPoint.count}{' '}
                          {latestTrendPoint.count === 1 ? 'scan' : 'scans'})
                        </span>
                      )}
                    </div>
                  </div>
                </HudPanel>
              </div>
            </div>

            {/* THIRD ROW - Decisions, Top detections, Integrity (Three cards side-by-side) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
              {/* Decisions Panel */}
              <div
                className="hud-stagger-card"
                style={{ animationDelay: '240ms' }}
              >
                <HudPanel title="Decisions" tag="POLICY_BREAKDOWN">
                  <div className="pt-1 space-y-3">
                    <div>
                      <h2 className="text-sm font-semibold text-[var(--text)]">
                        Policy Decisions
                      </h2>
                      <p className="text-xs text-[var(--text-dim)]">
                        Distribution across allow, sanitize, review, and block actions
                      </p>
                    </div>

                    <div className="space-y-2.5 pt-1">
                      {[
                        {
                          key: 'allow',
                          label: 'ALLOW',
                          count: aggregates.decisionsCount['allow'] || 0,
                          colorClass: 'bg-[var(--ok)]',
                          textColorClass: 'text-[var(--ok)]',
                        },
                        {
                          key: 'sanitize',
                          label: 'SANITIZE',
                          count: aggregates.decisionsCount['sanitize'] || 0,
                          colorClass: 'bg-[var(--accent)]',
                          textColorClass: 'text-[var(--accent)]',
                        },
                        {
                          key: 'review',
                          label: 'REVIEW',
                          count: aggregates.decisionsCount['review'] || 0,
                          colorClass: 'bg-[var(--warn)]',
                          textColorClass: 'text-[var(--warn)]',
                        },
                        {
                          key: 'block',
                          label: 'BLOCK',
                          count: aggregates.decisionsCount['block'] || 0,
                          colorClass: 'bg-[var(--critical)]',
                          textColorClass: 'text-[var(--critical)]',
                        },
                      ].map((item) => {
                        const pct =
                          aggregates.totalScans > 0
                            ? Math.round((item.count / aggregates.totalScans) * 100)
                            : 0;
                        return (
                          <div key={item.key} className="space-y-1 font-mono text-xs">
                            <div className="flex items-center justify-between">
                              <span className={`font-semibold ${item.textColorClass}`}>
                                {item.label}
                              </span>
                              <span className="text-[var(--text-dim)]">
                                <strong className="text-[var(--text)]">{item.count}</strong> ({pct}%)
                              </span>
                            </div>
                            <div className="h-2 w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-full overflow-hidden">
                              <div
                                className={`h-full ${item.colorClass} transition-all duration-500`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <p className="sr-only">
                      Horizontal bars summarizing enforcement decisions for allow, sanitize, review, and block.
                    </p>
                    <p className="text-xs text-[var(--text-dim)] pt-2 border-t border-[var(--border)] font-mono">
                      Total policy decisions executed: {aggregates.totalScans}
                    </p>
                  </div>
                </HudPanel>
              </div>

              {/* Top detections Bar Chart */}
              <div
                className="hud-stagger-card"
                style={{ animationDelay: '300ms' }}
              >
                <HudPanel title="Top detections" tag="CATEGORY_BARS">
                  <div className="pt-1 space-y-3">
                    <div>
                      <h2 className="text-sm font-semibold text-[var(--text)]">
                        Top detections
                      </h2>
                      <p className="text-xs text-[var(--text-dim)]">
                        Frequency of identified sensitive categories
                      </p>
                    </div>

                    <div className="min-h-[180px]">
                      {categoryChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={180}>
                          <BarChart
                            data={categoryChartData}
                            margin={{ top: 10, right: 10, left: -25, bottom: 25 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                            <XAxis
                              dataKey="category"
                              stroke={chartColors.text}
                              fontSize={10}
                              angle={-25}
                              textAnchor="end"
                              interval={0}
                              tickLine={{ stroke: chartColors.grid }}
                              axisLine={{ stroke: chartColors.grid }}
                            />
                            <YAxis
                              stroke={chartColors.text}
                              fontSize={10}
                              tickLine={{ stroke: chartColors.grid }}
                              axisLine={{ stroke: chartColors.grid }}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: chartColors.tooltipBg,
                                borderColor: chartColors.tooltipBorder,
                                borderRadius: '6px',
                                fontSize: '11px',
                                color: chartColors.tooltipText,
                              }}
                              itemStyle={{ color: chartColors.tooltipText }}
                              labelStyle={{ color: chartColors.accent, fontWeight: 600 }}
                            />
                            <Bar
                              dataKey="count"
                              fill={chartColors.accent}
                              radius={[2, 2, 0, 0]}
                              isAnimationActive={!hasAnimatedCharts}
                              animationDuration={800}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[180px] flex items-center justify-center text-xs text-[var(--text-dim)] font-mono">
                          No categorical detections to display.
                        </div>
                      )}
                    </div>

                    <p className="sr-only">
                      Bar chart of category detection frequencies across top entities.
                    </p>
                    <p className="text-xs text-[var(--text-dim)] pt-2 border-t border-[var(--border)] font-mono">
                      {categoryChartData.length} top categories visualized
                    </p>
                  </div>
                </HudPanel>
              </div>

              {/* Integrity Verification Panel */}
              <div
                className="hud-stagger-card"
                style={{ animationDelay: '360ms' }}
              >
                <HudPanel title="Integrity" tag="SHA256_VERIFY">
                  <div className="pt-1 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h2 className="text-sm font-semibold text-[var(--text)]">
                          Cryptographic Chain
                        </h2>
                        <p className="text-xs text-[var(--text-dim)]">
                          Verify SHA-256 genesis links
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleVerifyChain}
                        disabled={isVerifying}
                        aria-label="Verify hash chain integrity"
                        className="btn-secondary h-7 text-xs font-mono px-2.5 inline-flex items-center gap-1.5"
                      >
                        <svg
                          className={`w-3 h-3 text-[var(--accent)] ${isVerifying ? 'animate-spin' : ''}`}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                        <span>{isVerifying ? 'Checking...' : 'Verify integrity'}</span>
                      </button>
                    </div>

                    {/* Linked blocks row (1..12, +N more) */}
                    <div
                      className="p-2 bg-[var(--surface-2)] border border-[var(--border)] rounded overflow-x-auto"
                      aria-label="Audit block chain verification progress"
                    >
                      <div className="flex items-center gap-1 min-w-max py-0.5">
                        {Array.from({ length: displayBlockCount }).map((_, idx) => {
                          const isChecked = verifyProgressIndex >= idx;
                          const isCurrent = isVerifying && verifyProgressIndex === idx;
                          const isTampered =
                            verifyStatus && !verifyStatus.valid && idx === displayBlockCount - 1;

                          let blockClass =
                            'border border-[var(--border)] bg-[var(--surface)] text-[var(--text-dim)]';
                          if (isTampered) {
                            blockClass =
                              'border-red-500 bg-red-950/80 text-red-200 animate-pulse ring-1 ring-red-500';
                          } else if (isCurrent) {
                            blockClass =
                              'border-[var(--accent)] bg-[var(--accent)]/30 text-[var(--text)] ring-1 ring-[var(--accent)]';
                          } else if (isChecked) {
                            blockClass =
                              'border-emerald-500/80 bg-emerald-950/40 text-emerald-300';
                          }

                          return (
                            <React.Fragment key={idx}>
                              <div
                                className={`w-6 h-6 rounded flex items-center justify-center font-mono text-[9px] font-semibold transition-all duration-150 ${blockClass}`}
                                title={`Block #${idx + 1}`}
                              >
                                #{idx + 1}
                              </div>
                              {idx < displayBlockCount - 1 && (
                                <div
                                  className={`w-1.5 h-[2px] transition-colors duration-150 ${
                                    verifyProgressIndex > idx
                                      ? 'bg-emerald-500'
                                      : 'bg-[var(--border)]'
                                  }`}
                                />
                              )}
                            </React.Fragment>
                          );
                        })}

                        {overflowBlockCount > 0 && (
                          <>
                            <div
                              className={`w-1.5 h-[2px] transition-colors duration-150 ${
                                verifyProgressIndex >= displayBlockCount
                                  ? 'bg-emerald-500'
                                  : 'bg-[var(--border)]'
                              }`}
                            />
                            <div
                              className={`px-1.5 h-6 rounded flex items-center justify-center font-mono text-[9px] border border-[var(--border)] bg-[var(--surface)] ${
                                verifyProgressIndex >= displayBlockCount
                                  ? 'text-emerald-300 border-emerald-500/60 bg-emerald-950/30'
                                  : 'text-[var(--text-dim)]'
                              }`}
                            >
                              +{overflowBlockCount} more
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Result Banner */}
                    {verifyStatus && (
                      <div
                        role="status"
                        aria-live="polite"
                        className={`p-2.5 rounded border text-xs flex items-center justify-between gap-2 font-mono ${
                          verifyStatus.valid
                            ? 'bg-emerald-950/70 border-emerald-600 text-emerald-200'
                            : 'bg-red-950/70 border-red-600 text-red-200'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <p className="font-semibold flex items-center gap-1">
                            {verifyStatus.valid ? (
                              <>
                                <svg
                                  className="w-3.5 h-3.5 text-emerald-400"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  aria-hidden="true"
                                >
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                                <span>Chain valid, {verifyStatus.checked ?? 0} entries checked</span>
                              </>
                            ) : (
                              <>
                                <svg
                                  className="w-3.5 h-3.5 text-red-400"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  aria-hidden="true"
                                >
                                  <circle cx="12" cy="12" r="10" />
                                  <line x1="12" y1="8" x2="12" y2="12" />
                                  <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                <span>
                                  Tampering detected at entry ID {verifyStatus.brokenAtId ?? 'unknown'}
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setVerifyStatus(null)}
                          className="text-[10px] px-1.5 py-0.5 rounded hover:bg-black/20"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    <p className="text-xs text-[var(--text-dim)] pt-2 border-t border-[var(--border)] font-mono">
                      Sequential SHA-256 hash chaining
                    </p>
                  </div>
                </HudPanel>
              </div>
            </div>

            {/* 4. Logs Table in a Panel Under the Grid */}
            <div
              className="hud-stagger-card"
              style={{ animationDelay: '420ms' }}
            >
              <HudPanel title="Audit Log Ledger" tag="IMMUTABLE_CHAIN">
                <div className="space-y-4 pt-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--border)]">
                    <div>
                      <h2 className="text-sm font-semibold text-[var(--text)]">
                        Audit log
                      </h2>
                      <p className="text-xs text-[var(--text-dim)] font-mono">
                        Showing {displayRows.length} of {totalCount} records
                        {selectedCategory && (
                          <span className="ml-2 text-[var(--accent)] font-semibold">
                            Filtered by: {selectedCategory}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* CSV Export Notice */}
                  {csvNotice && (
                    <div
                      role="status"
                      className="p-2.5 rounded bg-amber-950/70 border border-amber-600 text-amber-200 text-xs font-mono flex items-center justify-between gap-2"
                    >
                      <span>{csvNotice}</span>
                      <button
                        type="button"
                        onClick={() => setCsvNotice(null)}
                        aria-label="Dismiss notice"
                        className="text-amber-300 hover:text-white px-1.5 py-0.5 rounded"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* Filter Bar */}
                  <div className="p-3 bg-[var(--surface-2)] border border-[var(--border)] rounded flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <label htmlFor="fromDateInput" className="text-[var(--text-dim)] font-mono text-[11px]">
                          From:
                        </label>
                        <input
                          id="fromDateInput"
                          type="date"
                          value={fromDate}
                          onChange={(e) => setFromDate(e.target.value)}
                          className="bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] rounded px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <label htmlFor="toDateInput" className="text-[var(--text-dim)] font-mono text-[11px]">
                          To:
                        </label>
                        <input
                          id="toDateInput"
                          type="date"
                          value={toDate}
                          onChange={(e) => setToDate(e.target.value)}
                          className="bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] rounded px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <label htmlFor="decisionSelect" className="text-[var(--text-dim)] font-mono text-[11px]">
                          Decision:
                        </label>
                        <select
                          id="decisionSelect"
                          value={filterDecision}
                          onChange={(e) => setFilterDecision(e.target.value)}
                          className="bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] rounded px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
                        >
                          <option value="all">All decisions</option>
                          <option value="allow">Allow</option>
                          <option value="sanitize">Sanitize</option>
                          <option value="review">Review</option>
                          <option value="block">Block</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <label htmlFor="levelSelect" className="text-[var(--text-dim)] font-mono text-[11px]">
                          Risk:
                        </label>
                        <select
                          id="levelSelect"
                          value={filterLevel}
                          onChange={(e) => setFilterLevel(e.target.value)}
                          className="bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] rounded px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
                        >
                          <option value="all">All levels</option>
                          <option value="low">Low (0-29)</option>
                          <option value="medium">Medium (30-59)</option>
                          <option value="high">High (60-84)</option>
                          <option value="critical">Critical (85+)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {(fromDate || toDate || filterDecision !== 'all' || filterLevel !== 'all' || selectedCategory) && (
                        <button
                          type="button"
                          onClick={handleClearFilters}
                          className="px-2.5 py-1 rounded bg-[var(--surface)] hover:bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] hover:text-[var(--accent)] transition font-mono text-xs"
                        >
                          Clear filters
                        </button>
                      )}

                      <div className="flex items-center gap-1.5 font-mono text-xs">
                        <label htmlFor="rowsPerPageSelect" className="text-[var(--text-dim)] text-[11px] whitespace-nowrap">
                          Rows per page:
                        </label>
                        <select
                          id="rowsPerPageSelect"
                          aria-label="Rows per page"
                          value={rowsPerPage}
                          onChange={(e) => setRowsPerPage(Number(e.target.value))}
                          className="bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] rounded px-2 py-1 text-xs font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
                        >
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Table Container with Sticky Header */}
                  <div className="overflow-x-auto w-full border border-[var(--border)] rounded max-h-[540px]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 bg-[var(--surface-2)] border-b border-[var(--border)] text-[var(--text-dim)] font-mono z-10">
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

                      <tbody className="divide-y divide-[var(--border)] text-[var(--text)]">
                        {displayRows.length > 0 ? (
                          displayRows.map((row) => {
                            const isExpanded = expandedRowId === row.id;
                            const shortenedPrompt =
                              row.masked_prompt && row.masked_prompt.length > 70
                                ? row.masked_prompt.slice(0, 70) + '...'
                                : row.masked_prompt || '';

                            return (
                              <React.Fragment key={row.id}>
                                <tr
                                  onClick={() => setExpandedRowId(isExpanded ? null : row.id)}
                                  className={`hover:bg-[var(--surface-2)] cursor-pointer transition ${
                                    isExpanded ? 'bg-[var(--surface-2)] border-l-2 border-[var(--accent)]' : ''
                                  }`}
                                >
                                  <td className="py-2.5 px-3 text-[var(--text-dim)] text-center font-mono text-[11px]">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setExpandedRowId(isExpanded ? null : row.id);
                                      }}
                                      aria-expanded={isExpanded}
                                      aria-label={`Toggle details for audit entry ${row.id}`}
                                      className="p-1 hover:text-[var(--accent)]"
                                    >
                                      {isExpanded ? '▼' : '▶'}
                                    </button>
                                  </td>

                                  <td className="py-2.5 px-3 font-mono text-[var(--text-dim)] whitespace-nowrap text-[11px]">
                                    {row.created_at ? new Date(row.created_at).toLocaleString() : '—'}
                                  </td>

                                  <td className="py-2.5 px-3">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)]">
                                      {row.action}
                                    </span>
                                  </td>

                                  <td className="py-2.5 px-3">
                                    {renderDecisionBadge(row.decision)}
                                  </td>

                                  <td className="py-2.5 px-3 whitespace-nowrap">
                                    {renderRiskBadge(row.risk_score)}
                                  </td>

                                  <td className="py-2.5 px-3">
                                    {Array.isArray(row.categories) && row.categories.length > 0 ? (
                                      <div className="flex flex-wrap gap-1">
                                        {row.categories.map((c, i) => (
                                          <span
                                            key={i}
                                            className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--surface-2)] text-[var(--text-dim)] border border-[var(--border)]"
                                          >
                                            {c}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-[var(--text-dim)] font-mono">—</span>
                                    )}
                                  </td>

                                  <td
                                    className="py-2.5 px-3 font-mono text-[var(--text-dim)] text-xs max-w-xs truncate"
                                    title={row.masked_prompt}
                                  >
                                    {shortenedPrompt}
                                  </td>
                                </tr>

                                {isExpanded && (
                                  <tr className="bg-[var(--surface-2)] border-b border-[var(--border)]">
                                    <td colSpan={7} className="p-4 space-y-3">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                        <div className="space-y-1">
                                          <div className="text-[var(--text-dim)] font-mono text-[10px]">
                                            Sanitized prompt (plain text):
                                          </div>
                                          <div className="p-3 bg-[var(--bg)] border border-[var(--border)] rounded font-mono text-xs text-[var(--text)] whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                                            {row.masked_prompt}
                                          </div>
                                        </div>

                                        <div className="space-y-2.5">
                                          <div>
                                            <div className="flex items-center justify-between text-[var(--text-dim)] font-mono text-[10px]">
                                              <span>Entry SHA-256 hash:</span>
                                              <button
                                                type="button"
                                                onClick={() => handleCopyHash(row.id, row.hash)}
                                                aria-label="Copy entry hash"
                                                className="text-[var(--accent)] hover:underline font-mono text-[10px]"
                                              >
                                                {copiedHashId === row.id ? 'Copied' : 'Copy'}
                                              </button>
                                            </div>
                                            <code className="block p-2 bg-[var(--bg)] border border-[var(--border)] rounded font-mono text-[11px] text-[var(--accent)] break-all select-all mt-1">
                                              {row.hash}
                                            </code>
                                          </div>

                                          <div>
                                            <div className="text-[var(--text-dim)] font-mono text-[10px]">
                                              Previous hash (prev_hash):
                                            </div>
                                            <code className="block p-2 bg-[var(--bg)] border border-[var(--border)] rounded font-mono text-[11px] text-[var(--text-dim)] break-all select-all mt-1">
                                              {row.prev_hash}
                                            </code>
                                          </div>

                                          <div className="flex items-center gap-4 text-[10px] text-[var(--text-dim)] font-mono pt-1">
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
                          <tr>
                            <td colSpan={7} className="py-12 px-4 text-center">
                              <div className="max-w-md mx-auto space-y-3">
                                <h3 className="text-sm font-semibold text-[var(--text)]">
                                  No scans yet, try the Playground
                                </h3>
                                <p className="text-xs text-[var(--text-dim)] leading-relaxed">
                                  No audit telemetry matches your current filter criteria. Run an inspection in the playground to generate audit records.
                                </p>
                                <div className="pt-2">
                                  <Link
                                    href="/playground"
                                    className="btn-primary inline-flex items-center px-4 py-2 text-xs font-semibold"
                                  >
                                    Open Playground
                                  </Link>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Cursor-based Pagination & Load More */}
                  {displayRows.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[var(--border)] text-xs text-[var(--text-dim)] font-mono">
                      <span>
                        Showing {displayRows.length} of {totalCount} records
                      </span>

                      {hasMore && rows.length < totalCount ? (
                        <button
                          type="button"
                          onClick={() => fetchLogs(passcode, true)}
                          disabled={isLoadingMore}
                          className="btn-secondary h-8 px-4 text-xs font-mono inline-flex items-center gap-2"
                        >
                          {isLoadingMore && (
                            <svg
                              className="w-3.5 h-3.5 animate-spin text-[var(--accent)]"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              aria-hidden="true"
                            >
                              <circle
                                cx="12"
                                cy="12"
                                r="10"
                                strokeDasharray="32"
                                strokeDashoffset="12"
                              />
                            </svg>
                          )}
                          <span>{isLoadingMore ? 'Loading more records...' : 'Load more'}</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-[var(--text-dim)]">
                          All {displayRows.length} matching records loaded
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </HudPanel>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
