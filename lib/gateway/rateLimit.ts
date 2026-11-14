/**
 * In-Memory Rate Limiting for Gateway Abuse Protection
 *
 * Limits:
 * - send: max 10 requests per 10 minutes per client IP
 * - preview: max 30 requests per 10 minutes per client IP
 *
 * NOTE ON MULTI-INSTANCE SERVERLESS DEPLOYMENTS:
 * This in-memory map is scoped to the current Node.js process instance.
 * In a distributed, multi-instance serverless environment (such as Vercel or AWS Lambda),
 * each serverless instance maintains its own isolated memory state.
 * For strict, globally synchronized rate limits across multiple concurrent serverless
 * instances, a shared store (for example Supabase or Upstash Redis) is required.
 */

import { NextRequest } from 'next/server';

export const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes (600,000 ms)
export const SEND_REQUEST_LIMIT = 10;
export const PREVIEW_REQUEST_LIMIT = 30;
export const PUBLIC_STATS_REQUEST_LIMIT = 30;

export type RateLimitMode = 'send' | 'preview' | 'public-stats';

// Internal map storing request timestamps per `${clientIp}:${mode}`
const rateLimitStore = new Map<string, number[]>();

/**
 * Extracts client IP prioritizing the x-forwarded-for header.
 * If comma-separated, takes the first (originating client) IP address.
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) {
      // Strip port if formatted as IPv4 host:port
      if (
        first.includes(':') &&
        !first.includes('::') &&
        first.split(':').length === 2
      ) {
        return first.split(':')[0].trim();
      }
      return first;
    }
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp && realIp.trim()) {
    return realIp.trim();
  }

  return request.ip || '127.0.0.1';
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number;
}

/**
 * Checks whether a request exceeds the allowed quota for the given IP and mode.
 * - send: max 10 requests per 10 minutes
 * - preview: max 30 requests per 10 minutes
 * - public-stats: max 30 requests per 10 minutes
 */
export function checkRateLimit(
  ip: string,
  mode: RateLimitMode,
  now: number = Date.now()
): RateLimitResult {
  let limit: number;
  if (mode === 'send') {
    limit = SEND_REQUEST_LIMIT;
  } else if (mode === 'preview') {
    limit = PREVIEW_REQUEST_LIMIT;
  } else {
    limit = PUBLIC_STATS_REQUEST_LIMIT;
  }
  const key = `${ip}:${mode}`;

  const currentTimestamps = rateLimitStore.get(key) || [];
  // Retain only timestamps within the active sliding window
  const activeTimestamps = currentTimestamps.filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
  );

  if (activeTimestamps.length >= limit) {
    const oldestTimestamp = activeTimestamps[0];
    const retryAfter = Math.max(
      1,
      Math.ceil((oldestTimestamp + RATE_LIMIT_WINDOW_MS - now) / 1000)
    );
    rateLimitStore.set(key, activeTimestamps);
    return { allowed: false, retryAfter };
  }

  activeTimestamps.push(now);
  rateLimitStore.set(key, activeTimestamps);

  // Periodic cleanup if store exceeds 1000 keys
  if (rateLimitStore.size > 1000) {
    rateLimitStore.forEach((timestamps, k) => {
      const valid = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
      if (valid.length === 0) {
        rateLimitStore.delete(k);
      } else {
        rateLimitStore.set(k, valid);
      }
    });
  }

  return { allowed: true, retryAfter: 0 };
}

/**
 * Clears the rate limit store. Useful for testing suites.
 */
export function _resetRateLimitStore(): void {
  rateLimitStore.clear();
}
