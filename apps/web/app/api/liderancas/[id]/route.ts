import { NextResponse } from 'next/server';
import { db, schema } from '../../../../lib/db';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) {
      return NextResponse.json({ success: true, usuario: { id, ...body } });
    }

    const [existing] = await db
      .select()
      .from(schema.usuarios)
      .where(eq(schema.usuarios.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    let formattedWhatsapp = body.whatsapp !== undefined ? String(body.whatsapp).replace(/\D/g, '') : existing.whatsapp;
    if (formattedWhatsapp && (formattedWhatsapp.length === 10 || formattedWhatsapp.length === 11)) {
      formattedWhatsapp = `55${formattedWhatsapp}`;
    }

    const updateData: any = {
      updated_at: new Date(),
    };

    if (body.nome !== undefined) updateData.nome = String(body.nome).trim();
    if (body.whatsapp !== undefined) updateData.whatsapp = formattedWhatsapp || existing.whatsapp;
    if (body.cargo !== undefined) {
      const validCargos = ['ADMIN', 'GESTOR', 'LIDER', 'APOIADOR', 'VOLUNTARIO'];
      if (validCargos.includes(body.cargo)) {
        updateData.cargo = body.cargo;
      }
    }
    if (body.bairro !== undefined) updateData.bairro = body.bairro;
    if (body.zona_eleitoral !== undefined) updateData.zona_eleitoral = body.zona_eleitoral;
    if (body.secao_eleitoral !== undefined) updateData.secao_eleitoral = body.secao_eleitoral;
    if (body.grupo_link_convite !== undefined) updateData.grupo_link_convite = body.grupo_link_convite;
    if (body.lider_acima_id !== undefined) updateData.lider_acima_id = body.lider_acima_id || null;

    const [updatedUser] = await db
      .update(schema.usuarios)
      .set(updateData)
      .where(eq(schema.usuarios.id, id))
      .returning();

    // Se promovido a GESTOR, chamar backend Fastify para promover a ADM em todos os grupos
    if (updateData.cargo === 'GESTOR') {
      const backendUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      fetch(`${backendUrl}/api/liderancas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cargo: 'GESTOR', whatsapp: updateData.whatsapp }),
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, usuario: updatedUser });
  } catch (error: any) {
    console.error('Erro em PUT /api/liderancas/[id]:', error);
    return NextResponse.json({ error: 'Falha ao atualizar dados do usuário', detail: error?.message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) {
      return NextResponse.json({ success: true, message: 'Registro demonstrativo removido com sucesso' });
    }

    const [existing] = await db
      .select()
      .from(schema.usuarios)
      .where(eq(schema.usuarios.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ success: true, message: 'Registro já removido' });
    }

    // 1. Desvincular itens de disparos
    await db.delete(schema.disparosItens).where(eq(schema.disparosItens.usuario_id, id)).catch(() => {});

    // 2. Re-linkar filhos
    await db
      .update(schema.usuarios)
      .set({ lider_acima_id: existing.lider_acima_id || null, updated_at: new Date() })
      .where(eq(schema.usuarios.lider_acima_id, id))
      .catch(() => {});

    // 3. Deletar usuário
    await db.delete(schema.usuarios).where(eq(schema.usuarios.id, id));

    return NextResponse.json({ success: true, message: 'Usuário excluído com sucesso' });
  } catch (error: any) {
    console.error('Erro em DELETE /api/liderancas/[id]:', error);
    return NextResponse.json({ error: 'Falha ao excluir usuário', detail: error?.message }, { status: 500 });
  }
}
