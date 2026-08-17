import { bigint, boolean, integer, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const catalogs = pgTable('catalogs', {
  id: varchar('id', { length: 36 }).primaryKey(),
  title: text('title').notNull(),
  slug: varchar('slug', { length: 140 }).notNull().unique(),
  objectKey: text('object_key').notNull(),
  originalFilename: text('original_filename').notNull(),
  fileSize: bigint('file_size', { mode: 'number' }).notNull(),
  active: boolean('active').notNull().default(true),
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
