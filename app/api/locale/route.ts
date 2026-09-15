import { NextRequest, NextResponse } from 'next/server';
import { LOCALE_COOKIE, normalizeLocale } from '@/lib/i18n';
export function GET(request:NextRequest){const lang=normalizeLocale(request.nextUrl.searchParams.get('lang'));const next=request.nextUrl.searchParams.get('next')||'/';const safe=next.startsWith('/')&&!next.startsWith('//')?next:'/';const response=NextResponse.redirect(new URL(safe,request.url));response.cookies.set(LOCALE_COOKIE,lang,{path:'/',sameSite:'lax',maxAge:60*60*24*365});return response;}
