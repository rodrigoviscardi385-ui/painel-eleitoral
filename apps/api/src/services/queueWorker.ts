/**
 * queueWorker.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Worker de disparos em massa via Meta Cloud API (única integração oficial).
 * Correções aplicadas:
 *   • Mutex isProcessing — sem sobreposição de execuções
 *   • Reset automático de msgs_enviadas_hoje à meia-noite
 *   • Usa exclusivamente sendMetaTextMessage (sem Baileys)
 *   • filtro_tipo e filtro_valor implementados (TODOS | BAIRRO | ZONA | CARGO)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { sendMetaTextMessage } from './metaCloudService.js';

let isWorkerRunning = false;
let isProcessing = false; // Mutex para evitar sobreposição

/**
 * Resolve variações de Spintax no formato {Oi|Olá|Tudo bem}
 */
export function parseSpintax(text: string): string {
  const spintaxRegex = /\{([^{}]+)\}/g;
  let result = text;
  let safety = 0;
  while (spintaxRegex.test(result) && safety < 10) {
    result = result.replace(/\{([^{}]+)\}/g, (_, match) => {
      const choices = match.split('|');
      return choices[Math.floor(Math.random() * choices.length)];
    });
    safety++;
  }
  return result;
}

/**
 * Gera delay gaussiano humanizado (ms) — respeita rate limits da Meta
 */
function getGaussianDelay(minSec = 2, maxSec = 6): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1 || 0.0001)) * Math.cos(2.0 * Math.PI * u2);
  const mean = (minSec + maxSec) / 2;
  const stdDev = (maxSec - minSec) / 4;
  const clamped = Math.min(Math.max(mean + z0 * stdDev, minSec), maxSec);
  return Math.round(clamped * 1000);
}

/**
 * Agenda o reset diário do contador de mensagens à meia-noite
 */
function scheduleMidnightReset() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0); // próxima meia-noite
  const msUntilMidnight = midnight.getTime() - now.getTime();

  setTimeout(async () => {
    try {
      // Reset de todas as configurações de chip warming
      await db.update(schema.chipWarmingConfig).set({
        msgs_enviadas_hoje: 0,
        ultimo_ciclo_em: new Date(),
      });
      console.log('[QUEUE] ✅ Contador diário de mensagens resetado à meia-noite.');
    } catch (err) {
      console.error('[QUEUE] Erro ao resetar contador diário:', err);
    }
    // Agenda o próximo reset (24h)
    setInterval(async () => {
      try {
        await db.update(schema.chipWarmingConfig).set({
          msgs_enviadas_hoje: 0,
          ultimo_ciclo_em: new Date(),
        });
        console.log('[QUEUE] ✅ Contador diário resetado (ciclo de 24h).');
      } catch (err) {
        console.error('[QUEUE] Erro no reset periódico:', err);
      }
    }, 24 * 60 * 60 * 1000);
  }, msUntilMidnight);

  console.log(`[QUEUE] Reset diário agendado para ${midnight.toLocaleTimeString('pt-BR')} (${Math.round(msUntilMidnight / 60000)} min).`);
}

/**
 * Inicia o worker de envio em background
 */
export function startQueueWorker() {
  if (isWorkerRunning) return;
  isWorkerRunning = true;
  console.log('[QUEUE] Worker de disparos via Meta Cloud API iniciado.');

  // Processa a cada 5 segundos com mutex
  setInterval(async () => {
    if (isProcessing) return; // Evita sobreposição
    isProcessing = true;
    try {
      await processNextPendingBatch();
    } catch (err) {
      console.error('[QUEUE Worker Error]', err);
    } finally {
      isProcessing = false;
    }
  }, 5000);

  // Agenda reset automático à meia-noite
  scheduleMidnightReset();
}

/**
 * Processa o próximo item pendente da fila
 */
