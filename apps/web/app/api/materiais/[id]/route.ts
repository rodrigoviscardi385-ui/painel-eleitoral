import { NextResponse } from 'next/server';
import { db, schema } from '../../../../lib/db';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { titulo, descricao, tipo, url, tags, ativo, ordem } = body;

    const updateData: any = { updated_at: new Date() };
    if (titulo !== undefined) updateData.titulo = String(titulo).trim();
    if (descricao !== undefined) updateData.descricao = descricao ? String(descricao).trim() : null;
    if (tipo !== undefined) updateData.tipo = tipo;
    if (url !== undefined) updateData.url = String(url).trim();
    if (tags !== undefined) updateData.tags = Array.isArray(tags) ? JSON.stringify(tags) : String(tags);
    if (ativo !== undefined) updateData.ativo = ativo;
    if (ordem !== undefined) updateData.ordem = Number(ordem);

    const [updated] = await db
      .update(schema.materiaisOnline)
      .set(updateData)
      .where(eq(schema.materiaisOnline.id, id))
      .returning();

    return NextResponse.json({ success: true, material: updated });
  } catch (error: any) {
    console.error('Erro na rota PATCH /api/materiais/[id]:', error);
    return NextResponse.json({ error: 'Falha ao atualizar material', detalhe: error?.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.delete(schema.materiaisOnline).where(eq(schema.materiaisOnline.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro na rota DELETE /api/materiais/[id]:', error);
    return NextResponse.json({ error: 'Falha ao excluir material', detalhe: error?.message }, { status: 500 });
  }
}
