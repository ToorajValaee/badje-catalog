import type { Metadata } from 'next';
import './globals.css';
import './static-catalog.css';

export const metadata: Metadata = {
  title: { default: 'Publio | کاتالوگ دیجیتال', template: '%s | Publio' },
  description: 'طراحی و انتشار کاتالوگ دیجیتال حرفه‌ای با لینک اختصاصی و QR Code — Powered by badje.ir',
  icons: { icon: '/img/favicon.svg' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <link
          rel="preload"
          href="/fonts/Dana-Regular.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
