import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { readGenerationProgress } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'دسترسی غیرمجاز است.' }, { status: 401 }); }

  const job = request.nextUrl.searchParams.get('job') || '';
  try {
    const progress = await readGenerationProgress(job);
    return NextResponse.json(progress, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'شناسه پیشرفت معتبر نیست.' }, { status: 400 });
  }
}
