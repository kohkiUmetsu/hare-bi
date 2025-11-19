import { MetricsPanel } from "../_components/metrics-panel";
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
  if (!projects.length) {
    return null;
  }

  if (projectId && projects.some((project) => project.id === projectId)) {
    return projectId;
  }

  return projects[0]?.id ?? null;
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

      <section className="rounded-lg border border-neutral-200 bg-white px-4 py-4 shadow-sm">
        <form className="flex flex-wrap items-end gap-4" method="get">
          <div className="flex w-full flex-col gap-1 sm:w-64">
            <label htmlFor="projectId" className="text-xs font-medium text-neutral-600">
              プロジェクト
            </label>
            <select
              id="projectId"
              name="projectId"
              defaultValue={selectedProjectId ?? ""}
              className="h-10 rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none"
              disabled={!projects.length}
            >
              {projects.length === 0 ? (
                <option value="">プロジェクトがありません</option>
              ) : (
                projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="startDate" className="text-xs font-medium text-neutral-600">
              開始日
            </label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              defaultValue={startDate}
              className="h-10 rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="endDate" className="text-xs font-medium text-neutral-600">
              終了日
            </label>
            <input
              id="endDate"
              name="endDate"
              type="date"
              defaultValue={endDate}
              className="h-10 rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="h-10 w-full rounded-md bg-neutral-900 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-neutral-800 sm:w-auto"
          >
            表示
          </button>
        </form>
      </section>

      {loadError ? (
        <section className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </section>
      ) : null}

      {!loadError && !selectedProjectId ? (
        <section className="rounded-lg border border-dashed border-neutral-300 bg-white px-4 py-6 text-sm text-neutral-500">
          プロジェクトが存在しません。BigQueryにデータを追加してから再度アクセスしてください。
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
