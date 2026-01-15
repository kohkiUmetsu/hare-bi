import Image from "next/image";
import { MetricsPanel } from "../_components/metrics-panel";
import { SectionFilterForm } from "./section-filter-form";
import {
  buildMetricSummary,
  calculatePreviousPeriod,
  fetchSectionDailyMetrics,
  fetchSectionPlatformBreakdown,
  fetchSectionPlatformDailyBreakdown,
  fetchSectionPlatformDetailedMetrics,
  listSections,
  type DailyMetricRow,
  type MetricBreakdownRow,
  type MetricSummary,
  type PlatformDetailedMetrics,
  type SectionOption,
  type TrendBreakdownSeries,
} from "@/lib/metrics";
import { buildDefaultDateRange, normalizeDateRange, parseDateParam } from "@/lib/date-range";
import { requireAuth } from "@/lib/auth-server";
import { toProjectKey } from "@/lib/filter-options";
import { buildProjectIconUrl } from "@/lib/project-assets";
import { getProjectAppearanceByName } from "@/lib/settings";

interface SectionsPageProps {
  searchParams?: {
    projectId?: string;
    sectionId?: string;
    startDate?: string;
    endDate?: string;
  };
}

type ProjectFilterOption = {
  id: string;
  label: string;
};

function resolveSectionId(
  sectionId: string | undefined,
  sections: SectionOption[]
): string | null {
  if (!sectionId || !sections.length) {
    return null;
  }

  return sections.some((section) => section.id === sectionId) ? sectionId : null;
}

function resolveProjectId(
  projectId: string | undefined,
  projectOptions: ProjectFilterOption[]
): string | null {
  if (!projectId || !projectOptions.length) {
    return null;
  }

  return projectOptions.some((option) => option.id === projectId) ? projectId : null;
}

function buildProjectOptions(sections: SectionOption[]): ProjectFilterOption[] {
  const projectMap = new Map<string, string>();

  sections.forEach((section) => {
    const key = toProjectKey(section.projectId);
    if (!projectMap.has(key)) {
      projectMap.set(key, section.projectName ?? "プロジェクト未設定");
    }
  });

  return Array.from(projectMap.entries())
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "ja"));
}

