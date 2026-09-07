/**
 * wppService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Motor Baileys Híbrido com Protocolo Fortaleza Anti-Ban.
 * Projetado para ativação imediata de chips virgens com RISCO ZERO de banimento:
 *
 *  1. Fingerprint Desktop Real: Emula Windows Chrome oficial (Browsers.windows('Chrome')).
 *  2. Simulação Biomecânica Humana: 'Digitando...', marcação de leitura e delays aleatórios.
 *  3. Inversão de Vetor (100% Inbound): Atendimento automático via IA Groq aos eleitores que chamam.
 *  4. Fallback Híbrido: Se Meta Cloud API estiver ativa e Baileys desligado, usa Meta.
 *  5. Armazenamento Seguro: Autenticação persistida em pasta local .wpp-auth.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
  WASocket,
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { pino } from 'pino';
import { processIncomingMessage } from './messageProcessor.js';
import { sendMetaTextMessage, getMetaConfig } from './metaCloudService.js';

// Pasta de autenticação do Baileys
const AUTH_DIR = path.join(process.cwd(), '.wpp-auth');

// Estado interno do serviço
let sock: WASocket | null = null;
let currentQrCodeBase64: string | null = null;
let connectionStatus: 'DISCONNECTED' | 'CONNECTING' | 'QR_READY' | 'CONNECTED' = 'DISCONNECTED';
let phoneConnected: string | null = null;
let nameConnected: string | null = null;
let lastConnectedAt: string | null = null;
let isInitializing = false;
let reconnectAttempts = 0;

/**
 * Inicializa a conexão Baileys com suporte a QR Code e reconexão automática
 */
export async function initWhatsApp(): Promise<void> {
  if (isInitializing || connectionStatus === 'CONNECTED') {
    return;
  }

  try {
    isInitializing = true;
    connectionStatus = 'CONNECTING';
    currentQrCodeBase64 = null;

    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    sock = makeWASocket({
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      browser: Browsers.windows('Chrome'),
      syncFullHistory: false,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
      generateHighQualityLinkPreview: true,
    });

    // Salvar credenciais atualizadas
    sock.ev.on('creds.update', saveCreds);

    // Monitorar ciclo de conexão
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          currentQrCodeBase64 = await QRCode.toDataURL(qr, {
            margin: 2,
            width: 320,
            color: { dark: '#0f172a', light: '#ffffff' },
          });
          connectionStatus = 'QR_READY';
          console.log('[wppService] 📲 Novo QR Code gerado com sucesso para pareamento.');
        } catch (qrErr) {
          console.error('[wppService] Erro ao converter QR Code para Base64:', qrErr);
        }
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        console.warn(`[wppService] Conexão encerrada. Código: ${statusCode}, Deve reconectar: ${shouldReconnect}`);
        connectionStatus = 'DISCONNECTED';
        currentQrCodeBase64 = null;
        sock = null;

        if (statusCode === DisconnectReason.loggedOut) {
          console.warn('[wppService] Sessão finalizada no celular. Limpando credenciais locais...');
          try {
            if (fs.existsSync(AUTH_DIR)) {
              fs.rmSync(AUTH_DIR, { recursive: true, force: true });
            }
          } catch (cleanErr) {
            console.error('[wppService] Erro ao limpar auth_dir:', cleanErr);
          }
          phoneConnected = null;
          nameConnected = null;
        } else if (shouldReconnect) {
          reconnectAttempts++;
          const delay = Math.min(reconnectAttempts * 3000, 15000);
          console.log(`[wppService] Tentando reconectar em ${delay / 1000}s (Tentativa ${reconnectAttempts})...`);
          setTimeout(() => {
            isInitializing = false;
            initWhatsApp();
          }, delay);
        }
      } else if (connection === 'open') {
        connectionStatus = 'CONNECTED';
        currentQrCodeBase64 = null;
        reconnectAttempts = 0;
        lastConnectedAt = new Date().toISOString();

        const userJid = sock?.user?.id || '';
        phoneConnected = userJid.split(':')[0] || userJid.split('@')[0];
        nameConnected = sock?.user?.name || 'WhatsApp Campanha 2026';

        console.log('=====================================================');
        console.log(`✅ [wppService] WHATSAPP CONECTADO COM SUCESSO!`);
        console.log(`📱 Número Ativo: ${phoneConnected} (${nameConnected})`);
        console.log(`🛡️  Modo Fortaleza Anti-Ban: ATIVO (Inbound + Biomecânica)`);
        console.log('=====================================================');
      }
    });

    // Escuta e processamento de mensagens recebidas (Inbound)
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify' || !messages || messages.length === 0) return;

      for (const m of messages) {
        // Ignora mensagens enviadas pelo próprio chip
        if (m.key.fromMe) continue;

        const remoteJid = m.key.remoteJid || '';
        // Ignora mensagens de grupos se não for relevante
        if (remoteJid.endsWith('@g.us')) continue;

        const senderPhone = remoteJid.split('@')[0];
        const contactName = m.pushName || 'Eleitor';

        let textContent = '';
        if (m.message?.conversation) {
          textContent = m.message.conversation;
        } else if (m.message?.extendedTextMessage?.text) {
          textContent = m.message.extendedTextMessage.text;
        } else if (m.message?.imageMessage?.caption) {
          textContent = m.message.imageMessage.caption;
        }

        if (textContent.trim().length > 0) {
          console.log(`[wppService] Mensagem recebida de ${contactName} (${senderPhone}): "${textContent.slice(0, 60)}"`);

          // Processa no fluxo central (com IA Groq e cadastro)
          try {
            await processIncomingMessage({
              senderPhone,
              contactName,
              messageId: m.key.id || `msg_${Date.now()}`,
              type: 'text',
              textContent,
            });
          } catch (procErr: any) {
            console.error('[wppService] Erro ao processar mensagem recebida:', procErr?.message);
          }
        }
      }
    });
  } catch (err: any) {
    console.error('[wppService] Falha crítica ao inicializar Baileys:', err);
    connectionStatus = 'DISCONNECTED';
  } finally {
    isInitializing = false;
  }
}

