import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { createHash, timingSafeEqual } from 'node:crypto';
import { env } from '@/lib/env';

const COOKIE_NAME = 'badje_catalog_admin';
const TTL = 60 * 60 * 12;

function key() {
  return new TextEncoder().encode(env().SESSION_SECRET);
}

function safeEqual(a: string, b: string) {
  const aa = createHash('sha256').update(a).digest();
  const bb = createHash('sha256').update(b).digest();
  return timingSafeEqual(aa, bb);
}

export function credentialsValid(username: string, password: string) {
  return safeEqual(username, env().ADMIN_USERNAME) && safeEqual(password, env().ADMIN_PASSWORD);
}

export async function createSession() {
  const token = await new SignJWT({ admin: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${TTL}s`)
    .sign(key());
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env().COOKIE_SECURE === 'true',
    sameSite: 'strict',
    path: '/',
    maxAge: TTL,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function isAdmin() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, key());
    return payload.admin === true;
  } catch {
    return false;
  }
}

export async function requireAdmin() {
  if (!(await isAdmin())) throw new Error('UNAUTHORIZED');
}
