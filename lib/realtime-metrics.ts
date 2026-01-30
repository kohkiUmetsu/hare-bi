import 'server-only';

import crypto from 'crypto';
import { GoogleAdsApi } from 'google-ads-api';
import { getReportSettings } from '@/lib/settings';
import {
  listPlatforms,
  listSections,
  type DailyMetricRow,
  type MetricBreakdownRow,
  type PlatformDetailedMetrics,
  type PlatformOption,
  type SectionOption,
} from '@/lib/metrics';

type PlatformType = 'meta' | 'tiktok' | 'google' | 'line';

type CampaignMetricRow = {
  platform: PlatformType;
  campaignId: string;
  campaignName: string;
  spend: number;
  impressions: number;
  clicks: number;
  mediaCv: number | null;
};

type MetricTotals = {
  actualAdCost: number;
  impressions: number;
  clicks: number;
  mspCv: number;
  actualCv: number;
  mCv: number;
  platformCv: number;
};

type SectionConfig = {
  sectionId: string;
  label: string;
  sectionName: string;
  campaignPrefixes: string[];
  campaignKeywords: string[];
  catchAllCampaign: boolean;
  mspPrefixes: string[];
  catchAllMsp: boolean;
};

type PlatformMapping = {
  platformId: string;
  platformLabel: string;
  platformType: PlatformType;
};

type MspConversionRow = {
  adName: string;
  prefix: string;
  linkId: string | null;
};

export type RealtimeProjectSnapshot = {
  date: string;
  projectDaily: DailyMetricRow;
  sectionDailyMap: Map<string, DailyMetricRow>;
  platformDailyMap: Map<string, DailyMetricRow>;
  sectionBreakdownMap: Map<string, MetricBreakdownRow>;
  platformBreakdownMap: Map<string, MetricBreakdownRow>;
  platformDetailMap: Map<string, PlatformDetailedMetrics>;
  sectionLabels: Map<string, string>;
  platformLabels: Map<string, string>;
  platformSectionMap: Map<string, string>;
};

const META_RESULT_ACTION_TYPE = process.env.META_RESULT_ACTION_TYPE ?? '';
const META_RESULT_ACTION_TARGET = process.env.META_RESULT_ACTION_TARGET ?? 'Cst_ABTestCV';
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN ?? '';

const TIKTOK_ACCESS_TOKEN = process.env.TIKTOK_ACCESS_TOKEN ?? '';
const TIKTOK_RESULT_METRIC = process.env.TIKTOK_RESULT_METRIC ?? 'result';
const TIKTOK_BUSINESS_ID = process.env.TIKTOK_BUSINESS_ID ?? '';
const TIKTOK_API_BASE_URL = 'https://business-api.tiktok.com/open_api/v1.3';

const GOOGLE_ADS_DEVELOPER_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? '';
const GOOGLE_ADS_CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID ?? '';
const GOOGLE_ADS_CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET ?? '';
const GOOGLE_ADS_REFRESH_TOKEN = process.env.GOOGLE_ADS_REFRESH_TOKEN ?? '';
const GOOGLE_ADS_LOGIN_CUSTOMER_ID = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID ?? '';

const LINE_ACCESS_KEY = process.env.LINE_ACCESS_KEY ?? '';
const LINE_SECRET_KEY = process.env.LINE_SECRET_KEY ?? '';
const LINE_API_BASE_URL = process.env.LINE_API_BASE_URL ?? 'https://ads.line.me';
const LINE_CAMPAIGN_REPORT_ENDPOINT =
  process.env.LINE_CAMPAIGN_REPORT_ENDPOINT ??
  '/api/v3/adaccounts/{adAccountId}/reports/online/campaign';

const MSP_LOGIN_EMAIL = process.env.MSP_LOGIN_EMAIL ?? '';
const MSP_LOGIN_PASSWORD = process.env.MSP_LOGIN_PASSWORD ?? '';
const MSP_LOGIN_URL = process.env.MSP_LOGIN_URL ?? 'https://console.a-msp.jp/login';
const MSP_CONVERSIONS_URL = process.env.MSP_CONVERSIONS_URL ?? 'https://console.a-msp.jp/conversions';
const MSP_LOGS_URL = process.env.MSP_LOGS_URL ?? 'https://console.a-msp.jp/logs/delivery';

const MSP_USER_AGENT = 'Hare-Report-Script/1.0';

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

function isZeroLike(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'string') {
    if (!value.trim()) {
      return true;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed === 0;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) && value === 0;
  }
  return false;
}

function createEmptyTotals(): MetricTotals {
  return {
    actualAdCost: 0,
    impressions: 0,
    clicks: 0,
    mspCv: 0,
    actualCv: 0,
    mCv: 0,
    platformCv: 0,
  };
}

function addTotals(target: MetricTotals, delta: Partial<MetricTotals>) {
  target.actualAdCost += delta.actualAdCost ?? 0;
  target.impressions += delta.impressions ?? 0;
  target.clicks += delta.clicks ?? 0;
  target.mspCv += delta.mspCv ?? 0;
  target.actualCv += delta.actualCv ?? 0;
  target.mCv += delta.mCv ?? 0;
  target.platformCv += delta.platformCv ?? 0;
}

