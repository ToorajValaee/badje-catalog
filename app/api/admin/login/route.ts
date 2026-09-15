import { NextResponse } from 'next/server';
export async function POST(){return NextResponse.json({error:'OTP_LOGIN_REQUIRED'},{status:410});}
