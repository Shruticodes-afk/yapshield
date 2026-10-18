import { NextResponse } from 'next/server';
import { verifyChain } from '@/lib/audit';
import { SupabaseAuditStore } from '@/lib/audit/supabaseStore';

export async function GET() {
  try {
    const store = new SupabaseAuditStore();
    const result = await verifyChain(store);
    return NextResponse.json(result, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to verify audit chain';
    return NextResponse.json(
      { valid: false, error: message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
