import type {
  DailyMetricRow,
  MetricBreakdownRow,
  PlatformDetailedMetrics,
  TrendBreakdownSeries,
} from '@/lib/metrics';

function sortByDateAsc(a: DailyMetricRow, b: DailyMetricRow): number {
  return a.date.localeCompare(b.date);
}

function toNumber(value: number | null | undefined): number {
  return value ?? 0;
}

function buildDailyMetricRow(date: string, totals: {
  actualAdCost: number;
  mspCv: number;
  actualCv: number;
  impressions: number;
  clicks: number;
  mCv: number;
  platformCv: number;
  performanceBasedFee: number | null;
}): DailyMetricRow {
  const cpa = totals.mspCv > 0 ? totals.actualAdCost / totals.mspCv : 0;
  const cpc = totals.clicks > 0 ? totals.actualAdCost / totals.clicks : 0;
  const ctr = totals.impressions > 0 ? totals.clicks / totals.impressions : 0;
  const cvr = totals.clicks > 0 ? totals.mspCv / totals.clicks : 0;
  const mCvr = totals.clicks > 0 ? totals.mCv / totals.clicks : 0;
  const mCpa = totals.mCv > 0 ? totals.actualAdCost / totals.mCv : 0;
  const cpm = totals.impressions > 0 ? (totals.actualAdCost / totals.impressions) * 1000 : 0;

  return {
    date,
    actualAdCost: totals.actualAdCost,
    mspCv: totals.mspCv,
    actualCv: totals.actualCv,
    cpa,
    impressions: totals.impressions,
    clicks: totals.clicks,
    cpc,
    ctr,
    cvr,
    mCv: totals.mCv,
    mCvr,
    mCpa,
    cpm,
    platformCv: totals.platformCv,
    performanceBasedFee: totals.performanceBasedFee,
  };
}

export function mergeDailyMetrics(
  base: DailyMetricRow[],
  todayRow: DailyMetricRow | null,
  today: string
): DailyMetricRow[] {
  if (!todayRow) {
    return [...base].sort(sortByDateAsc);
  }

  const existing = base.find((row) => row.date === today);
  const hasBaseFee =
    existing?.performanceBasedFee !== null &&
    existing?.performanceBasedFee !== undefined;
  const hasRealtimeFee =
    todayRow.performanceBasedFee !== null &&
    todayRow.performanceBasedFee !== undefined;
  const hasPerformanceFee = hasBaseFee || hasRealtimeFee;
  const performanceBasedFee = hasPerformanceFee
    ? (existing?.performanceBasedFee ?? 0) + (todayRow.performanceBasedFee ?? 0)
    : null;

  const totals = {
    actualAdCost: toNumber(existing?.actualAdCost) + toNumber(todayRow.actualAdCost),
    mspCv: toNumber(existing?.mspCv) + toNumber(todayRow.mspCv),
    actualCv: toNumber(existing?.actualCv) + toNumber(todayRow.actualCv),
    impressions: toNumber(existing?.impressions) + toNumber(todayRow.impressions),
    clicks: toNumber(existing?.clicks) + toNumber(todayRow.clicks),
    mCv: toNumber(existing?.mCv) + toNumber(todayRow.mCv),
    platformCv: toNumber(existing?.platformCv) + toNumber(todayRow.platformCv),
    performanceBasedFee,
  };

  const mergedRow = buildDailyMetricRow(today, totals);
  const filtered = base.filter((row) => row.date !== today);
  filtered.push(mergedRow);
  return filtered.sort(sortByDateAsc);
}

export function mergeBreakdowns(
  base: MetricBreakdownRow[],
  realtimeMap: Map<string, MetricBreakdownRow>,
  labelMap?: Map<string, string>
): MetricBreakdownRow[] {
  const merged = new Map<string, MetricBreakdownRow>();
  base.forEach((row) => {
    merged.set(row.id, { ...row });
  });
  realtimeMap.forEach((row, id) => {
    const existing = merged.get(id);
    if (existing) {
      merged.set(id, {
        ...existing,
        actualAdCost: existing.actualAdCost + row.actualAdCost,
        totalMspCv: existing.totalMspCv + row.totalMspCv,
        totalActualCv: existing.totalActualCv + row.totalActualCv,
      });
    } else {
      merged.set(id, {
        ...row,
        label: labelMap?.get(id) ?? row.label ?? id,
      });
    }
  });
  return Array.from(merged.values()).sort((a, b) => b.actualAdCost - a.actualAdCost);
}

