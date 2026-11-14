export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { SupabaseAuditStore } from '@/lib/audit/supabaseStore';
import { verifyChain } from '@/lib/audit';
import { getClientIp, checkRateLimit } from '@/lib/gateway/rateLimit';
import {
  getCachedPublicStats,
  setCachedPublicStats,
  PublicStatsResponse,
  PublicStatsActivityItem,
} from '@/lib/publicStats';

export async function GET(request: NextRequest) {
  // 1. Abuse Protection: Rate Limiting per Client IP (30 requests per 10 minutes)
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(clientIp, 'public-stats');

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { message: 'Too many requests' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.retryAfter),
          'Cache-Control': 'no-store',
        },
      }
    );
  }

  // 2. Serve from in-memory cache if fresh
  const cached = getCachedPublicStats();
  if (cached) {
    return NextResponse.json(cached, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  }

  // 3. Query audit store & compute strict allow-listed aggregates
  try {
    const store = new SupabaseAuditStore();
    const [rows, chainResult] = await Promise.all([
      store.all(),
      verifyChain(store),
    ]);

    const totalScans = rows.length;
    let blockedCount = 0;
    let injectionCount = 0;
    let totalRisk = 0;
    const countsByDecision: Record<string, number> = {};
    const blockedCategoriesMap: Record<string, number> = {};

    for (const row of rows) {
      const risk = Number(row.riskScore ?? row.risk_score) || 0;
      totalRisk += risk;

      const isBlocked = row.decision === 'block' || row.action === 'block';
      if (isBlocked) {
        blockedCount++;
      }

      const dec = row.decision || row.action || 'unknown';
      countsByDecision[dec] = (countsByDecision[dec] || 0) + 1;

      const cats = Array.isArray(row.categories) ? row.categories : [];
      let isInjection = false;
      for (const cat of cats) {
        if (typeof cat === 'string') {
          if (cat.toLowerCase().includes('injection')) {
            isInjection = true;
          }
          if (isBlocked) {
            blockedCategoriesMap[cat] = (blockedCategoriesMap[cat] || 0) + 1;
          }
        }
      }
      if (isInjection) {
        injectionCount++;
      }
    }

    const blockedPercent =
      totalScans > 0 ? Math.round((blockedCount / totalScans) * 100) : 0;
    const averageRisk =
      totalScans > 0 ? Math.round(totalRisk / totalScans) : 0;

    const topBlockedCategories = Object.entries(blockedCategoriesMap)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Recent activity: last 8 entries reversed (most recent first)
    // ONLY allow-listed fields: createdAt, action, decision, riskScore, categories
    // NEVER raw prompt, masked prompt, user_id, or IP
    const recentRows = rows.slice(-8).reverse();
    const recentActivity: PublicStatsActivityItem[] = recentRows.map((r) => ({
      createdAt:
        r.createdAt ||
        r.created_at ||
        new Date().toISOString(),
      action: r.action || 'scan',
      decision: r.decision || 'allow',
      riskScore:
        typeof (r.riskScore ?? r.risk_score) === 'number' &&
        !Number.isNaN(r.riskScore ?? r.risk_score)
          ? Number(r.riskScore ?? r.risk_score)
          : 0,
      categories: Array.isArray(r.categories) ? [...r.categories] : [],
    }));

    const latestRow = rows.length > 0 ? rows[rows.length - 1] : null;
    const rawHash = latestRow?.hash || 'GENESIS';
    const latestHashPrefix = rawHash.slice(0, 8);

    const data: PublicStatsResponse = {
      available: true,
      totalScans,
      blockedCount,
      blockedPercent,
      injectionCount,
      averageRisk,
      countsByDecision,
      topBlockedCategories,
      recentActivity,
      chain: {
        valid: Boolean(chainResult.valid),
        entries: Number(chainResult.checked || 0),
        latestHashPrefix,
      },
    };

    // Store in cache
    setCachedPublicStats(data);

    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch {
    // If the database is unreachable return { available: false } with status 200
    return NextResponse.json(
      { available: false },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  }
}
