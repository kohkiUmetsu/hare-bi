import 'server-only';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { GoogleAdsApi } from 'google-ads-api';
import { db } from '@/lib/db';
import {
  projectGoogleAdsAccountsTable,
  projectLineAccountsTable,
  projectMetaAccountsTable,
  projectTiktokAccountsTable,
  reportGoogleAdsAccountsTable,
  reportLineAccountsTable,
  reportMetaAccountsTable,
  reportProjectsTable,
  reportTiktokAccountsTable,
} from '@/db/schema';
import type { AdRankingRow } from '@/lib/ad-ranking-types';

type AccountSummary = {
  accountId: string;
  accountName: string;
};

type ProjectAccounts = {
  meta: AccountSummary[];
  tiktok: AccountSummary[];
  google: AccountSummary[];
  line: AccountSummary[];
};

type GoogleAdsCustomer = ReturnType<InstanceType<typeof GoogleAdsApi>['Customer']>;

const META_RESULT_ACTION_TYPE = process.env.META_RESULT_ACTION_TYPE ?? '';
const META_RESULT_ACTION_TARGET = process.env.META_RESULT_ACTION_TARGET ?? 'Cst_ABTestCV';
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN ?? '';
const TIKTOK_ACCESS_TOKEN = process.env.TIKTOK_ACCESS_TOKEN ?? '';
const TIKTOK_RESULT_METRIC = process.env.TIKTOK_RESULT_METRIC ?? 'result';
const TIKTOK_BUSINESS_ID = process.env.TIKTOK_BUSINESS_ID ?? '';
const TIKTOK_API_BASE_URL = 'https://business-api.tiktok.com/open_api/v1.3';
const TIKTOK_VIDEO_API_BASE_URL = process.env.TIKTOK_VIDEO_API_BASE_URL ?? '';
const GOOGLE_ADS_DEVELOPER_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? '';
const GOOGLE_ADS_CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID ?? '';
const GOOGLE_ADS_CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET ?? '';
const GOOGLE_ADS_REFRESH_TOKEN = process.env.GOOGLE_ADS_REFRESH_TOKEN ?? '';
const GOOGLE_ADS_LOGIN_CUSTOMER_ID = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID ?? '';
const LINE_ACCESS_KEY = process.env.LINE_ACCESS_KEY ?? '';
const LINE_SECRET_KEY = process.env.LINE_SECRET_KEY ?? '';
const LINE_API_BASE_URL = process.env.LINE_API_BASE_URL ?? 'https://ads.line.me';
const LINE_AD_REPORT_ENDPOINT =
  process.env.LINE_AD_REPORT_ENDPOINT ??
  '/api/v3/adaccounts/{adAccountId}/reports/online/ad';
const AD_RANKING_DEBUG_RESPONSES = process.env.AD_RANKING_DEBUG_RESPONSES ?? '';

function isTruthyEnv(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(normalized);
}

const SHOULD_LOG_AD_RANKING = isTruthyEnv(AD_RANKING_DEBUG_RESPONSES);

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  values.forEach((value) => {
    if (!value) {
      return;
    }
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) {
      return;
    }
    seen.add(trimmed);
    result.push(trimmed);
  });
  return result;
}

function buildTikTokVideoBaseUrls(): string[] {
  const baseUrl = TIKTOK_VIDEO_API_BASE_URL || TIKTOK_API_BASE_URL;
  const candidates: Array<string | null> = [TIKTOK_VIDEO_API_BASE_URL || null, baseUrl];

  try {
    const url = new URL(baseUrl);
    const trimmedPath = url.pathname.replace(/\/+$/, '');
    const match = trimmedPath.match(/\/v\d+(?:\.\d+)?$/);
    if (match) {
      const prefix = trimmedPath.slice(0, trimmedPath.length - match[0].length);
      ['v1.3', 'v1.2', 'v1.1'].forEach((version) => {
        candidates.push(`${url.origin}${prefix}/${version}`);
      });
    }
  } catch {
    // Ignore invalid base URL formats.
  }

  return uniqueStrings(candidates);
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    if (!value.trim()) {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function pickFirstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }
    }
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (typeof entry === 'string') {
          const trimmed = entry.trim();
          if (trimmed) {
            return trimmed;
          }
        }
      }
    }
  }
  return null;
}

function pickFirstId(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (typeof entry === 'string') {
          const trimmed = entry.trim();
          if (trimmed) {
            return trimmed;
          }
        }
        if (typeof entry === 'number' && Number.isFinite(entry)) {
          return String(entry);
        }
      }
    }
  }
  return null;
}

function isUrlString(value: unknown): value is string {
  return typeof value === 'string' && /^https?:\/\//i.test(value);
}

function findNestedUrl(
  root: Record<string, unknown>,
  keys: string[],
  maxDepth = 4
): string | null {
  const queue: Array<{ value: unknown; depth: number }> = [{ value: root, depth: 0 }];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }
    const { value, depth } = current;
    if (depth > maxDepth) {
      continue;
    }
    if (Array.isArray(value)) {
      value.forEach((entry) => queue.push({ value: entry, depth: depth + 1 }));
      continue;
    }
    if (!value || typeof value !== 'object') {
      continue;
    }
    const record = value as Record<string, unknown>;
    for (const key of keys) {
      if (key in record) {
        const candidate = record[key];
        if (isUrlString(candidate)) {
          return candidate;
        }
        if (Array.isArray(candidate)) {
          const urlInArray = candidate.find((item) => isUrlString(item));
          if (urlInArray) {
            return urlInArray;
          }
        }
      }
    }
    Object.values(record).forEach((entry) => queue.push({ value: entry, depth: depth + 1 }));
  }

  return null;
}

function findNestedStringByKey(
  root: Record<string, unknown>,
  keys: string[],
  maxDepth = 4
): string | null {
  const queue: Array<{ value: unknown; depth: number }> = [{ value: root, depth: 0 }];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }
    const { value, depth } = current;
    if (depth > maxDepth) {
      continue;
    }
    if (Array.isArray(value)) {
      value.forEach((entry) => queue.push({ value: entry, depth: depth + 1 }));
      continue;
    }
    if (!value || typeof value !== 'object') {
      continue;
    }
    const record = value as Record<string, unknown>;
    for (const key of keys) {
      if (key in record) {
        const candidate = record[key];
        if (typeof candidate === 'string' && candidate.trim()) {
          return candidate.trim();
        }
      }
    }
    Object.values(record).forEach((entry) => queue.push({ value: entry, depth: depth + 1 }));
  }

  return null;
}

