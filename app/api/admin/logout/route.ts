import { NextRequest, NextResponse } from 'next/server';
import { clearSession } from '@/lib/auth';
import { assertSameOrigin, externalOrigin } from '@/lib/http';

export async function POST(request: NextRequest) {
  try { assertSameOrigin(request); } catch { return new NextResponse('Forbidden', { status: 403 }); }
  await clearSession();
  return NextResponse.redirect(new URL('/', externalOrigin(request)), 303);
}
