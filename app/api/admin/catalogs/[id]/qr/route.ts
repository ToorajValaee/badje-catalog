import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { requireAdmin } from '@/lib/auth';
import { findCatalogById } from '@/lib/catalogs';
import { externalOrigin } from '@/lib/http';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return new NextResponse('Unauthorized', { status: 401 }); }
  const { id } = await params;
  const catalog = await findCatalogById(id);
  if (!catalog) return new NextResponse('Not found', { status: 404 });
  const url = `${externalOrigin(request)}/${encodeURIComponent(catalog.slug)}`;
  const png = await QRCode.toBuffer(url, { type: 'png', width: 720, margin: 2, errorCorrectionLevel: 'M' });
  return new NextResponse(new Uint8Array(png), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' } });
}
