import Link from 'next/link';
import { headers } from 'next/headers';
import QRCode from 'qrcode';
import { ArrowLeft, CheckCircle2, QrCode, Smartphone, UploadCloud } from 'lucide-react';
import { currentLocale } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function LandingPage() {
  const locale = await currentLocale();
  const fa = locale === 'fa';
  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host') || 'catalog.badje.ir';
  const proto = requestHeaders.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  const helloWorldUrl = `${proto}://${host}/hello-world`;
  const helloWorldQr = await QRCode.toDataURL(helloWorldUrl, { width: 240, margin: 1, errorCorrectionLevel: 'M' });

  return <>
    <header className="siteHeader container">
      <Link className="brand" href="/"><img src="/img/logo-mark.svg" width="44" height="44" alt=""/><span><strong>Publio</strong><small>POWERED BY BADJE.IR</small></span></Link>
      <nav className="headerActions">
        <a className="textLink" href="#services">{fa?'خدمات':'Services'}</a>
        <Link className="textLink" href="/account">{fa?'حساب کاربری':'Account'}</Link>
        <a className="textLink" href={`/api/locale?lang=${fa?'en':'fa'}&next=/`}>{fa?'English':'فارسی'}</a>
      </nav>
    </header>

    <main>
      <section className="hero container">
        <div className="heroCopy">
          <div className="eyebrow">{fa?'کاتالوگ شما، همیشه در دسترس':'Your catalog, always available'}</div>
          <h1>{fa?<>کاتالوگ شما، با یک <span>تجربه دیجیتال حرفه‌ای</span>.</>:<>Your catalog with a <span>professional digital experience</span>.</>}</h1>
          <p>{fa?'کاتالوگ خود را با لینک اختصاصی و QR Code به اشتراک بگذارید؛ سریع و مناسب موبایل و دسکتاپ.':'Share your catalog with a dedicated link and QR code, optimized for mobile and desktop.'}</p>
          <div className="heroActions"><Link className="btn btnPrimary" href="/account">{fa?'شروع رایگان':'Start free'} <ArrowLeft size={17}/></Link><a className="btn btnSoft" href="#services">{fa?'مشاهده خدمات':'Explore features'}</a></div>
          <div className="heroPoints"><span><CheckCircle2/> {fa?'۵۰ مگابایت رایگان':'50 MB free'}</span><span><CheckCircle2/> {fa?'QR آماده چاپ':'Print-ready QR'}</span><span><CheckCircle2/> {fa?'نمایش مستقیم کاتالوگ':'Direct catalog viewing'}</span></div>
        </div>
        <div className="heroArt"><img src="/img/hero-catalog.svg" alt={fa?'نمونه کاتالوگ دیجیتال':'Digital catalog preview'}/></div>
      </section>

      <section id="services" className="section container">
        <div className="sectionHeading"><div className="eyebrow">{fa?'خدمات':'Features'}</div><h2>{fa?'از فایل PDF تا یک تجربه آماده اشتراک‌گذاری':'From PDF to a share-ready experience'}</h2><p>{fa?'ثبت‌نام با ایمیل، آپلود PDF و انتشار سریع در یک لینک ساده.':'Register by email, upload a PDF and publish it behind a simple web link.'}</p></div>
        <div className="serviceGrid">
          <article className="serviceCard"><UploadCloud/><h3>{fa?'آدرس اختصاصی':'Catalog link'}</h3><p>{fa?'نمونه لینک':'Example'}: <Link href="/hello-world"><bdi>{helloWorldUrl}</bdi></Link></p></article>
          <article className="serviceCard featured"><QrCode/><h3>{fa?'QR Code آماده':'Ready QR Code'}</h3><p>{fa?'این QR مستقیماً نمونه را باز می‌کند.':'This QR opens the live sample directly.'}</p><Link href="/hello-world"><img className="sampleQr" src={helloWorldQr} width="200" height="200" alt={`QR Code for ${helloWorldUrl}`}/></Link></article>
          <article className="serviceCard"><Smartphone/><h3>{fa?'نمایش روان روی موبایل':'Smooth mobile viewing'}</h3><p>{fa?'کاتالوگ مستقیم در مرورگر باز می‌شود و نیازی به نصب برنامه ندارد.':'Catalogs open directly in the browser with no app installation required.'}</p></article>
        </div>
      </section>

      <section className="darkBand"><div className="container darkGrid"><div><div className="eyebrow light">{fa?'پلن رایگان':'Free plan'}</div><h2>{fa?'۵۰ مگابایت فضا برای شروع.':'50 MB storage to get started.'}</h2><p>{fa?'در پلن رایگان لینک به‌صورت خودکار ساخته می‌شود. برای فضای بیشتر یا لینک دلخواه با ما تماس بگیرید.':'Free-plan links are generated automatically. For more storage or a custom link, contact us.'}</p><div className="trust"><span><CheckCircle2/> {fa?'ثبت‌نام با ایمیل و OTP':'Email + OTP registration'}</span><span><CheckCircle2/> {fa?'بدون رمز عبور':'Passwordless access'}</span></div></div><img src="/img/viewer-banner.svg" alt="Publio"/></div></section>

      <section id="contact" className="section container"><div className="cta"><div><div className="eyebrow">{fa?'فضای بیشتر می‌خواهید؟':'Need more?'}</div><h2>{fa?'برای پلن‌های بیشتر و لینک اختصاصی با ما تماس بگیرید.':'Contact us for larger plans and custom links.'}</h2></div><a className="btn btnPrimary" href="mailto:publio@badje.ir">publio@badje.ir</a></div></section>
    </main>

    <footer className="footer container"><div className="brand"><img src="/img/logo-mark.svg" width="34" height="34" alt=""/><span><strong>Publio</strong><small>POWERED BY BADJE.IR</small></span></div><p><a href="https://badje.ir" target="_blank" rel="noreferrer">Powered by badje.ir</a></p></footer>
  </>;
}
