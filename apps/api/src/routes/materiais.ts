import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';

export async function materiaisRoutes(app: FastifyInstance) {
  // Lista todos os materiais disponíveis
  app.get('/api/materiais', async (request) => {
    const { tipo } = request.query as any;

    let query = db.select().from(schema.materiaisCampanha).orderBy(desc(schema.materiaisCampanha.created_at));

    if (tipo) {
      const data = await query.where(eq(schema.materiaisCampanha.tipo, tipo));
      return data;
    }

    const data = await query;
    return data;
  });

  // Cadastro de novo material
  app.post('/api/materiais', async (request, reply) => {
    const { titulo, tipo = 'PDF', url, descricao, tamanho_bytes } = request.body as any;

    if (!titulo || !url) {
      return reply.status(400).send({ error: 'Título e URL do material são obrigatórios.' });
    }

    const [novoMaterial] = await db
      .insert(schema.materiaisCampanha)
      .values({
        titulo: titulo.trim(),
        tipo,
        url: url.trim(),
        descricao: descricao || null,
        tamanho_bytes: tamanho_bytes ? Number(tamanho_bytes) : 0,
      })
      .returning();

    return novoMaterial;
  });

  // Exclusão de material
  app.delete('/api/materiais/:id', async (request, reply) => {
    const { id } = request.params as any;

    const existing = await db
      .select()
      .from(schema.materiaisCampanha)
      .where(eq(schema.materiaisCampanha.id, id))
      .limit(1)
      .then((r) => r[0]);

    if (!existing) {
      return reply.status(404).send({ error: 'Material não encontrado.' });
    }

    await db.delete(schema.materiaisCampanha).where(eq(schema.materiaisCampanha.id, id));
    return { success: true, message: 'Material removido com sucesso.' };
  });
}