function logAdRankingResponse(label: string, payload: unknown): void {
  if (!SHOULD_LOG_AD_RANKING) {
    return;
  }
  try {
    const text = JSON.stringify(
      payload,
      (_key, value) => {
        if (typeof value === 'string') {
          return value.replace(/access_token=[^&\s"]+/gi, 'access_token=REDACTED');
        }
        return value;
      },
      2
    );
    console.log(`[AdRanking][${label}] ${text}`);
  } catch {
    console.log(`[AdRanking][${label}]`, payload);
  }
}

async function readJsonResponse(response: Response, label: string): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`${label} API returned non-JSON response (status ${response.status}).`);
  }
}

function buildTikTokHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Token': TIKTOK_ACCESS_TOKEN,
    'Content-Type': 'application/json',
  };
  if (TIKTOK_BUSINESS_ID) {
    headers['Business-Id'] = TIKTOK_BUSINESS_ID;
  }
  return headers;
}

function chunkList<T>(items: T[], size = 100): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

function normalizeGoogleCustomerId(value: string): string {
  return value.replace(/-/g, '');
}

function base64UrlEncode(value: string | Buffer): string {
  const encoded = Buffer.isBuffer(value) ? value.toString('base64') : Buffer.from(value).toString('base64');
  return encoded.replace(/\+/g, '-').replace(/\//g, '_');
}

type MetaCreativeInfo = {
  creativeId: string | null;
  videoId: string | null;
  thumbnailUrl: string | null;
};

type MetaVideoInfo = {
  source: string | null;
  picture: string | null;
};

function extractMetaCreativeInfo(creative: Record<string, unknown>): MetaCreativeInfo {
  const storySpec = asRecord(creative.object_story_spec);
  const videoData = storySpec ? asRecord(storySpec.video_data) : null;
  const creativeId = pickFirstString(creative.id);
  const videoId = pickFirstString(videoData?.video_id);
  const thumbnailUrl = pickFirstString(creative.thumbnail_url);
  return {
    creativeId: creativeId ?? null,
    videoId: videoId ?? null,
    thumbnailUrl: thumbnailUrl ?? null,
  };
}

async function fetchMetaCreativeMap(adIds: string[]): Promise<Record<string, MetaCreativeInfo>> {
  if (!META_ACCESS_TOKEN || adIds.length === 0) {
    return {};
  }

  const result: Record<string, MetaCreativeInfo> = {};
  const chunks = chunkList(adIds, 50);

  for (const chunk of chunks) {
    const params = new URLSearchParams({
      access_token: META_ACCESS_TOKEN,
      fields:
        'creative{thumbnail_url,video_id,object_story_spec{video_data{video_id,image_url},link_data{picture},photo_data{image_url}},asset_feed_spec{videos,images}}',
    });
    const url = `https://graph.facebook.com/v19.0/?ids=${chunk.join(',')}&${params.toString()}`;
    const response: Response = await fetch(url, { cache: 'no-store' });
    const payload = await readJsonResponse(response, 'Meta');
    logAdRankingResponse('Meta creative', payload);
    const payloadObject = typeof payload === 'object' && payload ? (payload as Record<string, unknown>) : null;
    if (!response.ok) {
      const message =
        payloadObject && typeof payloadObject.error === 'object'
          ? (payloadObject.error as { message?: string }).message
          : 'Meta creative request failed.';
      throw new Error(message ?? 'Meta creative request failed.');
    }

    if (!payloadObject) {
      continue;
    }

    Object.entries(payloadObject).forEach(([adId, entry]) => {
      const entryRecord = asRecord(entry);
      if (!entryRecord || entryRecord.error) {
        return;
      }
      const creative = asRecord(entryRecord.creative);
      if (!creative) {
        return;
      }
      result[adId] = extractMetaCreativeInfo(creative);
    });
  }

  return result;
}

async function fetchMetaVideoMap(videoIds: string[]): Promise<Record<string, MetaVideoInfo>> {
  if (!META_ACCESS_TOKEN || videoIds.length === 0) {
    return {};
  }

  const result: Record<string, MetaVideoInfo> = {};
  const chunks = chunkList(videoIds, 50);

  for (const chunk of chunks) {
    const params = new URLSearchParams({
      access_token: META_ACCESS_TOKEN,
      fields: 'source,picture',
    });
    const url = `https://graph.facebook.com/v19.0/?ids=${chunk.join(',')}&${params.toString()}`;
    const response: Response = await fetch(url, { cache: 'no-store' });
    const payload = await readJsonResponse(response, 'Meta');
    logAdRankingResponse('Meta video', payload);
    const payloadObject = typeof payload === 'object' && payload ? (payload as Record<string, unknown>) : null;
    if (!response.ok) {
      const message =
        payloadObject && typeof payloadObject.error === 'object'
          ? (payloadObject.error as { message?: string }).message
          : 'Meta video request failed.';
      throw new Error(message ?? 'Meta video request failed.');
    }

    if (!payloadObject) {
      continue;
    }

    Object.entries(payloadObject).forEach(([videoId, entry]) => {
      const entryRecord = asRecord(entry);
      if (!entryRecord || entryRecord.error) {
        return;
      }
      const source = pickFirstString(entryRecord.source);
      const picture = pickFirstString(entryRecord.picture);
      result[videoId] = {
        source: source ?? null,
        picture: picture ?? null,
      };
    });
  }

  return result;
}

async function attachMetaAdMedia(rows: AdRankingRow[]): Promise<void> {
  const adIds = Array.from(new Set(rows.map((row) => row.adId).filter(Boolean)));
  if (adIds.length === 0) {
    return;
  }

  const creativeMap = await fetchMetaCreativeMap(adIds);
  const videoIds = Array.from(
    new Set(
      Object.values(creativeMap)
        .map((info) => info.videoId)
        .filter((id): id is string => Boolean(id))
    )
  );
  const videoMap = await fetchMetaVideoMap(videoIds);

  rows.forEach((row) => {
    const creative = creativeMap[row.adId];
    if (!creative) {
      return;
    }
    const videoInfo = creative.videoId ? videoMap[creative.videoId] : null;
    row.videoUrl = videoInfo?.source ?? null;
    row.videoThumbnailUrl = creative.thumbnailUrl ?? videoInfo?.picture ?? null;
  });
}

type GoogleVideoAssetInfo = {
  adId: string;
  assetNames: string[];
};

function collectGoogleVideoAssets(ad: unknown): string[] {
  if (!ad || typeof ad !== 'object') {
    return [];
  }

  const assets: string[] = [];

  const pushAsset = (asset: unknown) => {
    if (typeof asset === 'string') {
      const trimmed = asset.trim();
      if (trimmed) {
        assets.push(trimmed);
      }
    }
  };

  const pushAssetList = (list: unknown) => {
    if (!Array.isArray(list)) {
      return;
    }
    list.forEach((item) => {
      if (item && typeof item === 'object') {
        pushAsset((item as { asset?: unknown }).asset);
      }
    });
  };

  const adRecord = ad as Record<string, unknown>;
  const videoResponsiveAd = adRecord.video_responsive_ad as Record<string, unknown> | undefined;
  const videoAd = adRecord.video_ad as Record<string, unknown> | undefined;
  const videoAdAsset = (videoAd?.video as Record<string, unknown> | undefined)?.asset;
  const responsiveDisplayAd = adRecord.responsive_display_ad as Record<string, unknown> | undefined;
  const appAd = adRecord.app_ad as Record<string, unknown> | undefined;
  const appPreRegistrationAd = adRecord.app_pre_registration_ad as Record<string, unknown> | undefined;
  const appEngagementAd = adRecord.app_engagement_ad as Record<string, unknown> | undefined;
  const localAd = adRecord.local_ad as Record<string, unknown> | undefined;
  const demandGenVideoResponsiveAd = adRecord.demand_gen_video_responsive_ad as Record<string, unknown> | undefined;

  pushAssetList(videoResponsiveAd?.videos);
  pushAsset(videoAdAsset);
  pushAssetList(responsiveDisplayAd?.youtube_videos);
  pushAssetList(appAd?.youtube_videos);
  pushAssetList(appPreRegistrationAd?.youtube_videos);
  pushAssetList(appEngagementAd?.videos);
  pushAssetList(localAd?.videos);
  pushAssetList(demandGenVideoResponsiveAd?.videos);

  return Array.from(new Set(assets));
}

function buildYoutubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function buildYoutubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

async function fetchGoogleAdVideoAssets(
  customer: GoogleAdsCustomer,
  adIds: string[]
): Promise<GoogleVideoAssetInfo[]> {
  const results: GoogleVideoAssetInfo[] = [];
  const chunks = chunkList(adIds, 100);

  for (const chunk of chunks) {
    const query = `
      SELECT
        ad_group_ad.ad.id,
        ad_group_ad.ad.video_responsive_ad.videos,
        ad_group_ad.ad.video_ad.video.asset,
        ad_group_ad.ad.responsive_display_ad.youtube_videos,
        ad_group_ad.ad.app_ad.youtube_videos,
        ad_group_ad.ad.app_pre_registration_ad.youtube_videos,
        ad_group_ad.ad.app_engagement_ad.videos,
        ad_group_ad.ad.local_ad.videos,
        ad_group_ad.ad.demand_gen_video_responsive_ad.videos
      FROM ad_group_ad
      WHERE ad_group_ad.ad.id IN (${chunk.join(',')})
    `;
    const response = await customer.query(query);
    logAdRankingResponse('GoogleAds video_responsive_ad', response);
    for (const item of response) {
      const adId = item.ad_group_ad?.ad?.id ? String(item.ad_group_ad.ad.id) : '';
      const assetNames = collectGoogleVideoAssets(item.ad_group_ad?.ad);
      if (adId && assetNames.length > 0) {
        results.push({ adId, assetNames });
      }
    }
  }

  return results;
}

async function fetchGoogleYoutubeVideoIds(
  customer: GoogleAdsCustomer,
  assetNames: string[]
): Promise<Record<string, string>> {
  if (assetNames.length === 0) {
    return {};
  }

  const map: Record<string, string> = {};
  const chunks = chunkList(assetNames, 100);

  for (const chunk of chunks) {
    const escaped = chunk.map((value) => `'${value.replace(/'/g, "\\'")}'`).join(',');
    const query = `
      SELECT
        asset.resource_name,
        asset.youtube_video_asset.youtube_video_id
      FROM asset
      WHERE asset.resource_name IN (${escaped})
    `;
    const response = await customer.query(query);
    logAdRankingResponse('GoogleAds youtube_video_asset', response);
    for (const item of response) {
      const resourceName = item.asset?.resource_name ?? '';
      const youtubeId = item.asset?.youtube_video_asset?.youtube_video_id ?? '';
      if (resourceName && youtubeId) {
        map[resourceName] = youtubeId;
      }
    }
  }

  return map;
}

async function attachGoogleAdMedia(
  customer: GoogleAdsCustomer,
  rows: AdRankingRow[]
): Promise<void> {
  const adIds = Array.from(
    new Set(rows.map((row) => row.adId).filter((id) => id && /^\d+$/.test(id)))
  );
  if (adIds.length === 0) {
    return;
  }

  const assetInfo = await fetchGoogleAdVideoAssets(customer, adIds);
  const assetNames = Array.from(new Set(assetInfo.flatMap((entry) => entry.assetNames)));
  const youtubeMap = await fetchGoogleYoutubeVideoIds(customer, assetNames);

  const adAssetMap = new Map<string, string[]>();
  assetInfo.forEach((entry) => {
    adAssetMap.set(entry.adId, entry.assetNames);
  });

  rows.forEach((row) => {
    const assets = adAssetMap.get(row.adId) ?? [];
    const youtubeId = assets.map((asset) => youtubeMap[asset]).find(Boolean);
    if (youtubeId) {
      row.videoUrl = buildYoutubeWatchUrl(youtubeId);
      row.videoThumbnailUrl = buildYoutubeThumbnailUrl(youtubeId);
    }
  });
}

async function fetchGoogleAdsAdInsights(
  account: AccountSummary,
  startDate: string,
  endDate: string
): Promise<AdRankingRow[]> {
  const { accountId: customerId, accountName } = account;
  if (
    !GOOGLE_ADS_DEVELOPER_TOKEN ||
    !GOOGLE_ADS_CLIENT_ID ||
    !GOOGLE_ADS_CLIENT_SECRET ||
    !GOOGLE_ADS_REFRESH_TOKEN
  ) {
    throw new Error('Google Ads credentials are not set.');
  }

  const api = new GoogleAdsApi({
    client_id: GOOGLE_ADS_CLIENT_ID,
    client_secret: GOOGLE_ADS_CLIENT_SECRET,
    developer_token: GOOGLE_ADS_DEVELOPER_TOKEN,
  });
  const normalizedCustomerId = normalizeGoogleCustomerId(customerId);
  const loginCustomerId = GOOGLE_ADS_LOGIN_CUSTOMER_ID
    ? normalizeGoogleCustomerId(GOOGLE_ADS_LOGIN_CUSTOMER_ID)
    : undefined;
  const customer = api.Customer({
    customer_id: normalizedCustomerId,
    login_customer_id: loginCustomerId,
    refresh_token: GOOGLE_ADS_REFRESH_TOKEN,
  });

  const query = `
    SELECT
      ad_group_ad.ad.id,
      ad_group_ad.ad.name,
      metrics.cost_micros,
      metrics.conversions
    FROM ad_group_ad
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      AND metrics.cost_micros > 0
    ORDER BY metrics.cost_micros DESC
  `;

  try {
    const rows: AdRankingRow[] = [];
    // Use query() instead of queryStream() to avoid stream-chain issues in Next.js
    const response = await customer.query(query);
    logAdRankingResponse(`GoogleAds ad_group_ad ${accountName}`, response);

    for (const item of response) {
      const adId = item.ad_group_ad?.ad?.id ? String(item.ad_group_ad.ad.id) : '';
      const adName = item.ad_group_ad?.ad?.name ?? adId ?? '(名前未設定)';
      const spend = toNumber(item.metrics?.cost_micros) / 1_000_000;
      if (spend <= 0) {
        continue;
      }
      const mediaCv = toNullableNumber(item.metrics?.conversions);
      rows.push({
        platform: 'google',
        accountId: customerId,
        accountName,
        adId,
        adName,
        spend,
        mediaCv,
        cpa: mediaCv && mediaCv > 0 ? spend / mediaCv : null,
      });
    }
    try {
      await attachGoogleAdMedia(customer, rows);
    } catch {
      // Skip video assets if API fields are unavailable
    }
    return rows;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Google Ads API request failed.';
    throw new Error(`Google Ads API error for ${accountName} (${customerId}): ${message}`);
  }
}

function normalizeLinePath(path: string): string {
  let normalized = path.startsWith('/') ? path : `/${path}`;
  if (!normalized.startsWith('/api/')) {
    normalized = normalized === '/api' ? '/api' : `/api${normalized}`;
  }
  return normalized;
}

function buildLineHeaders(path: string, body?: string, contentType?: string): Record<string, string> {
  if (!LINE_ACCESS_KEY || !LINE_SECRET_KEY) {
    throw new Error('LINE_ACCESS_KEY or LINE_SECRET_KEY is not set.');
  }
  const normalizedPath = normalizeLinePath(path);
  const now = new Date();
  const dateHeader = now.toUTCString();
  const payloadDate = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(
    now.getUTCDate()
  ).padStart(2, '0')}`;
  const bodyText = body ?? '';
  const contentTypeValue = contentType ?? '';
  const bodyDigest = crypto.createHash('sha256').update(bodyText).digest('hex');
  const headerJson = JSON.stringify({ alg: 'HS256', kid: LINE_ACCESS_KEY, typ: 'text/plain' });
  const headerB64 = base64UrlEncode(headerJson);
  const payloadText = [bodyDigest, contentTypeValue, payloadDate, normalizedPath].join('\n');
  const payloadB64 = base64UrlEncode(payloadText);
  const signingInput = `${headerB64}.${payloadB64}`;
  const signature = base64UrlEncode(
    crypto.createHmac('sha256', LINE_SECRET_KEY).update(signingInput).digest()
  );
  const token = `${signingInput}.${signature}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Date: dateHeader,
  };
  if (contentTypeValue) {
    headers['Content-Type'] = contentTypeValue;
  }
  return headers;
}

