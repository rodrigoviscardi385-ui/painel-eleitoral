/**
 * wppService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Motor Oficial WhatsApp Web (Chromium Real via whatsapp-web.js).
 * Opera DIRETAMENTE na página oficial do WhatsApp Web (https://web.whatsapp.com)
 * dentro de uma instância real do Chromium/Chrome headless:
 *
 *  1. Navegador Real Chromium: Abre o web.whatsapp.com oficial, eliminando
 *     qualquer assinatura de bot por socket reverso (fim dos bloqueios de socket).
 *  2. Sessão Persistente (LocalAuth): Salva cookies e chaves de sessão em disco.
 *  3. Automação de DOM & Digitação Humana: Marca leitura, ativa "digitando..." e envia.
 *  4. IA Groq + Fluxo de Atendimento: Conectado a processIncomingMessage().
 *  5. Fallback Híbrido: Se Meta Cloud API Oficial estiver configurada, envia por ela.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createRequire } from 'module';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { processIncomingMessage } from './messageProcessor.js';
import { sendMetaTextMessage, getMetaConfig } from './metaCloudService.js';

const require = createRequire(import.meta.url);
const pkg = require('whatsapp-web.js');
const { Client, LocalAuth } = pkg;

// Pasta de autenticação do WhatsApp Web Oficial
const AUTH_DIR = path.join(process.cwd(), '.wwebjs_auth');

// Estado interno do serviço
let client: any = null;
let currentQrCodeBase64: string | null = null;
let connectionStatus: 'DISCONNECTED' | 'CONNECTING' | 'QR_READY' | 'CONNECTED' = 'DISCONNECTED';
let phoneConnected: string | null = null;
let nameConnected: string | null = null;
let lastConnectedAt: string | null = null;
let isInitializing = false;

/**
 * Localiza o executável do Chromium ou Google Chrome no sistema
 */
function getChromiumExecutablePath(): string | undefined {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  if (process.env.CHROME_BIN) {
    return process.env.CHROME_BIN;
  }

  if (process.platform === 'linux') {
    const candidates = [
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
  }

  return undefined;
}

/**
 * Inicializa a instância do Chromium abrindo a página oficial do WhatsApp Web
 */
export async function initWhatsApp(): Promise<void> {
  if (isInitializing || connectionStatus === 'CONNECTED') {
    console.log('[wppService] Inicialização já em andamento ou cliente já conectado.');
    return;
  }

  try {
    isInitializing = true;
    connectionStatus = 'CONNECTING';
    currentQrCodeBase64 = null;

    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    const executablePath = getChromiumExecutablePath();
    console.log(`[wppService] 🌐 Iniciando Chromium na página oficial do WhatsApp Web...`);
    if (executablePath) {
      console.log(`[wppService] 🧭 Executável do navegador detectado: ${executablePath}`);
    }

    client = new Client({
      authStrategy: new LocalAuth({
        dataPath: AUTH_DIR,
      }),
      puppeteer: {
        headless: true,
        executablePath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-extensions',
        ],
      },
    });

    // ─── Evento 1: QR Code Oficial Gerado pela Página Web ─────────────────
    client.on('qr', async (qr: string) => {
      try {
        currentQrCodeBase64 = await QRCode.toDataURL(qr, {
          margin: 2,
          width: 320,
          color: { dark: '#0f172a', light: '#ffffff' },
        });
        connectionStatus = 'QR_READY';
        console.log('[wppService] 📲 QR Code oficial da página web.whatsapp.com pronto para escaneamento.');
      } catch (qrErr) {
        console.error('[wppService] Erro ao converter QR Code para Base64:', qrErr);
      }
    });

    // ─── Evento 2: Sessão Autenticada no WhatsApp Web ─────────────────────
    client.on('authenticated', () => {
      console.log('[wppService] 🔐 WhatsApp Web autenticado com sucesso via sessão.');
    });

    client.on('auth_failure', (msg: string) => {
      console.error('[wppService] ❌ Falha na autenticação do WhatsApp Web:', msg);
      connectionStatus = 'DISCONNECTED';
      currentQrCodeBase64 = null;
    });

    // ─── Evento 3: WhatsApp Web Carregado e Pronto (Ready) ────────────────
    client.on('ready', async () => {
      connectionStatus = 'CONNECTED';
      currentQrCodeBase64 = null;
      lastConnectedAt = new Date().toISOString();

      const userWid = client.info?.wid?.user || '';
      phoneConnected = userWid || 'WhatsApp Web';
      nameConnected = client.info?.pushname || 'Campanha 2026';

      console.log('=====================================================');
      console.log(`✅ [wppService] WHATSAPP WEB OFICIAL CONECTADO VIA CHROMIUM!`);
      console.log(`📱 Número Ativo: ${phoneConnected} (${nameConnected})`);
      console.log(`🛡️  Modo Oficial DOM Web: ATIVO (Zero-Ban por Socket)`);
      console.log('=====================================================');
    });

    // ─── Evento 4: Desconexão ─────────────────────────────────────────────
    client.on('disconnected', async (reason: string) => {
      console.warn(`[wppService] Sessão do WhatsApp Web desconectada. Motivo: ${reason}`);
      connectionStatus = 'DISCONNECTED';
      currentQrCodeBase64 = null;
      phoneConnected = null;
      nameConnected = null;
      try {
        await client?.destroy().catch(() => {});
      } catch {}
      client = null;
    });

    // ─── Evento 5: Leitura de Mensagens Recebidas na Página Oficial ───────
    client.on('message', async (msg: any) => {
      try {
        // Ignora mensagens enviadas pelo próprio chip
        if (msg.fromMe) return;

        const from = msg.from || '';
        // Ignora mensagens de status e grupos se terminarem em @g.us ou status@broadcast
        if (from.endsWith('@g.us') || from.includes('broadcast')) return;

        const senderPhone = from.split('@')[0];
        let contactName = 'Eleitor';
        try {
          const contact = await msg.getContact();
          contactName = contact.pushname || contact.name || 'Eleitor';
        } catch {}

        const textContent = msg.body || '';

        if (textContent.trim().length > 0) {
          console.log(`[wppService] 📥 Mensagem oficial recebida de ${contactName} (${senderPhone}): "${textContent.slice(0, 60)}"`);

          await processIncomingMessage({
            senderPhone,
            contactName,
            messageId: msg.id?._serialized || `msg_${Date.now()}`,
            type: 'text',
            textContent,
          });
        }
      } catch (err: any) {
        console.error('[wppService] Erro ao processar mensagem do WhatsApp Web:', err?.message);
      }
    });

    // Inicializa o Puppeteer
    await client.initialize();
  } catch (err: any) {
    console.error('[wppService] Falha crítica ao inicializar Chromium / WhatsApp Web:', err?.message || err);
    connectionStatus = 'DISCONNECTED';
    currentQrCodeBase64 = null;
  } finally {
    isInitializing = false;
  }
}

