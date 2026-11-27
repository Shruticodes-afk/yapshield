import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { NextRequest } from 'next/server';
import fs from 'node:fs';
import { POST } from '@/app/api/gateway/route';
import {
  checkRateLimit,
  getClientIp,
  isValidIp,
  cleanupExpiredEntries,
  _resetRateLimitStore,
  _getRateLimitStoreSize,
  SEND_REQUEST_LIMIT,
  PREVIEW_REQUEST_LIMIT,
  RATE_LIMIT_WINDOW_MS,
} from '@/lib/gateway/rateLimit';
import * as gatewayModule from '@/lib/gateway';

describe('Gateway Route Abuse Protection & Rate Limiting', () => {
  const originalKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    _resetRateLimitStore();
    vi.restoreAllMocks();
  });

  afterAll(() => {
    if (originalKey) process.env.GEMINI_API_KEY = originalKey;
    else delete process.env.GEMINI_API_KEY;
  });

  // ---------------------------------------------------------------------------
  // 1. Send Rate Limiting (Max 10 requests per 10 minutes)
  // ---------------------------------------------------------------------------
  describe('Send Rate Limiting', () => {
    it('allows up to 10 send requests and returns 429 on the 11th request', async () => {
      vi.spyOn(gatewayModule, 'runGateway').mockResolvedValue({
        status: 'ok',
        answer: 'Response',
        risk: { score: 0, level: 'low', reasons: [] },
        sanitizedPrompt: 'Test prompt',
        tokenMap: [],
      });

      const clientIp = '203.0.113.10';

      // Send 10 successful requests
      for (let i = 1; i <= SEND_REQUEST_LIMIT; i++) {
        const req = new NextRequest('http://localhost:3000/api/gateway', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-forwarded-for': clientIp,
          },
          body: JSON.stringify({
            prompt: `Valid prompt #${i}`,
            mode: 'send',
          }),
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
      }

      // 11th request must be rejected with 429
      const req11 = new NextRequest('http://localhost:3000/api/gateway', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': clientIp,
        },
        body: JSON.stringify({
          prompt: '11th send attempt',
          mode: 'send',
        }),
      });

      const res11 = await POST(req11);
      expect(res11.status).toBe(429);

      // Verify Retry-After header
      const retryAfter = res11.headers.get('Retry-After');
      expect(retryAfter).toBeDefined();
      expect(Number(retryAfter)).toBeGreaterThanOrEqual(1);
      expect(Number(retryAfter)).toBeLessThanOrEqual(600);

      // Verify JSON payload
      const json = await res11.json();
      expect(json).toEqual({ message: 'Too many requests' });
    });

    it('resets rate limit allowance after the 10-minute sliding window expires', () => {
      const ip = '198.51.100.99';
      const baseTime = 1700000000000;

      // Exhaust limit at baseTime
      for (let i = 0; i < SEND_REQUEST_LIMIT; i++) {
        const res = checkRateLimit(ip, 'send', baseTime + i * 1000);
        expect(res.allowed).toBe(true);
      }

      // Blocked while inside window
      const blockedRes = checkRateLimit(ip, 'send', baseTime + 10000);
      expect(blockedRes.allowed).toBe(false);
      expect(blockedRes.retryAfter).toBeGreaterThan(0);

      // After 10 minutes + 1 second (600,001 ms), oldest request has expired
      const afterWindowRes = checkRateLimit(
        ip,
        'send',
        baseTime + RATE_LIMIT_WINDOW_MS + 1000
      );
      expect(afterWindowRes.allowed).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Preview Rate Limiting (Max 30 requests per 10 minutes)
  // ---------------------------------------------------------------------------
  describe('Preview Rate Limiting', () => {
    it('allows up to 30 preview requests and returns 429 on the 31st request', async () => {
      vi.spyOn(gatewayModule, 'runGateway').mockResolvedValue({
        status: 'preview',
        requestId: 'req_preview',
        decision: 'allow',
        risk: { score: 0, level: 'low', reasons: [] },
        findings: [],
        sanitizedPreview: 'Preview prompt',
      });

      const clientIp = '203.0.113.20';

      // Send 30 preview requests
      for (let i = 1; i <= PREVIEW_REQUEST_LIMIT; i++) {
        const req = new NextRequest('http://localhost:3000/api/gateway', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-forwarded-for': clientIp,
          },
          body: JSON.stringify({
            prompt: `Preview query #${i}`,
            mode: 'preview',
          }),
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
      }

      // 31st request must be rejected with 429
      const req31 = new NextRequest('http://localhost:3000/api/gateway', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': clientIp,
        },
        body: JSON.stringify({
          prompt: '31st preview attempt',
          mode: 'preview',
        }),
      });

      const res31 = await POST(req31);
      expect(res31.status).toBe(429);

      const retryAfter = res31.headers.get('Retry-After');
      expect(retryAfter).toBeDefined();
      expect(Number(retryAfter)).toBeGreaterThanOrEqual(1);

      const json = await res31.json();
      expect(json).toEqual({ message: 'Too many requests' });
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Independent Limits per IP and Mode
  // ---------------------------------------------------------------------------
  describe('IP and Mode Isolation', () => {
    it('rate limiting one IP does not affect a different client IP', async () => {
      vi.spyOn(gatewayModule, 'runGateway').mockResolvedValue({
        status: 'ok',
        answer: 'Response',
        risk: { score: 0, level: 'low', reasons: [] },
        sanitizedPrompt: 'Test',
        tokenMap: [],
      });

      const ipBlocked = '198.51.100.1';
      const ipAllowed = '198.51.100.2';

      // Exhaust send limit for ipBlocked
      for (let i = 0; i < 10; i++) {
        checkRateLimit(ipBlocked, 'send');
      }

      // Request from ipBlocked gets 429
      const reqBlocked = new NextRequest('http://localhost:3000/api/gateway', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': ipBlocked,
        },
        body: JSON.stringify({ prompt: 'Blocked', mode: 'send' }),
      });
      const resBlocked = await POST(reqBlocked);
      expect(resBlocked.status).toBe(429);

      // Request from ipAllowed succeeds with 200
      const reqAllowed = new NextRequest('http://localhost:3000/api/gateway', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': ipAllowed,
        },
        body: JSON.stringify({ prompt: 'Allowed', mode: 'send' }),
      });
      const resAllowed = await POST(reqAllowed);
      expect(resAllowed.status).toBe(200);
    });

    it('an IP that exhausted send requests can still make preview requests', async () => {
      vi.spyOn(gatewayModule, 'runGateway').mockResolvedValue({
        status: 'preview',
        requestId: 'req_preview',
        decision: 'allow',
        risk: { score: 0, level: 'low', reasons: [] },
        findings: [],
        sanitizedPreview: 'Preview',
      });

      const ip = '198.51.100.5';

      // Exhaust 10 send requests
      for (let i = 0; i < 10; i++) {
        checkRateLimit(ip, 'send');
      }

      // Send request is blocked with 429
      const reqSend = new NextRequest('http://localhost:3000/api/gateway', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': ip,
        },
        body: JSON.stringify({ prompt: 'Send prompt', mode: 'send' }),
      });
      const resSend = await POST(reqSend);
      expect(resSend.status).toBe(429);

      // Preview request from the same IP is still allowed
      const reqPreview = new NextRequest('http://localhost:3000/api/gateway', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': ip,
        },
        body: JSON.stringify({ prompt: 'Preview prompt', mode: 'preview' }),
      });
      const resPreview = await POST(reqPreview);
      expect(resPreview.status).toBe(200);
    });

    it('extracts client IP correctly from comma-separated x-forwarded-for header', () => {
      const req = new NextRequest('http://localhost:3000/api/gateway', {
        headers: {
          'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178',
        },
      });
      expect(getClientIp(req)).toBe('203.0.113.195');
    });

    it('validates client IP and falls back safely when x-forwarded-for contains invalid characters', () => {
      // Valid IPv4
      expect(isValidIp('198.51.100.1')).toBe(true);
      // Valid IPv6
      expect(isValidIp('2001:db8::1')).toBe(true);
      // Invalid strings
      expect(isValidIp('not-an-ip')).toBe(false);
      expect(isValidIp('<script>alert(1)</script>')).toBe(false);
      expect(isValidIp('; drop table users;')).toBe(false);

      // Request with malformed IP falls back safely
      const reqInvalid = new NextRequest('http://localhost:3000/api/gateway', {
        headers: {
          'x-forwarded-for': 'malformed-client-ip, 198.51.100.1',
        },
      });
      expect(getClientIp(reqInvalid)).toBe('127.0.0.1');

      // Request with IPv4 host:port strips port and validates IP
      const reqWithPort = new NextRequest('http://localhost:3000/api/gateway', {
        headers: {
          'x-forwarded-for': '203.0.113.50:8080',
        },
      });
      expect(getClientIp(reqWithPort)).toBe('203.0.113.50');
    });

    it('cleans up expired entries so the in-memory map cannot grow without limit', () => {
      _resetRateLimitStore();
      const now = 1700000000000;

      // Populate 10 different IP keys
      for (let i = 1; i <= 10; i++) {
        checkRateLimit(`198.51.100.${i}`, 'send', now);
      }
      expect(_getRateLimitStoreSize()).toBe(10);

      // Advance time beyond the 10-minute window
      const futureTime = now + RATE_LIMIT_WINDOW_MS + 5000;
      cleanupExpiredEntries(futureTime);

      // All expired entries have been pruned
      expect(_getRateLimitStoreSize()).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Prompt Length Limit (Max 4000 characters)
  // ---------------------------------------------------------------------------
  describe('Prompt Length Limit (4000 characters)', () => {
    it('rejects prompts longer than 4000 characters with HTTP 400 in send mode', async () => {
      const longPrompt = 'a'.repeat(4001);

      const req = new NextRequest('http://localhost:3000/api/gateway', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '198.51.100.99',
        },
        body: JSON.stringify({
          prompt: longPrompt,
          mode: 'send',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.status).toBe('bad_input');
      expect(json.message).toMatch(/4000/);
    });

    it('rejects prompts longer than 4000 characters with HTTP 400 in preview mode', async () => {
      const longPrompt = 'a'.repeat(4001);

      const req = new NextRequest('http://localhost:3000/api/gateway', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '198.51.100.99',
        },
        body: JSON.stringify({
          prompt: longPrompt,
          mode: 'preview',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.status).toBe('bad_input');
      expect(json.message).toMatch(/4000/);
    });

    it('accepts prompts of exactly 4000 characters', async () => {
      const runGatewaySpy = vi
        .spyOn(gatewayModule, 'runGateway')
        .mockResolvedValue({
          status: 'ok',
          answer: 'OK',
          risk: { score: 0, level: 'low', reasons: [] },
          sanitizedPrompt: 'OK',
          tokenMap: [],
        });

      const maxAllowedPrompt = 'b'.repeat(4000);

      const req = new NextRequest('http://localhost:3000/api/gateway', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '198.51.100.99',
        },
        body: JSON.stringify({
          prompt: maxAllowedPrompt,
          mode: 'send',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(runGatewaySpy).toHaveBeenCalled();
    });

    it('preserves existing validation for empty or whitespace prompts', async () => {
      const reqEmpty = new NextRequest('http://localhost:3000/api/gateway', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '198.51.100.99',
        },
        body: JSON.stringify({
          prompt: '   ',
          mode: 'send',
        }),
      });

      const resEmpty = await POST(reqEmpty);
      expect(resEmpty.status).toBe(400);

      const json = await resEmpty.json();
      expect(json.status).toBe('bad_input');
      expect(json.message).toMatch(/non-empty string/i);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Privacy: Never log IP together with prompt content
  // ---------------------------------------------------------------------------
  describe('Logging Privacy Guarantees', () => {
    it('never logs client IP together with prompt content', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log');
      const consoleErrorSpy = vi.spyOn(console, 'error');
      const consoleWarnSpy = vi.spyOn(console, 'warn');

      const testIp = '198.51.100.77';
      const secretSnippet = 'UNIQUE_PROMPT_SECRET_STRING_98765';

      // 1. Send 10 requests to trigger rate limit on 11th
      for (let i = 0; i < 10; i++) {
        checkRateLimit(testIp, 'send');
      }

      // 11th request (rate limited)
      const req429 = new NextRequest('http://localhost:3000/api/gateway', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': testIp,
        },
        body: JSON.stringify({
          prompt: `User asking for help with ${secretSnippet}`,
          mode: 'send',
        }),
      });

      await POST(req429);

      // Check all log calls
      const allCalls = [
        ...consoleLogSpy.mock.calls,
        ...consoleErrorSpy.mock.calls,
        ...consoleWarnSpy.mock.calls,
      ];

      for (const callArgs of allCalls) {
        const callString = callArgs
          .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg)))
          .join(' ');

        // It must NEVER contain both the IP and the prompt snippet in the same log
        const hasIp = callString.includes(testIp);
        const hasPrompt = callString.includes(secretSnippet);
        expect(hasIp && hasPrompt).toBe(false);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Server-Timing Header and Preferred Region
  // ---------------------------------------------------------------------------
  describe('Server-Timing & Deployment Configuration', () => {
    it('sets the Server-Timing header on the response when timings are present', async () => {
      vi.spyOn(gatewayModule, 'runGateway').mockResolvedValue({
        status: 'ok',
        answer: 'Response with timings',
        risk: { score: 0, level: 'low', reasons: [] },
        sanitizedPrompt: 'Test prompt',
        tokenMap: [],
        timings: {
          validate: 0.1,
          detect: 3.2,
          policy: 0.4,
          vaultSave: 0,
          vault_save: 0,
          llm: 250.5,
          restore: 0.2,
          vaultRemove: 0,
          vault_remove: 0,
          auditWrites: 12.1,
          audit_writes: 12.1,
          total: 266.5,
          attempts: 1,
        },
      });

      const req = new NextRequest('http://localhost:3000/api/gateway', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '198.51.100.22',
        },
        body: JSON.stringify({
          prompt: 'Hello with timings',
          mode: 'send',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const serverTiming = res.headers.get('Server-Timing');
      expect(serverTiming).toBeDefined();
      expect(serverTiming).toContain('validate;dur=0.1');
      expect(serverTiming).toContain('detect;dur=3.2');
      expect(serverTiming).toContain('llm;dur=250.5');
      expect(serverTiming).toContain('total;dur=266.5');
    });

    it('exports preferredRegion matching VERCEL_FUNCTION_REGION or defaults to bom1', async () => {
      const { preferredRegion } = await import('@/app/api/gateway/route');
      expect(preferredRegion).toBeDefined();
      expect(typeof preferredRegion).toBe('string');
      expect(preferredRegion.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Playground Error Messaging & Warning Style
  // ---------------------------------------------------------------------------
  describe('Playground Error Messaging & Warning Style', () => {
    it('contains the clear 429 message and 4000 character length limit error handling', () => {
      const playgroundSource = fs.readFileSync('app/playground/page.tsx', 'utf8');

      // Requirement 4: 'Too many requests, please wait a few minutes'
      expect(playgroundSource).toContain('Too many requests, please wait a few minutes');

      // Requirement 4: length error message
      expect(playgroundSource).toContain('Prompt exceeds maximum length of 4000 characters.');

      // Same warning style as technical errors: neutral surface with amber accent
      expect(playgroundSource).toContain('errorMessage.includes(\'Too many requests\') || errorMessage.includes(\'4000\')');
    });
  });
});
