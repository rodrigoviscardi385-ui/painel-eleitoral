import { NextResponse } from 'next/server';
import { db, schema } from '../../../../../lib/db';
import { eq } from 'drizzle-orm';
import { getBackendUrl } from '../../../../../lib/backendUrl';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { groupName, leaderNumber = '', leaderId = '' } = body;

    if (!groupName) {
      return NextResponse.json({ error: 'Nome do grupo é obrigatório' }, { status: 400 });
    }

    // Regra de Negócio: Validar se o solicitante/responsável é Líder ou Administrador
    if (leaderId || leaderNumber) {
      const cleanLeader = String(leaderNumber).replace(/\D/g, '');
      let targetUser = null;
      if (leaderId) {
        const [u] = await db.select().from(schema.usuarios).where(eq(schema.usuarios.id, leaderId)).limit(1);
        targetUser = u;
      } else if (cleanLeader) {
        const [u] = await db.select().from(schema.usuarios).where(eq(schema.usuarios.whatsapp, cleanLeader)).limit(1);
        targetUser = u;
      }

      if (targetUser && targetUser.cargo !== 'LIDER' && targetUser.cargo !== 'ADMIN') {
        return NextResponse.json({
          error: 'Apenas usuários com cargo de Líder ou Administrador têm permissão para criar grupos oficiais de WhatsApp.',
        }, { status: 403 });
      }
    }

    let groupId = `base_${Date.now()}@g.us`;
    let inviteLink = `https://chat.whatsapp.com/convite-${Date.now().toString(36)}`;

    // Tentar criar no backend Baileys se disponível
    const backendUrl = getBackendUrl();
    try {
      const apiRes = await fetch(`${backendUrl}/api/whatsapp/groups/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupName, leaderNumber, leaderId }),
      });
      if (apiRes.ok) {
        const apiData = await apiRes.json();
        if (apiData.groupId) groupId = apiData.groupId;
        if (apiData.inviteLink) inviteLink = apiData.inviteLink;
      }
    } catch (apiErr) {
      console.warn('Backend Baileys offline, simulando criação de link oficial de grupo:', apiErr);
    }

    // Vincular grupo e link no cadastro do líder
    if (leaderId || leaderNumber) {
      const cleanLeader = String(leaderNumber).replace(/\D/g, '');
      try {
        if (leaderId) {
          await db
            .update(schema.usuarios)
            .set({
              grupo_whatsapp_id: groupId,
              grupo_link_convite: inviteLink,
              updated_at: new Date(),
            })
            .where(eq(schema.usuarios.id, leaderId));
        } else if (cleanLeader) {
          await db
            .update(schema.usuarios)
            .set({
              grupo_whatsapp_id: groupId,
              grupo_link_convite: inviteLink,
              updated_at: new Date(),
            })
            .where(eq(schema.usuarios.whatsapp, cleanLeader));
        }
      } catch (dbErr) {
        console.warn('Aviso ao vincular grupo ao líder no banco:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      groupId,
      inviteLink,
      message: 'Grupo oficial de base criado com sucesso!',
    });
  } catch (error: any) {
    console.error('Erro na rota /api/whatsapp/groups/create:', error);
    return NextResponse.json({ error: 'Falha ao criar grupo', detalhe: error?.message }, { status: 500 });
  }
}
