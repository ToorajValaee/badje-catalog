import { randomUUID } from 'node:crypto';
import { NextRequest,NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { requireUser } from '@/lib/auth';
import { assertSameOrigin } from '@/lib/http';
import { pdfStreamFromRequest } from '@/lib/upload';
import { defaultRenderSettings } from '@/lib/render-settings';
import { generateCatalogFiles,deleteCatalogFiles,sourceFilename } from '@/lib/storage';
import { db,ensureSchema } from '@/lib/db';
import { catalogs } from '@/lib/schema';
import { randomCatalogSlug,userPlan,userStorageUsed } from '@/lib/accounts';
import { validateSlug } from '@/lib/slug';
import { sendLimitMail } from '@/lib/email';
import { normalizeLocale } from '@/lib/i18n';
export const maxDuration=300;
export async function POST(request:NextRequest){let id='';try{assertSameOrigin(request);const user=await requireUser();const plan=await userPlan(user.id);if(!plan||!plan.active)return NextResponse.json({error:'PLAN_INACTIVE'},{status:403});const pdf=await pdfStreamFromRequest(request,true);if(!pdf)throw new Error('PDF_REQUIRED');const used=await userStorageUsed(user.id);if(used+pdf.size>plan.storageLimitBytes){await sendLimitMail(user.email,normalizeLocale(request.nextUrl.searchParams.get('locale'))).catch(()=>undefined);return NextResponse.json({error:'STORAGE_LIMIT'},{status:413});}const title=(request.nextUrl.searchParams.get('title')||'').trim();if(!title)return NextResponse.json({error:'TITLE_REQUIRED'},{status:400});const requested=(request.nextUrl.searchParams.get('slug')||'').trim();const slug=plan.customSlug&&requested?validateSlug(requested):randomCatalogSlug();await ensureSchema();const [dup]=await db().select({id:catalogs.id}).from(catalogs).where(eq(catalogs.slug,slug)).limit(1);if(dup)return NextResponse.json({error:'SLUG_EXISTS'},{status:409});id=randomUUID();const settings=defaultRenderSettings();const manifest=await generateCatalogFiles(id,pdf.stream,pdf.size,settings);const totalAfter=used+pdf.size+(manifest.generatedImageBytes||0);if(totalAfter>plan.storageLimitBytes){await deleteCatalogFiles(id);await sendLimitMail(user.email,user.locale==='fa'?'fa':'en').catch(()=>undefined);return NextResponse.json({error:'STORAGE_LIMIT'},{status:413});}const now=new Date();await db().insert(catalogs).values({id,userId:user.id,title,slug,objectKey:sourceFilename(id),originalFilename:pdf.filename,fileSize:pdf.size,active:true,staticPdf:false,navigationMode:'swipe-left',renderDpi:settings.renderDpi,webpQuality:settings.webpQuality,webpLossless:settings.webpLossless,generatedPageCount:manifest.pageCount,generatedLinkCount:manifest.linkCount,generatedSize:manifest.generatedImageBytes||0,generatedAt:now});return NextResponse.json({ok:true,id,slug});}catch(e){if(id)await deleteCatalogFiles(id).catch(()=>undefined);console.error(e);return NextResponse.json({error:e instanceof Error?e.message:'UPLOAD_FAILED'},{status:500});}}