const LINE_VIDEO_KEYS = [
  'videoUrl',
  'video_url',
  'videoUrlList',
  'video_url_list',
  'videoPreviewUrl',
  'video_preview_url',
  'previewUrl',
  'preview_url',
  'playUrl',
  'play_url',
];

const LINE_THUMBNAIL_KEYS = [
  'thumbnailUrl',
  'thumbnail_url',
  'imageUrl',
  'image_url',
  'imageUrlList',
  'image_url_list',
  'previewImageUrl',
  'preview_image_url',
  'coverUrl',
  'cover_url',
];

function extractLineMedia(record: Record<string, unknown>, adInfo: Record<string, unknown> | null) {
  const roots: Record<string, unknown>[] = [];
  if (adInfo) {
    roots.push(adInfo);
  }
  const creativeCandidates = [
    record.creative,
    record.creative_info,
    record.creativeInfo,
    record.adCreative,
    record.ad_creative,
  ];
  creativeCandidates.forEach((candidate) => {
    const asCandidate = asRecord(candidate);
    if (asCandidate) {
      roots.push(asCandidate);
    }
  });
  roots.push(record);

  let videoUrl: string | null = null;
  for (const root of roots) {
    videoUrl = findNestedUrl(root, LINE_VIDEO_KEYS);
    if (videoUrl) {
      break;
    }
  }

  let thumbnailUrl: string | null = null;
  for (const root of roots) {
    thumbnailUrl = findNestedUrl(root, LINE_THUMBNAIL_KEYS);
    if (thumbnailUrl) {
      break;
    }
  }

  return { videoUrl, thumbnailUrl };
}

