export interface PublicStatsActivityItem {
  createdAt: string;
  action: string;
  decision: string;
  riskScore: number;
  categories: string[];
}

export interface PublicStatsResponse {
  available: boolean;
  totalScans?: number;
  blockedCount?: number;
  blockedPercent?: number;
  injectionCount?: number;
  averageRisk?: number;
  countsByDecision?: Record<string, number>;
  topBlockedCategories?: { category: string; count: number }[];
  recentActivity?: PublicStatsActivityItem[];
  chain?: {
    valid: boolean;
    entries: number;
    latestHashPrefix: string;
  };
}

let statsCache: {
  data: PublicStatsResponse;
  cachedAt: number;
} | null = null;

export const CACHE_TTL_MS = 60 * 1000; // 60 seconds

export function getCachedPublicStats(): PublicStatsResponse | null {
  if (statsCache && Date.now() - statsCache.cachedAt < CACHE_TTL_MS) {
    return statsCache.data;
  }
  return null;
}

export function setCachedPublicStats(data: PublicStatsResponse): void {
  statsCache = {
    data,
    cachedAt: Date.now(),
  };
}

export function _resetPublicStatsCache(): void {
  statsCache = null;
}
