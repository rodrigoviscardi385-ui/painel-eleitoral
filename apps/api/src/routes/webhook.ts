import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db, recalculateNetworkMetrics } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { transcribeAudioWithWhisper, extractSupportersFromText } from '../services/groqExtractor.js';
import { evolutionService } from '../services/evolutionService.js';
import { nativeWhatsAppService } from '../services/nativeWhatsAppService.js';
import axios from 'axios';
import crypto from 'crypto';

// Cache de Idempotência em memória (TTL: 15 minutos)
const processedMessagesCache = new Map<string, number>();

function isMessageDuplicate(messageId: string): boolean {
  if (!messageId) return false;
  const now = Date.now();
  const cachedTime = processedMessagesCache.get(messageId);
  if (cachedTime && now - cachedTime < 15 * 60 * 1000) {
    return true; // Mensagem já processada
  }
  // Limpeza de cache antigo se exceder 5000 itens
  if (processedMessagesCache.size > 5000) {
    for (const [k, v] of processedMessagesCache.entries()) {
      if (now - v > 15 * 60 * 1000) processedMessagesCache.delete(k);
    }
  }
  processedMessagesCache.set(messageId, now);
  return false;
}

function maskPhoneLog(phone: string): string {
  if (!phone || phone.length < 8) return '****';
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 11) return `${clean.slice(0, 2)} 9****-${clean.slice(7)}`;
  return `****-${clean.slice(-4)}`;
}

