import { NextResponse } from 'next/server';
import { db, schema } from '../../../../lib/db';
import { parseSpintax } from '../../../../lib/antiBan';
import { getBackendUrl } from '../../../../lib/backendUrl';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { para_whatsapp, conversa_id, conteudo, tipo = 'TEXTO', atendente_nome = 'Operador' } = body;

    if (!para_whatsapp || !conteudo) {
      return NextResponse.json({ error: 'Destinatário e conteúdo são obrigatórios' }, { status: 400 });
    }

    let cleanPhone = String(para_whatsapp).replace(/\D/g, '');
    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
      cleanPhone = `55${cleanPhone}`;
    }

    const convId = conversa_id ? String(conversa_id) : cleanPhone;
    const resolvedConteudo = parseSpintax(String(conteudo).trim());
    const backendUrl = getBackendUrl();

    // 1. Tentar despachar pelo servidor Fastify/Baileys (que faz o disparo real e persiste no banco)
    try {
      const apiRes = await fetch(`${backendUrl}/api/chat/enviar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          para_whatsapp: cleanPhone,
          conversa_id: convId,
          conteudo: resolvedConteudo,
          tipo,
          atendente_nome,
        }),
      });

      if (apiRes.ok) {
        const apiData = await apiRes.json();
        return NextResponse.json(apiData);
      }
    } catch (forwardErr) {
      console.warn('Servidor Baileys offline na porta 3001. Gravando diretamente no banco Supabase:', forwardErr);
    }

    // 2. Fallback: Se o backend Fastify estiver inacessível, grava no PostgreSQL Supabase
    const [novaMensagem] = await db
      .insert(schema.mensagensChat)
      .values({
        conversa_id: convId,
        de_whatsapp: 'painel_central',
        para_whatsapp: cleanPhone,
        remetente_nome: atendente_nome,
        conteudo: resolvedConteudo,
        tipo: tipo as any,
        direcao: 'SAIDA',
        status: 'PENDENTE',
        atendente_nome,
        setor: 'GERAL',
      })
      .returning();

    return NextResponse.json({
      success: false,
      offline: true,
      mensagem: novaMensagem,
      aviso: 'Mensagem salva no histórico. Conecte o WhatsApp do servidor para entrega instantânea no celular do eleitor.',
    });
  } catch (error: any) {
    console.error('Erro na rota /api/chat/enviar:', error);
    return NextResponse.json({ error: 'Falha ao processar envio de mensagem', detalhe: error?.message }, { status: 500 });
  }
}
