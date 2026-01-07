import Link from 'next/link';
import { requireAdmin } from '@/lib/auth-server';
import { getReportSettings } from '@/lib/settings';
import { ProjectTable, type ProjectTableRow } from './_components/project-table';

export default async function SettingsPage() {
  await requireAdmin();
  const settings = await getReportSettings();
  if (!settings || typeof settings !== 'object') {
    console.error('[SettingsPage] getReportSettings returned invalid value:', settings);
  }
  console.log('[SettingsPage] Received report settings summary:', {
    projects: settings.projects?.length,
    sections: settings.sections?.length,
    platform_settings: settings.platform_settings?.length,
  });
  const sectionCounts = new Map<string, number>();
  settings.sections.forEach((section) => {
    sectionCounts.set(
      section.project_name,
      (sectionCounts.get(section.project_name) ?? 0) + 1
    );
  });

  const projectRows: ProjectTableRow[] = settings.projects.map((project) => ({
    project_name: project.project_name,
    sections: sectionCounts.get(project.project_name) ?? 0,
    msp_advertiser_ids: project.msp_advertiser_ids,
    meta_account_ids: project.meta_account_ids,
    tiktok_advertiser_ids: project.tiktok_advertiser_ids,
    google_ads_customer_ids: project.google_ads_customer_ids,
    line_account_ids: project.line_account_ids,
  }));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">レポート設定</h1>
          <p className="text-sm text-neutral-500">
            プロジェクトごとの設定状況を一覧で確認し、行をクリックすると詳細ページでセクション設定を編集できます。
          </p>
        </header>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/settings/projects/new"
            className="inline-flex items-center border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-900 shadow-sm transition hover:bg-neutral-50"
          >
            プロジェクトを追加
          </Link>
          <Link
            href="/settings/accounts"
            className="inline-flex items-center bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800"
          >
            媒体アカウントを登録
          </Link>
        </div>
      </div>

      <ProjectTable rows={projectRows} />

      <p className="text-sm text-neutral-500">
        セクション詳細の編集はプロジェクト詳細ページから行えます。
      </p>
    </div>
  );
}
