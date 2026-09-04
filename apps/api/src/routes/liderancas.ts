import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db, getLeadershipHierarchy, recalculateNetworkMetrics } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { nativeWhatsAppService } from '../services/nativeWhatsAppService.js';

function maskPhone(phone: string): string {
  if (!phone || phone.length < 8) return '****-****';
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 11) {
    return `+55 (${clean.slice(0, 2)}) 9****-${clean.slice(7)}`;
  }
  return `+55 ****-${clean.slice(-4)}`;
}

export async function liderancasRoutes(fastify: FastifyInstance) {
  /**
   * Retorna a Árvore de Liderança completa com suporte a mascaramento LGPD
   */
  fastify.get('/api/liderancas/tree', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query: any = request.query || {};
      const shouldMask = query.maskLGPD !== 'false';

      const rawHierarchy = (await getLeadershipHierarchy()) as any[];

      // Formatar nós e aplicar mascaramento se requisitado
      const formattedTree = rawHierarchy.map((node) => ({
        id: node.id,
        nome: node.nome,
        whatsapp: shouldMask ? maskPhone(node.whatsapp) : node.whatsapp,
        cargo: node.cargo,
        lider_acima_id: node.lider_acima_id,
        bairro: node.bairro || 'Não informado',
        zona_eleitoral: node.zona_eleitoral || '100',
        secao_eleitoral: node.secao_eleitoral || '01',
        grupo_whatsapp_id: node.grupo_whatsapp_id,
        grupo_link_convite: node.grupo_link_convite,
        total_indicados_diretos: parseInt(node.total_indicados_diretos || '0', 10),
        total_indicados_rede: parseInt(node.total_indicados_rede || '0', 10),
        nivel: parseInt(node.nivel || '0', 10),
        caminho_arvore: node.caminho_arvore,
        created_at: node.created_at,
      }));

      return reply.send({
        tree: formattedTree,
        total_lideres: formattedTree.length,
        is_masked: shouldMask,
      });
    } catch (error) {
      console.error('Erro em /api/liderancas/tree:', error);
      const shouldMask = (request.query as any)?.maskLGPD !== 'false';
      return reply.send({
        tree: [],
        total_lideres: 0,
        is_masked: shouldMask,
      });
    }
  });

  /**
   * Lazy Loading: Retorna os apoiadores diretos de um líder específico
   */
  fastify.get(
    '/api/liderancas/:id/supporters',
    async (request: FastifyRequest<{ Params: { id: string }; Querystring: { maskLGPD?: string } }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const shouldMask = request.query.maskLGPD !== 'false';

        const supporters = await db
          .select()
          .from(schema.usuarios)
          .where(eq(schema.usuarios.lider_acima_id, id));

        const formatted = supporters.map((s) => ({
          ...s,
          whatsapp: shouldMask ? maskPhone(s.whatsapp) : s.whatsapp,
        }));

        return reply.send({
          lider_id: id,
          total: formatted.length,
          supporters: formatted,
          is_masked: shouldMask,
        });
      } catch (error) {
        console.error('Erro ao buscar apoiadores do líder:', error);
        return reply.status(500).send({ error: 'Falha ao buscar apoiadores' });
      }
    }
  );

  /**
   * Listagem de Gestores e Administradores da Campanha
   */
  fastify.get('/api/gestores', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const gestores = await db
        .select()
        .from(schema.usuarios)
        .where(eq(schema.usuarios.cargo, 'GESTOR'))
        .orderBy(schema.usuarios.nome);

      const admins = await db
        .select()
        .from(schema.usuarios)
        .where(eq(schema.usuarios.cargo, 'ADMIN'))
        .orderBy(schema.usuarios.nome);

      return reply.send({
        gestores: [...admins, ...gestores],
        total: admins.length + gestores.length,
      });
    } catch (error) {
      console.error('Erro ao buscar gestores:', error);
      return reply.status(500).send({ error: 'Falha ao buscar gestores' });
    }
  });

  /**
   * Cadastro de Novo Gestor ou Administrador
   */
  fastify.post('/api/gestores', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body: any = request.body || {};
      const { nome, whatsapp, cargo = 'GESTOR', bairro, zona_eleitoral } = body;

      if (!nome || !whatsapp) {
        return reply.status(400).send({ error: 'Nome e WhatsApp são obrigatórios' });
      }

      let cleanWhatsapp = String(whatsapp).replace(/\D/g, '');
      if (cleanWhatsapp.length < 8) {
        return reply.status(400).send({ error: 'WhatsApp inválido. Informe o número com DDD.' });
      }
      if (cleanWhatsapp.length === 10 || cleanWhatsapp.length === 11) {
        cleanWhatsapp = `55${cleanWhatsapp}`;
      }

      const [novoGestor] = await db
        .insert(schema.usuarios)
        .values({
          nome: String(nome).trim(),
          whatsapp: cleanWhatsapp,
          cargo: cargo === 'ADMIN' ? 'ADMIN' : 'GESTOR',
          bairro: bairro ? String(bairro).trim() : 'Geral',
          zona_eleitoral: zona_eleitoral ? String(zona_eleitoral).trim() : null,
          status_onboarding: 'COMPLETO',
        })
        .onConflictDoUpdate({
          target: schema.usuarios.whatsapp,
          set: {
            nome: String(nome).trim(),
            cargo: cargo === 'ADMIN' ? 'ADMIN' : 'GESTOR',
            bairro: bairro ? String(bairro).trim() : 'Geral',
            zona_eleitoral: zona_eleitoral ? String(zona_eleitoral).trim() : null,
            status_onboarding: 'COMPLETO',
            updated_at: new Date(),
          },
        })
        .returning();

      setImmediate(() => {
        recalculateNetworkMetrics().catch(() => {});
        nativeWhatsAppService.promoteGestorToAllGroups(cleanWhatsapp).catch((err) => {
          console.warn('Aviso ao promover novo gestor em todos os grupos:', err);
        });
      });

      return reply.status(201).send({
        success: true,
        gestor: novoGestor,
      });
    } catch (error: any) {
      console.error('Erro ao cadastrar gestor:', error);
      return reply.status(500).send({ 
        error: 'Falha ao cadastrar gestor',
        detail: error?.message || String(error)
      });
    }
  });

  /**
   * Criação Automática do Grupo de WhatsApp para um Líder
   */
  fastify.post('/api/liderancas/:id/create-group', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const [lider] = await db
        .select()
        .from(schema.usuarios)
        .where(eq(schema.usuarios.id, id))
        .limit(1);

      if (!lider) {
        return reply.status(404).send({ error: 'Líder não encontrado' });
      }

      // Regra de Negócio: Apenas Líder ou Admin têm direito de criar grupo oficial de WhatsApp
      if (lider.cargo !== 'LIDER' && lider.cargo !== 'ADMIN') {
        return reply.status(403).send({
          error: 'Apenas usuários com cargo de Líder ou Administrador têm permissão para criar grupos oficiais de WhatsApp.',
        });
      }

      const primeiroNome = (lider.nome || 'Líder').split(' ')[0];
      const groupName = `[Base] ${primeiroNome} • Campanha 2026`;

      const groupResult = await nativeWhatsAppService.createBaseGroup(groupName, lider.whatsapp);

      if (groupResult?.inviteLink) {
        const [updatedLider] = await db
          .update(schema.usuarios)
          .set({
            grupo_whatsapp_id: groupResult.groupId,
            grupo_link_convite: groupResult.inviteLink,
            updated_at: new Date(),
          })
          .where(eq(schema.usuarios.id, id))
          .returning();

        return reply.send({
          success: true,
          groupId: groupResult.groupId,
          inviteLink: groupResult.inviteLink,
          lider: updatedLider,
        });
      }

      return reply.status(500).send({ error: 'Falha ao gerar link do grupo' });
    } catch (error) {
      console.error('Erro ao criar grupo do líder:', error);
      return reply.status(500).send({ error: 'Falha ao criar grupo de WhatsApp' });
    }
  });

  /**
   * Atualização de dados de um Líder, Gestor, Apoiador ou Voluntário (Edição de Cargo e Perfil)
   */
  fastify.put('/api/liderancas/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const body: any = request.body || {};

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (!isUuid) {
        return reply.send({
          success: true,
          usuario: { id, ...body },
        });
      }

      const [existing] = await db
        .select()
        .from(schema.usuarios)
        .where(eq(schema.usuarios.id, id))
        .limit(1);

      if (!existing) {
        return reply.status(404).send({ error: 'Usuário não encontrado' });
      }

      let formattedWhatsapp = body.whatsapp !== undefined ? String(body.whatsapp).replace(/\D/g, '') : existing.whatsapp;
      if (formattedWhatsapp && (formattedWhatsapp.length === 10 || formattedWhatsapp.length === 11)) {
        formattedWhatsapp = `55${formattedWhatsapp}`;
      }

      const updateData: any = {
        updated_at: new Date(),
      };

      if (body.nome !== undefined) updateData.nome = String(body.nome).trim();
      if (body.whatsapp !== undefined) updateData.whatsapp = formattedWhatsapp || existing.whatsapp;
      if (body.cargo !== undefined) {
        const validCargos = ['ADMIN', 'GESTOR', 'LIDER', 'APOIADOR', 'VOLUNTARIO'];
        if (validCargos.includes(body.cargo)) {
          updateData.cargo = body.cargo;
        }
      }
      if (body.bairro !== undefined) updateData.bairro = body.bairro;
      if (body.zona_eleitoral !== undefined) updateData.zona_eleitoral = body.zona_eleitoral;
      if (body.secao_eleitoral !== undefined) updateData.secao_eleitoral = body.secao_eleitoral;
      if (body.grupo_link_convite !== undefined) updateData.grupo_link_convite = body.grupo_link_convite;
      if (body.lider_acima_id !== undefined) updateData.lider_acima_id = body.lider_acima_id || null;

      const [updatedUser] = await db
        .update(schema.usuarios)
        .set(updateData)
        .where(eq(schema.usuarios.id, id))
        .returning();

      setImmediate(() => {
        recalculateNetworkMetrics().catch(() => {});

        // Regra de Negócio: Se o cargo for ou passou a ser GESTOR, promovê-lo a administrador em TODOS os grupos de WhatsApp
        if (updateData.cargo === 'GESTOR') {
          const gestorPhone = updateData.whatsapp || existing.whatsapp;
          if (gestorPhone) {
            nativeWhatsAppService.promoteGestorToAllGroups(gestorPhone).catch((err) => {
              console.warn('Aviso ao promover gestor em todos os grupos de WhatsApp:', err);
            });
          }
        }
      });

      return reply.send({
        success: true,
        usuario: updatedUser,
      });
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      return reply.status(500).send({ error: 'Falha ao atualizar dados do usuário' });
    }
  });

  /**
   * Exclusão de Líder ou Apoiador
   */
  fastify.delete('/api/liderancas/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (!isUuid) {
        return reply.send({
          success: true,
          message: 'Registro demonstrativo removido com sucesso',
        });
      }

      const [existing] = await db
        .select()
        .from(schema.usuarios)
        .where(eq(schema.usuarios.id, id))
        .limit(1);

      if (!existing) {
        return reply.send({ success: true, message: 'Registro já removido' });
      }

      // 1. Remover eventuais itens de campanhas de disparo vinculados a este usuário
      await db
        .delete(schema.disparosItens)
        .where(eq(schema.disparosItens.usuario_id, id))
        .catch((e) => console.warn('Aviso ao limpar disparos_itens:', e));

      // 2. Re-linkar eventuais filhos ao pai deste nó para não corromper a árvore
      await db
        .update(schema.usuarios)
        .set({
          lider_acima_id: existing.lider_acima_id || null,
          updated_at: new Date(),
        })
        .where(eq(schema.usuarios.lider_acima_id, id))
        .catch((e) => console.warn('Aviso ao re-linkar filhos:', e));

      // 3. Limpar fluxo de onboarding temporário se houver
      if (existing.whatsapp) {
        await db
          .delete(schema.fluxosOnboardingTemp)
          .where(eq(schema.fluxosOnboardingTemp.whatsapp, existing.whatsapp))
          .catch((e) => console.warn('Aviso ao limpar onboarding temp:', e));
      }

      // 4. Deletar da tabela de usuários
      await db.delete(schema.usuarios).where(eq(schema.usuarios.id, id));

      // 5. Recalcular contadores de rede em background
      setImmediate(() => {
        recalculateNetworkMetrics().catch((e) => console.warn('Aviso ao recalcular métricas:', e));
      });

      return reply.send({
        success: true,
        message: 'Registro excluído com sucesso',
      });
    } catch (error: any) {
      console.error('Erro ao excluir usuário:', error);
      return reply.status(500).send({ 
        error: 'Falha ao excluir registro',
        detail: error?.message || String(error)
      });
    }
  });

  /**
   * Remoção de Gestor / Rebaixamento de cargo
   */
  fastify.delete('/api/gestores/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      await db.delete(schema.usuarios).where(eq(schema.usuarios.id, id));
      await recalculateNetworkMetrics().catch(() => {});
      return reply.send({ success: true, message: 'Gestor removido com sucesso' });
    } catch (error) {
      console.error('Erro ao remover gestor:', error);
      return reply.status(500).send({ error: 'Falha ao remover gestor' });
    }
  });
}