function buildDailyMetricRow(date: string, totals: MetricTotals): DailyMetricRow {
  const actualAdCost = totals.actualAdCost;
  const mspCv = totals.mspCv;
  const actualCv = totals.actualCv;
  const clicks = totals.clicks;
  const impressions = totals.impressions;
  const mCv = totals.mCv;

  const cpa = mspCv > 0 ? actualAdCost / mspCv : 0;
  const cpc = clicks > 0 ? actualAdCost / clicks : 0;
  const ctr = impressions > 0 ? clicks / impressions : 0;
  const cvr = clicks > 0 ? mspCv / clicks : 0;
  const mCvr = clicks > 0 ? mCv / clicks : 0;
  const mCpa = mCv > 0 ? actualAdCost / mCv : 0;
  const cpm = impressions > 0 ? (actualAdCost / impressions) * 1000 : 0;

  return {
    date,
    actualAdCost,
    mspCv,
    actualCv,
    cpa,
    impressions,
    clicks,
    cpc,
    ctr,
    cvr,
    mCv,
    mCvr,
    mCpa,
    cpm,
    platformCv: totals.platformCv,
    performanceBasedFee: null,
  };
}

function buildBreakdownRow(
  id: string,
  label: string,
  totals: MetricTotals
): MetricBreakdownRow {
  return {
    id,
    label,
    actualAdCost: totals.actualAdCost,
    totalMspCv: totals.mspCv,
    totalActualCv: totals.actualCv,
  };
}

function buildPlatformDetailedMetrics(
  platformId: string,
  platformLabel: string,
  totals: MetricTotals
): PlatformDetailedMetrics {
  const actualAdCost = totals.actualAdCost;
  const actualCv = totals.actualCv;
  const totalClicks = totals.clicks;
  const totalImpressions = totals.impressions;
  const mCv = totals.mCv;

  const actualCpa = actualCv > 0 ? actualAdCost / actualCv : 0;
  const cvr = totalClicks > 0 ? actualCv / totalClicks : 0;
  const cpc = totalClicks > 0 ? actualAdCost / totalClicks : 0;
  const mCvr = totalClicks > 0 ? mCv / totalClicks : 0;
  const mCpa = mCv > 0 ? actualAdCost / mCv : 0;

  return {
    platformId,
    platformLabel,
    actualAdCost,
    actualCv,
    actualCpa,
    cvr,
    cpc,
    mCv,
    mCvr,
    mCpa,
    totalClicks,
    totalImpressions,
  };
}

function normalizePlatformType(label: string): PlatformType | null {
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
  return null;
}

function pickSectionByCampaignName(
  campaignName: string,
  sections: SectionConfig[]
): SectionConfig | null {
  const trimmed = campaignName.trim();

  let bestSection: SectionConfig | null = null;
  let bestLength = 0;
  sections.forEach((section) => {
    section.campaignPrefixes.forEach((prefix) => {
      if (prefix && trimmed.startsWith(prefix) && prefix.length > bestLength) {
        bestSection = section;
        bestLength = prefix.length;
      }
    });
  });
  if (bestSection) {
    return bestSection;
  }

  for (const section of sections) {
    for (const keyword of section.campaignKeywords) {
      if (keyword && trimmed.includes(keyword)) {
        return section;
      }
    }
  }

  const catchAll = sections.find((section) => section.catchAllCampaign);
  return catchAll ?? null;
}

function pickSectionByMspPrefix(prefix: string, sections: SectionConfig[]): SectionConfig | null {
  const match = sections.find((section) => section.mspPrefixes.includes(prefix));
  if (match) {
    return match;
  }
  const catchAll = sections.find((section) => section.catchAllMsp);
  return catchAll ?? null;
}

function pickPlatformByLinkId(
  linkId: string | null,
  mappings: Array<{ prefix: string; platformId: string }>
): string | null {
  if (!linkId) {
    return null;
  }

  let best: { platformId: string; length: number } | null = null;
  for (const mapping of mappings) {
    if (mapping.prefix && linkId.startsWith(mapping.prefix)) {
      if (!best || mapping.prefix.length > best.length) {
        best = { platformId: mapping.platformId, length: mapping.prefix.length };
      }
    }
  }

  return best?.platformId ?? null;
}

function buildCampaignTotals(
  row: CampaignMetricRow,
  options?: { includeMcv?: boolean }
): Partial<MetricTotals> {
  const mediaCv = row.mediaCv;
  const resolvedMediaCv = mediaCv ?? 0;
  const includeMcv = options?.includeMcv ?? true;
  return {
    actualAdCost: row.spend,
    impressions: row.impressions,
    clicks: row.clicks,
    actualCv: resolvedMediaCv,
    mCv: includeMcv ? (mediaCv ?? row.clicks) : 0,
    platformCv: resolvedMediaCv,
  };
}

function readJsonResponse(response: Response, label: string): Promise<unknown> {
  return response.text().then((text) => {
    if (!text) return {};
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new Error(`${label} API returned non-JSON response (status ${response.status}).`);
    }
  });
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

type MetaActionEntry = { action_type?: string; action_target_id?: string; value?: string | number };
type MetaResultValueEntry = { value?: string | number };
type MetaResultEntry = { indicator?: string; values?: MetaResultValueEntry[] };

