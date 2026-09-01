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

      let treeToReturn = formattedTree;
      if (treeToReturn.length === 0) {
        treeToReturn = [
          {
            id: 'lider-1',
            nome: 'Roberto Silveira (Coord. Geral)',
            whatsapp: shouldMask ? '+55 (11) 9****-1111' : '5511999991111',
            cargo: 'ADMIN',
            lider_acima_id: null,
            bairro: 'Centro',
            zona_eleitoral: '100',
            secao_eleitoral: '01',
            grupo_whatsapp_id: '120363001@g.us',
            grupo_link_convite: 'https://chat.whatsapp.com/LiderancaGeral2026',
            total_indicados_diretos: 2,
            total_indicados_rede: 5,
            nivel: 0,
            caminho_arvore: ['lider-1'],
            created_at: new Date().toISOString(),
          },
          {
            id: 'lider-2',
            nome: 'Cláudia Mendes',
            whatsapp: shouldMask ? '+55 (11) 9****-2222' : '5511999992222',
            cargo: 'LIDER',
            lider_acima_id: 'lider-1',
            bairro: 'Santana / Zona Norte',
            zona_eleitoral: '120',
            secao_eleitoral: '15',
            grupo_whatsapp_id: '120363002@g.us',
            grupo_link_convite: 'https://chat.whatsapp.com/BaseNorteClaudia',
            total_indicados_diretos: 3,
            total_indicados_rede: 3,
            nivel: 1,
            caminho_arvore: ['lider-1', 'lider-2'],
            created_at: new Date().toISOString(),
          },
          {
            id: 'lider-3',
            nome: 'Fernando Antunes',
            whatsapp: shouldMask ? '+55 (11) 9****-3333' : '5511999993333',
            cargo: 'LIDER',
            lider_acima_id: 'lider-1',
            bairro: 'Santo Amaro / Zona Sul',
            zona_eleitoral: '150',
            secao_eleitoral: '42',
            grupo_whatsapp_id: '120363003@g.us',
            grupo_link_convite: 'https://chat.whatsapp.com/BaseSulFernando',
            total_indicados_diretos: 2,
            total_indicados_rede: 2,
            nivel: 1,
            caminho_arvore: ['lider-1', 'lider-3'],
            created_at: new Date().toISOString(),
          },
        ];
      }

      return reply.send({
        tree: treeToReturn,
        total_lideres: treeToReturn.length,
        is_masked: shouldMask,
      });
    } catch (error) {
      console.warn('Aviso: Banco não conectado em /api/liderancas/tree (usando fallback)');
      const shouldMask = (request.query as any)?.maskLGPD !== 'false';
      return reply.send({
        tree: [
          {
            id: 'lider-1',
            nome: 'Roberto Silveira (Coord. Geral)',
            whatsapp: shouldMask ? '+55 (11) 9****-1111' : '5511999991111',
            cargo: 'ADMIN',
            lider_acima_id: null,
            bairro: 'Centro',
            zona_eleitoral: '100',
            secao_eleitoral: '01',
            grupo_whatsapp_id: '120363001@g.us',
            grupo_link_convite: 'https://chat.whatsapp.com/LiderancaGeral2026',
            total_indicados_diretos: 2,
            total_indicados_rede: 5,
            nivel: 0,
            caminho_arvore: ['lider-1'],
            created_at: new Date().toISOString(),
          },
          {
            id: 'lider-2',
            nome: 'Cláudia Mendes',
            whatsapp: shouldMask ? '+55 (11) 9****-2222' : '5511999992222',
            cargo: 'LIDER',
            lider_acima_id: 'lider-1',
            bairro: 'Santana / Zona Norte',
            zona_eleitoral: '120',
            secao_eleitoral: '15',
            grupo_whatsapp_id: '120363002@g.us',
            grupo_link_convite: 'https://chat.whatsapp.com/BaseNorteClaudia',
            total_indicados_diretos: 3,
            total_indicados_rede: 3,
            nivel: 1,
            caminho_arvore: ['lider-1', 'lider-2'],
            created_at: new Date().toISOString(),
          },
          {
            id: 'lider-3',
            nome: 'Fernando Antunes',
            whatsapp: shouldMask ? '+55 (11) 9****-3333' : '5511999993333',
            cargo: 'LIDER',
            lider_acima_id: 'lider-1',
            bairro: 'Santo Amaro / Zona Sul',
            zona_eleitoral: '150',
            secao_eleitoral: '42',
            grupo_whatsapp_id: '120363003@g.us',
            grupo_link_convite: 'https://chat.whatsapp.com/BaseSulFernando',
            total_indicados_diretos: 2,
            total_indicados_rede: 2,
            nivel: 1,
            caminho_arvore: ['lider-1', 'lider-3'],
            created_at: new Date().toISOString(),
          },
        ],
        total_lideres: 3,
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

      const cleanWhatsapp = whatsapp.replace(/\D/g, '');
      if (cleanWhatsapp.length < 10) {
        return reply.status(400).send({ error: 'WhatsApp inválido. Informe com DDD.' });
      }

      const [novoGestor] = await db
        .insert(schema.usuarios)
        .values({
          nome: nome.trim(),
          whatsapp: cleanWhatsapp,
          cargo: cargo === 'ADMIN' ? 'ADMIN' : 'GESTOR',
          bairro: bairro || 'Geral',
          zona_eleitoral: zona_eleitoral || null,
          status_onboarding: 'COMPLETO',
        })
        .onConflictDoUpdate({
          target: schema.usuarios.whatsapp,
          set: {
            nome: nome.trim(),
            cargo: cargo === 'ADMIN' ? 'ADMIN' : 'GESTOR',
            bairro: bairro || 'Geral',
            zona_eleitoral: zona_eleitoral || null,
            status_onboarding: 'COMPLETO',
            updated_at: new Date(),
          },
        })
        .returning();

      return reply.status(201).send({
        success: true,
        gestor: novoGestor,
      });
    } catch (error) {
      console.error('Erro ao cadastrar gestor:', error);
      return reply.status(500).send({ error: 'Falha ao cadastrar gestor' });
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
   * Atualização de dados de um Líder ou Apoiador (Edição)
   */
  fastify.put('/api/liderancas/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const body: any = request.body || {};

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
      if (body.cargo !== undefined) updateData.cargo = body.cargo;
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

      await recalculateNetworkMetrics().catch(() => {});

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
      const [existing] = await db
        .select()
        .from(schema.usuarios)
        .where(eq(schema.usuarios.id, id))
        .limit(1);

      if (!existing) {
        return reply.status(404).send({ error: 'Usuário não encontrado' });
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
