export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { verifyDashboardPasscode } from '@/lib/audit/auth';

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
    const rawLimit = searchParams.get('limit');

    const limit = Math.min(
      500,
      Math.max(1, parseInt(rawLimit || '500', 10) || 500)
    );

    const supabase = getServiceSupabase();

    let query = supabase
      .from('audit_logs')
      .select(
        'id, user_id, action, categories, risk_score, masked_prompt, decision, prev_hash, hash, created_at'
      )
      .order('created_at', { ascending: false });

    if (from) {
      query = query.gte('created_at', from);
    }
    if (to) {
      query = query.lte('created_at', to);
    }
    if (action) {
      query = query.eq('action', action);
    }
    if (decision) {
      query = query.eq('decision', decision);
    }
    if (level === 'low') {
      query = query.gte('risk_score', 0).lt('risk_score', 30);
    } else if (level === 'medium') {
      query = query.gte('risk_score', 30).lt('risk_score', 60);
    } else if (level === 'high') {
      query = query.gte('risk_score', 60).lt('risk_score', 85);
    } else if (level === 'critical') {
      query = query.gte('risk_score', 85);
    }

    query = query.limit(limit);

    const { data: rows, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: `Failed to fetch audit logs: ${error.message}` },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const fetchedRows = rows || [];

    // Compute aggregates
    const totalScans = fetchedRows.length;
    let blockedCount = 0;
    let injectionCount = 0;
    let totalRisk = 0;
    const categoriesCount: Record<string, number> = {};
    const categoryBlockedCount: Record<string, number> = {};
    const categoryRiskSum: Record<string, number> = {};
    const categoryMaxRisk: Record<string, number> = {};
    const decisionsCount: Record<string, number> = {};
    const dayGroups: Record<string, { totalRisk: number; count: number }> = {};

    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    let scansLast7Days = 0;
    let latestTimestamp: string | null = null;
    const recentFlaggedScans: Array<{
      createdAt: string;
      decision: string;
      riskScore: number;
      categories: string[];
    }> = [];

    for (const row of fetchedRows) {
      const risk = Number(row.risk_score) || 0;
      totalRisk += risk;

      const isBlocked = row.decision === 'block' || row.action === 'block';
      if (isBlocked) {
        blockedCount++;
      }

      const rowTime = row.created_at ? new Date(row.created_at).getTime() : 0;
      if (rowTime >= sevenDaysAgo) {
        scansLast7Days++;
      }

      if (row.created_at && (!latestTimestamp || new Date(row.created_at) > new Date(latestTimestamp))) {
        latestTimestamp = row.created_at;
      }

      const cats = Array.isArray(row.categories) ? row.categories : [];
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

      // Group risk by date (YYYY-MM-DD)
      const dateKey = row.created_at
        ? new Date(row.created_at).toISOString().slice(0, 10)
        : 'unknown';
      if (!dayGroups[dateKey]) {
        dayGroups[dateKey] = { totalRisk: 0, count: 0 };
      }
      dayGroups[dateKey].totalRisk += risk;
      dayGroups[dateKey].count += 1;

      // Collect last 8 flagged scans (non-allow, risk >= 30, or has categories)
      // containing ONLY non-sensitive metadata (never prompt, maskedPrompt, userId, or IP)
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

    const riskOverTime = Object.entries(dayGroups)
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
        averageRisk: Math.round((categoryRiskSum[cat] / categoriesCount[cat]) * 10) / 10,
        maxRisk: categoryMaxRisk[cat] || 0,
      }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json(
      {
        rows: fetchedRows,
        aggregates: {
          totalScans,
          blockedCount,
          injectionCount,
          averageRisk,
          scansLast7Days,
          latestTimestamp,
          categoriesCount,
          categoryDetails,
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
