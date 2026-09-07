import { FastifyInstance } from 'fastify';
import { db, logAuditLGPD } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, desc, sql, and } from 'drizzle-orm';
import { ocrImageBuffer } from '../services/ocrService.js';
import { extractExpenseFromText } from '../services/groqService.js';

export async function gastosRoutes(app: FastifyInstance) {
  // Lista gastos com filtros por categoria e status de auditoria
  app.get('/api/gastos', async (request) => {
    const { categoria, status } = request.query as any;

    const conditions: any[] = [];
    if (categoria) conditions.push(eq(schema.gastosCampanha.categoria, categoria));
    if (status) conditions.push(eq(schema.gastosCampanha.status_auditoria, status));

    let query = db
      .select()
      .from(schema.gastosCampanha)
      .orderBy(desc(schema.gastosCampanha.data_gasto));

    const data = await (conditions.length > 0
      ? (query as any).where(sql.join(conditions, sql` AND `))
      : query);

    // Totais acumulados
    const [totalSum] = await db
      .select({
        total: sql<string>`COALESCE(sum(valor), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(schema.gastosCampanha);

    // Totais por categoria
    const porCategoria = await db
      .select({
        categoria: schema.gastosCampanha.categoria,
        total: sql<string>`COALESCE(sum(valor), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(schema.gastosCampanha)
      .groupBy(schema.gastosCampanha.categoria);

    return {
      gastos: data,
      totalGeral: Number(totalSum?.total || 0),
      quantidadeTotal: Number(totalSum?.count || 0),
      porCategoria,
    };
  });

  // Cadastro de despesa
  app.post('/api/gastos', async (request, reply) => {
    const body = request.body as any;

    if (!body.descricao || !body.valor) {
      return reply.status(400).send({ error: 'Descrição e valor são obrigatórios.' });
    }

    const [novo] = await db
      .insert(schema.gastosCampanha)
      .values({
        descricao: body.descricao,
        categoria: body.categoria || 'OUTROS',
        valor: String(body.valor),
        data_gasto: body.data_gasto ? new Date(body.data_gasto) : new Date(),
        forma_pagamento: body.forma_pagamento || 'PIX',
        fornecedor_nome: body.fornecedor_nome || null,
        fornecedor_documento: body.fornecedor_documento || null,
        numero_documento: body.numero_documento || null,
        comprovante_url: body.comprovante_url || null,
        responsavel_nome: body.responsavel_nome || null,
        status_auditoria: body.status_auditoria || 'PENDENTE',
        observacoes: body.observacoes || null,
      })
      .returning();

    await logAuditLGPD('SISTEMA', 'NOVO_GASTO_CADASTRADO', (request as any).ip, { id: novo.id, valor: novo.valor });

    return novo;
  });

  // Atualização (ex: aprovar/rejeitar auditoria contábil)
  app.put('/api/gastos/:id', async (request, reply) => {
    const { id } = request.params as any;
    const body = request.body as any;

    const existing = await db
      .select()
      .from(schema.gastosCampanha)
      .where(eq(schema.gastosCampanha.id, id))
      .limit(1)
      .then((r) => r[0]);

    if (!existing) {
      return reply.status(404).send({ error: 'Despesa não encontrada.' });
    }

    const updates: any = { ...body, updated_at: new Date() };
    if (updates.valor) updates.valor = String(updates.valor);
    if (updates.data_gasto) updates.data_gasto = new Date(updates.data_gasto);

    await db.update(schema.gastosCampanha).set(updates).where(eq(schema.gastosCampanha.id, id));

    const updated = await db
      .select()
      .from(schema.gastosCampanha)
      .where(eq(schema.gastosCampanha.id, id))
      .limit(1)
      .then((r) => r[0]);

    return updated;
  });

  // Exclusão
  app.delete('/api/gastos/:id', async (request, reply) => {
    const { id } = request.params as any;
    await db.delete(schema.gastosCampanha).where(eq(schema.gastosCampanha.id, id));
    return { success: true };
  });

  // OCR e reconhecimento automático de comprovante / cupom fiscal
  app.post('/api/gastos/ocr', async (request, reply) => {
    const body = request.body as any;
    const { imagemBase64, texto } = body || {};

    let recognizedText = texto || '';

    if (imagemBase64) {
      try {
        const base64Data = imagemBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        recognizedText = await ocrImageBuffer(buffer);
      } catch (err: any) {
        console.error('[OCR Cupom Error]', err?.message || err);
      }
    }

    if (!recognizedText || recognizedText.trim().length === 0) {
      return reply.status(400).send({
        error: 'Não foi possível ler o texto da imagem do cupom/comprovante. Tente uma foto com iluminação melhor ou digite os dados manualmente.',
      });
    }

    const parsed = await extractExpenseFromText(recognizedText);

    return {
      success: true,
      textoLido: recognizedText,
      dados: {
        descricao: parsed.descricao || '',
        valor: parsed.valor || 0,
        categoria: parsed.categoria || 'OUTROS',
        forma_pagamento: parsed.forma_pagamento || 'PIX',
        fornecedor_nome: parsed.fornecedor_nome || '',
        fornecedor_documento: parsed.fornecedor_documento || '',
        numero_documento: parsed.numero_documento || '',
      },
    };
  });
}
