export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { verifyDashboardPasscode } from '@/lib/audit/auth';

/**
 * Validates viewer IANA timezone strictly with regex and Intl verification.
 * Falls back to 'UTC' if invalid.
 */
function validateTimezone(tz?: string | null): string {
  if (!tz || typeof tz !== 'string' || tz.trim().length === 0) return 'UTC';
  const trimmed = tz.trim();
  if (trimmed.length > 64) return 'UTC';
  if (!/^[A-Za-z0-9_\-\+/]+$/.test(trimmed)) return 'UTC';
  try {
    Intl.DateTimeFormat(undefined, { timeZone: trimmed });
    return trimmed;
  } catch {
    return 'UTC';
  }
}

/**
 * Returns 'YYYY-MM-DD' calendar date key for a Date in given IANA timezone.
 */
function getLocalDateKey(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/**
 * Returns hour of day (0-23) for a Date in given IANA timezone.
 */
function getLocalHour(date: Date, timeZone: string): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      hourCycle: 'h23',
    }).formatToParts(date);
    const hourPart = parts.find((p) => p.type === 'hour');
    return hourPart ? parseInt(hourPart.value, 10) : date.getUTCHours();
  } catch {
    return date.getUTCHours();
  }
}

/**
 * Formats hour (0-23) to 12-hour AM/PM string, e.g. 15 -> '3 PM', 0 -> '12 AM'.
 */
function formatHour12(hour: number): string {
  const h = hour % 24;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  return `${displayHour} ${period}`;
}

