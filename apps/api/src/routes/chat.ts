import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, desc, sql } from 'drizzle-orm';
import { sendWhatsAppMessage } from '../services/wppService.js';

export async function chatRoutes(app: FastifyInstance) {
  // Lista todas as conversas ativas agrupadas por contato
  app.get('/api/chat/conversas', async () => {
    const conversas = await db
      .select({
        conversa_id: schema.mensagensChat.conversa_id,
        remetente_nome: schema.mensagensChat.remetente_nome,
        ultima_mensagem: sql<string>`(
          SELECT conteudo FROM mensagens_chat m2
          WHERE m2.conversa_id = mensagens_chat.conversa_id
          ORDER BY m2.created_at DESC LIMIT 1
        )`,
        ultimo_tipo: sql<string>`(
          SELECT tipo FROM mensagens_chat m2
          WHERE m2.conversa_id = mensagens_chat.conversa_id
          ORDER BY m2.created_at DESC LIMIT 1
        )`,
        ultima_data: sql<string>`(
          SELECT created_at FROM mensagens_chat m2
          WHERE m2.conversa_id = mensagens_chat.conversa_id
          ORDER BY m2.created_at DESC LIMIT 1
        )`,
        total_mensagens: sql<number>`count(*)`,
        modo: sql<string>`COALESCE((
          SELECT modo FROM conversa_status cs
          WHERE cs.conversa_id = mensagens_chat.conversa_id
        ), 'BOT')`,
      })
      .from(schema.mensagensChat)
      .groupBy(schema.mensagensChat.conversa_id, schema.mensagensChat.remetente_nome)
      .orderBy(desc(sql`MAX(mensagens_chat.created_at)`));

    // Busca detalhes dos usuários correspondentes
    const phoneList = conversas.map((c) => c.conversa_id);
    const users =
      phoneList.length > 0
        ? await db
            .select()
            .from(schema.usuarios)
            .where(sql`${schema.usuarios.whatsapp} IN ${phoneList}`)
        : [];

    const userMap = new Map(users.map((u) => [u.whatsapp, u]));

    const result = conversas.map((c) => {
      const user = userMap.get(c.conversa_id);
      return {
        ...c,
        nome: user?.nome || c.remetente_nome || c.conversa_id,
        whatsapp: c.conversa_id,
        cargo: user?.cargo || 'APOIADOR',
        bairro: user?.bairro || 'Não informado',
        zona: user?.zona_eleitoral || '',
        opt_out: user?.opt_out || false,
      };
    });

    return result;
  });

  // Retorna histórico completo de uma conversa específica
  app.get('/api/chat/conversas/:phone', async (request) => {
    const { phone } = request.params as any;
    const cleanPhone = phone.replace(/\D/g, '');

    const messages = await db
      .select()
      .from(schema.mensagensChat)
      .where(eq(schema.mensagensChat.conversa_id, cleanPhone))
      .orderBy(schema.mensagensChat.created_at);

    const user = await db
      .select()
      .from(schema.usuarios)
      .where(eq(schema.usuarios.whatsapp, cleanPhone))
      .limit(1)
      .then((r) => r[0]);

    const status = await db
      .select()
      .from(schema.conversaStatus)
      .where(eq(schema.conversaStatus.conversa_id, cleanPhone))
      .limit(1)
      .then((r) => r[0]);

    return {
      usuario: user || { nome: cleanPhone, whatsapp: cleanPhone, cargo: 'APOIADOR' },
      modo: status?.modo || 'BOT',
      atendente_nome: status?.atendente_nome || null,
      mensagens: messages,
    };
  });

  // Envio de mensagem pelo atendente humano
  app.post('/api/chat/enviar', async (request, reply) => {
    const { phone, conteudo, atendente_nome } = request.body as any;

    if (!phone || !conteudo) {
      return reply.status(400).send({ error: 'Telefone e conteúdo são obrigatórios.' });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const sent = await sendWhatsAppMessage(phone, conteudo);

    if (!sent) {
      return reply.status(500).send({ error: 'Falha ao enviar mensagem pelo WhatsApp.' });
    }

    // Marca conversa como atendimento HUMANO quando atendente responde
    await db
      .insert(schema.conversaStatus)
      .values({
        conversa_id: cleanPhone,
        modo: 'HUMANO',
        atendente_nome: atendente_nome || 'Operador',
      })
      .onConflictDoUpdate({
        target: schema.conversaStatus.conversa_id,
        set: {
          modo: 'HUMANO',
          atendente_nome: atendente_nome || 'Operador',
          updated_at: new Date(),
        },
      });

    return { success: true };
  });

  // Alterna modo de atendimento entre BOT e HUMANO
  app.post('/api/chat/alternar-modo', async (request, reply) => {
    const { phone, modo, atendente_nome } = request.body as any;

    if (!phone || !modo) {
      return reply.status(400).send({ error: 'Telefone e modo são obrigatórios.' });
    }

    const cleanPhone = phone.replace(/\D/g, '');

    await db
      .insert(schema.conversaStatus)
      .values({
        conversa_id: cleanPhone,
        modo: modo === 'HUMANO' ? 'HUMANO' : 'BOT',
        atendente_nome: atendente_nome || null,
      })
      .onConflictDoUpdate({
        target: schema.conversaStatus.conversa_id,
        set: {
          modo: modo === 'HUMANO' ? 'HUMANO' : 'BOT',
          atendente_nome: atendente_nome || null,
          updated_at: new Date(),
        },
      });

    return { success: true, modo };
  });
}
