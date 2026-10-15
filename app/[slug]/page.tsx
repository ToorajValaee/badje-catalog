import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { findCatalogBySlug } from '@/lib/catalogs';
import { normalizeSlug } from '@/lib/slug';
import { readManifest } from '@/lib/storage';
import CatalogViewer from '@/components/CatalogViewer';
import type { StaticNavigationMode } from '@/lib/navigation';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cleanSlug = normalizeSlug(slug);
  const catalog = await findCatalogBySlug(cleanSlug);
  return { title: catalog ? catalog.title : 'کاتالوگ پیدا نشد | Publio' };
}

export default async function CatalogPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cleanSlug = normalizeSlug(slug);
  const catalog = await findCatalogBySlug(cleanSlug);
  if (!catalog) notFound();

  const requestHeaders=await headers();
  const host=(requestHeaders.get('x-forwarded-host')||requestHeaders.get('host')||'').split(':')[0].toLowerCase();
  const customDomainRoot=catalog.customDomainStatus==='active'&&!!catalog.customDomain&&host===catalog.customDomain;

  const manifest = await readManifest(catalog.id);
  if (!manifest?.pages?.length) {
    console.error(`Generated web catalog is missing: ${catalog.id}`);
    notFound();
  }

  return <CatalogViewer
    catalogId={catalog.id}
    slug={cleanSlug}
    title={catalog.title}
    manifest={manifest}
    version={catalog.updatedAt.getTime().toString()}
    initialPage={1}
    staticPdf={catalog.staticPdf}
    navigationMode={catalog.navigationMode as StaticNavigationMode}
    customDomainRoot={customDomainRoot}
  />;
}
