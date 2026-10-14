'use client';
import { useState } from 'react';
import type { Locale } from '@/lib/i18n';

export default function AccountLogin({locale}:{locale:Locale}){
  const fa=locale==='fa';
  const [mode,setMode]=useState<'login'|'register'>('login');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [confirm,setConfirm]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  async function submit(e:React.FormEvent){
    e.preventDefault();
    setError('');
    if(mode==='register'&&password!==confirm){
      setError(fa?'رمز عبور و تکرار آن یکسان نیست.':'Passwords do not match.');
      return;
    }
    if(password.length<8){
      setError(fa?'رمز عبور باید حداقل ۸ کاراکتر باشد.':'Password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    try{
      const r=await fetch('/api/auth/password',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:mode,email,password,locale}),
      });
      const d=await r.json();
      if(!r.ok){
        const message=
          d.error==='SUSPENDED'?(fa?'حساب شما تعلیق شده است.':'Your account is suspended.'):
          d.error==='EMAIL_EXISTS'?(fa?'این ایمیل قبلاً ثبت شده است. وارد حساب شوید.':'This email is already registered. Sign in instead.'):
          d.error==='ADMIN_REGISTER_DISABLED'?(fa?'حساب مدیر از طریق تنظیمات سرور تعریف می‌شود.':'The administrator account is configured on the server.'):
          d.error==='INVALID_CREDENTIALS'?(fa?'ایمیل یا رمز عبور صحیح نیست.':'Email or password is incorrect.'):
          d.error==='PASSWORD_TOO_SHORT'?(fa?'رمز عبور باید حداقل ۸ کاراکتر باشد.':'Password must be at least 8 characters.'):
          (fa?'انجام عملیات ممکن نشد.':'Could not complete the request.');
        setError(message);
        return;
      }
      location.href='/account';
    }finally{
      setBusy(false);
    }
  }

  function switchMode(next:'login'|'register'){
    setMode(next);
    setPassword('');
    setConfirm('');
    setError('');
  }

  return <main className="authPage">
    <a className="authLocale btn btnGhost" href={`/api/locale?lang=${fa?'en':'fa'}&next=/account`}>{fa?'English':'فارسی'}</a>
    <section className="authVisual">
      <a className="brand lightBrand" href="/"><span><strong>Publio</strong><small>Powered by badje.ir</small></span></a>
      <div className="authPitch">
        <div className="eyebrow light">{fa?'حساب کاربری':'PUBLIO ACCOUNT'}</div>
        <h1>{fa?'کاتالوگ‌های خود را بسازید و مدیریت کنید':'Create and manage your digital catalogs'}</h1>
        <p>{fa?'با ایمیل و رمز عبور وارد شوید. تأیید ایمیل در نسخه بعدی اضافه خواهد شد.':'Sign in with your email and password. Email verification will be added in a later version.'}</p>
      </div>
    </section>
    <section className="authFormWrap">
      <form className="authForm" onSubmit={submit}>
        <div className="formHeading">
          <h2>{mode==='login'?(fa?'ورود':'Sign in'):(fa?'ساخت حساب':'Create account')}</h2>
          <p>{mode==='login'?(fa?'با ایمیل و رمز عبور وارد شوید.':'Use your email and password.'):(fa?'ثبت‌نام رایگان است و ۵۰ مگابایت فضا دریافت می‌کنید.':'Registration is free and includes 50 MB of storage.')}</p>
        </div>
        <div className="authModeSwitch">
          <button type="button" className={mode==='login'?'btn btnPrimary':'btn btnSoft'} onClick={()=>switchMode('login')}>{fa?'ورود':'Sign in'}</button>
          <button type="button" className={mode==='register'?'btn btnPrimary':'btn btnSoft'} onClick={()=>switchMode('register')}>{fa?'ثبت‌نام':'Register'}</button>
        </div>
        {error&&<div className="alertError">{error}</div>}
        <label className="field"><span>{fa?'ایمیل':'Email'}</span><input type="email" required autoFocus value={email} onChange={e=>setEmail(e.target.value)} dir="ltr" autoComplete="email"/></label>
        <label className="field"><span>{fa?'رمز عبور':'Password'}</span><input type="password" required minLength={8} maxLength={200} value={password} onChange={e=>setPassword(e.target.value)} dir="ltr" autoComplete={mode==='login'?'current-password':'new-password'}/></label>
        {mode==='register'&&<label className="field"><span>{fa?'تکرار رمز عبور':'Confirm password'}</span><input type="password" required minLength={8} maxLength={200} value={confirm} onChange={e=>setConfirm(e.target.value)} dir="ltr" autoComplete="new-password"/></label>}
        <button className="btn btnPrimary full" disabled={busy}>{busy?(fa?'لطفاً صبر کنید…':'Please wait…'):mode==='login'?(fa?'ورود به حساب':'Sign in'):(fa?'ساخت حساب رایگان':'Create free account')}</button>
      </form>
    </section>
  </main>;
}
