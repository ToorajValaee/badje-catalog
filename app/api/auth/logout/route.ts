import { NextResponse } from 'next/server';
import { clearUserSession } from '@/lib/auth';
export async function POST(){await clearUserSession();return NextResponse.redirect(new URL('/account',process.env.NEXT_PUBLIC_BASE_URL||'http://localhost:8000'),303);}
