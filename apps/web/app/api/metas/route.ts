import { NextResponse } from 'next/server';
import { db, schema } from '../../../lib/db';
import { desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const metas = await db.select().from(schema.metas).orderBy(desc(schema.metas.created_at));
    return NextResponse.json({ metas });
  } catch (error: any) {
    console.error('Erro na rota GET /api/metas:', error);
    return NextResponse.json({ error: 'Falha ao buscar metas', detalhe: error?.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      titulo,
      tipo = 'GLOBAL',
      alvo_referencia,
      quantidade_meta = 100,
      meta_diaria_cadencia = 5,
      data_fim,
    } = body;

    if (!titulo) {
      return NextResponse.json({ error: 'Título da meta é obrigatório' }, { status: 400 });
    }

    const prazo = data_fim ? new Date(data_fim) : new Date(Date.now() + 45 * 24 * 60 * 60 * 1000);

    const [novaMeta] = await db
      .insert(schema.metas)
      .values({
        titulo: String(titulo).trim(),
        tipo,
        alvo_referencia: alvo_referencia ? String(alvo_referencia).trim() : null,
        quantidade_meta: Number(quantidade_meta) || 100,
        quantidade_atual: 0,
        meta_diaria_cadencia: Number(meta_diaria_cadencia) || 5,
        data_fim: prazo,
        status_semaforo: 'VERDE',
      })
      .returning();

    return NextResponse.json({ success: true, meta: novaMeta });
  } catch (error: any) {
    console.error('Erro na rota POST /api/metas:', error);
    return NextResponse.json({ error: 'Falha ao cadastrar meta', detalhe: error?.message }, { status: 500 });
  }
}
