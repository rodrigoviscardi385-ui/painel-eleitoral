import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';

export async function gestoresRoutes(app: FastifyInstance) {
  // Lista coordenadores e gestores de grupo
  app.get('/api/gestores', async () => {
    const gestores = await db
      .select()
      .from(schema.gestoresCampanha)
      .orderBy(desc(schema.gestoresCampanha.created_at));
    return gestores;
  });

  // Cadastro de novo coordenador/gestor
  app.post('/api/gestores', async (request, reply) => {
    const { nome, whatsapp, cargo = 'COORDENADOR GERAL', notificar_novos_grupos = true } = request.body as any;

    if (!nome || !whatsapp) {
      return reply.status(400).send({ error: 'Nome e WhatsApp são obrigatórios.' });
    }

    const cleanWhatsapp = whatsapp.replace(/\D/g, '');

    const existing = await db
      .select()
      .from(schema.gestoresCampanha)
      .where(eq(schema.gestoresCampanha.whatsapp, cleanWhatsapp))
      .limit(1)
      .then((r) => r[0]);

    if (existing) {
      return reply.status(409).send({ error: 'Este coordenador já está cadastrado.' });
    }

    const [novo] = await db
      .insert(schema.gestoresCampanha)
      .values({
        nome: nome.trim(),
        whatsapp: cleanWhatsapp,
        cargo,
        notificar_novos_grupos: Boolean(notificar_novos_grupos),
      })
      .returning();

    return novo;
  });

  // Exclusão de gestor
  app.delete('/api/gestores/:id', async (request, reply) => {
    const { id } = request.params as any;

    const existing = await db
      .select()
      .from(schema.gestoresCampanha)
      .where(eq(schema.gestoresCampanha.id, id))
      .limit(1)
      .then((r) => r[0]);

    if (!existing) {
      return reply.status(404).send({ error: 'Coordenador não encontrado.' });
    }

    await db.delete(schema.gestoresCampanha).where(eq(schema.gestoresCampanha.id, id));
    return { success: true, message: 'Coordenador removido com sucesso.' };
  });
}