// Validação em tempo constante contra timing-attacks
function isValidWebhookSecret(providedSecret?: string, expectedSecret?: string): boolean {
  if (!expectedSecret) return true; // Se não configurado secret, não bloqueia
  if (!providedSecret) return false;
  try {
    const providedBuffer = Buffer.from(providedSecret);
    const expectedBuffer = Buffer.from(expectedSecret);
    if (providedBuffer.length !== expectedBuffer.length) return false;
    return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

async function sendWhatsAppMessage(to: string, message: string) {
  if (nativeWhatsAppService.isConnected) {
    return nativeWhatsAppService.sendMessage(to, message);
  }
  return evolutionService.sendTextMessage(to, message);
}

async function createCampaignBaseGroup(name: string, phone: string, bairro?: string) {
  if (nativeWhatsAppService.isConnected) {
    const groupName = `[Base] ${name.split(' ')[0]} • Campanha 2026`;
    const res = await nativeWhatsAppService.createBaseGroup(groupName, phone);
    return {
      success: true,
      groupId: res?.groupId,
      inviteLink: res?.inviteLink,
    };
  }
  return evolutionService.createBaseGroup(name, phone, bairro);
}

export async function webhookRoutes(fastify: FastifyInstance) {
  /**
   * Endpoint de recepção de eventos da Evolution API
   * Máquina de Estados do WhatsApp (Estados 0, 1, 2, 3 e 4)
   */
  fastify.post('/webhook/evolution', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const webhookSecret = process.env.WEBHOOK_SECRET || process.env.EVOLUTION_API_KEY;
      const clientSecret = (request.headers['x-webhook-secret'] || request.headers['apikey'] || request.headers['authorization']) as string | undefined;

      // Validação timing-safe se o secret estiver configurado
      if (webhookSecret && clientSecret && !isValidWebhookSecret(clientSecret.replace('Bearer ', ''), webhookSecret)) {
        return reply.status(401).send({ error: 'Assinatura de webhook inválida' });
      }

      const body: any = request.body || {};
      const event = body.event || body.type;

      // Suporta múltiplos formatos de webhook da Evolution API
      if (event === 'messages.upsert' || event === 'MESSAGE_RECEIVED' || body.data) {
        const messageData = body.data || body;
        const key = messageData.key || {};
        const fromMe = key.fromMe;
        const messageId = key.id || messageData.id || messageData.messageId;

        // Idempotência Absoluta: Ignora retransmissões repetidas da mesma mensagem
        if (messageId && isMessageDuplicate(messageId)) {
          return reply.status(200).send({ status: 'ignored_duplicate', messageId });
        }
        
        // Ignorar mensagens enviadas pelo próprio bot
        if (fromMe) {
          return reply.status(200).send({ status: 'ignored_from_me' });
        }

        const remoteJid = key.remoteJid || messageData.from;
        if (!remoteJid || remoteJid.includes('@g.us')) {
          // Ignorar mensagens de grupos para processar apenas no privado
          return reply.status(200).send({ status: 'ignored_group' });
        }

        const rawNumber = remoteJid.replace('@s.whatsapp.net', '').replace(/\D/g, '');
        const messageContent = messageData.message || {};

        // 1. Extração do Conteúdo (Texto ou Áudio em RAM < 5MB)
        let textMessage = 
          messageContent.conversation || 
          messageContent.extendedTextMessage?.text || 
          messageContent.imageMessage?.caption || 
          '';

        const audioMessage = messageContent.audioMessage;

        // Se for áudio, faz download com limite de 5MB para evitar OOM no Free Tier
        if (audioMessage) {
          try {
            let audioBuffer: Buffer | null = null;
            if (audioMessage.url) {
              const audioResponse = await axios.get(audioMessage.url, {
                responseType: 'arraybuffer',
                maxContentLength: 5 * 1024 * 1024, // Limite estrito de 5 MB
                timeout: 5000, // Timeout de 5s
              });
              audioBuffer = Buffer.from(audioResponse.data);
            } else if (audioMessage.base64) {
              if (audioMessage.base64.length < 7 * 1024 * 1024) { // ~5MB base64
                audioBuffer = Buffer.from(audioMessage.base64, 'base64');
              }
            }

            if (audioBuffer) {
              textMessage = await transcribeAudioWithWhisper(audioBuffer, 'whatsapp_audio.ogg');
            } else {
              textMessage = await transcribeAudioWithWhisper(Buffer.from(''), 'mock.ogg');
            }
          } catch (audioErr) {
            console.error('Aviso ao transcrever áudio em RAM:', audioErr);
            textMessage = '';
          }
        }

        // 2. ESTADO 0: IDENTIFICAÇÃO E ENTRADA (Gatilho do QR Code / Mensagem Inicial)
        let [existingUser] = await db
          .select()
          .from(schema.usuarios)
          .where(eq(schema.usuarios.whatsapp, rawNumber))
          .catch(() => []);

        // Se for resposta direta de seção pendente (Estado 3 fallback numérico)
        if (existingUser && existingUser.status_onboarding === 'COMPLETO' && /^\d{1,4}$/.test(textMessage.trim())) {
          const numeroSecao = textMessage.trim();
          // Atualiza o último apoiador pendente cadastrado por este líder
          const [ultimoPendente] = await db
            .select()
            .from(schema.usuarios)
            .where(eq(schema.usuarios.lider_acima_id, existingUser.id))
            .orderBy(desc(schema.usuarios.created_at))
            .limit(1)
            .catch(() => []);

          if (ultimoPendente && !ultimoPendente.secao_eleitoral) {
            await db
              .update(schema.usuarios)
              .set({ secao_eleitoral: numeroSecao, updated_at: new Date() })
              .where(eq(schema.usuarios.id, ultimoPendente.id))
              .catch(() => {});

            await evolutionService.sendTextMessage(
              rawNumber,
              `✅ Perfeito! Seção *${numeroSecao}* vinculada com sucesso ao cadastro de *${ultimoPendente.nome}*.`
            );
            return reply.status(200).send({ status: 'secao_atualizada' });
          }
        }

        // Se for um Líder já cadastrado enviando saudação / gatilho de QR Code:
        if (existingUser && existingUser.status_onboarding === 'COMPLETO' && (
          textMessage.toLowerCase().includes('iniciar') ||
          textMessage.toLowerCase().includes('começar') ||
          textMessage.toLowerCase().includes('menu') ||
          textMessage.toLowerCase().includes('meta') ||
          textMessage.toLowerCase().includes('ola') ||
          textMessage.toLowerCase().includes('olá')
        )) {
          const totalRealizado = existingUser.total_indicados_diretos || 0;
          const metaLeader = 50; // Meta padrão por líder
          const saldoRestante = Math.max(0, metaLeader - totalRealizado);

          const menuLider = `🏛️ *PAINEL DA LIDERANÇA - CAMPANHA 2026*\n\n` +
            `Olá, *${existingUser.nome}*! 👋\n` +
            `📍 Bairro: *${existingUser.bairro || 'Geral'}* | Zona: *${existingUser.zona_eleitoral || '-'}*\n\n` +
            `📊 *Status da sua Meta:*\n` +
            `• Apoiadores Cadastrados: *${totalRealizado}*\n` +
            `• Meta de Mobilização: *${metaLeader}*\n` +
            `• Saldo Restante: *${saldoRestante} apoios*\n\n` +
            `🎤 *MODO DE ESCUTA ATIVA:*\n` +
            `Envie um *áudio ou texto livre* a qualquer momento com os nomes e telefones de novos apoiadores.\n\n` +
            `🔗 *Link do seu Grupo de Base:*\n${existingUser.grupo_link_convite || 'Link no painel'}`;

          await evolutionService.sendTextMessage(rawNumber, menuLider);
          return reply.status(200).send({ status: 'menu_lider_enviado' });
        }

        // 3. ESTADO 1: ONBOARDING DO LÍDER (COLETA EM 2 PASSOS)
        if (!existingUser || existingUser.status_onboarding !== 'COMPLETO') {
          const [tempState] = await db
            .select()
            .from(schema.fluxosOnboardingTemp)
            .where(eq(schema.fluxosOnboardingTemp.whatsapp, rawNumber))
            .catch(() => []);

          const currentStep = tempState?.etapa_atual || 'INICIO';
          let tempDados = tempState?.dados_temporarios ? JSON.parse(tempState.dados_temporarios) : {};

          // Passo A: Solicita Nome Completo e Bairro
          if (currentStep === 'INICIO') {
            await db
              .insert(schema.fluxosOnboardingTemp)
              .values({
                whatsapp: rawNumber,
                etapa_atual: 'PASSO_A',
                dados_temporarios: JSON.stringify({}),
              })
              .onConflictDoUpdate({
                target: schema.fluxosOnboardingTemp.whatsapp,
                set: { etapa_atual: 'PASSO_A', dados_temporarios: '{}', updated_at: new Date() },
              })
              .catch(() => {});

            const msgPassoA = `🗳️ *BEM-VINDO AO COMITÊ ELEITORAL 2026!*\n\n` +
              `Para iniciar seu credenciamento oficial como *Líder Comunitário*, por favor responda:\n\n` +
              `1️⃣ *Qual é o seu Nome Completo e em qual Bairro você mora?*\n` +
              `_(Ex: Marcos Silva, Centro)_`;

            await sendWhatsAppMessage(rawNumber, msgPassoA);
            return reply.status(200).send({ status: 'onboarding_passo_a_solicitado' });
          }

          if (currentStep === 'PASSO_A') {
            // Extrai nome e bairro do texto livre do Passo A
            const partes = textMessage.split(/[,e\n-]/i).map((p: string) => p.trim()).filter(Boolean);
            tempDados.nome = partes[0] || textMessage.trim();
            tempDados.bairro = partes[1] || 'Centro';

            await db
              .update(schema.fluxosOnboardingTemp)
              .set({
                etapa_atual: 'PASSO_B',
                dados_temporarios: JSON.stringify(tempDados),
                updated_at: new Date(),
              })
              .where(eq(schema.fluxosOnboardingTemp.whatsapp, rawNumber))
              .catch(() => {});

            const msgPassoB = `Ótimo, *${tempDados.nome}* (${tempDados.bairro})! 👏\n\n` +
              `2️⃣ Agora informe sua *Zona Eleitoral* e *Seção de Votação*:\n` +
              `_(Ex: Zona 120, Seção 45)_`;

            await sendWhatsAppMessage(rawNumber, msgPassoB);
            return reply.status(200).send({ status: 'onboarding_passo_b_solicitado' });
          }

          // Passo B: Conclusão do Onboarding, Criação do Grupo e Transição para Escuta Ativa
          if (currentStep === 'PASSO_B') {
            const zonaMatch = textMessage.match(/(?:zona\s*|z\s*)?(\d{1,4})/i);
            const secaoMatch = textMessage.match(/(?:se[çc][aã]o\s*|s\s*)?(\d{1,4})/i);
            const zona = zonaMatch ? zonaMatch[1] : '100';
            const secao = secaoMatch ? secaoMatch[1] : '01';

            // 1. Criação automática de grupo de base com nome padronizado `[Base] {PrimeiroNome} • Campanha 2026`
            const groupResult = await createCampaignBaseGroup(
              tempDados.nome,
              rawNumber,
              tempDados.bairro
            );

            // 2. Salva Líder no PostgreSQL
            await db
              .insert(schema.usuarios)
              .values({
                nome: tempDados.nome,
                whatsapp: rawNumber,
                cargo: 'LIDER',
                bairro: tempDados.bairro,
                zona_eleitoral: zona,
                secao_eleitoral: secao,
                status_onboarding: 'COMPLETO',
                grupo_whatsapp_id: groupResult.groupId || null,
                grupo_link_convite: groupResult.inviteLink || null,
              })
              .onConflictDoUpdate({
                target: schema.usuarios.whatsapp,
                set: {
                  nome: tempDados.nome,
                  cargo: 'LIDER',
                  bairro: tempDados.bairro,
                  zona_eleitoral: zona,
                  secao_eleitoral: secao,
                  status_onboarding: 'COMPLETO',
                  grupo_whatsapp_id: groupResult.groupId || null,
                  grupo_link_convite: groupResult.inviteLink || null,
                  updated_at: new Date(),
                },
              })
              .catch(() => {});

            // Limpa estado temporário
            await db
              .delete(schema.fluxosOnboardingTemp)
              .where(eq(schema.fluxosOnboardingTemp.whatsapp, rawNumber))
              .catch(() => {});

            // 3. Mensagem de Boas-Vindas e link oficial do grupo
            const welcomeMsg = `🎉 *PARABÉNS, ${tempDados.nome.toUpperCase()}! SEU CADASTRO DE LÍDER FOI CONCLUÍDO!*\n\n` +
              `📍 Base territorial: *${tempDados.bairro}* (Zona ${zona} / Seção ${secao})\n\n` +
              `👥 *Seu Grupo de Base Oficial:* \n${groupResult.inviteLink || 'Link gerado no painel'}\n\n` +
              `🎙️ *MODO DE ESCUTA ATIVA INICIADO:*\n` +
              `Envie áudios ou mensagens de texto com os dados dos seus apoiadores (amigos, familiares e vizinhos). Nossa IA fará a extração e o vínculo automático à sua rede!`;

            await sendWhatsAppMessage(rawNumber, welcomeMsg);
            return reply.status(200).send({ status: 'onboarding_concluido' });
          }
        }

        // 4. ESTADO 2 & 3: MODO DE ESCUTA ATIVA, EXTRAÇÃO GROQ E TRATAMENTO DE PENDÊNCIAS
        if (existingUser && existingUser.status_onboarding === 'COMPLETO') {
          const extraction = await extractSupportersFromText(textMessage);

          // Fallback: Áudio Incompreensível / Sem Nome
          if (extraction.status === 'INCOMPREENSIVEL' || extraction.eleitores.length === 0) {
            await sendWhatsAppMessage(
              rawNumber,
              `⚠️ Não consegui entender o áudio com clareza devido ao barulho de fundo ou ausência de dados.\n\nPode repetir a mensagem ou digitar o *Nome, Telefone e Bairro* da pessoa?`
            );
            return reply.status(200).send({ status: 'audio_incompreensivel' });
          }

          // Garante que o Líder possui grupo oficial de base
          if (!existingUser.grupo_link_convite) {
            const primeiroNome = (existingUser.nome || 'Líder').split(' ')[0];
            const groupResult = await createCampaignBaseGroup(primeiroNome, existingUser.whatsapp, existingUser.bairro || undefined);
            if (groupResult?.inviteLink) {
              existingUser.grupo_link_convite = groupResult.inviteLink;
              existingUser.grupo_whatsapp_id = groupResult.groupId || null;
              await db
                .update(schema.usuarios)
                .set({
                  grupo_link_convite: groupResult.inviteLink,
                  grupo_whatsapp_id: groupResult.groupId || null,
                  updated_at: new Date(),
                })
                .where(eq(schema.usuarios.id, existingUser.id));
            }
          }

          let cadastradosComSucesso = 0;
          const relatorioConfirmacao: string[] = [];
          const pendenciasSecao: string[] = [];

          for (const ap of extraction.eleitores) {
            if (!ap.nome || ap.nome.trim().length === 0) continue;

            let cleanPhone = ap.whatsapp ? ap.whatsapp.replace(/\D/g, '') : null;
            if (cleanPhone && (cleanPhone.length === 10 || cleanPhone.length === 11)) {
              cleanPhone = `55${cleanPhone}`;
            }
            const zapKey = cleanPhone || `sem_contato_${Date.now()}_${Math.floor(Math.random()*1000)}`;

            await db
              .insert(schema.usuarios)
              .values({
                nome: ap.nome,
                whatsapp: zapKey,
                cargo: 'APOIADOR',
                lider_acima_id: existingUser.id,
                bairro: ap.bairro || existingUser.bairro,
                zona_eleitoral: ap.zona_eleitoral || existingUser.zona_eleitoral,
                secao_eleitoral: ap.secao_eleitoral || null,
                status_onboarding: 'COMPLETO',
                notas: cleanPhone ? 'Apoiador com WhatsApp' : 'SEM_CONTATO_DIRETO (Voto contabilizado)',
              })
              .onConflictDoUpdate({
                target: schema.usuarios.whatsapp,
                set: {
                  nome: ap.nome,
                  lider_acima_id: existingUser.id,
                  bairro: ap.bairro || existingUser.bairro,
                  zona_eleitoral: ap.zona_eleitoral || existingUser.zona_eleitoral,
                  secao_eleitoral: ap.secao_eleitoral || null,
                  updated_at: new Date(),
                },
              })
              .catch(() => {});

            cadastradosComSucesso++;
            relatorioConfirmacao.push(`• *${ap.nome}* (${ap.bairro || existingUser.bairro || 'Geral'}) - Z: ${ap.zona_eleitoral || existingUser.zona_eleitoral || '-'}/S: ${ap.secao_eleitoral || 'Pendente'}`);

            if (!ap.secao_eleitoral) {
              pendenciasSecao.push(ap.nome);
            }

            // ESTADO 4: Envio individual amigável no WhatsApp do apoiador com link do grupo
            if (cleanPhone && existingUser.grupo_link_convite) {
              const msgApoiador = `Olá, *${ap.nome.split(' ')[0]}*! 👋 🗳️\n\n` +
                `Você foi cadastrado(a) com sucesso na base de apoio de *${existingUser.nome}*.\n\n` +
                `Participe do nosso grupo oficial no WhatsApp para acompanhar as novidades e propostas:\n` +
                `👉 ${existingUser.grupo_link_convite}\n\n` +
                `Vamos juntos! 🚀`;

              sendWhatsAppMessage(cleanPhone, msgApoiador).catch(() => {});
            }
          }

          // Recalcular métricas de rede (CTEs)
          await recalculateNetworkMetrics().catch(() => {});

          const novoTotal = (existingUser.total_indicados_diretos || 0) + cadastradosComSucesso;
          const metaTotal = 50;
          const saldoRestante = Math.max(0, metaTotal - novoTotal);

          // ESTADO 4: Comprovante ao Líder e feedback de pendência de seção
          let respostaLider = `✅ *${cadastradosComSucesso} NOVO(S) APOIADOR(ES) CADASTRADO(S)!*\n\n` +
            `${relatorioConfirmacao.join('\n')}\n\n` +
            `📈 *Seu Progresso de Meta:* ${novoTotal} / ${metaTotal} (${saldoRestante} restantes)\n\n` +
            (existingUser.grupo_link_convite
              ? `🔗 *O link do seu grupo de base foi enviado diretamente no WhatsApp de cada apoiador!*\n\n`
              : '');

          if (pendenciasSecao.length > 0) {
            respostaLider += `\n\n💡 *Dica:* Se souber a seção eleitoral de *${pendenciasSecao[0]}*, basta me responder com o número!`;
          }

          await sendWhatsAppMessage(rawNumber, respostaLider);

          return reply.status(200).send({
            status: 'supporters_registered',
            count: cadastradosComSucesso,
            transcricao: extraction.transcricao,
          });
        }
      }

      return reply.status(200).send({ status: 'event_processed' });
    } catch (error) {
      console.error('Erro no processamento do webhook Evolution:', error);
      return reply.status(500).send({ error: 'Falha no processamento do webhook' });
    }
  });
}
