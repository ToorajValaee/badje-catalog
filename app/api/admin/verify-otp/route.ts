import { NextRequest, NextResponse } from 'next/server';
import { assertSameOrigin } from '@/lib/http';
import { consumeOtp, normalizeOtp } from '@/lib/accounts';
import { ADMIN_EMAIL, createSession } from '@/lib/auth';

export async function POST(request:NextRequest){
  try{
    assertSameOrigin(request);
    const body=await request.json();
    const code=normalizeOtp(String(body.code||''));
    if(!(await consumeOtp(ADMIN_EMAIL,code)))return NextResponse.json({error:'INVALID_OTP'},{status:400});
    await createSession();
    return NextResponse.json({ok:true});
  }catch(error){console.error(error);return NextResponse.json({error:'VERIFY_FAILED'},{status:500});}
}
