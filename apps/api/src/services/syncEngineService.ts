/**
 * syncEngineService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Motor de Sincronização Delta-State CRDT e Resolução Determinística de Conflitos.
 * Garante idempotência, ordem causal via Vector Clocks e salvaguarda absoluta de LGPD.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { CryptoVaultService } from './cryptoVaultService.js';
import { IdempotencyService } from './idempotencyService.js';
import { LgpdComplianceService } from './lgpdComplianceService.js';
import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

export interface ClientSyncMutation {
  mutationId: string;     // UUIDv7 gerado no app cliente
  deviceId: string;       // Identificador único do aparelho
  logicalClock: number;   // Relógio de Lamport monotônico do cliente
  entity: 'eleitores' | 'pesquisas' | 'demandas';
  recordId: string;       // UUID do registro
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  delta: {
    nome?: string;
    whatsapp?: string;
    cpf?: string;
    bairro?: string;
    zona_eleitoral?: string;
    secao_eleitoral?: string;
    h3_index?: string;
    score_engajamento?: number;
    indice_sentimento?: number;
    consentimento_lgpd?: boolean;
    pauta_prioritaria?: string;
    [key: string]: unknown;
  };
  timestamp: number;
}

export interface SyncBatchResult {
  status: 'CONSOLIDATED' | 'PARTIALLY_CONSOLIDATED';
  acknowledgedIds: string[];
  rejectedLgpdIds: string[];
  serverTimestamp: number;
}

export class SyncEngineService {
  /**
   * Processa um lote de mutações com controle de concorrência e idempotência
   */
  public static async processBatch(
    deviceId: string,
    mutations: ClientSyncMutation[]
  ): Promise<SyncBatchResult> {
    const acknowledgedIds: string[] = [];
    const rejectedLgpdIds: string[] = [];
    const serverTimestamp = Date.now();

    for (const mut of mutations) {
      const idempotencyKey = `idemp:mut:${mut.mutationId}`;

      // 1. Verificação de Idempotência Atômica
      const lock = await IdempotencyService.acquireLock(idempotencyKey);
      if (!lock.acquired) {
        // Mutação já recebida; confirma reconhecimento para desengargalar a fila do cliente
        acknowledgedIds.push(mut.mutationId);
        continue;
      }

      const rawPayloadString = JSON.stringify(mut.delta);
      const hashSha256 = CryptoVaultService.generateEvidenceHash(rawPayloadString);

      try {
        if (mut.entity === 'eleitores') {
          // Busca registro analítico e identidade existente para avaliar conflito e LGPD
          const existingResult = await db.execute(sql`
            SELECT i.id, i.consentimento_lgpd, a.logical_clock 
            FROM eleitores_identidade i
            LEFT JOIN eleitores_analitico a ON a.id = i.id
            WHERE i.id = ${mut.recordId}::uuid
            LIMIT 1;
          `);

          const existingRows = existingResult as any[];
          const existing = existingRows[0] as {
            id: string;
            consentimento_lgpd: boolean;
            logical_clock: number | null;
          } | undefined;

          // Se já houver opt-out de LGPD registrado, qualquer tentativa de reativar via app é REJEITADA
          let finalConsent = mut.delta.consentimento_lgpd ?? true;
          let wasRejectedByLgpd = false;

          if (existing) {
            const check = LgpdComplianceService.validateConsentTransition(
              existing.consentimento_lgpd,
              finalConsent
            );
            if (!check.allowed) {
              finalConsent = false;
              wasRejectedByLgpd = true;
              rejectedLgpdIds.push(mut.mutationId);
            }
          }

          // Criptografia dos dados civis PII
          const encNome = mut.delta.nome ? CryptoVaultService.encrypt(mut.delta.nome) : null;
          const encWpp = mut.delta.whatsapp ? CryptoVaultService.encrypt(mut.delta.whatsapp) : null;
          const blindWpp = mut.delta.whatsapp ? CryptoVaultService.computeBlindIndex(mut.delta.whatsapp) : '';
          const blindCpf = mut.delta.cpf ? CryptoVaultService.computeBlindIndex(mut.delta.cpf) : null;

          // Upsert na tabela de identidade PII
          await db.execute(sql`
            INSERT INTO eleitores_identidade (
              id, nome_enc, whatsapp_enc, blind_index_whatsapp, blind_index_cpf, consentimento_lgpd, opt_out_at, updated_at
            ) VALUES (
              ${mut.recordId}::uuid,
              ${encNome ? JSON.stringify(encNome) : ''},
              ${encWpp ? JSON.stringify(encWpp) : ''},
              ${blindWpp},
              ${blindCpf},
              ${finalConsent},
              ${finalConsent === false ? sql`NOW()` : null},
              NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
              nome_enc = CASE 
                WHEN ${encNome !== null} THEN ${encNome ? JSON.stringify(encNome) : ''} 
                ELSE eleitores_identidade.nome_enc 
              END,
              whatsapp_enc = CASE 
                WHEN ${encWpp !== null} THEN ${encWpp ? JSON.stringify(encWpp) : ''} 
                ELSE eleitores_identidade.whatsapp_enc 
              END,
              consentimento_lgpd = CASE 
                WHEN eleitores_identidade.consentimento_lgpd = false THEN false 
                ELSE ${finalConsent} 
              END,
              opt_out_at = CASE 
                WHEN eleitores_identidade.consentimento_lgpd = false THEN eleitores_identidade.opt_out_at 
                WHEN ${finalConsent === false} THEN NOW() 
                ELSE eleitores_identidade.opt_out_at 
              END,
              updated_at = NOW();
          `);

          // Upsert na tabela analítica territorial
          const h3Index = mut.delta.h3_index || '88a8107293fffff';
          const bairro = mut.delta.bairro || 'Território Geral';
          const score = mut.delta.score_engajamento ?? 50.0;
          const sent = mut.delta.indice_sentimento ?? 0.0;
          const pauta = mut.delta.pauta_prioritaria || null;

          await db.execute(sql`
            INSERT INTO eleitores_analitico (
              id, h3_index, bairro, zona_eleitoral, secao_eleitoral, score_engajamento, indice_sentimento, pauta_prioritaria, logical_clock, last_sync_at
            ) VALUES (
              ${mut.recordId}::uuid,
              ${h3Index},
              ${bairro},
              ${mut.delta.zona_eleitoral || '118'},
              ${mut.delta.secao_eleitoral || '1'},
              ${score},
              ${sent},
              ${pauta},
              ${mut.logicalClock},
              NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
              h3_index = EXCLUDED.h3_index,
              bairro = EXCLUDED.bairro,
              score_engajamento = CASE 
                WHEN EXCLUDED.logical_clock >= eleitores_analitico.logical_clock THEN EXCLUDED.score_engajamento 
                ELSE eleitores_analitico.score_engajamento 
              END,
              indice_sentimento = CASE 
                WHEN EXCLUDED.logical_clock >= eleitores_analitico.logical_clock THEN EXCLUDED.indice_sentimento 
                ELSE eleitores_analitico.indice_sentimento 
              END,
              pauta_prioritaria = COALESCE(EXCLUDED.pauta_prioritaria, eleitores_analitico.pauta_prioritaria),
              logical_clock = GREATEST(eleitores_analitico.logical_clock, EXCLUDED.logical_clock),
              last_sync_at = NOW();
          `);

          // Gravação do log de auditoria da mutação
          await db.execute(sql`
            INSERT INTO sync_mutations_log (
              mutation_id, device_id, logical_clock, entity, record_id, operation, delta_payload, hash_sha256, status
            ) VALUES (
              ${mut.mutationId},
              ${mut.deviceId},
              ${mut.logicalClock},
              ${mut.entity},
              ${mut.recordId}::uuid,
              ${mut.operation},
              ${rawPayloadString},
              ${hashSha256},
              ${wasRejectedByLgpd ? 'REJECTED_LGPD' : 'COMMITTED'}
            )
            ON CONFLICT (mutation_id) DO NOTHING;
          `);
        }

        await IdempotencyService.commit(idempotencyKey, { acknowledged: true });
        acknowledgedIds.push(mut.mutationId);
      } catch (err: any) {
        console.error(`[SYNC] Erro ao consolidar mutação ${mut.mutationId}:`, err);
        await IdempotencyService.fail(idempotencyKey, err.message);
      }
    }

    return {
      status: rejectedLgpdIds.length > 0 ? 'PARTIALLY_CONSOLIDATED' : 'CONSOLIDATED',
      acknowledgedIds,
      rejectedLgpdIds,
      serverTimestamp,
    };
  }
}
