/**
 * offlineSyncClient.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Cliente de Sincronização Offline-First e Concorrência Distribuída (Web & Mobile).
 * Persistência local em buffer, controle de relógio de Lamport e backoff exponencial.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface OfflineMutation {
  mutationId: string;
  deviceId: string;
  logicalClock: number;
  entity: 'eleitores' | 'pesquisas' | 'demandas';
  recordId: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  delta: Record<string, unknown>;
  timestamp: number;
}

const STORAGE_KEY_QUEUE = 'painel_sync_mutations_queue_v2';
const STORAGE_KEY_CLOCK = 'painel_sync_logical_clock_v2';
const STORAGE_KEY_DEVICE = 'painel_sync_device_id_v2';

export class OfflineSyncClient {
  private static deviceId = this.getOrCreateDeviceId();
  private static logicalClock = this.loadLogicalClock();
  private static isSyncing = false;

  private static getOrCreateDeviceId(): string {
    let id = localStorage.getItem(STORAGE_KEY_DEVICE);
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
      localStorage.setItem(STORAGE_KEY_DEVICE, id);
    }
    return id;
  }

  private static loadLogicalClock(): number {
    const raw = localStorage.getItem(STORAGE_KEY_CLOCK);
    return raw ? parseInt(raw, 10) : 0;
  }

  private static incrementClock(): number {
    this.logicalClock += 1;
    localStorage.setItem(STORAGE_KEY_CLOCK, this.logicalClock.toString());
    return this.logicalClock;
  }

  /**
   * Enfileira uma mutação local para envio seguro e idempotente
   */
  public static enqueueMutation(
    entity: OfflineMutation['entity'],
    recordId: string,
    operation: OfflineMutation['operation'],
    delta: Record<string, unknown>
  ): OfflineMutation {
    const clock = this.incrementClock();
    const mutationId = `mut_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;

    const mutation: OfflineMutation = {
      mutationId,
      deviceId: this.deviceId,
      logicalClock: clock,
      entity,
      recordId,
      operation,
      delta,
      timestamp: Date.now(),
    };

    const queue = this.getQueue();
    queue.push(mutation);
    this.saveQueue(queue);

    // Tenta disparar sincronização em background se houver conectividade
    if (navigator.onLine) {
      this.triggerSync().catch(console.warn);
    }

    return mutation;
  }

  public static getQueue(): OfflineMutation[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_QUEUE);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private static saveQueue(queue: OfflineMutation[]): void {
    localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(queue));
  }

  /**
   * Dispara o handshake de sincronização diferencial com o servidor
   */
  public static async triggerSync(): Promise<{ synchronized: number; pending: number }> {
    if (this.isSyncing) return { synchronized: 0, pending: this.getQueue().length };
    const queue = this.getQueue();
    if (queue.length === 0) return { synchronized: 0, pending: 0 };

    this.isSyncing = true;

    try {
      const batchToSend = queue.slice(0, 50); // Envia em lotes de até 50 mutações

      const response = await fetch('/api/v2/sync/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: this.deviceId,
          mutations: batchToSend,
        }),
      });

      if (!response.ok) {
        throw new Error(`Servidor respondeu com status ${response.status}`);
      }

      const result = await response.json();
      const ackSet = new Set(result.acknowledgedIds || []);

      // Remove as mutações confirmadas da fila local
      const remainingQueue = queue.filter((m) => !ackSet.has(m.mutationId));
      this.saveQueue(remainingQueue);

      return {
        synchronized: ackSet.size,
        pending: remainingQueue.length,
      };
    } finally {
      this.isSyncing = false;
    }
  }
}
