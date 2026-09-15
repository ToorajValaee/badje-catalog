import { NextResponse } from 'next/server';
import { clearUserSession } from '@/lib/auth';
export async function POST(){await clearUserSession();return new NextResponse(null,{status:303,headers:{Location:'/account'}});}
