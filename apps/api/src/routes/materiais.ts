import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';

const materialSchema = z.object({
  titulo: z.string().min(2).max(200),
  descricao: z.string().max(500).optional().nullable(),
  tipo: z.enum(['PDF', 'LINK', 'IMAGEM', 'VIDEO']).default('LINK'),
  url: z.string().url('URL inválida'),
  tags: z.array(z.string()).default([]),
  ativo: z.enum(['SIM', 'NAO']).default('SIM'),
  ordem: z.number().int().min(0).default(0),
}).strip();

export async function materiaisRoutes(fastify: FastifyInstance) {
  /** GET /api/materiais — Lista todos os materiais */
  fastify.get('/api/materiais', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const materiais = await db
        .select()
        .from(schema.materiaisOnline)
        .orderBy(schema.materiaisOnline.ordem, desc(schema.materiaisOnline.created_at));
      return reply.send({ materiais });
    } catch (err) {
      console.error('[Materiais] Erro ao listar:', err);
      return reply.status(500).send({ error: 'Erro ao buscar materiais' });
    }
  });

  /** POST /api/materiais — Criar novo material */
  fastify.post('/api/materiais', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = materialSchema.parse(request.body);
      const [novo] = await db
        .insert(schema.materiaisOnline)
        .values({
          ...body,
          tags: JSON.stringify(body.tags),
        })
        .returning();
      return reply.status(201).send({ material: novo });
    } catch (err: any) {
      if (err?.name === 'ZodError') {
        return reply.status(400).send({ error: 'Dados inválidos', detalhes: err.errors });
      }
      console.error('[Materiais] Erro ao criar:', err);
      return reply.status(500).send({ error: 'Erro ao criar material' });
    }
  });

  /** PATCH /api/materiais/:id — Editar material */
  fastify.patch('/api/materiais/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const body = materialSchema.partial().parse(request.body);
      const updateData: any = { ...body, updated_at: new Date() };
      if (body.tags) updateData.tags = JSON.stringify(body.tags);

      const [atualizado] = await db
        .update(schema.materiaisOnline)
        .set(updateData)
        .where(eq(schema.materiaisOnline.id, id))
        .returning();

      if (!atualizado) return reply.status(404).send({ error: 'Material não encontrado' });
      return reply.send({ material: atualizado });
    } catch (err: any) {
      if (err?.name === 'ZodError') {
        return reply.status(400).send({ error: 'Dados inválidos', detalhes: err.errors });
      }
      console.error('[Materiais] Erro ao editar:', err);
      return reply.status(500).send({ error: 'Erro ao editar material' });
    }
  });

  /** DELETE /api/materiais/:id — Remover material */
  fastify.delete('/api/materiais/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      await db.delete(schema.materiaisOnline).where(eq(schema.materiaisOnline.id, id));
      return reply.send({ ok: true });
    } catch (err) {
      console.error('[Materiais] Erro ao deletar:', err);
      return reply.status(500).send({ error: 'Erro ao remover material' });
    }
  });
}
