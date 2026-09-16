import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { catalogGeneratedDir } from '@/lib/storage';

function safeId(id: string) {
  return /^[a-f0-9-]{36}$/i.test(id);
}

function safeAsset(parts: string[]) {
  if (parts.length === 1 && parts[0] === 'manifest.json') return parts;
  if (parts.length === 2 && parts[0] === 'pages' && /^\d{4}\.webp$/i.test(parts[1])) return parts;
  return null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; asset: string[] }> },
) {
  const { id, asset } = await params;
  if (!safeId(id)) return new NextResponse('Not found', { status: 404 });
  const clean = safeAsset(asset);
  if (!clean) return new NextResponse('Not found', { status: 404 });

  try {
    const file = await readFile(path.join(catalogGeneratedDir(id), ...clean));
    const body = new Uint8Array(file.buffer, file.byteOffset, file.byteLength);
    const isWebp = clean.at(-1)?.toLowerCase().endsWith('.webp');
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': isWebp ? 'image/webp' : 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
