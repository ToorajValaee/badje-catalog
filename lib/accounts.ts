import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { db, ensureSchema } from '@/lib/db';
import { catalogs, otpCodes, plans, users } from '@/lib/schema';
import type { Locale } from '@/lib/i18n';

const OTP_ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function normalizeEmail(value:string){return value.trim().toLowerCase();}
export function normalizeOtp(value:string){return value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);}
export function randomCatalogSlug(){return `p-${randomBytes(6).toString('hex')}`;}
export function hashOtp(email:string,code:string){return createHash('sha256').update(`${email}:${normalizeOtp(code)}:${process.env.SESSION_SECRET||''}`).digest('hex');}
function newOtp(){const bytes=randomBytes(6);let code='';for(const value of bytes)code+=OTP_ALPHABET[value%OTP_ALPHABET.length];return code;}
export async function getFreePlan(){await ensureSchema();const [plan]=await db().select().from(plans).where(eq(plans.code,'free')).limit(1);if(!plan)throw new Error('FREE_PLAN_MISSING');return plan;}
export async function createOtp(email:string,locale:Locale){await ensureSchema();const code=newOtp();await db().insert(otpCodes).values({id:randomUUID(),email,codeHash:hashOtp(email,code),locale,expiresAt:new Date(Date.now()+10*60*1000)});return code;}
export async function consumeOtp(email:string,code:string){await ensureSchema();const clean=normalizeOtp(code);if(clean.length!==6)return false;const rows=await db().select().from(otpCodes).where(and(eq(otpCodes.email,email),isNull(otpCodes.consumedAt))).orderBy(desc(otpCodes.createdAt)).limit(10);const now=Date.now();const match=rows.find(r=>r.expiresAt.getTime()>=now&&r.codeHash===hashOtp(email,clean));if(!match)return false;await db().update(otpCodes).set({consumedAt:new Date()}).where(eq(otpCodes.id,match.id));return true;}
export async function getOrCreateUser(email:string,locale:Locale){await ensureSchema();const [existing]=await db().select().from(users).where(eq(users.email,email)).limit(1);if(existing){await db().update(users).set({locale,lastLoginAt:new Date(),updatedAt:new Date()}).where(eq(users.id,existing.id));return {...existing,locale,lastLoginAt:new Date()};}const plan=await getFreePlan();const id=randomUUID();const now=new Date();await db().insert(users).values({id,email,locale,status:'active',planId:plan.id,emailVerifiedAt:now,lastLoginAt:now});const [created]=await db().select().from(users).where(eq(users.id,id)).limit(1);return created;}
export async function userPlan(userId:string){await ensureSchema();const [row]=await db().select({plan:plans}).from(users).innerJoin(plans,eq(users.planId,plans.id)).where(eq(users.id,userId)).limit(1);return row?.plan||null;}
export async function userStorageUsed(userId:string){await ensureSchema();const [row]=await db().select({total:sql<number>`coalesce(sum(${catalogs.fileSize}+${catalogs.generatedSize}),0)`}).from(catalogs).where(eq(catalogs.userId,userId));return Number(row?.total||0);}
