/**
 * h3Analytics.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Rotas Fastify para Inteligência Geoespacial e Mapas de Calor de Sentimento H3.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { H3AnalyticsService } from '../services/h3AnalyticsService.js';

export async function h3AnalyticsRoutes(app: FastifyInstance) {
  // 1. Mapa de Calor Hexagonal com RoV e Sentimento
  app.get(
    '/api/v2/mapas/h3-heatmap',
    {
      schema: {
        description: 'Retorna a malha hexagonal H3 Resolução 8 com índices de risco e RoV',
        tags: ['Inteligência Geoespacial'],
      },
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const data = await H3AnalyticsService.getHexAnalytics();
      return reply.code(200).send({
        success: true,
        hexagons: data,
        total: data.length,
        timestamp: Date.now(),
      });
    }
  );

  // 2. Re-semeadura ou recálculo de índices territoriais
  app.post(
    '/api/v2/mapas/h3-seed',
    {
      schema: {
        description: 'Força o recálculo e seed de hexágonos territoriais para o War Room',
        tags: ['Inteligência Geoespacial'],
      },
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const seeded = await H3AnalyticsService.seedDefaultTerritories();
      return reply.code(200).send({
        success: true,
        seededCount: seeded.length,
        hexagons: seeded,
      });
    }
  );
}
