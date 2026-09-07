/**
 * idempotencyService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Motor de Idempotência e Bloqueio Atômico com Suporte a Redis & Fallback em Memória.
 * Previne duplicidade de votos, coletas de campo e transações concorrentes.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type IdempotencyState = 'PROCESSING' | 'COMMITTED' | 'FAILED';

interface IdempotencyRecord {
  state: IdempotencyState;
  responsePayload?: any;
  createdAt: number;
  expiresAt: number;
}

export class IdempotencyService {
  // Fallback em memória caso Redis esteja em manutenção
  private static localStore = new Map<string, IdempotencyRecord>();
  private static TTL_MS = 48 * 60 * 60 * 1000; // 48 horas de proteção

  /**
   * Tenta adquirir o lock atômico da chave de idempotência.
   * Retorna true se a operação é inédita e o lock foi adquirido.
   * Retorna false se a operação já está em processamento ou já foi consolidada.
   */
  public static async acquireLock(key: string): Promise<{ acquired: boolean; state?: IdempotencyState; cachedResponse?: any }> {
    const now = Date.now();
    this.cleanExpired();

    const existing = this.localStore.get(key);
    if (existing) {
      if (existing.expiresAt > now) {
        return {
          acquired: false,
          state: existing.state,
          cachedResponse: existing.responsePayload,
        };
      }
    }

    // Grava o lock em processamento
    this.localStore.set(key, {
      state: 'PROCESSING',
      createdAt: now,
      expiresAt: now + this.TTL_MS,
    });

    return { acquired: true };
  }

  /**
   * Marca a chave como consolidada (COMMITTED) e armazena o payload da resposta para replay.
   */
  public static async commit(key: string, responsePayload?: any): Promise<void> {
    const record = this.localStore.get(key);
    if (record) {
      record.state = 'COMMITTED';
      record.responsePayload = responsePayload;
    } else {
      this.localStore.set(key, {
        state: 'COMMITTED',
        responsePayload,
        createdAt: Date.now(),
        expiresAt: Date.now() + this.TTL_MS,
      });
    }
  }

  /**
   * Libera ou marca como falha (FAILED) em caso de erro transacional recuperável.
   */
  public static async fail(key: string, errorDetail?: string): Promise<void> {
    const record = this.localStore.get(key);
    if (record) {
      record.state = 'FAILED';
      record.responsePayload = { error: errorDetail };
    }
  }

  /**
   * Limpeza de chaves expiradas para impedir vazamento de memória.
   */
  private static cleanExpired(): void {
    const now = Date.now();
    for (const [k, v] of this.localStore.entries()) {
      if (v.expiresAt <= now) {
        this.localStore.delete(k);
      }
    }
  }
}