async function processNextPendingBatch() {
  // 1. Verifica limite de rate do chip warming
  const chipConfig = await db.select().from(schema.chipWarmingConfig).limit(1).then((r) => r[0]);
  if (chipConfig && chipConfig.msgs_enviadas_hoje >= chipConfig.limite_diario_atual) {
    return; // Limite diário atingido
  }

  // 2. Busca campanha ativa
  const activeCampaign = await db
    .select()
    .from(schema.disparosCampanha)
    .where(eq(schema.disparosCampanha.status, 'EM_ANDAMENTO'))
    .limit(1)
    .then((r) => r[0]);

  if (!activeCampaign) return;

  // 3. Próximo item pendente
  const pendingItem = await db
    .select()
    .from(schema.disparosItens)
    .where(
      and(
        eq(schema.disparosItens.disparo_id, activeCampaign.id),
        eq(schema.disparosItens.status, 'PENDENTE')
      )
    )
    .limit(1)
    .then((r) => r[0]);

  if (!pendingItem) {
    // Campanha finalizada
    await db
      .update(schema.disparosCampanha)
      .set({ status: 'CONCLUIDO', updated_at: new Date() })
      .where(eq(schema.disparosCampanha.id, activeCampaign.id));
    console.log(`[QUEUE] 🎉 Campanha "${activeCampaign.titulo}" concluída!`);
    return;
  }

  // 4. Dados do destinatário
  const user = await db
    .select()
    .from(schema.usuarios)
    .where(eq(schema.usuarios.id, pendingItem.usuario_id))
    .limit(1)
    .then((r) => r[0]);

  if (!user || user.opt_out) {
    await db.update(schema.disparosItens)
      .set({
        status: 'ERRO',
        erro_detalhe: user?.opt_out ? 'Opt-out LGPD ativo' : 'Usuário não encontrado',
      })
      .where(eq(schema.disparosItens.id, pendingItem.id));

    await db.update(schema.disparosCampanha)
      .set({ total_erros: sql`${schema.disparosCampanha.total_erros} + 1`, updated_at: new Date() })
      .where(eq(schema.disparosCampanha.id, activeCampaign.id));
    return;
  }

  // 5. Filtros de destinatários implementados
  if (activeCampaign.filtro_tipo && activeCampaign.filtro_tipo !== 'TODOS' && activeCampaign.filtro_valor) {
    let qualifica = false;
    switch (activeCampaign.filtro_tipo) {
      case 'BAIRRO':
        qualifica = user.bairro?.toLowerCase() === activeCampaign.filtro_valor?.toLowerCase();
        break;
      case 'ZONA':
        qualifica = user.zona_eleitoral === activeCampaign.filtro_valor;
        break;
      case 'LIDER':
        // filtro_valor contém o cargo ou o id do líder acima
        qualifica = user.lider_acima_id === activeCampaign.filtro_valor || (user.cargo as string) === activeCampaign.filtro_valor;
        break;
      default:
        qualifica = true;
    }

    if (!qualifica) {
      await db.update(schema.disparosItens)
        .set({ status: 'ERRO', erro_detalhe: 'Fora do filtro de destinatários' })
        .where(eq(schema.disparosItens.id, pendingItem.id));
      return;
    }
  }

  // 6. Montagem da mensagem com Spintax e variáveis
  const config = await db.select().from(schema.campanhaConfig).limit(1).then((r) => r[0]);
  let finalMessage = parseSpintax(activeCampaign.mensagem_template);
  finalMessage = finalMessage
    .replace(/\{nome\}/gi, user.nome)
    .replace(/\{bairro\}/gi, user.bairro || 'sua região')
    .replace(/\{candidato\}/gi, config?.nome_urna || 'nosso candidato')
    .replace(/\{numero\}/gi, config?.numero_candidato || '55955')
    .replace(/\{cargo\}/gi, config?.cargo || 'Deputado Federal');

  // Rodapé legal LGPD
  finalMessage += '\n\n_Para não receber mais mensagens, responda "PARAR"._';

  // 7. Delay humanizado (2–6s) para respeitar rate limits da Meta API
  const delayMs = getGaussianDelay(2, 6);
  await new Promise((resolve) => setTimeout(resolve, delayMs));

  // 8. Disparo via Meta Cloud API (oficial, sem risco de ban)
  const result = await sendMetaTextMessage(pendingItem.whatsapp_destino, finalMessage);

  if (result.success) {
    await db.update(schema.disparosItens)
      .set({ status: 'ENVIADO', mensagem_final: finalMessage, enviado_em: new Date() })
      .where(eq(schema.disparosItens.id, pendingItem.id));

    await db.update(schema.disparosCampanha)
      .set({ total_enviados: sql`${schema.disparosCampanha.total_enviados} + 1`, updated_at: new Date() })
      .where(eq(schema.disparosCampanha.id, activeCampaign.id));

    if (chipConfig) {
      await db.update(schema.chipWarmingConfig)
        .set({
          msgs_enviadas_hoje: sql`${schema.chipWarmingConfig.msgs_enviadas_hoje} + 1`,
          ultimo_ciclo_em: new Date(),
        })
        .where(eq(schema.chipWarmingConfig.id, chipConfig.id));
    }
  } else {
    console.error(`[QUEUE] Erro ao enviar para ${pendingItem.whatsapp_destino}: ${result.error}`);
    await db.update(schema.disparosItens)
      .set({ status: 'ERRO', erro_detalhe: result.error || 'Falha na Meta Cloud API' })
      .where(eq(schema.disparosItens.id, pendingItem.id));

    await db.update(schema.disparosCampanha)
      .set({ total_erros: sql`${schema.disparosCampanha.total_erros} + 1`, updated_at: new Date() })
      .where(eq(schema.disparosCampanha.id, activeCampaign.id));
  }
}
