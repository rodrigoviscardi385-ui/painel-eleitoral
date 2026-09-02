import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { setConversaStatus } from '../services/botService.js';
import { z } from 'zod';

const botConfigSchema = z.object({
  modo: z.enum(['BOT_ATIVO', 'HUMANO', 'HIBRIDO']),
  mensagem_boas_vindas: z.string().min(5).max(1000),
  menu_opcoes: z.string(), // JSON string
  mensagem_encerramento_bot: z.string().max(500),
  mensagem_transferencia: z.string().max(500),
  horario_inicio: z.string().regex(/^\d{2}:\d{2}$/),
  horario_fim: z.string().regex(/^\d{2}:\d{2}$/),
}).strip();

export async function botConfigRoutes(fastify: FastifyInstance) {
  /** GET /api/bot/config — Ler configuração atual */
  fastify.get('/api/bot/config', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const [cfg] = await db.select().from(schema.botConfig).limit(1);
      if (!cfg) {
        // Criar config padrão se não existir
        const [nova] = await db
          .insert(schema.botConfig)
          .values({})
          .returning();
        return reply.send({ config: nova });
      }
      return reply.send({ config: cfg });
    } catch (err) {
      console.error('[BotConfig] Erro ao buscar:', err);
      return reply.status(500).send({ error: 'Erro ao buscar configuração' });
    }
  });

  /** PUT /api/bot/config — Salvar configuração */
  fastify.put('/api/bot/config', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = botConfigSchema.partial().parse(request.body);
      const [existe] = await db.select({ id: schema.botConfig.id }).from(schema.botConfig).limit(1);

      let resultado;
      if (existe) {
        const [atualizado] = await db
          .update(schema.botConfig)
          .set({ ...body, updated_at: new Date() })
          .where(eq(schema.botConfig.id, existe.id))
          .returning();
        resultado = atualizado;
      } else {
        const [novo] = await db.insert(schema.botConfig).values(body as any).returning();
        resultado = novo;
      }
      return reply.send({ config: resultado, ok: true });
    } catch (err: any) {
      if (err?.name === 'ZodError') {
        return reply.status(400).send({ error: 'Dados inválidos', detalhes: err.errors });
      }
      console.error('[BotConfig] Erro ao salvar:', err);
      return reply.status(500).send({ error: 'Erro ao salvar configuração' });
    }
  });

  /** POST /api/bot/assumir/:conversaId — Operador assume atendimento */
  fastify.post(
    '/api/bot/assumir/:conversaId',
    async (request: FastifyRequest<{ Params: { conversaId: string }; Body: { atendente_nome?: string } }>, reply: FastifyReply) => {
      try {
        const { conversaId } = request.params;
        const { atendente_nome } = (request.body as any) || {};
        await setConversaStatus(conversaId, 'HUMANO', atendente_nome || 'Operador');
        return reply.send({ ok: true, modo: 'HUMANO' });
      } catch (err) {
        console.error('[BotConfig] Erro ao assumir conversa:', err);
        return reply.status(500).send({ error: 'Erro ao assumir atendimento' });
      }
    }
  );

  /** POST /api/bot/devolver/:conversaId — Devolver conversa ao bot */
  fastify.post(
    '/api/bot/devolver/:conversaId',
    async (request: FastifyRequest<{ Params: { conversaId: string } }>, reply: FastifyReply) => {
      try {
        const { conversaId } = request.params;
        await setConversaStatus(conversaId, 'BOT');
        return reply.send({ ok: true, modo: 'BOT' });
      } catch (err) {
        console.error('[BotConfig] Erro ao devolver conversa:', err);
        return reply.status(500).send({ error: 'Erro ao devolver para bot' });
      }
    }
  );

  /** GET /api/bot/status/:conversaId — Status da conversa */
  fastify.get(
    '/api/bot/status/:conversaId',
    async (request: FastifyRequest<{ Params: { conversaId: string } }>, reply: FastifyReply) => {
      try {
        const { conversaId } = request.params;
        const [status] = await db
          .select()
          .from(schema.conversaStatus)
          .where(eq(schema.conversaStatus.conversa_id, conversaId))
          .limit(1);
        return reply.send({ status: status?.modo || 'BOT', atendente: status?.atendente_nome });
      } catch (err) {
        console.error('[BotConfig] Erro ao buscar status:', err);
        return reply.status(500).send({ error: 'Erro ao buscar status' });
      }
    }
  );
}
