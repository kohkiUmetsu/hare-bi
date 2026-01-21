import dynamic from 'next/dynamic';
import Image from 'next/image';
import {
  buildMetricSummary,
  type DailyMetricRow,
  type MetricSummary,
  type PlatformDetailedMetrics,
  type TrendBreakdownSeries,
} from '@/lib/metrics';
import { formatMetric } from '@/lib/format';
import { MetricMiniChart } from './metric-mini-chart';

const PLATFORM_ORDER = ['meta', 'tiktok', 'google', 'line'] as const;

function getPlatformType(label: string): string {
  const lower = label.toLowerCase();
  if (lower.includes('meta') || lower.includes('facebook') || lower.includes('instagram')) {
    return 'meta';
  }
  if (lower.includes('tiktok')) {
    return 'tiktok';
  }
  if (lower.includes('google') || lower.includes('gdn') || lower.includes('yt')) {
    return 'google';
  }
  if (lower.includes('line')) {
    return 'line';
  }
  return 'other';
}

function aggregateByPlatformType(metrics: PlatformDetailedMetrics[]) {
  const aggregated = new Map<string, {
    actualAdCost: number;
    actualCv: number;
    totalClicks: number;
    mCv: number;
  }>();

  for (const metric of metrics) {
    const type = getPlatformType(metric.platformLabel);
    const existing = aggregated.get(type) || {
      actualAdCost: 0,
      actualCv: 0,
      totalClicks: 0,
      mCv: 0,
    };

    aggregated.set(type, {
      actualAdCost: existing.actualAdCost + metric.actualAdCost,
      actualCv: existing.actualCv + metric.actualCv,
      totalClicks: existing.totalClicks + (metric.cvr > 0 && metric.actualCv > 0 ? metric.actualCv / metric.cvr : 0),
      mCv: existing.mCv + metric.mCv,
    });
  }

  const result: Record<string, {
    actualAdCost: number;
    actualCv: number;
    actualCpa: number;
    cvr: number;
    cpc: number;
    mCv: number;
    mCvr: number;
    mCpa: number;
  }> = {};

  Array.from(aggregated.entries()).forEach(([type, data]) => {
    result[type] = {
      actualAdCost: data.actualAdCost,
      actualCv: data.actualCv,
      actualCpa: data.actualCv > 0 ? data.actualAdCost / data.actualCv : 0,
      cvr: data.totalClicks > 0 ? data.actualCv / data.totalClicks : 0,
      cpc: data.totalClicks > 0 ? data.actualAdCost / data.totalClicks : 0,
      mCv: data.mCv,
      mCvr: data.totalClicks > 0 ? data.mCv / data.totalClicks : 0,
      mCpa: data.mCv > 0 ? data.actualAdCost / data.mCv : 0,
    };
  });

  return result;
}

type MetricBreakdownEntry = {
  label: string;
  value: number;
  previousValue?: number;
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
  previousPeriodSummary?: MetricSummary | null;
  layout?: 'default' | 'section-platform';
  platformDetailedMetrics?: PlatformDetailedMetrics[];
  trendBreakdownSeries?: TrendBreakdownSeries[];
  panelBorderColor?: string | null;
}

function calculateChange(
  current: number | null,
  previous: number | null,
  lowerIsBetter = false
): { percentage: number; direction: 'up' | 'down' | 'neutral'; color: string } | null {
  if (current === null || previous === null || previous === 0) {
    return null;
  }

  const percentage = ((current - previous) / previous) * 100;
  const actualDirection = percentage > 0 ? 'up' : percentage < 0 ? 'down' : 'neutral';

  let color = 'text-neutral-600';
  if (actualDirection !== 'neutral') {
    if (lowerIsBetter) {
      // 下がった方が良い指標（CPA、CPCなど）
      color = actualDirection === 'down' ? 'text-[#2A9CFF]' : 'text-[#DE494C]';
    } else {
      // 上がった方が良い指標（CV、売上など）
      color = actualDirection === 'up' ? 'text-[#2A9CFF]' : 'text-[#DE494C]';
    }
  }

  return { percentage: Math.abs(percentage), direction: actualDirection, color };
}

