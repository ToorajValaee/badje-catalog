import { notFound } from 'next/navigation';
import { findCatalogBySlug } from '@/lib/catalogs';
import { normalizeSlug } from '@/lib/slug';
import { readManifest } from '@/lib/storage';
import CatalogViewer from '@/components/CatalogViewer';

export const dynamic = 'force-dynamic';

type RouteParams = Promise<{ slug: string; page: string }>;

function parsePage(value: string) {
  if (!/^\d+$/.test(value)) return null;
  const page = Number(value);
  return Number.isSafeInteger(page) && page >= 1 ? page : null;
}

export async function generateMetadata({ params }: { params: RouteParams }) {
  const { slug, page } = await params;
  const cleanSlug = normalizeSlug(slug);
  const catalog = await findCatalogBySlug(cleanSlug);
  const pageNumber = parsePage(page);
  return {
    title: catalog && pageNumber ? `${catalog.title} — صفحه ${pageNumber}` : 'کاتالوگ پیدا نشد | بادجه',
  };
}

export default async function CatalogScreenPage({ params }: { params: RouteParams }) {
  const { slug, page } = await params;
  const cleanSlug = normalizeSlug(slug);
  const pageNumber = parsePage(page);
  if (!pageNumber) notFound();

  const catalog = await findCatalogBySlug(cleanSlug);
  if (!catalog) notFound();

  const manifest = await readManifest(catalog.id);
  if (!manifest?.pages?.length || pageNumber > manifest.pageCount || !manifest.pages[pageNumber - 1]) {
    notFound();
  }

  return <CatalogViewer
    catalogId={catalog.id}
    slug={cleanSlug}
    title={catalog.title}
    manifest={manifest}
    version={catalog.updatedAt.getTime().toString()}
    initialPage={pageNumber}
  />;
}
