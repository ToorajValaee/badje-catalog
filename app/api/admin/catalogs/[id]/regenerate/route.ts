import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';
import { assertSameOrigin } from '@/lib/http';
import { db, ensureSchema } from '@/lib/db';
import { catalogs } from '@/lib/schema';
import { regenerateCatalogWeb } from '@/lib/storage';
import { renderSettingsForCatalog, renderSettingsFromSearchParams } from '@/lib/render-settings';

export const maxDuration = 300;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); assertSameOrigin(request); } catch { return NextResponse.json({ error: 'دسترسی غیرمجاز است.' }, { status: 401 }); }
  const { id } = await params;

  try {
    await ensureSchema();
    const [current] = await db().select().from(catalogs).where(eq(catalogs.id, id)).limit(1);
    if (!current) return NextResponse.json({ error: 'کاتالوگ پیدا نشد.' }, { status: 404 });

    const settings = renderSettingsFromSearchParams(request.nextUrl.searchParams, renderSettingsForCatalog(current));
    const manifest = await regenerateCatalogWeb(id, settings);
    const generatedAt = new Date();

    await db().update(catalogs).set({
      renderDpi: settings.renderDpi,
      webpQuality: settings.webpQuality,
      webpLossless: settings.webpLossless,
      generatedPageCount: manifest.pageCount,
      generatedLinkCount: manifest.linkCount,
      generatedSize: manifest.generatedImageBytes || 0,
      generatedAt,
      updatedAt: generatedAt,
    }).where(eq(catalogs.id, id));

    return NextResponse.json({
      ok: true,
      pageCount: manifest.pageCount,
      linkCount: manifest.linkCount,
      generatedSize: manifest.generatedImageBytes || 0,
      ...settings,
      generatedAt: generatedAt.toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'SOURCE_PDF_MISSING') return NextResponse.json({ error: 'فایل PDF اصلی برای بازسازی پیدا نشد.' }, { status: 409 });
    if (message === 'RENDER_SETTINGS_INVALID') return NextResponse.json({ error: 'تنظیمات کیفیت خروجی معتبر نیست.' }, { status: 400 });
    if (message === 'PDF_GENERATION_FAILED') return NextResponse.json({ error: 'بازسازی نسخه وب انجام نشد. فایل PDF اصلی را بررسی کنید.' }, { status: 422 });
    console.error(error);
    return NextResponse.json({ error: 'بازسازی نسخه وب انجام نشد.' }, { status: 500 });
  }
}
