import { NextResponse } from 'next/server';
import { db, schema } from '../../../../lib/db';
import { sql } from 'drizzle-orm';

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

    const totalLideres = parseInt(totaisResult?.total_lideres || '0', 10);
    const totalApoiadores = parseInt(totaisResult?.total_apoiadores || '0', 10);
    const totalGeral = parseInt(totaisResult?.total_geral || '0', 10);
    const cadastrosHoje = parseInt(totaisResult?.cadastros_hoje || '0', 10);

    const metaGlobalObj = metas.find((m) => m.tipo === 'GLOBAL');
    const metaGlobalQtd = metaGlobalObj?.quantidade_meta || 3500;
    const progressoPercentual = metaGlobalQtd > 0 ? totalGeral / metaGlobalQtd : 0;

    const kpis = {
      total_lideres: totalLideres,
      total_apoiadores: totalApoiadores,
      cadastros_hoje: cadastrosHoje,
      meta_global: metaGlobalQtd,
      progresso_percentual: progressoPercentual,
      dias_restantes: 45,
      cadencia_diaria_atual: cadastrosHoje,
      cadencia_diaria_meta: metaGlobalObj?.meta_diaria_cadencia || 30,
      cadencia_diaria_necessaria: Math.max(0, Math.ceil((metaGlobalQtd - totalGeral) / 45)),
      status_semaforo: metaGlobalObj?.status_semaforo || 'AMARELO',
    };

    return NextResponse.json({ kpis, metas });
  } catch (error) {
    console.error('Erro em /api/metas/kpis:', error);
    return NextResponse.json({ error: 'Falha ao buscar KPIs' }, { status: 500 });
  }
}
