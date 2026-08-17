import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';
import { db, ensureSchema } from '@/lib/db';
import { catalogs } from '@/lib/schema';
import { assertSameOrigin } from '@/lib/http';
import { validateSlug } from '@/lib/slug';
import { pdfStreamFromRequest } from '@/lib/upload';
import { deleteCatalogFiles, generateCatalogFiles, sourceFilename } from '@/lib/storage';
import { env } from '@/lib/env';
import { renderSettingsFromSearchParams } from '@/lib/render-settings';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try { await requireAdmin(); assertSameOrigin(request); } catch { return NextResponse.json({ error: 'دسترسی غیرمجاز است.' }, { status: 401 }); }

  const id = randomUUID();
  try {
    await ensureSchema();
    const title = (request.nextUrl.searchParams.get('title') || '').trim();
    const slug = validateSlug(request.nextUrl.searchParams.get('slug') || '');
    const settings = renderSettingsFromSearchParams(request.nextUrl.searchParams);
    if (!title) return NextResponse.json({ error: 'عنوان کاتالوگ الزامی است.' }, { status: 400 });

    const [duplicate] = await db().select({ id: catalogs.id }).from(catalogs).where(eq(catalogs.slug, slug)).limit(1);
    if (duplicate) return NextResponse.json({ error: 'این نامک قبلاً استفاده شده است.' }, { status: 409 });

    const pdf = await pdfStreamFromRequest(request, true);
    if (!pdf) throw new Error('PDF_REQUIRED');

    const manifest = await generateCatalogFiles(id, pdf.stream, pdf.size, settings);
    const generatedAt = new Date();
    try {
      await db().insert(catalogs).values({
        id,
        title,
        slug,
        objectKey: sourceFilename(id),
        originalFilename: pdf.filename,
        fileSize: pdf.size,
        active: true,
        renderDpi: settings.renderDpi,
        webpQuality: settings.webpQuality,
        webpLossless: settings.webpLossless,
        generatedPageCount: manifest.pageCount,
        generatedLinkCount: manifest.linkCount,
        generatedSize: manifest.generatedImageBytes || 0,
        generatedAt,
      });
    } catch (error) {
      await deleteCatalogFiles(id).catch(() => undefined);
      throw error;
    }

    return NextResponse.json({
      id,
      title,
      slug,
      pageCount: manifest.pageCount,
      linkCount: manifest.linkCount,
      generatedSize: manifest.generatedImageBytes || 0,
      ...settings,
      generatedAt: generatedAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'PDF_TOO_LARGE') return NextResponse.json({ error: `حداکثر حجم فایل ${env().MAX_UPLOAD_MB} مگابایت است.` }, { status: 413 });
    if (message === 'PDF_INVALID') return NextResponse.json({ error: 'فایل انتخاب‌شده PDF معتبر نیست.' }, { status: 400 });
    if (message === 'PDF_REQUIRED') return NextResponse.json({ error: 'انتخاب فایل PDF الزامی است.' }, { status: 400 });
    if (message === 'PDF_GENERATION_FAILED') return NextResponse.json({ error: 'ساخت نسخه وب کاتالوگ انجام نشد. فایل PDF را بررسی کنید.' }, { status: 422 });
    if (message === 'RENDER_SETTINGS_INVALID') return NextResponse.json({ error: 'تنظیمات کیفیت خروجی معتبر نیست.' }, { status: 400 });
    if (message.includes('نامک')) return NextResponse.json({ error: message }, { status: 400 });
    console.error(error);
    return NextResponse.json({ error: 'ذخیره و پردازش کاتالوگ انجام نشد.' }, { status: 500 });
  }
}