export async function GET(request: NextRequest) {
  const passcode = request.headers.get('x-dashboard-passcode');

  if (!verifyDashboardPasscode(passcode)) {
    return NextResponse.json(
      { error: 'Unauthorized: Invalid or missing dashboard passcode.' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const action = searchParams.get('action');
    const decision = searchParams.get('decision');
    const level = searchParams.get('level');
    const rawLimit = searchParams.get('limit') || searchParams.get('pageSize');
    const cursorCreatedAt =
      searchParams.get('cursorCreatedAt') || searchParams.get('cursor_created_at');
    const cursorIdRaw =
      searchParams.get('cursorId') || searchParams.get('cursor_id');
    const cursorId = cursorIdRaw ? parseInt(cursorIdRaw, 10) : undefined;

    const rawRange = searchParams.get('range');
    const range: '7d' | '30d' | 'all' =
      rawRange === '7d' || rawRange === '30d' || rawRange === 'all'
        ? rawRange
        : '30d';

    const timezone = validateTimezone(searchParams.get('timezone'));

    const isExport =
      searchParams.get('export') === 'true' ||
      searchParams.get('format') === 'csv';
    const maxPageSize = isExport ? 5000 : 200;
    const defaultPageSize = isExport ? 5000 : 25;
    const limit = Math.min(
      maxPageSize,
      Math.max(1, parseInt(rawLimit || String(defaultPageSize), 10) || defaultPageSize)
    );

    const supabase = getServiceSupabase();

    // 1. Query table rows with cursor pagination and limit
    let rowsQuery = supabase
      .from('audit_logs')
      .select(
        'id, user_id, action, categories, risk_score, masked_prompt, decision, prev_hash, hash, created_at'
      )
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });

    // 2. Query all matching rows for aggregates over the whole table (independent of page size)
    let aggQuery = supabase
      .from('audit_logs')
      .select('id, action, categories, risk_score, decision, created_at')
      .order('created_at', { ascending: false });

    // Apply shared filter parameters
    if (from) {
      rowsQuery = rowsQuery.gte('created_at', from);
      aggQuery = aggQuery.gte('created_at', from);
    }
    if (to) {
      rowsQuery = rowsQuery.lte('created_at', to);
      aggQuery = aggQuery.lte('created_at', to);
    }
    if (action) {
      rowsQuery = rowsQuery.eq('action', action);
      aggQuery = aggQuery.eq('action', action);
    }
    if (decision) {
      rowsQuery = rowsQuery.eq('decision', decision);
      aggQuery = aggQuery.eq('decision', decision);
    }
    if (level === 'low') {
      rowsQuery = rowsQuery.gte('risk_score', 0).lt('risk_score', 30);
      aggQuery = aggQuery.gte('risk_score', 0).lt('risk_score', 30);
    } else if (level === 'medium') {
      rowsQuery = rowsQuery.gte('risk_score', 30).lt('risk_score', 60);
      aggQuery = aggQuery.gte('risk_score', 30).lt('risk_score', 60);
    } else if (level === 'high') {
      rowsQuery = rowsQuery.gte('risk_score', 60).lt('risk_score', 85);
      aggQuery = aggQuery.gte('risk_score', 60).lt('risk_score', 85);
    } else if (level === 'critical') {
      rowsQuery = rowsQuery.gte('risk_score', 85);
      aggQuery = aggQuery.gte('risk_score', 85);
    }

    if (cursorCreatedAt && cursorId !== undefined && !Number.isNaN(cursorId)) {
      rowsQuery = rowsQuery.or(
        `created_at.lt.${cursorCreatedAt},and(created_at.eq.${cursorCreatedAt},id.lt.${cursorId})`
      );
    }

    rowsQuery = rowsQuery.limit(limit);
    aggQuery = aggQuery.limit(10000);

    const [rowsResult, aggResult] = await Promise.all([rowsQuery, aggQuery]);

    if (rowsResult.error) {
      return NextResponse.json(
        { error: `Failed to fetch audit logs: ${rowsResult.error.message}` },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (aggResult.error) {
      return NextResponse.json(
        { error: `Failed to compute audit aggregates: ${aggResult.error.message}` },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const fetchedRows = rowsResult.data || [];
    const allRows = aggResult.data || fetchedRows;
    const totalCount = allRows.length;

    const hasMore = fetchedRows.length === limit && totalCount > fetchedRows.length;
    const lastRow = fetchedRows.length > 0 ? fetchedRows[fetchedRows.length - 1] : null;
    const nextCursor =
      hasMore && lastRow && lastRow.created_at && typeof lastRow.id === 'number'
        ? { createdAt: lastRow.created_at, id: lastRow.id }
        : null;

    // 3. Compute server-side aggregates across the whole table
    const totalScans = allRows.length;
    let blockedCount = 0;
    let injectionCount = 0;
    let totalRisk = 0;
    const categoriesCount: Record<string, number> = {};
    const categoryBlockedCount: Record<string, number> = {};
    const categoryRiskSum: Record<string, number> = {};
    const categoryMaxRisk: Record<string, number> = {};
    const decisionsCount: Record<string, number> = {};

    // Protection summary
    let forwardedCount = 0;
    let forwardedWithFindingsCount = 0;
    let totalSensitiveItems = 0;

    // 24-hour distribution in viewer timezone
    const hourlyScans: Array<{ hour: number; count: number }> = Array.from(
      { length: 24 },
      (_, h) => ({ hour: h, count: 0 })
    );

    // Current calendar date in viewer timezone
    const now = new Date();
    const todayKey = getLocalDateKey(now, timezone);
    const [curYear, curMonth, curDay] = todayKey.split('-').map(Number);
    const todayUtc = new Date(Date.UTC(curYear, curMonth - 1, curDay));

    const startDate7d = new Date(todayUtc.getTime() - 6 * 24 * 60 * 60 * 1000);
    const startDateKey7d = startDate7d.toISOString().slice(0, 10);

    const startDate30d = new Date(todayUtc.getTime() - 29 * 24 * 60 * 60 * 1000);
    const startDateKey30d = startDate30d.toISOString().slice(0, 10);

    let scansLast7Days = 0;
    let latestTimestamp: string | null = null;
    const recentFlaggedScans: Array<{
      createdAt: string;
      decision: string;
      riskScore: number;
      categories: string[];
    }> = [];

    const trendDayGroups: Record<string, { totalRisk: number; count: number }> = {};

    for (const row of allRows) {
      const risk = Number(row.risk_score) || 0;
      totalRisk += risk;

      const isBlocked = row.decision === 'block' || row.action === 'block';
      if (isBlocked) {
        blockedCount++;
      }

      const isForwarded = row.action === 'forward';
      const cats = Array.isArray(row.categories) ? row.categories : [];
      if (isForwarded) {
        forwardedCount++;
        if (cats.length > 0) {
          forwardedWithFindingsCount++;
        }
      }
      totalSensitiveItems += cats.length;

      const rowDate = row.created_at ? new Date(row.created_at) : now;
      const rowDateKey = getLocalDateKey(rowDate, timezone);
      const rowHour = getLocalHour(rowDate, timezone);

      if (rowHour >= 0 && rowHour < 24) {
        hourlyScans[rowHour].count += 1;
      }

      if (rowDateKey >= startDateKey7d && rowDateKey <= todayKey) {
        scansLast7Days++;
      }

      if (
        row.created_at &&
        (!latestTimestamp || new Date(row.created_at) > new Date(latestTimestamp))
      ) {
        latestTimestamp = row.created_at;
      }

      let isInjection = false;
      for (const cat of cats) {
        categoriesCount[cat] = (categoriesCount[cat] || 0) + 1;
        categoryRiskSum[cat] = (categoryRiskSum[cat] || 0) + risk;
        categoryMaxRisk[cat] = Math.max(categoryMaxRisk[cat] || 0, risk);
        if (isBlocked) {
          categoryBlockedCount[cat] = (categoryBlockedCount[cat] || 0) + 1;
        }
        if (cat.toLowerCase().includes('injection')) {
          isInjection = true;
        }
      }

      if (isInjection) {
        injectionCount++;
      }

      const dec = row.decision || 'unknown';
      decisionsCount[dec] = (decisionsCount[dec] || 0) + 1;

      // Filter for daily trend range
      let inTrendRange = false;
      if (range === '7d') {
        inTrendRange = rowDateKey >= startDateKey7d && rowDateKey <= todayKey;
      } else if (range === '30d') {
        inTrendRange = rowDateKey >= startDateKey30d && rowDateKey <= todayKey;
      } else {
        inTrendRange = true;
      }

      if (inTrendRange) {
        if (!trendDayGroups[rowDateKey]) {
          trendDayGroups[rowDateKey] = { totalRisk: 0, count: 0 };
        }
        trendDayGroups[rowDateKey].totalRisk += risk;
        trendDayGroups[rowDateKey].count += 1;
      }

      // Collect last 8 flagged scans (metadata only) for backwards compatibility with tests
      if (
        recentFlaggedScans.length < 8 &&
        (risk >= 30 || row.decision !== 'allow' || cats.length > 0)
      ) {
        recentFlaggedScans.push({
          createdAt: row.created_at || new Date().toISOString(),
          decision: row.decision || 'unknown',
          riskScore: risk,
          categories: cats,
        });
      }
    }

    const averageRisk =
      totalScans > 0 ? Math.round((totalRisk / totalScans) * 10) / 10 : 0;

    // Peak active hour calculation
    let maxHour = -1;
    let maxHourCount = 0;
    for (let h = 0; h < 24; h++) {
      if (hourlyScans[h].count > maxHourCount) {
        maxHourCount = hourlyScans[h].count;
        maxHour = h;
      }
    }
    const mostActiveHourText =
      maxHour >= 0 && maxHourCount > 0 ? formatHour12(maxHour) : null;

    // Daily risk trend points
    const riskOverTime = Object.entries(trendDayGroups)
      .map(([date, data]) => ({
        date,
        averageRisk: Math.round((data.totalRisk / data.count) * 10) / 10,
        count: data.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const categoryDetails = Object.keys(categoriesCount)
      .map((cat) => ({
        category: cat,
        count: categoriesCount[cat],
        blockedCount: categoryBlockedCount[cat] || 0,
        averageRisk:
          Math.round((categoryRiskSum[cat] / categoriesCount[cat]) * 10) / 10,
        maxRisk: categoryMaxRisk[cat] || 0,
      }))
      .sort((a, b) => b.count - a.count);

    const protectionSummary = {
      forwardedCount,
      forwardedWithFindingsCount,
      blockedCount,
      totalSensitiveItems,
    };

    return NextResponse.json(
      {
        rows: fetchedRows,
        totalCount,
        nextCursor,
        hasMore,
        aggregates: {
          totalScans,
          blockedCount,
          injectionCount,
          averageRisk,
          scansLast7Days,
          latestTimestamp,
          categoriesCount,
          categoryDetails,
          protectionSummary,
          hourlyScans,
          mostActiveHourText,
          recentFlaggedScans,
          decisionsCount,
          riskOverTime,
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json(
      { error: message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
