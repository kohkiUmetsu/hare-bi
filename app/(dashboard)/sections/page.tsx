import { MetricsPanel } from "../_components/metrics-panel";
import {
  fetchSectionDailyMetrics,
  listSections,
  type DailyMetricRow,
  type SectionOption,
} from "@/lib/metrics";
import { buildDefaultDateRange, normalizeDateRange, parseDateParam } from "@/lib/date-range";

interface SectionsPageProps {
  searchParams?: {
    sectionId?: string;
    startDate?: string;
    endDate?: string;
  };
}

function resolveSectionId(
  sectionId: string | undefined,
  sections: SectionOption[]
): string | null {
  if (!sections.length) {
    return null;
  }

  if (sectionId && sections.some((section) => section.id === sectionId)) {
    return sectionId;
  }

  return sections[0]?.id ?? null;
}

export default async function SectionsPage({ searchParams }: SectionsPageProps) {
  const { start: defaultStart, end: defaultEnd } = buildDefaultDateRange();
  const parsedStart = parseDateParam(searchParams?.startDate, defaultStart);
  const parsedEnd = parseDateParam(searchParams?.endDate, defaultEnd);
  const { start: startDate, end: endDate } = normalizeDateRange(parsedStart, parsedEnd);

  let sections: SectionOption[] = [];
  let selectedSectionId: string | null = null;
  let selectedSection: SectionOption | null = null;
  let metrics: DailyMetricRow[] = [];
  let loadError: string | null = null;

  try {
    sections = await listSections();
    selectedSectionId = resolveSectionId(searchParams?.sectionId, sections);
    selectedSection = sections.find((section) => section.id === selectedSectionId) ?? null;

    if (selectedSectionId) {
      metrics = await fetchSectionDailyMetrics({
        entityId: selectedSectionId,
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
        <h1 className="text-3xl font-semibold">セクション指標</h1>
        <p className="text-sm text-neutral-500">
          セクションごとのdailyレコードを集計し、主要指標を確認します。
        </p>
      </header>

      <section className="rounded-lg border border-neutral-200 bg-white px-4 py-4 shadow-sm">
        <form className="flex flex-wrap items-end gap-4" method="get">
          <div className="flex w-full flex-col gap-1 sm:w-72">
            <label htmlFor="sectionId" className="text-xs font-medium text-neutral-600">
              セクション
            </label>
            <select
              id="sectionId"
              name="sectionId"
              defaultValue={selectedSectionId ?? ""}
              className="h-10 rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none"
              disabled={!sections.length}
            >
              {sections.length === 0 ? (
                <option value="">セクションがありません</option>
              ) : (
                sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.label}
                    {section.projectName ? `（${section.projectName}）` : ""}
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

      {!loadError && !selectedSectionId ? (
        <section className="rounded-lg border border-dashed border-neutral-300 bg-white px-4 py-6 text-sm text-neutral-500">
          セクションが存在しません。BigQueryにデータを追加してから再度アクセスしてください。
        </section>
      ) : null}

      {!loadError && selectedSectionId ? (
        <section className="flex flex-col gap-4">
          {selectedSection ? (
            <div className="text-sm text-neutral-500">
              選択中:
              <span className="ml-1 font-medium text-neutral-900">{selectedSection.label}</span>
              {selectedSection.projectName ? (
                <span className="ml-2 text-neutral-500">（{selectedSection.projectName}）</span>
              ) : null}
            </div>
          ) : null}
          <MetricsPanel metrics={metrics} />
        </section>
      ) : null}
    </div>
  );
}
