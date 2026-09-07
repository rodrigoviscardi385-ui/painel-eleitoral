import { FastifyInstance } from 'fastify';
import { db, logAuditLGPD } from '../db/index.js';
import * as schema from '../db/schema.js';
import crypto from 'crypto';

export async function backupRoutes(app: FastifyInstance) {
  // ─── Exportação de Backup (JSON Completo ou CSV) ──────────────────────────
  app.get('/api/backup/export', async (request, reply) => {
    const { format = 'json' } = request.query as any;

    try {
      const [
        usuarios,
        usuariosAuth,
        metas,
        campanhaConfig,
        botConfig,
        gastosCampanha,
        materiaisCampanha,
        gestoresCampanha,
        logsAuditoria,
        retiradasMateriais,
      ] = await Promise.all([
        db.select().from(schema.usuarios),
        db.select({
          id: schema.usuariosAuth.id,
          nome: schema.usuariosAuth.nome,
          email: schema.usuariosAuth.email,
          role: schema.usuariosAuth.role,
          created_at: schema.usuariosAuth.created_at,
        }).from(schema.usuariosAuth),
        db.select().from(schema.metas),
        db.select().from(schema.campanhaConfig),
        db.select().from(schema.botConfig),
        db.select().from(schema.gastosCampanha),
        db.select().from(schema.materiaisCampanha),
        db.select().from(schema.gestoresCampanha),
        db.select().from(schema.logsAuditoriaLGPD),
        db.select().from(schema.retiradasMateriais),
      ]);

      const timestamp = new Date().toISOString();
      const dateFormatted = timestamp.split('T')[0];

      // Exportação em formato CSV (Planilha Excel / Sheets)
      if (format === 'csv') {
        const headers = [
          'ID',
          'Nome',
          'WhatsApp',
          'Cargo',
          'Bairro',
          'Zona Eleitoral',
          'Secao Eleitoral',
          'Indicados Diretos',
          'Rede Total',
          'Link Grupo',
          'Data Cadastro',
        ];

        const rows = usuarios.map((u) => [
          u.id,
          `"${(u.nome || '').replace(/"/g, '""')}"`,
          `"${u.whatsapp || ''}"`,
          u.cargo || 'APOIADOR',
          `"${(u.bairro || '').replace(/"/g, '""')}"`,
          `"${u.zona_eleitoral || ''}"`,
          `"${u.secao_eleitoral || ''}"`,
          u.total_indicados_diretos || 0,
          u.total_indicados_rede || 0,
          `"${u.grupo_link_convite || ''}"`,
          u.created_at ? new Date(u.created_at).toISOString() : '',
        ]);

        const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');

        reply.header('Content-Type', 'text/csv; charset=utf-8');
        reply.header('Content-Disposition', `attachment; filename="liderancas_campanha_${dateFormatted}.csv"`);
        return reply.send(csvContent);
      }

      // Exportação em formato JSON (Snapshot Completo)
      const fullSnapshot = {
        sistema: 'Painel Eleitoral 2026',
        versao: '2.0.0',
        exported_at: timestamp,
        dados: {
          campanha_config: campanhaConfig,
          usuarios,
          usuarios_auth: usuariosAuth,
          metas,
          gastos_campanha: gastosCampanha,
          materiais_campanha: materiaisCampanha,
          retiradas_materiais: retiradasMateriais,
          gestores_campanha: gestoresCampanha,
          bot_config: botConfig,
          logs_auditoria_lgpd: logsAuditoria,
        },
        estatisticas: {
          total_eleitores_lideres: usuarios.length,
          total_metas: metas.length,
          total_gastos: gastosCampanha.length,
          total_materiais: materiaisCampanha.length,
          total_retiradas_materiais: retiradasMateriais.length,
        },
      };

      const rawJson = JSON.stringify(fullSnapshot, null, 2);
      const sha256Checksum = crypto.createHash('sha256').update(rawJson).digest('hex');

      const payloadFinal = {
        ...fullSnapshot,
        integrity_checksum_sha256: sha256Checksum,
      };

      await logAuditLGPD(
        'SISTEMA',
        'EXPORTAR_BACKUP',
        (request as any).ip,
        { format, total_registros: usuarios.length, checksum: sha256Checksum }
      );

      reply.header('Content-Type', 'application/json');
      reply.header('Content-Disposition', `attachment; filename="painel_eleitoral_backup_${dateFormatted}.json"`);
      return reply.send(payloadFinal);
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ error: 'Falha ao gerar backup', detalhe: err.message });
    }
  });

  // ─── Restauração de Backup JSON ──────────────────────────────────────────
  app.post('/api/backup/import', async (request, reply) => {
    try {
      const body = request.body as any;

      if (!body?.dados || !body?.sistema) {
        return reply.status(400).send({ error: 'Arquivo de backup inválido ou formato incompatível.' });
      }

      const { usuarios, metas, campanha_config, bot_config, gastos_campanha, materiais_campanha } = body.dados;

      let restoredUsers = 0;
      if (Array.isArray(usuarios) && usuarios.length > 0) {
        for (const u of usuarios) {
          await db
            .insert(schema.usuarios)
            .values({
              id: u.id,
              nome: u.nome,
              whatsapp: u.whatsapp,
              cargo: u.cargo || 'APOIADOR',
              lider_acima_id: u.lider_acima_id || null,
              bairro: u.bairro || null,
              zona_eleitoral: u.zona_eleitoral || null,
              secao_eleitoral: u.secao_eleitoral || null,
              status_onboarding: u.status_onboarding || 'COMPLETO',
              grupo_whatsapp_id: u.grupo_whatsapp_id || null,
              grupo_link_convite: u.grupo_link_convite || null,
              total_indicados_diretos: u.total_indicados_diretos || 0,
              total_indicados_rede: u.total_indicados_rede || 0,
              notas: u.notas || null,
              opt_out: u.opt_out || false,
              created_at: u.created_at ? new Date(u.created_at) : new Date(),
              updated_at: u.updated_at ? new Date(u.updated_at) : new Date(),
            })
            .onConflictDoNothing();
          restoredUsers++;
        }
      }

      let restoredMetas = 0;
      if (Array.isArray(metas) && metas.length > 0) {
        for (const m of metas) {
          await db
            .insert(schema.metas)
            .values({
              id: m.id,
              titulo: m.titulo,
              tipo: m.tipo || 'GLOBAL',
              alvo_referencia: m.alvo_referencia || null,
              quantidade_meta: m.quantidade_meta || 100,
              quantidade_atual: m.quantidade_atual || 0,
              data_inicio: m.data_inicio ? new Date(m.data_inicio) : new Date(),
              data_fim: m.data_fim ? new Date(m.data_fim) : new Date(Date.now() + 30 * 86400000),
              meta_diaria_cadencia: m.meta_diaria_cadencia || 10,
              status_semaforo: m.status_semaforo || 'VERDE',
              created_at: m.created_at ? new Date(m.created_at) : new Date(),
              updated_at: m.updated_at ? new Date(m.updated_at) : new Date(),
            })
            .onConflictDoNothing();
          restoredMetas++;
        }
      }

      await logAuditLGPD(
        'SISTEMA_BACKUP',
        'RESTAURACAO_BACKUP',
        (request as any).ip,
        { restored_users: restoredUsers, restored_metas: restoredMetas }
      );

      return {
        success: true,
        message: `Backup restaurado com sucesso! ${restoredUsers} usuários e ${restoredMetas} metas processados.`,
        checksum: body.integrity_checksum_sha256 || 'N/A',
      };
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ error: 'Erro ao restaurar backup', detalhe: err.message });
    }
  });
}
