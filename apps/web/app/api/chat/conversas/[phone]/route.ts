import { NextResponse } from 'next/server';
import { db, schema } from '../../../../../lib/db';
import { eq, or, asc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const { phone } = await params;
    const cleanPhone = phone.replace(/\D/g, '');

    const mensagens = await db
      .select()
      .from(schema.mensagensChat)
      .where(
        or(
          eq(schema.mensagensChat.conversa_id, phone),
          eq(schema.mensagensChat.conversa_id, cleanPhone),
          eq(schema.mensagensChat.de_whatsapp, cleanPhone),
          eq(schema.mensagensChat.para_whatsapp, cleanPhone)
        )
      )
      .orderBy(asc(schema.mensagensChat.created_at));

    return NextResponse.json({ mensagens });
  } catch (error: any) {
    console.error('Erro na rota /api/chat/conversas/[phone]:', error);
    return NextResponse.json({ error: 'Falha ao buscar mensagens', detalhe: error?.message }, { status: 500 });
  }
}
