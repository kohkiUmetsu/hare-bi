import { runQuery } from "./bigquery";
import { getBigQueryDataset } from "./bigquery-config";

const dataset = getBigQueryDataset();

export type ProjectOption = {
  id: string;
  name: string;
};

export type SectionOption = {
  id: string;
  label: string;
  projectId: string | null;
  projectName: string | null;
};

export type PlatformOption = {
  id: string;
  label: string;
  sectionId: string | null;
  sectionLabel: string | null;
  projectId: string | null;
  projectName: string | null;
};

export type MetricBreakdownRow = {
  id: string;
  label: string;
  actualAdCost: number;
  totalMspCv: number;
  totalActualCv: number;
};

export type DailyMetricRow = {
  date: string;
  actualAdCost: number | null;
  mspCv: number | null;
  actualCv: number | null;
  cpa: number | null;
  impressions: number | null;
  clicks: number | null;
  cpc: number | null;
  ctr: number | null;
  cvr: number | null;
  mCv: number | null;
  mCvr: number | null;
  mCpa: number | null;
  cpm: number | null;
  platformCv: number | null;
  performanceBasedFee: number | null;
};

export type MetricSummary = {
  totalActualAdCost: number;
  totalMspCv: number;
  totalActualCv: number;
  totalImpressions: number;
  avgMspCpa: number;
  avgActualCpa: number;
  totalClicks: number;
  avgCpc: number;
  avgCtr: number;
  avgMspCvr: number;
  avgActualCvr: number;
  totalMCv: number;
  avgMCvr: number;
  avgMCpa: number;
  avgCpm: number;
  totalPlatformCv: number;
  totalPerformanceBasedFee: number | null;
};

export async function listProjects(): Promise<ProjectOption[]> {
  const query = `
    SELECT
      id,
      COALESCE(project_name, id) AS name
    FROM \`${dataset}.project\`
    ORDER BY name
  `;

  return runQuery<ProjectOption>(query);
}

export async function listSections(): Promise<SectionOption[]> {
  const query = `
    SELECT
      s.id,
      COALESCE(s.label, s.id) AS label,
      s.project_id AS projectId,
      p.project_name AS projectName
    FROM \`${dataset}.section\` s
    LEFT JOIN \`${dataset}.project\` p
      ON p.id = s.project_id
    ORDER BY label
  `;

  return runQuery<SectionOption>(query);
}

export async function listPlatforms(): Promise<PlatformOption[]> {
  const query = `
    SELECT
      pl.id,
      COALESCE(pl.platform_label, pl.id) AS label,
      pl.section_id AS sectionId,
      s.label AS sectionLabel,
      s.project_id AS projectId,
      p.project_name AS projectName
    FROM \`${dataset}.platform\` pl
    LEFT JOIN \`${dataset}.section\` s
      ON s.id = pl.section_id
    LEFT JOIN \`${dataset}.project\` p
      ON p.id = s.project_id
    ORDER BY label
  `;

  return runQuery<PlatformOption>(query);
}

type MetricLevel = "project" | "section" | "platform";

type DailyMetricParams = {
  level: MetricLevel;
  entityId: string;
  startDate: string;
  endDate: string;
};

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isNaN(value) ? null : value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  if (typeof value === "object" && "value" in (value as Record<string, unknown>)) {
    const raw = (value as { value: unknown }).value;
    return toNumber(raw);
  }

  return null;
}

function buildPerformanceFeeExpression(level: MetricLevel) {
  if (level === "platform") {
    return "CAST(NULL AS FLOAT64)";
  }

  return "SUM(performance_based_fee)";
}

