import Link from 'next/link';
import { requireAdmin } from '@/lib/auth-server';
import { getReportSettings } from '@/lib/settings';
import { ProjectWizard } from './_components/project-wizard';

export default async function NewProjectPage() {
  await requireAdmin();
  const settings = await getReportSettings();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-neutral-500">プロジェクト登録</p>
          <h1 className="text-3xl font-semibold">新規プロジェクト</h1>
          <p className="mt-1 text-sm text-neutral-500">
            プロジェクトとセクションを順番に設定します。
          </p>
        </div>
        <Link
          href="/settings"
          className="inline-flex items-center rounded-md border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-900 shadow-sm transition hover:bg-neutral-50"
        >
          一覧に戻る
        </Link>
      </div>

      <ProjectWizard settings={settings} />
    </div>
  );
}
