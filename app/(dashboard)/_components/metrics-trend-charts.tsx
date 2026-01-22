"use client";

import Image from 'next/image';
import { useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DailyMetricRow, TrendBreakdownSeries } from '@/lib/metrics';
import { formatDate, formatMetric } from '@/lib/format';

function formatInteger(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return formatMetric(Math.trunc(value));
}

interface MetricsTrendChartsProps {
  metrics: DailyMetricRow[];
  trendBreakdownSeries?: TrendBreakdownSeries[];
  panelBorderColor?: string | null;
}

function parseDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

function formatShortLabel(value: string) {
  const date = parseDate(value);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}`;
}

const SERIES_COLORS = [
  '#2A9CFF',
  '#00B900',
  '#FF8C00',
  '#E14A4A',
  '#008080',
  '#8B5E3C',
];

export default function MetricsTrendCharts({
  metrics,
  trendBreakdownSeries,
  panelBorderColor,
}: MetricsTrendChartsProps) {
  const panelStyle = panelBorderColor
    ? { borderColor: panelBorderColor, borderWidth: 3, borderStyle: 'solid' }
    : undefined;
  const activeSeries = (trendBreakdownSeries ?? []).filter((series) => series.points.length > 0);
  const seriesMeta = activeSeries.map((series, index) => ({
    ...series,
    key: `series_${index}`,
    color: SERIES_COLORS[index % SERIES_COLORS.length],
    pointMap: new Map(series.points.map((point) => [point.date, point])),
  }));
  const hasBreakdown = seriesMeta.length > 0;

  // CV/CPAグラフ用の表示状態管理
  const [visibleCvCpaSeries, setVisibleCvCpaSeries] = useState<Set<string>>(
    () => new Set(seriesMeta.map((s) => s.id))
  );
  // 実広告費グラフ用の表示状態管理
  const [visibleAdCostSeries, setVisibleAdCostSeries] = useState<Set<string>>(
    () => new Set(seriesMeta.map((s) => s.id))
  );

  const toggleCvCpaSeries = (id: string) => {
    setVisibleCvCpaSeries((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAdCostSeries = (id: string) => {
    setVisibleAdCostSeries((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const visibleCvCpaSeriesMeta = seriesMeta.filter((s) => visibleCvCpaSeries.has(s.id));
  const visibleAdCostSeriesMeta = seriesMeta.filter((s) => visibleAdCostSeries.has(s.id));

  const cvTotalsByDate = new Map<string, number>();
  let breakdownMaxCpa = 0;

  seriesMeta.forEach((series) => {
    series.points.forEach((point) => {
      cvTotalsByDate.set(point.date, (cvTotalsByDate.get(point.date) ?? 0) + point.mspCv);
      breakdownMaxCpa = Math.max(breakdownMaxCpa, point.cpa);
    });
  });

  const breakdownMaxCv = Math.max(0, ...Array.from(cvTotalsByDate.values()));
  const maxMspCv = metrics.reduce((acc, row) => Math.max(acc, row.mspCv ?? 0), 0);
  const maxCpa = metrics.reduce((acc, row) => Math.max(acc, row.cpa ?? 0), 0);
  const cvScaleFactor = (() => {
    const cvMax = hasBreakdown ? breakdownMaxCv : maxMspCv;
    const cpaMax = hasBreakdown ? breakdownMaxCpa : maxCpa;
    if (cvMax === 0) {
      return 1;
    }

    const base = cpaMax > 0 ? cvMax / cpaMax : cvMax;
    return Math.max(1, Math.ceil(base * 2));
  })();
  const chartMetrics = metrics.map((row) => ({
    ...row,
    cpa: row.cpa ?? 0,
    actualAdCost: row.actualAdCost ?? 0,
    cpc: row.cpc ?? 0,
    ctr: row.ctr ?? 0,
    cvr: row.cvr ?? 0,
    mCvr: row.mCvr ?? 0,
    mCpa: row.mCpa ?? 0,
    cpm: row.cpm ?? 0,
    mspCv: row.mspCv ?? 0,
    actualCv: row.actualCv ?? 0,
    impressions: row.impressions ?? 0,
    clicks: row.clicks ?? 0,
    mCv: row.mCv ?? 0,
    platformCv: row.platformCv ?? 0,
    performanceBasedFee: row.performanceBasedFee ?? 0,
    mspCvScaled: row.mspCv ? row.mspCv / cvScaleFactor : 0,
  }));
  const breakdownChartData = hasBreakdown
    ? metrics.map((row) => {
        const entry: Record<string, number | string> = { date: row.date };
        seriesMeta.forEach((series) => {
          const point = series.pointMap.get(row.date);
          entry[`cv_${series.key}`] = point ? point.mspCv / cvScaleFactor : 0;
          entry[`cpa_${series.key}`] = point?.cpa ?? 0;
          entry[`ad_${series.key}`] = point?.actualAdCost ?? 0;
        });
        return entry;
      })
    : [];

  if (!metrics.length) {
    return (
      <>
        <article className="border border-neutral-200 bg-white px-4 py-4 shadow-sm" style={panelStyle}>
          <h2 className="flex items-center gap-2 text-xl font-bold text-black">
            <Image src="/icons/fire.svg" alt="" width={16} height={16} />
            CV件数 / CPA 推移
          </h2>
          <p className="mt-4 text-sm text-neutral-500">表示するデータがありません。</p>
        </article>
        <article className="border border-neutral-200 bg-white px-4 py-4 shadow-sm" style={panelStyle}>
          <h2 className="flex items-center gap-2 text-xl font-bold text-black">
            <Image src="/icons/yen.svg" alt="" width={16} height={16} />
            実広告費 推移
          </h2>
          <p className="mt-4 text-sm text-neutral-500">表示するデータがありません。</p>
        </article>
      </>
    );
  }

  return (
    <>
      <article className="border border-neutral-200 bg-white px-4 py-4 shadow-sm" style={panelStyle}>
        <h2 className="flex items-center gap-2 text-xl font-bold text-black">
          <Image src="/icons/fire.svg" alt="" width={16} height={16} />
          CV件数 / CPA 推移
        </h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer>
            <ComposedChart
              data={hasBreakdown ? breakdownChartData : chartMetrics}
              margin={{ top: 10, right: 30, bottom: 0, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tickFormatter={formatShortLabel}
                minTickGap={30}
                tick={{ fontSize: 10 }}
              />
              <YAxis
                yAxisId="left"
                orientation="left"
                tickFormatter={(value) => formatInteger(value)}
                tick={{ fontSize: 10 }}
                width={60}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={(value) => formatInteger((value ?? 0) * cvScaleFactor)}
                tick={{ fontSize: 10 }}
                width={60}
              />
              <Tooltip
                position={{ x: 0, y: 0 }}
                wrapperStyle={{
                  top: 0,
                  right: 0,
                  left: "auto",
                }}
                formatter={(value: number, name: string) => {
                  if (name.includes('CPA')) {
                    return `${formatInteger(value as number)}`;
                  }
                  if (name.includes('CV件数')) {
                    return `${formatInteger((value as number) * cvScaleFactor)}`;
                  }
                  return `${formatInteger(value as number)}`;
                }}
                labelFormatter={(value) => formatDate(value)}
              />
              {hasBreakdown ? (
                <>
                  {visibleCvCpaSeriesMeta.map((series) => (
                    <Line
                      key={series.id}
                      yAxisId="left"
                      type="linear"
                      dataKey={`cpa_${series.key}`}
                      name={`${series.label} CPA`}
                      stroke={series.color}
                      strokeWidth={2}
                      dot={{ r: 4, fill: series.color, strokeWidth: 0 }}
                      isAnimationActive={false}
                    />
                  ))}
                  {visibleCvCpaSeriesMeta.map((series) => (
                    <Bar
                      key={`${series.id}-cv`}
                      yAxisId="right"
                      dataKey={`cv_${series.key}`}
                      name={`${series.label} CV件数`}
                      fill={series.color}
                      barSize={16}
                      maxBarSize={16}
                      isAnimationActive={false}
                    />
                  ))}
                </>
              ) : (
                <>
                  <Line
                    yAxisId="left"
                    type="linear"
                    dataKey="cpa"
                    name="CPA"
                    stroke="var(--chart-line-color)"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "var(--chart-line-color)", strokeWidth: 0 }}
                    isAnimationActive={false}
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="mspCvScaled"
                    name="MSP CV件数"
                    fill="var(--accent-color-alt)"
                    radius={[4, 4, 0, 0]}
                    barSize={16}
                    isAnimationActive={false}
                  />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        {hasBreakdown ? (
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-neutral-600">
            {seriesMeta.map((series) => (
              <label key={series.id} className="flex cursor-pointer items-center gap-1.5 select-none">
                <input
                  type="checkbox"
                  checked={visibleCvCpaSeries.has(series.id)}
                  onChange={() => toggleCvCpaSeries(series.id)}
                  className="sr-only peer"
                />
                <span
                  className="inline-flex h-4 w-4 items-center justify-center border-2 peer-checked:border-transparent"
                  style={{
                    borderColor: series.color,
                    backgroundColor: visibleCvCpaSeries.has(series.id) ? series.color : 'transparent',
                  }}
                >
                  {visibleCvCpaSeries.has(series.id) && (
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <span className={visibleCvCpaSeries.has(series.id) ? '' : 'opacity-50'}>{series.label}</span>
              </label>
            ))}
          </div>
        ) : null}
      </article>

      <article className="border border-neutral-200 bg-white px-4 py-4 shadow-sm" style={panelStyle}>
        <h2 className="flex items-center gap-2 text-xl font-bold text-black">
          <Image src="/icons/yen.svg" alt="" width={16} height={16} />
          実広告費 推移
        </h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer>
            {hasBreakdown ? (
              <LineChart data={breakdownChartData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatShortLabel}
                  minTickGap={30}
                  tick={{ fontSize: 10 }}
                />
                <YAxis
                  tickFormatter={(value) => formatInteger(value)}
                  tick={{ fontSize: 10 }}
                  width={60}
                />
                <Tooltip
                  position={{ x: 0, y: 0 }}
                  wrapperStyle={{
                    top: 0,
                    right: 0,
                    left: "auto",
                  }}
                  formatter={(value: number) => `¥${formatMetric(value as number)}`}
                  labelFormatter={(value) => formatDate(value)}
                />
                {visibleAdCostSeriesMeta.map((series) => (
                  <Line
                    key={series.id}
                    type="linear"
                    dataKey={`ad_${series.key}`}
                    name={`${series.label} 実広告費`}
                    stroke={series.color}
                    strokeWidth={2}
                    dot={{ r: 4, fill: series.color, strokeWidth: 0 }}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            ) : (
              <AreaChart data={metrics} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="adCostGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-line-color)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--chart-line-color)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tickFormatter={formatShortLabel}
                minTickGap={30}
                tick={{ fontSize: 10 }}
              />
              <YAxis
                tickFormatter={(value) => formatInteger(value)}
                tick={{ fontSize: 10 }}
                width={60}
              />
              <Tooltip
                position={{ x: 0, y: 0 }}
                wrapperStyle={{
                  top: 0,
                  right: 0,
                  left: "auto",
                }}
                formatter={(value: number) => `¥${formatMetric(value as number)}`}
                labelFormatter={(value) => formatDate(value)}
              />
              <Area
                type="linear"
                dataKey="actualAdCost"
                name="実広告費"
                stroke="var(--chart-line-color)"
                fill="url(#adCostGradient)"
                strokeWidth={2}
                dot={{ r: 4, fill: "var(--chart-line-color)", strokeWidth: 0 }}
                isAnimationActive={false}
              />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
        {hasBreakdown ? (
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-neutral-600">
            {seriesMeta.map((series) => (
              <label key={series.id} className="flex cursor-pointer items-center gap-1.5 select-none">
                <input
                  type="checkbox"
                  checked={visibleAdCostSeries.has(series.id)}
                  onChange={() => toggleAdCostSeries(series.id)}
                  className="sr-only peer"
                />
                <span
                  className="inline-flex h-4 w-4 items-center justify-center border-2 peer-checked:border-transparent"
                  style={{
                    borderColor: series.color,
                    backgroundColor: visibleAdCostSeries.has(series.id) ? series.color : 'transparent',
                  }}
                >
                  {visibleAdCostSeries.has(series.id) && (
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <span className={visibleAdCostSeries.has(series.id) ? '' : 'opacity-50'}>{series.label}</span>
              </label>
            ))}
          </div>
        ) : null}
      </article>
    </>
  );
}
