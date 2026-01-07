import { MetricsPanel } from "../_components/metrics-panel";
import { PlatformFilterForm } from "./platform-filter-form";
import { PlatformMetricsTable } from "./platform-metrics-table";
import {
  fetchPlatformDailyMetrics,
  listPlatforms,
  type DailyMetricRow,
  type PlatformOption,
} from "@/lib/metrics";
import { fetchPlatformActualCvEditMap } from "@/lib/platform-metrics";
import { buildDefaultDateRange, normalizeDateRange, parseDateParam } from "@/lib/date-range";
import { requireAdmin } from "@/lib/auth-server";
import { toProjectKey } from "@/lib/filter-options";

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

  try {
    platforms = await listPlatforms();
    projectOptions = buildProjectOptions(platforms);
    selectedProjectId = resolveProjectId(searchParams?.projectId, projectOptions);
    sectionOptions = buildSectionOptions(platforms, selectedProjectId);
    selectedSectionId = resolveSectionFilter(searchParams?.sectionId, sectionOptions);
    filteredPlatforms = selectedSectionId
      ? platforms.filter((platform) => platform.sectionId === selectedSectionId)
      : [];
    selectedPlatformId = resolvePlatformId(searchParams?.platformId, filteredPlatforms);
    selectedPlatform = filteredPlatforms.find((platform) => platform.id === selectedPlatformId) ?? null;

    if (selectedPlatformId) {
      metrics = await fetchPlatformDailyMetrics({
        entityId: selectedPlatformId,
        startDate,
        endDate,
      });
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
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">プラットフォーム指標</h1>
        <p className="text-sm text-neutral-500">
          プラットフォーム単位のdailyレコードを集計し、成果指標を可視化します。
        </p>
      </header>

      <PlatformFilterForm
        projectOptions={projectOptions}
        platforms={platforms}
        selectedProjectId={selectedProjectId}
        selectedSectionId={selectedSectionId}
        selectedPlatformId={selectedPlatformId}
        startDate={startDate}
        endDate={endDate}
      />

      {loadError ? (
        <section className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </section>
      ) : null}

      {!loadError && !selectedPlatformId ? (
        <section className="border border-dashed border-neutral-300 bg-white px-4 py-6 text-sm text-neutral-500">
          {platforms.length === 0
            ? 'プラットフォームが存在しません。BigQueryにデータを追加してから再度アクセスしてください。'
            : 'プロジェクト / セクション / プラットフォームを選択し、「表示」を押してください。'}
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
          <MetricsPanel metrics={metrics} hideTable />
          {selectedPlatform ? (
            <PlatformMetricsTable
              metrics={metrics}
              platform={selectedPlatform}
              actualCvEdits={actualCvEdits}
            />
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
