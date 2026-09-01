import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres.rqgbbzvygtdzrlivtwnh:Rodrigo2026@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';

const client = postgres(connectionString, {
  prepare: false,
  ssl: 'require',
  max: 10,
});

export const db = drizzle(client, { schema });
export { schema };
