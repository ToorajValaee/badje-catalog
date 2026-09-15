import type { Locale } from '@/lib/i18n';

function shell(title:string,body:string,locale:Locale){return `<!doctype html><html lang="${locale}" dir="${locale==='fa'?'rtl':'ltr'}"><body style="margin:0;background:#f3f7f5;font-family:Arial,Tahoma,sans-serif;color:#14231e"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:42px 16px"><table width="100%" style="max-width:580px;background:#fff;border:1px solid #dde7e2;border-radius:22px;padding:36px;box-shadow:0 18px 50px rgba(20,35,30,.08)"><tr><td><div style="font-size:12px;letter-spacing:.16em;color:#1f6a4f;text-transform:uppercase;font-weight:700">PUBLIO · Powered by badje.ir</div><h1 style="font-size:27px;line-height:1.35;margin:15px 0 18px;color:#14231e">${title}</h1>${body}<div style="height:1px;background:#e5ece8;margin:30px 0 18px"></div><p style="margin:0;color:#697871;font-size:12px">${locale==='fa'?'این ایمیل به‌صورت خودکار از Publio ارسال شده است.':'This message was sent automatically by Publio.'}</p></td></tr></table></td></tr></table></body></html>`;}

function resendConfig(){
  return {
    apiKey: (process.env.RESEND_API_KEY || '').trim(),
    fromName: (process.env.RESEND_FROM_NAME || 'Publio').trim() || 'Publio',
    fromEmail: (process.env.RESEND_FROM_EMAIL || 'publio@badje.ir').trim() || 'publio@badje.ir',
    replyTo: (process.env.RESEND_REPLY_TO || '').trim() || undefined,
  };
}

export async function sendMail(to:string,subject:string,html:string){
  const {apiKey,fromName,fromEmail,replyTo}=resendConfig();
  if(!apiKey){
    console.error('Resend is not configured: RESEND_API_KEY is missing');
    return false;
  }
  const res=await fetch('https://api.resend.com/emails',{
    method:'POST',
    headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
    body:JSON.stringify({from:`${fromName} <${fromEmail}>`,to:[to],subject,html,reply_to:replyTo})
  });
  if(!res.ok){console.error('Resend failed',res.status,await res.text());return false;}
  return true;
}

export async function sendOtpMail(email:string,code:string,locale:Locale){const subject=locale==='fa'?'کد تأیید Publio':'Your Publio verification code';const intro=locale==='fa'?'کد ورود/ثبت‌نام شما':'Your sign-in / registration code';const expiry=locale==='fa'?'این کد تا ۱۰ دقیقه معتبر است.':'This code expires in 10 minutes.';const cells=code.split('').map(ch=>`<td align="center" style="width:48px;height:54px;border:1px solid #cddcd5;border-radius:10px;background:#f8fbf9;font-size:24px;font-weight:800;color:#154d3a">${ch}</td>`).join('<td style="width:6px"></td>');const body=`<p style="color:#697871">${intro}:</p><table cellpadding="0" cellspacing="0" align="center" dir="ltr"><tr>${cells}</tr></table><p style="margin-top:22px;color:#697871">${expiry}</p>`;return sendMail(email,subject,shell(subject,body,locale));}
export async function sendWelcomeMail(email:string,locale:Locale){const subject=locale==='fa'?'حساب Publio شما آماده است':'Welcome to Publio';const body=locale==='fa'?'<p>ثبت‌نام شما با موفقیت انجام شد. پلن رایگان شما شامل ۵۰ مگابایت فضا است.</p>':'<p>Your account is ready. Your free plan includes 50 MB of storage.</p>';return sendMail(email,subject,shell(subject,body,locale));}
export async function sendAdminChangeMail(email:string,locale:Locale,messageEn:string,messageFa:string){const subject=locale==='fa'?'تغییر در حساب Publio':'Your Publio account was updated';return sendMail(email,subject,shell(subject,`<p>${locale==='fa'?messageFa:messageEn}</p>`,locale));}
export async function sendLimitMail(email:string,locale:Locale){const subject=locale==='fa'?'سقف فضای Publio':'Publio storage limit reached';const body=locale==='fa'?'<p>به سقف فضای پلن خود رسیده‌اید. برای افزایش فضا با publio@badje.ir تماس بگیرید.</p>':'<p>You reached your plan storage limit. Contact publio@badje.ir for more storage.</p>';return sendMail(email,subject,shell(subject,body,locale));}
