/**
 * whatsapp.ts (route)
 * ─────────────────────────────────────────────────────────────────────────────
 * Rotas de status e configuração do WhatsApp — exclusivamente Meta Cloud API.
 * Baileys/wppService completamente removido.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { FastifyInstance } from 'fastify';
import { getMetaConfig } from '../services/metaCloudService.js';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq } from 'drizzle-orm';

export async function whatsappRoutes(app: FastifyInstance) {

  // ─── Status da conexão (Meta Cloud API) ────────────────────────────────────
  app.get('/api/whatsapp/status', async () => {
    const meta = await getMetaConfig();

    if (meta.phone_number_id && meta.access_token) {
      return {
        status: 'CONNECTED',
        provider: 'META_CLOUD_API',
        phoneConnected: meta.display_phone_number || meta.phone_number_id,
        nameConnected: 'WhatsApp Cloud API Oficial Meta',
        lastConnectedAt: new Date().toISOString(),
        qrCodeBase64: null,
      };
    }

    return {
      status: 'WAITING_CREDENTIALS',
      provider: 'META_CLOUD_API',
      phoneConnected: null,
      nameConnected: null,
      lastConnectedAt: null,
      qrCodeBase64: null,
      message: 'Configure as credenciais da Meta Cloud API no painel (botão WhatsApp).',
    };
  });

  // ─── Status e métricas do controle de disparos ─────────────────────────────
  app.get('/api/whatsapp/chip-warming', async () => {
    const config = await db.select().from(schema.chipWarmingConfig).limit(1).then((r) => r[0]);
    return config || {
      limite_diario_atual: 1000,
      msgs_enviadas_hoje: 0,
      ultimo_ciclo_em: null,
    };
  });

  // ─── Atualização dos parâmetros de controle de disparos ────────────────────
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