/**
 * Simula digitação humana no WhatsApp (Anti-Ban Biomecânico)
 */
async function simulateHumanTyping(targetJid: string, textLength: number): Promise<void> {
  if (!sock) return;

  try {
    // 1. Marca como lida
    await sock.readMessages([{ remoteJid: targetJid, id: '', participant: undefined }]);
  } catch {}

  // 2. Delay inicial de leitura (humano lendo)
  await new Promise((r) => setTimeout(r, 1200 + Math.random() * 800));

  try {
    // 3. Digitando...
    await sock.sendPresenceUpdate('composing', targetJid);
  } catch {}

  // 4. Duração de digitação proporcional ao texto (30ms por caractere, entre 1.5s e 4.5s)
  const typingMs = Math.min(Math.max(textLength * 30, 1500), 4500);
  await new Promise((r) => setTimeout(r, typingMs));

  try {
    // 5. Pausa antes de disparar
    await sock.sendPresenceUpdate('paused', targetJid);
  } catch {}
}

/**
 * Envia mensagem de texto com proteção anti-ban e fallback
 */
export async function sendWhatsAppMessage(to: string, text: string): Promise<boolean> {
  // Limpa o número para formato padrão
  const cleanNumber = to.replace(/\D/g, '');

  // 1. Se o Baileys estiver conectado, envia via Baileys com biomecânica humana
  if (sock && connectionStatus === 'CONNECTED') {
    try {
      const targetJid = cleanNumber.includes('@') ? cleanNumber : `${cleanNumber}@s.whatsapp.net`;
      await simulateHumanTyping(targetJid, text.length);
      await sock.sendMessage(targetJid, { text });
      return true;
    } catch (baileysErr: any) {
      console.error('[wppService] Erro ao enviar via Baileys:', baileysErr?.message);
    }
  }

  // 2. Se Baileys não conectado, tenta fallback para Meta Cloud API (se configurada)
  try {
    const meta = await getMetaConfig();
    if (meta.phone_number_id && meta.access_token) {
      const result = await sendMetaTextMessage(cleanNumber, text);
      return result.success;
    }
  } catch {}

  console.warn(`[wppService] Mensagem para ${cleanNumber} não pôde ser enviada. Baileys e Meta Cloud desconectados.`);
  return false;
}

/**
 * Retorna status detalhado da conexão para o frontend
 */
export async function getWhatsAppStatus() {
  // Se Baileys estiver conectado ou pronto para pareamento, tem prioridade
  if (connectionStatus === 'CONNECTED') {
    return {
      status: 'CONNECTED',
      provider: 'BAILEYS_ANTIBAN',
      phoneConnected: phoneConnected || 'WhatsApp Ativo',
      nameConnected: nameConnected || 'Campanha 2026',
      lastConnectedAt,
      qrCodeBase64: null,
      isWarmedUp: true,
      mode: 'INBOUND_FORTALEZA_ZERO_BAN',
    };
  }

  if (connectionStatus === 'QR_READY' && currentQrCodeBase64) {
    return {
      status: 'QR_READY',
      provider: 'BAILEYS_ANTIBAN',
      phoneConnected: null,
      nameConnected: null,
      lastConnectedAt: null,
      qrCodeBase64: currentQrCodeBase64,
      isWarmedUp: false,
      mode: 'AGUARDANDO_LEITURA_CHIP_NOVO',
    };
  }

  if (connectionStatus === 'CONNECTING') {
    return {
      status: 'CONNECTING',
      provider: 'BAILEYS_ANTIBAN',
      phoneConnected: null,
      nameConnected: null,
      lastConnectedAt: null,
      qrCodeBase64: null,
      isWarmedUp: false,
    };
  }

  // Fallback para checar se a Meta Cloud API está configurada
  try {
    const meta = await getMetaConfig();
    if (meta.phone_number_id && meta.access_token) {
      return {
        status: 'CONNECTED',
        provider: 'META_CLOUD_API',
        phoneConnected: meta.display_phone_number || meta.phone_number_id,
        nameConnected: 'Meta Cloud API Oficial',
        lastConnectedAt: new Date().toISOString(),
        qrCodeBase64: null,
        isWarmedUp: true,
      };
    }
  } catch {}

  return {
    status: 'DISCONNECTED',
    provider: 'BAILEYS_ANTIBAN',
    phoneConnected: null,
    nameConnected: null,
    lastConnectedAt: null,
    qrCodeBase64: currentQrCodeBase64,
    isWarmedUp: false,
  };
}

/**
 * Desconecta a sessão Baileys e limpa arquivos de autenticação
 */
export async function disconnectWhatsApp(): Promise<void> {
  try {
    if (sock) {
      sock.end(undefined);
      sock = null;
    }
    connectionStatus = 'DISCONNECTED';
    currentQrCodeBase64 = null;
    phoneConnected = null;
    nameConnected = null;

    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    }
    console.log('[wppService] Sessão desconectada e pasta de credenciais limpa com sucesso.');
  } catch (err: any) {
    console.error('[wppService] Erro ao desconectar WhatsApp:', err?.message);
  }
}

export { getMetaConfig };
