import { NextRequest, NextResponse } from 'next/server';
import { assertSameOrigin } from '@/lib/http';
import { createOtp } from '@/lib/accounts';
import { ADMIN_EMAIL } from '@/lib/auth';
import { normalizeLocale } from '@/lib/i18n';
import { sendOtpMail } from '@/lib/email';

export async function POST(request:NextRequest){
  try{
    assertSameOrigin(request);
    const body=await request.json().catch(()=>({}));
    const locale=normalizeLocale(body.locale);
    const code=await createOtp(ADMIN_EMAIL,locale);
    const sent=await sendOtpMail(ADMIN_EMAIL,code,locale);
    if(!sent)return NextResponse.json({error:'EMAIL_NOT_CONFIGURED'},{status:503});
    return NextResponse.json({ok:true,email:ADMIN_EMAIL});
  }catch(error){console.error(error);return NextResponse.json({error:'OTP_REQUEST_FAILED'},{status:500});}
}
