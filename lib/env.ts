import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  UPLOAD_DIR: z.string().min(1).default('/data/uploads'),
  ADMIN_USERNAME: z.string().min(1).default('admin'),
  ADMIN_PASSWORD: z.string().min(8),
  SESSION_SECRET: z.string().min(32),
  COOKIE_SECURE: z.enum(['true', 'false']).default('true'),
  MAX_UPLOAD_MB: z.coerce.number().int().positive().max(2048).default(200),
  CATALOG_RENDER_DPI: z.coerce.number().int().min(100).max(400).default(200),
  CATALOG_WEBP_QUALITY: z.coerce.number().int().min(70).max(100).default(96),
  CATALOG_WEBP_LOSSLESS: z.enum(['true', 'false']).default('true'),
});

let cached: z.infer<typeof schema> | undefined;
export function env() {
  if (!cached) cached = schema.parse(process.env);
  return cached;
}
