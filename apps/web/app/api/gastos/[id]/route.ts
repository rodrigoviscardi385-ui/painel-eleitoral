import { NextResponse } from 'next/server';
import { db, schema } from '../../../../lib/db';
import { eq } from 'drizzle-orm';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'ID do gasto não informado.' }, { status: 400 });
    }

    const body = await request.json();
    const {
      descricao,
      categoria,
      valor,
      data_gasto,
      forma_pagamento,
      fornecedor_nome,
      fornecedor_documento,
      numero_documento,
      comprovante_url,
      responsavel_nome,
      status_auditoria,
      observacoes,
    } = body || {};

    const updateData: Record<string, any> = {
      updated_at: new Date(),
    };

    if (descricao !== undefined) updateData.descricao = String(descricao).trim();
    if (categoria !== undefined) updateData.categoria = categoria;
    if (forma_pagamento !== undefined) updateData.forma_pagamento = forma_pagamento;
    if (fornecedor_nome !== undefined) updateData.fornecedor_nome = fornecedor_nome;
    if (fornecedor_documento !== undefined) updateData.fornecedor_documento = fornecedor_documento;
    if (numero_documento !== undefined) updateData.numero_documento = numero_documento;
    if (comprovante_url !== undefined) updateData.comprovante_url = comprovante_url;
    if (responsavel_nome !== undefined) updateData.responsavel_nome = responsavel_nome;
    if (status_auditoria !== undefined) updateData.status_auditoria = status_auditoria;
    if (observacoes !== undefined) updateData.observacoes = observacoes;
    if (data_gasto !== undefined) updateData.data_gasto = new Date(data_gasto);

    if (valor !== undefined) {
      let cleanValor = 0;
      if (typeof valor === 'number') {
        cleanValor = valor;
      } else {
        const sanitized = String(valor)
          .replace(/R\$\s?/g, '')
          .replace(/\./g, '')
          .replace(',', '.')
          .trim();
        cleanValor = parseFloat(sanitized) || 0;
      }
      updateData.valor = cleanValor.toFixed(2);
    }

    const [updatedGasto] = await db
      .update(schema.gastosCampanha)
      .set(updateData)
      .where(eq(schema.gastosCampanha.id, id))
      .returning();

    if (!updatedGasto) {
      return NextResponse.json({ error: 'Gasto não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Gasto atualizado com sucesso.',
      data: updatedGasto,
    });
  } catch (error: any) {
    console.error('Erro ao atualizar gasto:', error);
    return NextResponse.json(
      { error: 'Falha interna ao atualizar despesa.', detail: error?.message || String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'ID do gasto não informado.' }, { status: 400 });
    }

    const [deletedGasto] = await db
      .delete(schema.gastosCampanha)
      .where(eq(schema.gastosCampanha.id, id))
      .returning();

    if (!deletedGasto) {
      return NextResponse.json({ error: 'Gasto não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Gasto excluído com sucesso.',
      data: deletedGasto,
    });
  } catch (error: any) {
    console.error('Erro ao excluir gasto:', error);
    return NextResponse.json(
      { error: 'Falha interna ao remover despesa.', detail: error?.message || String(error) },
      { status: 500 }
    );
  }
}
