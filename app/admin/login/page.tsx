import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await isAdmin()) redirect('/admin');
  const { error } = await searchParams;
  return <main className="authPage">
    <section className="authVisual">
      <a className="brand lightBrand" href="/"><img src="/img/logo-mark-light.svg" alt=""/><span><strong>کاتالوگ دیجیتال بادجه</strong><small>BADJE</small></span></a>
      <div className="authPitch"><div className="eyebrow light">پنل مدیریت</div><h1>کاتالوگ‌ها را ساده منتشر و مدیریت کنید.</h1><p>آپلود PDF، ساخت لینک اختصاصی، QR Code و مدیریت وضعیت انتشار در یک پنل.</p></div>
      <img className="authArt" src="/img/admin-banner.svg" alt=""/>
    </section>
    <section className="authFormWrap"><form className="authForm" action="/api/admin/login" method="post"><div className="formHeading"><h2>ورود مدیر</h2><p>برای ادامه اطلاعات مدیریت را وارد کنید.</p></div>{error && <div className="alertError">نام کاربری یا رمز عبور صحیح نیست.</div>}<label className="field"><span>نام کاربری</span><input name="username" autoComplete="username" required autoFocus /></label><label className="field"><span>رمز عبور</span><input type="password" name="password" autoComplete="current-password" required /></label><button className="btn btnPrimary full" type="submit">ورود به پنل</button><a className="backLink" href="/">بازگشت به صفحه اصلی</a></form></section>
  </main>;
}
