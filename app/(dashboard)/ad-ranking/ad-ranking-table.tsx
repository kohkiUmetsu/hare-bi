"use client";

import { useMemo, useState } from 'react';
import type { AdRankingRow } from '@/lib/ad-ranking-types';
import { formatMetric } from '@/lib/format';

type SortKey = 'spend' | 'mediaCv' | 'cpa';
type ViewMode = 'ad' | 'introAndP' | 'p' | 'intro';
type AccountViewMode = 'project' | 'account';

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

const ACCOUNT_VIEW_OPTIONS: Array<{ key: AccountViewMode; label: string }> = [
  { key: 'project', label: '全体' },
  { key: 'account', label: '広告アカウント別' },
];

type DisplayRow = {
  key: string;
  platform?: AdRankingRow['platform'];
  platformLabel: string;
  videoUrl?: string | null;
  videoThumbnailUrl?: string | null;
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

function isYouTubeUrl(value: string): boolean {
  return /youtube\.com|youtu\.be/i.test(value);
}

function extractYouTubeId(value: string): string | null {
  try {
    const parsed = new URL(value);
    if (parsed.hostname.includes('youtu.be')) {
      const id = parsed.pathname.replace('/', '');
      return id || null;
    }
    if (parsed.hostname.includes('youtube.com')) {
      const id = parsed.searchParams.get('v');
      if (id) {
        return id;
      }
      const match = parsed.pathname.match(/\/embed\/([^/?]+)/);
      return match ? match[1] : null;
    }
  } catch {
    // Ignore URL parsing failures and fall back to regex.
  }
  const fallback = value.match(/(?:v=|\/)([A-Za-z0-9_-]{6,})/);
  return fallback ? fallback[1] : null;
}

function buildYouTubeEmbedUrl(value: string): string | null {
  const id = extractYouTubeId(value);
  return id ? `https://www.youtube.com/embed/${id}` : null;
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

function buildDisplayRows(rows: AdRankingRow[], viewMode: ViewMode): DisplayRow[] {
  if (viewMode === 'introAndP') {
    return buildGroupedRows(rows, extractIntroAndPPrefix);
  }
  if (viewMode === 'p') {
    return buildGroupedRows(rows, extractPPrefix);
  }
  if (viewMode === 'intro') {
    return buildGroupedRows(rows, extractIntroPrefix);
  }
  return rows.map((row, index) => ({
    key: `${row.platform}-${row.accountId}-${row.adId}-${index}`,
    platform: row.platform,
    platformLabel: formatPlatformLabel(row.platform),
    videoUrl: row.videoUrl ?? null,
    videoThumbnailUrl: row.videoThumbnailUrl ?? null,
    adName: row.adName,
    spend: row.spend,
    mediaCv: row.mediaCv,
    cpa: row.cpa,
  }));
}

function sortDisplayRows(displayRows: DisplayRow[], sortKey: SortKey): DisplayRow[] {
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
}

function groupRowsByAccount(rows: AdRankingRow[]) {
  const map = new Map<
    string,
    {
      key: string;
      label: string;
      rows: AdRankingRow[];
    }
  >();

  rows.forEach((row) => {
    const accountLabel = row.accountName.trim() || row.accountId;
    const label = `${formatPlatformLabel(row.platform)} / ${accountLabel}`;
    const key = `${row.platform}-${row.accountId}`;
    const current = map.get(key) ?? { key, label, rows: [] };
    current.rows.push(row);
    map.set(key, current);
  });

  return Array.from(map.values());
}

export function AdRankingTable({
  rows,
  panelBorderColor,
}: {
  rows: AdRankingRow[];
  panelBorderColor: string | null;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>('ad');
  const [accountViewMode, setAccountViewMode] = useState<AccountViewMode>('project');
  const [sortKey, setSortKey] = useState<SortKey>('spend');
  const [modalVideo, setModalVideo] = useState<{ url: string; thumbnail?: string | null; platform?: AdRankingRow['platform'] } | null>(null);
  const panelStyle = panelBorderColor
    ? { borderColor: panelBorderColor, borderWidth: 3, borderStyle: 'solid' }
    : undefined;

  const formatMediaCv = (value: number | null) => {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '-';
    }
    return formatMetric(value);
  };

  const sortedRows = useMemo(
    () => sortDisplayRows(buildDisplayRows(rows, viewMode), sortKey),
    [rows, sortKey, viewMode]
  );

  const accountTables = useMemo(() => {
    if (accountViewMode !== 'account') {
      return [];
    }
    return groupRowsByAccount(rows).map((group) => ({
      ...group,
      displayRows: sortDisplayRows(buildDisplayRows(group.rows, viewMode), sortKey),
    }));
  }, [accountViewMode, rows, sortKey, viewMode]);

  const hasDisplayRows =
    accountViewMode === 'account'
      ? accountTables.some((group) => group.displayRows.length > 0)
      : sortedRows.length > 0;

  const renderTable = (displayRows: DisplayRow[]) => {
    if (displayRows.length === 0) {
      return (
        <section className="bg-white px-4 py-6 text-sm text-neutral-500 shadow-sm" style={panelStyle}>
          表示するデータがありません。媒体アカウント設定を確認してください。
        </section>
      );
    }

    return (
      <section className="overflow-x-auto bg-white shadow-sm" style={panelStyle}>
        <table className="min-w-full divide-y divide-neutral-200 text-xs sm:text-sm">
          <thead className="bg-[#3F3F3F] text-left text-[11px] uppercase tracking-wider text-white sm:text-xs">
            <tr>
              <th className="w-12 px-2 py-3 text-right">順位</th>
              <th className="px-4 py-3">媒体</th>
              <th className="px-4 py-3">動画</th>
              <th className="px-4 py-3">アド名</th>
              <th className="px-4 py-3 text-right">消化金額</th>
              <th className="px-4 py-3 text-right">媒体CV</th>
              <th className="px-4 py-3 text-right">CPA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 bg-white">
            {displayRows.map((row, index) => (
              <tr key={row.key} className="odd:bg-white even:bg-[#F5F7FA]">
                <td className="w-12 px-2 py-3 text-right text-neutral-700">{index + 1}</td>
                <td className="px-4 py-3 text-neutral-700">{row.platformLabel}</td>
                <td className="px-4 py-3">
                  {row.videoUrl && !isYouTubeUrl(row.videoUrl) ? (
                    <button
                      type="button"
                      onClick={() => setModalVideo({ url: row.videoUrl!, thumbnail: row.videoThumbnailUrl, platform: row.platform })}
                      className="relative cursor-pointer"
                    >
                      <video
                        className="h-16 w-28 rounded object-cover"
                        src={row.videoUrl}
                        poster={row.videoThumbnailUrl ?? undefined}
                        muted
                        playsInline
                        preload="none"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="rounded-full bg-black/50 p-2">
                          <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    </button>
                  ) : row.videoThumbnailUrl ? (
                    <button
                      type="button"
                      onClick={() => {
                        setModalVideo({ url: row.videoUrl || row.videoThumbnailUrl!, thumbnail: row.videoThumbnailUrl, platform: row.platform });
                      }}
                      className="relative inline-flex cursor-pointer"
                    >
                      <img
                        className="h-16 w-28 rounded object-cover"
                        src={row.videoThumbnailUrl}
                        alt="ad preview"
                        loading="lazy"
                      />
                      {row.videoUrl && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="rounded-full bg-black/50 p-2">
                            <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </button>
                  ) : row.videoUrl ? (
                    <button
                      type="button"
                      onClick={() => setModalVideo({ url: row.videoUrl!, thumbnail: null, platform: row.platform })}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      動画を開く
                    </button>
                  ) : (
                    <span className="text-neutral-400">-</span>
                  )}
                </td>
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
    );
  };

  if (!hasDisplayRows) {
    return (
      <section className="bg-white px-4 py-6 text-sm text-neutral-500 shadow-sm" style={panelStyle}>
        表示するデータがありません。媒体アカウント設定を確認してください。
      </section>
    );
  }

  const modalEmbedUrl = modalVideo?.platform === 'google' && modalVideo?.url ? buildYouTubeEmbedUrl(modalVideo.url) : null;
  const modalUrl = modalVideo?.url ?? '';
  const isModalImage = /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(modalUrl);
  const isModalVideo =
    !!modalUrl &&
    !isModalImage &&
    (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(modalUrl) ||
      /mime_type=video/i.test(modalUrl) ||
      modalVideo?.platform === 'tiktok');

  return (
    <>
      {modalVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setModalVideo(null)}
        >
          <div className="relative max-h-[90vh] max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setModalVideo(null)}
              className="absolute -right-4 -top-4 rounded-full bg-white p-2 shadow-lg hover:bg-neutral-100"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {modalEmbedUrl ? (
              <iframe
                className="h-[60vh] w-[80vw] max-w-4xl rounded-lg"
                src={modalEmbedUrl}
                title="YouTube video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : isModalVideo ? (
              <video
                className="max-h-[90vh] w-full rounded-lg"
                src={modalVideo.url}
                poster={modalVideo.thumbnail ?? undefined}
                controls
                autoPlay
                playsInline
              />
            ) : (
              <img
                className="max-h-[90vh] max-w-full rounded-lg"
                src={modalVideo.url}
                alt="ad preview"
              />
            )}
          </div>
        </div>
      )}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
        {ACCOUNT_VIEW_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setAccountViewMode(option.key)}
            className={
              accountViewMode === option.key
                ? 'bg-[#f4d03f] px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-[#f0c929]'
                : 'border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50'
            }
          >
            {option.label}
          </button>
        ))}
      </div>
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
      {accountViewMode === 'account' ? (
        <div className="flex flex-col gap-6">
          {accountTables.map((group) => (
            <div key={group.key} className="flex flex-col gap-3">
              <div className="text-sm font-semibold text-neutral-700">{group.label}</div>
              {renderTable(group.displayRows)}
            </div>
          ))}
        </div>
      ) : (
        renderTable(sortedRows)
      )}
      </div>
    </>
  );
}
