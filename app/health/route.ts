import { NextResponse } from 'next/server';
import { spawn } from 'node:child_process';
import { pool, ensureSchema } from '@/lib/db';
import { ensureStorage } from '@/lib/storage';

export const dynamic = 'force-dynamic';

async function pythonEngineOk() {
  return new Promise<boolean>((resolve) => {
    const child = spawn('python3', ['-c', 'import pymupdf, PIL; print("ok")'], { stdio: 'ignore' });
    child.on('error', () => resolve(false));
    child.on('close', code => resolve(code === 0));
  });
}

export async function GET() {
  let database: 'ok' | 'error' = 'error';
  let storage: 'ok' | 'error' = 'error';
  let renderer: 'ok' | 'error' = 'error';

  try { await ensureSchema(); await pool().query('select 1'); database = 'ok'; }
  catch (error) { console.error('Database health check failed:', error); }

  try { await ensureStorage(); storage = 'ok'; }
  catch (error) { console.error('Storage health check failed:', error); }

  try { renderer = await pythonEngineOk() ? 'ok' : 'error'; }
  catch (error) { console.error('Renderer health check failed:', error); }

  const healthy = database === 'ok' && storage === 'ok' && renderer === 'ok';
  return NextResponse.json(
    { status: healthy ? 'ok' : 'error', database, storage, renderer },
    { status: healthy ? 200 : 503 },
  );
}
