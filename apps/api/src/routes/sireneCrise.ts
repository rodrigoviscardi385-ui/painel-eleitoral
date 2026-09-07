/**
 * sireneCrise.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Rotas Fastify para a Sirene de Crise com IA e Resposta Imediata do War Room.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SireneCriseService } from '../services/sireneCriseService.js';

interface TriggerCrisisBody {
  topico: string;
  relatoBruto: string;
  evidenciaUrl?: string;
}

export async function sireneCriseRoutes(app: FastifyInstance) {
  // 1. Listagem de incidentes ativos da Sirene de Crise
  app.get(
    '/api/v2/crise/alertas',
    {
      schema: {
        description: 'Retorna a lista de incidentes e alertas ativos da Sirene de Crise',
        tags: ['Sirene de Crise'],
      },
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const incidents = await SireneCriseService.getActiveIncidents();
      return reply.code(200).send({
        success: true,
        total: incidents.length,
        incidents,
      });
    }
  );

  // 2. Acionamento ou simulação imediata da Sirene de Crise
  app.post(
    '/api/v2/crise/simular',
    {
      schema: {
        description: 'Aciona ou simula a Sirene de Crise gerando a Tríade Tática via IA',
        tags: ['Sirene de Crise'],
      },
    },
    async (req: FastifyRequest<{ Body: TriggerCrisisBody }>, reply: FastifyReply) => {
      const { topico, relatoBruto, evidenciaUrl } = req.body;

      if (!topico || !relatoBruto) {
        return reply.code(400).send({
          error: 'BAD_REQUEST',
          message: 'Os campos topico e relatoBruto são obrigatórios para acionar a Sirene de Crise.',
        });
      }

      const incident = await SireneCriseService.processCrisisAlert(topico, relatoBruto, evidenciaUrl);
      return reply.code(201).send({
        success: true,
        incident,
        message: 'Sirene de Crise deflagrada e Tríade Tática gerada com sucesso.',
      });
    }
  );
}
