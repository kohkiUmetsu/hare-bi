"use client";

import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DailyMetricRow } from '@/lib/metrics';
import { formatDate, formatMetric } from '@/lib/format';

function formatInteger(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return formatMetric(Math.trunc(value));
}

interface MetricsTrendChartsProps {
  metrics: DailyMetricRow[];
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

export default function MetricsTrendCharts({ metrics }: MetricsTrendChartsProps) {
  const maxMspCv = metrics.reduce((acc, row) => Math.max(acc, row.mspCv ?? 0), 0);
  const maxCpa = metrics.reduce((acc, row) => Math.max(acc, row.cpa ?? 0), 0);
  const mspCvScaleFactor = (() => {
    if (maxMspCv === 0) {
      return 1;
    }

    const base = maxCpa > 0 ? maxMspCv / maxCpa : maxMspCv;
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
    mspCvScaled: row.mspCv ? row.mspCv / mspCvScaleFactor : 0,
  }));

  if (!metrics.length) {
    return (
      <>
        <article className="border border-neutral-200 bg-white px-4 py-4 shadow-sm">
          <h2 className="text-lg font-bold text-neutral-700">CV件数 / CPA 推移</h2>
          <p className="mt-4 text-sm text-neutral-500">表示するデータがありません。</p>
        </article>
        <article className="border border-neutral-200 bg-white px-4 py-4 shadow-sm">
          <h2 className="text-lg font-bold text-neutral-700">実広告費 推移</h2>
          <p className="mt-4 text-sm text-neutral-500">表示するデータがありません。</p>
        </article>
      </>
    );
  }

  return (
    <>
      <article className="border border-neutral-200 bg-white px-4 py-4 shadow-sm">
        <h2 className="text-lg font-bold text-neutral-700">CV件数 / CPA 推移</h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer>
            <ComposedChart data={chartMetrics} margin={{ top: 10, right: 30, bottom: 0, left: 0 }}>
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
                tickFormatter={(value) => formatInteger((value ?? 0) * mspCvScaleFactor)}
                tick={{ fontSize: 10 }}
                width={60}
              />
              <Tooltip
                formatter={(value: number, name: string) =>
                  name === 'CPA'
                    ? `${formatInteger(value as number)}`
                    : `${formatInteger((value as number) * mspCvScaleFactor)}`
                }
                labelFormatter={(value) => formatDate(value)}
              />
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
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="border border-neutral-200 bg-white px-4 py-4 shadow-sm">
        <h2 className="text-lg font-bold text-neutral-700">実広告費 推移</h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer>
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
          </ResponsiveContainer>
        </div>
      </article>
    </>
  );
}
