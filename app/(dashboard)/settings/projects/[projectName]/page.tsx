import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth-server';
import { getReportSettings } from '@/lib/settings';
import { ProjectEditSection } from '../../_components/project-edit-section';
import { SectionSettingsSection } from '../../_components/section-settings-section';
import { PlatformSettingsSection } from '../../_components/platform-settings-section';

interface ProjectDetailPageProps {
  params: {
    projectName: string;
  };
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  await requireAdmin();
  const decodedName = decodeURIComponent(params.projectName);
  const settings = await getReportSettings();
  const project = settings.projects.find((item) => item.project_name === decodedName);

  if (!project) {
    notFound();
  }

  const sections = settings.sections.filter((section) => section.project_name === decodedName);
  const platformSettings = settings.platform_settings.filter((ps) => ps.project_name === decodedName);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-neutral-500">プロジェクト詳細</p>
          <h1 className="text-3xl font-semibold">{project.project_name}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            プロジェクト設定、セクション設定、媒体設定を編集できます。
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/settings"
            className="inline-flex items-center rounded-md border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-900 shadow-sm transition hover:bg-neutral-50"
          >
            一覧に戻る
          </Link>
          <Link
            href="/settings/accounts"
            className="inline-flex items-center rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800"
          >
            媒体アカウントを登録
          </Link>
        </div>
      </div>

      <ProjectEditSection project={project} settings={settings} />

      <SectionSettingsSection
        sections={sections}
        projectNames={[project.project_name]}
        fixedProjectName={project.project_name}
      />

      <PlatformSettingsSection
        platformSettings={platformSettings}
        sections={sections}
        fixedProjectName={project.project_name}
      />
    </div>
  );
}