async function fetchLineMediaAssets(
  accountId: string
): Promise<Record<string, { videoUrl: string | null; thumbnailUrl: string | null; name: string | null }>> {
  const result: Record<string, { videoUrl: string | null; thumbnailUrl: string | null; name: string | null }> = {};

  try {
    let page = 1;
    const size = 100;

    while (true) {
      const endpoint = `/v3/adaccounts/${accountId}/media`;
      const normalizedEndpoint = normalizeLinePath(endpoint);
      const url = `${LINE_API_BASE_URL.replace(/\/$/, '')}${normalizedEndpoint}`;
      const params = new URLSearchParams({
        page: String(page),
        size: String(size),
      });
      const headers = buildLineHeaders(endpoint);

      const response: Response = await fetch(`${url}?${params.toString()}`, {
        headers,
        cache: 'no-store'
      });
      const payload = await readJsonResponse(response, 'LINE');
      logAdRankingResponse('LINE media', payload);

      if (!response.ok) {
        if (SHOULD_LOG_AD_RANKING) {
          const message = typeof payload === 'object' && payload && 'message' in payload
            ? (payload as { message?: string }).message
            : 'LINE media API request failed.';
          console.log(`[AdRanking][LINE media fetch failed] ${message}`);
        }
        break;
      }

      const payloadObject = asRecord(payload);
      if (!payloadObject) {
        break;
      }

      const datas = Array.isArray(payloadObject.datas) ? payloadObject.datas : [];

      datas.forEach((media) => {
        const mediaRecord = asRecord(media);
        if (!mediaRecord) {
          return;
        }

        const mediaId = mediaRecord.id ? String(mediaRecord.id) : null;
        const mediaName = typeof mediaRecord.name === 'string' ? mediaRecord.name : null;

        if (!mediaId) {
          return;
        }

        // Get sourceUrl from ObsObject
        const obsObject = asRecord(mediaRecord.object);
        const sourceUrl = obsObject && typeof obsObject.sourceUrl === 'string' ? obsObject.sourceUrl : null;

        // Determine if it's a video or image based on mediaType
        const mediaType = typeof mediaRecord.mediaType === 'string' ? mediaRecord.mediaType : null;
        let videoUrl: string | null = null;
        let thumbnailUrl: string | null = null;

        if (sourceUrl) {
          if (mediaType === 'VIDEO') {
            videoUrl = sourceUrl;
          } else if (mediaType === 'IMAGE') {
            thumbnailUrl = sourceUrl;
          } else {
            // Fallback: try to detect from URL or use as both
            thumbnailUrl = sourceUrl;
          }
        }

        // Also check other possible URL fields as fallback
        if (!videoUrl && !thumbnailUrl) {
          videoUrl = findNestedUrl(mediaRecord, LINE_VIDEO_KEYS);
          thumbnailUrl = thumbnailUrl ?? findNestedUrl(mediaRecord, LINE_THUMBNAIL_KEYS);

          if (obsObject && !videoUrl && !thumbnailUrl) {
            videoUrl = findNestedUrl(obsObject, LINE_VIDEO_KEYS);
            thumbnailUrl = thumbnailUrl ?? findNestedUrl(obsObject, LINE_THUMBNAIL_KEYS);
          }
        }

        if (videoUrl || thumbnailUrl || mediaName) {
          result[mediaId] = {
            videoUrl,
            thumbnailUrl,
            name: mediaName,
          };
        }
      });

      const paging = asRecord(payloadObject.paging);
      const totalPagesRaw = paging?.totalPages ?? paging?.total_pages ?? paging?.totalPage;
      const totalPages = totalPagesRaw ? Number(totalPagesRaw) : null;

      if (!datas.length || (totalPages !== null && page >= totalPages)) {
        break;
      }
      page += 1;
    }
  } catch (error) {
    if (SHOULD_LOG_AD_RANKING) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`[AdRanking][LINE media fetch failed] error=${message}`);
    }
  }

  return result;
}

