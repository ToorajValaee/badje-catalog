import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '@/lib/env';
import * as schema from '@/lib/schema';

declare global {
  var __badjePgPool: Pool | undefined;
  var __badjeSchemaReady: Promise<void> | undefined;
}

export function pool() {
  if (!global.__badjePgPool) {
    global.__badjePgPool = new Pool({ connectionString: env().DATABASE_URL, max: 10 });
  }
  return global.__badjePgPool;
}

export function db() {
  return drizzle(pool(), { schema });
}

export function ensureSchema() {
  if (!global.__badjeSchemaReady) {
    global.__badjeSchemaReady = pool().query(`
      CREATE TABLE IF NOT EXISTS catalogs (
        id varchar(36) PRIMARY KEY,
        title text NOT NULL,
        slug varchar(140) NOT NULL UNIQUE,
        object_key text NOT NULL,
        original_filename text NOT NULL,
        file_size bigint NOT NULL,
        active boolean NOT NULL DEFAULT true,
        render_dpi integer NOT NULL DEFAULT 200,
        webp_quality integer NOT NULL DEFAULT 96,
        webp_lossless boolean NOT NULL DEFAULT true,
        generated_page_count integer,
        generated_link_count integer,
        generated_size bigint NOT NULL DEFAULT 0,
        generated_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      ALTER TABLE catalogs ADD COLUMN IF NOT EXISTS render_dpi integer NOT NULL DEFAULT 200;
      ALTER TABLE catalogs ADD COLUMN IF NOT EXISTS webp_quality integer NOT NULL DEFAULT 96;
      ALTER TABLE catalogs ADD COLUMN IF NOT EXISTS webp_lossless boolean NOT NULL DEFAULT true;
      ALTER TABLE catalogs ADD COLUMN IF NOT EXISTS generated_page_count integer;
      ALTER TABLE catalogs ADD COLUMN IF NOT EXISTS generated_link_count integer;
      ALTER TABLE catalogs ADD COLUMN IF NOT EXISTS generated_size bigint NOT NULL DEFAULT 0;
      ALTER TABLE catalogs ADD COLUMN IF NOT EXISTS generated_at timestamptz;
      CREATE INDEX IF NOT EXISTS catalogs_created_at_idx ON catalogs (created_at DESC);
    `).then(() => undefined);
  }
  return global.__badjeSchemaReady;
}