type MetaInsightRow = {
  campaign_id?: string;
  campaign_name?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  conversions?: MetaActionEntry[];
  results?: MetaResultEntry[] | string | number | null;
};

function extractResultActionType(results: MetaInsightRow['results']): string | null {
  if (!results) {
    return null;
  }
  if (typeof results === 'string') {
    return results;
  }
  if (typeof results === 'number') {
    return null;
  }
  if (Array.isArray(results)) {
    const firstIndicator = results.find((entry) => entry && typeof entry.indicator === 'string');
    return firstIndicator?.indicator ?? null;
  }
  return null;
}

function extractResultValue(results: MetaInsightRow['results']): number | null {
  if (!results) {
    return null;
  }
  if (typeof results === 'number') {
    return results;
  }
  if (typeof results === 'string') {
    const parsed = Number(results);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (Array.isArray(results)) {
    for (const entry of results) {
      if (!entry?.values?.length) {
        continue;
      }
      const rawValue = entry.values[0]?.value;
      const numeric = rawValue !== undefined ? Number(rawValue) : Number.NaN;
      if (Number.isFinite(numeric)) {
        return numeric;
      }
    }
  }
  return null;
}

function matchesMetaAction(action: MetaActionEntry, target: string): boolean {
  return action.action_type === target || action.action_target_id === target;
}

function findMetaActionValue(actions: MetaActionEntry[] | undefined, target: string): number | null {
  if (!actions?.length) {
    return null;
  }
  const matched = actions.find((action) => action && matchesMetaAction(action, target));
  if (!matched) {
    return null;
  }
  return toNullableNumber(matched.value);
}

function resolveMetaResultValue(row: MetaInsightRow): number | null {
  const conversions = row.conversions;

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

async function fetchMetaCampaignInsights(
  accountId: string,
  targetDate: string
): Promise<CampaignMetricRow[]> {
  if (!META_ACCESS_TOKEN) {
    return [];
  }

  const normalizedAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
  const params = new URLSearchParams({
    access_token: META_ACCESS_TOKEN,
    level: 'campaign',
    fields: 'campaign_id,campaign_name,spend,impressions,clicks,results,conversions',
    time_range: JSON.stringify({ since: targetDate, until: targetDate }),
    time_increment: '1',
    limit: '500',
  });
  let nextUrl: string | null = `https://graph.facebook.com/v19.0/${normalizedAccountId}/insights?${params.toString()}`;
  const rows: CampaignMetricRow[] = [];

  while (nextUrl) {
    const response: Response = await fetch(nextUrl, { cache: 'no-store' });
    const payload = await readJsonResponse(response, 'Meta');
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
      const impressions = toNumber(row.impressions);
      const clicks = toNumber(row.clicks);
      const mediaCv = resolveMetaResultValue(row);
      rows.push({
        platform: 'meta',
        campaignId: row.campaign_id ?? '',
        campaignName: row.campaign_name ?? '(名前未設定)',
        spend,
        impressions,
        clicks,
        mediaCv,
      });
    });

    const nextValue =
      typeof payload === 'object' && payload && 'paging' in payload
        ? (payload as { paging?: { next?: string } }).paging?.next
        : null;
    nextUrl = nextValue ?? null;
  }

  return rows;
}

type TikTokReportRow = {
  dimensions?: Record<string, string>;
  metrics?: Record<string, string>;
};

async function fetchTikTokCampaignNames(
  advertiserId: string,
  campaignIds: string[]
): Promise<Record<string, string>> {
  if (campaignIds.length === 0) {
    return {};
  }

  const nameMap: Record<string, string> = {};
  const headers = buildTikTokHeaders();
  const chunks = chunkList(campaignIds, 100);

  for (const chunk of chunks) {
    const params = new URLSearchParams({
      advertiser_id: advertiserId,
      page_size: String(chunk.length),
      filtering: JSON.stringify({ campaign_ids: chunk }),
    });
    const response: Response = await fetch(
      `${TIKTOK_API_BASE_URL}/campaign/get/?${params.toString()}`,
      { headers, cache: 'no-store' }
    );
    const payload = await readJsonResponse(response, 'TikTok');
    const payloadObject = typeof payload === 'object' && payload ? (payload as Record<string, unknown>) : null;
    if (!response.ok || (payloadObject && payloadObject.code)) {
      continue;
    }

    const list =
      payloadObject &&
      typeof payloadObject.data === 'object' &&
      payloadObject.data &&
      Array.isArray((payloadObject.data as { list?: unknown }).list)
        ? (payloadObject.data as { list: Array<{ campaign_id?: string; campaign_name?: string }> }).list
        : [];
    list.forEach((item: { campaign_id?: string; campaign_name?: string }) => {
      if (item?.campaign_id) {
        nameMap[item.campaign_id] = item.campaign_name ?? '';
      }
    });
  }

  return nameMap;
}

