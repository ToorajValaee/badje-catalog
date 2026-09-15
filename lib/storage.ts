import { constants as fsConstants, createWriteStream } from 'node:fs';
import { access, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
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

export type GenerationProgress = {
  stage: 'waiting' | 'receiving' | 'preparing' | 'rendering' | 'finalizing' | 'complete' | 'failed';
  percent: number;
  current: number;
  total: number;
  updatedAt: string;
};

function rootDir() { return path.resolve(env().UPLOAD_DIR); }
function sourceDir() { return path.join(rootDir(), 'source'); }
function generatedDir() { return path.join(rootDir(), 'generated'); }
function processingDir() { return path.join(rootDir(), '.processing'); }
function progressDir() { return path.join(processingDir(), 'progress'); }

function safeId(id: string) {
  if (!/^[a-f0-9-]{36}$/i.test(id)) throw new Error('INVALID_CATALOG_ID');
  return id;
}

function safeProgressJob(job: string) {
  if (!/^[a-f0-9-]{36}$/i.test(job)) throw new Error('INVALID_PROGRESS_JOB');
  return job;
}

function progressPath(job: string) {
  return path.join(progressDir(), `${safeProgressJob(job)}.json`);
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
    mkdir(progressDir(), { recursive: true }),
  ]);
  await Promise.all([
    access(sourceDir(), fsConstants.R_OK | fsConstants.W_OK),
    access(generatedDir(), fsConstants.R_OK | fsConstants.W_OK),
    access(processingDir(), fsConstants.R_OK | fsConstants.W_OK),
    access(progressDir(), fsConstants.R_OK | fsConstants.W_OK),
  ]);
}

async function writeGenerationProgress(job: string | undefined, update: Omit<GenerationProgress, 'updatedAt'>) {
  if (!job) return;
  await mkdir(progressDir(), { recursive: true });
  const payload: GenerationProgress = { ...update, updatedAt: new Date().toISOString() };
  await writeFile(progressPath(job), JSON.stringify(payload), { encoding: 'utf8', mode: 0o600 });
}

function scheduleProgressCleanup(job: string | undefined) {
  if (!job) return;
  const timer = setTimeout(() => {
    rm(progressPath(job), { force: true }).catch(() => undefined);
  }, 5 * 60 * 1000);
  timer.unref?.();
}

export async function readGenerationProgress(job: string): Promise<GenerationProgress> {
  safeProgressJob(job);
  try {
    const raw = await readFile(progressPath(job), 'utf8');
    return JSON.parse(raw) as GenerationProgress;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    return { stage: 'waiting', percent: 0, current: 0, total: 0, updatedAt: new Date().toISOString() };
  }
}

async function runGenerator(inputPdf: string, outputDir: string, settings: RenderSettings, progressJob?: string) {
  const script = path.join(process.cwd(), 'pdf-engine', 'generate.py');
  await writeGenerationProgress(progressJob, { stage: 'preparing', percent: 1, current: 0, total: 0 });

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
    let lineBuffer = '';
    let progressWrites = Promise.resolve();

    const queueProgress = (progress: Omit<GenerationProgress, 'updatedAt'>) => {
      progressWrites = progressWrites.then(() => writeGenerationProgress(progressJob, progress)).catch(() => undefined);
    };

    child.stdout.on('data', chunk => {
      const text = String(chunk);
      stdout += text;
      lineBuffer += text;
      let newline = lineBuffer.indexOf('\n');
      while (newline >= 0) {
        const line = lineBuffer.slice(0, newline).trim();
        lineBuffer = lineBuffer.slice(newline + 1);
        if (line) {
          try {
            const event = JSON.parse(line) as { type?: string; stage?: string; current?: number; total?: number; percent?: number };
            if (event.type === 'progress' && (event.stage === 'rendering' || event.stage === 'finalizing')) {
              queueProgress({
                stage: event.stage,
                percent: Math.max(0, Math.min(99, Number(event.percent) || 0)),
                current: Math.max(0, Number(event.current) || 0),
                total: Math.max(0, Number(event.total) || 0),
              });
            }
          } catch {
            // Non-progress stdout is kept for diagnostics/final generator output.
          }
        }
        newline = lineBuffer.indexOf('\n');
      }
    });
    child.stderr.on('data', chunk => { stderr += String(chunk); });
    child.on('error', reject);
    child.on('close', async code => {
      await progressWrites;
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
  progressJob?: string,
) {
  await ensureStorage();
  safeId(id);
  if (progressJob) safeProgressJob(progressJob);
  const job = randomUUID();
  const jobRoot = path.join(processingDir(), job);
  const tempPdf = path.join(jobRoot, 'source.pdf');
  const tempWeb = path.join(jobRoot, 'web');
  await mkdir(jobRoot, { recursive: true });
  await writeGenerationProgress(progressJob, { stage: 'receiving', percent: 0, current: 0, total: 0 });

  try {
    await pipeline(
      Readable.fromWeb(body as any),
      createWriteStream(tempPdf, { flags: 'wx', mode: 0o644 }),
    );
    const info = await stat(tempPdf);
    if (info.size !== expectedSize) throw new Error('PDF_SIZE_MISMATCH');

    await runGenerator(tempPdf, tempWeb, settings, progressJob);
    await writeGenerationProgress(progressJob, { stage: 'finalizing', percent: 98, current: 0, total: 0 });
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

    await writeGenerationProgress(progressJob, { stage: 'complete', percent: 100, current: manifest.pageCount, total: manifest.pageCount });
    scheduleProgressCleanup(progressJob);
    return manifest;
  } catch (error) {
    await writeGenerationProgress(progressJob, { stage: 'failed', percent: 0, current: 0, total: 0 }).catch(() => undefined);
    scheduleProgressCleanup(progressJob);
    throw error;
  } finally {
    await rm(jobRoot, { recursive: true, force: true }).catch(() => undefined);
  }
}

export async function regenerateCatalogWeb(id: string, settings: RenderSettings, progressJob?: string) {
  await ensureStorage();
  safeId(id);
  if (progressJob) safeProgressJob(progressJob);
  const original = sourcePath(id);
  const sourceInfo = await stat(original).catch(() => null);
  if (!sourceInfo?.isFile()) throw new Error('SOURCE_PDF_MISSING');

  const job = randomUUID();
  const jobRoot = path.join(processingDir(), job);
  const tempWeb = path.join(jobRoot, 'web');
  await mkdir(jobRoot, { recursive: true });

  try {
    await runGenerator(original, tempWeb, settings, progressJob);
    await writeGenerationProgress(progressJob, { stage: 'finalizing', percent: 98, current: 0, total: 0 });
    const manifest = await validateGeneratedWeb(tempWeb);
    await replaceGeneratedWeb(id, tempWeb, job);
    await writeGenerationProgress(progressJob, { stage: 'complete', percent: 100, current: manifest.pageCount, total: manifest.pageCount });
    scheduleProgressCleanup(progressJob);
    return manifest;
  } catch (error) {
    await writeGenerationProgress(progressJob, { stage: 'failed', percent: 0, current: 0, total: 0 }).catch(() => undefined);
    scheduleProgressCleanup(progressJob);
    throw error;
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
