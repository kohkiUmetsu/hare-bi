import 'server-only';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '@/db/schema';

declare global {
  // eslint-disable-next-line no-var
  var __dbClient: ReturnType<typeof postgres> | undefined;
}

const connectionString = process.env.SUPABASE_DB_URI;

if (!connectionString) {
  throw new Error('SUPABASE_DB_URI is not set.');
}

const client = global.__dbClient ?? postgres(connectionString, { max: 1 });

if (process.env.NODE_ENV !== 'production') {
  global.__dbClient = client;
}

export const db = drizzle(client, { schema });
