/**
 * quocienteBiService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Módulo de BI Executivo: Métrica da Vitória e Cálculo do Quociente Eleitoral.
 * Modela QE, QP, Cláusula de Desempenho Individual e Contagem Regressiva de Votos.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

export interface QuocienteBiData {
  cargo: string;
  totalAptosProjetado: number;
  abstencaoEsperadaPct: number;
  brancosNulosEsperadoPct: number;
  votosValidosProjetados: number;
  totalVagasCasa: number;
  quocienteEleitoral: number;
  clausulaDesempenhoIndividual: number; // 10% do QE (Deputados) ou 20% (Vereadores)
  metaNominalCandidato: number;
  margemSegurancaTatica: number; // Buffer de +18% sobre a meta
  votosAuditadosAtual: number;
  votosDeclaradosAtual: number;
  votosAuditadosFaltantes: number;
  indiceSegurancaEleicaoPct: number;
  statusProjecao: 'ZONA_CRITICA' | 'EM_DISPUTA' | 'ZONA_DE_SEGURANCA' | 'ELEITO_PROJETADO';
}

export class QuocienteBiService {
  /**
   * Obtém a projeção consolidada e métricas do Quociente Eleitoral
   */
  public static async getQuocienteMetrics(): Promise<QuocienteBiData> {
    const result = await db.execute(sql`
      SELECT 
        cargo,
        total_aptos_projetado,
        abstencao_esperada_pct::float AS abstencao_esperada_pct,
        brancos_nulos_esperado_pct::float AS brancos_nulos_esperado_pct,
        total_vagas_casa,
        quociente_eleitoral,
        meta_nominal_candidato,
        votos_auditados_atual,
        votos_declarados_atual
      FROM bi_quociente_eleitoral
      LIMIT 1;
    `);

    const rows = result as any[];
    let row = rows[0];

    // Seed inicial padrão caso a tabela ainda não possua registro
    if (!row) {
      row = {
        cargo: 'DEPUTADO_FEDERAL',
        total_aptos_projetado: 340000,
        abstencao_esperada_pct: 21.5,
        brancos_nulos_esperado_pct: 8.5,
        total_vagas_casa: 70,
        quociente_eleitoral: 68000,
        meta_nominal_candidato: 55000,
        votos_auditados_atual: 18450,
        votos_declarados_atual: 39200,
      };

      await db.execute(sql`
        INSERT INTO bi_quociente_eleitoral (
          cargo, total_aptos_projetado, abstencao_esperada_pct, brancos_nulos_esperado_pct, total_vagas_casa, quociente_eleitoral, meta_nominal_candidato, votos_auditados_atual, votos_declarados_atual, updated_at
        ) VALUES (
          ${row.cargo}, ${row.total_aptos_projetado}, ${row.abstencao_esperada_pct}, ${row.brancos_nulos_esperado_pct}, ${row.total_vagas_casa}, ${row.quociente_eleitoral}, ${row.meta_nominal_candidato}, ${row.votos_auditados_atual}, ${row.votos_declarados_atual}, NOW()
        );
      `);
    }

    // Cálculos matemáticos eleitorais
    const totalAptos = Number(row.total_aptos_projetado);
    const abstencaoPct = Number(row.abstencao_esperada_pct) / 100.0;
    const brancosNulosPct = Number(row.brancos_nulos_esperado_pct) / 100.0;
    const vagas = Math.max(1, Number(row.total_vagas_casa));

    const totalComparecimento = totalAptos * (1.0 - abstencaoPct);
    const votosValidos = Math.round(totalComparecimento * (1.0 - brancosNulosPct));
    const qeCalculado = Math.floor(votosValidos / vagas);

    // Cláusula de desempenho individual (10% para deputados - Art. 108 Código Eleitoral)
    const clausulaIndividual = Math.round(qeCalculado * 0.1);
    const metaNominal = Number(row.meta_nominal_candidato) || qeCalculado;
    const margemSeguranca = Math.round(metaNominal * 1.18); // +18% de gordura de segurança

    const votosAuditados = Number(row.votos_auditados_atual);
    const votosDeclarados = Number(row.votos_declarados_atual);
    const faltantes = Math.max(0, metaNominal - votosAuditados);
    const indiceSeguranca = Math.min(100.0, (votosAuditados / metaNominal) * 100.0);

    let status: QuocienteBiData['statusProjecao'] = 'ZONA_CRITICA';
    if (indiceSeguranca >= 100.0) status = 'ELEITO_PROJETADO';
    else if (indiceSeguranca >= 75.0) status = 'ZONA_DE_SEGURANCA';
    else if (indiceSeguranca >= 40.0) status = 'EM_DISPUTA';

    return {
      cargo: row.cargo,
      totalAptosProjetado: totalAptos,
      abstencaoEsperadaPct: Number(row.abstencao_esperada_pct),
      brancosNulosEsperadoPct: Number(row.brancos_nulos_esperado_pct),
      votosValidosProjetados: votosValidos,
      totalVagasCasa: vagas,
      quocienteEleitoral: qeCalculado,
      clausulaDesempenhoIndividual: clausulaIndividual,
      metaNominalCandidato: metaNominal,
      margemSegurancaTatica: margemSeguranca,
      votosAuditadosAtual: votosAuditados,
      votosDeclaradosAtual: votosDeclarados,
      votosAuditadosFaltantes: faltantes,
      indiceSegurancaEleicaoPct: Number(indiceSeguranca.toFixed(1)),
      statusProjecao: status,
    };
  }

  /**
   * Atualiza a contagem de votos auditados dinamicamente baseada nos cadastros ativos
   */
  public static async refreshAuditCounts(): Promise<void> {
    const result = await db.execute(sql`
      SELECT 
        COUNT(*) FILTER (WHERE consentimento_lgpd = true) AS auditados,
        COUNT(*) AS total_declarados
      FROM eleitores_identidade;
    `);

    const rows = result as any[];
    if (rows.length > 0) {
      const auditados = Number(rows[0].auditados || 0);
      const total = Number(rows[0].total_declarados || 0);

      await db.execute(sql`
        UPDATE bi_quociente_eleitoral
        SET votos_auditados_atual = ${auditados},
            votos_declarados_atual = ${total},
            updated_at = NOW();
      `);
    }
  }
}
