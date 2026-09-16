import { cookies } from 'next/headers';

export type Locale = 'en' | 'fa';
export const LOCALE_COOKIE = 'publio_locale';
export function normalizeLocale(value: string | null | undefined): Locale { return value === 'fa' ? 'fa' : 'en'; }
export async function currentLocale(): Promise<Locale> { return normalizeLocale((await cookies()).get(LOCALE_COOKIE)?.value); }

export const messages = {
  en: {
    account: 'Account', signIn: 'Sign in / Register', email: 'Email address', sendOtp: 'Send verification code',
    otp: 'Verification code', verify: 'Verify and continue', logout: 'Sign out', suspended: 'Your account is suspended.',
    plan: 'Plan', storage: 'Storage', upgrade: 'Need more storage or a custom link? Contact us.', upload: 'Upload catalog',
    title: 'Catalog title', slug: 'Custom link', freeSlug: 'Free plan links are generated automatically.', catalogs: 'Your catalogs',
    adminUsers: 'Users', adminPlans: 'Plans', adminEmail: 'Email settings', status: 'Status', save: 'Save',
  },
  fa: {
    account: 'حساب کاربری', signIn: 'ورود / ثبت‌نام', email: 'ایمیل', sendOtp: 'ارسال کد تأیید',
    otp: 'کد تأیید', verify: 'تأیید و ادامه', logout: 'خروج', suspended: 'حساب شما تعلیق شده است.',
    plan: 'پلن', storage: 'فضای ذخیره‌سازی', upgrade: 'برای فضای بیشتر یا لینک اختصاصی با ما تماس بگیرید.', upload: 'آپلود کاتالوگ',
    title: 'عنوان کاتالوگ', slug: 'لینک اختصاصی', freeSlug: 'در پلن رایگان لینک به‌صورت خودکار ساخته می‌شود.', catalogs: 'کاتالوگ‌های شما',
    adminUsers: 'کاربران', adminPlans: 'پلن‌ها', adminEmail: 'تنظیمات ایمیل', status: 'وضعیت', save: 'ذخیره',
  },
} as const;
export function t(locale: Locale) { return messages[locale]; }
