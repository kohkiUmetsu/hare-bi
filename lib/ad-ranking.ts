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
const LINE_AD_REPORT_ENDPOINT =
  process.env.LINE_AD_REPORT_ENDPOINT ??
  '/api/v3/adaccounts/{adAccountId}/reports/online/ad';

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
    ORDER BY metrics.cost_micros DESC
  `;

  try {
    const rows: AdRankingRow[] = [];
    // Use query() instead of queryStream() to avoid stream-chain issues in Next.js
    const response = await customer.query(query);

    for (const item of response) {
      const adId = item.ad_group_ad?.ad?.id ? String(item.ad_group_ad.ad.id) : '';
      const adName = item.ad_group_ad?.ad?.name ?? adId ?? '(名前未設定)';
      const spend = toNumber(item.metrics?.cost_micros) / 1_000_000;
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
      const stats = record.statistics as Record<string, unknown> | undefined;
      const adId = adInfo?.id ? String(adInfo.id) : String((record as { adId?: string | number }).adId ?? '');
      const adName = adInfo?.name ?? String((record as { adName?: string }).adName ?? adId ?? '(名前未設定)');
      const spend = toNumber(stats?.cost ?? stats?.spend);
      const rawMediaCv = stats?.cv ?? stats?.conversions ?? stats?.conversion;
      const mediaCv = rawMediaCv === undefined ? null : toNullableNumber(rawMediaCv);
      rows.push({
        platform: 'line',
        accountId,
        accountName,
        adId,
        adName,
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
    time_range: JSON.stringify({ since: startDate, until: endDate }),
    limit: '500',
  });
  let nextUrl: string | null = `https://graph.facebook.com/v19.0/${normalizedAccountId}/insights?${params.toString()}`;
  const rows: AdRankingRow[] = [];

  while (nextUrl) {
    const response: Response = await fetch(nextUrl, { cache: 'no-store' });
    const payload = await readJsonResponse(response, 'Meta');
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

  return rows;
}

type TikTokReportRow = {
  dimensions?: Record<string, string>;
  metrics?: Record<string, string>;
};

async function fetchTikTokAdNames(
  advertiserId: string,
  adIds: string[]
): Promise<Record<string, string>> {
  if (adIds.length === 0) {
    return {};
  }

  const headers = buildTikTokHeaders();
  const nameMap: Record<string, string> = {};

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
        ? (payloadObject.data as { list: Array<{ ad_id?: string; ad_name?: string }> }).list
        : [];
    list.forEach((item: { ad_id?: string; ad_name?: string }) => {
      if (item?.ad_id) {
        nameMap[item.ad_id] = item.ad_name ?? '';
      }
    });
  }

  return nameMap;
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
    const nameMap = await fetchTikTokAdNames(advertiserId, uniqueAdIds);
    rows.forEach((row) => {
      if (!row.adName) {
        row.adName = nameMap[row.adId] || row.adId || '(名前未設定)';
      }
    });
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
            } catch (error) {
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
            } catch (error) {
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
            } catch (error) {
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
            } catch (error) {
              // Silently skip failed accounts
              return [];
            }
          })
        )
      ).flat()
    : [];

  return [...metaRows, ...tiktokRows, ...googleRows, ...lineRows].sort((a, b) => b.spend - a.spend);
}
