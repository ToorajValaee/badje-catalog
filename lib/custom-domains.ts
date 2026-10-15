import { createHash, createPrivateKey, createPublicKey, X509Certificate } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { resolveCname } from 'node:dns/promises';
import { domainToASCII } from 'node:url';
import { env } from '@/lib/env';

export type CustomDomainStatus = 'none' | 'dns_pending' | 'dns_verified' | 'active' | 'error';

function rootDir(){return path.resolve(env().CUSTOM_DOMAIN_ROOT);}
function certRoot(){return path.join(rootDir(),'certs');}
function nginxRoot(){return path.join(rootDir(),'nginx');}
function signalPath(){return path.join(rootDir(),'reload.request');}

export function normalizeCustomDomain(value:string){
  const raw=value.trim().toLowerCase().replace(/\.$/,'');
  if(!raw||raw.includes('/')||raw.includes(':')||raw.includes('@'))throw new Error('INVALID_DOMAIN');
  const ascii=domainToASCII(raw).toLowerCase();
  if(!ascii||ascii.length>253||!ascii.includes('.'))throw new Error('INVALID_DOMAIN');
  if(!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(ascii))throw new Error('INVALID_DOMAIN');
  return ascii;
}

export async function verifyCustomDomainDns(domain:string){
  const target=normalizeCustomDomain(env().CUSTOM_DOMAIN_CNAME_TARGET);
  let records:string[]=[];
  try{records=await resolveCname(domain);}catch{return false;}
  return records.some(record=>record.toLowerCase().replace(/\.$/,'')===target);
}

function certPublicKeyFingerprint(cert:X509Certificate){
  const der=cert.publicKey.export({type:'spki',format:'der'});
  return createHash('sha256').update(der).digest('hex');
}
function privatePublicKeyFingerprint(privatePem:string){
  const key=createPrivateKey(privatePem);
  const pub=createPublicKey(key);
  const der=pub.export({type:'spki',format:'der'});
  return createHash('sha256').update(der).digest('hex');
}

export function validateCustomDomainCertificate(domain:string,fullchainPem:string,privateKeyPem:string){
  if(Buffer.byteLength(fullchainPem)>128*1024||Buffer.byteLength(privateKeyPem)>64*1024)throw new Error('CERTIFICATE_TOO_LARGE');
  const leafPem=fullchainPem.match(/-----BEGIN CERTIFICATE-----[\\s\\S]+?-----END CERTIFICATE-----/)?.[0];
  if(!leafPem)throw new Error('INVALID_CERTIFICATE');
  let cert:X509Certificate;
  try{cert=new X509Certificate(leafPem);}catch{throw new Error('INVALID_CERTIFICATE');}
  if(!cert.checkHost(domain,{subject:'default'}))throw new Error('CERTIFICATE_HOST_MISMATCH');
  const now=Date.now();
  const validFrom=Date.parse(cert.validFrom);
  const validTo=Date.parse(cert.validTo);
  if(!Number.isFinite(validFrom)||!Number.isFinite(validTo)||now<validFrom||now>=validTo)throw new Error('CERTIFICATE_NOT_VALID');
  let privateFingerprint:string;
  try{privateFingerprint=privatePublicKeyFingerprint(privateKeyPem);}catch{throw new Error('INVALID_PRIVATE_KEY');}
  if(privateFingerprint!==certPublicKeyFingerprint(cert))throw new Error('PRIVATE_KEY_MISMATCH');
  return {expiresAt:new Date(validTo)};
}

function safeCatalogId(id:string){
  if(!/^[a-f0-9-]{36}$/i.test(id))throw new Error('INVALID_CATALOG_ID');
  return id;
}
function nginxEscape(value:string){
  if(!/^[a-z0-9.-]+$/.test(value))throw new Error('INVALID_NGINX_VALUE');
  return value;
}
function slugEscape(value:string){
  if(!/^[a-z0-9-]+$/.test(value))throw new Error('INVALID_NGINX_VALUE');
  return value;
}

