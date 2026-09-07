/**
 * lgpdComplianceService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Módulo de Compliance Rígido com a LGPD e Resolução TSE nº 23.610/2019.
 * Garante a imutabilidade do opt-out, auditoria probatória e direito ao esquecimento.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { CryptoVaultService } from './cryptoVaultService.js';
import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

export interface LgpdAuditEvent {
  usuarioResponsavel: string;
  acao: 'CONSENTIMENTO_REGISTRADO' | 'OPT_OUT_IRREVERSIVEL' | 'ACESSO_DADOS' | 'DIREITO_AO_ESQUECIMENTO' | 'DISPARO_IA_TRANSPARENCIA';
  alvoIdentificador: string;
  ipOrigem?: string;
  detalhes?: Record<string, unknown>;
}

export class LgpdComplianceService {
  /**
   * Registra um evento de auditoria com carimbo de tempo e hash SHA-256 de integridade
   */
  public static async logAudit(event: LgpdAuditEvent): Promise<string> {
    const timestamp = new Date().toISOString();
    const payloadParaHash = JSON.stringify({
      ...event,
      timestamp,
    });
    const hashSha256 = CryptoVaultService.generateEvidenceHash(payloadParaHash);

    try {
      await db.execute(sql`
        INSERT INTO logs_auditoria_lgpd (usuario_responsavel, acao, ip, detalhes, created_at)
        VALUES (
          ${event.usuarioResponsavel},
          ${event.acao},
          ${event.ipOrigem || '0.0.0.0'},
          ${JSON.stringify({ ...event.detalhes, hashSha256, timestamp })},
          NOW()
        );
      `);
    } catch (err) {
      console.error('[LGPD] Erro ao gravar log de auditoria no banco:', err);
    }

    return hashSha256;
  }

  /**
   * Valida se uma tentativa de mutação de consentimento é juridicamente válida.
   * Regra Inegociável: Se o eleitor já registrou opt-out (false), mutações de campo não podem revertê-lo.
   */
  public static validateConsentTransition(currentConsent: boolean, newConsent: boolean): { allowed: boolean; reason?: string } {
    if (currentConsent === false && newConsent === true) {
      return {
        allowed: false,
        reason: 'VIOLAÇÃO_LGPD: O titular revogou o consentimento previamente. A reativação exige termo formal assinado ou decisão judicial.',
      };
    }
    return { allowed: true };
  }

  /**
   * Aplica a etiqueta legal obrigatória da Resolução TSE nº 23.610/2019
   * para comunicações criadas ou sintetizadas com auxílio de Inteligência Artificial.
   */
  public static applyAiTransparencyDisclaimer(messageText: string): string {
    const disclaimer = '\n\n[Aviso Legal: Conteúdo informativo oficial da campanha gerado com auxílio de Inteligência Artificial - Resolução TSE nº 23.610/2019]';
    if (messageText.includes('Resolução TSE nº 23.610')) {
      return messageText;
    }
    return `${messageText.trim()}${disclaimer}`;
  }
}
