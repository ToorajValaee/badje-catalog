import { NextResponse } from 'next/server';
import { clearAuthSessions } from '@/lib/auth';
export async function POST(){await clearAuthSessions();return new NextResponse(null,{status:303,headers:{Location:'/account'}});}
