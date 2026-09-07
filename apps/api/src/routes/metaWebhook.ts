/**
 * metaWebhook.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Rota oficial do WhatsApp Cloud API da Meta.
 * Segurança implementada:
 *   • Verificação HMAC-SHA256 em cada POST do webhook
 *   • Autenticação JWT obrigatória para gerenciamento de credenciais
 *   • Webhook URL sem IP hardcoded (usa WEBHOOK_BASE_URL do .env)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import {
  getMetaConfig,
  saveMetaConfig,
  sendMetaTextMessage,
  markMetaMessageAsRead,
} from '../services/metaCloudService.js';
import { processIncomingMessage } from '../services/messageProcessor.js';

const JWT_SECRET = process.env.JWT_SECRET;
const META_APP_SECRET = process.env.META_WA_APP_SECRET;

/**
 * Verifica HMAC-SHA256 da assinatura do webhook da Meta.
 * Impede injeção de mensagens falsas de qualquer origem não-Meta.
 */
function verifyMetaSignature(rawBody: Buffer, signature: string): boolean {
  // Se o APP_SECRET não estiver configurado, aceita (mas loga aviso)
  if (!META_APP_SECRET) {
    console.warn('[Meta Webhook] AVISO: META_WA_APP_SECRET não configurado. Verificação HMAC desabilitada.');
    return true;
  }

  if (!signature || !signature.startsWith('sha256=')) {
    return false;
  }

  const expected = crypto
    .createHmac('sha256', META_APP_SECRET)
    .update(rawBody)
    .digest('hex');

  const received = signature.replace('sha256=', '');

  // Comparação com tempo constante para evitar timing attacks
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Middleware de autenticação JWT para rotas administrativas
 */
function requireAuth(request: FastifyRequest, reply: FastifyReply): boolean {
  if (!JWT_SECRET) {
    reply.status(500).send({ error: 'JWT_SECRET não configurado no servidor.' });
    return false;
  }

  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    reply.status(401).send({ error: 'Token de autenticação obrigatório.' });
    return false;
  }

  try {
    jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    return true;
  } catch {
    reply.status(401).send({ error: 'Token inválido ou expirado.' });
    return false;
  }
}

export async function metaWebhookRoutes(app: FastifyInstance) {

  // ─── 1. Validação do Webhook pelo Facebook / Meta (GET) ─────────────────────
  app.get('/api/whatsapp/meta-webhook', async (request, reply) => {
    const query = request.query as any;
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    const config = await getMetaConfig();

    if (mode === 'subscribe' && token === config.verify_token) {
      console.log('✅ Webhook da Meta validado com sucesso!');
      return reply.status(200).type('text/plain').send(challenge);
    }

    console.warn('❌ Falha na validação do Webhook da Meta. Token inválido.');
    return reply.status(403).send('Forbidden');
  });

  // ─── 2. Recepção de Mensagens da Meta em Tempo Real (POST) ──────────────────
  app.post('/api/whatsapp/meta-webhook', {
    config: { rawBody: true }, // necessário para HMAC
  }, async (request, reply) => {

    // Verifica assinatura HMAC antes de qualquer processamento
    const signature = request.headers['x-hub-signature-256'] as string;
    const rawBody = (request as any).rawBody as Buffer;

    if (!verifyMetaSignature(rawBody, signature)) {
      console.error('[Meta Webhook] Assinatura HMAC inválida — payload rejeitado.');
      return reply.status(401).send({ error: 'Invalid signature' });
    }

    // Responde 200 OK imediatamente para a Meta não reenviar
    reply.status(200).send({ status: 'EVENT_RECEIVED' });

    try {
      const body = request.body as any;
      const entry = body?.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];

      if (!message) return; // Notificação de entrega/leitura — ignora

      const senderPhone = message.from;
      const contactName = value?.contacts?.[0]?.profile?.name || 'Apoiador';
      const messageId = message.id;

      // Marca como lida (não bloqueia)
      markMetaMessageAsRead(messageId).catch(() => {});

      // Delega processamento para o serviço centralizado
      await processIncomingMessage({
        senderPhone,
        contactName,
        messageId,
        type: message.type as any,
        textContent: message.text?.body,
        audioMediaId: message.audio?.id,
        imageMediaId: message.image?.id,
        imageCaption: message.image?.caption,
      });

    } catch (error: any) {
      console.error('[Meta Webhook Processing Error]', error?.message || error);
    }
  });

  // ─── 3. Obter configuração atual da Meta (retorna token mascarado) ──────────
  // GET é público para o painel verificar o status
  app.get('/api/whatsapp/meta-config', async () => {
    const cfg = await getMetaConfig();
    return {
      ...cfg,
      // Mascara o access_token — mostra apenas os últimos 4 chars
      access_token: cfg.access_token
        ? `${'•'.repeat(Math.max(0, cfg.access_token.length - 4))}${cfg.access_token.slice(-4)}`
        : null,
    };
  });

  // ─── 4. Salvar credenciais da Meta (requer autenticação JWT) ────────────────
  app.post('/api/whatsapp/meta-config', async (request, reply) => {
    if (!requireAuth(request, reply)) return;

    const body = request.body as any;
    const { phone_number_id, access_token, waba_id, display_phone_number, verify_token } = body || {};

    if (!phone_number_id || !access_token) {
      return reply.status(400).send({ error: 'Phone Number ID e Access Token são obrigatórios.' });
    }

    const webhookBase = process.env.WEBHOOK_BASE_URL || 'http://localhost:3001';

    const updated = await saveMetaConfig({
      phone_number_id: phone_number_id.trim(),
      access_token: access_token.trim(),
      waba_id: waba_id?.trim() || undefined,
      display_phone_number: display_phone_number?.trim() || undefined,
      verify_token: verify_token?.trim() || undefined,
      webhook_url: `${webhookBase}/api/whatsapp/meta-webhook`,
      status: 'CONNECTED',
    });

    return {
      success: true,
      message: 'Credenciais da WhatsApp Cloud API salvas com sucesso!',
      config: {
        ...updated,
        access_token: updated.access_token
          ? `${'•'.repeat(Math.max(0, updated.access_token.length - 4))}${updated.access_token.slice(-4)}`
          : null,
      },
    };
  });

  // ─── 5. Envio de mensagem de teste (requer auth JWT) ────────────────────────
  app.post('/api/whatsapp/meta-test', async (request, reply) => {
    if (!requireAuth(request, reply)) return;

    const body = request.body as any;
    const { to, text } = body || {};

    if (!to) {
      return reply.status(400).send({ error: 'Número de telefone de destino é obrigatório.' });
    }

    const mensagem = text || '🚀 Teste de conexão oficial com a WhatsApp Cloud API da Meta — Sistema Painel Eleitoral 2026!';
    const result = await sendMetaTextMessage(to, mensagem);

    if (!result.success) {
      return reply.status(400).send({ error: result.error });
    }

    return { success: true, messageId: result.messageId, to };
  });
}