/**
 * Envia mensagem de texto diretamente pela página oficial do WhatsApp Web
 */
export async function sendWhatsAppMessage(to: string, text: string): Promise<boolean> {
  const cleanNumber = to.replace(/\D/g, '');

  // 1. Envio via WhatsApp Web Oficial (Chromium)
  if (client && connectionStatus === 'CONNECTED') {
    try {
      const chatId = cleanNumber.includes('@') ? cleanNumber : `${cleanNumber}@c.us`;

      // Simulação biomecânica de digitação humana no DOM oficial
      try {
        const chat = await client.getChatById(chatId);
        if (chat) {
          await chat.sendSeen().catch(() => {});
          await chat.sendStateTyping().catch(() => {});
          const typingDelay = Math.min(Math.max(text.length * 30, 1500), 4000);
          await new Promise((r) => setTimeout(r, typingDelay));
          await chat.clearState().catch(() => {});
        }
      } catch {}

      await client.sendMessage(chatId, text);
      console.log(`[wppService] 📤 Mensagem enviada via WhatsApp Web oficial para ${cleanNumber}.`);
      return true;
    } catch (webErr: any) {
      console.error('[wppService] Erro ao enviar mensagem via WhatsApp Web:', webErr?.message);
    }
  }

  // 2. Fallback para Meta Cloud API Oficial (se configurada)
  try {
    const meta = await getMetaConfig();
    if (meta.phone_number_id && meta.access_token) {
      const result = await sendMetaTextMessage(cleanNumber, text);
      return result.success;
    }
  } catch {}

  console.warn(`[wppService] Falha de envio: WhatsApp Web e Meta Cloud desconectados para ${cleanNumber}.`);
  return false;
}

/**
 * Retorna o status atual para o frontend do painel
 */
export async function getWhatsAppStatus() {
  if (connectionStatus === 'CONNECTED') {
    return {
      status: 'CONNECTED',
      provider: 'WHATSAPP_WEB_CHROMIUM_OFICIAL',
      phoneConnected: phoneConnected || 'WhatsApp Web Ativo',
      nameConnected: nameConnected || 'Campanha 2026',
      lastConnectedAt,
      qrCodeBase64: null,
      isWarmedUp: true,
      mode: 'PAGINA_OFICIAL_WEB_DOM',
    };
  }

  if (connectionStatus === 'QR_READY' && currentQrCodeBase64) {
    return {
      status: 'QR_READY',
      provider: 'WHATSAPP_WEB_CHROMIUM_OFICIAL',
      phoneConnected: null,
      nameConnected: null,
      lastConnectedAt: null,
      qrCodeBase64: currentQrCodeBase64,
      isWarmedUp: false,
      mode: 'AGUARDANDO_LEITURA_PAGINA_OFICIAL',
    };
  }

  if (connectionStatus === 'CONNECTING') {
    return {
      status: 'CONNECTING',
      provider: 'WHATSAPP_WEB_CHROMIUM_OFICIAL',
      phoneConnected: null,
      nameConnected: null,
      lastConnectedAt: null,
      qrCodeBase64: null,
      isWarmedUp: false,
    };
  }

  // Fallback para checar se a Meta Cloud API está conectada
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
    provider: 'WHATSAPP_WEB_CHROMIUM_OFICIAL',
    phoneConnected: null,
    nameConnected: null,
    lastConnectedAt: null,
    qrCodeBase64: currentQrCodeBase64,
    isWarmedUp: false,
  };
}

/**
 * Desconecta e fecha o navegador Chromium
 */
export async function disconnectWhatsApp(): Promise<void> {
  try {
    if (client) {
      await client.logout().catch(() => {});
      await client.destroy().catch(() => {});
      client = null;
    }
    connectionStatus = 'DISCONNECTED';
    currentQrCodeBase64 = null;
    phoneConnected = null;
    nameConnected = null;

    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    }
    console.log('[wppService] Sessão oficial encerrada e navegador Chromium finalizado.');
  } catch (err: any) {
    console.error('[wppService] Erro ao desconectar WhatsApp Web:', err?.message);
  }
}

export { getMetaConfig };
