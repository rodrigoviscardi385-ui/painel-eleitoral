/**
 * gapAnalysisRoutes.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Rotas Fastify para os 3 Módulos Críticos do Gap Analysis:
 * 1. BI do Quociente Eleitoral (Métrica da Vitória)
 * 2. Auditoria Anti-Fraude de Dados Internos (Guerra contra Bots)
 * 3. Push de Alta Prioridade para a Sirene de Crise (RFC 8030 / VAPID)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { QuocienteBiService } from '../services/quocienteBiService.js';
import { AntiFraudGuardService, AuditBatchItem } from '../services/antiFraudGuardService.js';
import { PushNotificationService, PushSubscriptionData } from '../services/pushNotificationService.js';

export async function gapAnalysisRoutes(app: FastifyInstance) {
  // ─── 1. BI do Quociente Eleitoral ──────────────────────────────────────────
  app.get(
    '/api/v2/bi/quociente',
    {
      schema: {
        description: 'Retorna as métricas de vitória: Quociente Eleitoral, margem de segurança e contagem regressiva',
        tags: ['BI Eleitoral'],
      },
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      await QuocienteBiService.refreshAuditCounts();
      const metrics = await QuocienteBiService.getQuocienteMetrics();
      return reply.code(200).send({
        success: true,
        data: metrics,
        timestamp: Date.now(),
      });
    }
  );

  // ─── 2. Auditoria Anti-Fraude ──────────────────────────────────────────────
  app.get(
    '/api/v2/audit/anti-fraud',
    {
      schema: {
        description: 'Retorna o log de auditorias e quarentena de cadastros falsos',
        tags: ['Auditoria e Segurança'],
      },
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const incidents = await AntiFraudGuardService.getFraudIncidents();
      return reply.code(200).send({
        success: true,
        total: incidents.length,
        incidents,
      });
    }
  );

  app.post(
    '/api/v2/audit/anti-fraud/verify',
    {
      schema: {
        description: 'Submete um lote de cadastros para verificação estatística de fraude',
        tags: ['Auditoria e Segurança'],
      },
    },
    async (
      req: FastifyRequest<{
        Body: { deviceId: string; coordenadorNome: string; items: AuditBatchItem[] };
      }>,
      reply: FastifyReply
    ) => {
      const { deviceId, coordenadorNome, items } = req.body;
      const report = await AntiFraudGuardService.auditBatch(
        deviceId,
        coordenadorNome,
        items || []
      );
      return reply.code(200).send({
        success: true,
        report,
      });
    }
  );

  // ─── 3. Push de Alta Prioridade (Sirene de Crise) ───────────────────────────
  app.post(
    '/api/v2/crise/push-subscribe',
    {
      schema: {
        description: 'Registra subscrição WebPush para alertas críticos da Sirene de Crise',
        tags: ['Sirene de Crise'],
      },
    },
    async (req: FastifyRequest<{ Body: PushSubscriptionData }>, reply: FastifyReply) => {
      const { usuarioId, cargo, endpoint, p256dh, auth } = req.body;
      if (!endpoint || !p256dh || !auth) {
        return reply.code(400).send({ error: 'BAD_REQUEST', message: 'Credenciais WebPush incompletas.' });
      }

      await PushNotificationService.registerSubscription({
        usuarioId: usuarioId || 'anonymous',
        cargo: cargo || 'COORDENACAO',
        endpoint,
        p256dh,
        auth,
      });

      return reply.code(200).send({ success: true, message: 'Inscrição WebPush ativada com sucesso.' });
    }
  );

  app.post(
    '/api/v2/crise/push-broadcast',
    {
      schema: {
        description: 'Dispara transmissão em massa de alerta crítico para todos os dispositivos registrados',
        tags: ['Sirene de Crise'],
      },
    },
    async (
      req: FastifyRequest<{
        Body: { incidentId: string; topic: string; synthesis: string; threatLevel: 'HIGH' | 'CRITICAL' };
      }>,
      reply: FastifyReply
    ) => {
      const { incidentId, topic, synthesis, threatLevel } = req.body;
      const result = await PushNotificationService.broadcastUrgentCrisis({
        incidentId,
        topic,
        synthesis,
        threatLevel: threatLevel || 'CRITICAL',
        actionUrl: `/warroom?incident=${incidentId}`,
      });

      return reply.code(200).send({ success: true, broadcast: result });
    }
  );
}
