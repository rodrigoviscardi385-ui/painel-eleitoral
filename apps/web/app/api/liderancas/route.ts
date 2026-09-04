import { NextResponse } from 'next/server';
import { db, schema } from '../../../lib/db';
import { desc, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const liderancas = await db
      .select({
        id: schema.usuarios.id,
        nome: schema.usuarios.nome,
        whatsapp: schema.usuarios.whatsapp,
        cargo: schema.usuarios.cargo,
        lider_acima_id: schema.usuarios.lider_acima_id,
        bairro: schema.usuarios.bairro,
        zona_eleitoral: schema.usuarios.zona_eleitoral,
        secao_eleitoral: schema.usuarios.secao_eleitoral,
        total_indicados_diretos: schema.usuarios.total_indicados_diretos,
        total_indicados_rede: schema.usuarios.total_indicados_rede,
        grupo_link_convite: schema.usuarios.grupo_link_convite,
        created_at: schema.usuarios.created_at,
      })
      .from(schema.usuarios)
      .orderBy(desc(schema.usuarios.created_at));

    return NextResponse.json({
      liderancas,
      total: liderancas.length,
    });
  } catch (error: any) {
    console.error('Erro ao listar liderancas:', error);
    return NextResponse.json({ error: 'Falha ao buscar cadastros' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      nome,
      whatsapp,
      cargo = 'APOIADOR',
      bairro = '',
      zona_eleitoral = '',
      secao_eleitoral = '',
      lider_acima_id = null,
      notas = '',
      grupo_link_convite = null,
    } = body || {};

    if (!nome || !String(nome).trim()) {
      return NextResponse.json({ error: 'O nome é obrigatório.' }, { status: 400 });
    }

    if (!whatsapp || !String(whatsapp).trim()) {
      return NextResponse.json({ error: 'O telefone / WhatsApp é obrigatório.' }, { status: 400 });
    }

    let cleanPhone = String(whatsapp).replace(/\D/g, '');
    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
      cleanPhone = `55${cleanPhone}`;
    }

    if (cleanPhone.length < 10) {
      return NextResponse.json({ error: 'Número de WhatsApp inválido (mínimo DDD + 8 dígitos).' }, { status: 400 });
    }

    const validCargos = ['ADMIN', 'GESTOR', 'LIDER', 'APOIADOR', 'VOLUNTARIO'];
    const finalCargo = validCargos.includes(cargo) ? cargo : 'APOIADOR';

    // Verificar se já existe
    const [existing] = await db
      .select()
      .from(schema.usuarios)
      .where(eq(schema.usuarios.whatsapp, cleanPhone))
      .limit(1);

    if (existing) {
      // Se já existe, atualiza os dados
      const [updated] = await db
        .update(schema.usuarios)
        .set({
          nome: String(nome).trim(),
          cargo: finalCargo,
          bairro: bairro ? String(bairro).trim() : existing.bairro,
          zona_eleitoral: zona_eleitoral ? String(zona_eleitoral).trim() : existing.zona_eleitoral,
          secao_eleitoral: secao_eleitoral ? String(secao_eleitoral).trim() : existing.secao_eleitoral,
          lider_acima_id: lider_acima_id || existing.lider_acima_id,
          notas: notas ? String(notas).trim() : existing.notas,
          updated_at: new Date(),
        })
        .where(eq(schema.usuarios.id, existing.id))
        .returning();

      return NextResponse.json({
        success: true,
        message: 'Cadastro já existia e foi atualizado com sucesso.',
        usuario: updated,
      });
    }

    // Inserir novo cadastro
    const [novo] = await db
      .insert(schema.usuarios)
      .values({
        nome: String(nome).trim(),
        whatsapp: cleanPhone,
        cargo: finalCargo,
        bairro: bairro ? String(bairro).trim() : null,
        zona_eleitoral: zona_eleitoral ? String(zona_eleitoral).trim() : null,
        secao_eleitoral: secao_eleitoral ? String(secao_eleitoral).trim() : null,
        lider_acima_id: lider_acima_id || null,
        notas: notas ? String(notas).trim() : null,
        grupo_link_convite: grupo_link_convite || null,
        status_onboarding: 'COMPLETO',
        total_indicados_diretos: 0,
        total_indicados_rede: 0,
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: `${finalCargo} cadastrado com sucesso!`,
      usuario: novo,
    });
  } catch (error: any) {
    console.error('Erro ao cadastrar liderança:', error);
    return NextResponse.json(
      { error: 'Falha ao salvar cadastro', detail: error?.message || String(error) },
      { status: 500 }
    );
  }
}