async function fetchDailyMetrics({
  entityId,
  endDate,
  level,
  startDate,
}: DailyMetricParams): Promise<DailyMetricRow[]> {
  const tableName =
    level === "project"
      ? `${dataset}.project_data`
      : level === "section"
      ? `${dataset}.section_data`
      : `${dataset}.platform_data`;

  const foreignKeyColumn =
    level === "project"
      ? "project_id"
      : level === "section"
      ? "section_id"
      : "platform_id";

  const performanceFeeExpression = buildPerformanceFeeExpression(level);

  const query = `
    SELECT
      FORMAT_DATE('%Y-%m-%d', DATE(created_at)) AS date,
      SUM(actual_ad_cost) AS actualAdCost,
      SUM(msp_cv) AS mspCv,
      SUM(actual_cv) AS actualCv,
      SAFE_DIVIDE(SUM(actual_ad_cost), NULLIF(SUM(msp_cv), 0)) AS cpa,
      SUM(impressions) AS impressions,
      SUM(clicks) AS clicks,
      SAFE_DIVIDE(SUM(actual_ad_cost), NULLIF(SUM(clicks), 0)) AS cpc,
      SAFE_DIVIDE(SUM(clicks), NULLIF(SUM(impressions), 0)) AS ctr,
      SAFE_DIVIDE(SUM(msp_cv), NULLIF(SUM(clicks), 0)) AS cvr,
      SUM(COALESCE(m_cv, clicks)) AS mCv,
      SAFE_DIVIDE(SUM(COALESCE(m_cv, clicks)), NULLIF(SUM(clicks), 0)) AS mCvr,
      SAFE_DIVIDE(SUM(actual_ad_cost), NULLIF(SUM(COALESCE(m_cv, clicks)), 0)) AS mCpa,
      SAFE_MULTIPLY(SAFE_DIVIDE(SUM(actual_ad_cost), NULLIF(SUM(impressions), 0)), 1000) AS cpm,
      SUM(platform_cv) AS platformCv,
      ${performanceFeeExpression} AS performanceBasedFee
    FROM \`${tableName}\`
    WHERE aggregation_type = 'daily'
      AND ${foreignKeyColumn} = @entityId
      AND DATE(created_at) BETWEEN @startDate AND @endDate
    GROUP BY date
    ORDER BY date
  `;

  const rows = await runQuery<Record<string, unknown>>(query, {
    entityId,
    startDate,
    endDate,
  });

  return rows.map((row) => ({
    date: String(row.date),
    actualAdCost: toNumber(row.actualAdCost),
    mspCv: toNumber(row.mspCv),
    actualCv: toNumber(row.actualCv),
    cpa: toNumber(row.cpa),
    impressions: toNumber(row.impressions),
    clicks: toNumber(row.clicks),
    cpc: toNumber(row.cpc),
    ctr: toNumber(row.ctr),
    cvr: toNumber(row.cvr),
    mCv: toNumber(row.mCv ?? row.clicks),
    mCvr: toNumber(row.mCvr),
    mCpa: toNumber(row.mCpa),
    cpm: toNumber(row.cpm),
    platformCv: toNumber(row.platformCv),
    performanceBasedFee: toNumber(row.performanceBasedFee),
  }));
}

export async function fetchProjectDailyMetrics(params: Omit<DailyMetricParams, "level">) {
  return fetchDailyMetrics({ ...params, level: "project" });
}

export async function fetchSectionDailyMetrics(params: Omit<DailyMetricParams, "level">) {
  return fetchDailyMetrics({ ...params, level: "section" });
}

export async function fetchPlatformDailyMetrics(params: Omit<DailyMetricParams, "level">) {
  return fetchDailyMetrics({ ...params, level: "platform" });
}

function mapBreakdownRows(rows: Array<Record<string, unknown>>): MetricBreakdownRow[] {
  return rows.map((row) => ({
    id: String(row.id),
    label: String(row.label ?? row.id),
    actualAdCost: toNumber(row.actualAdCost) ?? 0,
    totalMspCv: toNumber(row.totalMspCv) ?? 0,
    totalActualCv: toNumber(row.totalActualCv) ?? 0,
  }));
}

