import { MetricsPanel } from "../_components/metrics-panel";
import { SectionFilterForm } from "./section-filter-form";
import {
  fetchSectionDailyMetrics,
  fetchSectionPlatformBreakdown,
  listSections,
  type DailyMetricRow,
  type MetricBreakdownRow,
  type SectionOption,
} from "@/lib/metrics";
import { buildDefaultDateRange, normalizeDateRange, parseDateParam } from "@/lib/date-range";
import { requireAuth } from "@/lib/auth-server";
import { toProjectKey } from "@/lib/filter-options";

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
    sectionsForProject = selectedProjectId
      ? sections.filter((section) => toProjectKey(section.projectId) === selectedProjectId)
      : [];
    selectedSectionId = resolveSectionId(searchParams?.sectionId, sectionsForProject);
    selectedSection = sectionsForProject.find((section) => section.id === selectedSectionId) ?? null;

    if (selectedSectionId) {
      const [metricsResult, breakdownResult] = await Promise.all([
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
      ]);
      metrics = metricsResult;
      platformBreakdown = breakdownResult;
    }
  } catch (error) {
    loadError = error instanceof Error ? error.message : "BigQueryからの取得に失敗しました。";
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">セクション指標</h1>
        <p className="text-sm text-neutral-500">
          セクションごとのdailyレコードを集計し、主要指標を確認します。
        </p>
      </header>

      <SectionFilterForm
        projectOptions={projectOptions}
        sections={sections}
        selectedProjectId={selectedProjectId}
        selectedSectionId={selectedSectionId}
        startDate={startDate}
        endDate={endDate}
      />

      {loadError ? (
        <section className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </section>
      ) : null}

      {!loadError && !selectedSectionId ? (
        <section className="border border-dashed border-neutral-300 bg-white px-4 py-6 text-sm text-neutral-500">
          {projectOptions.length === 0
            ? 'セクションが存在しません。BigQueryにデータを追加してから再度アクセスしてください。'
            : 'プロジェクトとセクションを選択し、「表示」を押してください。'}
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
            breakdowns={
              platformBreakdown.length
                ? {
                    actualAdCost: platformBreakdown.map((item) => ({
                      label: item.label,
                      value: item.actualAdCost,
                      currency: true,
                    })),
                    mspCv: platformBreakdown.map((item) => ({
                      label: item.label,
                      value: item.totalMspCv,
                    })),
                    actualCv: platformBreakdown.map((item) => ({
                      label: item.label,
                      value: item.totalActualCv,
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
