import { MetricsPanel } from "../_components/metrics-panel";
import { ProjectFilterForm } from "./project-filter-form";
import {
  fetchProjectDailyMetrics,
  listProjects,
  type DailyMetricRow,
  type ProjectOption,
} from "@/lib/metrics";
import { buildDefaultDateRange, normalizeDateRange, parseDateParam } from "@/lib/date-range";
import { requireAdmin } from "@/lib/auth-server";

interface ProjectsPageProps {
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

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  await requireAdmin();
  const { start: defaultStart, end: defaultEnd } = buildDefaultDateRange();
  const parsedStart = parseDateParam(searchParams?.startDate, defaultStart);
  const parsedEnd = parseDateParam(searchParams?.endDate, defaultEnd);
  const { start: startDate, end: endDate } = normalizeDateRange(parsedStart, parsedEnd);

  let projects: ProjectOption[] = [];
  let selectedProjectId: string | null = null;
  let selectedProjectName: string | null = null;
  let metrics: DailyMetricRow[] = [];
  let loadError: string | null = null;

  try {
    projects = await listProjects();
    selectedProjectId = resolveProjectId(searchParams?.projectId, projects);
    selectedProjectName = projects.find((project) => project.id === selectedProjectId)?.name ?? null;

    if (selectedProjectId) {
      metrics = await fetchProjectDailyMetrics({
        entityId: selectedProjectId,
        startDate,
        endDate,
      });
    }
  } catch (error) {
    loadError = error instanceof Error ? error.message : "BigQueryからの取得に失敗しました。";
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">プロジェクト指標</h1>
        <p className="text-sm text-neutral-500">
          プロジェクトと期間を選択して、dailyレコードに基づく主要指標を表示します。
        </p>
      </header>

      <ProjectFilterForm
        projects={projects}
        selectedProjectId={selectedProjectId}
        startDate={startDate}
        endDate={endDate}
      />

      {loadError ? (
        <section className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </section>
      ) : null}

      {!loadError && !selectedProjectId ? (
        <section className="rounded-lg border border-dashed border-neutral-300 bg-white px-4 py-6 text-sm text-neutral-500">
          {projects.length === 0
            ? 'プロジェクトが存在しません。BigQueryにデータを追加してから再度アクセスしてください。'
            : 'プロジェクトを選択し、「表示」を押してください。'}
        </section>
      ) : null}

      {!loadError && selectedProjectId ? (
        <section className="flex flex-col gap-4">
          {selectedProjectName ? (
            <div className="text-sm text-neutral-500">
              選択中: <span className="font-medium text-neutral-900">{selectedProjectName}</span>
            </div>
          ) : null}
          <MetricsPanel metrics={metrics} />
        </section>
      ) : null}
    </div>
  );
}
