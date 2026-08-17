import { NextResponse } from 'next/server';
import { findCatalogBySlug } from '@/lib/catalogs';
import { normalizeSlug } from '@/lib/slug';
import { sourceExists, sourceFilename } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const catalog = await findCatalogBySlug(normalizeSlug(slug));
  if (!catalog || !(await sourceExists(catalog.id))) return new NextResponse('Not found', { status: 404 });

  return new NextResponse(null, {
    status: 200,
    headers: {
      'X-Accel-Redirect': `/_catalog_source/${sourceFilename(catalog.id)}`,
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="catalog.pdf"; filename*=UTF-8''${encodeURIComponent(`${catalog.slug}.pdf`)}`,
      'Cache-Control': 'private, no-store',
    },
  });
}
