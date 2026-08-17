import { NextRequest, NextResponse } from 'next/server';
import { createSession, credentialsValid } from '@/lib/auth';
import { externalOrigin } from '@/lib/http';

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const username = String(form.get('username') || '').trim();
  const password = String(form.get('password') || '');
  if (!credentialsValid(username, password)) {
    return NextResponse.redirect(new URL('/admin/login?error=1', externalOrigin(request)), 303);
  }
  await createSession();
  return NextResponse.redirect(new URL('/admin', externalOrigin(request)), 303);
}
