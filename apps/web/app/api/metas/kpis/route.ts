import { NextResponse } from 'next/server';
import { db, schema } from '../../../../lib/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [totaisResult] = (await db.execute(sql`
      SELECT 
        COUNT(*) AS total_geral,
        COUNT(CASE WHEN cargo IN ('ADMIN', 'GESTOR', 'LIDER') THEN 1 END) AS total_lideres,
        COUNT(CASE WHEN cargo = 'APOIADOR' THEN 1 END) AS total_apoiadores,
        COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) AS cadastros_hoje
      FROM ${schema.usuarios};
    `)) as any;

    const metas = await db.select().from(schema.metas);
    const [config] = await db.select().from(schema.campanhaConfig).limit(1);

    const totalLideres = parseInt(totaisResult?.total_lideres || '0', 10);
    const totalApoiadores = parseInt(totaisResult?.total_apoiadores || '0', 10);
    const totalGeral = parseInt(totaisResult?.total_geral || '0', 10);
    const cadastrosHoje = parseInt(totaisResult?.cadastros_hoje || '0', 10);

    const metaGlobalObj = metas.find((m) => m.tipo === 'GLOBAL');
    const metaGlobalQtd = config?.meta_votos_global || metaGlobalObj?.quantidade_meta || 50000;
    const cadenciaMeta = config?.meta_captacao_diaria || metaGlobalObj?.meta_diaria_cadencia || 50;

    // Calcular dias restantes até a eleição
    let diasRestantes = 45;
    if (config?.data_eleicao) {
      const targetDate = new Date(config.data_eleicao);
      if (!isNaN(targetDate.getTime())) {
        const diffMs = targetDate.getTime() - Date.now();
        diasRestantes = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      }
    }

    const progressoPercentual = metaGlobalQtd > 0 ? totalGeral / metaGlobalQtd : 0;
    const cadenciaNecessaria = Math.max(0, Math.ceil((metaGlobalQtd - totalGeral) / diasRestantes));

    let statusSemaforo: 'VERDE' | 'AMARELO' | 'VERMELHO' = 'VERDE';
    if (cadastrosHoje < cadenciaNecessaria * 0.5) {
      statusSemaforo = 'VERMELHO';
    } else if (cadastrosHoje < cadenciaNecessaria) {
      statusSemaforo = 'AMARELO';
    }

    // 1. Radar Anti-Abandono Real
    const lideresDb = (await db.execute(sql`
      SELECT id, nome, whatsapp, bairro, zona_eleitoral, total_indicados_diretos, updated_at, created_at
      FROM ${schema.usuarios}
      WHERE cargo IN ('ADMIN', 'GESTOR', 'LIDER')
      ORDER BY updated_at ASC
    `)) as any[];

    const radarAbandono = (lideresDb || [])
      .map((l) => {
        const lastActivity = new Date(l.updated_at || l.created_at || Date.now()).getTime();
        const diasInativo = Math.max(0, Math.floor((Date.now() - lastActivity) / (1000 * 60 * 60 * 24)));
        return {
          id: l.id,
          nome: l.nome,
          regiao: l.bairro || (l.zona_eleitoral ? `Zona ${l.zona_eleitoral}` : 'Região Geral'),
          tel: String(l.whatsapp || '').replace(/\D/g, ''),
          dias: diasInativo,
          apoios: l.total_indicados_diretos || 0,
        };
      })
      .filter((l) => l.dias >= 2 || l.apoios === 0)
      .slice(0, 5);

    // 2. Top 5 Lideranças (Ranking Gamificado)
    const topLideresDb = (await db.execute(sql`
      SELECT id, nome, whatsapp, bairro, zona_eleitoral, total_indicados_diretos, total_indicados_rede
      FROM ${schema.usuarios}
      WHERE cargo IN ('ADMIN', 'GESTOR', 'LIDER')
      ORDER BY total_indicados_diretos DESC, total_indicados_rede DESC
      LIMIT 5
    `)) as any[];

    const medalhas = ['💎', '🥇', '🥈', '🥉', '⭐'];
    const badges = ['Diamante', 'Ouro', 'Prata', 'Bronze', 'Destaque'];

    const topLideres = (topLideresDb || []).map((l, index) => ({
      id: l.id,
      pos: `${index + 1}º`,
      medalha: medalhas[index] || '⭐',
      nome: l.nome,
      regiao: l.bairro || (l.zona_eleitoral ? `Zona ${l.zona_eleitoral}` : 'Região Geral'),
      votos: l.total_indicados_diretos || 0,
      badge: badges[index] || 'Líder Ativo',
    }));

    // 3. Termômetro de Pautas Real
    const setoresDb = (await db.execute(sql`
      SELECT setor, COUNT(*) as total
      FROM ${schema.mensagensChat}
      WHERE direcao = 'ENTRADA'
      GROUP BY setor
    `)) as any[];

    const totalMensagensEntrada = setoresDb.reduce((acc, s) => acc + parseInt(s.total || '0', 10), 0);

    const defaultPautas = [
      {
        tema: 'Saúde & Atendimento Comunitário',
        setorKey: 'SAUDE',
        perc: 40,
        mencoes: 0,
        cor: 'bg-emerald-500',
        textCor: 'text-emerald-700 dark:text-emerald-400',
      },
      {
        tema: 'Zeladoria Urbana, Asfalto & Serviços',
        setorKey: 'ZELADORIA',
        perc: 25,
        mencoes: 0,
        cor: 'bg-amber-500',
        textCor: 'text-amber-700 dark:text-amber-400',
      },
      {
        tema: 'Segurança Pública & Policiamento',
        setorKey: 'SEGURANCA',
        perc: 20,
        mencoes: 0,
        cor: 'bg-blue-500',
        textCor: 'text-blue-700 dark:text-blue-400',
      },
      {
        tema: 'Educação, Creches & Juventude',
        setorKey: 'EDUCACAO',
        perc: 15,
        mencoes: 0,
        cor: 'bg-purple-500',
        textCor: 'text-purple-700 dark:text-purple-400',
      },
    ];

    const termometroPautas = defaultPautas.map((p) => {
      const match = setoresDb.find((s) => s.setor === p.setorKey);
      const count = match ? parseInt(match.total || '0', 10) : 0;
      const calculatedPerc = totalMensagensEntrada > 0 ? Math.round((count / totalMensagensEntrada) * 100) : p.perc;
      return {
        ...p,
        mencoes: count,
        perc: calculatedPerc,
      };
    });

    const kpis = {
      total_lideres: totalLideres,
      total_apoiadores: totalApoiadores,
      cadastros_hoje: cadastrosHoje,
      meta_global: metaGlobalQtd,
      meta_lideres: config?.meta_lideres_global || 100,
      meta_apoiadores_por_lider: config?.meta_apoiadores_por_lider || 15,
      progresso_percentual: progressoPercentual,
      dias_restantes: diasRestantes,
      cadencia_diaria_atual: cadastrosHoje,
      cadencia_diaria_meta: cadenciaMeta,
      cadencia_diaria_necessaria: cadenciaNecessaria,
      status_semaforo: statusSemaforo,
      radar_abandono: radarAbandono,
      top_lideres: topLideres,
      termometro_pautas: termometroPautas,
    };

    return NextResponse.json({ kpis, metas, config });
  } catch (error: any) {
    console.error('Erro em /api/metas/kpis:', error);
    return NextResponse.json({ error: 'Falha ao buscar KPIs', detalhe: error?.message }, { status: 500 });
  }
}
