import { randomBytes, randomUUID, createHash, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { db, ensureSchema } from '@/lib/db';
import { catalogs, otpCodes, plans, users } from '@/lib/schema';
import type { Locale } from '@/lib/i18n';

const scrypt = promisify(scryptCallback);
const OTP_ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function normalizeEmail(value:string){return value.trim().toLowerCase();}
export function normalizeOtp(value:string){return value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);}
export function randomCatalogSlug(){return `p-${randomBytes(6).toString('hex')}`;}
export function hashOtp(email:string,code:string){return createHash('sha256').update(`${email}:${normalizeOtp(code)}:${process.env.SESSION_SECRET||''}`).digest('hex');}
function newOtp(){const bytes=randomBytes(6);let code='';for(const value of bytes)code+=OTP_ALPHABET[value%OTP_ALPHABET.length];return code;}
export async function getFreePlan(){await ensureSchema();const [plan]=await db().select().from(plans).where(eq(plans.code,'free')).limit(1);if(!plan)throw new Error('FREE_PLAN_MISSING');return plan;}
export async function createOtp(email:string,locale:Locale){await ensureSchema();const code=newOtp();await db().insert(otpCodes).values({id:randomUUID(),email,codeHash:hashOtp(email,code),locale,expiresAt:new Date(Date.now()+10*60*1000)});return code;}
export async function consumeOtp(email:string,code:string){await ensureSchema();const clean=normalizeOtp(code);if(clean.length!==6)return false;const rows=await db().select().from(otpCodes).where(and(eq(otpCodes.email,email),isNull(otpCodes.consumedAt))).orderBy(desc(otpCodes.createdAt)).limit(10);const now=Date.now();const match=rows.find(r=>r.expiresAt.getTime()>=now&&r.codeHash===hashOtp(email,clean));if(!match)return false;await db().update(otpCodes).set({consumedAt:new Date()}).where(eq(otpCodes.id,match.id));return true;}

export function validatePassword(value:string){
  if(value.length<8)throw new Error('PASSWORD_TOO_SHORT');
  if(value.length>200)throw new Error('PASSWORD_TOO_LONG');
  return value;
}
export async function hashPassword(password:string){
  validatePassword(password);
  const salt=randomBytes(16);
  const derived=await scrypt(password,salt,64) as Buffer;
  return `scrypt:${salt.toString('base64')}:${derived.toString('base64')}`;
}
export async function verifyPassword(password:string,stored:string){
  try{
    const [kind,saltB64,hashB64]=stored.split(':');
    if(kind!=='scrypt'||!saltB64||!hashB64)return false;
    const salt=Buffer.from(saltB64,'base64');
    const expected=Buffer.from(hashB64,'base64');
    const actual=await scrypt(password,salt,expected.length) as Buffer;
    return actual.length===expected.length&&timingSafeEqual(actual,expected);
  }catch{return false;}
}
export async function registerUser(email:string,password:string,locale:Locale){
  await ensureSchema();
  const [existing]=await db().select().from(users).where(eq(users.email,email)).limit(1);
  const now=new Date();
  const passwordHash=await hashPassword(password);
  if(existing){
    if(existing.passwordHash)throw new Error('EMAIL_EXISTS');
    await db().update(users).set({passwordHash,locale,lastLoginAt:now,updatedAt:now}).where(eq(users.id,existing.id));
    return {...existing,passwordHash,locale,lastLoginAt:now,updatedAt:now};
  }
  const plan=await getFreePlan();
  const id=randomUUID();
  await db().insert(users).values({id,email,passwordHash,locale,status:'active',planId:plan.id,emailVerifiedAt:null,lastLoginAt:now});
  const [created]=await db().select().from(users).where(eq(users.id,id)).limit(1);
  if(!created)throw new Error('REGISTER_FAILED');
  return created;
}
export async function passwordUser(email:string,password:string,locale:Locale){
  await ensureSchema();
  const [user]=await db().select().from(users).where(eq(users.email,email)).limit(1);
  if(!user||!user.passwordHash)return null;
  if(!(await verifyPassword(password,user.passwordHash)))return null;
  const now=new Date();
  await db().update(users).set({locale,lastLoginAt:now,updatedAt:now}).where(eq(users.id,user.id));
  return {...user,locale,lastLoginAt:now};
}

export async function userPlan(userId:string){await ensureSchema();const [row]=await db().select({plan:plans}).from(users).innerJoin(plans,eq(users.planId,plans.id)).where(eq(users.id,userId)).limit(1);return row?.plan||null;}
export async function userStorageUsed(userId:string){await ensureSchema();const [row]=await db().select({total:sql<number>`coalesce(sum(${catalogs.fileSize}+${catalogs.generatedSize}),0)`}).from(catalogs).where(eq(catalogs.userId,userId));return Number(row?.total||0);}