export async function writeCustomDomainFiles(args:{catalogId:string;domain:string;slug:string;fullchainPem:string;privateKeyPem:string},signalReload=true){
  const id=safeCatalogId(args.catalogId);
  const domain=nginxEscape(normalizeCustomDomain(args.domain));
  const slug=slugEscape(args.slug);
  const certDir=path.join(certRoot(),id);
  await mkdir(certDir,{recursive:true,mode:0o700});
  await mkdir(nginxRoot(),{recursive:true,mode:0o755});
  await writeFile(path.join(certDir,'fullchain.pem'),args.fullchainPem,{encoding:'utf8',mode:0o644});
  await writeFile(path.join(certDir,'privkey.pem'),args.privateKeyPem,{encoding:'utf8',mode:0o600});

  const config=`server {
    listen 443 ssl;
    server_name ${domain};

    ssl_certificate     /data/custom-domains/certs/${id}/fullchain.pem;
    ssl_certificate_key /data/custom-domains/certs/${id}/privkey.pem;

    client_max_body_size 200M;
    sendfile on;

    location ^~ /_catalog_assets/ {
        alias /data/catalog-assets/;
        types { image/webp webp; application/json json; }
        default_type application/octet-stream;
        add_header Cache-Control "public, max-age=31536000" always;
        add_header X-Content-Type-Options "nosniff" always;
        error_page 404 = @catalog_asset_fallback_${id.replace(/-/g,'_')};
    }

    location @catalog_asset_fallback_${id.replace(/-/g,'_')} {
        proxy_pass http://host.docker.internal:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_http_version 1.1;
    }

    location = / {
        proxy_pass http://host.docker.internal:8000/${slug};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_http_version 1.1;
    }

    location ~ ^/p/([0-9]+)$ {
        rewrite ^/p/([0-9]+)$ /${slug}/p/$1 break;
        proxy_pass http://host.docker.internal:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_http_version 1.1;
    }

    location = /pdf {
        proxy_pass http://host.docker.internal:8000/api/catalogs/${slug}/pdf;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location ^~ /_next/ {
        proxy_pass http://host.docker.internal:8000;
        proxy_set_header Host $host;
        proxy_http_version 1.1;
    }

    location ^~ /fonts/ {
        proxy_pass http://host.docker.internal:8000;
        proxy_set_header Host $host;
    }

    location ^~ /img/ {
        proxy_pass http://host.docker.internal:8000;
        proxy_set_header Host $host;
    }

    location / {
        return 404;
    }
}

server {
    listen 80;
    server_name ${domain};
    return 301 https://$host$request_uri;
}
`;

  await writeFile(path.join(nginxRoot(),`${id}.conf`),config,{encoding:'utf8',mode:0o644});
  if(signalReload)await requestNginxReload();
}

export async function refreshCustomDomainNginxConfig(catalogId:string,domain:string,slug:string){
  const id=safeCatalogId(catalogId);
  const fullchainPem=await readFile(path.join(certRoot(),id,'fullchain.pem'),'utf8');
  const privateKeyPem=await readFile(path.join(certRoot(),id,'privkey.pem'),'utf8');
  await writeCustomDomainFiles({catalogId:id,domain,slug,fullchainPem,privateKeyPem});
}

export async function removeCustomDomainFiles(catalogId:string){
  const id=safeCatalogId(catalogId);
  await Promise.all([
    rm(path.join(certRoot(),id),{recursive:true,force:true}),
    rm(path.join(nginxRoot(),`${id}.conf`),{force:true}),
  ]);
  await requestNginxReload();
}

export async function requestNginxReload(){
  await mkdir(rootDir(),{recursive:true,mode:0o755});
  await writeFile(signalPath(),new Date().toISOString(),{encoding:'utf8',mode:0o644});
}
