const RESERVED = new Set(['admin', 'api', '_next', 'static', 'health', 'favicon.ico']);
const SLUG_RE = /^[a-z0-9\u0600-\u06ff]+(?:-[a-z0-9\u0600-\u06ff]+)*$/u;

export function normalizeSlug(input: string) {
  return input.trim().toLowerCase().replaceAll('_', '-').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export function validateSlug(input: string) {
  const slug = normalizeSlug(input);
  if (!slug || RESERVED.has(slug) || !SLUG_RE.test(slug)) {
    throw new Error('نامک فقط می‌تواند شامل حروف فارسی یا انگلیسی، عدد و خط تیره باشد.');
  }
  return slug;
}
