import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'YapShield Gateway API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return NextResponse.json({
      status: 'received',
      gateway: 'YapShield',
      data: body,
      processedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON payload in request body' },
      { status: 400 }
    );
  }
}
