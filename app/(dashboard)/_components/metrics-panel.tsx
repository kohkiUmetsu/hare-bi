import { buildMetricSummary, type DailyMetricRow } from "@/lib/metrics";
import { formatMetric } from "@/lib/format";

interface MetricsPanelProps {
  metrics: DailyMetricRow[];
}

export function MetricsPanel({ metrics }: MetricsPanelProps) {
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

  const summaryItems: Array<{ label: string; value: number | null; format?: "decimal" | "percent" }>
    = [
      { label: "総広告費", value: summary.totalActualAdCost },
      { label: "総CV", value: summary.totalCv },
      { label: "平均CPA", value: summary.avgCpa, format: "decimal" },
      { label: "総クリック数", value: summary.totalClicks },
      { label: "平均CPC", value: summary.avgCpc, format: "decimal" },
      { label: "平均CVR", value: summary.avgCvr, format: "percent" },
    ];

  if (showPerformanceFee) {
    summaryItems.push({ label: "総成果報酬費", value: summary.totalPerformanceBasedFee ?? null });
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {summaryItems.map(({ label, value, format }) => (
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

      <section className="overflow-x-auto rounded-lg border border-neutral-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-neutral-200 text-xs sm:text-sm">
          <thead className="bg-neutral-50 text-left text-[11px] uppercase tracking-wider text-neutral-500 sm:text-xs">
            <tr>
              <th className="px-4 py-3">日付</th>
              <th className="px-4 py-3">広告費</th>
              <th className="px-4 py-3">CV</th>
              <th className="px-4 py-3">CPA</th>
              <th className="px-4 py-3">表示回数</th>
              <th className="px-4 py-3">クリック</th>
              <th className="px-4 py-3">CPC</th>
              <th className="px-4 py-3">CVR</th>
              {showPerformanceFee ? <th className="px-4 py-3">成果報酬費</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {metrics.map((row) => (
              <tr key={row.date} className="whitespace-nowrap">
                <td className="px-4 py-3 text-neutral-700">{row.date}</td>
                <td className="px-4 py-3 text-neutral-900">{formatMetric(row.actualAdCost)}</td>
                <td className="px-4 py-3 text-neutral-900">{formatMetric(row.cv)}</td>
                <td className="px-4 py-3 text-neutral-900">{formatMetric(row.cpa, "decimal")}</td>
                <td className="px-4 py-3 text-neutral-900">{formatMetric(row.impressions)}</td>
                <td className="px-4 py-3 text-neutral-900">{formatMetric(row.clicks)}</td>
                <td className="px-4 py-3 text-neutral-900">{formatMetric(row.cpc, "decimal")}</td>
                <td className="px-4 py-3 text-neutral-900">{formatMetric(row.cvr, "percent")}</td>
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
