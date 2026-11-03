import { NextRequest, NextResponse } from 'next/server';
import { verifyChain } from '@/lib/audit';
import { SupabaseAuditStore } from '@/lib/audit/supabaseStore';
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
