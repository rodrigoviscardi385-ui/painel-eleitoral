/**
 * whatsapp.ts (route)
 * ─────────────────────────────────────────────────────────────────────────────
 * Rotas de status e controle do WhatsApp com suporte a Baileys Anti-Ban (QR Code)
 * e fallback para Meta Cloud API Oficial.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { FastifyInstance } from 'fastify';
import { getWhatsAppStatus, initWhatsApp, disconnectWhatsApp } from '../services/wppService.js';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq } from 'drizzle-orm';

export async function whatsappRoutes(app: FastifyInstance) {

  // ─── 1. Status Geral da Conexão (Baileys com Fallback Meta) ─────────────────
  app.get('/api/whatsapp/status', async () => {
    return await getWhatsAppStatus();
  });

  // ─── 2. Solicitar Nova Conexão / Gerar QR Code Baileys ──────────────────────
  app.post('/api/whatsapp/connect', async () => {
    // Inicia processo de pareamento do Baileys
    initWhatsApp().catch((err) => console.error('[WhatsApp Connect Error]', err));
    return {
      message: 'Inicializando pareamento seguro Baileys. Aguarde a geração do QR Code...',
      status: 'INITIALIZING',
    };
  });

  // ─── 3. Desconectar Sessão Baileys / Trocar Chip ───────────────────────────
  app.post('/api/whatsapp/disconnect', async () => {
    await disconnectWhatsApp();
    return {
      message: 'Sessão do WhatsApp desconectada com sucesso. Pasta de credenciais limpa.',
      status: 'DISCONNECTED',
    };
  });

  // ─── 4. Link Oficial de Inbound wa.me para Divulgação Segura ────────────────
  app.get('/api/whatsapp/inbound-link', async () => {
    const status = await getWhatsAppStatus();
    const phone = status.phoneConnected || '5513999999999';
    const text = encodeURIComponent('Olá Gustavo Reis, sou de Santos e quero conhecer suas propostas para a cidade!');
    const link = `https://wa.me/${phone}?text=${text}`;

    return {
      phone,
      link,
      isWarmedUp: status.isWarmedUp,
      instructions: 'Divulgue este link no Instagram, santinhos digitais e bio das redes para que o eleitor envie mensagem primeiro (0% risco de ban).',
    };
  });

  // ─── 5. Status e Métricas do Controle de Disparos / Aquecimento ────────────
  app.get('/api/whatsapp/chip-warming', async () => {
    const config = await db.select().from(schema.chipWarmingConfig).limit(1).then((r) => r[0]);
    return config || {
      limite_diario_atual: 1000,
      msgs_enviadas_hoje: 0,
      ultimo_ciclo_em: null,
    };
  });

  // ─── 6. Atualização dos Parâmetros de Disparos ─────────────────────────────
  app.post('/api/whatsapp/chip-warming/update', async (request, reply) => {
    const body = request.body as any;
    const existing = await db.select().from(schema.chipWarmingConfig).limit(1).then((r) => r[0]);

    if (!existing) {
      return reply.status(404).send({ error: 'Configuração de disparos não encontrada.' });
    }

    await db
      .update(schema.chipWarmingConfig)
      .set({
        ...body,
        updated_at: new Date(),
      })
      .where(eq(schema.chipWarmingConfig.id, existing.id));

    const updated = await db.select().from(schema.chipWarmingConfig).limit(1).then((r) => r[0]);
    return updated;
  });
}
