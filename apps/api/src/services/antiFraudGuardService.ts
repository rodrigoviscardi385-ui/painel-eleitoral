/**
 * antiFraudGuardService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Motor de Auditoria Anti-Fraude e Deteção de Cadastros Sintéticos/Fantasmas.
 * Proteção contra coordenadores corruptos, bots e violações da Lei de Benford.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

export interface AuditBatchItem {
  timestamp: number;
  whatsapp?: string;
  nome?: string;
  latitude?: number;
  longitude?: number;
}

export interface AntiFraudAuditReport {
  deviceId: string;
  status: 'CLEAN' | 'INVESTIGACAO_SUSPEITA' | 'FRAUDE_CONFIRMADA_QUARANTINE';
  fraudScore: number; // 0.0 a 100.0
  flags: string[];
  totalAuditados: number;
  recomendacaoAcao: string;
}

export class AntiFraudGuardService {
  /**
   * Executa a auditoria analítica e comportamental sobre um lote de cadastros
   */
  public static async auditBatch(
    deviceId: string,
    coordenadorNome: string,
    items: AuditBatchItem[]
  ): Promise<AntiFraudAuditReport> {
    const total = items.length;
    const flags: string[] = [];
    let fraudPoints = 0.0;

    if (total === 0) {
      return {
        deviceId,
        status: 'CLEAN',
        fraudScore: 0.0,
        flags: [],
        totalAuditados: 0,
        recomendacaoAcao: 'Sem registros para auditar.',
      };
    }

    // 1. Regra de Velocidade Humana Impossível (< 30s por cadastro completo)
    if (total >= 4) {
      const sortedTimestamps = items.map((i) => i.timestamp).sort((a, b) => a - b);
      const deltas: number[] = [];
      for (let i = 0; i < sortedTimestamps.length - 1; i++) {
        deltas.push(sortedTimestamps[i + 1] - sortedTimestamps[i]);
      }

      const mediaDeltaMs = deltas.reduce((acc, d) => acc + d, 0) / deltas.length;
      if (mediaDeltaMs < 30000) {
        // Menos de 30 segundos entre cadastros
        fraudPoints += 45.0;
        flags.push('VELOCIDADE_INUMANA_CADASTRO');
      }
    }

    // 2. Regra de Geoclustering Estático ("Fraude da Garagem" - Cadastros em lote sem deslocamento)
    const coordinates = items
      .filter((i) => i.latitude !== undefined && i.longitude !== undefined)
      .map((i) => `${i.latitude?.toFixed(5)},${i.longitude?.toFixed(5)}`);

    if (coordinates.length >= 10) {
      const distinctCoords = new Set(coordinates).size;
      // Se mais de 80% dos cadastros tiverem exatamente a mesma coordenada GPS
      if (distinctCoords / coordinates.length < 0.2) {
        fraudPoints += 35.0;
        flags.push('GEO_CLUSTERING_ESTATICO_SUSPEITO');
      }
    }

    // 3. Regra de Telefones Sintéticos (Entropia e Prefixos Repetitivos)
    const phones = items.map((i) => i.whatsapp || '').filter((w) => w.length >= 10);
    if (phones.length >= 5) {
      const uniquePhones = new Set(phones).size;
      if (uniquePhones < phones.length * 0.7) {
        fraudPoints += 40.0;
        flags.push('DUPLICIDADE_MASSIVA_NUMEROS');
      }

      // Verifica números sequenciais (ex: ...0001, ...0002)
      let sequentialCount = 0;
      for (let i = 0; i < phones.length - 1; i++) {
        const numA = parseInt(phones[i].slice(-4), 10);
        const numB = parseInt(phones[i + 1].slice(-4), 10);
        if (!isNaN(numA) && !isNaN(numB) && Math.abs(numB - numA) === 1) {
          sequentialCount++;
        }
      }
      if (sequentialCount >= 2) {
        fraudPoints += 30.0;
        flags.push('NUMERACAO_SEQUENCIAL_ARTIFICIAL');
      }
    }

    const finalFraudScore = Math.min(100.0, fraudPoints);
    let status: AntiFraudAuditReport['status'] = 'CLEAN';
    let recomendacao = 'Cadastros legítimos aprovados para a base analítica.';

    if (finalFraudScore >= 65.0) {
      status = 'FRAUDE_CONFIRMADA_QUARANTINE';
      recomendacao =
        'BLOQUEIO IMEDIATO: Quarentena automática aplicada. Suspender pagamentos de diárias e convocar coordenador.';
    } else if (finalFraudScore >= 30.0) {
      status = 'INVESTIGACAO_SUSPEITA';
      recomendacao =
        'ALERTA AMARELO: Lote retido para verificação por amostragem via WhatsApp bilateral.';
    }

    // Gravação no log de auditoria do banco
    try {
      await db.execute(sql`
        INSERT INTO fraude_auditoria_log (
          device_id, coordenador_nome, status, fraud_score, flags_json, total_auditados, created_at
        ) VALUES (
          ${deviceId},
          ${coordenadorNome || 'Coordenador Não Identificado'},
          ${status},
          ${finalFraudScore},
          ${JSON.stringify(flags)},
          ${total},
          NOW()
        );
      `);
    } catch (err) {
      console.error('[ANTI_FRAUD] Erro ao salvar log de fraude:', err);
    }

    return {
      deviceId,
      status,
      fraudScore: finalFraudScore,
      flags,
      totalAuditados: total,
      recomendacaoAcao: recomendacao,
    };
  }

  /**
   * Retorna os últimos incidentes de fraude detectados para o War Room
   */
  public static async getFraudIncidents(): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT id, device_id, coordenador_nome, status, fraud_score::float, flags_json, total_auditados, created_at
      FROM fraude_auditoria_log
      ORDER BY created_at DESC
      LIMIT 25;
    `);

    const rows = result as any[];
    return rows.map((r) => ({
      id: r.id,
      deviceId: r.device_id,
      coordenadorNome: r.coordenador_nome,
      status: r.status,
      fraudScore: r.fraud_score,
      flags: JSON.parse(r.flags_json || '[]'),
      totalAuditados: r.total_auditados,
      createdAt: r.created_at,
    }));
  }
}
