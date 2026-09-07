/**
 * ocrService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * OCR (Tesseract.js) e decodificação de QR Code.
 * Melhorias:
 *   • Limite de 5MB por buffer para evitar travamento do event loop
 *   • Aviso de tamanho excedido com retorno gracioso
 *   • Suporte a idioma português + inglês para documentos mistos
 * ─────────────────────────────────────────────────────────────────────────────
 */

import Tesseract from 'tesseract.js';
import jsQR from 'jsqr';

const MAX_OCR_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Executa OCR em um buffer de imagem (recibo, cupom fiscal ou boletim de urna).
 * Retorna string vazia se o arquivo exceder 5MB ou OCR falhar.
 */
export async function ocrImageBuffer(buffer: Buffer): Promise<string> {
  if (buffer.length > MAX_OCR_BYTES) {
    console.warn(`[OCR] Imagem excede ${Math.round(MAX_OCR_BYTES / 1024 / 1024)}MB — OCR ignorado para proteger o servidor.`);
    return '';
  }

  try {
    const {
      data: { text },
    } = await Tesseract.recognize(buffer, 'por+eng', {
      logger: () => {}, // silencioso
    });
    return text?.trim() || '';
  } catch (error: any) {
    console.error('[OCR Error]', error?.message || error);
    return '';
  }
}

/**
 * Tenta decodificar QR Code de buffer RGBA
 */
export function decodeQrCodeFromBuffer(rgbaData: Uint8ClampedArray, width: number, height: number): string | null {
  try {
    const jsQRFn = (jsQR as any).default || jsQR;
    const code = jsQRFn(rgbaData, width, height);
    return code ? code.data : null;
  } catch (err) {
    console.warn('[jsQR Decode Error]', err);
    return null;
  }
}
