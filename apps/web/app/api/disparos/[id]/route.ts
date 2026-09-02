import { NextResponse } from 'next/server';
import { db, schema } from '../../../../lib/db';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [campaign] = await db
      .select()
      .from(schema.disparosCampanha)
      .where(eq(schema.disparosCampanha.id, id));

    if (!campaign) {
      return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });
    }

    const itens = await db
      .select()
      .from(schema.disparosItens)
      .where(eq(schema.disparosItens.disparo_id, id))
      .limit(100);

    return NextResponse.json({
      campaign,
      itens,
    });
  } catch (error: any) {
    console.error('Erro na rota GET /api/disparos/[id]:', error);
    return NextResponse.json({ error: 'Falha ao buscar detalhes do disparo', detalhe: error?.message }, { status: 500 });
  }
}
