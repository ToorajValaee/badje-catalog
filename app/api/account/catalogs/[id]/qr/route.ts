import { NextRequest,NextResponse } from 'next/server';
import { and,eq } from 'drizzle-orm';
import QRCode from 'qrcode';
import { requireUser } from '@/lib/auth';
import { db,ensureSchema } from '@/lib/db';
import { catalogs } from '@/lib/schema';
import { externalOrigin } from '@/lib/http';
export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){try{const user=await requireUser();await ensureSchema();const {id}=await params;const [catalog]=await db().select().from(catalogs).where(and(eq(catalogs.id,id),eq(catalogs.userId,user.id))).limit(1);if(!catalog)return new NextResponse('Not found',{status:404});const url=`${externalOrigin(request)}/${encodeURIComponent(catalog.slug)}`;const png=await QRCode.toBuffer(url,{type:'png',width:720,margin:2,errorCorrectionLevel:'M'});return new NextResponse(new Uint8Array(png),{headers:{'Content-Type':'image/png','Cache-Control':'no-store'}});}catch{return new NextResponse('Unauthorized',{status:401});}}
