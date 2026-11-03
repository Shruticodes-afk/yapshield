import { NextRequest, NextResponse } from 'next/server';
import {
  runGateway,
  GatewayInput,
  GatewayStage,
  isPotentiallySensitive,
  SensitiveLogContext,
} from '@/lib/gateway';
import { makeGeminiLlm } from '@/lib/gateway/gemini';
import { SupabaseVaultStore } from '@/lib/vault/supabaseStore';
import { SupabaseAuditStore } from '@/lib/audit/supabaseStore';
import { getServiceSupabase } from '@/lib/supabase';

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
    let llm: (prompt: string) => Promise<string>;
    try {
      llm = makeGeminiLlm();
    } catch (error) {
      logGatewayError('llm', error);
      llm = async () => {
        throw new Error('LLM execution unavailable: missing GEMINI_API_KEY.');
      };
    }

    const vaultStore = new SupabaseVaultStore();
    const auditStore = new SupabaseAuditStore();

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
    };

    const result = await runGateway(gatewayInput, {
      llm,
      vaultStore,
      auditStore,
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

    return NextResponse.json(result, {
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    // FAIL CLOSED: any unexpected unhandled error returns safe fail-closed error
    logGatewayError(stage, error);
    return NextResponse.json(
      { status: 'error', message: 'Request blocked for safety' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
