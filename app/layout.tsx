import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'کاتالوگ دیجیتال بادجه', template: '%s | بادجه' },
  description: 'طراحی و انتشار کاتالوگ دیجیتال حرفه‌ای با لینک اختصاصی و QR Code',
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