async function fetchLineAdInsights(
  account: AccountSummary,
  startDate: string,
  endDate: string
): Promise<AdRankingRow[]> {
  const { accountId, accountName } = account;
  const endpoint = LINE_AD_REPORT_ENDPOINT.replace('{adAccountId}', accountId);
  const url = `${LINE_API_BASE_URL.replace(/\/$/, '')}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const rows: AdRankingRow[] = [];
  let page = 1;
  const size = 100;

  while (true) {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
      since: startDate,
      until: endDate,
    });
    const headers = buildLineHeaders(endpoint);
    const response: Response = await fetch(`${url}?${params.toString()}`, { headers });
    const payload = await readJsonResponse(response, 'LINE');
    logAdRankingResponse('LINE report', payload);
    // console.log('[AdRanking][LINE] response', payload);
    if (!response.ok) {
      const message =
        typeof payload === 'object' && payload && 'message' in payload
          ? (payload as { message?: string }).message
          : 'LINE API request failed.';
      throw new Error(message ?? 'LINE API request failed.');
    }

    const list =
      typeof payload === 'object' && payload && 'datas' in payload && Array.isArray((payload as { datas?: unknown }).datas)
        ? ((payload as { datas: Array<Record<string, unknown>> }).datas)
        : [];
    list.forEach((record) => {
      const adInfo =
        (record.ad as { id?: string | number; name?: string } | undefined) ??
        (record.adGroup as { id?: string | number; name?: string } | undefined) ??
        (record.adgroup as { id?: string | number; name?: string } | undefined);
      const media = extractLineMedia(record, asRecord(adInfo));
      const stats = record.statistics as Record<string, unknown> | undefined;
      const adId = adInfo?.id ? String(adInfo.id) : String((record as { adId?: string | number }).adId ?? '');
      const adName = adInfo?.name ?? String((record as { adName?: string }).adName ?? adId ?? '(名前未設定)');
      const spend = toNumber(stats?.cost ?? stats?.spend);
      if (spend <= 0) {
        return;
      }
      const rawMediaCv = stats?.cv ?? stats?.conversions ?? stats?.conversion;
      const mediaCv = rawMediaCv === undefined ? null : toNullableNumber(rawMediaCv);
      rows.push({
        platform: 'line',
        accountId,
        accountName,
        adId,
        adName,
        videoUrl: media.videoUrl,
        videoThumbnailUrl: media.thumbnailUrl,
        spend,
        mediaCv,
        cpa: mediaCv && mediaCv > 0 ? spend / mediaCv : null,
      });
    });

    const paging = typeof payload === 'object' && payload ? (payload as { paging?: Record<string, unknown> }).paging : null;
    const totalPagesRaw = paging?.totalPages ?? paging?.total_pages ?? paging?.totalPage;
    const totalPages = totalPagesRaw ? Number(totalPagesRaw) : null;
    if (!list.length || (totalPages !== null && page >= totalPages)) {
      break;
    }
    page += 1;
  }

  // Fetch media assets once for the account
  if (rows.some((row) => !row.videoUrl && !row.videoThumbnailUrl)) {
    try {
      const mediaMap = await fetchLineMediaAssets(accountId);

      // Try to match media to ads by media name or ID
      rows.forEach((row) => {
        if (row.videoUrl || row.videoThumbnailUrl) {
          return;
        }

        // Look for media that matches the ad name
        // Ad name often contains the media file name (e.g., "10_shiroru_display_6_9.png")
        for (const [mediaId, media] of Object.entries(mediaMap)) {
          const matched =
            // Check if media name matches ad name
            (media.name && row.adName.includes(media.name)) ||
            (media.name && media.name.includes(row.adName)) ||
            // Check if ad name contains media ID
            row.adName.includes(mediaId) ||
            // Check if media ID equals ad ID
            mediaId === row.adId;

          if (matched) {
            row.videoUrl = row.videoUrl ?? media.videoUrl;
            row.videoThumbnailUrl = row.videoThumbnailUrl ?? media.thumbnailUrl;
            break;
          }
        }
      });
    } catch (error) {
      // Skip media fetch if API fails
      if (SHOULD_LOG_AD_RANKING) {
        const message = error instanceof Error ? error.message : String(error);
        console.log(`[AdRanking][LINE media fetch failed] error=${message}`);
      }
    }
  }

  return rows;
}

async function getProjectAccounts(projectName: string): Promise<ProjectAccounts> {
  const [project] = await db
    .select({ id: reportProjectsTable.id })
    .from(reportProjectsTable)
    .where(eq(reportProjectsTable.project_name, projectName))
    .limit(1);

  if (!project) {
    return { meta: [], tiktok: [], google: [], line: [] };
  }

  const meta = await db
    .select({
      accountId: reportMetaAccountsTable.account_id,
      accountName: reportMetaAccountsTable.account_name,
    })
    .from(projectMetaAccountsTable)
    .innerJoin(reportMetaAccountsTable, eq(projectMetaAccountsTable.account_id, reportMetaAccountsTable.id))
    .where(eq(projectMetaAccountsTable.project_id, project.id));

  const tiktok = await db
    .select({
      accountId: reportTiktokAccountsTable.advertiser_id,
      accountName: reportTiktokAccountsTable.advertiser_name,
    })
    .from(projectTiktokAccountsTable)
    .innerJoin(reportTiktokAccountsTable, eq(projectTiktokAccountsTable.account_id, reportTiktokAccountsTable.id))
    .where(eq(projectTiktokAccountsTable.project_id, project.id));

  const google = await db
    .select({
      accountId: reportGoogleAdsAccountsTable.customer_id,
      accountName: reportGoogleAdsAccountsTable.display_name,
    })
    .from(projectGoogleAdsAccountsTable)
    .innerJoin(
      reportGoogleAdsAccountsTable,
      eq(projectGoogleAdsAccountsTable.account_id, reportGoogleAdsAccountsTable.id)
    )
    .where(eq(projectGoogleAdsAccountsTable.project_id, project.id));

  const line = await db
    .select({
      accountId: reportLineAccountsTable.account_id,
      accountName: reportLineAccountsTable.display_name,
    })
    .from(projectLineAccountsTable)
    .innerJoin(reportLineAccountsTable, eq(projectLineAccountsTable.account_id, reportLineAccountsTable.id))
    .where(eq(projectLineAccountsTable.project_id, project.id));

  return { meta, tiktok, google, line };
}

type MetaActionEntry = { action_type?: string; action_target_id?: string; value?: string | number };

type MetaResultValueEntry = { value?: string | number };

type MetaResultEntry = { indicator?: string; values?: MetaResultValueEntry[] };

type MetaInsightRow = {
  ad_id?: string;
  ad_name?: string;
  spend?: string;
  conversions?: MetaActionEntry[];
  results?: MetaResultEntry[] | string | number | null;
};

function extractResultActionType(results: MetaInsightRow['results']): string | null {
  if (!results) {
    return null;
  }
  if (Array.isArray(results)) {
    const indicator = results.find((entry) => typeof entry?.indicator === 'string')?.indicator;
    if (!indicator) {
      return null;
    }
    const colonIndex = indicator.indexOf(':');
    return colonIndex >= 0 ? indicator.slice(colonIndex + 1) : indicator;
  }
  if (typeof results === 'string') {
    const colonIndex = results.indexOf(':');
    return colonIndex >= 0 ? results.slice(colonIndex + 1) : results;
  }
  return null;
}

function extractResultValue(results: MetaInsightRow['results']): number | null {
  if (results === null || results === undefined) {
    return null;
  }
  if (typeof results === 'number' || typeof results === 'string') {
    return toNullableNumber(results);
  }
  if (Array.isArray(results)) {
    const entryWithValues = results.find((entry) => Array.isArray(entry?.values) && entry.values.length > 0);
    if (!entryWithValues || !Array.isArray(entryWithValues.values)) {
      return null;
    }
    const total = entryWithValues.values.reduce((sum, valueEntry) => {
      const value = toNullableNumber(valueEntry?.value);
      return sum + (value ?? 0);
    }, 0);
    return total;
  }
  return null;
}

function matchesMetaAction(action: MetaActionEntry, target: string): boolean {
  if (!target) return false;
  if (action.action_target_id === target) return true;
  if (action.action_type === target) return true;
  if (action.action_type && action.action_type.endsWith(`.${target}`)) return true;
  return action.action_type === `offsite_conversion.custom.${target}`;
}

function findMetaActionValue(actions: MetaActionEntry[] | undefined, target: string): number | null {
  if (!actions || actions.length === 0) {
    return null;
  }
  const matched = actions.find((action) => action && matchesMetaAction(action, target));
  return matched ? toNullableNumber(matched.value) : null;
}

function resolveMetaResultValue(row: MetaInsightRow): number | null {
  const conversions = row.conversions ?? [];

  const resultValue = extractResultValue(row.results);
  if (resultValue !== null) {
    return resultValue;
  }

  if (META_RESULT_ACTION_TARGET) {
    const conversionValue = findMetaActionValue(conversions, META_RESULT_ACTION_TARGET);
    if (conversionValue !== null) return conversionValue;
  }

  if (META_RESULT_ACTION_TYPE) {
    const conversionValue = findMetaActionValue(conversions, META_RESULT_ACTION_TYPE);
    if (conversionValue !== null) return conversionValue;
  }

  const resultActionType = extractResultActionType(row.results);
  if (resultActionType) {
    const conversionValue = findMetaActionValue(conversions, resultActionType);
    if (conversionValue !== null) return conversionValue;
  }

  return null;
}

async function fetchMetaAdInsights(
  account: AccountSummary,
  startDate: string,
  endDate: string
): Promise<AdRankingRow[]> {
  const { accountId, accountName } = account;
  if (!META_ACCESS_TOKEN) {
    throw new Error('META_ACCESS_TOKEN is not set.');
  }

  const normalizedAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
  const params = new URLSearchParams({
    access_token: META_ACCESS_TOKEN,
    level: 'ad',
    fields: 'ad_id,ad_name,spend,conversions,results',
    action_breakdowns: 'action_type,action_target_id',
    use_account_attribution_setting: 'true',
    filtering: JSON.stringify([{ field: 'spend', operator: 'GREATER_THAN', value: 0 }]),
    time_range: JSON.stringify({ since: startDate, until: endDate }),
    limit: '500',
  });
  let nextUrl: string | null = `https://graph.facebook.com/v19.0/${normalizedAccountId}/insights?${params.toString()}`;
  const rows: AdRankingRow[] = [];

  while (nextUrl) {
    const response: Response = await fetch(nextUrl, { cache: 'no-store' });
    const payload = await readJsonResponse(response, 'Meta');
    logAdRankingResponse('Meta insights', payload);
    // console.log('[AdRanking][Meta] response', JSON.stringify(payload, null, 2));
    if (!response.ok) {
      const message =
        typeof payload === 'object' && payload && 'error' in payload
          ? (payload as { error?: { message?: string } }).error?.message
          : undefined;
      const fallback = message ?? 'Meta API request failed.';
      throw new Error(fallback);
    }
    const payloadError =
      typeof payload === 'object' && payload && 'error' in payload
        ? (payload as { error?: { message?: string } }).error?.message
        : undefined;
    if (payloadError) {
      throw new Error(payloadError);
    }

    const data =
      typeof payload === 'object' && payload && 'data' in payload && Array.isArray((payload as { data?: unknown }).data)
        ? ((payload as { data: MetaInsightRow[] }).data)
        : [];
    data.forEach((row) => {
      const spend = toNumber(row.spend);
      if (spend <= 0) {
        return;
      }
      const mediaCv = resolveMetaResultValue(row);
      rows.push({
        platform: 'meta',
        accountId,
        accountName,
        adId: row.ad_id ?? '',
        adName: row.ad_name ?? '(名前未設定)',
        spend,
        mediaCv,
        cpa: mediaCv && mediaCv > 0 ? spend / mediaCv : null,
      });
    });

    const nextValue =
      typeof payload === 'object' && payload && 'paging' in payload
        ? (payload as { paging?: { next?: string } }).paging?.next
        : null;
    nextUrl = nextValue ?? null;
  }

  try {
    await attachMetaAdMedia(rows);
  } catch {
    // Skip creative media if API fails
  }

  return rows;
}

