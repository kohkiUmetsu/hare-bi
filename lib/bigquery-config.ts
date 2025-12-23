const DEFAULT_DATASET = 'hare-local-project.hare_ad_data';

export function getBigQueryDataset(): string {
  return process.env.BIGQUERY_DATASET ?? DEFAULT_DATASET;
}