async function fetchTikTokCampaignInsights(
  advertiserId: string,
  targetDate: string
): Promise<CampaignMetricRow[]> {
  if (!TIKTOK_ACCESS_TOKEN) {
    return [];
  }

  const rows: CampaignMetricRow[] = [];
  const campaignIds: string[] = [];
  let page = 1;
  let totalPages = 1;
  const pageSize = 100;

  while (page <= totalPages) {
    const params = new URLSearchParams({
      advertiser_id: advertiserId,
      service_type: 'AUCTION',
      report_type: 'BASIC',
      data_level: 'AUCTION_CAMPAIGN',
      dimensions: JSON.stringify(['campaign_id']),
      metrics: JSON.stringify(['spend', 'impressions', 'clicks', TIKTOK_RESULT_METRIC]),
      start_date: targetDate,
      end_date: targetDate,
      page: String(page),
      page_size: String(pageSize),
      order_field: 'spend',
      order_type: 'DESC',
    });
    const response: Response = await fetch(
      `${TIKTOK_API_BASE_URL}/report/integrated/get/?${params.toString()}`,
      { headers: buildTikTokHeaders(), cache: 'no-store' }
    );

    const payload = await readJsonResponse(response, 'TikTok');
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
    if (!list.length) {
      break;
    }
    list.forEach((row) => {
      const campaignId = row.dimensions?.campaign_id ?? '';
      const spendCandidate =
        row.metrics?.spend ?? (row.metrics as Record<string, unknown> | undefined)?.spend;
      const statCostCandidate =
        row.metrics?.stat_cost ??
        (row.metrics as Record<string, unknown> | undefined)?.stat_cost ??
        (row.metrics as Record<string, unknown> | undefined)?.statCost;
      const spendRaw =
        isZeroLike(spendCandidate) && !isZeroLike(statCostCandidate) ? statCostCandidate : spendCandidate;
      const spend = toNumber(spendRaw);
      const impressions = toNumber(row.metrics?.impressions);
      const clicks = toNumber(row.metrics?.clicks);
      const mediaCvValue =
        row.metrics?.[TIKTOK_RESULT_METRIC] ?? row.metrics?.result ?? row.metrics?.results;
      const mediaCv = mediaCvValue === undefined ? null : toNullableNumber(mediaCvValue);
      if (campaignId) {
        campaignIds.push(campaignId);
      }
      rows.push({
        platform: 'tiktok',
        campaignId,
        campaignName: row.dimensions?.campaign_name ?? '',
        spend,
        impressions,
        clicks,
        mediaCv,
      });
    });

    const totalNumber =
      payloadObject &&
      typeof payloadObject.data === 'object' &&
      payloadObject.data &&
      typeof (payloadObject.data as { page_info?: { total_number?: number } }).page_info === 'object'
        ? ((payloadObject.data as { page_info?: { total_number?: number } }).page_info?.total_number ?? null)
        : null;
    totalPages = totalNumber ? Math.max(1, Math.ceil(Number(totalNumber) / pageSize)) : totalPages;
    page += 1;
  }

  if (rows.length > 0) {
    const uniqueCampaignIds = Array.from(new Set(campaignIds.filter(Boolean)));
    const nameMap = await fetchTikTokCampaignNames(advertiserId, uniqueCampaignIds);
    rows.forEach((row) => {
      if (!row.campaignName) {
        row.campaignName = nameMap[row.campaignId] || row.campaignId || '(名前未設定)';
      }
    });
  }

  return rows;
}

