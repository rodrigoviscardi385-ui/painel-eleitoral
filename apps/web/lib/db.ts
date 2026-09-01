import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres.irpjyfoykknhlevmedig:030210.Gege%40@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

const client = postgres(connectionString, {
  prepare: false,
  ssl: 'require',
  max: 10,
});

export const db = drizzle(client, { schema });
export { schema };