type TikTokReportRow = {
  dimensions?: Record<string, string>;
  metrics?: Record<string, string>;
};

type TikTokAdMetadata = {
  name?: string;
  videoId?: string | null;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
};

function extractTikTokVideoUrl(item: Record<string, unknown>): string | null {
  // TikTok v1.3 API returns preview_url as the main video URL
  return pickFirstString(item.preview_url);
}

function extractTikTokThumbnailUrl(item: Record<string, unknown>): string | null {
  // TikTok v1.3 API returns video_cover_url as the main thumbnail URL
  return pickFirstString(item.video_cover_url);
}

function extractTikTokVideoId(item: Record<string, unknown>): string | null {
  const direct = pickFirstId(item.video_id, item.videoId);
  if (direct) {
    return direct;
  }
  const nested = findNestedStringByKey(item, ['video_id', 'videoId']);
  return nested ?? null;
}

async function fetchTikTokVideoInfo(
  advertiserId: string,
  videoIds: string[]
): Promise<Record<string, { videoUrl: string | null; thumbnailUrl: string | null }>> {
  if (!TIKTOK_ACCESS_TOKEN || videoIds.length === 0) {
    return {};
  }

  const headers = buildTikTokHeaders();
  const chunks = chunkList(videoIds, 20);
  const result: Record<string, { videoUrl: string | null; thumbnailUrl: string | null }> = {};
  const baseUrls = buildTikTokVideoBaseUrls();
  const paramBuilders = [
    {
      label: 'json-array',
      build: (ids: string[]) => {
        const params = new URLSearchParams({ advertiser_id: advertiserId });
        // TikTok v1.3 expects video_ids as JSON array string in query param
        params.set('video_ids', JSON.stringify(ids));
        return params;
      },
    },
  ];

  for (const chunk of chunks) {
    const endpoints = baseUrls.map((baseUrl) => ({ url: `${baseUrl}/file/video/ad/info/`, method: 'GET' as const }));
    let payload: unknown = null;
    let payloadObject: Record<string, unknown> | null = null;
    let success = false;

    for (const endpoint of endpoints) {
      for (const builder of paramBuilders) {
        const requestUrl = `${endpoint.url}?${builder.build(chunk).toString()}`;
        const response = await fetch(requestUrl, {
          headers,
          cache: 'no-store',
          method: endpoint.method,
        });
        try {
          payload = await readJsonResponse(response, 'TikTok');
        } catch (error) {
          if (SHOULD_LOG_AD_RANKING) {
            const message = error instanceof Error ? error.message : String(error);
            console.log(
              `[AdRanking][TikTok video attempt failed] ${endpoint.method} ${endpoint.url} format=${builder.label} ${message}`
            );
          }
          continue;
        }
        payloadObject = typeof payload === 'object' && payload ? (payload as Record<string, unknown>) : null;
        if (response.ok && !(payloadObject && payloadObject.code)) {
          success = true;
          break;
        }
        if (SHOULD_LOG_AD_RANKING) {
          const code = payloadObject?.code;
          const message = payloadObject && typeof payloadObject.message === 'string' ? payloadObject.message : 'n/a';
          const requestId = payloadObject && typeof payloadObject.request_id === 'string' ? payloadObject.request_id : 'n/a';
          console.log(
            `[AdRanking][TikTok video attempt failed] ${endpoint.method} ${endpoint.url} format=${builder.label} status=${response.status} code=${code ?? 'n/a'} message=${message} request_id=${requestId}`
          );
        }
      }
      if (success) {
        break;
      }
    }

    if (!success || !payloadObject) {
      continue;
    }

    logAdRankingResponse('TikTok video', payload);

    const list =
      payloadObject &&
      typeof payloadObject.data === 'object' &&
      payloadObject.data &&
      Array.isArray((payloadObject.data as { list?: unknown }).list)
        ? (payloadObject.data as { list: Array<Record<string, unknown>> }).list
        : [];
    list.forEach((item) => {
      const videoId = extractTikTokVideoId(item);
      if (!videoId) {
        return;
      }
      result[videoId] = {
        videoUrl: extractTikTokVideoUrl(item),
        thumbnailUrl: extractTikTokThumbnailUrl(item),
      };
    });
  }

  return result;
}

