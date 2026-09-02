import { NextResponse } from 'next/server';
import { db, schema } from '../../../../lib/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const filtroTipo = body.filtro_tipo || 'TODOS';
    const filtroValor = body.filtro_valor;

    let countQuery = sql`SELECT COUNT(*) AS total FROM ${schema.usuarios} WHERE 1=1`;
    const isUuid = filtroValor && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(filtroValor);

    if (filtroTipo === 'ZONA' && filtroValor) {
      countQuery = sql`SELECT COUNT(*) AS total FROM ${schema.usuarios} WHERE zona_eleitoral = ${filtroValor}`;
    } else if (filtroTipo === 'BAIRRO' && filtroValor) {
      countQuery = sql`SELECT COUNT(*) AS total FROM ${schema.usuarios} WHERE bairro ILIKE ${'%' + filtroValor + '%'}`;
    } else if (filtroTipo === 'LIDER' && filtroValor) {
      if (isUuid) {
        countQuery = sql`SELECT COUNT(*) AS total FROM ${schema.usuarios} WHERE lider_acima_id = ${filtroValor}`;
      } else {
        countQuery = sql`SELECT COUNT(*) AS total FROM ${schema.usuarios} WHERE lider_acima_id IN (SELECT id FROM ${schema.usuarios} WHERE nome ILIKE ${'%' + filtroValor + '%'})`;
      }
    }

    const [result] = (await db.execute(countQuery)) as any;
    const totalAlvos = parseInt(result?.total || '0', 10);

    return NextResponse.json({
      filtro_tipo: filtroTipo,
      filtro_valor: filtroValor,
      total_destinatarios: totalAlvos,
      estimativa_tempo_minutos: Math.ceil((totalAlvos * 5) / 60),
    });
  } catch (error: any) {
    console.error('Erro na rota POST /api/disparos/preview:', error);
    return NextResponse.json({ error: 'Falha ao calcular audiência', detalhe: error?.message }, { status: 500 });
  }
}
