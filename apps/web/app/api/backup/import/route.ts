import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body?.dados || !body?.sistema) {
      return NextResponse.json({ error: 'Arquivo de backup inválido ou corrompido' }, { status: 400 });
    }

    const { usuarios, metas, campanha_config, bot_config } = body.dados;

    let restoredUsers = 0;
    if (Array.isArray(usuarios) && usuarios.length > 0) {
      for (const u of usuarios) {
        await db
          .insert(schema.usuarios)
          .values({
            id: u.id,
            nome: u.nome,
            whatsapp: u.whatsapp,
            cargo: u.cargo,
            lider_acima_id: u.lider_acima_id || null,
            bairro: u.bairro || '',
            zona_eleitoral: u.zona_eleitoral || '',
            secao_eleitoral: u.secao_eleitoral || '',
            total_indicados_diretos: u.total_indicados_diretos || 0,
            total_indicados_rede: u.total_indicados_rede || 0,
            opt_out: u.opt_out || false,
            created_at: u.created_at ? new Date(u.created_at) : new Date(),
          })
          .onConflictDoNothing();
        restoredUsers++;
      }
    }

    // Registrar log de restauração
    await db.insert(schema.logsAuditoriaLGPD).values({
      usuario_responsavel: 'SISTEMA_BACKUP',
      acao: 'RESTAURACAO_BACKUP',
      detalhes: `Restauração de backup realizada com sucesso (${restoredUsers} eleitores/líderes processados)`,
      ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({
      success: true,
      message: `Backup restaurado com sucesso! ${restoredUsers} registros processados.`,
      checksum: body.integrity_checksum_sha256 || 'N/A',
    });
  } catch (error: any) {
    console.error('Erro ao restaurar backup:', error);
    return NextResponse.json({ error: 'Falha ao restaurar backup', detalhe: error?.message }, { status: 500 });
  }
}