async function fetchTikTokAdMetadata(
  advertiserId: string,
  adIds: string[]
): Promise<Record<string, TikTokAdMetadata>> {
  if (adIds.length === 0) {
    return {};
  }

  const headers = buildTikTokHeaders();
  const metadataMap: Record<string, TikTokAdMetadata> = {};

  for (const chunk of chunkList(adIds, 100)) {
    const params = new URLSearchParams({
      advertiser_id: advertiserId,
      page: '1',
      page_size: String(chunk.length),
      filtering: JSON.stringify({ ad_ids: chunk }),
    });
    const response: Response = await fetch(
      `${TIKTOK_API_BASE_URL}/ad/get/?${params.toString()}`,
      { headers, cache: 'no-store' }
    );
    const payload = await readJsonResponse(response, 'TikTok');
    logAdRankingResponse('TikTok ad/get', payload);
    // console.log('[AdRanking][TikTok] ad/get response', JSON.stringify(payload, null, 2));
    const payloadObject = typeof payload === 'object' && payload ? (payload as Record<string, unknown>) : null;
    if (!response.ok || (payloadObject && payloadObject.code)) {
      continue;
    }

    const list =
      payloadObject &&
      typeof payloadObject.data === 'object' &&
      payloadObject.data &&
      Array.isArray((payloadObject.data as { list?: unknown }).list)
        ? (payloadObject.data as { list: Array<Record<string, unknown>> }).list
        : [];
    list.forEach((item) => {
      const rawAdId = item.ad_id ?? item.adId;
      const adId = rawAdId !== undefined && rawAdId !== null ? String(rawAdId) : '';
      if (!adId) {
        return;
      }
      const adName = pickFirstString(item.ad_name, item.display_name, item.name);
      const videoId = extractTikTokVideoId(item);
      metadataMap[adId] = {
        name: adName ?? undefined,
        videoId: videoId ?? null,
        videoUrl: extractTikTokVideoUrl(item),
        thumbnailUrl: extractTikTokThumbnailUrl(item),
      };
    });
  }

  const videoIds = Array.from(
    new Set(Object.values(metadataMap).map((meta) => meta.videoId).filter((id): id is string => Boolean(id)))
  );
  if (videoIds.length > 0) {
    logAdRankingResponse('TikTok video ids', { count: videoIds.length, videoIds });
    let videoMap: Record<string, { videoUrl: string | null; thumbnailUrl: string | null }> = {};
    try {
      videoMap = await fetchTikTokVideoInfo(advertiserId, videoIds);
    } catch (error) {
      if (SHOULD_LOG_AD_RANKING) {
        const message = error instanceof Error ? error.message : String(error);
        console.log(`[AdRanking][TikTok video error] ${message}`);
      }
    }
    Object.values(metadataMap).forEach((meta) => {
      if (!meta.videoId) {
        return;
      }
      const info = videoMap[meta.videoId];
      if (!info) {
        return;
      }
      if (!meta.videoUrl && info.videoUrl) {
        meta.videoUrl = info.videoUrl;
      }
      if (!meta.thumbnailUrl && info.thumbnailUrl) {
        meta.thumbnailUrl = info.thumbnailUrl;
      }
    });
  }

  return metadataMap;
}

