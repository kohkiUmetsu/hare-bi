import { requireAdmin } from '@/lib/auth-server';
import { getReportSettings } from '@/lib/settings';
import { DataUpdatesSection } from './_components/data-updates-section';

export default async function DataUpdatesPage() {
  await requireAdmin();
  const settings = await getReportSettings();

  return (
    <div className="flex flex-col gap-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">データ更新設定</h1>
        <p className="text-sm text-neutral-500">
          データの更新状況を管理します。プロジェクトごとの更新履歴を確認・編集できます。
        </p>
      </header>

      <DataUpdatesSection
        request={settings.report_update_requests[0] ?? null}
        projectNames={settings.projects.map((p) => p.project_name)}
      />
    </div>
  );
}
