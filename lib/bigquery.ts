import { BigQuery } from '@google-cloud/bigquery';

type BigQueryRow = Record<string, unknown>;

let cachedClient: BigQuery | null = null;
const location = process.env.BIGQUERY_LOCATION;

// Lazily create the BigQuery client so builds do not fail when env vars are missing.
function getClient(): BigQuery {
  if (cachedClient) {
    return cachedClient;
  }

  const projectId = process.env.BIGQUERY_PROJECT_ID;
  const clientEmail = process.env.BIGQUERY_CLIENT_EMAIL;
  const privateKey = process.env.BIGQUERY_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Missing BigQuery credentials. Set BIGQUERY_PROJECT_ID, BIGQUERY_CLIENT_EMAIL, and BIGQUERY_PRIVATE_KEY.'
    );
  }

  cachedClient = new BigQuery({
    projectId,
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
  });

  return cachedClient;
}

export async function runQuery<T = BigQueryRow>(
  query: string,
  params?: Record<string, unknown>
): Promise<T[]> {
  const client = getClient();
  const [rows] = await client.query({
    query,
    params,
    useLegacySql: false,
    location,
  });
  return rows as T[];
}
