import Link from 'next/link';

export default function NotFound() {
  return <main className="notFoundWrap container">
    <section className="notFoundCard">
      <div><div className="eyebrow">کاتالوگ در دسترس نیست</div><h1>این آدرس پیدا نشد.</h1><p>ممکن است آدرس کاتالوگ اشتباه باشد، لینک تغییر کرده باشد یا کاتالوگ هنوز منتشر نشده باشد.</p><div className="heroActions"><Link href="/" className="btn btnPrimary">صفحه اصلی</Link><Link href="/admin/login" className="btn btnSoft">ورود مدیر</Link></div></div>
      <img src="/img/empty-catalog.svg" alt="کاتالوگ پیدا نشد" />
    </section>
  </main>;
}