export function MetricsPanel({
  metrics,
  breakdowns,
  hideTable,
  previousPeriodSummary,
  layout = 'default',
  platformDetailedMetrics,
  trendBreakdownSeries,
  panelBorderColor,
}: MetricsPanelProps) {
  const panelStyle = panelBorderColor
    ? { borderColor: panelBorderColor, borderWidth: 3, borderStyle: 'solid' }
    : undefined;

  if (!metrics.length) {
    return (
      <section
        className="bg-white px-4 py-6 text-sm text-neutral-500 shadow-sm"
        style={panelStyle}
      >
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
    previousValue?: number | null;
    format?: 'decimal' | 'percent';
    breakdownCurrency?: boolean;
    prefix?: string;
    icon?: string;
    lowerIsBetter?: boolean;
  }> = [
    {
      key: 'actualAdCost',
      label: '実広告費',
      value: summary.totalActualAdCost,
      previousValue: previousPeriodSummary?.totalActualAdCost,
      breakdownCurrency: true,
      prefix: '¥',
      icon: '/icons/yen.svg',
      lowerIsBetter: false,
    },
    {
      key: 'actualCv',
      label: '総実CV',
      value: summary.totalActualCv,
      previousValue: previousPeriodSummary?.totalActualCv,
      icon: '/icons/fire.svg',
      lowerIsBetter: false,
    },
    {
      label: '平均MSP CPA',
      value: summary.avgMspCpa,
      previousValue: previousPeriodSummary?.avgMspCpa,
      format: 'decimal',
      icon: '/icons/yen.svg',
      lowerIsBetter: true,
    },
  ];

  const middleMetricsTop: Array<{ label: string; value: number | null; previousValue?: number | null; format?: 'decimal' | 'percent'; dataKey: string; icon?: string; lowerIsBetter?: boolean }>
    = [
      {
        label: '総インプレッション',
        value: summary.totalImpressions,
        previousValue: previousPeriodSummary?.totalImpressions,
        dataKey: 'impressions',
        icon: '/icons/fire.svg',
        lowerIsBetter: false,
      },
      {
        label: '総クリック数',
        value: summary.totalClicks,
        previousValue: previousPeriodSummary?.totalClicks,
        dataKey: 'clicks',
        icon: '/icons/fire.svg',
        lowerIsBetter: false,
      },
      {
        label: '総mCV',
        value: summary.totalMCv,
        previousValue: previousPeriodSummary?.totalMCv,
        dataKey: 'mCv',
        icon: '/icons/fire.svg',
        lowerIsBetter: false,
      },
      {
        label: '平均CPC',
        value: summary.avgCpc,
        previousValue: previousPeriodSummary?.avgCpc,
        format: 'decimal',
        dataKey: 'cpc',
        icon: '/icons/yen.svg',
        lowerIsBetter: true,
      },
    ];

  const secondRowMetrics: Array<{ label: string; value: number | null; previousValue?: number | null; format?: 'decimal' | 'percent'; dataKey: string; icon?: string; lowerIsBetter?: boolean }> = layout === 'section-platform' ? [
    {
      label: 'CVR',
      value: summary.avgMspCvr,
      previousValue: previousPeriodSummary?.avgMspCvr,
      format: 'percent' as const,
      dataKey: 'cvr',
      icon: '/icons/fire.svg',
      lowerIsBetter: false,
    },
    {
      label: 'CPM',
      value: summary.avgCpm,
      previousValue: previousPeriodSummary?.avgCpm,
      format: 'decimal' as const,
      dataKey: 'cpm',
      icon: '/icons/yen.svg',
      lowerIsBetter: true,
    },
    {
      label: '',
      value: null,
      previousValue: null,
      format: undefined,
      dataKey: 'placeholder',
      icon: undefined,
      lowerIsBetter: false,
    },
  ] : [];

  const middleMetricsBottom: Array<{ label: string; value: number | null; previousValue?: number | null; format?: 'decimal' | 'percent'; dataKey: string; icon?: string; lowerIsBetter?: boolean }>
    = layout === 'default' ? [
      {
        label: 'CTR',
        value: summary.avgCtr,
        previousValue: previousPeriodSummary?.avgCtr,
        format: 'percent' as const,
        dataKey: 'ctr',
        icon: '/icons/fire.svg',
        lowerIsBetter: false,
      },
      {
        label: '平均mCVR',
        value: summary.avgMCvr,
        previousValue: previousPeriodSummary?.avgMCvr,
        format: 'percent' as const,
        dataKey: 'mCvr',
        icon: '/icons/fire.svg',
        lowerIsBetter: false,
      },
    ] : [];

  return (
    <div className="flex flex-col gap-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {topMetrics.map(({ key, label, value, previousValue, format, prefix, icon, lowerIsBetter }, index) => {
          const chartData = metrics.map((row) => ({
            date: row.date,
            value: index === 0 ? row.actualAdCost : index === 1 ? row.actualCv : row.cpa,
          }));

          const change = calculateChange(value, previousValue ?? null, lowerIsBetter);

          return (
            <article
              key={label}
              className="bg-white px-4 py-3 shadow-sm"
              style={panelStyle}
            >
              <h2 className="flex items-center gap-2 text-xl font-bold text-black">
                {icon && <Image src={icon} alt="" width={16} height={16} />}
                {label}
              </h2>
              <div className="mt-2 flex items-start justify-between">
                <p className="text-2xl font-semibold">
                  {prefix ?? ''}
                  {formatMetric(value, format)}
                </p>
                {change && (
                  <div className="flex flex-col items-end gap-1">
                    <p className="text-xs text-neutral-600">前期間対比</p>
                    <div className="flex items-center gap-1">
                      <p className={`text-lg font-bold ${change.color}`}>
                        {change.percentage.toFixed(1)}%
                      </p>
                      {change.direction === 'up' && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M6 2L6 10M6 2L2 6M6 2L10 6" stroke={change.color.includes('#2A9CFF') ? '#2A9CFF' : '#DE494C'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                      {change.direction === 'down' && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M6 10L6 2M6 10L10 6M6 10L2 6" stroke={change.color.includes('#2A9CFF') ? '#2A9CFF' : '#DE494C'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Mini chart */}
              <MetricMiniChart
                data={chartData}
                variant={index === 0 ? 'area' : 'line'}
                index={index}
              />

              {key && breakdowns?.[key]?.length ? (
                <div className="mt-3 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-[#E7ECF0]">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-medium text-neutral-600">項目</th>
                        <th className="px-2 py-1.5 text-right font-medium text-neutral-600">値</th>
                        <th className="px-2 py-1.5 text-right font-medium text-neutral-600">前期間対比</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {breakdowns[key]!
                        .filter((item) => item.value > 0)
                        .slice(0, 5)
                        .map((item) => {
                          const itemChange = calculateChange(item.value, item.previousValue ?? null, lowerIsBetter);
                          return (
                            <tr
                              key={`${key}-${item.label}`}
                              className="odd:bg-white even:bg-[#F5F7FA] hover:bg-neutral-50"
                            >
                              <td className="px-2 py-1.5 text-neutral-700">{item.label}</td>
                              <td className="px-2 py-1.5 text-right font-medium text-neutral-900">
                                {item.currency ? `¥${formatMetric(item.value)}` : formatMetric(item.value)}
                              </td>
                              <td className="px-2 py-1.5 text-right">
                                {itemChange ? (
                                  <div className="flex items-center justify-end gap-1">
                                    <span className={`font-bold ${itemChange.color}`}>
                                      {itemChange.percentage.toFixed(1)}%
                                    </span>
                                    {itemChange.direction === 'up' && (
                                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M6 2L6 10M6 2L2 6M6 2L10 6" stroke={itemChange.color.includes('#2A9CFF') ? '#2A9CFF' : '#DE494C'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    )}
                                    {itemChange.direction === 'down' && (
                                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M6 10L6 2M6 10L10 6M6 10L2 6" stroke={itemChange.color.includes('#2A9CFF') ? '#2A9CFF' : '#DE494C'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-neutral-400">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>

      {secondRowMetrics.length > 0 && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {secondRowMetrics.map(({ label, value, previousValue, format, dataKey, icon, lowerIsBetter }, index) => {
            if (!label) {
              return <div key={`placeholder-${index}`} className="bg-transparent" />;
            }

            const chartData = metrics.map((row) => ({
              date: row.date,
              value: row[dataKey as keyof DailyMetricRow] as number | null,
            }));

            const change = calculateChange(value, previousValue ?? null, lowerIsBetter);

            return (
              <article
                key={label}
                className="bg-white px-4 py-3 shadow-sm"
                style={panelStyle}
              >
                <h2 className="flex items-center gap-2 text-xl font-bold text-black">
                  {icon && <Image src={icon} alt="" width={16} height={16} />}
                  {label}
                </h2>
                <div className="mt-2 flex items-start justify-between">
                  <p className="text-2xl font-semibold">
                    {formatMetric(value, format)}
                  </p>
                  {change && (
                    <div className="flex flex-col items-end gap-1">
                      <p className="text-xs text-neutral-600">前期間対比</p>
                      <div className="flex items-center gap-1">
                        <p className={`text-lg font-bold ${change.color}`}>
                          {change.percentage.toFixed(1)}%
                        </p>
                        {change.direction === 'up' && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6 2L6 10M6 2L2 6M6 2L10 6" stroke={change.color.includes('#2A9CFF') ? '#2A9CFF' : '#DE494C'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                        {change.direction === 'down' && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6 10L6 2M6 10L10 6M6 10L2 6" stroke={change.color.includes('#2A9CFF') ? '#2A9CFF' : '#DE494C'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <MetricMiniChart
                  data={chartData}
                  variant="line"
                  index={label.charCodeAt(0)}
                />
              </article>
            );
          })}
        </section>
      )}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <MetricsTrendCharts
          metrics={metrics}
          trendBreakdownSeries={trendBreakdownSeries}
          panelBorderColor={panelBorderColor}
        />
      </section>

      {layout === 'default' && (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {middleMetricsTop.map(({ label, value, previousValue, format, dataKey, icon, lowerIsBetter }) => {
          const chartData = metrics.map((row) => ({
            date: row.date,
            value: row[dataKey as keyof DailyMetricRow] as number | null,
          }));

          const change = calculateChange(value, previousValue ?? null, lowerIsBetter);

          return (
            <article
              key={label}
              className="bg-white px-4 py-3 shadow-sm"
              style={panelStyle}
            >
              <h2 className="flex items-center gap-2 text-xl font-bold text-black">
                {icon && <Image src={icon} alt="" width={16} height={16} />}
                {label}
              </h2>
              <div className="mt-2 flex items-start justify-between">
                <p className="text-2xl font-semibold">
                  {formatMetric(value, format)}
                </p>
                {change && (
                  <div className="flex flex-col items-end gap-1">
                    <p className="text-xs text-neutral-600">前期間対比</p>
                    <div className="flex items-center gap-1">
                      <p className={`text-lg font-bold ${change.color}`}>
                        {change.percentage.toFixed(1)}%
                      </p>
                      {change.direction === 'up' && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M6 2L6 10M6 2L2 6M6 2L10 6" stroke={change.color.includes('#2A9CFF') ? '#2A9CFF' : '#DE494C'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                      {change.direction === 'down' && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M6 10L6 2M6 10L10 6M6 10L2 6" stroke={change.color.includes('#2A9CFF') ? '#2A9CFF' : '#DE494C'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  </div>
                )}
              </div>
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
        {middleMetricsBottom.map(({ label, value, previousValue, format, dataKey, icon, lowerIsBetter }) => {
          const chartData = metrics.map((row) => ({
            date: row.date,
            value: row[dataKey as keyof DailyMetricRow] as number | null,
          }));

          const change = calculateChange(value, previousValue ?? null, lowerIsBetter);

          return (
            <article
              key={label}
              className="bg-white px-4 py-3 shadow-sm"
              style={panelStyle}
            >
              <h2 className="flex items-center gap-2 text-xl font-bold text-black">
                {icon && <Image src={icon} alt="" width={16} height={16} />}
                {label}
              </h2>
              <div className="mt-2 flex items-start justify-between">
                <p className="text-2xl font-semibold">
                  {formatMetric(value, format)}
                </p>
                {change && (
                  <div className="flex flex-col items-end gap-1">
                    <p className="text-xs text-neutral-600">前期間対比</p>
                    <div className="flex items-center gap-1">
                      <p className={`text-lg font-bold ${change.color}`}>
                        {change.percentage.toFixed(1)}%
                      </p>
                      {change.direction === 'up' && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M6 2L6 10M6 2L2 6M6 2L10 6" stroke={change.color.includes('#2A9CFF') ? '#2A9CFF' : '#DE494C'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                      {change.direction === 'down' && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M6 10L6 2M6 10L10 6M6 10L2 6" stroke={change.color.includes('#2A9CFF') ? '#2A9CFF' : '#DE494C'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <MetricMiniChart
                data={chartData}
                variant="line"
                index={label.charCodeAt(0)}
              />
            </article>
          );
        })}
      </section>
        </>
      )}

      {platformDetailedMetrics && platformDetailedMetrics.length > 0 && (
        <section className="overflow-x-auto bg-white shadow-sm" style={panelStyle}>
          {(() => {
            const aggregated = aggregateByPlatformType(platformDetailedMetrics);
            const displayPlatforms = PLATFORM_ORDER.filter((type) => aggregated[type]);
            const platformLabels: Record<string, string> = {
              meta: 'Meta',
              tiktok: 'TikTok',
              google: 'Google',
              line: 'LINE',
            };
            const platformIcons: Record<string, string> = {
              meta: '/platform-icons/meta.svg',
              tiktok: '/platform-icons/tiktok.svg',
              google: '/platform-icons/g.svg',
              line: '/platform-icons/line.svg',
            };

            if (displayPlatforms.length === 0) {
              return null;
            }

            return (
              <table className="min-w-full text-xs sm:text-sm">
                <thead className="bg-[#E7ECF0] text-center text-[11px] uppercase tracking-wider text-neutral-700 sm:text-xs">
                  <tr>
                    <th className="w-0 whitespace-nowrap px-4 py-3" />
                    {displayPlatforms.map((type) => (
                      <th key={type} className={`w-0 whitespace-nowrap py-3 ${type === 'meta' ? 'px-0' : 'px-4'}`}>
                        <Image
                          src={platformIcons[type]}
                          alt={platformLabels[type]}
                          width={type === 'meta' ? 64 : 32}
                          height={32}
                          className="mx-auto"
                        />
                      </th>
                    ))}
                    <th className="w-full" />
                  </tr>
                </thead>
                <tbody className="bg-white">
                  <tr className="odd:bg-white even:bg-[#F5F7FA]">
                    <td className="w-0 whitespace-nowrap px-4 py-3 text-center font-bold text-neutral-700">実広告費</td>
                    {displayPlatforms.map((type) => (
                      <td key={type} className="w-0 whitespace-nowrap px-4 py-3 text-center text-neutral-900">
                        {formatMetric(aggregated[type]!.actualAdCost, 'currency')}
                      </td>
                    ))}
                    <td className="w-full" />
                  </tr>
                  <tr className="odd:bg-white even:bg-[#F5F7FA]">
                    <td className="w-0 whitespace-nowrap px-4 py-3 text-center font-bold text-neutral-700">CV数</td>
                    {displayPlatforms.map((type) => (
                      <td key={type} className="w-0 whitespace-nowrap px-4 py-3 text-center text-neutral-900">
                        {formatMetric(aggregated[type]!.actualCv)}
                      </td>
                    ))}
                    <td className="w-full" />
                  </tr>
                  <tr className="odd:bg-white even:bg-[#F5F7FA]">
                    <td className="w-0 whitespace-nowrap px-4 py-3 text-center font-bold text-neutral-700">実CPA</td>
                    {displayPlatforms.map((type) => (
                      <td key={type} className="w-0 whitespace-nowrap px-4 py-3 text-center text-neutral-900">
                        {formatMetric(aggregated[type]!.actualCpa, 'currency')}
                      </td>
                    ))}
                    <td className="w-full" />
                  </tr>
                  <tr className="odd:bg-white even:bg-[#F5F7FA]">
                    <td className="w-0 whitespace-nowrap px-4 py-3 text-center font-bold text-neutral-700">CVR</td>
                    {displayPlatforms.map((type) => (
                      <td key={type} className="w-0 whitespace-nowrap px-4 py-3 text-center text-neutral-900">
                        {formatMetric(aggregated[type]!.cvr, 'percent')}
                      </td>
                    ))}
                    <td className="w-full" />
                  </tr>
                  <tr className="odd:bg-white even:bg-[#F5F7FA]">
                    <td className="w-0 whitespace-nowrap px-4 py-3 text-center font-bold text-neutral-700">CPC</td>
                    {displayPlatforms.map((type) => (
                      <td key={type} className="w-0 whitespace-nowrap px-4 py-3 text-center text-neutral-900">
                        {formatMetric(aggregated[type]!.cpc, 'currency')}
                      </td>
                    ))}
                    <td className="w-full" />
                  </tr>
                  <tr className="odd:bg-white even:bg-[#F5F7FA]">
                    <td className="w-0 whitespace-nowrap px-4 py-3 text-center font-bold text-neutral-700">mCV数</td>
                    {displayPlatforms.map((type) => (
                      <td key={type} className="w-0 whitespace-nowrap px-4 py-3 text-center text-neutral-900">
                        {formatMetric(aggregated[type]!.mCv)}
                      </td>
                    ))}
                    <td className="w-full" />
                  </tr>
                  <tr className="odd:bg-white even:bg-[#F5F7FA]">
                    <td className="w-0 whitespace-nowrap px-4 py-3 text-center font-bold text-neutral-700">mCVR</td>
                    {displayPlatforms.map((type) => (
                      <td key={type} className="w-0 whitespace-nowrap px-4 py-3 text-center text-neutral-900">
                        {formatMetric(aggregated[type]!.mCvr, 'percent')}
                      </td>
                    ))}
                    <td className="w-full" />
                  </tr>
                  <tr className="odd:bg-white even:bg-[#F5F7FA]">
                    <td className="w-0 whitespace-nowrap px-4 py-3 text-center font-bold text-neutral-700">mCPA</td>
                    {displayPlatforms.map((type) => (
                      <td key={type} className="w-0 whitespace-nowrap px-4 py-3 text-center text-neutral-900">
                        {formatMetric(aggregated[type]!.mCpa, 'currency')}
                      </td>
                    ))}
                    <td className="w-full" />
                  </tr>
                </tbody>
              </table>
            );
          })()}
        </section>
      )}

      {hideTable ? null : (
        <section className="overflow-x-auto bg-white shadow-sm">
          <table className="min-w-full text-xs sm:text-sm">
            <thead className="bg-[#3F3F3F] text-left text-[11px] uppercase tracking-wider text-white sm:text-xs">
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
            <tbody className="bg-white">
              {metrics.map((row) => (
                <tr key={row.date} className="whitespace-nowrap odd:bg-white even:bg-[#F5F7FA]">
                  <td className="px-4 py-3 text-neutral-700">{row.date}</td>
                  <td className="px-4 py-3 text-neutral-900">{formatMetric(row.actualAdCost, "currency")}</td>
                  <td className="px-4 py-3 text-neutral-900">{formatMetric(row.impressions)}</td>
                  <td className="px-4 py-3 text-neutral-900">{formatMetric(row.clicks)}</td>
                  <td className="px-4 py-3 text-neutral-900">{formatMetric(row.mspCv)}</td>
                  <td className="px-4 py-3 text-neutral-900">{formatMetric(row.actualCv)}</td>
                  <td className="px-4 py-3 text-neutral-900">{formatMetric(row.platformCv)}</td>
                  <td className="px-4 py-3 text-neutral-900">{formatMetric(row.cpa, "currency")}</td>
                  <td className="px-4 py-3 text-neutral-900">{formatMetric(row.cpc, "currency")}</td>
                  <td className="px-4 py-3 text-neutral-900">{formatMetric(row.cvr, "percent")}</td>
                  <td className="px-4 py-3 text-neutral-900">{formatMetric(row.mCv)}</td>
                  <td className="px-4 py-3 text-neutral-900">{formatMetric(row.mCvr, "percent")}</td>
                  <td className="px-4 py-3 text-neutral-900">{formatMetric(row.mCpa, "currency")}</td>
                  <td className="px-4 py-3 text-neutral-900">{formatMetric(row.cpm, "currency")}</td>
                  {showPerformanceFee ? (
                    <td className="px-4 py-3 text-neutral-900">
                      {formatMetric(row.performanceBasedFee, "currency")}
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
