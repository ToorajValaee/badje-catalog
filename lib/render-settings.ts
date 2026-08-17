import { env } from '@/lib/env';

export type RenderSettings = {
  renderDpi: number;
  webpQuality: number;
  webpLossless: boolean;
};

export function defaultRenderSettings(): RenderSettings {
  return {
    renderDpi: env().CATALOG_RENDER_DPI,
    webpQuality: env().CATALOG_WEBP_QUALITY,
    webpLossless: env().CATALOG_WEBP_LOSSLESS === 'true',
  };
}

function integerParam(value: string | null, fallback: number, min: number, max: number) {
  if (value === null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) throw new Error('RENDER_SETTINGS_INVALID');
  return parsed;
}

export function renderSettingsFromSearchParams(params: URLSearchParams, fallback = defaultRenderSettings()): RenderSettings {
  const losslessRaw = params.get('webpLossless');
  let webpLossless = fallback.webpLossless;
  if (losslessRaw !== null) {
    if (losslessRaw !== 'true' && losslessRaw !== 'false') throw new Error('RENDER_SETTINGS_INVALID');
    webpLossless = losslessRaw === 'true';
  }

  return {
    renderDpi: integerParam(params.get('renderDpi'), fallback.renderDpi, 100, 400),
    webpQuality: integerParam(params.get('webpQuality'), fallback.webpQuality, 70, 100),
    webpLossless,
  };
}

export function renderSettingsForCatalog(catalog: {
  renderDpi: number;
  webpQuality: number;
  webpLossless: boolean;
}): RenderSettings {
  return {
    renderDpi: catalog.renderDpi,
    webpQuality: catalog.webpQuality,
    webpLossless: catalog.webpLossless,
  };
}
