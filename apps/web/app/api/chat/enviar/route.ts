import { NextResponse } from 'next/server';
import { db, schema } from '../../../../lib/db';

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

    // 1. Gravar imediatamente no banco de dados PostgreSQL (Supabase)
    const [novaMensagem] = await db
      .insert(schema.mensagensChat)
      .values({
        conversa_id: convId,
        de_whatsapp: 'painel_central',
        para_whatsapp: cleanPhone,
        remetente_nome: atendente_nome,
        conteudo: String(conteudo).trim(),
        tipo: tipo as any,
        direcao: 'SAIDA',
        status: 'ENVIADO',
        atendente_nome,
        setor: 'GERAL',
      })
      .returning();

    // 2. Tentar despachar para o serviço de WhatsApp Baileys (se o servidor backend estiver ativo)
    let sendSuccess = true;
    const backendUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    try {
      const apiRes = await fetch(`${backendUrl}/api/chat/enviar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          para_whatsapp: cleanPhone,
          conversa_id: convId,
          conteudo: String(conteudo).trim(),
          tipo,
          atendente_nome,
        }),
      });

      if (apiRes.ok) {
        const apiData = await apiRes.json();
        sendSuccess = apiData.success ?? true;
      }
    } catch (forwardErr) {
      console.warn('Backend Baileys offline ou inacessível no momento, mensagem persistida no banco:', forwardErr);
    }

    return NextResponse.json({
      success: sendSuccess,
      mensagem: novaMensagem,
    });
  } catch (error: any) {
    console.error('Erro na rota /api/chat/enviar:', error);
    return NextResponse.json({ error: 'Falha ao processar envio de mensagem', detalhe: error?.message }, { status: 500 });
  }
}