export function mergeTrendSeries(
  base: TrendBreakdownSeries[],
  realtimeMap: Map<string, DailyMetricRow>,
  labelMap: Map<string, string>,
  today: string
): TrendBreakdownSeries[] {
  const seriesMap = new Map<string, TrendBreakdownSeries>();
  base.forEach((series) => {
    seriesMap.set(series.id, { ...series, points: [...series.points] });
  });

  realtimeMap.forEach((row, id) => {
    const existing = seriesMap.get(id);
    if (existing) {
      const filteredPoints = existing.points.filter((p) => p.date !== today);
      const currentPoint = existing.points.find((p) => p.date === today);
      const actualAdCost = (currentPoint?.actualAdCost ?? 0) + (row.actualAdCost ?? 0);
      const mspCv = (currentPoint?.mspCv ?? 0) + (row.mspCv ?? 0);
      const cpa = mspCv > 0 ? actualAdCost / mspCv : 0;
      const point = {
        date: today,
        actualAdCost,
        mspCv,
        cpa,
      };
      existing.points = [...filteredPoints, point].sort((a, b) => a.date.localeCompare(b.date));
      seriesMap.set(id, existing);
    } else {
      const actualAdCost = row.actualAdCost ?? 0;
      const mspCv = row.mspCv ?? 0;
      const cpa = mspCv > 0 ? actualAdCost / mspCv : 0;
      seriesMap.set(id, {
        id,
        label: labelMap.get(id) ?? id,
        points: [
          {
            date: today,
            actualAdCost,
            mspCv,
            cpa,
          },
        ],
      });
    }
  });

  return Array.from(seriesMap.values()).sort((a, b) => a.label.localeCompare(b.label, 'ja'));
}

function buildPlatformDetailedMetrics(
  base: PlatformDetailedMetrics
): PlatformDetailedMetrics {
  const actualAdCost = base.actualAdCost;
  const actualCv = base.actualCv;
  const totalClicks = base.totalClicks;
  const mCv = base.mCv;

  const actualCpa = actualCv > 0 ? actualAdCost / actualCv : 0;
  const cvr = totalClicks > 0 ? actualCv / totalClicks : 0;
  const cpc = totalClicks > 0 ? actualAdCost / totalClicks : 0;
  const mCvr = totalClicks > 0 ? mCv / totalClicks : 0;
  const mCpa = mCv > 0 ? actualAdCost / mCv : 0;

  return {
    ...base,
    actualCpa,
    cvr,
    cpc,
    mCvr,
    mCpa,
  };
}

export function mergePlatformDetailedMetrics(
  base: PlatformDetailedMetrics[],
  realtimeMap: Map<string, PlatformDetailedMetrics>
): PlatformDetailedMetrics[] {
  const merged = new Map<string, PlatformDetailedMetrics>();
  base.forEach((row) => {
    merged.set(row.platformId, { ...row });
  });

  realtimeMap.forEach((row, platformId) => {
    const existing = merged.get(platformId);
    if (existing) {
      merged.set(platformId, buildPlatformDetailedMetrics({
        ...existing,
        actualAdCost: existing.actualAdCost + row.actualAdCost,
        actualCv: existing.actualCv + row.actualCv,
        totalClicks: existing.totalClicks + row.totalClicks,
        totalImpressions: existing.totalImpressions + row.totalImpressions,
        mCv: existing.mCv + row.mCv,
      }));
    } else {
      merged.set(platformId, buildPlatformDetailedMetrics({ ...row }));
    }
  });

  return Array.from(merged.values()).sort((a, b) => b.actualAdCost - a.actualAdCost);
}