async function fetchGoogleCampaignInsights(
  customerId: string,
  targetDate: string
): Promise<CampaignMetricRow[]> {
  if (
    !GOOGLE_ADS_DEVELOPER_TOKEN ||
    !GOOGLE_ADS_CLIENT_ID ||
    !GOOGLE_ADS_CLIENT_SECRET ||
    !GOOGLE_ADS_REFRESH_TOKEN
  ) {
    return [];
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
      campaign.id,
      campaign.name,
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions
    FROM campaign
    WHERE segments.date = '${targetDate}'
    ORDER BY metrics.cost_micros DESC
  `;

  try {
    const rows: CampaignMetricRow[] = [];
    const response = await customer.query(query);
    for (const item of response) {
      const campaignId = item.campaign?.id ? String(item.campaign.id) : '';
      const campaignName = item.campaign?.name ?? campaignId ?? '(名前未設定)';
      const spend = toNumber(item.metrics?.cost_micros) / 1_000_000;
      const impressions = toNumber(item.metrics?.impressions);
      const clicks = toNumber(item.metrics?.clicks);
      const mediaCv = toNullableNumber(item.metrics?.conversions);
      rows.push({
        platform: 'google',
        campaignId,
        campaignName,
        spend,
        impressions,
        clicks,
        mediaCv,
      });
    }
    return rows;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Google Ads API request failed.';
    throw new Error(message);
  }
}

async function fetchLineCampaignInsights(
  accountId: string,
  targetDate: string
): Promise<CampaignMetricRow[]> {
  if (!LINE_ACCESS_KEY || !LINE_SECRET_KEY) {
    return [];
  }

  const endpoint = LINE_CAMPAIGN_REPORT_ENDPOINT.replace('{adAccountId}', accountId);
  const url = `${LINE_API_BASE_URL.replace(/\/$/, '')}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const rows: CampaignMetricRow[] = [];
  let page = 1;
  const size = 100;

  while (true) {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
      since: targetDate,
      until: targetDate,
    });
    const headers = buildLineHeaders(endpoint);
    const response: Response = await fetch(`${url}?${params.toString()}`, { headers, cache: 'no-store' });
    const payload = await readJsonResponse(response, 'LINE');
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
      const campaignInfo =
        (record.campaign as { id?: string | number; name?: string } | undefined) ??
        (record.campaignGroup as { id?: string | number; name?: string } | undefined) ??
        (record.campaign_group as { id?: string | number; name?: string } | undefined);
      const stats = record.statistics as Record<string, unknown> | undefined;
      const campaignId = campaignInfo?.id ? String(campaignInfo.id) : String((record as { campaignId?: string | number }).campaignId ?? '');
      const campaignName = campaignInfo?.name ?? String((record as { campaignName?: string }).campaignName ?? campaignId ?? '(名前未設定)');
      const spend = toNumber(stats?.cost ?? stats?.spend);
      const impressions = toNumber(stats?.impressions ?? stats?.imp);
      const clicks = toNumber(stats?.clicks ?? stats?.click);
      const rawMediaCv = stats?.cv ?? stats?.conversions ?? stats?.conversion;
      const mediaCv = rawMediaCv === undefined ? null : toNullableNumber(rawMediaCv);
      rows.push({
        platform: 'line',
        campaignId,
        campaignName,
        spend,
        impressions,
        clicks,
        mediaCv,
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

  return rows;
}

async function fetchCampaignMetricsForProject(
  project: {
    project_name: string;
    meta_account_ids: string[];
    tiktok_advertiser_ids: string[];
    google_ads_customer_ids: string[];
    line_account_ids: string[];
  },
  targetDate: string
): Promise<CampaignMetricRow[]> {
  const fetchAccountRows = async (
    ids: string[],
    fetcher: (id: string) => Promise<CampaignMetricRow[]>,
    label: string
  ) => {
    if (ids.length === 0) {
      return [];
    }
    const results = await Promise.allSettled(ids.map((id) => fetcher(id)));
    const rows: CampaignMetricRow[] = [];
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        rows.push(...result.value);
      } else {
        console.error(`[RealtimeMetrics] ${label} account fetch failed`, result.reason);
      }
    });
    return rows;
  };

  const [metaRows, tiktokRows, googleRows, lineRows] = await Promise.all([
    fetchAccountRows(project.meta_account_ids, (id) => fetchMetaCampaignInsights(id, targetDate), 'Meta'),
    fetchAccountRows(project.tiktok_advertiser_ids, (id) => fetchTikTokCampaignInsights(id, targetDate), 'TikTok'),
    fetchAccountRows(project.google_ads_customer_ids, (id) => fetchGoogleCampaignInsights(id, targetDate), 'Google'),
    fetchAccountRows(project.line_account_ids, (id) => fetchLineCampaignInsights(id, targetDate), 'LINE'),
  ]);

  return [...metaRows, ...tiktokRows, ...googleRows, ...lineRows];
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => {
      const parsed = Number(code);
      return Number.isFinite(parsed) ? String.fromCharCode(parsed) : '';
    });
}

function stripHtml(input: string): string {
  const withoutScripts = input.replace(/<script[\s\S]*?<\/script>/gi, '');
  const withoutStyles = withoutScripts.replace(/<style[\s\S]*?<\/style>/gi, '');
  const text = withoutStyles.replace(/<[^>]*>/g, ' ');
  return decodeHtmlEntities(text.replace(/\s+/g, ' ').trim());
}

function extractTableHeaders(tableHtml: string): string[] {
  const theadMatch = tableHtml.match(/<thead[\s\S]*?<\/thead>/i);
  const headerSource = theadMatch ? theadMatch[0] : tableHtml;
  const headers = headerSource.match(/<th[\s\S]*?<\/th>/gi) ?? [];
  return headers.map((cell) => stripHtml(cell));
}

function extractTableRows(tableHtml: string): string[][] {
  const tbodyMatch = tableHtml.match(/<tbody[\s\S]*?<\/tbody>/i);
  const bodySource = tbodyMatch ? tbodyMatch[0] : tableHtml;
  const rowMatches = bodySource.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
  const rows: string[][] = [];
  rowMatches.forEach((rowHtml) => {
    const cellMatches = rowHtml.match(/<td[\s\S]*?<\/td>/gi) ?? [];
    if (cellMatches.length === 0) {
      return;
    }
    rows.push(cellMatches.map((cell) => stripHtml(cell)));
  });
  return rows;
}

function extractMspPrefix(adName: string): string {
  if (adName.startsWith('【')) {
    const idx = adName.indexOf('】');
    if (idx !== -1) {
      return adName.slice(0, idx + 1);
    }
  }
  if (adName.startsWith('[')) {
    const idx = adName.indexOf(']');
    if (idx !== -1) {
      return adName.slice(0, idx + 1);
    }
  }
  return 'その他';
}