async function fetchTikTokAdInsights(
  account: AccountSummary,
  startDate: string,
  endDate: string
): Promise<AdRankingRow[]> {
  const { accountId: advertiserId, accountName } = account;
  if (!TIKTOK_ACCESS_TOKEN) {
    throw new Error('TIKTOK_ACCESS_TOKEN is not set.');
  }

  const rows: AdRankingRow[] = [];
  const adIds: string[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const params = new URLSearchParams({
      advertiser_id: advertiserId,
      service_type: 'AUCTION',
      report_type: 'BASIC',
      data_level: 'AUCTION_AD',
      dimensions: JSON.stringify(['ad_id']),
      metrics: JSON.stringify(['spend', TIKTOK_RESULT_METRIC]),
      start_date: startDate,
      end_date: endDate,
      page: String(page),
      page_size: '200',
      order_field: 'spend',
      order_type: 'DESC',
    });
    const response: Response = await fetch(
      `${TIKTOK_API_BASE_URL}/report/integrated/get/?${params.toString()}`,
      { headers: buildTikTokHeaders(), cache: 'no-store' }
    );

    const payload = await readJsonResponse(response, 'TikTok');
    logAdRankingResponse('TikTok report', payload);
    // console.log('[AdRanking][TikTok] response', JSON.stringify(payload, null, 2));
    const payloadObject = typeof payload === 'object' && payload ? (payload as Record<string, unknown>) : null;
    const payloadMessage = payloadObject && typeof payloadObject.message === 'string' ? payloadObject.message : undefined;
    const payloadCode = payloadObject && typeof payloadObject.code === 'number' ? payloadObject.code : null;
    if (!response.ok) {
      throw new Error(payloadMessage ?? 'TikTok API request failed.');
    }
    if (payloadCode && payloadCode !== 0) {
      throw new Error(payloadMessage ?? 'TikTok API request failed.');
    }

    const list =
      payloadObject &&
      typeof payloadObject.data === 'object' &&
      payloadObject.data &&
      Array.isArray((payloadObject.data as { list?: unknown }).list)
        ? ((payloadObject.data as { list: TikTokReportRow[] }).list)
        : [];
    list.forEach((row) => {
      const adId = row.dimensions?.ad_id ?? '';
      const spend = toNumber(row.metrics?.spend);
      if (spend <= 0) {
        return;
      }
      const mediaCvValue =
        row.metrics?.[TIKTOK_RESULT_METRIC] ?? row.metrics?.result ?? row.metrics?.results;
      const mediaCv = mediaCvValue === undefined ? null : toNullableNumber(mediaCvValue);
      if (adId) {
        adIds.push(adId);
      }
      rows.push({
        platform: 'tiktok',
        accountId: advertiserId,
        accountName,
        adId,
        adName: row.dimensions?.ad_name ?? '',
        spend,
        mediaCv,
        cpa: mediaCv && mediaCv > 0 ? spend / mediaCv : null,
      });
    });

    totalPages =
      payloadObject &&
      typeof payloadObject.data === 'object' &&
      payloadObject.data &&
      typeof (payloadObject.data as { page_info?: { total_page?: number } }).page_info === 'object'
        ? ((payloadObject.data as { page_info?: { total_page?: number } }).page_info?.total_page ?? 1)
        : 1;
    page += 1;
  }

  if (rows.length > 0) {
    const uniqueAdIds = Array.from(new Set(adIds.filter(Boolean)));
    try {
      const metadataMap = await fetchTikTokAdMetadata(advertiserId, uniqueAdIds);
      rows.forEach((row) => {
        const meta = metadataMap[row.adId];
        if (meta?.name && !row.adName) {
          row.adName = meta.name;
        }
        if (!row.adName) {
          row.adName = row.adId || '(名前未設定)';
        }
        if (meta) {
          row.videoUrl = meta.videoUrl ?? row.videoUrl ?? null;
          row.videoThumbnailUrl = meta.thumbnailUrl ?? row.videoThumbnailUrl ?? null;
        }
      });
    } catch {
      // Skip video metadata if API fails
      rows.forEach((row) => {
        if (!row.adName) {
          row.adName = row.adId || '(名前未設定)';
        }
      });
    }
  }

  return rows;
}

export async function fetchAdRanking(params: {
  projectName: string;
  startDate: string;
  endDate: string;
}): Promise<AdRankingRow[]> {
  const { projectName, startDate, endDate } = params;
  const accounts = await getProjectAccounts(projectName);

  if (
    accounts.meta.length === 0 &&
    accounts.tiktok.length === 0 &&
    accounts.google.length === 0 &&
    accounts.line.length === 0
  ) {
    return [];
  }

  const metaRows = accounts.meta.length
    ? (
        await Promise.all(
          accounts.meta.map(async (account) => {
            try {
              return await fetchMetaAdInsights(account, startDate, endDate);
            } catch {
              // Silently skip failed accounts
              return [];
            }
          })
        )
      ).flat()
    : [];

  const tiktokRows = accounts.tiktok.length
    ? (
        await Promise.all(
          accounts.tiktok.map(async (account) => {
            try {
              return await fetchTikTokAdInsights(account, startDate, endDate);
            } catch {
              // Silently skip failed accounts
              return [];
            }
          })
        )
      ).flat()
    : [];

  const googleRows = accounts.google.length
    ? (
        await Promise.all(
          accounts.google.map(async (account) => {
            try {
              return await fetchGoogleAdsAdInsights(account, startDate, endDate);
            } catch {
              // Silently skip failed accounts
              return [];
            }
          })
        )
      ).flat()
    : [];

  const lineRows = accounts.line.length
    ? (
        await Promise.all(
          accounts.line.map(async (account) => {
            try {
              return await fetchLineAdInsights(account, startDate, endDate);
            } catch {
              // Silently skip failed accounts
              return [];
            }
          })
        )
      ).flat()
    : [];

  return [...metaRows, ...tiktokRows, ...googleRows, ...lineRows].sort((a, b) => b.spend - a.spend);
}
