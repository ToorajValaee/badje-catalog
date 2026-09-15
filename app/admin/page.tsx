import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth';
import { listCatalogs } from '@/lib/catalogs';
import { env } from '@/lib/env';
import { defaultRenderSettings } from '@/lib/render-settings';
import { parseStaticNavigationMode } from '@/lib/navigation';
import AdminDashboard from '@/components/AdminDashboard';
import AdminAccountNav from '@/components/AdminAccountNav';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  if (!(await isAdmin())) redirect('/admin/login');
  const rows = await listCatalogs();
  const items = rows.map(row => ({
    ...row,
    navigationMode: parseStaticNavigationMode(row.navigationMode),
    generatedAt: row.generatedAt?.toISOString() || null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
  return <>
    <AdminAccountNav/>
    <AdminDashboard
      catalogs={items}
      maxUploadMb={env().MAX_UPLOAD_MB}
      renderDefaults={defaultRenderSettings()}
    />
  </>;
}
