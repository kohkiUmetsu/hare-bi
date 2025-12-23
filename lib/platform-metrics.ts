import { runQuery } from "./bigquery";
import { getBigQueryDataset } from "./bigquery-config";

const dataset = getBigQueryDataset();

type NumberLike = number | string | { value: unknown } | null | undefined;

function toNumber(value: NumberLike): number {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (typeof value === "object" && "value" in value) {
    return toNumber((value as { value: unknown }).value as NumberLike);
  }

  return 0;
}

type PlatformActualCvSnapshot = {
  rowCount: number;
  actualCv: number;
};

async function fetchPlatformActualCvSnapshot(
  platformId: string,
  targetDate: string
): Promise<PlatformActualCvSnapshot> {
  const query = `
    SELECT
      COUNT(*) AS rowCount,
      SUM(actual_cv) AS actualCv
    FROM \`${dataset}.platform_data\`
    WHERE aggregation_type = 'daily'
      AND platform_id = @platformId
      AND DATE(created_at) = @targetDate
  `;

  const [row] = await runQuery<Record<string, unknown>>(query, {
    platformId,
    targetDate,
  });

  return {
    rowCount: toNumber(row?.rowCount as NumberLike),
    actualCv: toNumber(row?.actualCv as NumberLike),
  };
}

export type UpdatePlatformActualCvParams = {
  platformId: string;
  sectionId: string | null;
  projectId: string | null;
  targetDate: string;
  newActualCv: number;
};

export type UpdatePlatformActualCvResult = {
  previousActualCv: number;
  newActualCv: number;
  delta: number;
};

export async function updatePlatformActualCvValue({
  platformId,
  projectId,
  sectionId,
  targetDate,
  newActualCv,
}: UpdatePlatformActualCvParams): Promise<UpdatePlatformActualCvResult> {
  const snapshot = await fetchPlatformActualCvSnapshot(platformId, targetDate);

  if (snapshot.rowCount === 0) {
    throw new Error("対象の日付のデータが見つかりませんでした。");
  }

  const clampedActualCv = Number.isFinite(newActualCv) ? newActualCv : 0;
  const previousActualCv = snapshot.actualCv;
  const delta = clampedActualCv - previousActualCv;

  if (delta === 0) {
    return { previousActualCv, newActualCv: previousActualCv, delta: 0 };
  }

  const updatePlatformQuery = `
    UPDATE \`${dataset}.platform_data\`
    SET actual_cv = @newActualCv,
        updated_at = CURRENT_TIMESTAMP()
    WHERE aggregation_type = 'daily'
      AND platform_id = @platformId
      AND DATE(created_at) = @targetDate
  `;

  await runQuery(updatePlatformQuery, {
    newActualCv: clampedActualCv,
    platformId,
    targetDate,
  });

  if (sectionId) {
    const updateSectionQuery = `
      UPDATE \`${dataset}.section_data\`
      SET actual_cv = COALESCE(actual_cv, 0) + @delta,
          updated_at = CURRENT_TIMESTAMP()
      WHERE aggregation_type = 'daily'
        AND section_id = @sectionId
        AND DATE(created_at) = @targetDate
    `;

    await runQuery(updateSectionQuery, {
      delta,
      sectionId,
      targetDate,
    });
  }

  if (projectId) {
    const updateProjectQuery = `
      UPDATE \`${dataset}.project_data\`
      SET actual_cv = COALESCE(actual_cv, 0) + @delta,
          updated_at = CURRENT_TIMESTAMP()
      WHERE aggregation_type = 'daily'
        AND project_id = @projectId
        AND DATE(created_at) = @targetDate
    `;

    await runQuery(updateProjectQuery, {
      delta,
      projectId,
      targetDate,
    });
  }

  return {
    previousActualCv,
    newActualCv: clampedActualCv,
    delta,
  };
}

