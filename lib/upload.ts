import type { NextRequest } from 'next/server';
import { env } from '@/lib/env';

export async function pdfStreamFromRequest(request: NextRequest, required = true) {
  const hasFile = request.headers.get('x-has-file') !== 'false';
  if (!hasFile) {
    if (required) throw new Error('PDF_REQUIRED');
    return null;
  }
  const size = Number(request.headers.get('x-file-size') || '0');
  const filename = decodeURIComponent(request.headers.get('x-file-name') || 'catalog.pdf');
  if (!Number.isFinite(size) || size <= 0) throw new Error('PDF_REQUIRED');
  if (size > env().MAX_UPLOAD_MB * 1024 * 1024) throw new Error('PDF_TOO_LARGE');
  if (!request.body) throw new Error('PDF_REQUIRED');

  const reader = request.body.getReader();
  const first = await reader.read();
  if (first.done || !first.value) throw new Error('PDF_REQUIRED');
  const signature = new TextDecoder().decode(first.value.slice(0, 5));
  if (signature !== '%PDF-') throw new Error('PDF_INVALID');

  let seen = first.value.byteLength;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(first.value!);
    },
    async pull(controller) {
      const chunk = await reader.read();
      if (chunk.done) {
        controller.close();
        return;
      }
      seen += chunk.value.byteLength;
      if (seen > env().MAX_UPLOAD_MB * 1024 * 1024) {
        await reader.cancel();
        controller.error(new Error('PDF_TOO_LARGE'));
        return;
      }
      controller.enqueue(chunk.value);
    },
    cancel() { reader.cancel(); }
  });
  return { stream, size, filename: filename.slice(0, 255) };
}