function parseMspConversions(html: string): MspConversionRow[] {
  const tables = html.match(/<table[\s\S]*?<\/table>/gi) ?? [];
  for (const tableHtml of tables) {
    const headers = extractTableHeaders(tableHtml);
    if (!headers.includes('広告名')) {
      continue;
    }
    const adNameIndex = headers.indexOf('広告名');
    const linkHeaderCandidates = ['リンクID', 'リンク Id', 'Link ID'];
    let linkIdIndex: number | null = null;
    for (const header of linkHeaderCandidates) {
      const idx = headers.indexOf(header);
      if (idx !== -1) {
        linkIdIndex = idx;
        break;
      }
    }

    const rows = extractTableRows(tableHtml);
    return rows
      .map((cells) => {
        const adName = adNameIndex !== -1 ? cells[adNameIndex] ?? '' : '';
        const linkId = linkIdIndex !== null ? cells[linkIdIndex] ?? '' : '';
        const prefix = extractMspPrefix(adName);
        return {
          adName,
          prefix,
          linkId: linkId || null,
        };
      })
      .filter((row) => row.adName);
  }
  return [];
}

function formatMspPeriod(targetDate: string): string {
  const parts = targetDate.split('-');
  if (parts.length !== 3) {
    return '';
  }
  const [year, month, day] = parts;
  const formatted = `${year}/${month}/${day}`;
  return `${formatted} - ${formatted}`;
}

function buildMspConversionsUrl(buyerId: string, targetDate: string): string {
  const params = new URLSearchParams();
  params.set('approval_status', 'allowed');
  params.append('display_columns[]', 'sad2');
  params.append('display_columns[]', 'sad');
  params.append('display_columns[]', 'referer');
  params.append('display_columns[]', 'ip');
  params.append('display_columns[]', 'user_agent');
  params.append('display_columns[]', 'cgid');
  params.append('display_columns[]', 'suid');
  params.append('display_columns[]', 'buid');
  params.append('display_columns[]', 'xuid');
  params.append('display_columns[]', 'uid');
  params.append('display_columns[]', 'approve_date');
  params.append('display_columns[]', 'cv_date');
  params.append('display_columns[]', 'click_date');
  params.set('buyer_id', buyerId);
  params.set('period', formatMspPeriod(targetDate));
  params.set('search_date', 'cv_date');
  params.set('search_column', 'query_string');
  params.set('ad_category', 'all');
  params.set('limit', '10000');
  return `${MSP_CONVERSIONS_URL}?${params.toString()}`;
}

function buildMspClickLogsUrl(buyerId: string, targetDate: string): string {
  const params = new URLSearchParams();
  params.set('destroy-during-days', '30');
  params.set('log_type', 'click');
  params.set('error_type', 'ok');
  params.set('period', formatMspPeriod(targetDate));
  params.set('search_column', 'error_msg');
  params.set('display_columns', 'all');
  params.set('limit', '10000');
  if (buyerId) {
    params.set('buyer_id', buyerId);
  }
  return `${MSP_LOGS_URL}?${params.toString()}`;
}

function extractCsrfToken(html: string): string | null {
  const match = html.match(/name="_token"[^>]*value="([^"]+)"/i);
  return match ? match[1] : null;
}

function getSetCookieHeaders(headers: Headers): string[] {
  const anyHeaders = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof anyHeaders.getSetCookie === 'function') {
    return anyHeaders.getSetCookie();
  }
  const raw = headers.get('set-cookie');
  if (!raw) {
    return [];
  }
  return raw.split(/,(?=[^;]+?=)/g);
}

class CookieJar {
  private cookies = new Map<string, string>();

  storeFromHeaders(headers: Headers) {
    const setCookies = getSetCookieHeaders(headers);
    setCookies.forEach((cookie) => {
      const [pair] = cookie.split(';');
      if (!pair) return;
      const [name, value] = pair.split('=');
      if (!name) return;
      this.cookies.set(name.trim(), (value ?? '').trim());
    });
  }

  toHeader(): string {
    return Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }
}

