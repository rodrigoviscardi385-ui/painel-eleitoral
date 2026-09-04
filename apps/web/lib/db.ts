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

function getConnectionString(): string {
  const envUrl = process.env.DATABASE_URL;
  if (!envUrl) {
    throw new Error('❌ [Web] DATABASE_URL não configurada nas variáveis de ambiente (.env.local / .env).');
  }
  return envUrl;
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
