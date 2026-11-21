export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Region should match the Supabase project region (e.g. 'bom1' for Mumbai) to minimize DB roundtrip latency
export const preferredRegion = process.env.VERCEL_FUNCTION_REGION || 'bom1';

import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import {
  runGateway,
  GatewayInput,
  GatewayStage,
  isPotentiallySensitive,
  SensitiveLogContext,
  getClientIp,
  checkRateLimit,
  classifyGatewayError,
} from '@/lib/gateway';
import { makeGeminiLlm } from '@/lib/gateway/gemini';
import { SupabaseVaultStore } from '@/lib/vault/supabaseStore';
import { SupabaseAuditStore } from '@/lib/audit/supabaseStore';
import { getServiceSupabase } from '@/lib/supabase';

// Module-level singletons to reuse client connections across requests
const defaultVaultStore = new SupabaseVaultStore();
const defaultAuditStore = new SupabaseAuditStore();

function formatServerTiming(timings: Record<string, number>): string {
  const parts: string[] = [];
  const keys = [
    'validate',
    'detect',
    'policy',
    'vaultSave',
    'llm',
    'restore',
    'vaultRemove',
    'auditWrites',
    'total',
  ];
  for (const key of keys) {
    if (typeof timings[key] === 'number') {
      parts.push(`${key};dur=${timings[key]}`);
    }
  }
  return parts.join(', ');
}

function logGatewayError(
  stage: GatewayStage,
  error: unknown,
  context?: SensitiveLogContext
): void {
  const isSensitive = isPotentiallySensitive(error, stage, context);

  if (isSensitive) {
    console.error(
      '[gateway]',
      stage,
      error instanceof Error ? error.name : 'unknown error'
    );
  } else {
    console.error(
      '[gateway]',
      stage,
      error instanceof Error
        ? error.name + ': ' + error.message
        : 'unknown error'
    );
  }
}

export async function POST(request: NextRequest) {
  let stage: GatewayStage = 'validate';

  try {
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch (error) {
      logGatewayError('validate', error);
      return NextResponse.json(
        { status: 'bad_input', message: 'Invalid JSON payload in request body.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // 1. Abuse Protection: Rate Limiting per Client IP (x-forwarded-for header)
    // Allows at most 10 send requests and 30 preview requests per 10 minutes.
    // NOTE: This in-memory rate limiter tracks requests per serverless instance.
    // For strict rate limits across multiple concurrent serverless instances,
    // a shared store (for example Supabase or Upstash Redis) is required.
    const clientIp = getClientIp(request);
    const mode = body.mode === 'preview' ? 'preview' : 'send';
    const rateLimit = checkRateLimit(clientIp, mode);

    if (!rateLimit.allowed) {
      // Requirement 3: Never log the IP together with prompt content
      console.warn('[gateway]', 'rate_limit', mode);
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

    // 2. Abuse Protection: Reject prompts longer than 4000 characters on this public deployment
    if (typeof body.prompt === 'string' && body.prompt.length > 4000) {
      return NextResponse.json(
        {
          status: 'bad_input',
          message:
            'Prompt exceeds maximum length of 4000 characters for this deployment.',
        },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Strict validation for optional protectedWords: max 10 strings, 2-40 chars, no control chars
    let validatedProtectedWords: string[] | undefined = undefined;
    if (body.protectedWords !== undefined && body.protectedWords !== null) {
      if (!Array.isArray(body.protectedWords) || body.protectedWords.length > 10) {
        return NextResponse.json(
          {
            status: 'bad_input',
            message: 'protectedWords must be an array of at most 10 items.',
          },
          { status: 400, headers: { 'Cache-Control': 'no-store' } }
        );
      }
      const words: string[] = [];
      for (const item of body.protectedWords) {
        if (typeof item !== 'string') {
          return NextResponse.json(
            {
              status: 'bad_input',
              message: 'Each item in protectedWords must be a string.',
            },
            { status: 400, headers: { 'Cache-Control': 'no-store' } }
          );
        }
        const trimmed = item.trim();
        if (
          trimmed.length < 2 ||
          trimmed.length > 40 ||
          /[\x00-\x1F\x7F]/.test(trimmed)
        ) {
          return NextResponse.json(
            {
              status: 'bad_input',
              message:
                'Each protected word must be between 2 and 40 characters and cannot contain control characters.',
            },
            { status: 400, headers: { 'Cache-Control': 'no-store' } }
          );
        }
        words.push(trimmed);
      }
      validatedProtectedWords = words;
    }

    // Extract optional user identity from Authorization Bearer token
    let userId: string | null = null;
    const authHeader =
      request.headers.get('Authorization') ||
      request.headers.get('authorization');

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      if (token) {
        try {
          const supabase = getServiceSupabase();
          const {
            data: { user },
          } = await supabase.auth.getUser(token);
          if (user?.id) {
            userId = user.id;
          }
        } catch (error) {
          logGatewayError('validate', error);
          // Fall back to anonymous user if verification fails
          userId = null;
        }
      }
    }

    // Set up LLM instance
    let llm: (prompt: string) => Promise<string | { text: string; model?: string; attempts?: number }>;
    try {
      llm = makeGeminiLlm();
    } catch (error) {
      logGatewayError('llm', error);
      llm = async () => {
        throw new Error('LLM execution unavailable: missing GEMINI_API_KEY.');
      };
    }

    stage = 'validate';
    const gatewayInput: GatewayInput = {
      prompt: typeof body.prompt === 'string' ? body.prompt : '',
      mode: body.mode as 'preview' | 'send',
      policyName: body.policyName as GatewayInput['policyName'],
      overrides: Array.isArray(body.overrides)
        ? (body.overrides as GatewayInput['overrides'])
        : undefined,
      userId:
        typeof body.userId === 'string' || body.userId === null
          ? (body.userId as string | null)
          : userId,
      protectedWords: validatedProtectedWords,
    };

    const result = await runGateway(gatewayInput, {
      llm,
      vaultStore: defaultVaultStore,
      auditStore: defaultAuditStore,
      waitUntil,
    });

    // Map result statuses to HTTP response codes
    let httpStatus = 200;
    if (result.status === 'ok' || result.status === 'preview') {
      httpStatus = 200;
    } else if (result.status === 'blocked') {
      httpStatus = 403;
    } else if (result.status === 'bad_input') {
      httpStatus = 400;
    } else {
      httpStatus = 500;
    }

    const responseHeaders: Record<string, string> = {
      'Cache-Control': 'no-store',
    };

    if (result.timings) {
      const serverTiming = formatServerTiming(result.timings);
      if (serverTiming) {
        responseHeaders['Server-Timing'] = serverTiming;
      }
    }

    return NextResponse.json(result, {
      status: httpStatus,
      headers: responseHeaders,
    });
  } catch (error) {
    // FAIL CLOSED: any unexpected unhandled error returns safe fail-closed error
    logGatewayError(stage, error);
    const errorInfo = classifyGatewayError(error, stage);
    return NextResponse.json(
      {
        status: 'error',
        code: errorInfo.code,
        reason: errorInfo.reason,
        message: errorInfo.message,
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
