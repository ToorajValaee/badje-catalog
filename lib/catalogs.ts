import { and, desc, eq } from 'drizzle-orm';
import { db, ensureSchema } from '@/lib/db';
import { catalogs } from '@/lib/schema';

export async function listCatalogs() {
  await ensureSchema();
  return db().select().from(catalogs).orderBy(desc(catalogs.createdAt));
}

export async function findCatalogBySlug(slug: string, includeInactive = false) {
  await ensureSchema();
  const conditions = includeInactive ? eq(catalogs.slug, slug) : and(eq(catalogs.slug, slug), eq(catalogs.active, true));
  const [catalog] = await db().select().from(catalogs).where(conditions).limit(1);
  return catalog;
}

export async function findCatalogById(id: string) {
  await ensureSchema();
  const [catalog] = await db().select().from(catalogs).where(eq(catalogs.id, id)).limit(1);
  return catalog;
}
