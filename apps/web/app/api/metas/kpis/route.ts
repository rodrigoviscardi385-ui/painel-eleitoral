import { NextResponse } from 'next/server';
import { db, schema } from '../../../../lib/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [totaisResult] = (await db.execute(sql`
      SELECT 
        COUNT(*) AS total_geral,
        COUNT(CASE WHEN cargo IN ('ADMIN', 'GESTOR', 'LIDER') THEN 1 END) AS total_lideres,
        COUNT(CASE WHEN cargo = 'APOIADOR' THEN 1 END) AS total_apoiadores,
        COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) AS cadastros_hoje
      FROM ${schema.usuarios};
    `)) as any;

    const metas = await db.select().from(schema.metas);
    const [config] = await db.select().from(schema.campanhaConfig).limit(1);

    const totalLideres = parseInt(totaisResult?.total_lideres || '0', 10);
    const totalApoiadores = parseInt(totaisResult?.total_apoiadores || '0', 10);
    const totalGeral = parseInt(totaisResult?.total_geral || '0', 10);
    const cadastrosHoje = parseInt(totaisResult?.cadastros_hoje || '0', 10);

    const metaGlobalObj = metas.find((m) => m.tipo === 'GLOBAL');
    const metaGlobalQtd = config?.meta_votos_global || metaGlobalObj?.quantidade_meta || 50000;
    const cadenciaMeta = config?.meta_captacao_diaria || metaGlobalObj?.meta_diaria_cadencia || 50;

    // Calcular dias restantes até a eleição
    let diasRestantes = 45;
    if (config?.data_eleicao) {
      const targetDate = new Date(config.data_eleicao);
      if (!isNaN(targetDate.getTime())) {
        const diffMs = targetDate.getTime() - Date.now();
        diasRestantes = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      }
    }

    const progressoPercentual = metaGlobalQtd > 0 ? totalGeral / metaGlobalQtd : 0;
    const cadenciaNecessaria = Math.max(0, Math.ceil((metaGlobalQtd - totalGeral) / diasRestantes));

    let statusSemaforo: 'VERDE' | 'AMARELO' | 'VERMELHO' = 'VERDE';
    if (cadastrosHoje < cadenciaNecessaria * 0.5) {
      statusSemaforo = 'VERMELHO';
    } else if (cadastrosHoje < cadenciaNecessaria) {
      statusSemaforo = 'AMARELO';
    }

    const kpis = {
      total_lideres: totalLideres,
      total_apoiadores: totalApoiadores,
      cadastros_hoje: cadastrosHoje,
      meta_global: metaGlobalQtd,
      meta_lideres: config?.meta_lideres_global || 100,
      meta_apoiadores_por_lider: config?.meta_apoiadores_por_lider || 15,
      progresso_percentual: progressoPercentual,
      dias_restantes: diasRestantes,
      cadencia_diaria_atual: cadastrosHoje,
      cadencia_diaria_meta: cadenciaMeta,
      cadencia_diaria_necessaria: cadenciaNecessaria,
      status_semaforo: statusSemaforo,
    };

    return NextResponse.json({ kpis, metas, config });
  } catch (error: any) {
    console.error('Erro em /api/metas/kpis:', error);
    return NextResponse.json({ error: 'Falha ao buscar KPIs', detalhe: error?.message }, { status: 500 });
  }
}
