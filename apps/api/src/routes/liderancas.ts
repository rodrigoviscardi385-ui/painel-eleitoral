import { FastifyInstance } from 'fastify';
import { db, getHierarchyTree, recalculateNetworkMetrics, logAuditLGPD } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, ilike, or, desc, sql } from 'drizzle-orm';


export async function liderancasRoutes(app: FastifyInstance) {
  // Lista eleitores e lideranças com filtros
  app.get('/api/liderancas', async (request) => {
    const { busca, cargo, bairro, zona, page = '1', limit = '50' } = request.query as any;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(parseInt(limit, 10) || 50, 100);
    const offset = (pageNum - 1) * limitNum;

    const conditions: any[] = [];

    if (busca) {
      const q = `%${busca.trim()}%`;
      conditions.push(or(ilike(schema.usuarios.nome, q), ilike(schema.usuarios.whatsapp, q)));
    }
    if (cargo) {
      conditions.push(eq(schema.usuarios.cargo, cargo));
    }
    if (bairro) {
      conditions.push(eq(schema.usuarios.bairro, bairro));
    }
    if (zona) {
      conditions.push(eq(schema.usuarios.zona_eleitoral, zona));
    }

    let query = db
      .select()
      .from(schema.usuarios)
      .orderBy(desc(schema.usuarios.total_indicados_rede), desc(schema.usuarios.created_at))
      .limit(limitNum)
      .offset(offset);

    const data = await (conditions.length > 0
      ? (query as any).where(sql.join(conditions, sql` AND `))
      : query);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.usuarios);

    return {
      data,
      total: Number(countResult?.count || 0),
      page: pageNum,
      limit: limitNum,
    };
  });

  // Retorna Árvore Hierárquica para visualizador de rede
  app.get('/api/liderancas/arvore', async (request) => {
    const { mask_lgpd, root_id } = request.query as any;
    const shouldMask = mask_lgpd === 'true' || mask_lgpd === '1';
    const tree = await getHierarchyTree(root_id, shouldMask);
    return tree;
  });

  // Cadastro de Eleitor ou Liderança
  app.post('/api/liderancas', async (request, reply) => {
    const body = request.body as any;

    if (!body.nome || !body.whatsapp) {
      return reply.status(400).send({ error: 'Nome e WhatsApp são obrigatórios.' });
    }

    const cleanWhatsapp = body.whatsapp.replace(/\D/g, '');

    // Verifica se número já existe
    const existing = await db
      .select()
      .from(schema.usuarios)
      .where(eq(schema.usuarios.whatsapp, cleanWhatsapp))
      .limit(1)
      .then((r) => r[0]);

    if (existing) {
      return reply.status(409).send({ error: 'Este número de WhatsApp já está cadastrado.' });
    }

    const [newUser] = await db
      .insert(schema.usuarios)
      .values({
        nome: body.nome.trim(),
        whatsapp: cleanWhatsapp,
        cargo: body.cargo || 'APOIADOR',
        lider_acima_id: body.lider_acima_id || null,
        bairro: body.bairro || null,
        zona_eleitoral: body.zona_eleitoral || null,
        secao_eleitoral: body.secao_eleitoral || null,
        status_onboarding: 'COMPLETO',
        notas: body.notas || null,
      })
      .returning();

    // Recalcula métricas da rede
    if (newUser.lider_acima_id) {
      await recalculateNetworkMetrics(newUser.lider_acima_id);
    }

    await logAuditLGPD('SISTEMA', 'CRIAR_ELEITOR', (request as any).ip, { id: newUser.id, nome: newUser.nome });

    return newUser;
  });

  // Atualização de dados
  app.put('/api/liderancas/:id', async (request, reply) => {
    const { id } = request.params as any;
    const body = request.body as any;

    const existing = await db
      .select()
      .from(schema.usuarios)
      .where(eq(schema.usuarios.id, id))
      .limit(1)
      .then((r) => r[0]);

    if (!existing) {
      return reply.status(404).send({ error: 'Usuário não encontrado.' });
    }

    const updates: any = { ...body, updated_at: new Date() };
    if (updates.whatsapp) {
      updates.whatsapp = updates.whatsapp.replace(/\D/g, '');
    }

    await db.update(schema.usuarios).set(updates).where(eq(schema.usuarios.id, id));

    // Se mudou de líder, recalcula
    if (updates.lider_acima_id !== undefined || existing.lider_acima_id) {
      await recalculateNetworkMetrics(id);
    }

    const updated = await db
      .select()
      .from(schema.usuarios)
      .where(eq(schema.usuarios.id, id))
      .limit(1)
      .then((r) => r[0]);

    return updated;
  });

  // Exclusão
  app.delete('/api/liderancas/:id', async (request, reply) => {
    const { id } = request.params as any;
    const existing = await db
      .select()
      .from(schema.usuarios)
      .where(eq(schema.usuarios.id, id))
      .limit(1)
      .then((r) => r[0]);

    if (!existing) {
      return reply.status(404).send({ error: 'Usuário não encontrado.' });
    }

    await db.delete(schema.usuarios).where(eq(schema.usuarios.id, id));

    if (existing.lider_acima_id) {
      await recalculateNetworkMetrics(existing.lider_acima_id);
    }

    await logAuditLGPD('SISTEMA', 'EXCLUIR_ELEITOR', (request as any).ip, { id, nome: existing.nome });

    return { success: true, message: 'Usuário removido com sucesso.' };
  });

  // Alias para a rota de árvore especificada em /api/liderancas/tree
  app.get('/api/liderancas/tree', async (request) => {
    const { mask_lgpd, maskLGPD, root_id } = request.query as any;
    const shouldMask = mask_lgpd === 'true' || maskLGPD === 'true' || mask_lgpd === '1';
    const tree = await getHierarchyTree(root_id, shouldMask);
    return tree;
  });

  // Criação de Grupo de Base no WhatsApp para um Líder
  app.post('/api/liderancas/criar-grupo', async (request, reply) => {
    const { lider_id, nome_grupo } = request.body as any;

    if (!lider_id) {
      return reply.status(400).send({ error: 'ID do líder é obrigatório.' });
    }

    const lider = await db
      .select()
      .from(schema.usuarios)
      .where(eq(schema.usuarios.id, lider_id))
      .limit(1)
      .then((r) => r[0]);

    if (!lider) {
      return reply.status(404).send({ error: 'Líder não encontrado.' });
    }

    // Busca coordenadores/gestores cadastrados para serem administradores automáticos
    const gestores = await db.select().from(schema.gestoresCampanha);
    const participantPhones = [lider.whatsapp, ...gestores.map((g) => g.whatsapp)];

    const candidate = await db.select().from(schema.campanhaConfig).limit(1).then((r) => r[0]);
    const finalGroupName =
      nome_grupo?.trim() ||
      `Base ${candidate?.nome_urna || 'Campanha'} • ${lider.nome.split(' ')[0]}`;

    // Nota: A Meta WhatsApp Cloud API não suporta criação programática de grupos.
    // O link de grupo deve ser criado manualmente no WhatsApp e informado no sistema.
    const manualGroupLink = (request.body as any).link_grupo || null;

    if (manualGroupLink) {
      await db
        .update(schema.usuarios)
        .set({
          grupo_link_convite: manualGroupLink,
          updated_at: new Date(),
        })
        .where(eq(schema.usuarios.id, lider_id));
    }

    await logAuditLGPD(
      'SISTEMA',
      'REGISTRAR_GRUPO_BASE',
      (request as any).ip,
      { lider_id, nome_grupo: finalGroupName, link: manualGroupLink }
    );

    return {
      success: true,
      message: manualGroupLink
        ? `Grupo "${finalGroupName}" registrado com sucesso! Link salvo.`
        : 'Para criar grupos, utilize o WhatsApp no celular e cole o link de convite aqui.',
      info: 'A Meta Cloud API não suporta criação automática de grupos. Crie manualmente e informe o link.',
    };
  });

  // Registro de Auditoria LGPD para Desmascaramento de Dados
  app.post('/api/liderancas/audit/unmask', async (request, reply) => {
    const { usuario_responsavel = 'ADMIN', justificativa, lider_id } = request.body as any;

    if (!justificativa || justificativa.trim().length < 5) {
      return reply.status(400).send({ error: 'Justificativa legal é obrigatória (mínimo 5 caracteres).' });
    }

    await logAuditLGPD(
      usuario_responsavel,
      'DESMASCARAR_DADOS_LGPD',
      (request as any).ip,
      { justificativa: justificativa.trim(), lider_id }
    );

    return {
      success: true,
      message: 'Acesso registrado na trilha de auditoria LGPD com sucesso.',
    };
  });

  // Retorna apoiadores diretos de uma liderança (Lazy loading)
  app.get('/api/liderancas/:id/supporters', async (request) => {
    const { id } = request.params as any;
    const { mask_lgpd, maskLGPD } = request.query as any;
    const shouldMask = mask_lgpd === 'true' || maskLGPD === 'true' || mask_lgpd === '1';

    const supporters = await db
      .select()
      .from(schema.usuarios)
      .where(eq(schema.usuarios.lider_acima_id, id))
      .orderBy(desc(schema.usuarios.created_at));

    const masked = supporters.map((s) => ({
      ...s,
      whatsapp: shouldMask && s.whatsapp ? s.whatsapp.slice(0, 4) + '••••' + s.whatsapp.slice(-2) : s.whatsapp,
    }));

    return { supporters: masked, total: masked.length };
  });

  // Força recálculo geral da árvore via CTE recursiva
  app.post('/api/liderancas/recalcular-metricas', async (request, reply) => {
    try {
      await recalculateNetworkMetrics();
      return { success: true, message: 'Métricas de rede hierárquica recalculadas com sucesso!' };
    } catch (err: any) {
      return reply.status(500).send({ error: 'Erro ao recalcular métricas', detalhe: err.message });
    }
  });

  // ─── Retiradas de Materiais por Liderança ──────────────────────────────────
  // Lista todas as retiradas de materiais de um cadastrado
  app.get('/api/liderancas/:id/retiradas', async (request) => {
    const { id } = request.params as any;

    const retiradas = await db
      .select()
      .from(schema.retiradasMateriais)
      .where(eq(schema.retiradasMateriais.usuario_id, id))
      .orderBy(desc(schema.retiradasMateriais.data_retirada));

    // Agrega resumo por tipo de material
    const totaisPorMaterial: Record<string, number> = {};
    let totalGeralItens = 0;

    for (const r of retiradas) {
      totaisPorMaterial[r.material_nome] = (totaisPorMaterial[r.material_nome] || 0) + r.quantidade;
      totalGeralItens += r.quantidade;
    }

    return {
      retiradas,
      total_registros: retiradas.length,
      total_geral_itens: totalGeralItens,
      totais_por_material: totaisPorMaterial,
    };
  });

  // Registra uma ou múltiplas retiradas de materiais para o cadastrado
  app.post('/api/liderancas/:id/retiradas', async (request, reply) => {
    const { id } = request.params as any;
    const body = request.body as any;

    // Suporta array de itens ou item único
    const itensRecebidos: Array<{
      material_nome: string;
      quantidade: number | string;
      data_retirada?: string;
      responsavel_entrega?: string;
      observacoes?: string;
    }> = Array.isArray(body?.itens)
      ? body.itens
      : body?.material_nome
      ? [body]
      : [];

    if (itensRecebidos.length === 0) {
      return reply.status(400).send({ error: 'Informe ao menos um material para registro de retirada.' });
    }

    const lider = await db.select().from(schema.usuarios).where(eq(schema.usuarios.id, id)).limit(1).then((r) => r[0]);
    if (!lider) {
      return reply.status(404).send({ error: 'Liderança não encontrada.' });
    }

    const insertedIds: string[] = [];

    for (const item of itensRecebidos) {
      const nomeMaterial = (item.material_nome || '').trim();
      const qtd = parseInt(String(item.quantidade), 10);

      if (!nomeMaterial || isNaN(qtd) || qtd <= 0) {
        continue;
      }

      const dataRetirada = item.data_retirada ? new Date(item.data_retirada) : (body?.data_retirada ? new Date(body.data_retirada) : new Date());
      const responsavel = item.responsavel_entrega?.trim() || body?.responsavel_entrega?.trim() || null;
      const obs = item.observacoes?.trim() || body?.observacoes?.trim() || null;

      const [novo] = await db
        .insert(schema.retiradasMateriais)
        .values({
          usuario_id: id,
          material_nome: nomeMaterial,
          quantidade: qtd,
          data_retirada: dataRetirada,
          responsavel_entrega: responsavel,
          observacoes: obs,
        })
        .returning();

      if (novo) insertedIds.push(novo.id);
    }

    if (insertedIds.length === 0) {
      return reply.status(400).send({ error: 'Nenhum item válido para cadastrar. Verifique nomes e quantidades.' });
    }

    await logAuditLGPD(
      'SISTEMA',
      'REGISTRO_RETIRADA_MATERIAL',
      (request as any).ip,
      { usuario_id: id, lider_nome: lider.nome, total_itens_inseridos: insertedIds.length }
    );

    return {
      success: true,
      message: `${insertedIds.length} item(ns) de retirada registrado(s) com sucesso para ${lider.nome}!`,
      inserted_ids: insertedIds,
    };
  });

  // Exclui um registro de retirada de material
  app.delete('/api/liderancas/retiradas/:retiradaId', async (request, reply) => {
    const { retiradaId } = request.params as any;

    const [deleted] = await db
      .delete(schema.retiradasMateriais)
      .where(eq(schema.retiradasMateriais.id, retiradaId))
      .returning();

    if (!deleted) {
      return reply.status(404).send({ error: 'Registro de retirada não encontrado.' });
    }

    return { success: true, message: 'Registro de retirada excluído com sucesso.' };
  });
}

