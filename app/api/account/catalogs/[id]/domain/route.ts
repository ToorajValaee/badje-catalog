import { NextRequest, NextResponse } from 'next/server';
import { and, eq, ne } from 'drizzle-orm';
import { requireUser } from '@/lib/auth';
import { assertSameOrigin } from '@/lib/http';
import { db, ensureSchema } from '@/lib/db';
import { catalogs } from '@/lib/schema';
import { userPlan } from '@/lib/accounts';
import {
  normalizeCustomDomain,
  removeCustomDomainFiles,
  validateCustomDomainCertificate,
  verifyCustomDomainDns,
  writeCustomDomainFiles,
  requestNginxReload,
} from '@/lib/custom-domains';
import { env } from '@/lib/env';

async function owned(userId:string,id:string){
  await ensureSchema();
  const [catalog]=await db().select().from(catalogs).where(and(eq(catalogs.id,id),eq(catalogs.userId,userId))).limit(1);
  return catalog||null;
}

export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  try{
    assertSameOrigin(request);
    const user=await requireUser();
    const {id}=await params;
    const catalog=await owned(user.id,id);
    if(!catalog)return NextResponse.json({error:'NOT_FOUND'},{status:404});
    const plan=await userPlan(user.id);
    if(!plan?.active||!plan.customDomain)return NextResponse.json({error:'CUSTOM_DOMAIN_PLAN_REQUIRED'},{status:403});

    const form=await request.formData();
    const action=String(form.get('action')||'activate');
    const domain=normalizeCustomDomain(String(form.get('domain')||''));
    const target=normalizeCustomDomain(env().CUSTOM_DOMAIN_CNAME_TARGET);
    if(domain===target)return NextResponse.json({error:'INVALID_DOMAIN'},{status:400});

    if(catalog.customDomainStatus==='active'&&catalog.customDomain&&catalog.customDomain!==domain){
      return NextResponse.json({error:'REMOVE_CURRENT_DOMAIN_FIRST'},{status:409});
    }

    const [duplicate]=await db().select({id:catalogs.id}).from(catalogs)
      .where(and(eq(catalogs.customDomain,domain),ne(catalogs.id,id))).limit(1);
    if(duplicate)return NextResponse.json({error:'DOMAIN_IN_USE'},{status:409});

    const dnsOk=await verifyCustomDomainDns(domain);
    if(!dnsOk){
      await db().update(catalogs).set({
        customDomain:domain,
        customDomainStatus:'dns_pending',
        customDomainVerifiedAt:null,
        customDomainCertificateExpiresAt:null,
        updatedAt:new Date(),
      }).where(eq(catalogs.id,id));
      return NextResponse.json({error:'DNS_NOT_READY',domain,target,status:'dns_pending'},{status:409});
    }

    if(action==='check-dns'){
      if(catalog.customDomainStatus==='active'&&catalog.customDomain===domain){
        return NextResponse.json({ok:true,domain,target,status:'active'});
      }
      await db().update(catalogs).set({
        customDomain:domain,
        customDomainStatus:'dns_verified',
        customDomainVerifiedAt:new Date(),
        updatedAt:new Date(),
      }).where(eq(catalogs.id,id));
      return NextResponse.json({ok:true,domain,target,status:'dns_verified'});
    }

    const fullchain=form.get('fullchain');
    const privateKey=form.get('privateKey');
    if(!(fullchain instanceof File)||!(privateKey instanceof File)){
      return NextResponse.json({error:'CERTIFICATE_FILES_REQUIRED'},{status:400});
    }
    if(fullchain.size>128*1024||privateKey.size>64*1024){
      return NextResponse.json({error:'CERTIFICATE_TOO_LARGE'},{status:413});
    }

    const fullchainPem=await fullchain.text();
    const privateKeyPem=await privateKey.text();
    const {expiresAt}=validateCustomDomainCertificate(domain,fullchainPem,privateKeyPem);

    await writeCustomDomainFiles({
      catalogId:id,
      domain,
      slug:catalog.slug,
      fullchainPem,
      privateKeyPem,
    },false);

    const now=new Date();
    await db().update(catalogs).set({
      customDomain:domain,
      customDomainStatus:'active',
      customDomainVerifiedAt:now,
      customDomainCertificateExpiresAt:expiresAt,
      updatedAt:now,
    }).where(eq(catalogs.id,id));
    await requestNginxReload();

    return NextResponse.json({
      ok:true,
      domain,
      target,
      status:'active',
      certificateExpiresAt:expiresAt.toISOString(),
      reloadRequested:true,
    });
  }catch(error){
    const message=error instanceof Error?error.message:'CUSTOM_DOMAIN_FAILED';
    console.error('Custom domain setup failed',error);
    const bad=new Set([
      'INVALID_DOMAIN','INVALID_CERTIFICATE','INVALID_PRIVATE_KEY','PRIVATE_KEY_MISMATCH',
      'CERTIFICATE_HOST_MISMATCH','CERTIFICATE_NOT_VALID','CERTIFICATE_TOO_LARGE',
    ]);
    return NextResponse.json({error:message},{status:bad.has(message)?400:500});
  }
}

export async function DELETE(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  try{
    assertSameOrigin(request);
    const user=await requireUser();
    const {id}=await params;
    const catalog=await owned(user.id,id);
    if(!catalog)return NextResponse.json({error:'NOT_FOUND'},{status:404});
    await removeCustomDomainFiles(id);
    await db().update(catalogs).set({
      customDomain:null,
      customDomainStatus:'none',
      customDomainVerifiedAt:null,
      customDomainCertificateExpiresAt:null,
      updatedAt:new Date(),
    }).where(eq(catalogs.id,id));
    return NextResponse.json({ok:true,reloadRequested:true});
  }catch(error){
    console.error(error);
    return NextResponse.json({error:'CUSTOM_DOMAIN_REMOVE_FAILED'},{status:500});
  }
}
