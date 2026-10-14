import { NextRequest, NextResponse } from 'next/server';
import { assertSameOrigin } from '@/lib/http';
import { normalizeEmail, passwordUser, registerUser, validatePassword } from '@/lib/accounts';
import { clearAuthSessions, createSession, createUserSession, isAdminEmail, verifyAdminPassword } from '@/lib/auth';
import { normalizeLocale } from '@/lib/i18n';

export async function POST(request:NextRequest){
  try{
    assertSameOrigin(request);
    const body=await request.json().catch(()=>({}));
    const action=body.action==='register'?'register':'login';
    const email=normalizeEmail(String(body.email||''));
    const password=String(body.password||'');
    const locale=normalizeLocale(body.locale);

    if(!/^\S+@\S+\.\S+$/.test(email))return NextResponse.json({error:'INVALID_EMAIL'},{status:400});
    try{validatePassword(password);}catch(e){
      const message=e instanceof Error?e.message:'INVALID_PASSWORD';
      return NextResponse.json({error:message},{status:400});
    }

    await clearAuthSessions();

    if(isAdminEmail(email)){
      if(action==='register')return NextResponse.json({error:'ADMIN_REGISTER_DISABLED'},{status:400});
      if(!verifyAdminPassword(password))return NextResponse.json({error:'INVALID_CREDENTIALS'},{status:401});
      await createSession(email);
      return NextResponse.json({ok:true,role:'admin'});
    }

    if(action==='register'){
      try{
        const user=await registerUser(email,password,locale);
        if(user.status==='suspended')return NextResponse.json({error:'SUSPENDED'},{status:403});
        await createUserSession(user.id);
        return NextResponse.json({ok:true,role:'user',registered:true});
      }catch(e){
        const message=e instanceof Error?e.message:'REGISTER_FAILED';
        const status=message==='EMAIL_EXISTS'?409:message.startsWith('PASSWORD_')?400:500;
        return NextResponse.json({error:message},{status});
      }
    }

    const user=await passwordUser(email,password,locale);
    if(!user)return NextResponse.json({error:'INVALID_CREDENTIALS'},{status:401});
    if(user.status==='suspended')return NextResponse.json({error:'SUSPENDED'},{status:403});
    await createUserSession(user.id);
    return NextResponse.json({ok:true,role:'user'});
  }catch(e){
    console.error(e);
    return NextResponse.json({error:'AUTH_FAILED'},{status:500});
  }
}
