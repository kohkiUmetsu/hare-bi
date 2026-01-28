"use client";

import { useMemo, useState } from 'react';
import type { AdRankingRow } from '@/lib/ad-ranking-types';
import { formatMetric } from '@/lib/format';

type SortKey = 'spend' | 'mediaCv' | 'cpa';
type ViewMode = 'ad' | 'introAndP' | 'p' | 'intro';

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: 'spend', label: '消化金額 (高い順)' },
  { key: 'mediaCv', label: '媒体CV (高い順)' },
  { key: 'cpa', label: 'CPA (低い順)' },
];

const VIEW_OPTIONS: Array<{ key: ViewMode; label: string }> = [
  { key: 'ad', label: 'アド別' },
  { key: 'introAndP', label: '冒頭・P別' },
  { key: 'p', label: 'P別' },
  { key: 'intro', label: '冒頭別' },
];

type DisplayRow = {
  key: string;
  platformLabel: string;
  adName: string;
  spend: number;
  mediaCv: number | null;
  cpa: number | null;
};

function formatPlatformLabel(platform: AdRankingRow['platform']): string {
  if (platform === 'meta') {
    return 'Meta';
  }
  if (platform === 'tiktok') {
    return 'TikTok';
  }
  if (platform === 'google') {
    return 'Google';
  }
  return 'LINE';
}

function extractIntroAndPPrefix(name: string): string | null {
  const match = name.match(/^(【冒頭\d+】\[P\d+\])/);
  return match ? match[1] : null;
}

function extractIntroPrefix(name: string): string | null {
  const match = name.match(/^(【冒頭\d+】)/);
  return match ? match[1] : null;
}

function extractPPrefix(name: string): string | null {
  const match = name.match(/(\[P\d+\])/);
  return match ? match[1] : null;
}

function buildGroupedRows(
  rows: AdRankingRow[],
  extractor: (name: string) => string | null
): DisplayRow[] {
  const map = new Map<
    string,
    {
      spend: number;
      mediaCv: number | null;
      platforms: Set<string>;
    }
  >();

  rows.forEach((row) => {
    const prefix = extractor(row.adName);
    if (!prefix) {
      return;
    }
    const current = map.get(prefix) ?? { spend: 0, mediaCv: null, platforms: new Set<string>() };
    const nextSpend = current.spend + row.spend;
    const nextMediaCv =
      row.mediaCv !== null
        ? (current.mediaCv ?? 0) + row.mediaCv
        : current.mediaCv;
    current.platforms.add(formatPlatformLabel(row.platform));
    map.set(prefix, { spend: nextSpend, mediaCv: nextMediaCv, platforms: current.platforms });
  });

  const platformOrder = ['Meta', 'TikTok', 'Google', 'LINE'];

  return Array.from(map.entries()).map(([prefix, values]) => {
    const mediaCv = values.mediaCv;
    const cpa = mediaCv && mediaCv > 0 ? values.spend / mediaCv : null;
    const platformLabel =
      platformOrder.filter((label) => values.platforms.has(label)).join(' / ') ||
      Array.from(values.platforms).join(' / ');
    return {
      key: prefix,
      platformLabel,
      adName: prefix,
      spend: values.spend,
      mediaCv,
      cpa,
    };
  });
}

export function AdRankingTable({
  rows,
  panelBorderColor,
}: {
  rows: AdRankingRow[];
  panelBorderColor: string | null;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>('ad');
  const [sortKey, setSortKey] = useState<SortKey>('spend');
  const panelStyle = panelBorderColor
    ? { borderColor: panelBorderColor, borderWidth: 3, borderStyle: 'solid' }
    : undefined;

  const formatMediaCv = (value: number | null) => {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '-';
    }
    return formatMetric(value);
  };

  const sortedRows = useMemo(() => {
    let displayRows: DisplayRow[] = [];

    if (viewMode === 'introAndP') {
      displayRows = buildGroupedRows(rows, extractIntroAndPPrefix);
    } else if (viewMode === 'p') {
      displayRows = buildGroupedRows(rows, extractPPrefix);
    } else if (viewMode === 'intro') {
      displayRows = buildGroupedRows(rows, extractIntroPrefix);
    } else {
      displayRows = rows.map((row, index) => ({
        key: `${row.platform}-${row.adId}-${index}`,
        platformLabel: formatPlatformLabel(row.platform),
        adName: row.adName,
        spend: row.spend,
        mediaCv: row.mediaCv,
        cpa: row.cpa,
      }));
    }

    const filtered = displayRows.filter(
      (row) =>
        !(
          row.spend === 0 &&
          (row.mediaCv ?? 0) === 0 &&
          (row.cpa ?? 0) === 0
        )
    );

    return filtered.sort((a, b) => {
      if (sortKey === 'mediaCv') {
        const aValue = a.mediaCv ?? Number.NEGATIVE_INFINITY;
        const bValue = b.mediaCv ?? Number.NEGATIVE_INFINITY;
        return bValue - aValue;
      }
      if (sortKey === 'cpa') {
        const aCpa = a.mediaCv && a.mediaCv > 0 && a.cpa !== null ? a.cpa : Number.POSITIVE_INFINITY;
        const bCpa = b.mediaCv && b.mediaCv > 0 && b.cpa !== null ? b.cpa : Number.POSITIVE_INFINITY;
        return aCpa - bCpa;
      }
      return b.spend - a.spend;
    });
  }, [rows, sortKey, viewMode]);

  if (sortedRows.length === 0) {
    return (
      <section className="bg-white px-4 py-6 text-sm text-neutral-500 shadow-sm" style={panelStyle}>
        表示するデータがありません。媒体アカウント設定を確認してください。
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {VIEW_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setViewMode(option.key)}
            className={
              viewMode === option.key
                ? 'bg-[#f4d03f] px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-[#f0c929]'
                : 'border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50'
            }
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {SORT_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setSortKey(option.key)}
            className={
              sortKey === option.key
                ? 'bg-[#f4d03f] px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-[#f0c929]'
                : 'border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50'
            }
          >
            {option.label}
          </button>
        ))}
      </div>
      <section className="overflow-x-auto bg-white shadow-sm" style={panelStyle}>
        <table className="min-w-full divide-y divide-neutral-200 text-xs sm:text-sm">
          <thead className="bg-[#3F3F3F] text-left text-[11px] uppercase tracking-wider text-white sm:text-xs">
            <tr>
              <th className="w-12 px-2 py-3 text-right">順位</th>
              <th className="px-4 py-3">媒体</th>
              <th className="px-4 py-3">アド名</th>
              <th className="px-4 py-3 text-right">消化金額</th>
              <th className="px-4 py-3 text-right">媒体CV</th>
              <th className="px-4 py-3 text-right">CPA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 bg-white">
            {sortedRows.map((row, index) => (
              <tr key={row.key} className="odd:bg-white even:bg-[#F5F7FA]">
                <td className="w-12 px-2 py-3 text-right text-neutral-700">{index + 1}</td>
                <td className="px-4 py-3 text-neutral-700">{row.platformLabel}</td>
                <td className="px-4 py-3 text-neutral-900">{row.adName}</td>
                <td className="px-4 py-3 text-right text-neutral-900">¥{formatMetric(row.spend)}</td>
                <td className="px-4 py-3 text-right text-neutral-900">{formatMediaCv(row.mediaCv)}</td>
                <td className="px-4 py-3 text-right text-neutral-900">
                  {formatMetric(row.cpa, 'decimal')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
