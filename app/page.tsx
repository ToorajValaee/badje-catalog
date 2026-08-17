import Link from 'next/link';
import { ArrowLeft, CheckCircle2, QrCode, Smartphone, UploadCloud } from 'lucide-react';

export default function LandingPage() {
  return <>
    <header className="siteHeader container">
      <Link className="brand" href="/">
        <img src="/img/logo-mark.svg" width="44" height="44" alt="" />
        <span><strong>کاتالوگ دیجیتال</strong><small>BADJE</small></span>
      </Link>
      <nav className="headerActions">
        <a className="textLink" href="#services">خدمات</a>
        <Link className="btn btnGhost" href="/admin/login">ورود مدیر</Link>
      </nav>
    </header>

    <main>
      <section className="hero container">
        <div className="heroCopy">
          <div className="eyebrow">کاتالوگ شما، همیشه در دسترس</div>
          <h1>کاتالوگ شما، با یک <span>تجربه دیجیتال حرفه‌ای</span>.</h1>
          <p>کاتالوگ خود را با یک لینک اختصاصی و QR Code در اختیار مخاطبان قرار دهید؛ ساده، سریع و مناسب موبایل و دسکتاپ.</p>
          <div className="heroActions">
            <a className="btn btnPrimary" href="#contact">شروع همکاری <ArrowLeft size={17}/></a>
            <a className="btn btnSoft" href="#services">مشاهده خدمات</a>
          </div>
          <div className="heroPoints">
            <span><CheckCircle2/> لینک اختصاصی</span>
            <span><CheckCircle2/> QR آماده چاپ</span>
            <span><CheckCircle2/> نمایش مستقیم کاتالوگ</span>
          </div>
        </div>
        <div className="heroArt"><img src="/img/hero-catalog.svg" alt="نمونه کاتالوگ دیجیتال" /></div>
      </section>

      <section id="services" className="section container">
        <div className="sectionHeading">
          <div className="eyebrow">خدمات</div>
          <h2>از فایل کاتالوگ تا یک تجربه آماده اشتراک‌گذاری</h2>
          <p>برای معرفی محصولات، خدمات، منو، نمونه‌کار و هر محتوایی که باید حرفه‌ای و آسان به دست مخاطب برسد.</p>
        </div>
        <div className="serviceGrid">
          <article className="serviceCard">
            <UploadCloud/>
            <h3>آدرس اختصاصی</h3>
            <p>هر کاتالوگ با یک آدرس کوتاه و ساده مثل <bdi>/hello-world</bdi> منتشر می‌شود.</p>
          </article>
          <article className="serviceCard featured">
            <QrCode/>
            <h3>QR Code آماده</h3>
            <p>QR کاتالوگ را روی بسته‌بندی، کارت ویزیت، بروشور یا تبلیغات چاپ کنید.</p>
          </article>
          <article className="serviceCard">
            <Smartphone/>
            <h3>نمایش روان روی موبایل</h3>
            <p>کاتالوگ مستقیم در مرورگر باز می‌شود و لینک‌های داخلی و خارجی آن قابل استفاده می‌مانند.</p>
          </article>
        </div>
      </section>

      <section className="darkBand">
        <div className="container darkGrid">
          <div>
            <div className="eyebrow light">تجربه بهتر برای مخاطب</div>
            <h2>همان طراحی کاتالوگ، آماده مشاهده و تعامل.</h2>
            <p>مخاطب بدون نصب برنامه یا عبور از صفحه‌های اضافی، کاتالوگ را باز می‌کند و از لینک‌ها و مسیرهای داخل آن استفاده می‌کند.</p>
            <div className="trust">
              <span><CheckCircle2/> مناسب موبایل و دسکتاپ</span>
              <span><CheckCircle2/> حفظ لینک‌های داخل کاتالوگ</span>
            </div>
          </div>
          <img src="/img/viewer-banner.svg" alt="نمایش کاتالوگ روی موبایل و دسکتاپ" />
        </div>
      </section>

      <section id="contact" className="section container">
        <div className="cta">
          <div>
            <div className="eyebrow">آماده انتشار هستید؟</div>
            <h2>یک لینک کوتاه. یک QR. یک کاتالوگ همیشه در دسترس.</h2>
          </div>
          <a className="btn btnPrimary" href="mailto:hello@badje.ir">درخواست طراحی کاتالوگ</a>
        </div>
      </section>
    </main>

    <footer className="footer container">
      <div className="brand"><img src="/img/logo-mark.svg" width="34" height="34" alt=""/><span><strong>کاتالوگ دیجیتال بادجه</strong><small>BADJE</small></span></div>
      <p>طراحی و انتشار کاتالوگ دیجیتال حرفه‌ای</p>
    </footer>
  </>;
}
