import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { createHash, timingSafeEqual } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { env } from '@/lib/env';
import { db, ensureSchema } from '@/lib/db';
import { users } from '@/lib/schema';

const ADMIN_COOKIE = 'badje_catalog_admin';
const USER_COOKIE = 'publio_user';
const TTL = 60 * 60 * 24 * 30;
function key() { return new TextEncoder().encode(env().SESSION_SECRET); }
function safeEqual(a: string, b: string) { const aa=createHash('sha256').update(a).digest(); const bb=createHash('sha256').update(b).digest(); return timingSafeEqual(aa,bb); }
export function credentialsValid(username:string,password:string){return safeEqual(username,env().ADMIN_USERNAME)&&safeEqual(password,env().ADMIN_PASSWORD);}
export async function createSession(){const token=await new SignJWT({admin:true}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('12h').sign(key());(await cookies()).set(ADMIN_COOKIE,token,{httpOnly:true,secure:env().COOKIE_SECURE==='true',sameSite:'strict',path:'/',maxAge:60*60*12});}
export async function clearSession(){(await cookies()).delete(ADMIN_COOKIE);}
export async function isAdmin(){const token=(await cookies()).get(ADMIN_COOKIE)?.value;if(!token)return false;try{return (await jwtVerify(token,key())).payload.admin===true;}catch{return false;}}
export async function requireAdmin(){if(!(await isAdmin()))throw new Error('UNAUTHORIZED');}

export async function createUserSession(userId:string){const token=await new SignJWT({uid:userId,role:'user'}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime(`${TTL}s`).sign(key());(await cookies()).set(USER_COOKIE,token,{httpOnly:true,secure:env().COOKIE_SECURE==='true',sameSite:'lax',path:'/',maxAge:TTL});}
export async function clearUserSession(){(await cookies()).delete(USER_COOKIE);}
export async function currentUser(){const token=(await cookies()).get(USER_COOKIE)?.value;if(!token)return null;try{const {payload}=await jwtVerify(token,key());if(typeof payload.uid!=='string')return null;await ensureSchema();const [user]=await db().select().from(users).where(eq(users.id,payload.uid)).limit(1);return user||null;}catch{return null;}}
export async function requireUser(){const user=await currentUser();if(!user)throw new Error('UNAUTHORIZED');if(user.status==='suspended')throw new Error('SUSPENDED');return user;}
