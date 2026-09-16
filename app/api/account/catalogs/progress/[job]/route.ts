import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { readGenerationProgress } from '@/lib/storage';
export async function GET(_:Request,{params}:{params:Promise<{job:string}>}){try{await requireUser();const {job}=await params;return NextResponse.json(await readGenerationProgress(job));}catch{return NextResponse.json({error:'UNAUTHORIZED'},{status:401});}}
