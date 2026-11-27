/**
 * In-Memory Rate Limiting for Gateway Abuse Protection
 *
 * Limits:
 * - send: max 10 requests per 10 minutes per client IP
 * - preview: max 30 requests per 10 minutes per client IP
 *
 * NOTE ON MULTI-INSTANCE SERVERLESS DEPLOYMENTS:
 * An in-memory map is fine, but a shared store (for example Supabase or Upstash)
 * is needed for strict limits on multiple serverless instances; clean up old
 * entries so the map cannot grow without limit.
 */

import net from 'node:net';
import { NextRequest } from 'next/server';

export const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes (600,000 ms)
export const SEND_REQUEST_LIMIT = 10;
export const PREVIEW_REQUEST_LIMIT = 30;
export const PUBLIC_STATS_REQUEST_LIMIT = 30;

export type RateLimitMode = 'send' | 'preview' | 'public-stats';

// Internal map storing request timestamps per `${clientIp}:${mode}`
const rateLimitStore = new Map<string, number[]>();
let lastCleanupTime = 0;

/**
 * Validates whether a candidate string is a well-formed IPv4 or IPv6 address.
 */
export function isValidIp(ip: string): boolean {
  return typeof ip === 'string' && net.isIP(ip) !== 0;
}

/**
 * Extracts client IP prioritizing the x-forwarded-for header.
 * If comma-separated, takes the first (originating client) IP address and validates it.
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    let first = forwarded.split(',')[0]?.trim();
    if (first) {
      // Strip port if formatted as IPv4 host:port (e.g. 192.0.2.1:8080)
      if (
        first.includes(':') &&
        !first.includes('::') &&
        first.split(':').length === 2
      ) {
        first = first.split(':')[0].trim();
      }
      if (isValidIp(first)) {
        return first;
      }
    }
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp && isValidIp(realIp.trim())) {
    return realIp.trim();
  }

  if (request.ip && isValidIp(request.ip)) {
    return request.ip;
  }

  return '127.0.0.1';
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number;
}

/**
 * Prunes expired timestamps and deletes empty keys so the in-memory map cannot grow without limit.
 */
export function cleanupExpiredEntries(now: number = Date.now()): void {
  rateLimitStore.forEach((timestamps, key) => {
    const valid = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    if (valid.length === 0) {
      rateLimitStore.delete(key);
    } else {
      rateLimitStore.set(key, valid);
    }
  });
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

  // Clean up old entries periodically so the map cannot grow without limit
  if (now - lastCleanupTime > 60000 || rateLimitStore.size > 200) {
    lastCleanupTime = now;
    cleanupExpiredEntries(now);
  }

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

  return { allowed: true, retryAfter: 0 };
}

/**
 * Returns the current count of keys in the rate limit store. Useful for testing cleanup.
 */
export function _getRateLimitStoreSize(): number {
  return rateLimitStore.size;
}

/**
 * Clears the rate limit store. Useful for testing suites.
 */
export function _resetRateLimitStore(): void {
  rateLimitStore.clear();
  lastCleanupTime = 0;
}
