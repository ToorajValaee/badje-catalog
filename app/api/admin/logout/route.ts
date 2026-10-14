import { NextRequest, NextResponse } from 'next/server';
import { clearAuthSessions } from '@/lib/auth';
import { assertSameOrigin } from '@/lib/http';
export async function POST(request:NextRequest){try{assertSameOrigin(request);}catch{return new NextResponse('Forbidden',{status:403});}await clearAuthSessions();return new NextResponse(null,{status:303,headers:{Location:'/account'}});}
