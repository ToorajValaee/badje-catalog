import { NextRequest, NextResponse } from 'next/server';
import { assertSameOrigin } from '@/lib/http';
import { consumeOtp, getOrCreateUser, normalizeEmail, normalizeOtp } from '@/lib/accounts';
import { createUserSession } from '@/lib/auth';
import { normalizeLocale } from '@/lib/i18n';
import { sendWelcomeMail } from '@/lib/email';
export async function POST(request:NextRequest){try{assertSameOrigin(request);const body=await request.json();const email=normalizeEmail(String(body.email||''));const code=normalizeOtp(String(body.code||''));const locale=normalizeLocale(body.locale);if(!(await consumeOtp(email,code)))return NextResponse.json({error:'INVALID_OTP'},{status:400});const user=await getOrCreateUser(email,locale);if(user.status==='suspended')return NextResponse.json({error:'SUSPENDED'},{status:403});const isNew=Math.abs(Date.now()-user.createdAt.getTime())<60000;if(isNew)await sendWelcomeMail(email,locale).catch(()=>undefined);await createUserSession(user.id);return NextResponse.json({ok:true});}catch(e){console.error(e);return NextResponse.json({error:'VERIFY_FAILED'},{status:500});}}
