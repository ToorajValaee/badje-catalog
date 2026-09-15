import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth';
import { currentLocale } from '@/lib/i18n';
import AdminOtpLogin from '@/components/AdminOtpLogin';

export const dynamic='force-dynamic';
export default async function LoginPage(){if(await isAdmin())redirect('/admin/users');const locale=await currentLocale();return <AdminOtpLogin locale={locale}/>;}
