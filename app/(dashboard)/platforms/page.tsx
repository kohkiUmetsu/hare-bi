import { MetricsPanel } from "../_components/metrics-panel";
import {
  fetchPlatformDailyMetrics,
  listPlatforms,
  type DailyMetricRow,
  type PlatformOption,
} from "@/lib/metrics";
import { buildDefaultDateRange, normalizeDateRange, parseDateParam } from "@/lib/date-range";

interface PlatformsPageProps {
  searchParams?: {
    platformId?: string;
    startDate?: string;
    endDate?: string;
  };
}

function resolvePlatformId(
  platformId: string | undefined,
  platforms: PlatformOption[]
): string | null {
  if (!platforms.length) {
    return null;
  }

  if (platformId && platforms.some((platform) => platform.id === platformId)) {
    return platformId;
  }

  return platforms[0]?.id ?? null;
}

export default async function PlatformsPage({ searchParams }: PlatformsPageProps) {
  const { start: defaultStart, end: defaultEnd } = buildDefaultDateRange();
  const parsedStart = parseDateParam(searchParams?.startDate, defaultStart);
  const parsedEnd = parseDateParam(searchParams?.endDate, defaultEnd);
  const { start: startDate, end: endDate } = normalizeDateRange(parsedStart, parsedEnd);

  let platforms: PlatformOption[] = [];
  let selectedPlatformId: string | null = null;
  let selectedPlatform: PlatformOption | null = null;
  let metrics: DailyMetricRow[] = [];
  let loadError: string | null = null;
  let selectedPlatformRelation = "";

  try {
    platforms = await listPlatforms();
    selectedPlatformId = resolvePlatformId(searchParams?.platformId, platforms);
    selectedPlatform = platforms.find((platform) => platform.id === selectedPlatformId) ?? null;

    if (selectedPlatformId) {
      metrics = await fetchPlatformDailyMetrics({
        entityId: selectedPlatformId,
        startDate,
        endDate,
      });
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

      <section className="rounded-lg border border-neutral-200 bg-white px-4 py-4 shadow-sm">
        <form className="flex flex-wrap items-end gap-4" method="get">
          <div className="flex w-full flex-col gap-1 sm:w-80">
            <label htmlFor="platformId" className="text-xs font-medium text-neutral-600">
              プラットフォーム
            </label>
            <select
              id="platformId"
              name="platformId"
              defaultValue={selectedPlatformId ?? ""}
              className="h-10 rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none"
              disabled={!platforms.length}
            >
              {platforms.length === 0 ? (
                <option value="">プラットフォームがありません</option>
              ) : (
                platforms.map((platform) => {
                  const relation = [platform.sectionLabel, platform.projectName]
                    .filter(Boolean)
                    .join(" / ");
                  const optionLabel = relation
                    ? `${platform.label}（${relation}）`
                    : platform.label;

                  return (
                    <option key={platform.id} value={platform.id}>
                      {optionLabel}
                    </option>
                  );
                })
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

      {!loadError && !selectedPlatformId ? (
        <section className="rounded-lg border border-dashed border-neutral-300 bg-white px-4 py-6 text-sm text-neutral-500">
          プラットフォームが存在しません。BigQueryにデータを追加してから再度アクセスしてください。
        </section>
      ) : null}

      {!loadError && selectedPlatformId ? (
        <section className="flex flex-col gap-4">
          {selectedPlatform ? (
            <div className="text-sm text-neutral-500">
              選択中:
              <span className="ml-1 font-medium text-neutral-900">{selectedPlatform.label}</span>
              {selectedPlatformRelation ? (
                <span className="ml-2 text-neutral-500">（{selectedPlatformRelation}）</span>
              ) : null}
            </div>
          ) : null}
          <MetricsPanel metrics={metrics} />
        </section>
      ) : null}
    </div>
  );
}
