import Image from "next/image";
import { MetricsPanel } from "../_components/metrics-panel";
import { ProjectFilterForm } from "./project-filter-form";
import {
  buildMetricSummary,
  calculatePreviousPeriod,
  fetchProjectDailyMetrics,
  fetchProjectSectionBreakdown,
  fetchProjectSectionDailyBreakdown,
  listProjects,
  type DailyMetricRow,
  type MetricBreakdownRow,
  type MetricSummary,
  type ProjectOption,
  type TrendBreakdownSeries,
} from "@/lib/metrics";
import {
  buildDefaultDateRange,
  getTodayDateString,
  getYesterdayDateString,
  isDateInRange,
  normalizeDateRange,
  parseDateParam,
} from "@/lib/date-range";
import { requireAdmin } from "@/lib/auth-server";
import { buildProjectIconUrl } from "@/lib/project-assets";
import { getProjectAppearanceByName } from "@/lib/settings";
import { fetchRealtimeProjectSnapshot } from "@/lib/realtime-metrics";
import { mergeBreakdowns, mergeDailyMetrics, mergeTrendSeries } from "@/lib/realtime-merge";

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
  const today = getTodayDateString();
  const includesToday = isDateInRange(today, startDate, endDate);
  const bqEndDate = includesToday ? getYesterdayDateString() : endDate;
  const hasBqRange = startDate <= bqEndDate;

  let projects: ProjectOption[] = [];
  let selectedProjectId: string | null = null;
  let selectedProjectName: string | null = null;
  let metrics: DailyMetricRow[] = [];
  let loadError: string | null = null;
  let sectionBreakdown: MetricBreakdownRow[] = [];
  let previousPeriodSummary: MetricSummary | null = null;
  let breakdownSeries: TrendBreakdownSeries[] = [];
  let panelBorderColor: string | null = null;
  let projectIconUrl: string | null = null;

  try {
    projects = await listProjects();
    selectedProjectId = resolveProjectId(searchParams?.projectId, projects);
    selectedProjectName = projects.find((project) => project.id === selectedProjectId)?.name ?? null;

    if (selectedProjectName) {
      try {
        const projectAppearance = await getProjectAppearanceByName(selectedProjectName);
        panelBorderColor = projectAppearance.project_color ?? 'var(--accent-color)';
        projectIconUrl = buildProjectIconUrl(projectAppearance.project_icon_path);
      } catch {
        panelBorderColor = 'var(--accent-color)';
        projectIconUrl = null;
      }
    }

    if (selectedProjectId) {
      const previousPeriod = calculatePreviousPeriod(startDate, endDate);

      const [
        metricsResult,
        breakdownResult,
        breakdownTrend,
        previousMetrics,
        previousBreakdown,
      ] = await Promise.all([
        hasBqRange
          ? fetchProjectDailyMetrics({
              entityId: selectedProjectId,
              startDate,
              endDate: bqEndDate,
            })
          : Promise.resolve([] as DailyMetricRow[]),
        hasBqRange
          ? fetchProjectSectionBreakdown({ projectId: selectedProjectId, startDate, endDate: bqEndDate })
          : Promise.resolve([] as MetricBreakdownRow[]),
        hasBqRange
          ? fetchProjectSectionDailyBreakdown({ projectId: selectedProjectId, startDate, endDate: bqEndDate })
          : Promise.resolve([] as TrendBreakdownSeries[]),
        fetchProjectDailyMetrics({
          entityId: selectedProjectId,
          startDate: previousPeriod.startDate,
          endDate: previousPeriod.endDate,
        }),
        fetchProjectSectionBreakdown({
          projectId: selectedProjectId,
          startDate: previousPeriod.startDate,
          endDate: previousPeriod.endDate,
        }),
      ]);
      metrics = metricsResult;
      breakdownSeries = breakdownTrend;
      sectionBreakdown = breakdownResult.map((item) => {
        const prevItem = previousBreakdown.find((prev) => prev.id === item.id);
        return {
          ...item,
          previousActualAdCost: prevItem?.actualAdCost,
          previousTotalMspCv: prevItem?.totalMspCv,
          previousTotalActualCv: prevItem?.totalActualCv,
        };
      });
      previousPeriodSummary = previousMetrics.length > 0 ? buildMetricSummary(previousMetrics) : null;

      if (includesToday && selectedProjectName) {
        try {
          const realtimeSnapshot = await fetchRealtimeProjectSnapshot({
            projectName: selectedProjectName,
            targetDate: today,
          });
          if (realtimeSnapshot) {
            metrics = mergeDailyMetrics(metrics, realtimeSnapshot.projectDaily, today);
            sectionBreakdown = mergeBreakdowns(
              sectionBreakdown,
              realtimeSnapshot.sectionBreakdownMap,
              realtimeSnapshot.sectionLabels
            );
            breakdownSeries = mergeTrendSeries(
              breakdownSeries,
              realtimeSnapshot.sectionDailyMap,
              realtimeSnapshot.sectionLabels,
              today
            );
          }
        } catch (error) {
          console.error("[ProjectsPage] realtime fetch failed", error);
        }
      }
    }
  } catch (error) {
    loadError = error instanceof Error ? error.message : "BigQueryからの取得に失敗しました。";
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-4">
        <h1 className="text-4xl font-bold text-[var(--accent-color)] tracking-wide">PROJECT</h1>
        <button type="button" className="text-4xl text-[var(--accent-color)] hover:opacity-80 leading-none flex items-center">
          ‹
        </button>
        <button type="button" className="text-4xl text-[var(--accent-color)] hover:opacity-80 leading-none flex items-center">
          ›
        </button>
      </header>
      <p className="text-sm text-neutral-700">
        プロジェクトと期間を選択して、dailyレコードに基づく主要指標を表示します。
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex items-center justify-center">
          <div className="w-full">
            <ProjectFilterForm
              projects={projects}
              selectedProjectId={selectedProjectId}
              startDate={startDate}
              endDate={endDate}
              panelBorderColor={panelBorderColor}
            />
          </div>
        </div>
        {projectIconUrl ? (
          <div className="flex items-center justify-center">
            <Image
              src={projectIconUrl}
              alt="Project icon"
              width={400}
              height={400}
              className="h-64 w-64 lg:h-96 lg:w-96 object-contain"
            />
          </div>
        ) : null}
      </div>

      {loadError ? (
        <section className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </section>
      ) : null}

      {!loadError && selectedProjectId ? (
        <section className="flex flex-col gap-4">
          {selectedProjectName ? (
            <div className="text-sm text-neutral-500">
              選択中: <span className="font-medium text-neutral-900">{selectedProjectName}</span>
            </div>
          ) : null}
          <MetricsPanel
            metrics={metrics}
            previousPeriodSummary={previousPeriodSummary}
            trendBreakdownSeries={breakdownSeries}
            panelBorderColor={panelBorderColor}
            breakdowns={
              sectionBreakdown.length
                ? {
                    actualAdCost: sectionBreakdown.map((item) => ({
                      label: item.label,
                      value: item.actualAdCost,
                      previousValue: (item as typeof item & { previousActualAdCost?: number }).previousActualAdCost,
                      currency: true,
                    })),
                    mspCv: sectionBreakdown.map((item) => ({
                      label: item.label,
                      value: item.totalMspCv,
                      previousValue: (item as typeof item & { previousTotalMspCv?: number }).previousTotalMspCv,
                    })),
                    actualCv: sectionBreakdown.map((item) => ({
                      label: item.label,
                      value: item.totalActualCv,
                      previousValue: (item as typeof item & { previousTotalActualCv?: number }).previousTotalActualCv,
                    })),
                  }
                : undefined
            }
          />
        </section>
      ) : null}
    </div>
  );
}
