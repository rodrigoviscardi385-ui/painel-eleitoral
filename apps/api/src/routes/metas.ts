import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, desc, sql } from 'drizzle-orm';

export async function metasRoutes(app: FastifyInstance) {
  // Lista metas com cálculo de cadência e semáforo em tempo real
  app.get('/api/metas', async () => {
    const metas = await db.select().from(schema.metas).orderBy(desc(schema.metas.created_at));

    // Conta eleitores atuais no banco para atualizar o progresso da meta global
    const [totalGeral] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.usuarios);

    const now = new Date();

    const enrichedMetas = metas.map((m) => {
      let current = m.quantidade_atual;
      if (m.tipo === 'GLOBAL') {
        current = Number(totalGeral?.count || 0);
      }

      const diasRestantes = Math.max(
        Math.ceil((new Date(m.data_fim).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        1
      );

      const faltam = Math.max(m.quantidade_meta - current, 0);
      const ritmoNecessarioPorDia = Math.ceil(faltam / diasRestantes);

      // Semáforo dinâmico
      let semaforo: 'VERDE' | 'AMARELO' | 'VERMELHO' = 'VERDE';
      if (faltam === 0) {
        semaforo = 'VERDE';
      } else if (ritmoNecessarioPorDia > m.meta_diaria_cadencia * 1.5) {
        semaforo = 'VERMELHO'; // Ritmo muito atrasado
      } else if (ritmoNecessarioPorDia > m.meta_diaria_cadencia) {
        semaforo = 'AMARELO'; // Exige atenção
      }

      const percentual = Math.min(Math.round((current / (m.quantidade_meta || 1)) * 100), 100);

      return {
        ...m,
        quantidade_atual: current,
        dias_restantes: diasRestantes,
        faltam,
        ritmo_necessario_dia: ritmoNecessarioPorDia,
        status_semaforo: semaforo,
        percentual,
      };
    });

    return enrichedMetas;
  });

  // Criação de meta
  app.post('/api/metas', async (request, reply) => {
    const body = request.body as any;

    if (!body.titulo || !body.quantidade_meta || !body.data_fim) {
      return reply.status(400).send({ error: 'Título, quantidade da meta e data final são obrigatórios.' });
    }

    const [nova] = await db
      .insert(schema.metas)
      .values({
        titulo: body.titulo,
        tipo: body.tipo || 'GLOBAL',
        alvo_referencia: body.alvo_referencia || null,
        quantidade_meta: Number(body.quantidade_meta),
        quantidade_atual: 0,
        data_fim: new Date(body.data_fim),
        meta_diaria_cadencia: Number(body.meta_diaria_cadencia || 10),
      })
      .returning();

    return nova;
  });

  // Atualização de meta
  app.put('/api/metas/:id', async (request, reply) => {
    const { id } = request.params as any;
    const body = request.body as any;

    const existing = await db.select().from(schema.metas).where(eq(schema.metas.id, id)).limit(1).then((r) => r[0]);
    if (!existing) {
      return reply.status(404).send({ error: 'Meta não encontrada.' });
    }

    const updates: any = { ...body, updated_at: new Date() };
    if (updates.data_fim) {
      updates.data_fim = new Date(updates.data_fim);
    }

    await db.update(schema.metas).set(updates).where(eq(schema.metas.id, id));
    const updated = await db.select().from(schema.metas).where(eq(schema.metas.id, id)).limit(1).then((r) => r[0]);

    return updated;
  });

  // Exclusão de meta
  app.delete('/api/metas/:id', async (request, reply) => {
    const { id } = request.params as any;
    await db.delete(schema.metas).where(eq(schema.metas.id, id));
    return { success: true };
  });
}
