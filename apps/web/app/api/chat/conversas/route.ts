import { NextResponse } from 'next/server';
import { db, schema } from '../../../../lib/db';
import { desc, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Buscar as últimas mensagens de cada conversa
    const rawConversas = await db
      .select({
        conversa_id: schema.mensagensChat.conversa_id,
        remetente_nome: schema.mensagensChat.remetente_nome,
        ultima_mensagem: schema.mensagensChat.conteudo,
        tipo: schema.mensagensChat.tipo,
        status: schema.mensagensChat.status,
        setor: schema.mensagensChat.setor,
        tags: schema.mensagensChat.tags,
        created_at: schema.mensagensChat.created_at,
      })
      .from(schema.mensagensChat)
      .orderBy(desc(schema.mensagensChat.created_at));

    // 2. Agrupar por conversa_id
    const conversasMap = new Map<string, any>();
    for (const msg of rawConversas) {
      if (!conversasMap.has(msg.conversa_id)) {
        let tagsList: string[] = [];
        try {
          tagsList = JSON.parse(msg.tags || '[]');
        } catch {
          tagsList = [];
        }

        conversasMap.set(msg.conversa_id, {
          id: msg.conversa_id,
          nome: msg.remetente_nome || msg.conversa_id,
          whatsapp: msg.conversa_id,
          ultima_mensagem: msg.ultima_mensagem,
          tipo: msg.tipo,
          status: msg.status,
          setor: msg.setor || 'GERAL',
          tags: tagsList,
          updated_at: msg.created_at,
          nao_lidas: msg.status === 'PENDENTE' || msg.status === 'ENTREGUE' ? 1 : 0,
          opt_out: false,
        });
      }
    }

    // 3. Buscar também apoiadores e líderes no banco para enriquecer a lista
    const usuariosDb = await db
      .select({
        id: schema.usuarios.id,
        nome: schema.usuarios.nome,
        whatsapp: schema.usuarios.whatsapp,
        cargo: schema.usuarios.cargo,
        bairro: schema.usuarios.bairro,
        zona_eleitoral: schema.usuarios.zona_eleitoral,
        opt_out: schema.usuarios.opt_out,
      })
      .from(schema.usuarios);

    const listaFinal = Array.from(conversasMap.values());

    for (const u of usuariosDb) {
      const cleanPhone = u.whatsapp.replace(/\D/g, '');
      const existing = listaFinal.find((c) => c.whatsapp.includes(cleanPhone) || cleanPhone.includes(c.whatsapp));
      if (existing) {
        existing.nome = u.nome;
        existing.cargo = u.cargo;
        existing.bairro = u.bairro;
        existing.zona_eleitoral = u.zona_eleitoral;
        existing.opt_out = u.opt_out;
      } else if (listaFinal.length < 25) {
        listaFinal.push({
          id: u.whatsapp,
          nome: u.nome,
          whatsapp: u.whatsapp,
          cargo: u.cargo,
          bairro: u.bairro,
          zona_eleitoral: u.zona_eleitoral,
          ultima_mensagem: 'Toque para iniciar conversa',
          tipo: 'TEXTO',
          status: 'LIDO',
          setor: 'GERAL',
          opt_out: u.opt_out,
          tags: [u.cargo],
          updated_at: new Date().toISOString(),
          nao_lidas: 0,
        });
      }
    }

    return NextResponse.json({ conversas: listaFinal });
  } catch (error: any) {
    console.error('Erro na rota /api/chat/conversas:', error);
    return NextResponse.json({ error: 'Falha ao buscar conversas', detalhe: error?.message }, { status: 500 });
  }
}
