import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { assertSameOrigin } from '@/lib/http';
import { createOtp, normalizeEmail } from '@/lib/accounts';
import { isAdminEmail } from '@/lib/auth';
import { db, ensureSchema } from '@/lib/db';
import { users } from '@/lib/schema';
import { normalizeLocale } from '@/lib/i18n';
import { sendOtpMail } from '@/lib/email';
export async function POST(request:NextRequest){try{assertSameOrigin(request);const body=await request.json();const email=normalizeEmail(String(body.email||''));if(!/^\S+@\S+\.\S+$/.test(email))return NextResponse.json({error:'INVALID_EMAIL'},{status:400});const locale=normalizeLocale(body.locale);await ensureSchema();if(!isAdminEmail(email)){const [user]=await db().select().from(users).where(eq(users.email,email)).limit(1);if(user?.status==='suspended')return NextResponse.json({error:'SUSPENDED'},{status:403});}const code=await createOtp(email,locale);const sent=await sendOtpMail(email,code,locale);if(!sent)return NextResponse.json({error:'EMAIL_NOT_CONFIGURED'},{status:503});return NextResponse.json({ok:true});}catch(e){console.error(e);return NextResponse.json({error:'OTP_REQUEST_FAILED'},{status:500});}}
