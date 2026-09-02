import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { nativeWhatsAppService } from '../services/nativeWhatsAppService.js';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

export async function whatsappRoutes(fastify: FastifyInstance) {
  /**
   * Consulta status da conexão do WhatsApp
   */
  fastify.get('/api/whatsapp/status', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const status = await nativeWhatsAppService.getStatus();
      return reply.send(status);
    } catch (error) {
      return reply.status(500).send({ error: 'Falha ao buscar status do WhatsApp' });
    }
  });

  /**
   * Conectar WhatsApp / Gerar QR Code Oficial Baileys
   */
  fastify.post('/api/whatsapp/connect', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const connectionResult = await nativeWhatsAppService.initialize();
      return reply.send(connectionResult);
    } catch (error) {
      return reply.status(500).send({ error: 'Falha ao conectar instância WhatsApp' });
    }
  });

  /**
   * Desconectar WhatsApp
   */
  fastify.post('/api/whatsapp/logout', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const success = await nativeWhatsAppService.logout();
      return reply.send({ success });
    } catch (error) {
      return reply.status(500).send({ error: 'Falha ao desconectar instância WhatsApp' });
    }
  });

  /**
   * Simulador de Mensagem WhatsApp para testes rápidos na interface
   */
  fastify.post('/api/whatsapp/simulate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body: any = request.body || {};
      const from = body.whatsapp || '5511999998888';
      const text = body.mensagem || 'Olá';

      // Simula o webhook da Evolution API
      const webhookPayload = {
        event: 'messages.upsert',
        data: {
          key: {
            remoteJid: `${from}@s.whatsapp.net`,
            fromMe: false,
          },
          message: {
            conversation: text,
          },
        },
      };

      const webhookRes = await fastify.inject({
        method: 'POST',
        url: '/webhook/evolution',
        payload: webhookPayload,
      });

      return reply.send({
        simulacao: 'sucesso',
        from,
        text,
        webhook_resposta: JSON.parse(webhookRes.body || '{}'),
      });
    } catch (error) {
      return reply.status(500).send({ error: 'Falha na simulação de mensagem' });
    }
  });

  /**
   * Criação Customizada de Grupo de WhatsApp por Líder
   */
  fastify.post('/api/whatsapp/groups/create', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body: any = request.body || {};
      const { groupName, leaderNumber = '', leaderId = '' } = body;

      if (!groupName) {
        return reply.status(400).send({ error: 'Nome do grupo é obrigatório' });
      }

      const groupResult = await nativeWhatsAppService.createBaseGroup(groupName, leaderNumber);

      const groupId = groupResult?.groupId || `simulated_${Date.now()}@g.us`;
      const inviteLink = groupResult?.inviteLink || `https://chat.whatsapp.com/invite-${Date.now()}`;

      // Se informou o líder, vincula o grupo e link diretamente no registro dele no banco
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

      return reply.send({
        success: true,
        groupId,
        inviteLink,
      });
    } catch (error) {
      console.error('Erro ao criar grupo customizado:', error);
      return reply.status(500).send({ error: 'Falha ao criar grupo de WhatsApp' });
    }
  });
}
