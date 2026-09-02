import { NextResponse } from 'next/server';
import { db, schema } from '../../../lib/db';
import { desc, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const campanhas = await db
      .select()
      .from(schema.disparosCampanha)
      .orderBy(desc(schema.disparosCampanha.created_at))
      .limit(30);

    return NextResponse.json(campanhas);
  } catch (error: any) {
    console.error('Erro na rota GET /api/disparos:', error);
    return NextResponse.json({ error: 'Falha ao buscar histórico de disparos', detalhe: error?.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      titulo,
      mensagem_template,
      url_midia_pdf,
      filtro_tipo = 'TODOS',
      filtro_valor,
      usuario_responsavel = 'ADMIN',
    } = body;

    if (!titulo || !mensagem_template) {
      return NextResponse.json({ error: 'Título e mensagem são obrigatórios' }, { status: 400 });
    }

    const isUuid = filtro_valor && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(filtro_valor);

    // 1. Filtrar destinatários respeitando opt-out TSE
    let usersQuery = sql`SELECT id, nome, whatsapp, bairro, zona_eleitoral, secao_eleitoral FROM ${schema.usuarios} WHERE opt_out = false`;

    if (filtro_tipo === 'ZONA' && filtro_valor) {
      usersQuery = sql`SELECT id, nome, whatsapp, bairro, zona_eleitoral, secao_eleitoral FROM ${schema.usuarios} WHERE opt_out = false AND zona_eleitoral = ${filtro_valor}`;
    } else if (filtro_tipo === 'BAIRRO' && filtro_valor) {
      usersQuery = sql`SELECT id, nome, whatsapp, bairro, zona_eleitoral, secao_eleitoral FROM ${schema.usuarios} WHERE opt_out = false AND bairro ILIKE ${'%' + filtro_valor + '%'}`;
    } else if (filtro_tipo === 'LIDER' && filtro_valor) {
      if (isUuid) {
        usersQuery = sql`SELECT id, nome, whatsapp, bairro, zona_eleitoral, secao_eleitoral FROM ${schema.usuarios} WHERE opt_out = false AND lider_acima_id = ${filtro_valor}`;
      } else {
        usersQuery = sql`SELECT id, nome, whatsapp, bairro, zona_eleitoral, secao_eleitoral FROM ${schema.usuarios} WHERE opt_out = false AND lider_acima_id IN (SELECT id FROM ${schema.usuarios} WHERE nome ILIKE ${'%' + filtro_valor + '%'})`;
      }
    }

    const targetUsers = (await db.execute(usersQuery)) as any[];

    if (!targetUsers || targetUsers.length === 0) {
      return NextResponse.json({ error: 'Nenhum destinatário encontrado com os filtros selecionados.' }, { status: 400 });
    }

    // 2. Criar campanha no banco
    const [campaign] = await db
      .insert(schema.disparosCampanha)
      .values({
        titulo: String(titulo).trim(),
        mensagem_template: String(mensagem_template).trim(),
        url_midia_pdf: url_midia_pdf ? String(url_midia_pdf).trim() : null,
        filtro_tipo,
        filtro_valor: filtro_valor ? String(filtro_valor).trim() : null,
        total_alvos: targetUsers.length,
        total_enviados: 0,
        total_erros: 0,
        status: 'PENDENTE',
      })
      .returning();

    // 3. Inserir itens individuais do disparo
    const itemsToInsert = targetUsers.map((u) => ({
      disparo_id: campaign.id,
      usuario_id: u.id,
      whatsapp_destino: u.whatsapp,
      status: 'PENDENTE' as const,
    }));

    if (itemsToInsert.length > 0) {
      await db.insert(schema.disparosItens).values(itemsToInsert);
    }

    // 4. Registrar auditoria LGPD
    await db.insert(schema.logsAuditoriaLGPD).values({
      usuario_responsavel: String(usuario_responsavel),
      acao: 'DISPARO_MASSA',
      ip: request.headers.get('x-forwarded-for') || '127.0.0.1',
      detalhes: `Disparo em massa criado: ${campaign.id} | Total Alvos: ${targetUsers.length} | Filtro: ${filtro_tipo}`,
    }).catch(() => {});

    // 5. Acionar worker no Fastify (se disponível)
    const backendUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    fetch(`${backendUrl}/api/disparos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {});

    return NextResponse.json(
      {
        success: true,
        campaign,
        total_enfileirados: targetUsers.length,
        mensagem: 'Campanha enfileirada com sucesso e cadastrada na fila com intervalos anti-ban.',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Erro na rota POST /api/disparos:', error);
    return NextResponse.json({ error: 'Falha interna ao criar disparo', detalhe: error?.message }, { status: 500 });
  }
}