export default async function SectionsPage({ searchParams }: SectionsPageProps) {
  const user = await requireAuth();
  const { start: defaultStart, end: defaultEnd } = buildDefaultDateRange();
  const parsedStart = parseDateParam(searchParams?.startDate, defaultStart);
  const parsedEnd = parseDateParam(searchParams?.endDate, defaultEnd);
  const { start: startDate, end: endDate } = normalizeDateRange(parsedStart, parsedEnd);

  let sections: SectionOption[] = [];
  let projectOptions: ProjectFilterOption[] = [];
  let selectedProjectId: string | null = null;
  let sectionsForProject: SectionOption[] = [];
  let selectedSectionId: string | null = null;
  let selectedSection: SectionOption | null = null;
  let metrics: DailyMetricRow[] = [];
  let loadError: string | null = null;
  let platformBreakdown: MetricBreakdownRow[] = [];
  let platformDetailedMetrics: PlatformDetailedMetrics[] = [];
  let previousPeriodSummary: MetricSummary | null = null;
  let breakdownSeries: TrendBreakdownSeries[] = [];
  let panelBorderColor: string | null = null;
  let projectIconUrl: string | null = null;

  try {
    sections = await listSections();
    if (user.role === "agent") {
      if (!user.sectionId) {
        throw new Error("代理店アカウントにセクションが割り当てられていません。");
      }

      sections = sections.filter((section) => section.id === user.sectionId);
    }
    projectOptions = buildProjectOptions(sections);
    selectedProjectId = resolveProjectId(searchParams?.projectId, projectOptions);
    if (selectedProjectId) {
      const selectedProjectName =
        projectOptions.find((option) => option.id === selectedProjectId)?.label ?? null;
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
    }
    sectionsForProject = selectedProjectId
      ? sections.filter((section) => toProjectKey(section.projectId) === selectedProjectId)
      : [];
    selectedSectionId = resolveSectionId(searchParams?.sectionId, sectionsForProject);
    selectedSection = sectionsForProject.find((section) => section.id === selectedSectionId) ?? null;

    if (selectedSectionId) {
      const previousPeriod = calculatePreviousPeriod(startDate, endDate);

      const [
        metricsResult,
        breakdownResult,
        detailedMetrics,
        breakdownTrend,
        previousMetrics,
        previousBreakdown,
      ] = await Promise.all([
        fetchSectionDailyMetrics({
          entityId: selectedSectionId,
          startDate,
          endDate,
        }),
        fetchSectionPlatformBreakdown({
          sectionId: selectedSectionId,
          startDate,
          endDate,
        }),
        fetchSectionPlatformDetailedMetrics({
          sectionId: selectedSectionId,
          startDate,
          endDate,
        }),
        fetchSectionPlatformDailyBreakdown({
          sectionId: selectedSectionId,
          startDate,
          endDate,
        }),
        fetchSectionDailyMetrics({
          entityId: selectedSectionId,
          startDate: previousPeriod.startDate,
          endDate: previousPeriod.endDate,
        }),
        fetchSectionPlatformBreakdown({
          sectionId: selectedSectionId,
          startDate: previousPeriod.startDate,
          endDate: previousPeriod.endDate,
        }),
      ]);
      metrics = metricsResult;
      platformDetailedMetrics = detailedMetrics;
      breakdownSeries = breakdownTrend;
      platformBreakdown = breakdownResult.map((item) => {
        const prevItem = previousBreakdown.find((prev) => prev.id === item.id);
        return {
          ...item,
          previousActualAdCost: prevItem?.actualAdCost,
          previousTotalMspCv: prevItem?.totalMspCv,
          previousTotalActualCv: prevItem?.totalActualCv,
        };
      });
      previousPeriodSummary = previousMetrics.length > 0 ? buildMetricSummary(previousMetrics) : null;
    }
  } catch (error) {
    loadError = error instanceof Error ? error.message : "BigQueryからの取得に失敗しました。";
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-4">
        <h1 className="text-4xl font-bold text-[var(--accent-color)] tracking-wide">SECTION</h1>
        <button type="button" className="text-4xl text-[var(--accent-color)] hover:opacity-80 leading-none flex items-center">
          ‹
        </button>
        <button type="button" className="text-4xl text-[var(--accent-color)] hover:opacity-80 leading-none flex items-center">
          ›
        </button>
      </header>
      <p className="text-sm text-neutral-700">
        セクションごとのdailyレコードを集計し、主要指標を確認します。
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex items-center justify-center">
          <div className="w-full">
            <SectionFilterForm
              projectOptions={projectOptions}
              sections={sections}
              selectedProjectId={selectedProjectId}
              selectedSectionId={selectedSectionId}
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
              width={200}
              height={200}
              className="h-32 w-32 lg:h-48 lg:w-48 object-contain"
            />
          </div>
        ) : null}
      </div>

      {loadError ? (
        <section className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </section>
      ) : null}

      {!loadError && selectedSectionId ? (
        <section className="flex flex-col gap-4">
          {selectedSection ? (
            <div className="text-sm text-neutral-500">
              選択中:
              <span className="ml-1 font-medium text-neutral-900">{selectedSection.label}</span>
            </div>
          ) : null}
          <MetricsPanel
            metrics={metrics}
            previousPeriodSummary={previousPeriodSummary}
            layout="section-platform"
            platformDetailedMetrics={platformDetailedMetrics}
            trendBreakdownSeries={breakdownSeries}
            panelBorderColor={panelBorderColor}
            breakdowns={
              platformBreakdown.length
                ? {
                    actualAdCost: platformBreakdown.map((item) => ({
                      label: item.label,
                      value: item.actualAdCost,
                      previousValue: (item as typeof item & { previousActualAdCost?: number }).previousActualAdCost,
                      currency: true,
                    })),
                    mspCv: platformBreakdown.map((item) => ({
                      label: item.label,
                      value: item.totalMspCv,
                      previousValue: (item as typeof item & { previousTotalMspCv?: number }).previousTotalMspCv,
                    })),
                    actualCv: platformBreakdown.map((item) => ({
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
