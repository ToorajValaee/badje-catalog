import { constants as fsConstants, createWriteStream } from 'node:fs';
import { access, mkdir, readFile, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { env } from '@/lib/env';
import type { RenderSettings } from '@/lib/render-settings';

export type CatalogLink =
  | { kind: 'internal'; page: number; x: number; y: number; width: number; height: number }
  | { kind: 'external'; url: string; x: number; y: number; width: number; height: number };

export type CatalogManifest = {
  version: number;
  pageCount: number;
  renderDpi: number;
  webpQuality?: number;
  webpLossless?: boolean;
  format: string;
  linkCount: number;
  generatedImageBytes?: number;
  pages: Array<{
    number: number;
    width: number;
    height: number;
    pixelWidth: number;
    pixelHeight: number;
    image: string;
    imageBytes?: number;
    links: CatalogLink[];
  }>;
};

function rootDir() { return path.resolve(env().UPLOAD_DIR); }
function sourceDir() { return path.join(rootDir(), 'source'); }
function generatedDir() { return path.join(rootDir(), 'generated'); }
function processingDir() { return path.join(rootDir(), '.processing'); }

function safeId(id: string) {
  if (!/^[a-f0-9-]{36}$/i.test(id)) throw new Error('INVALID_CATALOG_ID');
  return id;
}

export function sourceFilename(id: string) { return `${safeId(id)}.pdf`; }
export function sourcePath(id: string) { return path.join(sourceDir(), sourceFilename(id)); }
export function catalogGeneratedDir(id: string) { return path.join(generatedDir(), safeId(id)); }
export function manifestPath(id: string) { return path.join(catalogGeneratedDir(id), 'manifest.json'); }

export async function ensureStorage() {
  await Promise.all([
    mkdir(sourceDir(), { recursive: true }),
    mkdir(generatedDir(), { recursive: true }),
    mkdir(processingDir(), { recursive: true }),
  ]);
  await Promise.all([
    access(sourceDir(), fsConstants.R_OK | fsConstants.W_OK),
    access(generatedDir(), fsConstants.R_OK | fsConstants.W_OK),
    access(processingDir(), fsConstants.R_OK | fsConstants.W_OK),
  ]);
}

async function runGenerator(inputPdf: string, outputDir: string, settings: RenderSettings) {
  const script = path.join(process.cwd(), 'pdf-engine', 'generate.py');
  await new Promise<void>((resolve, reject) => {
    const child = spawn('python3', [script, inputPdf, outputDir], {
      env: {
        ...process.env,
        CATALOG_RENDER_DPI: String(settings.renderDpi),
        CATALOG_WEBP_QUALITY: String(settings.webpQuality),
        CATALOG_WEBP_LOSSLESS: String(settings.webpLossless),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += String(chunk); });
    child.stderr.on('data', chunk => { stderr += String(chunk); });
    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) return resolve();
      console.error('PDF generator failed', { code, stdout, stderr });
      reject(new Error('PDF_GENERATION_FAILED'));
    });
  });
}

async function validateGeneratedWeb(tempWeb: string) {
  const manifestRaw = await readFile(path.join(tempWeb, 'manifest.json'), 'utf8');
  const manifest = JSON.parse(manifestRaw) as CatalogManifest;
  if (!manifest.pageCount || manifest.pages.length !== manifest.pageCount) throw new Error('PDF_GENERATION_FAILED');
  return manifest;
}

async function replaceGeneratedWeb(id: string, tempWeb: string, job: string) {
  const finalWeb = catalogGeneratedDir(id);
  const oldWeb = `${finalWeb}.old-${job}`;
  let hadOldWeb = false;

  try {
    try { await rename(finalWeb, oldWeb); hadOldWeb = true; } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
    await rename(tempWeb, finalWeb);
    await rm(oldWeb, { recursive: true, force: true }).catch(() => undefined);
  } catch (error) {
    await rm(finalWeb, { recursive: true, force: true }).catch(() => undefined);
    if (hadOldWeb) await rename(oldWeb, finalWeb).catch(() => undefined);
    throw error;
  }
}

export async function generateCatalogFiles(
  id: string,
  body: ReadableStream<Uint8Array>,
  expectedSize: number,
  settings: RenderSettings,
) {
  await ensureStorage();
  safeId(id);
  const job = randomUUID();
  const jobRoot = path.join(processingDir(), job);
  const tempPdf = path.join(jobRoot, 'source.pdf');
  const tempWeb = path.join(jobRoot, 'web');
  await mkdir(jobRoot, { recursive: true });

  try {
    await pipeline(
      Readable.fromWeb(body as any),
      createWriteStream(tempPdf, { flags: 'wx', mode: 0o644 }),
    );
    const info = await stat(tempPdf);
    if (info.size !== expectedSize) throw new Error('PDF_SIZE_MISMATCH');

    await runGenerator(tempPdf, tempWeb, settings);
    const manifest = await validateGeneratedWeb(tempWeb);

    const finalPdf = sourcePath(id);
    const finalWeb = catalogGeneratedDir(id);
    const oldPdf = `${finalPdf}.old-${job}`;
    const oldWeb = `${finalWeb}.old-${job}`;

    let hadOldPdf = false;
    let hadOldWeb = false;
    try {
      try { await rename(finalPdf, oldPdf); hadOldPdf = true; } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
      try { await rename(finalWeb, oldWeb); hadOldWeb = true; } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
      await rename(tempPdf, finalPdf);
      await rename(tempWeb, finalWeb);
      await rm(oldPdf, { force: true }).catch(() => undefined);
      await rm(oldWeb, { recursive: true, force: true }).catch(() => undefined);
    } catch (error) {
      await rm(finalPdf, { force: true }).catch(() => undefined);
      await rm(finalWeb, { recursive: true, force: true }).catch(() => undefined);
      if (hadOldPdf) await rename(oldPdf, finalPdf).catch(() => undefined);
      if (hadOldWeb) await rename(oldWeb, finalWeb).catch(() => undefined);
      throw error;
    }

    return manifest;
  } finally {
    await rm(jobRoot, { recursive: true, force: true }).catch(() => undefined);
  }
}

export async function regenerateCatalogWeb(id: string, settings: RenderSettings) {
  await ensureStorage();
  safeId(id);
  const original = sourcePath(id);
  const sourceInfo = await stat(original).catch(() => null);
  if (!sourceInfo?.isFile()) throw new Error('SOURCE_PDF_MISSING');

  const job = randomUUID();
  const jobRoot = path.join(processingDir(), job);
  const tempWeb = path.join(jobRoot, 'web');
  await mkdir(jobRoot, { recursive: true });

  try {
    await runGenerator(original, tempWeb, settings);
    const manifest = await validateGeneratedWeb(tempWeb);
    await replaceGeneratedWeb(id, tempWeb, job);
    return manifest;
  } finally {
    await rm(jobRoot, { recursive: true, force: true }).catch(() => undefined);
  }
}

export async function deleteCatalogFiles(id: string) {
  safeId(id);
  await rm(sourcePath(id), { force: true });
  await rm(catalogGeneratedDir(id), { recursive: true, force: true });
}

export async function readManifest(id: string): Promise<CatalogManifest | null> {
  try {
    return JSON.parse(await readFile(manifestPath(id), 'utf8')) as CatalogManifest;
  } catch {
    return null;
  }
}

export async function generatedReady(id: string) {
  const manifest = await readManifest(id);
  return !!manifest?.pageCount;
}

export async function sourceExists(id: string) {
  try { return (await stat(sourcePath(id))).isFile(); } catch { return false; }
}
