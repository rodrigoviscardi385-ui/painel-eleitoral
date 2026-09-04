import { db } from '../apps/web/lib/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Criando tabela chip_warming_config no Supabase PostgreSQL...');
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS chip_warming_config (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      instance_name TEXT NOT NULL UNIQUE DEFAULT 'campanha_2026',
      status TEXT NOT NULL DEFAULT 'PAUSADO',
      fase_atual INTEGER NOT NULL DEFAULT 1,
      dias_ativos INTEGER NOT NULL DEFAULT 0,
      msgs_enviadas_hoje INTEGER NOT NULL DEFAULT 0,
      limite_diario_atual INTEGER NOT NULL DEFAULT 10,
      health_score INTEGER NOT NULL DEFAULT 35,
      numeros_parceiros TEXT NOT NULL DEFAULT '[]',
      simular_digitacao BOOLEAN NOT NULL DEFAULT true,
      delays_gaussianos BOOLEAN NOT NULL DEFAULT true,
      ultimo_ciclo_em TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_chip_warming_instance ON chip_warming_config (instance_name);

    INSERT INTO chip_warming_config (instance_name, status, fase_atual, dias_ativos, msgs_enviadas_hoje, limite_diario_atual, health_score, numeros_parceiros, simular_digitacao, delays_gaussianos)
    VALUES ('campanha_2026', 'PAUSADO', 1, 0, 0, 10, 35, '[]', true, true)
    ON CONFLICT (instance_name) DO NOTHING;
  `);

  console.log('✅ Tabela chip_warming_config criada com sucesso!');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Erro na migração:', err);
  process.exit(1);
});
