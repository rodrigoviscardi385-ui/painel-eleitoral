import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq } from 'drizzle-orm';

export interface MetaConfig {
  id?: string;
  phone_number_id?: string;
  waba_id?: string;
  access_token?: string;
  verify_token: string;
  display_phone_number?: string;
  status: 'CONFIG_PENDING' | 'CONNECTED' | 'ERROR';
  webhook_url: string;
}

const DEFAULT_VERIFY_TOKEN = process.env.META_WA_VERIFY_TOKEN || 'painel_eleitoral_meta_webhook_2026';
const DEFAULT_WEBHOOK_URL = `${process.env.WEBHOOK_BASE_URL || 'http://localhost:3001'}/api/whatsapp/meta-webhook`;

/**
 * Busca as configurações ativas da Meta Cloud API
 */
export async function getMetaConfig(): Promise<MetaConfig> {
  const row = await db
    .select()
    .from(schema.metaWppConfig)
    .limit(1)
    .then((r) => r[0]);

  if (row) {
    return {
      id: row.id,
      phone_number_id: row.phone_number_id || process.env.META_WA_PHONE_NUMBER_ID || undefined,
      waba_id: row.waba_id || process.env.META_WA_BUSINESS_ACCOUNT_ID || undefined,
      access_token: row.access_token || process.env.META_WA_ACCESS_TOKEN || undefined,
      verify_token: row.verify_token || DEFAULT_VERIFY_TOKEN,
      display_phone_number: row.display_phone_number || undefined,
      status: (row.status as any) || 'CONFIG_PENDING',
      webhook_url: row.webhook_url || DEFAULT_WEBHOOK_URL,
    };
  }

  return {
    phone_number_id: process.env.META_WA_PHONE_NUMBER_ID || undefined,
    waba_id: process.env.META_WA_BUSINESS_ACCOUNT_ID || undefined,
    access_token: process.env.META_WA_ACCESS_TOKEN || undefined,
    verify_token: process.env.META_WA_VERIFY_TOKEN || DEFAULT_VERIFY_TOKEN,
    display_phone_number: process.env.META_WA_PHONE_NUMBER || undefined,
    status: process.env.META_WA_ACCESS_TOKEN ? 'CONNECTED' : 'CONFIG_PENDING',
    webhook_url: DEFAULT_WEBHOOK_URL,
  };
}

/**
 * Salva ou atualiza as configurações da Meta Cloud API
 */
export async function saveMetaConfig(data: Partial<MetaConfig>): Promise<MetaConfig> {
  const current = await db.select().from(schema.metaWppConfig).limit(1).then((r) => r[0]);

  if (current) {
    await db
      .update(schema.metaWppConfig)
      .set({
        ...data,
        updated_at: new Date(),
      })
      .where(eq(schema.metaWppConfig.id, current.id));
  } else {
    await db.insert(schema.metaWppConfig).values({
      phone_number_id: data.phone_number_id || null,
      waba_id: data.waba_id || null,
      access_token: data.access_token || null,
      verify_token: data.verify_token || DEFAULT_VERIFY_TOKEN,
      display_phone_number: data.display_phone_number || null,
      status: data.status || 'CONFIG_PENDING',
      webhook_url: data.webhook_url || DEFAULT_WEBHOOK_URL,
    });
  }

  return getMetaConfig();
}

/**
 * Envia mensagem de texto via WhatsApp Cloud API Oficial da Meta
 */
export async function sendMetaTextMessage(to: string, text: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = await getMetaConfig();

  if (!config.phone_number_id || !config.access_token) {
    return {
      success: false,
      error: 'WhatsApp Cloud API não configurada. Insira o Phone Number ID e o Access Token no painel.',
    };
  }

  // Sanitiza o número de telefone (apenas dígitos com código do país)
  let cleanTo = to.replace(/\D/g, '');
  if (!cleanTo.startsWith('55') && cleanTo.length <= 11) {
    cleanTo = `55${cleanTo}`;
  }

  const url = `https://graph.facebook.com/v21.0/${config.phone_number_id}/messages`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanTo,
        type: 'text',
        text: {
          preview_url: true,
          body: text,
        },
      }),
    });

    const data: any = await res.json();

    if (!res.ok) {
      console.error('[Meta Cloud API Error]', data);
      return {
        success: false,
        error: data.error?.message || 'Falha ao enviar mensagem pela Meta API',
      };
    }

    const messageId = data.messages?.[0]?.id;
    return { success: true, messageId };
  } catch (err: any) {
    console.error('[Meta Cloud API Network Error]', err?.message || err);
    return { success: false, error: err?.message || 'Erro de rede ao chamar Meta Cloud API' };
  }
}

/**
 * Marca uma mensagem recebida como lida na Meta Cloud API
 */
export async function markMetaMessageAsRead(messageId: string): Promise<void> {
  const config = await getMetaConfig();
  if (!config.phone_number_id || !config.access_token) return;

  try {
    await fetch(`https://graph.facebook.com/v21.0/${config.phone_number_id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      }),
    });
  } catch (e) {
    // Silencioso
  }
}

/**
 * Baixa mídia oficial da Meta (áudios, imagens, documentos) a partir do mediaId
 */
export async function downloadMetaMedia(mediaId: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const config = await getMetaConfig();
  if (!config.access_token) return null;

  try {
    // 1. Obter a URL temporária da mídia
    const metaMediaRes = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
      headers: {
        Authorization: `Bearer ${config.access_token}`,
      },
    });

    if (!metaMediaRes.ok) {
      console.error('[Meta Media Metadata Error]', await metaMediaRes.text());
      return null;
    }

    const mediaData: any = await metaMediaRes.json();
    const mediaUrl = mediaData.url;
    const mimeType = mediaData.mime_type;

    // 2. Baixar o arquivo binário usando o token
    const fileRes = await fetch(mediaUrl, {
      headers: {
        Authorization: `Bearer ${config.access_token}`,
      },
    });

    if (!fileRes.ok) {
      console.error('[Meta Media Download Error]', await fileRes.text());
      return null;
    }

    const arrayBuffer = await fileRes.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      mimeType,
    };
  } catch (err: any) {
    console.error('[Meta Media Download Exception]', err?.message || err);
    return null;
  }
}
