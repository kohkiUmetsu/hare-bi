import { buildMetricSummary, type DailyMetricRow } from "@/lib/metrics";
import { formatMetric } from "@/lib/format";

type MetricBreakdownEntry = {
  label: string;
  value: number;
  currency?: boolean;
};

type MetricBreakdownMap = {
  actualAdCost?: MetricBreakdownEntry[];
  totalCv?: MetricBreakdownEntry[];
};

interface MetricsPanelProps {
  metrics: DailyMetricRow[];
  breakdowns?: MetricBreakdownMap;
}

export function MetricsPanel({ metrics, breakdowns }: MetricsPanelProps) {
  if (!metrics.length) {
    return (
      <section className="rounded-lg border border-dashed border-neutral-300 bg-white px-4 py-6 text-sm text-neutral-500">
        表示するデータがありません。条件を変更して再度お試しください。
      </section>
    );
  }

  const summary = buildMetricSummary(metrics);
  const showPerformanceFee = metrics.some(
    (row) => row.performanceBasedFee !== null && row.performanceBasedFee !== undefined
  );

  const topMetrics: Array<{
    key: keyof MetricBreakdownMap | 'avgCpa';
    label: string;
    value: number | null;
    format?: 'decimal' | 'percent';
    breakdownCurrency?: boolean;
    prefix?: string;
  }> = [
    {
      key: 'actualAdCost',
      label: '実広告費',
      value: summary.totalActualAdCost,
      breakdownCurrency: true,
      prefix: '¥',
    },
    { key: 'totalCv', label: '総CV', value: summary.totalCv },
    { key: 'avgCpa', label: '平均CPA', value: summary.avgCpa, format: 'decimal' },
  ];

  const middleMetrics: Array<{ label: string; value: number | null; format?: "decimal" | "percent" }>
    = [
      { label: "総クリック数", value: summary.totalClicks },
      { label: "総インプレッション", value: summary.totalImpressions },
      { label: "平均CVR", value: summary.avgCvr, format: "percent" },
      { label: "CPM", value: summary.avgCpm, format: "decimal" },
    ];

  if (showPerformanceFee) {
    middleMetrics.push({ label: "総成果報酬費", value: summary.totalPerformanceBasedFee ?? null });
  }

  const secondaryItems: Array<{ label: string; value: number | null; format?: "decimal" | "percent" }>
    = [
      { label: "平均CPC", value: summary.avgCpc, format: "decimal" },
      { label: "総mCV", value: summary.totalMCv },
      { label: "媒体CV", value: summary.totalPlatformCv },
      { label: "平均mCVR", value: summary.avgMCvr, format: "percent" },
      { label: "平均mCPA", value: summary.avgMCpa, format: "decimal" },
    ];

  return (
    <div className="flex flex-col gap-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {topMetrics.map(({ key, label, value, format, prefix }) => (
          <article
            key={label}
            className="rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm"
          >
            <h2 className="text-xs font-medium text-neutral-500">{label}</h2>
            <p className="mt-2 text-2xl font-semibold">
              {prefix ?? ''}
              {formatMetric(value, format)}
            </p>
            {key !== 'avgCpa' && breakdowns?.[key]?.length ? (
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-neutral-500">
                {breakdowns[key]!
                  .filter((item) => item.value > 0)
                  .slice(0, 5)
                  .map((item) => (
                    <div
                      key={`${key}-${item.label}`}
                      className="rounded-full bg-neutral-50 px-2 py-1"
                    >
                      <span className="font-medium text-neutral-700">
                        {item.currency ? `¥${formatMetric(item.value)}` : formatMetric(item.value)}
                      </span>{' '}
                      <span className="text-neutral-500">{item.label}</span>
                    </div>
                  ))}
              </div>
            ) : null}
          </article>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {middleMetrics.map(({ label, value, format }) => (
          <article
            key={label}
            className="rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm"
          >
            <h2 className="text-xs font-medium text-neutral-500">{label}</h2>
            <p className="mt-2 text-2xl font-semibold">
              {formatMetric(value, format)}
            </p>
          </article>
        ))}
      </section>

      <details className="rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm">
        <summary className="cursor-pointer text-sm font-semibold text-neutral-700">
          詳細指標（CPC / m指標）
        </summary>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {secondaryItems.map(({ label, value, format }) => (
            <div key={label} className="rounded-md border border-neutral-100 bg-neutral-50 px-3 py-3">
              <h3 className="text-xs font-medium text-neutral-500">{label}</h3>
              <p className="mt-2 text-xl font-semibold text-neutral-900">
                {formatMetric(value, format)}
              </p>
            </div>
          ))}
        </div>
      </details>

      <section className="overflow-x-auto rounded-lg border border-neutral-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-neutral-200 text-xs sm:text-sm">
          <thead className="bg-neutral-50 text-left text-[11px] uppercase tracking-wider text-neutral-500 sm:text-xs">
            <tr>
              <th className="px-4 py-3">日付</th>
              <th className="px-4 py-3">広告費</th>
              <th className="px-4 py-3">表示回数</th>
              <th className="px-4 py-3">クリック</th>
              <th className="px-4 py-3">CV</th>
              <th className="px-4 py-3">媒体CV</th>
              <th className="px-4 py-3">CPA</th>
              <th className="px-4 py-3">CPC</th>
              <th className="px-4 py-3">CVR</th>
              <th className="px-4 py-3">mCV</th>
              <th className="px-4 py-3">mCVR</th>
              <th className="px-4 py-3">mCPA</th>
              <th className="px-4 py-3">CPM</th>
              {showPerformanceFee ? <th className="px-4 py-3">成果報酬費</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {metrics.map((row) => (
              <tr key={row.date} className="whitespace-nowrap">
                <td className="px-4 py-3 text-neutral-700">{row.date}</td>
                <td className="px-4 py-3 text-neutral-900">{formatMetric(row.actualAdCost)}</td>
                <td className="px-4 py-3 text-neutral-900">{formatMetric(row.impressions)}</td>
                <td className="px-4 py-3 text-neutral-900">{formatMetric(row.clicks)}</td>
                <td className="px-4 py-3 text-neutral-900">{formatMetric(row.cv)}</td>
                <td className="px-4 py-3 text-neutral-900">{formatMetric(row.platformCv)}</td>
                <td className="px-4 py-3 text-neutral-900">{formatMetric(row.cpa, "decimal")}</td>
                <td className="px-4 py-3 text-neutral-900">{formatMetric(row.cpc, "decimal")}</td>
                <td className="px-4 py-3 text-neutral-900">{formatMetric(row.cvr, "percent")}</td>
                <td className="px-4 py-3 text-neutral-900">{formatMetric(row.mCv)}</td>
                <td className="px-4 py-3 text-neutral-900">{formatMetric(row.mCvr, "percent")}</td>
                <td className="px-4 py-3 text-neutral-900">{formatMetric(row.mCpa, "decimal")}</td>
                <td className="px-4 py-3 text-neutral-900">{formatMetric(row.cpm, "decimal")}</td>
                {showPerformanceFee ? (
                  <td className="px-4 py-3 text-neutral-900">
                    {formatMetric(row.performanceBasedFee)}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
