/**
 * wppService.ts — DEPRECADO
 * ─────────────────────────────────────────────────────────────────────────────
 * O sistema agora usa EXCLUSIVAMENTE a WhatsApp Cloud API Oficial da Meta.
 * Este arquivo mantém os exports para compatibilidade durante a transição.
 * A integração Baileys foi completamente removida por segurança (risco de ban).
 *
 * Para envio de mensagens, use: metaCloudService.sendMetaTextMessage()
 * Para configuração, use: metaCloudService.saveMetaConfig()
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { sendMetaTextMessage, getMetaConfig } from './metaCloudService.js';

/** @deprecated Use getMetaConfig() de metaCloudService.ts */
export function getWhatsAppStatus() {
  return {
    status: 'META_CLOUD_API_ONLY',
    provider: 'META_CLOUD_API',
    message: 'Baileys removido. Use exclusivamente a Meta Cloud API.',
  };
}

/** @deprecated Use metaCloudService.sendMetaTextMessage() */
export async function sendWhatsAppMessage(to: string, text: string): Promise<boolean> {
  const result = await sendMetaTextMessage(to, text);
  return result.success;
}

/** @deprecated Não tem efeito — Meta Cloud API não usa QR Code */
export function initWhatsApp(): void {
  console.warn('[wppService] initWhatsApp() chamado mas Baileys foi removido. Use Meta Cloud API.');
}

/** @deprecated Não tem efeito — Meta Cloud API não tem sessão local */
export async function disconnectWhatsApp(): Promise<void> {
  console.warn('[wppService] disconnectWhatsApp() chamado mas Baileys foi removido.');
}

export { getMetaConfig };
