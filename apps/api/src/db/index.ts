import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

function getConnectionString(): string {
  const envUrl = process.env.DATABASE_URL || '';
  if (!envUrl || envUrl.includes('db.irpjyfoykknhlevmedig.supabase.co') || envUrl.includes('.supabase.co:5432')) {
    return 'postgresql://postgres.irpjyfoykknhlevmedig:030210.Gege%40@aws-0-us-west-2.pooler.supabase.com:6543/postgres';
  }
  return envUrl;
}

const connectionString = getConnectionString();

// Configuração otimizada para PgBouncer Supabase na porta 6543 (modo Transaction)
export const queryClient = postgres(connectionString, {
  prepare: false, // Obrigatório para PgBouncer Transaction Mode
  max: 10,        // Baixo consumo de conexões para Free Tier
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: 'require',
});

export const db = drizzle(queryClient, { schema });

/**
 * Consulta recursiva em CTE para buscar a árvore genealógica de lideranças
 * Retorna cada líder com profundidade, total de indicados diretos e total na rede
 */
export async function getLeadershipHierarchy(rootLiderId?: string) {
  try {
    const filterClause = rootLiderId
      ? sql`WHERE u.id = ${rootLiderId}`
      : sql`WHERE (u.lider_acima_id IS NULL OR u.lider_acima_id = u.id OR u.lider_acima_id NOT IN (SELECT id FROM ${schema.usuarios}))`;

    const hierarchyQuery = sql`
      WITH RECURSIVE hierarquia_arvore AS (
        -- Âncora: Líderes e nós do topo
        SELECT 
          u.id,
          u.nome,
          u.whatsapp,
          u.cargo,
          u.lider_acima_id,
          u.bairro,
          u.zona_eleitoral,
          u.secao_eleitoral,
          u.grupo_whatsapp_id,
          u.grupo_link_convite,
          u.total_indicados_diretos,
          u.total_indicados_rede,
          u.created_at,
          0 AS nivel,
          ARRAY[u.id] AS caminho_arvore
        FROM ${schema.usuarios} u
        ${filterClause}

        UNION ALL

        -- Recursão: Subordinados
        SELECT 
          filho.id,
          filho.nome,
          filho.whatsapp,
          filho.cargo,
          filho.lider_acima_id,
          filho.bairro,
          filho.zona_eleitoral,
          filho.secao_eleitoral,
          filho.grupo_whatsapp_id,
          filho.grupo_link_convite,
          filho.total_indicados_diretos,
          filho.total_indicados_rede,
          filho.created_at,
          pai.nivel + 1 AS nivel,
          pai.caminho_arvore || filho.id AS caminho_arvore
        FROM ${schema.usuarios} filho
        INNER JOIN hierarquia_arvore pai ON filho.lider_acima_id = pai.id AND filho.id != pai.id
        WHERE pai.nivel < 10 AND NOT (filho.id = ANY(pai.caminho_arvore))
      )
      SELECT * FROM hierarquia_arvore ORDER BY nivel ASC, nome ASC;
    `;

    const result = await db.execute(hierarchyQuery);
    return result;
  } catch (error) {
    console.warn('Aviso: Falha ao executar CTE no banco. Retornando lista direta.', error);
    return db.select().from(schema.usuarios);
  }
}

/**
 * Recalcula os contadores de rede de todos os líderes via CTE
 */
export async function recalculateNetworkMetrics() {
  try {
    const updateQuery = sql`
      WITH RECURSIVE arvore_contagem AS (
        SELECT id, id AS lider_ancora, 0 AS depth, ARRAY[id] AS path FROM ${schema.usuarios}
        UNION ALL
        SELECT u.id, a.lider_ancora, a.depth + 1, a.path || u.id
        FROM ${schema.usuarios} u
        JOIN arvore_contagem a ON u.lider_acima_id = a.id
        WHERE a.depth < 10 AND NOT (u.id = ANY(a.path))
      ),
      metricas_calculadas AS (
        SELECT 
          lider_ancora AS usuario_id,
          COUNT(*) - 1 AS total_rede,
          (SELECT COUNT(*) FROM ${schema.usuarios} WHERE lider_acima_id = arvore_contagem.lider_ancora) AS total_direto
        FROM arvore_contagem
        GROUP BY lider_ancora
      )
      UPDATE ${schema.usuarios} u
      SET 
        total_indicados_diretos = m.total_direto,
        total_indicados_rede = m.total_rede,
        updated_at = NOW()
      FROM metricas_calculadas m
      WHERE u.id = m.usuario_id;
    `;

    await db.execute(updateQuery);
    return { success: true };
  } catch (error) {
    console.warn('Erro ao recalcular métricas de rede:', error);
    return { success: false, error };
  }
}
