import { NextResponse } from 'next/server';
import { db, schema } from '../../../lib/db';
import { asc, desc, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// GET /api/materiais
export async function GET() {
  try {
    const materiais = await db
      .select()
      .from(schema.materiaisOnline)
      .orderBy(asc(schema.materiaisOnline.ordem), desc(schema.materiaisOnline.created_at));

    return NextResponse.json({ materiais });
  } catch (error: any) {
    console.error('Erro na rota GET /api/materiais:', error);
    return NextResponse.json({ error: 'Falha ao buscar materiais', detalhe: error?.message }, { status: 500 });
  }
}

// POST /api/materiais
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { titulo, descricao, tipo = 'LINK', url, tags = [], ativo = 'SIM', ordem = 0 } = body;

    if (!titulo || !url) {
      return NextResponse.json({ error: 'Título e URL são obrigatórios' }, { status: 400 });
    }

    const tagsStr = Array.isArray(tags) ? JSON.stringify(tags) : typeof tags === 'string' ? tags : '[]';

    const [novoMaterial] = await db
      .insert(schema.materiaisOnline)
      .values({
        titulo: String(titulo).trim(),
        descricao: descricao ? String(descricao).trim() : null,
        tipo,
        url: String(url).trim(),
        tags: tagsStr,
        ativo,
        ordem: Number(ordem) || 0,
      })
      .returning();

    return NextResponse.json({ success: true, material: novoMaterial });
  } catch (error: any) {
    console.error('Erro na rota POST /api/materiais:', error);
    return NextResponse.json({ error: 'Falha ao cadastrar material', detalhe: error?.message }, { status: 500 });
  }
}
