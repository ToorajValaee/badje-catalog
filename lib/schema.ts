import { bigint, boolean, integer, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const plans = pgTable('plans', {
  id: varchar('id', { length: 36 }).primaryKey(),
  code: varchar('code', { length: 64 }).notNull().unique(),
  nameEn: text('name_en').notNull(),
  nameFa: text('name_fa').notNull(),
  storageLimitBytes: bigint('storage_limit_bytes', { mode: 'number' }).notNull(),
  customSlug: boolean('custom_slug').notNull().default(false),
  active: boolean('active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(),
  email: varchar('email', { length: 320 }).notNull().unique(),
  locale: varchar('locale', { length: 2 }).notNull().default('en'),
  status: varchar('status', { length: 24 }).notNull().default('active'),
  planId: varchar('plan_id', { length: 36 }).notNull(),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const otpCodes = pgTable('otp_codes', {
  id: varchar('id', { length: 36 }).primaryKey(),
  email: varchar('email', { length: 320 }).notNull(),
  codeHash: varchar('code_hash', { length: 64 }).notNull(),
  purpose: varchar('purpose', { length: 24 }).notNull().default('login'),
  locale: varchar('locale', { length: 2 }).notNull().default('en'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const catalogs = pgTable('catalogs', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }),
  title: text('title').notNull(),
  slug: varchar('slug', { length: 140 }).notNull().unique(),
  objectKey: text('object_key').notNull(),
  originalFilename: text('original_filename').notNull(),
  fileSize: bigint('file_size', { mode: 'number' }).notNull(),
  active: boolean('active').notNull().default(true),
  staticPdf: boolean('static_pdf').notNull().default(false),
  navigationMode: varchar('navigation_mode', { length: 32 }).notNull().default('swipe-left'),
  renderDpi: integer('render_dpi').notNull().default(200),
  webpQuality: integer('webp_quality').notNull().default(96),
  webpLossless: boolean('webp_lossless').notNull().default(true),
  generatedPageCount: integer('generated_page_count'),
  generatedLinkCount: integer('generated_link_count'),
  generatedSize: bigint('generated_size', { mode: 'number' }).notNull().default(0),
  generatedAt: timestamp('generated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Catalog = typeof catalogs.$inferSelect;
export type User = typeof users.$inferSelect;
export type Plan = typeof plans.$inferSelect;
