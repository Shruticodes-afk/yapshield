import { NextRequest, NextResponse } from 'next/server';
import { runGateway, GatewayInput } from '@/lib/gateway';
import { makeGeminiLlm } from '@/lib/gateway/gemini';
import { SupabaseVaultStore } from '@/lib/vault/supabaseStore';
import { SupabaseAuditStore } from '@/lib/audit/supabaseStore';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
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
      } catch {
        // Fall back to anonymous user if verification fails
        userId = null;
      }
    }
  }

  // Set up LLM instance
  let llm: (prompt: string) => Promise<string>;
  try {
    llm = makeGeminiLlm();
  } catch {
    llm = async () => {
      throw new Error('LLM execution unavailable: missing GEMINI_API_KEY.');
    };
  }

  const vaultStore = new SupabaseVaultStore();
  const auditStore = new SupabaseAuditStore();

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
}
