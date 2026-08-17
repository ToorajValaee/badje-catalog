# Badje Catalog 3.2.0

## Per-catalog render quality

The administrator now chooses web-generation quality separately for each catalog:

- Render DPI: 150, 200, 250, 300, 350, or 400 from the UI (API accepts 100–400).
- WebP compression: lossless or lossy.
- Lossy WebP quality: 70–100.
- Current render settings, generated page count, and generated image size are stored in PostgreSQL.

The environment variables `CATALOG_RENDER_DPI`, `CATALOG_WEBP_QUALITY`, and `CATALOG_WEBP_LOSSLESS` are now defaults for newly-created catalogs rather than global forced settings.

## Rebuild from the original PDF

The original PDF remains in `uploads/source/<catalog-id>.pdf`.

An administrator can open Edit, choose different quality settings, then either:

- click **بازسازی از PDF اصلی** to rebuild only the web assets, or
- change the quality and click Save; the app automatically rebuilds the web assets from the stored original PDF.

A new PDF is not required for quality changes. Generated output is built in the processing directory and atomically replaces the current web assets only after generation succeeds.

## Database migration

Startup automatically adds these columns to existing `catalogs` tables:

- `render_dpi`
- `webp_quality`
- `webp_lossless`
- `generated_page_count`
- `generated_link_count`
- `generated_size`
- `generated_at`

No manual SQL migration is required.
