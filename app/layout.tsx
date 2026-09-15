import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import './globals.css';import './static-catalog.css';
import { LOCALE_COOKIE,normalizeLocale } from '@/lib/i18n';
export const metadata:Metadata={title:{default:'Publio',template:'%s | Publio'},description:'Digital catalogs by Publio — Powered by badje.ir',icons:{icon:'/img/favicon.svg'}};
export default async function RootLayout({children}:{children:React.ReactNode}){const locale=normalizeLocale((await cookies()).get(LOCALE_COOKIE)?.value);return <html lang={locale} dir={locale==='fa'?'rtl':'ltr'}><head><link rel="preload" href="/fonts/Dana-Regular.woff2" as="font" type="font/woff2" crossOrigin="anonymous"/></head><body>{children}</body></html>}
