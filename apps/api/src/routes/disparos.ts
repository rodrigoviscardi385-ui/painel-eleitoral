import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, desc, sql } from 'drizzle-orm';
import { queueWorker } from '../services/queueWorker.js';
import { z } from 'zod';

const createDisparoSchema = z.object({
  titulo: z.string().min(3),
  mensagem_template: z.string().min(5),
  url_midia_pdf: z.string().url().optional().nullable(),
  filtro_tipo: z.enum(['TODOS', 'ZONA', 'BAIRRO', 'LIDER']).default('TODOS'),
  filtro_valor: z.string().optional().nullable(),
  usuario_responsavel: z.string().default('ADMIN'),
});

export async function disparosRoutes(fastify: FastifyInstance) {
  /**
   * Prévia de audiência e contagem de alvos
   */
  fastify.post('/api/disparos/preview', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body: any = request.body || {};
      const filtroTipo = body.filtro_tipo || 'TODOS';
      const filtroValor = body.filtro_valor;

      let countQuery = sql`SELECT COUNT(*) AS total FROM ${schema.usuarios} WHERE 1=1`;
      const isUuid = filtroValor && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(filtroValor);

      if (filtroTipo === 'ZONA' && filtroValor) {
        countQuery = sql`SELECT COUNT(*) AS total FROM ${schema.usuarios} WHERE zona_eleitoral = ${filtroValor}`;
      } else if (filtroTipo === 'BAIRRO' && filtroValor) {
        countQuery = sql`SELECT COUNT(*) AS total FROM ${schema.usuarios} WHERE bairro ILIKE ${'%' + filtroValor + '%'}`;
      } else if (filtroTipo === 'LIDER' && filtroValor) {
        if (isUuid) {
          countQuery = sql`SELECT COUNT(*) AS total FROM ${schema.usuarios} WHERE lider_acima_id = ${filtroValor}`;
        } else {
          countQuery = sql`SELECT COUNT(*) AS total FROM ${schema.usuarios} WHERE lider_acima_id IN (SELECT id FROM ${schema.usuarios} WHERE nome ILIKE ${'%' + filtroValor + '%'})`;
        }
      }

      const [result] = (await db.execute(countQuery)) as any;
      const totalAlvos = parseInt(result?.total || '0', 10);

      return reply.send({
        filtro_tipo: filtroTipo,
        filtro_valor: filtroValor,
        total_destinatarios: totalAlvos,
        estimativa_tempo_minutos: Math.ceil((totalAlvos * 5) / 60), // Média de 5s por envio anti-ban
      });
    } catch (error) {
      console.error('Erro na prévia de disparo:', error);
      return reply.status(500).send({ error: 'Falha ao calcular audiência' });
    }
  });

  /**
   * Criação e agendamento de campanha de disparo em massa
   */
  fastify.post('/api/disparos', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = createDisparoSchema.parse(request.body);
      const isUuid = data.filtro_valor && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.filtro_valor);

      // 1. Filtrar usuários alvos
      let usersQuery = sql`SELECT id, nome, whatsapp, bairro, zona_eleitoral, secao_eleitoral FROM ${schema.usuarios} WHERE 1=1`;

      if (data.filtro_tipo === 'ZONA' && data.filtro_valor) {
        usersQuery = sql`SELECT id, nome, whatsapp, bairro, zona_eleitoral, secao_eleitoral FROM ${schema.usuarios} WHERE zona_eleitoral = ${data.filtro_valor}`;
      } else if (data.filtro_tipo === 'BAIRRO' && data.filtro_valor) {
        usersQuery = sql`SELECT id, nome, whatsapp, bairro, zona_eleitoral, secao_eleitoral FROM ${schema.usuarios} WHERE bairro ILIKE ${'%' + data.filtro_valor + '%'}`;
      } else if (data.filtro_tipo === 'LIDER' && data.filtro_valor) {
        if (isUuid) {
          usersQuery = sql`SELECT id, nome, whatsapp, bairro, zona_eleitoral, secao_eleitoral FROM ${schema.usuarios} WHERE lider_acima_id = ${data.filtro_valor}`;
        } else {
          usersQuery = sql`SELECT id, nome, whatsapp, bairro, zona_eleitoral, secao_eleitoral FROM ${schema.usuarios} WHERE lider_acima_id IN (SELECT id FROM ${schema.usuarios} WHERE nome ILIKE ${'%' + data.filtro_valor + '%'})`;
        }
      }

      const targetUsers = (await db.execute(usersQuery)) as any[];

      if (targetUsers.length === 0) {
        return reply.status(400).send({ error: 'Nenhum destinatário encontrado com os filtros selecionados.' });
      }

      // 2. Criar campanha no banco
      const [campaign] = await db
        .insert(schema.disparosCampanha)
        .values({
          titulo: data.titulo,
          mensagem_template: data.mensagem_template,
          url_midia_pdf: data.url_midia_pdf,
          filtro_tipo: data.filtro_tipo,
          filtro_valor: data.filtro_valor,
          total_alvos: targetUsers.length,
          total_enviados: 0,
          total_erros: 0,
          status: 'PENDENTE',
        })
        .returning();

      // 3. Inserir itens individuais do disparo
      const itemsToInsert = targetUsers.map((u) => ({
        disparo_id: campaign.id,
        usuario_id: u.id,
        whatsapp_destino: u.whatsapp,
        status: 'PENDENTE' as const,
      }));

      await db.insert(schema.disparosItens).values(itemsToInsert);

      // 4. Registrar auditoria LGPD
      await db.insert(schema.logsAuditoriaLGPD).values({
        usuario_responsavel: data.usuario_responsavel,
        acao: 'DISPARO_MASSA',
        ip: request.ip,
        detalhes: `Disparo em massa criado: ${campaign.id} | Total Alvos: ${targetUsers.length} | Filtro: ${data.filtro_tipo}`,
      });

      // 5. Iniciar Worker em background de forma assíncrona (não bloqueia resposta HTTP)
      setImmediate(() => {
        queueWorker.processCampaign(campaign.id);
      });

      return reply.status(201).send({
        success: true,
        campaign,
        total_enfileirados: targetUsers.length,
        mensagem: 'Campanha enfileirada e processamento iniciado com intervalos anti-ban.',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Dados inválidos', details: error.errors });
      }
      console.error('Erro ao criar disparo:', error);
      return reply.status(500).send({ error: 'Falha interna ao criar disparo' });
    }
  });

  /**
   * Listagem de campanhas com contadores em tempo real
   */
  fastify.get('/api/disparos', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const campanhas = await db
        .select()
        .from(schema.disparosCampanha)
        .orderBy(desc(schema.disparosCampanha.created_at))
        .limit(20);

      return reply.send(campanhas);
    } catch (error) {
      console.error('Erro ao listar campanhas:', error);
      return reply.status(500).send({ error: 'Falha ao buscar histórico de disparos' });
    }
  });

  /**
   * Detalhes de uma campanha
   */
  fastify.get('/api/disparos/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const [campaign] = await db
        .select()
        .from(schema.disparosCampanha)
        .where(eq(schema.disparosCampanha.id, id));

      if (!campaign) {
        return reply.status(404).send({ error: 'Campanha não encontrada' });
      }

      const itens = await db
        .select()
        .from(schema.disparosItens)
        .where(eq(schema.disparosItens.disparo_id, id))
        .limit(100);

      return reply.send({
        campaign,
        itens,
      });
    } catch (error) {
      return reply.status(500).send({ error: 'Falha ao buscar detalhes do disparo' });
    }
  });
}
