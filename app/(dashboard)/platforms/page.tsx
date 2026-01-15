import Image from "next/image";
import { MetricsPanel } from "../_components/metrics-panel";
import { PlatformFilterForm } from "./platform-filter-form";
import { PlatformMetricsTable } from "./platform-metrics-table";
import {
  buildMetricSummary,
  calculatePreviousPeriod,
  fetchPlatformDailyMetrics,
  listPlatforms,
  type DailyMetricRow,
  type MetricSummary,
  type PlatformOption,
} from "@/lib/metrics";
import { fetchPlatformActualCvEditMap } from "@/lib/platform-metrics";
import { buildDefaultDateRange, normalizeDateRange, parseDateParam } from "@/lib/date-range";
import { requireAdmin } from "@/lib/auth-server";
import { toProjectKey } from "@/lib/filter-options";
import { buildProjectIconUrl } from "@/lib/project-assets";
import { getProjectAppearanceByName } from "@/lib/settings";

interface PlatformsPageProps {
  searchParams?: {
    projectId?: string;
    sectionId?: string;
    platformId?: string;
    startDate?: string;
    endDate?: string;
  };
}

type ProjectFilterOption = {
  id: string;
  label: string;
};

type SectionFilterOption = {
  id: string;
  label: string;
};

function resolvePlatformId(
  platformId: string | undefined,
  platforms: PlatformOption[]
): string | null {
  if (!platformId || !platforms.length) {
    return null;
  }

  return platforms.some((platform) => platform.id === platformId) ? platformId : null;
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

function resolveSectionFilter(
  sectionId: string | undefined,
  sectionOptions: SectionFilterOption[]
): string | null {
  if (!sectionId || !sectionOptions.length) {
    return null;
  }

  return sectionOptions.some((option) => option.id === sectionId) ? sectionId : null;
}

function buildProjectOptions(platforms: PlatformOption[]): ProjectFilterOption[] {
  const projectMap = new Map<string, string>();

  platforms.forEach((platform) => {
    const key = toProjectKey(platform.projectId);
    if (!projectMap.has(key)) {
      projectMap.set(key, platform.projectName ?? "プロジェクト未設定");
    }
  });

  return Array.from(projectMap.entries())
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "ja"));
}

function buildSectionOptions(
  platforms: PlatformOption[],
  selectedProjectId: string | null
): SectionFilterOption[] {
  if (!selectedProjectId) {
    return [];
  }

  const sectionMap = new Map<string, string>();

  platforms.forEach((platform) => {
    if (toProjectKey(platform.projectId) !== selectedProjectId) {
      return;
    }

    if (!platform.sectionId) {
      return;
    }

    if (!sectionMap.has(platform.sectionId)) {
      sectionMap.set(platform.sectionId, platform.sectionLabel ?? platform.sectionId);
    }
  });

  return Array.from(sectionMap.entries())
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "ja"));
}

export default async function PlatformsPage({ searchParams }: PlatformsPageProps) {
  await requireAdmin();
  const { start: defaultStart, end: defaultEnd } = buildDefaultDateRange();
  const parsedStart = parseDateParam(searchParams?.startDate, defaultStart);
  const parsedEnd = parseDateParam(searchParams?.endDate, defaultEnd);
  const { start: startDate, end: endDate } = normalizeDateRange(parsedStart, parsedEnd);

  let platforms: PlatformOption[] = [];
  let projectOptions: ProjectFilterOption[] = [];
  let selectedProjectId: string | null = null;
  let sectionOptions: SectionFilterOption[] = [];
  let selectedSectionId: string | null = null;
  let filteredPlatforms: PlatformOption[] = [];
  let selectedPlatformId: string | null = null;
  let selectedPlatform: PlatformOption | null = null;
  let metrics: DailyMetricRow[] = [];
  let actualCvEdits: Record<string, boolean> = {};
  let loadError: string | null = null;
  let selectedPlatformRelation = "";
  let previousPeriodSummary: MetricSummary | null = null;
  let panelBorderColor: string | null = null;
  let projectIconUrl: string | null = null;

  try {
    platforms = await listPlatforms();
    projectOptions = buildProjectOptions(platforms);
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
    sectionOptions = buildSectionOptions(platforms, selectedProjectId);
    selectedSectionId = resolveSectionFilter(searchParams?.sectionId, sectionOptions);
    filteredPlatforms = selectedSectionId
      ? platforms.filter((platform) => platform.sectionId === selectedSectionId)
      : [];
    selectedPlatformId = resolvePlatformId(searchParams?.platformId, filteredPlatforms);
    selectedPlatform = filteredPlatforms.find((platform) => platform.id === selectedPlatformId) ?? null;

    if (selectedPlatformId) {
      const previousPeriod = calculatePreviousPeriod(startDate, endDate);

      const [metricsResult, previousMetrics] = await Promise.all([
        fetchPlatformDailyMetrics({
          entityId: selectedPlatformId,
          startDate,
          endDate,
        }),
        fetchPlatformDailyMetrics({
          entityId: selectedPlatformId,
          startDate: previousPeriod.startDate,
          endDate: previousPeriod.endDate,
        }),
      ]);
      metrics = metricsResult;
      previousPeriodSummary = previousMetrics.length > 0 ? buildMetricSummary(previousMetrics) : null;

      try {
        actualCvEdits = await fetchPlatformActualCvEditMap({
          platformId: selectedPlatformId,
          startDate,
          endDate,
        });
      } catch {
        actualCvEdits = {};
      }
    }

    if (selectedPlatform) {
      const relationParts = [selectedPlatform.sectionLabel, selectedPlatform.projectName]
        .filter(Boolean)
        .join(" / ");
      selectedPlatformRelation = relationParts;
    }
  } catch (error) {
    loadError = error instanceof Error ? error.message : "BigQueryからの取得に失敗しました。";
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-4">
        <h1 className="text-4xl font-bold text-[var(--accent-color)] tracking-wide">PLATFORM</h1>
        <button type="button" className="text-4xl text-[var(--accent-color)] hover:opacity-80 leading-none flex items-center">
          ‹
        </button>
        <button type="button" className="text-4xl text-[var(--accent-color)] hover:opacity-80 leading-none flex items-center">
          ›
        </button>
      </header>
      <p className="text-sm text-neutral-700">
        プラットフォーム単位のdailyレコードを集計し、成果指標を可視化します。
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex items-center justify-center">
          <div className="w-full">
            <PlatformFilterForm
              projectOptions={projectOptions}
              platforms={platforms}
              selectedProjectId={selectedProjectId}
              selectedSectionId={selectedSectionId}
              selectedPlatformId={selectedPlatformId}
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

      {!loadError && selectedPlatformId ? (
        <section className="flex flex-col gap-4">
          {selectedPlatform ? (
            <div className="text-sm text-neutral-500">
              選択中:
              <span className="ml-1 font-medium text-neutral-900">{selectedPlatform.label}</span>
              {selectedPlatformRelation ? (
                <span className="ml-2 text-neutral-500">{selectedPlatformRelation}</span>
              ) : null}
            </div>
          ) : null}
          <MetricsPanel
            metrics={metrics}
            previousPeriodSummary={previousPeriodSummary}
            layout="section-platform"
            hideTable
            panelBorderColor={panelBorderColor}
          />
          {selectedPlatform ? (
            <PlatformMetricsTable
              metrics={metrics}
              platform={selectedPlatform}
              actualCvEdits={actualCvEdits}
              panelBorderColor={panelBorderColor}
            />
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
