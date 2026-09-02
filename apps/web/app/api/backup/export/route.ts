import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '../../../../lib/db';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'json';

    // 1. Extração de todos os dados relacionais
    const [
      usuarios,
      usuariosAuth,
      metas,
      campanhaConfig,
      botConfig,
      mensagensChat,
      disparosCampanha,
      disparosItens,
      materiaisOnline,
      logsAuditoria,
    ] = await Promise.all([
      db.select().from(schema.usuarios),
      db.select().from(schema.usuariosAuth),
      db.select().from(schema.metas),
      db.select().from(schema.campanhaConfig),
      db.select().from(schema.botConfig),
      db.select().from(schema.mensagensChat),
      db.select().from(schema.disparosCampanha),
      db.select().from(schema.disparosItens),
      db.select().from(schema.materiaisOnline),
      db.select().from(schema.logsAuditoriaLGPD),
    ]);

    const timestamp = new Date().toISOString();
    const dateFormatted = new Date().toISOString().split('T')[0];

    // Se o usuário solicitou CSV (ideal para planilha em pendrive/excel)
    if (format === 'csv') {
      const headers = ['ID', 'Nome', 'WhatsApp', 'Cargo', 'Bairro', 'Zona Eleitoral', 'Secao Eleitoral', 'Total Indicados Diretos', 'Total Indicados Rede', 'Opt Out', 'Data Cadastro'];
      const rows = usuarios.map((u) => [
        u.id,
        `"${(u.nome || '').replace(/"/g, '""')}"`,
        `"${u.whatsapp}"`,
        u.cargo,
        `"${u.bairro || ''}"`,
        `"${u.zona_eleitoral || ''}"`,
        `"${u.secao_eleitoral || ''}"`,
        u.total_indicados_diretos || 0,
        u.total_indicados_rede || 0,
        u.opt_out ? 'SIM' : 'NAO',
        u.created_at ? new Date(u.created_at).toLocaleString('pt-BR') : '',
      ]);

      const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="painel-eleitoral-liderancas-${dateFormatted}.csv"`,
        },
      });
    }

    // Backup Integral em JSON com Checksum SHA-256
    const backupData = {
      versao_schema: '2026.1',
      gerado_em: timestamp,
      sistema: 'Painel Eleitoral 2026',
      campanha: campanhaConfig[0] || null,
      totais: {
        usuarios: usuarios.length,
        metas: metas.length,
        mensagens: mensagensChat.length,
        disparos: disparosCampanha.length,
        materiais: materiaisOnline.length,
        logs_auditoria: logsAuditoria.length,
      },
      dados: {
        usuarios,
        usuarios_auth: usuariosAuth.map((a) => ({ ...a, senha_hash: '[PROTEGIDO]' })),
        metas,
        campanha_config: campanhaConfig,
        bot_config: botConfig,
        mensagens_chat: mensagensChat,
        disparos_campanha: disparosCampanha,
        disparos_itens: disparosItens,
        materiais_online: materiaisOnline,
        logs_auditoria_lgpd: logsAuditoria,
      },
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    const checksum = crypto.createHash('sha256').update(jsonString).digest('hex');

    const finalPayload = {
      integrity_checksum_sha256: checksum,
      ...backupData,
    };

    return new NextResponse(JSON.stringify(finalPayload, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="backup-painel-eleitoral-${dateFormatted}.json"`,
      },
    });
  } catch (error: any) {
    console.error('Erro ao gerar backup:', error);
    return NextResponse.json({ error: 'Falha na geração do backup', detalhe: error?.message }, { status: 500 });
  }
}
