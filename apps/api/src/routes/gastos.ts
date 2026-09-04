import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, desc, sql, and } from 'drizzle-orm';
import { z } from 'zod';

const gastoInputSchema = z.object({
  descricao: z.string().min(2),
  categoria: z.enum([
    'COMBUSTIVEL',
    'ALIMENTACAO',
    'MATERIAL_GRAFICO',
    'EVENTOS',
    'IMPULSIONAMENTO',
    'PESSOAL',
    'JURIDICO_CONTABIL',
    'TRANSPORTE',
    'OUTROS',
  ]).default('OUTROS'),
  valor: z.union([z.number(), z.string()]),
  data_gasto: z.string().optional(),
  forma_pagamento: z.enum(['PIX', 'CARTAO', 'TRANSFERENCIA', 'DINHEIRO', 'BOLETO']).default('PIX'),
  fornecedor_nome: z.string().optional().nullable(),
  fornecedor_documento: z.string().optional().nullable(),
  numero_documento: z.string().optional().nullable(),
  comprovante_url: z.string().optional().nullable(),
  responsavel_nome: z.string().optional().nullable(),
  status_auditoria: z.enum(['APROVADO', 'PENDENTE', 'REJEITADO']).default('PENDENTE'),
  observacoes: z.string().optional().nullable(),
}).strip();

export async function gastosRoutes(fastify: FastifyInstance) {
  /** GET /api/gastos — Listar todos os gastos com KPIs consolidados */
  fastify.get('/api/gastos', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = (request.query || {}) as Record<string, string>;
      const { categoria, status, search } = query;

      const conditions = [];
      if (categoria && categoria !== 'TODAS') {
        conditions.push(eq(schema.gastosCampanha.categoria, categoria as any));
      }
      if (status && status !== 'TODOS') {
        conditions.push(eq(schema.gastosCampanha.status_auditoria, status as any));
      }
      if (search) {
        conditions.push(
          sql`(${schema.gastosCampanha.descricao} ILIKE ${`%${search}%`} OR ${schema.gastosCampanha.fornecedor_nome} ILIKE ${`%${search}%`})`
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const items = await db
        .select()
        .from(schema.gastosCampanha)
        .where(whereClause)
        .orderBy(desc(schema.gastosCampanha.data_gasto));

      const [statsResult] = (await db.execute(sql`
        SELECT 
          COALESCE(SUM(valor), 0) AS total_gasto,
          COALESCE(SUM(CASE WHEN status_auditoria = 'APROVADO' THEN valor ELSE 0 END), 0) AS total_aprovado,
          COALESCE(SUM(CASE WHEN status_auditoria = 'PENDENTE' THEN valor ELSE 0 END), 0) AS total_pendente,
          COUNT(*) AS total_registros
        FROM gastos_campanha;
      `)) as any[];

      return reply.send({
        success: true,
        data: items,
        kpis: {
          totalGasto: Number(statsResult?.total_gasto || 0),
          totalAprovado: Number(statsResult?.total_aprovado || 0),
          totalPendente: Number(statsResult?.total_pendente || 0),
          totalRegistros: Number(statsResult?.total_registros || 0),
          tetoLegalTSE: 350000.0,
        },
      });
    } catch (err: any) {
      console.error('[Gastos] Erro ao buscar despesas:', err);
      return reply.status(500).send({ error: 'Erro ao listar despesas', detalhe: err?.message });
    }
  });

  /** POST /api/gastos — Inserir gasto manual */
  fastify.post('/api/gastos', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = gastoInputSchema.parse(request.body);
      const cleanValor = typeof body.valor === 'number' ? body.valor : parseFloat(String(body.valor).replace(',', '.')) || 0;

      const [novo] = await db
        .insert(schema.gastosCampanha)
        .values({
          ...body,
          valor: cleanValor.toFixed(2),
          data_gasto: body.data_gasto ? new Date(body.data_gasto) : new Date(),
        })
        .returning();

      return reply.status(201).send({ success: true, data: novo });
    } catch (err: any) {
      if (err?.name === 'ZodError') {
        return reply.status(400).send({ error: 'Dados inválidos', detalhes: err.errors });
      }
      console.error('[Gastos] Erro ao cadastrar despesa:', err);
      return reply.status(500).send({ error: 'Erro ao registrar despesa' });
    }
  });

  /** DELETE /api/gastos/:id — Remover despesa */
  fastify.delete('/api/gastos/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const [deleted] = await db
        .delete(schema.gastosCampanha)
        .where(eq(schema.gastosCampanha.id, id))
        .returning();

      if (!deleted) {
        return reply.status(404).send({ error: 'Gasto não encontrado' });
      }

      return reply.send({ success: true, data: deleted });
    } catch (err: any) {
      console.error('[Gastos] Erro ao deletar:', err);
      return reply.status(500).send({ error: 'Erro ao excluir despesa' });
    }
  });
}
