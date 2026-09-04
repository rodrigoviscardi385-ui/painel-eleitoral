import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { nativeWhatsAppService } from './nativeWhatsAppService.js';
import Groq from 'groq-sdk';

interface WarmingState {
  status: 'ATIVO' | 'PAUSADO' | 'CONCLUIDO';
  fase_atual: number;
  dias_ativos: number;
  msgs_enviadas_hoje: number;
  limite_diario_atual: number;
  health_score: number;
  numeros_parceiros: string[];
  simular_digitacao: boolean;
  delays_gaussianos: boolean;
  ultimo_ciclo_em?: string | null;
}

class ChipWarmerService {
  private timer: NodeJS.Timeout | null = null;
  private groq: Groq | null = null;

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    if (apiKey) {
      this.groq = new Groq({ apiKey });
    }
  }

  /**
   * Obtém a configuração e status atual do aquecedor de chip
   */
  async getStatus(): Promise<WarmingState> {
    try {
      const [config] = await db
        .select()
        .from(schema.chipWarmingConfig)
        .where(eq(schema.chipWarmingConfig.instance_name, 'campanha_2026'))
        .limit(1);

      if (!config) {
        // Inicializa registro padrão caso não exista
        const [created] = await db
          .insert(schema.chipWarmingConfig)
          .values({
            instance_name: 'campanha_2026',
            status: 'PAUSADO',
            fase_atual: 1,
            dias_ativos: 0,
            msgs_enviadas_hoje: 0,
            limite_diario_atual: 10,
            health_score: 25,
            numeros_parceiros: '[]',
          })
          .returning();

        return {
          status: created.status as any,
          fase_atual: created.fase_atual,
          dias_ativos: created.dias_ativos,
          msgs_enviadas_hoje: created.msgs_enviadas_hoje,
          limite_diario_atual: created.limite_diario_atual,
          health_score: created.health_score,
          numeros_parceiros: [],
          simular_digitacao: created.simular_digitacao,
          delays_gaussianos: created.delays_gaussianos,
          ultimo_ciclo_em: created.ultimo_ciclo_em?.toISOString() || null,
        };
      }

      let parceiros: string[] = [];
      try {
        parceiros = JSON.parse(config.numeros_parceiros || '[]');
      } catch (e) {
        parceiros = [];
      }

      // Cálculo de Health Score Dinâmico (0 a 100%)
      let score = 20; // Base para chip novo
      score += Math.min(config.dias_ativos * 8, 40); // Até 40 pontos por dias de maturação
      if (parceiros.length >= 2) score += 20; // Pontos por rede de ping-pong
      if (config.delays_gaussianos) score += 10;
      if (config.simular_digitacao) score += 10;
      score = Math.min(100, Math.max(10, score));

      return {
        status: config.status as any,
        fase_atual: config.fase_atual,
        dias_ativos: config.dias_ativos,
        msgs_enviadas_hoje: config.msgs_enviadas_hoje,
        limite_diario_atual: config.limite_diario_atual,
        health_score: score,
        numeros_parceiros: parceiros,
        simular_digitacao: config.simular_digitacao,
        delays_gaussianos: config.delays_gaussianos,
        ultimo_ciclo_em: config.ultimo_ciclo_em?.toISOString() || null,
      };
    } catch (err) {
      console.warn('Aviso ao consultar chip_warming_config:', err);
      return {
        status: 'PAUSADO',
        fase_atual: 1,
        dias_ativos: 0,
        msgs_enviadas_hoje: 0,
        limite_diario_atual: 10,
        health_score: 30,
        numeros_parceiros: [],
        simular_digitacao: true,
        delays_gaussianos: true,
        ultimo_ciclo_em: null,
      };
    }
  }

  /**
   * Alterna entre ATIVO e PAUSADO
   */
  async toggle(): Promise<WarmingState> {
    const current = await this.getStatus();
    const newStatus = current.status === 'ATIVO' ? 'PAUSADO' : 'ATIVO';

    await db
      .update(schema.chipWarmingConfig)
      .set({
        status: newStatus,
        updated_at: new Date(),
      })
      .where(eq(schema.chipWarmingConfig.instance_name, 'campanha_2026'));

    if (newStatus === 'ATIVO') {
      this.startScheduler();
    } else {
      this.stopScheduler();
    }

    return this.getStatus();
  }

  /**
   * Atualiza configurações do aquecedor (números parceiros, simulações)
   */
  async updateConfig(params: {
    numeros_parceiros?: string[];
    simular_digitacao?: boolean;
    delays_gaussianos?: boolean;
    limite_diario_atual?: number;
    fase_atual?: number;
  }): Promise<WarmingState> {
    const updateData: any = { updated_at: new Date() };

    if (params.numeros_parceiros !== undefined) {
      updateData.numeros_parceiros = JSON.stringify(params.numeros_parceiros);
    }
    if (params.simular_digitacao !== undefined) {
      updateData.simular_digitacao = params.simular_digitacao;
    }
    if (params.delays_gaussianos !== undefined) {
      updateData.delays_gaussianos = params.delays_gaussianos;
    }
    if (params.limite_diario_atual !== undefined) {
      updateData.limite_diario_atual = params.limite_diario_atual;
    }
    if (params.fase_atual !== undefined) {
      updateData.fase_atual = params.fase_atual;
    }

    await db
      .update(schema.chipWarmingConfig)
      .set(updateData)
      .where(eq(schema.chipWarmingConfig.instance_name, 'campanha_2026'));

    return this.getStatus();
  }

  /**
   * Gera uma mensagem casual e natural com IA Groq para simular interação humana genuína
   */
  private async generateWarmupMessage(): Promise<string> {
    const fallbacks = [
      'Opa, tudo certo por aí? Depois me dá um retorno sobre aquele assunto.',
      'Boa tarde! Conseguiu ver aquele material que conversamos mais cedo?',
      'Tranquilo! Quando tiver um tempinho me avisa para alinharmos.',
      'Show de bola, obrigado pelo apoio de sempre!',
      'Fala amigo! Tudo em paz na sua região hoje?',
      'Perfeito! Vamos conversando então, um abraço!',
    ];

    if (!this.groq) {
      return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    try {
      const response = await this.groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content:
              'Você é um assistente gerando mensagens curtas, casuais e realistas em português do Brasil para simulação de conversa no WhatsApp. Gere apenas UMA frase curta e natural (máximo 15 palavras), sem aspas nem explicações. Exemplos: "Tudo bem por aí? Como foi a reunião hoje?", "Boa tarde! Conseguiu ver aquele relatório?".',
          },
          {
            role: 'user',
            content: 'Gere uma mensagem casual de WhatsApp.',
          },
        ],
        temperature: 0.8,
        max_tokens: 60,
      });

      const text = response.choices[0]?.message?.content?.trim();
      return text || fallbacks[0];
    } catch (e) {
      return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }
  }

  /**
   * Executa um ciclo individual de aquecimento de chip
   */
  async executeWarmingCycle(): Promise<{ success: boolean; message?: string; targetPhone?: string; error?: string }> {
    const status = await this.getStatus();

    if (status.msgs_enviadas_hoje >= status.limite_diario_atual) {
      return {
        success: false,
        error: `Limite diário de segurança da Fase ${status.fase_atual} atingido (${status.msgs_enviadas_hoje}/${status.limite_diario_atual} msgs). Aguardando próximo dia para evitar bloqueios.`,
      };
    }

    if (!status.numeros_parceiros || status.numeros_parceiros.length === 0) {
      return {
        success: false,
        error: 'Nenhum número parceiro cadastrado para o ping-pong de aquecimento. Cadastre ao menos 1 número da sua equipe.',
      };
    }

    // Seleciona um número parceiro aleatório
    const targetPhone = status.numeros_parceiros[Math.floor(Math.random() * status.numeros_parceiros.length)];
    const msg = await this.generateWarmupMessage();

    // Dispara mensagem via Baileys com simulação humana ativa
    const sent = await nativeWhatsAppService.sendMessage(targetPhone, msg);

    if (sent) {
      await db
        .update(schema.chipWarmingConfig)
        .set({
          msgs_enviadas_hoje: status.msgs_enviadas_hoje + 1,
          ultimo_ciclo_em: new Date(),
          updated_at: new Date(),
        })
        .where(eq(schema.chipWarmingConfig.instance_name, 'campanha_2026'));

      console.log(`🔥 [Aquecedor de Chip] Ciclo executado para ${targetPhone}: "${msg}"`);
      return { success: true, message: msg, targetPhone };
    }

    return {
      success: false,
      error: 'WhatsApp Baileys desconectado ou falha no envio. Conecte o QR Code no painel.',
    };
  }

  /**
   * Scheduler automático em background com intervalos gaussianos
   */
  private startScheduler() {
    this.stopScheduler();

    // Executa ciclo a cada intervalo randômico entre 15 e 35 minutos durante horário comercial (8h às 21h)
    const scheduleNext = () => {
      const minMinutes = 15;
      const maxMinutes = 35;
      const randomMs = (Math.floor(Math.random() * (maxMinutes - minMinutes + 1)) + minMinutes) * 60 * 1000;

      this.timer = setTimeout(async () => {
        const now = new Date();
        const hour = now.getHours();

        // Apenas opera entre 08:00 e 21:30 para replicar horário humano
        if (hour >= 8 && hour <= 21) {
          await this.executeWarmingCycle().catch((e) => console.warn('Erro no ciclo agendado:', e));
        }

        scheduleNext();
      }, randomMs);
    };

    scheduleNext();
    console.log('🔥 [Aquecedor de Chip] Scheduler em background iniciado com intervalos gaussianos de 15 a 35 min.');
  }

  private stopScheduler() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
      console.log('🛑 [Aquecedor de Chip] Scheduler pausado.');
    }
  }
}

export const chipWarmerService = new ChipWarmerService();
