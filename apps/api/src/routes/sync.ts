/**
 * sync.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Rotas Fastify para Sincronização de Campo Offline-First e Concorrência Distribuída.
 * Endpoint de lote de mutações com reconciliação determinística e idempotência.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SyncEngineService, ClientSyncMutation } from '../services/syncEngineService.js';
import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

interface SyncBatchBody {
  deviceId: string;
  mutations: ClientSyncMutation[];
}

export async function syncRoutes(app: FastifyInstance) {
  // 1. Ingestão e reconciliação de lote de mutações de campo
  app.post(
    '/api/v2/sync/batch',
    {
      schema: {
        description: 'Processa lote de mutações offline geradas por dispositivos em campo',
        tags: ['Sincronização Offline-First'],
      },
    },
    async (req: FastifyRequest<{ Body: SyncBatchBody }>, reply: FastifyReply) => {
      const { deviceId, mutations } = req.body;

      if (!deviceId || !Array.isArray(mutations)) {
        return reply.code(400).send({
          error: 'BAD_REQUEST',
          message: 'Parâmetros deviceId e array de mutations são obrigatórios.',
        });
      }

      const result = await SyncEngineService.processBatch(deviceId, mutations);
      return reply.code(200).send(result);
    }
  );

  // 2. Consulta de status de sincronização e relógio lógico do servidor
  app.get(
    '/api/v2/sync/status/:deviceId',
    {
      schema: {
        description: 'Retorna o relógio lógico mais recente do dispositivo e timestamp do servidor',
        tags: ['Sincronização Offline-First'],
      },
    },
    async (req: FastifyRequest<{ Params: { deviceId: string } }>, reply: FastifyReply) => {
      const { deviceId } = req.params;

      const result = await db.execute(sql`
        SELECT COALESCE(MAX(logical_clock), 0) AS max_clock, COUNT(*) AS total_mutacoes
        FROM sync_mutations_log
        WHERE device_id = ${deviceId};
      `);

      const rows = result as any[];
      const row = rows[0] as { max_clock: number; total_mutacoes: string } | undefined;

      return reply.code(200).send({
        deviceId,
        serverTimestamp: Date.now(),
        lastAcknowledgedClock: Number(row?.max_clock || 0),
        totalSynchronizedMutations: Number(row?.total_mutacoes || 0),
      });
    }
  );

  // 3. Ingestão e extração estruturada de notas de áudio/voz de campo
  app.post(
    '/api/v2/campo/audio-transcribe',
    {
      schema: {
        description: 'Converte notas de voz e relatos de rua em registros eleitorais estruturados',
        tags: ['Campo e Guerrilha'],
      },
    },
    async (req: FastifyRequest<{ Body: { text: string; audioBase64?: string } }>, reply: FastifyReply) => {
      const { text } = req.body;

      if (!text || text.trim().length === 0) {
        return reply.code(400).send({
          error: 'BAD_REQUEST',
          message: 'O campo text da transcrição do áudio é obrigatório.',
        });
      }

      const { VoiceParserService } = await import('../services/voiceParserService.js');
      const structured = await VoiceParserService.parseCanvasserNote(text);

      return reply.code(200).send({
        success: true,
        data: structured,
        timestamp: Date.now(),
      });
    }
  );
}

