import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { evolutionService } from './evolutionService.js';
import { nativeWhatsAppService } from './nativeWhatsAppService.js';
import dotenv from 'dotenv';

dotenv.config();

function capitalizeFirstLetter(string: string): string {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

/**
 * Parser de Spintax recursivo: transforma {Olá|Oi|Tudo bem} em uma variação aleatória única
 */
export function parseSpintax(text: string): string {
  if (!text) return '';
  const spintaxRegex = /\{([^{}]+)\}/;
  let match = spintaxRegex.exec(text);
  while (match) {
    const options = match[1].split('|');
    const chosen = options[Math.floor(Math.random() * options.length)];
    text = text.replace(match[0], chosen);
    match = spintaxRegex.exec(text);
  }
  return text;
}

function getRandomDelay(min = 3000, max = 7500): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export class DisparoQueueWorker {
  private isProcessing = false;
  private activeCampaignId: string | null = null;
  private readonly BATCH_COOLDOWN_COUNT = 50; // Cooldown a cada 50 envios
  private readonly COOLDOWN_DURATION_MS = 60000; // 60 segundos de resfriamento

  /**
   * Processa a fila de uma campanha específica
   */
  async processCampaign(campaignId: string): Promise<void> {
    if (this.isProcessing && this.activeCampaignId === campaignId) {
      console.log(`Campanha ${campaignId} já está em processamento.`);
      return;
    }

    this.isProcessing = true;
    this.activeCampaignId = campaignId;

    try {
      // 1. Atualizar status da campanha para EM_ANDAMENTO
      await db
        .update(schema.disparosCampanha)
        .set({ status: 'EM_ANDAMENTO', updated_at: new Date() })
        .where(eq(schema.disparosCampanha.id, campaignId))
        .catch(() => {});

      // 2. Buscar dados da campanha
      const [campaign] = await db
        .select()
        .from(schema.disparosCampanha)
        .where(eq(schema.disparosCampanha.id, campaignId))
        .catch(() => []);

      if (!campaign) {
        console.error(`Campanha ${campaignId} não encontrada.`);
        return;
      }

      // 3. Buscar itens pendentes
      const pendingItems = await db
        .select({
          item: schema.disparosItens,
          usuario: schema.usuarios,
        })
        .from(schema.disparosItens)
        .innerJoin(schema.usuarios, eq(schema.disparosItens.usuario_id, schema.usuarios.id))
        .where(
          and(
            eq(schema.disparosItens.disparo_id, campaignId),
            eq(schema.disparosItens.status, 'PENDENTE')
          )
        )
        .catch(() => []);

      console.log(`[QueueWorker] Iniciando disparo de ${pendingItems.length} mensagens para campanha: ${campaign.titulo}`);

      let sentCount = campaign.total_enviados || 0;
      let errorCount = campaign.total_erros || 0;
      let batchCounter = 0;

      for (const { item, usuario } of pendingItems) {
        // 0. Bloqueio Estrito de Opt-Out (Compliance TSE / LGPD)
        if (usuario.opt_out) {
          console.log(`🛑 Disparo ignorado para ${usuario.whatsapp} (${usuario.nome}) devido a Opt-Out ativo.`);
          await db
            .update(schema.disparosItens)
            .set({
              status: 'ERRO',
              erro_detalhe: 'Cancelado: Eleitor solicitou descadastro (Opt-Out TSE/LGPD)',
            })
            .where(eq(schema.disparosItens.id, item.id));
          errorCount++;
          continue;
        }

        // Formatar primeiro nome capitalizado
        const primeiroNome = capitalizeFirstLetter(usuario.nome ? usuario.nome.split(' ')[0] : 'Amigo(a)');

        // Substituição atômica de variáveis dinâmicas + Motor Spintax Anti-Bloqueio
        const rawTemplate = campaign.mensagem_template
          .replace(/{nome}/gi, primeiroNome)
          .replace(/{bairro}/gi, usuario.bairro || 'sua região')
          .replace(/{zona}/gi, usuario.zona_eleitoral || '')
          .replace(/{secao}/gi, usuario.secao_eleitoral || '');

        const personalizedMessage = parseSpintax(rawTemplate);

        let sendSuccess = false;
        let errorMessage = '';

        // Se houver PDF anexado (URL pública Supabase CDN)
        if (campaign.url_midia_pdf) {
          const mediaRes = await evolutionService.sendMediaMessage(
            item.whatsapp_destino,
            campaign.url_midia_pdf,
            personalizedMessage,
            'Proposta_Oficial.pdf',
            'document'
          );
          sendSuccess = mediaRes.success;
          if (!sendSuccess) errorMessage = JSON.stringify(mediaRes.data);
        } else {
          // Apenas mensagem de texto: tenta Baileys nativo primeiro
          sendSuccess = await nativeWhatsAppService.sendMessage(
            item.whatsapp_destino,
            personalizedMessage
          );

          if (!sendSuccess) {
            const textRes = await evolutionService.sendTextMessage(
              item.whatsapp_destino,
              personalizedMessage
            );
            sendSuccess = textRes.success;
            if (!sendSuccess) errorMessage = JSON.stringify(textRes.data);
          }
        }

        if (sendSuccess) {
          sentCount++;
          batchCounter++;
          await db
            .update(schema.disparosItens)
            .set({
              status: 'ENVIADO',
              mensagem_final: personalizedMessage,
              enviado_em: new Date(),
            })
            .where(eq(schema.disparosItens.id, item.id))
            .catch(() => {});
        } else {
          errorCount++;
          await db
            .update(schema.disparosItens)
            .set({
              status: 'ERRO',
              mensagem_final: personalizedMessage,
              erro_detalhe: errorMessage,
            })
            .where(eq(schema.disparosItens.id, item.id))
            .catch(() => {});
        }

        // Atualizar contadores parciais
        await db
          .update(schema.disparosCampanha)
          .set({
            total_enviados: sentCount,
            total_erros: errorCount,
            updated_at: new Date(),
          })
          .where(eq(schema.disparosCampanha.id, campaignId))
          .catch(() => {});

        // Resfriamento anti-ban a cada 50 mensagens
        if (batchCounter >= this.BATCH_COOLDOWN_COUNT) {
          console.log(`[QueueWorker] Cooldown de segurança atingido (${this.BATCH_COOLDOWN_COUNT} envios). Aguardando ${this.COOLDOWN_DURATION_MS / 1000}s de resfriamento...`);
          batchCounter = 0;
          await new Promise((resolve) => setTimeout(resolve, this.COOLDOWN_DURATION_MS));
        } else {
          // Atraso dinâmico por envio: Delta t = random(3000ms, 7500ms)
          const delay = getRandomDelay(3000, 7500);
          console.log(`[QueueWorker] Mensagem enviada para ${item.whatsapp_destino}. Aguardando ${delay}ms (Anti-Ban)...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      // Finalizar status da campanha
      const finalStatus = errorCount > 0 && sentCount === 0 ? 'FALHA' : 'CONCLUIDO';
      await db
        .update(schema.disparosCampanha)
        .set({
          status: finalStatus,
          total_enviados: sentCount,
          total_erros: errorCount,
          updated_at: new Date(),
        })
        .where(eq(schema.disparosCampanha.id, campaignId))
        .catch(() => {});

      console.log(`[QueueWorker] Campanha ${campaignId} finalizada. Enviados: ${sentCount}, Erros: ${errorCount}`);
    } catch (error) {
      console.error(`[QueueWorker] Erro no processamento da campanha ${campaignId}:`, error);
      await db
        .update(schema.disparosCampanha)
        .set({ status: 'FALHA', updated_at: new Date() })
        .where(eq(schema.disparosCampanha.id, campaignId))
        .catch(() => {});
    } finally {
      this.isProcessing = false;
      this.activeCampaignId = null;
    }
  }
}

export const queueWorker = new DisparoQueueWorker();
