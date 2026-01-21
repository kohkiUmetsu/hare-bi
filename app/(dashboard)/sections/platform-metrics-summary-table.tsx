import { formatMetric } from '@/lib/format';
import type { PlatformDetailedMetrics } from '@/lib/metrics';

interface PlatformMetricsSummaryTableProps {
  platformMetrics: PlatformDetailedMetrics[];
}

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

export function PlatformMetricsSummaryTable({ platformMetrics }: PlatformMetricsSummaryTableProps) {
  const aggregated = aggregateByPlatformType(platformMetrics);
  const displayPlatforms = PLATFORM_ORDER.filter((type) => aggregated[type]);

  if (displayPlatforms.length === 0) {
    return null;
  }

  const platformLabels: Record<string, string> = {
    meta: 'Meta',
    tiktok: 'TikTok',
    google: 'Google',
    line: 'LINE',
  };

  return (
    <section className="overflow-x-auto bg-white shadow-sm">
      <table className="min-w-full text-xs sm:text-sm">
        <thead className="bg-[#3F3F3F] text-left text-[11px] uppercase tracking-wider text-white sm:text-xs">
          <tr>
            <th className="px-4 py-3">指標</th>
            {displayPlatforms.map((type) => (
              <th key={type} className="px-4 py-3">
                {platformLabels[type]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white">
          <tr className="odd:bg-white even:bg-[#F5F7FA]">
            <td className="px-4 py-3 font-medium text-neutral-700">実広告費</td>
            {displayPlatforms.map((type) => (
              <td key={type} className="px-4 py-3 text-neutral-900">
                {formatMetric(aggregated[type]!.actualAdCost, 'currency')}
              </td>
            ))}
          </tr>
          <tr className="odd:bg-white even:bg-[#F5F7FA]">
            <td className="px-4 py-3 font-medium text-neutral-700">CV数</td>
            {displayPlatforms.map((type) => (
              <td key={type} className="px-4 py-3 text-neutral-900">
                {formatMetric(aggregated[type]!.actualCv)}
              </td>
            ))}
          </tr>
          <tr className="odd:bg-white even:bg-[#F5F7FA]">
            <td className="px-4 py-3 font-medium text-neutral-700">実CPA</td>
            {displayPlatforms.map((type) => (
              <td key={type} className="px-4 py-3 text-neutral-900">
                {formatMetric(aggregated[type]!.actualCpa, 'currency')}
              </td>
            ))}
          </tr>
          <tr className="odd:bg-white even:bg-[#F5F7FA]">
            <td className="px-4 py-3 font-medium text-neutral-700">CVR</td>
            {displayPlatforms.map((type) => (
              <td key={type} className="px-4 py-3 text-neutral-900">
                {formatMetric(aggregated[type]!.cvr, 'percent')}
              </td>
            ))}
          </tr>
          <tr className="odd:bg-white even:bg-[#F5F7FA]">
            <td className="px-4 py-3 font-medium text-neutral-700">CPC</td>
            {displayPlatforms.map((type) => (
              <td key={type} className="px-4 py-3 text-neutral-900">
                {formatMetric(aggregated[type]!.cpc, 'currency')}
              </td>
            ))}
          </tr>
          <tr className="odd:bg-white even:bg-[#F5F7FA]">
            <td className="px-4 py-3 font-medium text-neutral-700">mCV数</td>
            {displayPlatforms.map((type) => (
              <td key={type} className="px-4 py-3 text-neutral-900">
                {formatMetric(aggregated[type]!.mCv)}
              </td>
            ))}
          </tr>
          <tr className="odd:bg-white even:bg-[#F5F7FA]">
            <td className="px-4 py-3 font-medium text-neutral-700">mCVR</td>
            {displayPlatforms.map((type) => (
              <td key={type} className="px-4 py-3 text-neutral-900">
                {formatMetric(aggregated[type]!.mCvr, 'percent')}
              </td>
            ))}
          </tr>
          <tr className="odd:bg-white even:bg-[#F5F7FA]">
            <td className="px-4 py-3 font-medium text-neutral-700">mCPA</td>
            {displayPlatforms.map((type) => (
              <td key={type} className="px-4 py-3 text-neutral-900">
                {formatMetric(aggregated[type]!.mCpa, 'currency')}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </section>
  );
}