export async function fetchProjectSectionBreakdown(params: {
  projectId: string;
  startDate: string;
  endDate: string;
}): Promise<MetricBreakdownRow[]> {
  const query = `
    SELECT
      s.id AS id,
      COALESCE(s.label, s.id) AS label,
      SUM(sd.actual_ad_cost) AS actualAdCost,
      SUM(sd.msp_cv) AS totalMspCv,
      SUM(sd.actual_cv) AS totalActualCv
    FROM \`${dataset}.section_data\` sd
    LEFT JOIN \`${dataset}.section\` s
      ON s.id = sd.section_id
    WHERE s.project_id = @projectId
      AND sd.aggregation_type = 'daily'
      AND DATE(sd.created_at) BETWEEN @startDate AND @endDate
    GROUP BY id, label
    ORDER BY actualAdCost DESC
  `;

  const rows = await runQuery<Record<string, unknown>>(query, params);
  return mapBreakdownRows(rows);
}

export async function fetchSectionPlatformBreakdown(params: {
  sectionId: string;
  startDate: string;
  endDate: string;
}): Promise<MetricBreakdownRow[]> {
  const query = `
    SELECT
      p.id AS id,
      COALESCE(p.platform_label, p.id) AS label,
      SUM(pd.actual_ad_cost) AS actualAdCost,
      SUM(pd.msp_cv) AS totalMspCv,
      SUM(pd.actual_cv) AS totalActualCv
    FROM \`${dataset}.platform_data\` pd
    LEFT JOIN \`${dataset}.platform\` p
      ON p.id = pd.platform_id
    WHERE p.section_id = @sectionId
      AND pd.aggregation_type = 'daily'
      AND DATE(pd.created_at) BETWEEN @startDate AND @endDate
    GROUP BY id, label
    ORDER BY actualAdCost DESC
  `;

  const rows = await runQuery<Record<string, unknown>>(query, params);
  return mapBreakdownRows(rows);
}

export function buildMetricSummary(rows: DailyMetricRow[]): MetricSummary {
  let totalActualAdCost = 0;
  let totalMspCv = 0;
  let totalActualCv = 0;
  let totalImpressions = 0;
  let totalClicks = 0;
  let totalMCv = 0;
  let totalPlatformCv = 0;
  let totalPerformanceBasedFee = 0;
  let hasPerformanceFee = false;

  for (const row of rows) {
    if (row.actualAdCost) {
      totalActualAdCost += row.actualAdCost;
    }
    if (row.mspCv) {
      totalMspCv += row.mspCv;
    }
    if (row.actualCv) {
      totalActualCv += row.actualCv;
    }
    if (row.impressions) {
      totalImpressions += row.impressions;
    }
    if (row.clicks) {
      totalClicks += row.clicks;
    }
    if (row.mCv !== null && row.mCv !== undefined) {
      totalMCv += row.mCv;
    } else if (row.clicks) {
      totalMCv += row.clicks;
    }
    if (row.platformCv !== null && row.platformCv !== undefined) {
      totalPlatformCv += row.platformCv;
    }
    if (row.performanceBasedFee !== null && row.performanceBasedFee !== undefined) {
      hasPerformanceFee = true;
      totalPerformanceBasedFee += row.performanceBasedFee;
    }
  }

  const avgMspCpa = totalMspCv > 0 ? totalActualAdCost / totalMspCv : 0;
  const avgActualCpa = totalActualCv > 0 ? totalActualAdCost / totalActualCv : 0;
  const avgCpc = totalClicks > 0 ? totalActualAdCost / totalClicks : 0;
  const avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
  const avgMspCvr = totalClicks > 0 ? totalMspCv / totalClicks : 0;
  const avgActualCvr = totalClicks > 0 ? totalActualCv / totalClicks : 0;
  const avgMcvR = totalClicks > 0 ? totalMCv / totalClicks : 0;
  const avgMCpa = totalMCv > 0 ? totalActualAdCost / totalMCv : 0;
  const avgCpm = totalImpressions > 0 ? (totalActualAdCost / totalImpressions) * 1000 : 0;

  return {
    totalActualAdCost,
    totalMspCv,
    totalActualCv,
    totalImpressions,
    avgMspCpa,
    avgActualCpa,
    totalClicks,
    avgCpc,
    avgCtr,
    avgMspCvr,
    avgActualCvr,
    totalMCv,
    avgMCvr: avgMcvR,
    avgMCpa,
    avgCpm,
    totalPlatformCv,
    totalPerformanceBasedFee: hasPerformanceFee ? totalPerformanceBasedFee : null,
  };
}
