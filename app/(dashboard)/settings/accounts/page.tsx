import Link from 'next/link';
import { requireAdmin } from '@/lib/auth-server';
import { getReportSettings } from '@/lib/settings';
import { AccountsTabs } from './_components/accounts-tabs';

export default async function AccountsSettingsPage() {
  await requireAdmin();
  const settings = await getReportSettings();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">媒体アカウント管理</h1>
          <p className="mt-1 text-sm text-neutral-500">
            各媒体のアカウント情報を登録・管理します。
          </p>
        </div>
        <Link
          href="/settings"
          className="inline-flex items-center border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-900 shadow-sm transition hover:bg-neutral-50"
        >
          一覧に戻る
        </Link>
      </div>

      <AccountsTabs settings={settings} />
    </div>
  );
}
