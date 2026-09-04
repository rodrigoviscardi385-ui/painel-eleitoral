import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import dotenv from 'dotenv';
import path from 'path';

// Carrega variáveis se executado fora do runtime do Next.js (ex: scripts, cron, workers)
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
  dotenv.config({ path: path.resolve(process.cwd(), 'apps/web/.env.local') });
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
}

const FALLBACK_DATABASE_URL =
  'postgresql://postgres.irpjyfoykknhlevmedig:030210.Gege%40@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

function getConnectionString(): string {
  return process.env.DATABASE_URL || FALLBACK_DATABASE_URL;
}

const connectionString = getConnectionString();

const client = postgres(connectionString, {
  prepare: false,
  ssl: 'require',
  max: 5,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
export { schema };
