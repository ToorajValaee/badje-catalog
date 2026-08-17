import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';
import { db, ensureSchema } from '@/lib/db';
import { catalogs } from '@/lib/schema';
import { assertSameOrigin } from '@/lib/http';
import { validateSlug } from '@/lib/slug';
import { pdfStreamFromRequest } from '@/lib/upload';
import { deleteCatalogFiles, generateCatalogFiles, regenerateCatalogWeb, sourceFilename } from '@/lib/storage';
import { env } from '@/lib/env';
import { renderSettingsForCatalog, renderSettingsFromSearchParams } from '@/lib/render-settings';

export const maxDuration = 300;

async function auth(request: NextRequest) {
  try { await requireAdmin(); assertSameOrigin(request); return true; } catch { return false; }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await auth(request))) return NextResponse.json({ error: 'دسترسی غیرمجاز است.' }, { status: 401 });
  const { id } = await params;

  try {
    await ensureSchema();
    const [current] = await db().select().from(catalogs).where(eq(catalogs.id, id)).limit(1);
    if (!current) return NextResponse.json({ error: 'کاتالوگ پیدا نشد.' }, { status: 404 });

    const title = (request.nextUrl.searchParams.get('title') || '').trim();
    const slug = validateSlug(request.nextUrl.searchParams.get('slug') || '');
    const active = request.nextUrl.searchParams.get('active') !== 'false';
    const settings = renderSettingsFromSearchParams(request.nextUrl.searchParams, renderSettingsForCatalog(current));
    const regenerate = request.nextUrl.searchParams.get('regenerate') === 'true';
    if (!title) return NextResponse.json({ error: 'عنوان کاتالوگ الزامی است.' }, { status: 400 });

    const [duplicate] = await db().select({ id: catalogs.id }).from(catalogs).where(eq(catalogs.slug, slug)).limit(1);
    if (duplicate && duplicate.id !== id) return NextResponse.json({ error: 'این نامک قبلاً استفاده شده است.' }, { status: 409 });

    const pdf = await pdfStreamFromRequest(request, false);
    let originalFilename = current.originalFilename;
    let fileSize = current.fileSize;
    let objectKey = current.objectKey;
    let pageCount = current.generatedPageCount;
    let linkCount = current.generatedLinkCount;
    let generatedSize = current.generatedSize;
    let generatedAt = current.generatedAt;
    let didGenerate = false;

    if (pdf) {
      const manifest = await generateCatalogFiles(id, pdf.stream, pdf.size, settings);
      originalFilename = pdf.filename;
      fileSize = pdf.size;
      objectKey = sourceFilename(id);
      pageCount = manifest.pageCount;
      linkCount = manifest.linkCount;
      generatedSize = manifest.generatedImageBytes || 0;
      generatedAt = new Date();
      didGenerate = true;
    } else if (regenerate) {
      const manifest = await regenerateCatalogWeb(id, settings);
      pageCount = manifest.pageCount;
      linkCount = manifest.linkCount;
      generatedSize = manifest.generatedImageBytes || 0;
      generatedAt = new Date();
      didGenerate = true;
    }

    await db().update(catalogs).set({
      title,
      slug,
      active,
      objectKey,
      originalFilename,
      fileSize,
      renderDpi: didGenerate ? settings.renderDpi : current.renderDpi,
      webpQuality: didGenerate ? settings.webpQuality : current.webpQuality,
      webpLossless: didGenerate ? settings.webpLossless : current.webpLossless,
      generatedPageCount: pageCount,
      generatedLinkCount: linkCount,
      generatedSize,
      generatedAt,
      updatedAt: new Date(),
    }).where(eq(catalogs.id, id));

    return NextResponse.json({
      ok: true,
      regenerated: didGenerate,
      pageCount,
      linkCount,
      generatedSize,
      renderDpi: didGenerate ? settings.renderDpi : current.renderDpi,
      webpQuality: didGenerate ? settings.webpQuality : current.webpQuality,
      webpLossless: didGenerate ? settings.webpLossless : current.webpLossless,
      generatedAt: generatedAt?.toISOString() || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'PDF_TOO_LARGE') return NextResponse.json({ error: `حداکثر حجم فایل ${env().MAX_UPLOAD_MB} مگابایت است.` }, { status: 413 });
    if (message === 'PDF_INVALID') return NextResponse.json({ error: 'فایل انتخاب‌شده PDF معتبر نیست.' }, { status: 400 });
    if (message === 'PDF_GENERATION_FAILED') return NextResponse.json({ error: 'ساخت نسخه وب کاتالوگ انجام نشد. فایل PDF را بررسی کنید.' }, { status: 422 });
    if (message === 'SOURCE_PDF_MISSING') return NextResponse.json({ error: 'فایل PDF اصلی برای بازسازی پیدا نشد.' }, { status: 409 });
    if (message === 'RENDER_SETTINGS_INVALID') return NextResponse.json({ error: 'تنظیمات کیفیت خروجی معتبر نیست.' }, { status: 400 });
    if (message.includes('نامک')) return NextResponse.json({ error: message }, { status: 400 });
    console.error(error);
    return NextResponse.json({ error: 'ویرایش کاتالوگ انجام نشد.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await auth(request))) return NextResponse.json({ error: 'دسترسی غیرمجاز است.' }, { status: 401 });
  const { id } = await params;
  await ensureSchema();

  const [current] = await db().select().from(catalogs).where(eq(catalogs.id, id)).limit(1);
  if (!current) return NextResponse.json({ error: 'کاتالوگ پیدا نشد.' }, { status: 404 });

  try {
    await db().delete(catalogs).where(eq(catalogs.id, id));
    await deleteCatalogFiles(id).catch(error => console.error('Catalog file cleanup failed', error));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'حذف کاتالوگ انجام نشد.' }, { status: 500 });
  }
}
