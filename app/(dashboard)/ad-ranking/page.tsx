import { ProjectFilterForm } from '../projects/project-filter-form';
import { requireAdmin } from '@/lib/auth-server';
import { buildDefaultDateRange, normalizeDateRange, parseDateParam } from '@/lib/date-range';
import { fetchAdRanking } from '@/lib/ad-ranking';
import type { AdRankingRow } from '@/lib/ad-ranking-types';
import { listProjects, type ProjectOption } from '@/lib/metrics';
import { getProjectAppearanceByName } from '@/lib/settings';
import { AdRankingTable } from './ad-ranking-table';

interface AdRankingPageProps {
  searchParams?: {
    projectId?: string;
    startDate?: string;
    endDate?: string;
  };
}

function resolveProjectId(
  projectId: string | undefined,
  projects: ProjectOption[]
): string | null {
  if (!projectId || !projects.length) {
    return null;
  }

  return projects.some((project) => project.id === projectId) ? projectId : null;
}

export default async function AdRankingPage({ searchParams }: AdRankingPageProps) {
  await requireAdmin();

  const { start: defaultStart, end: defaultEnd } = buildDefaultDateRange();
  const parsedStart = parseDateParam(searchParams?.startDate, defaultStart);
  const parsedEnd = parseDateParam(searchParams?.endDate, defaultEnd);
  const { start: startDate, end: endDate } = normalizeDateRange(parsedStart, parsedEnd);

  let projects: ProjectOption[] = [];
  let selectedProjectId: string | null = null;
  let selectedProjectName: string | null = null;
  let rows: AdRankingRow[] = [];
  let loadError: string | null = null;
  let panelBorderColor: string | null = null;

  try {
    projects = await listProjects();
    selectedProjectId = resolveProjectId(searchParams?.projectId, projects);
    selectedProjectName = projects.find((project) => project.id === selectedProjectId)?.name ?? null;

    if (selectedProjectName) {
      try {
        const projectAppearance = await getProjectAppearanceByName(selectedProjectName);
        panelBorderColor = projectAppearance.project_color ?? 'var(--accent-color)';
      } catch {
        panelBorderColor = 'var(--accent-color)';
      }
    }

    if (selectedProjectName) {
      rows = await fetchAdRanking({ projectName: selectedProjectName, startDate, endDate });
    }
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'APIからの取得に失敗しました。';
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-4">
        <h1 className="text-4xl font-bold text-[var(--accent-color)] tracking-wide">AD RANKING</h1>
        <button type="button" className="text-4xl text-[var(--accent-color)] hover:opacity-80 leading-none flex items-center">
          ‹
        </button>
        <button type="button" className="text-4xl text-[var(--accent-color)] hover:opacity-80 leading-none flex items-center">
          ›
        </button>
      </header>
      <p className="text-sm text-neutral-700">
        プロジェクトと期間を選択して、アド単位の消化金額・媒体CV・CPAをランキング表示します。
      </p>

      <ProjectFilterForm
        projects={projects}
        selectedProjectId={selectedProjectId}
        startDate={startDate}
        endDate={endDate}
        panelBorderColor={panelBorderColor}
      />

      {loadError ? (
        <section className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </section>
      ) : null}

      {!loadError && selectedProjectName ? (
        <AdRankingTable rows={rows} panelBorderColor={panelBorderColor} />
      ) : null}
    </div>
  );
}
