import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

function getConnectionString(): string {
  const envUrl = process.env.DATABASE_URL || '';
  // Se a variável na Vercel estiver com a URL antiga direta (IPv6 db.xxx.supabase.co:5432), converte para o pooler IPv4
  if (!envUrl || envUrl.includes('db.irpjyfoykknhlevmedig.supabase.co') || envUrl.includes('.supabase.co:5432')) {
    return 'postgresql://postgres.irpjyfoykknhlevmedig:030210.Gege%40@aws-0-us-west-2.pooler.supabase.com:6543/postgres';
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
