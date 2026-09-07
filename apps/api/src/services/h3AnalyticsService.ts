/**
 * h3AnalyticsService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Motor Geoespacial de Inteligência Hexagonal (Uber H3 Resolução 8).
 * Agrega sentimento, votos em risco e índice de Retorno sobre Visita (RoV).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

export interface H3HexFeature {
  h3Index: string;
  bairro: string;
  totalEleitores: number;
  votosProjetados: number;
  indiceSentimento: number;
  indiceRiscoPerda: number;
  indiceRov: number; // Return on Visit (0.0 a 100.0)
  statusTatico: 'CONSOLIDADO' | 'ZONA_DE_DISPUTA' | 'ZONA_CRITICA';
}

export class H3AnalyticsService {
  /**
   * Obtém a malha de hexágonos territoriais computados para o War Room
   */
  public static async getHexAnalytics(): Promise<H3HexFeature[]> {
    const result = await db.execute(sql`
      SELECT 
        h3_index,
        bairro,
        total_eleitores,
        votos_projetados,
        indice_sentimento_liquido::float AS indice_sentimento,
        indice_risco_perda::float AS indice_risco,
        indice_rov::float AS indice_rov
      FROM territorio_hex_analytics
      ORDER BY indice_rov DESC;
    `);

    const rows = result as any[];

    if (rows.length === 0) {
      // Se a tabela estiver vazia, gera seed tático padrão dos bairros centrais
      return this.seedDefaultTerritories();
    }

    return rows.map((r) => {
      let status: H3HexFeature['statusTatico'] = 'CONSOLIDADO';
      if (r.indice_risco > 0.6) status = 'ZONA_CRITICA';
      else if (r.indice_risco > 0.3) status = 'ZONA_DE_DISPUTA';

      return {
        h3Index: r.h3_index,
        bairro: r.bairro,
        totalEleitores: Number(r.total_eleitores),
        votosProjetados: Number(r.votos_projetados),
        indiceSentimento: Number(r.indice_sentimento),
        indiceRiscoPerda: Number(r.indice_risco),
        indiceRov: Number(r.indice_rov),
        statusTatico: status,
      };
    });
  }

  /**
   * Gera dados de demonstração tática caso a base esteja virgem
   */
  public static async seedDefaultTerritories(): Promise<H3HexFeature[]> {
    const defaultTerritories = [
      { h3: '88a8107293fffff', bairro: 'Gonzaga', eleitores: 8400, votos: 3200, sent: 0.42, risco: 0.25, rov: 68.5 },
      { h3: '88a8107291fffff', bairro: 'Boqueirão', eleitores: 9100, votos: 4100, sent: 0.58, risco: 0.18, rov: 54.0 },
      { h3: '88a8107297fffff', bairro: 'Ponta da Praia', eleitores: 7200, votos: 2800, sent: 0.35, risco: 0.38, rov: 72.0 },
      { h3: '88a8107295fffff', bairro: 'Embaré', eleitores: 6500, votos: 2900, sent: 0.62, risco: 0.15, rov: 48.2 },
      { h3: '88a8107283fffff', bairro: 'Aparecida', eleitores: 8900, votos: 3100, sent: -0.15, risco: 0.68, rov: 89.4 },
      { h3: '88a8107281fffff', bairro: 'Campo Grande', eleitores: 5800, votos: 1800, sent: -0.32, risco: 0.79, rov: 94.6 },
      { h3: '88a8107287fffff', bairro: 'Marapé', eleitores: 4900, votos: 2100, sent: 0.10, risco: 0.45, rov: 76.8 },
      { h3: '88a8107285fffff', bairro: 'Vila Mathias', eleitores: 6100, votos: 2400, sent: -0.05, risco: 0.55, rov: 81.3 },
    ];

    for (const t of defaultTerritories) {
      await db.execute(sql`
        INSERT INTO territorio_hex_analytics (
          h3_index, bairro, total_eleitores, votos_projetados, indice_sentimento_liquido, indice_risco_perda, indice_rov, updated_at
        ) VALUES (
          ${t.h3}, ${t.bairro}, ${t.eleitores}, ${t.votos}, ${t.sent}, ${t.risco}, ${t.rov}, NOW()
        )
        ON CONFLICT (h3_index) DO UPDATE SET
          indice_rov = EXCLUDED.indice_rov,
          indice_risco_perda = EXCLUDED.indice_risco_perda,
          updated_at = NOW();
      `);
    }

    return defaultTerritories.map((t) => ({
      h3Index: t.h3,
      bairro: t.bairro,
      totalEleitores: t.eleitores,
      votosProjetados: t.votos,
      indiceSentimento: t.sent,
      indiceRiscoPerda: t.risco,
      indiceRov: t.rov,
      statusTatico: t.risco > 0.6 ? 'ZONA_CRITICA' : t.risco > 0.3 ? 'ZONA_DE_DISPUTA' : 'CONSOLIDADO',
    }));
  }
}
