import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { env } from '@/lib/env';
import * as schema from '@/lib/schema';

declare global { var __badjePgPool: Pool | undefined; var __badjeSchemaReady: Promise<void> | undefined; }

export function pool() {
  if (!global.__badjePgPool) global.__badjePgPool = new Pool({ connectionString: env().DATABASE_URL, max: 10 });
  return global.__badjePgPool;
}
export function db() { return drizzle(pool(), { schema }); }

export function ensureSchema() {
  if (!global.__badjeSchemaReady) {
    global.__badjeSchemaReady = (async () => {
      await pool().query(`
        CREATE TABLE IF NOT EXISTS plans (
          id varchar(36) PRIMARY KEY, code varchar(64) NOT NULL UNIQUE, name_en text NOT NULL, name_fa text NOT NULL,
          storage_limit_bytes bigint NOT NULL, custom_slug boolean NOT NULL DEFAULT false, active boolean NOT NULL DEFAULT true,
          sort_order integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS users (
          id varchar(36) PRIMARY KEY, email varchar(320) NOT NULL UNIQUE, locale varchar(2) NOT NULL DEFAULT 'en',
          status varchar(24) NOT NULL DEFAULT 'active', plan_id varchar(36) NOT NULL, email_verified_at timestamptz,
          last_login_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS otp_codes (
          id varchar(36) PRIMARY KEY, email varchar(320) NOT NULL, code_hash varchar(64) NOT NULL,
          purpose varchar(24) NOT NULL DEFAULT 'login', locale varchar(2) NOT NULL DEFAULT 'en', expires_at timestamptz NOT NULL,
          consumed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS email_settings (
          id varchar(36) PRIMARY KEY, provider varchar(32) NOT NULL DEFAULT 'resend', from_name text NOT NULL DEFAULT 'Publio',
          from_email varchar(320) NOT NULL DEFAULT 'publio@badje.ir', reply_to varchar(320), api_key_encrypted text,
          enabled boolean NOT NULL DEFAULT false, updated_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS catalogs (
          id varchar(36) PRIMARY KEY, user_id varchar(36), title text NOT NULL, slug varchar(140) NOT NULL UNIQUE,
          object_key text NOT NULL, original_filename text NOT NULL, file_size bigint NOT NULL, active boolean NOT NULL DEFAULT true,
          static_pdf boolean NOT NULL DEFAULT false, navigation_mode varchar(32) NOT NULL DEFAULT 'swipe-left',
          render_dpi integer NOT NULL DEFAULT 200, webp_quality integer NOT NULL DEFAULT 96, webp_lossless boolean NOT NULL DEFAULT true,
          generated_page_count integer, generated_link_count integer, generated_size bigint NOT NULL DEFAULT 0,
          generated_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
        );
        ALTER TABLE catalogs ADD COLUMN IF NOT EXISTS user_id varchar(36);
        ALTER TABLE catalogs ADD COLUMN IF NOT EXISTS static_pdf boolean NOT NULL DEFAULT false;
        ALTER TABLE catalogs ADD COLUMN IF NOT EXISTS navigation_mode varchar(32) NOT NULL DEFAULT 'swipe-left';
        ALTER TABLE catalogs ADD COLUMN IF NOT EXISTS render_dpi integer NOT NULL DEFAULT 200;
        ALTER TABLE catalogs ADD COLUMN IF NOT EXISTS webp_quality integer NOT NULL DEFAULT 96;
        ALTER TABLE catalogs ADD COLUMN IF NOT EXISTS webp_lossless boolean NOT NULL DEFAULT true;
        ALTER TABLE catalogs ADD COLUMN IF NOT EXISTS generated_page_count integer;
        ALTER TABLE catalogs ADD COLUMN IF NOT EXISTS generated_link_count integer;
        ALTER TABLE catalogs ADD COLUMN IF NOT EXISTS generated_size bigint NOT NULL DEFAULT 0;
        ALTER TABLE catalogs ADD COLUMN IF NOT EXISTS generated_at timestamptz;
        CREATE INDEX IF NOT EXISTS catalogs_created_at_idx ON catalogs (created_at DESC);
        CREATE INDEX IF NOT EXISTS catalogs_user_id_idx ON catalogs (user_id);
        CREATE INDEX IF NOT EXISTS otp_codes_email_idx ON otp_codes (email, created_at DESC);
      `);
      const free = await pool().query(`SELECT id FROM plans WHERE code='free' LIMIT 1`);
      if (!free.rowCount) await pool().query(`INSERT INTO plans (id,code,name_en,name_fa,storage_limit_bytes,custom_slug,active,sort_order) VALUES ($1,'free','Free','رایگان',$2,false,true,0)`, [randomUUID(), 50 * 1024 * 1024]);
      const mail = await pool().query(`SELECT id FROM email_settings LIMIT 1`);
      if (!mail.rowCount) await pool().query(`INSERT INTO email_settings (id) VALUES ($1)`, [randomUUID()]);
    })();
  }
  return global.__badjeSchemaReady;
}
