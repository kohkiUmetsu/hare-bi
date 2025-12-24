import dynamic from 'next/dynamic';
import { buildMetricSummary, type DailyMetricRow } from '@/lib/metrics';
import { formatMetric } from '@/lib/format';
import { MetricMiniChart } from './metric-mini-chart';

type MetricBreakdownEntry = {
  label: string;
  value: number;
  currency?: boolean;
};

type MetricBreakdownMap = {
  actualAdCost?: MetricBreakdownEntry[];
  mspCv?: MetricBreakdownEntry[];
  actualCv?: MetricBreakdownEntry[];
};

const MetricsTrendCharts = dynamic(() => import('./metrics-trend-charts'), {
  ssr: false,
});

interface MetricsPanelProps {
  metrics: DailyMetricRow[];
  breakdowns?: MetricBreakdownMap;
  hideTable?: boolean;
}

export function MetricsPanel({ metrics, breakdowns, hideTable }: MetricsPanelProps) {
  if (!metrics.length) {
    return (
      <section className="rounded-lg bg-white px-4 py-6 text-sm text-neutral-500 shadow-sm">
        表示するデータがありません。条件を変更して再度お試しください。
      </section>
    );
  }

  const summary = buildMetricSummary(metrics);
  const showPerformanceFee = metrics.some(
    (row) => row.performanceBasedFee !== null && row.performanceBasedFee !== undefined
  );

  const topMetrics: Array<{
    key?: keyof MetricBreakdownMap;
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
    { key: 'actualCv', label: '総実CV', value: summary.totalActualCv },
    { label: '平均MSP CPA', value: summary.avgMspCpa, format: 'decimal' },
  ];

  const middleMetricsTop: Array<{ label: string; value: number | null; format?: 'decimal' | 'percent'; dataKey: string }>
    = [
      { label: '総インプレッション', value: summary.totalImpressions, dataKey: 'impressions' },
      { label: '総クリック数', value: summary.totalClicks, dataKey: 'clicks' },
      { label: '総mCV', value: summary.totalMCv, dataKey: 'mCv' },
      { label: '平均CPC', value: summary.avgCpc, format: 'decimal', dataKey: 'cpc' },
    ];

  const middleMetricsBottom: Array<{ label: string; value: number | null; format?: 'decimal' | 'percent'; dataKey: string }>
    = [
      { label: 'CPM', value: summary.avgCpm, format: 'decimal', dataKey: 'cpm' },
      { label: 'CTR', value: summary.avgCtr, format: 'percent', dataKey: 'ctr' },
      { label: '平均mCVR', value: summary.avgMCvr, format: 'percent', dataKey: 'mCvr' },
      { label: 'CVR', value: summary.avgMspCvr, format: 'percent', dataKey: 'cvr' },
    ];

  return (
    <div className="flex flex-col gap-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {topMetrics.map(({ key, label, value, format, prefix }, index) => {
          const chartData = metrics.map((row) => ({
            date: row.date,
            value: index === 0 ? row.actualAdCost : index === 1 ? row.actualCv : row.cpa,
          }));

          return (
            <article
              key={label}
              className="rounded-lg bg-white px-4 py-3 shadow-sm"
            >
              <h2 className="text-xs font-medium text-neutral-500">{label}</h2>
              <p className="mt-2 text-2xl font-semibold">
                {prefix ?? ''}
                {formatMetric(value, format)}
              </p>

              {/* Mini chart */}
              <MetricMiniChart
                data={chartData}
                variant={index === 0 ? 'area' : 'line'}
                index={index}
              />

              {key && breakdowns?.[key]?.length ? (
                <div className="mt-3 overflow-hidden rounded border border-neutral-200">
                  <table className="w-full text-xs">
                    <thead className="bg-neutral-50">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-medium text-neutral-600">項目</th>
                        <th className="px-2 py-1.5 text-right font-medium text-neutral-600">値</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 bg-white">
                      {breakdowns[key]!
                        .filter((item) => item.value > 0)
                        .slice(0, 5)
                        .map((item) => (
                          <tr key={`${key}-${item.label}`} className="hover:bg-neutral-50">
                            <td className="px-2 py-1.5 text-neutral-700">{item.label}</td>
                            <td className="px-2 py-1.5 text-right font-medium text-neutral-900">
                              {item.currency ? `¥${formatMetric(item.value)}` : formatMetric(item.value)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <MetricsTrendCharts metrics={metrics} />
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {middleMetricsTop.map(({ label, value, format, dataKey }) => {
          const chartData = metrics.map((row) => ({
            date: row.date,
            value: row[dataKey as keyof DailyMetricRow] as number | null,
          }));

          return (
            <article
              key={label}
              className="rounded-lg bg-white px-4 py-3 shadow-sm"
            >
              <h2 className="text-xs font-medium text-neutral-500">{label}</h2>
              <p className="mt-2 text-2xl font-semibold">
                {formatMetric(value, format)}
              </p>
              <MetricMiniChart
                data={chartData}
                variant="line"
                index={label.charCodeAt(0)}
              />
            </article>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {middleMetricsBottom.map(({ label, value, format, dataKey }) => {
          const chartData = metrics.map((row) => ({
            date: row.date,
            value: row[dataKey as keyof DailyMetricRow] as number | null,
          }));

          return (
            <article
              key={label}
              className="rounded-lg bg-white px-4 py-3 shadow-sm"
            >
              <h2 className="text-xs font-medium text-neutral-500">{label}</h2>
              <p className="mt-2 text-2xl font-semibold">
                {formatMetric(value, format)}
              </p>
              <MetricMiniChart
                data={chartData}
                variant="line"
                index={label.charCodeAt(0)}
              />
            </article>
          );
        })}
      </section>

      {hideTable ? null : (
        <section className="overflow-x-auto rounded-lg bg-white shadow-sm">
          <table className="min-w-full divide-y divide-neutral-200 text-xs sm:text-sm">
            <thead className="bg-neutral-50 text-left text-[11px] uppercase tracking-wider text-neutral-500 sm:text-xs">
              <tr>
                <th className="px-4 py-3">日付</th>
                <th className="px-4 py-3">広告費</th>
                <th className="px-4 py-3">表示回数</th>
                <th className="px-4 py-3">クリック</th>
                <th className="px-4 py-3">MSP CV</th>
                <th className="px-4 py-3">実CV</th>
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
                  <td className="px-4 py-3 text-neutral-900">{formatMetric(row.mspCv)}</td>
                  <td className="px-4 py-3 text-neutral-900">{formatMetric(row.actualCv)}</td>
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
      )}
    </div>
  );
}
