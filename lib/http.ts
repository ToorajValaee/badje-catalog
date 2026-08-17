import type { NextRequest } from 'next/server';

export function externalOrigin(request: NextRequest) {
  const proto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || request.nextUrl.protocol.replace(':', '');
  const host = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() || request.headers.get('host') || request.nextUrl.host;
  return `${proto}://${host}`;
}

export function assertSameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!origin) return;
  if (origin !== externalOrigin(request)) throw new Error('BAD_ORIGIN');
}