async function fetchMspRows(
  buyerIds: string[],
  targetDate: string,
  mode: 'conversion' | 'click'
): Promise<MspConversionRow[]> {
  if (!MSP_LOGIN_EMAIL || !MSP_LOGIN_PASSWORD || buyerIds.length === 0) {
    return [];
  }

  const jar = new CookieJar();
  const baseHeaders = {
    'User-Agent': MSP_USER_AGENT,
  };

  const loginPage = await fetch(MSP_LOGIN_URL, { headers: baseHeaders, cache: 'no-store' });
  jar.storeFromHeaders(loginPage.headers);
  const loginHtml = await loginPage.text();
  const token = extractCsrfToken(loginHtml);
  if (!token) {
    throw new Error('MSP login token not found.');
  }

  const loginPayload = new URLSearchParams({
    email: MSP_LOGIN_EMAIL,
    password: MSP_LOGIN_PASSWORD,
    _token: token,
  });
  const loginResponse = await fetch(MSP_LOGIN_URL, {
    method: 'POST',
    headers: {
      ...baseHeaders,
      Cookie: jar.toHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: loginPayload.toString(),
    redirect: 'manual',
    cache: 'no-store',
  });
  jar.storeFromHeaders(loginResponse.headers);

  if (loginResponse.status >= 300 && loginResponse.status < 400) {
    const location = loginResponse.headers.get('location');
    if (location) {
      const redirectUrl = new URL(location, MSP_LOGIN_URL).toString();
      const redirected = await fetch(redirectUrl, {
        headers: { ...baseHeaders, Cookie: jar.toHeader() },
        cache: 'no-store',
      });
      jar.storeFromHeaders(redirected.headers);
    }
  }

  const conversions: MspConversionRow[] = [];
  for (const buyerId of buyerIds) {
    if (!buyerId) {
      continue;
    }
    const url =
      mode === 'click'
        ? buildMspClickLogsUrl(buyerId, targetDate)
        : buildMspConversionsUrl(buyerId, targetDate);
    const response = await fetch(url, {
      headers: { ...baseHeaders, Cookie: jar.toHeader() },
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error(`MSP request failed for buyer ${buyerId}.`);
    }
    const html = await response.text();
    conversions.push(...parseMspConversions(html));
  }

  return conversions;
}

async function fetchMspConversions(
  buyerIds: string[],
  targetDate: string
): Promise<MspConversionRow[]> {
  return fetchMspRows(buyerIds, targetDate, 'conversion');
}

async function fetchMspClickLogs(
  buyerIds: string[],
  targetDate: string
): Promise<MspConversionRow[]> {
  return fetchMspRows(buyerIds, targetDate, 'click');
}

function buildSectionConfigs(
  settingsSections: Array<{
    section_name: string;
    project_name: string;
    campaign_prefixes: string[];
    campaign_keywords: string[];
    catch_all_campaign: boolean;
    msp_ad_prefixes: string[];
    catch_all_msp: boolean;
  }>,
  projectSections: SectionOption[]
): SectionConfig[] {
  const configs: SectionConfig[] = [];
  settingsSections.forEach((section) => {
    const matched = projectSections.find(
      (item) => item.label === section.section_name || item.id === section.section_name
    );
    if (!matched) {
      return;
    }
    configs.push({
      sectionId: matched.id,
      label: matched.label,
      sectionName: section.section_name,
      campaignPrefixes: section.campaign_prefixes ?? [],
      campaignKeywords: section.campaign_keywords ?? [],
      catchAllCampaign: section.catch_all_campaign,
      mspPrefixes: section.msp_ad_prefixes ?? [],
      catchAllMsp: section.catch_all_msp,
    });
  });
  return configs;
}

function buildPlatformMappings(projectPlatforms: PlatformOption[]): {
  platformBySectionType: Map<string, PlatformMapping>;
  platformLabels: Map<string, string>;
  platformSectionMap: Map<string, string>;
} {
  const platformBySectionType = new Map<string, PlatformMapping>();
  const platformLabels = new Map<string, string>();
  const platformSectionMap = new Map<string, string>();
  projectPlatforms.forEach((platform) => {
    if (!platform.sectionId) {
      return;
    }
    const type = normalizePlatformType(platform.label);
    if (!type) {
      return;
    }
    const key = `${platform.sectionId}:${type}`;
    if (!platformBySectionType.has(key)) {
      platformBySectionType.set(key, {
        platformId: platform.id,
        platformLabel: platform.label,
        platformType: type,
      });
    }
    platformLabels.set(platform.id, platform.label);
    platformSectionMap.set(platform.id, platform.sectionId);
  });

  return { platformBySectionType, platformLabels, platformSectionMap };
}

function buildMspLinkMappings(
  platformSettings: Array<{
    project_name: string;
    section_name: string;
    platform: string;
    msp_link_prefixes: string[];
  }>,
  sectionConfigs: SectionConfig[],
  platformBySectionType: Map<string, PlatformMapping>
): Map<string, Array<{ prefix: string; platformId: string }>> {
  const result = new Map<string, Array<{ prefix: string; platformId: string }>>();
  platformSettings.forEach((setting) => {
    const section = sectionConfigs.find(
      (config) =>
        config.sectionName === setting.section_name ||
        config.label === setting.section_name ||
        config.sectionId === setting.section_name
    );
    if (!section) {
      return;
    }
    const platformType = setting.platform.toLowerCase() as PlatformType;
    if (!['meta', 'tiktok', 'google', 'line'].includes(platformType)) {
      return;
    }
    const key = `${section.sectionId}:${platformType}`;
    const platform = platformBySectionType.get(key);
    if (!platform) {
      return;
    }
    const list = result.get(section.sectionId) ?? [];
    setting.msp_link_prefixes.forEach((prefix) => {
      if (prefix) {
        list.push({ prefix, platformId: platform.platformId });
      }
    });
    result.set(section.sectionId, list);
  });
  return result;
}

export async function fetchRealtimeProjectSnapshot(params: {
  projectName: string;
  targetDate: string;
}): Promise<RealtimeProjectSnapshot | null> {
  const { projectName, targetDate } = params;
  const settings = await getReportSettings();
  const project = settings.projects.find((item) => item.project_name === projectName);
  if (!project) {
    return null;
  }

  const [sections, platforms] = await Promise.all([listSections(), listPlatforms()]);
  const projectSections = sections.filter((section) => section.projectName === projectName);
  const projectPlatforms = platforms.filter((platform) => projectSections.some((section) => section.id === platform.sectionId));

  const sectionConfigs = buildSectionConfigs(
    settings.sections.filter((section) => section.project_name === projectName),
    projectSections
  );
  const sectionLabels = new Map(sectionConfigs.map((section) => [section.sectionId, section.label]));
  const { platformBySectionType, platformLabels, platformSectionMap } = buildPlatformMappings(projectPlatforms);
  const mspLinkMappings = buildMspLinkMappings(
    settings.platform_settings.filter((ps) => ps.project_name === projectName),
    sectionConfigs,
    platformBySectionType
  );

  const sectionTotals = new Map<string, MetricTotals>();
  const platformTotals = new Map<string, MetricTotals>();
  const projectTotals = createEmptyTotals();

  const [campaignRows, conversions, clickLogs] = await Promise.all([
    fetchCampaignMetricsForProject(project, targetDate),
    project.msp_advertiser_ids.length > 0
      ? fetchMspConversions(project.msp_advertiser_ids, targetDate).catch((error) => {
          console.error('[RealtimeMetrics] MSP fetch failed', error);
          return [] as MspConversionRow[];
        })
      : Promise.resolve([] as MspConversionRow[]),
    project.msp_advertiser_ids.length > 0
      ? fetchMspClickLogs(project.msp_advertiser_ids, targetDate).catch((error) => {
          console.error('[RealtimeMetrics] MSP click fetch failed', error);
          return [] as MspConversionRow[];
        })
      : Promise.resolve([] as MspConversionRow[]),
  ]);

  campaignRows.forEach((row) => {
    const section = pickSectionByCampaignName(row.campaignName, sectionConfigs);
    if (!section) {
      return;
    }
    const platformMapping = platformBySectionType.get(`${section.sectionId}:${row.platform}`);
    const totals = buildCampaignTotals(row, { includeMcv: false });

    addTotals(projectTotals, totals);

    const sectionTotal = sectionTotals.get(section.sectionId) ?? createEmptyTotals();
    addTotals(sectionTotal, totals);
    sectionTotals.set(section.sectionId, sectionTotal);

    if (platformMapping) {
      const platformTotal = platformTotals.get(platformMapping.platformId) ?? createEmptyTotals();
      addTotals(platformTotal, totals);
      platformTotals.set(platformMapping.platformId, platformTotal);
    }
  });

  conversions.forEach((row) => {
    const section = pickSectionByMspPrefix(row.prefix, sectionConfigs);
    if (!section) {
      return;
    }
    addTotals(projectTotals, { mspCv: 1 });

    const sectionTotal = sectionTotals.get(section.sectionId) ?? createEmptyTotals();
    addTotals(sectionTotal, { mspCv: 1 });
    sectionTotals.set(section.sectionId, sectionTotal);

    const mappings = mspLinkMappings.get(section.sectionId) ?? [];
    const platformId = pickPlatformByLinkId(row.linkId, mappings);
    if (platformId) {
      const platformTotal = platformTotals.get(platformId) ?? createEmptyTotals();
      addTotals(platformTotal, { mspCv: 1 });
      platformTotals.set(platformId, platformTotal);
    }
  });

  clickLogs.forEach((row) => {
    const section = pickSectionByMspPrefix(row.prefix, sectionConfigs);
    if (!section) {
      return;
    }
    addTotals(projectTotals, { mCv: 1 });

    const sectionTotal = sectionTotals.get(section.sectionId) ?? createEmptyTotals();
    addTotals(sectionTotal, { mCv: 1 });
    sectionTotals.set(section.sectionId, sectionTotal);

    const mappings = mspLinkMappings.get(section.sectionId) ?? [];
    const platformId = pickPlatformByLinkId(row.linkId, mappings);
    if (platformId) {
      const platformTotal = platformTotals.get(platformId) ?? createEmptyTotals();
      addTotals(platformTotal, { mCv: 1 });
      platformTotals.set(platformId, platformTotal);
    }
  });

  const projectDaily = buildDailyMetricRow(targetDate, projectTotals);
  const sectionDailyMap = new Map<string, DailyMetricRow>();
  const platformDailyMap = new Map<string, DailyMetricRow>();
  const sectionBreakdownMap = new Map<string, MetricBreakdownRow>();
  const platformBreakdownMap = new Map<string, MetricBreakdownRow>();
  const platformDetailMap = new Map<string, PlatformDetailedMetrics>();

  sectionTotals.forEach((totals, sectionId) => {
    const label = sectionLabels.get(sectionId) ?? sectionId;
    sectionDailyMap.set(sectionId, buildDailyMetricRow(targetDate, totals));
    sectionBreakdownMap.set(sectionId, buildBreakdownRow(sectionId, label, totals));
  });

  platformTotals.forEach((totals, platformId) => {
    const label = platformLabels.get(platformId) ?? platformId;
    platformDailyMap.set(platformId, buildDailyMetricRow(targetDate, totals));
    platformBreakdownMap.set(platformId, buildBreakdownRow(platformId, label, totals));
    platformDetailMap.set(platformId, buildPlatformDetailedMetrics(platformId, label, totals));
  });

  return {
    date: targetDate,
    projectDaily,
    sectionDailyMap,
    platformDailyMap,
    sectionBreakdownMap,
    platformBreakdownMap,
    platformDetailMap,
    sectionLabels,
    platformLabels,
    platformSectionMap,
  };
}
