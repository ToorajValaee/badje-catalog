export const STATIC_NAVIGATION_MODES = ['swipe-left', 'swipe-right', 'swipe-down', 'free-scroll'] as const;

export type StaticNavigationMode = typeof STATIC_NAVIGATION_MODES[number];

export function parseStaticPdf(value: string | null, fallback = false) {
  if (value === null) return fallback;
  return value === 'true';
}

export function parseStaticNavigationMode(value: string | null, fallback: StaticNavigationMode = 'swipe-left'): StaticNavigationMode {
  if (!value) return fallback;
  if ((STATIC_NAVIGATION_MODES as readonly string[]).includes(value)) return value as StaticNavigationMode;
  throw new Error('NAVIGATION_MODE_INVALID');
}
