/**
 * messageProcessor.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Serviço centralizado de processamento de mensagens do WhatsApp.
 * Elimina duplicação entre wppService (Baileys) e metaWebhook (Meta Cloud API).
 * Agora a Meta Cloud API é o único canal de comunicação oficial.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { db, recalculateNetworkMetrics, logAuditLGPD } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import {
  transcribeAudio,
  extractVoterEntities,
  generateCampaignBotResponse,
  extractExpenseFromText,
} from './groqService.js';
import { parseBoletimUrna } from './buDecoderService.js';
import { ocrImageBuffer } from './ocrService.js';
import { sendMetaTextMessage, downloadMetaMedia } from './metaCloudService.js';
import { sendWhatsAppMessage } from './wppService.js';
import fs from 'fs';
import path from 'path';

export interface IncomingMessage {
  senderPhone: string;
  contactName: string;
  messageId: string;
  type: 'text' | 'audio' | 'image' | 'document';
  textContent?: string;
  audioMediaId?: string;
  imageMediaId?: string;
  imageCaption?: string;
}

export interface ProcessingResult {
  success: boolean;
  replied: boolean;
  action?: string;
}

/**
 * Ponto de entrada único para processamento de qualquer mensagem recebida
 */
export async function processIncomingMessage(msg: IncomingMessage): Promise<ProcessingResult> {
  const { senderPhone, contactName, type } = msg;

  let textContent = msg.textContent || '';
  let messageType: 'TEXTO' | 'AUDIO' | 'IMAGEM' | 'DOCUMENTO' = 'TEXTO';
  let mediaUrl: string | undefined;

  // ── 1. Download e processamento de mídia ────────────────────────────────────

  if (type === 'audio' && msg.audioMediaId) {
    messageType = 'AUDIO';
    const media = await downloadMetaMedia(msg.audioMediaId);
    if (media) {
      const tempPath = path.join(process.cwd(), `temp_audio_${Date.now()}.ogg`);
      try {
        fs.writeFileSync(tempPath, media.buffer);
        const transcribed = await transcribeAudio(tempPath);
        textContent = `[Áudio Transcrito]: ${transcribed}`;
        console.log(`[Processor] Áudio de ${senderPhone} transcrito: "${transcribed.slice(0, 80)}..."`);
      } catch (err: any) {
        console.error('[Processor Audio Error]', err?.message);
        textContent = '[Áudio não pôde ser transcrito automaticamente]';
      } finally {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      }
    }
  }

  if (type === 'image' && msg.imageMediaId) {
    messageType = 'IMAGEM';
    const media = await downloadMetaMedia(msg.imageMediaId);
    if (media) {
      // Limite de 5MB para OCR
      if (media.buffer.length <= 5 * 1024 * 1024) {
        const uploadsDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        const imgFileName = `img_${Date.now()}_${senderPhone}.jpg`;
        fs.writeFileSync(path.join(uploadsDir, imgFileName), media.buffer);
        mediaUrl = `/uploads/${imgFileName}`;

        const ocrText = await ocrImageBuffer(media.buffer);
        const caption = msg.imageCaption || '';
        textContent = caption ? `${caption}\n[Texto Foto]: ${ocrText}` : ocrText;
      } else {
        console.warn(`[Processor] Imagem de ${senderPhone} excede 5MB — OCR ignorado.`);
        textContent = msg.imageCaption || '[Imagem recebida]';
      }
    }
  }

  // ── 2. Persistir mensagem recebida ──────────────────────────────────────────

  await db.insert(schema.mensagensChat).values({
    conversa_id: senderPhone,
    de_whatsapp: senderPhone,
    para_whatsapp: 'CAMPANHA',
    conteudo: textContent || '[Mídia]',
    tipo: messageType,
    midia_url: mediaUrl || null,
    direcao: 'ENTRADA',
    status: 'LIDO',
  });

  // ── 3. Garantir usuário no banco ────────────────────────────────────────────

  let user = await db
    .select()
    .from(schema.usuarios)
    .where(eq(schema.usuarios.whatsapp, senderPhone))
    .limit(1)
    .then((r) => r[0]);

  if (!user) {
    [user] = await db
      .insert(schema.usuarios)
      .values({
        nome: contactName,
        whatsapp: senderPhone,
        cargo: 'APOIADOR',
        status_onboarding: 'PENDENTE_BAIRRO',
      })
      .returning();

    await logAuditLGPD('SISTEMA', 'NOVO_CADASTRO_META_WHATSAPP', 'meta_cloud_api', {
      id: user.id,
      nome: user.nome,
      whatsapp: senderPhone,
    });
    console.log(`[Processor] Novo eleitor cadastrado: ${contactName} (${senderPhone})`);
  }

  // ── 4. Status da conversa ───────────────────────────────────────────────────

  let statusConversa = await db
    .select()
    .from(schema.conversaStatus)
    .where(eq(schema.conversaStatus.conversa_id, senderPhone))
    .limit(1)
    .then((r) => r[0]);

  if (!statusConversa) {
    [statusConversa] = await db
      .insert(schema.conversaStatus)
      .values({
        conversa_id: senderPhone,
        remote_jid: `${senderPhone}@s.whatsapp.net`,
        modo: 'BOT',
      })
      .returning();
  }

  const cleanUpperText = textContent.trim().toUpperCase();

  // ── 5. Verificação de Opt-out (LGPD / TSE) ─────────────────────────────────

  if (['SAIR', 'PARAR', 'CANCELAR', 'NAO QUERO', 'DESCADASTRAR'].includes(cleanUpperText)) {
    await db
      .update(schema.usuarios)
      .set({ opt_out: true, updated_at: new Date() })
      .where(eq(schema.usuarios.id, user.id));

    await logAuditLGPD(senderPhone, 'OPT_OUT_SOLICITADO', 'Meta_Cloud_API', { motivo: textContent });
    await reply(senderPhone, 'Entendido! Seu número foi descadastrado de nossa lista conforme a LGPD e resoluções do TSE. Você não receberá mais mensagens automáticas. Para retornar, envie *QUERO VOLTAR*.');
    return { success: true, replied: true, action: 'OPT_OUT' };
  }

  if (user.opt_out) {
    if (cleanUpperText === 'QUERO VOLTAR') {
      await db
        .update(schema.usuarios)
        .set({ opt_out: false, updated_at: new Date() })
        .where(eq(schema.usuarios.id, user.id));
      await reply(senderPhone, 'Bem-vindo(a) de volta à nossa mobilização! 🚀');
    }
    return { success: true, replied: true, action: 'OPT_OUT_GUARD' };
  }

  // ── 6. Comando #meusvotos ───────────────────────────────────────────────────

  if (cleanUpperText.startsWith('#MEUSVOTOS') || cleanUpperText === 'MEUS VOTOS') {
    await recalculateNetworkMetrics(user.id);
    const updatedUser = await db.select().from(schema.usuarios).where(eq(schema.usuarios.id, user.id)).then((r) => r[0]);
    const direct = updatedUser?.total_indicados_diretos || 0;
    const total = updatedUser?.total_indicados_rede || 0;

    await reply(senderPhone, `📊 *EXTRATO DE LIDERANÇA*\nOlá, *${user.nome}*!\n\n👥 *Diretos:* ${direct}\n🌳 *Rede total:* ${total} pessoas\n🏅 *Cargo:* ${user.cargo}\n\nDigite *#gasto* para registrar uma despesa ou *MENU* para opções.`);
    return { success: true, replied: true, action: 'MEUSVOTOS' };
  }

  // ── 7. Comando #gasto ───────────────────────────────────────────────────────

  if (cleanUpperText.startsWith('#GASTO')) {
    const expenseText = textContent.replace(/#GASTO/i, '').trim();
    if (!expenseText) {
      await reply(senderPhone, 'Para registrar um gasto, envie:\n*#gasto [descrição, valor e forma de pagamento]*\nExemplo: _#gasto 120 reais de gasolina no posto Shell pago no PIX_');
      return { success: true, replied: true, action: 'GASTO_HELP' };
    }

    const parsed = await extractExpenseFromText(expenseText);
    await db.insert(schema.gastosCampanha).values({
      descricao: parsed.descricao || expenseText,
      valor: String(parsed.valor || 0),
      categoria: parsed.categoria || 'OUTROS',
      forma_pagamento: parsed.forma_pagamento || 'PIX',
      fornecedor_nome: parsed.fornecedor_nome || null,
      fornecedor_documento: parsed.fornecedor_documento || null,
      numero_documento: parsed.numero_documento || null,
      responsavel_nome: user.nome,
      status_auditoria: 'PENDENTE',
      observacoes: `Registrado via WhatsApp por ${user.nome} (${senderPhone})`,
    });

    await reply(senderPhone, `🧾 *GASTO REGISTRADO!*\nDescrição: ${parsed.descricao}\nValor: R$ ${Number(parsed.valor).toFixed(2)}\nCategoria TSE: ${parsed.categoria}\nPagamento: ${parsed.forma_pagamento}\nStatus: *Em Auditoria Contábil* ✅`);
    return { success: true, replied: true, action: 'GASTO_REGISTRADO' };
  }

  // ── 8. Boletim de Urna (QR-BU / foto) ──────────────────────────────────────

  const isBU =
    cleanUpperText.includes('QRBU') ||
    cleanUpperText.includes('VR=01') ||
    (cleanUpperText.includes('ZON=') && cleanUpperText.includes('SEC=')) ||
    cleanUpperText.includes('BOLETIM DE URNA') ||
    cleanUpperText.startsWith('#BU') ||
    cleanUpperText.includes('#APURACAO');

  if (isBU) {
    const configCamp = await db.select().from(schema.campanhaConfig).limit(1).then((r) => r[0]);
    const numeroAlvo = configCamp?.numero_candidato || '55955';
    const parsedBU = await parseBoletimUrna(textContent, numeroAlvo);

    if (parsedBU.valido) {
      const existingBU = await db
        .select()
        .from(schema.boletinsUrna)
        .where(sql`${schema.boletinsUrna.zona} = ${parsedBU.zona} AND ${schema.boletinsUrna.secao} = ${parsedBU.secao} AND ${schema.boletinsUrna.numero_candidato} = ${parsedBU.numeroCandidatoAlvo}`)
        .limit(1)
        .then((r) => r[0]);

      if (existingBU) {
        await db.update(schema.boletinsUrna)
          .set({
            votos_candidato: parsedBU.votosCandidato,
            total_comparecimento: parsedBU.totalComparecimento,
            total_aptos: parsedBU.totalAptos,
            total_abstencoes: parsedBU.totalAbstencoes,
            votos_legenda: parsedBU.votosLegenda,
            votos_brancos: parsedBU.votosBrancos,
            votos_nulos: parsedBU.votosNulos,
            dados_completos_json: JSON.stringify(parsedBU.votosPorCandidato),
            foto_comprovante_url: mediaUrl || existingBU.foto_comprovante_url,
            remetente_nome: user.nome,
            remetente_whatsapp: senderPhone,
          })
          .where(eq(schema.boletinsUrna.id, existingBU.id));
      } else {
        await db.insert(schema.boletinsUrna).values({
          municipio: parsedBU.municipio,
          codigo_municipio: parsedBU.codigoMunicipio,
          zona: parsedBU.zona,
          secao: parsedBU.secao,
          local_votacao_nome: parsedBU.localVotacaoNome,
          bairro: parsedBU.bairro,
          total_aptos: parsedBU.totalAptos,
          total_comparecimento: parsedBU.totalComparecimento,
          total_abstencoes: parsedBU.totalAbstencoes,
          votos_candidato: parsedBU.votosCandidato,
          votos_legenda: parsedBU.votosLegenda,
          votos_brancos: parsedBU.votosBrancos,
          votos_nulos: parsedBU.votosNulos,
          cargo: parsedBU.cargo,
          numero_candidato: parsedBU.numeroCandidatoAlvo,
          dados_completos_json: JSON.stringify(parsedBU.votosPorCandidato),
          foto_comprovante_url: mediaUrl || null,
          remetente_nome: user.nome,
          remetente_whatsapp: senderPhone,
          validado: true,
        });
      }

      await reply(senderPhone, `🗳️ *BOLETIM DE URNA APURADO!*\n📍 *Local:* ${parsedBU.localVotacaoNome}\n📌 *Zona:* ${parsedBU.zona} | *Seção:* ${parsedBU.secao}\n\n⭐ *Votos do candidato (${parsedBU.numeroCandidatoAlvo}):* *${parsedBU.votosCandidato} votos!*\n👥 Comparecimento: ${parsedBU.totalComparecimento} de ${parsedBU.totalAptos} aptos\n\nObrigado pela atuação como fiscal! 🚀`);
      return { success: true, replied: true, action: 'BU_REGISTRADO' };
    } else {
      await reply(senderPhone, `❌ Não consegui ler o Boletim de Urna. Envie uma foto nítida do QR Code ou o texto completo com Zona, Seção e Votos.`);
      return { success: true, replied: true, action: 'BU_INVALIDO' };
    }
  }

  // ── 9. Cadastro de apoiador por áudio ───────────────────────────────────────

  if (messageType === 'AUDIO') {
    const isCadastro =
      cleanUpperText.includes('APOIADOR') ||
      cleanUpperText.includes('INDICO') ||
      cleanUpperText.includes('CADASTRA') ||
      cleanUpperText.includes('VAI VOTAR') ||
      cleanUpperText.includes('ELEITOR');

    if (isCadastro) {
      const extracted = await extractVoterEntities(textContent);
      if (extracted.nome && extracted.nome.length > 2) {
        const cleanPhone = extracted.whatsapp ? extracted.whatsapp.replace(/\D/g, '') : `apoiador_${Date.now()}`;
        const existing = await db.select().from(schema.usuarios).where(eq(schema.usuarios.whatsapp, cleanPhone)).then((r) => r[0]);

        if (!existing) {
          await db.insert(schema.usuarios).values({
            nome: extracted.nome,
            whatsapp: cleanPhone,
            bairro: extracted.bairro || null,
            cargo: 'APOIADOR',
            lider_acima_id: user.id,
            status_onboarding: extracted.bairro ? 'COMPLETO' : 'PENDENTE_BAIRRO',
            notas: `Cadastrado via áudio por ${user.nome} (${senderPhone})`,
          });

          await recalculateNetworkMetrics(user.id);
        }

        await reply(senderPhone, `✅ *APOIADOR CADASTRADO!*\n👤 *Nome:* ${extracted.nome}\n📍 *Bairro:* ${extracted.bairro || 'Não informado'}\n📱 *WhatsApp:* ${extracted.whatsapp || 'Não informado'}\n🏅 *Liderança:* ${user.nome}\n\nDigite *#meusvotos* para ver o tamanho da sua rede! 🚀`);
        return { success: true, replied: true, action: 'APOIADOR_AUDIO' };
      }
    }
  }

  // ── 10. Comprovante fiscal por imagem ───────────────────────────────────────

  if (messageType === 'IMAGEM') {
    const isCupom =
      cleanUpperText.includes('#GASTO') ||
      cleanUpperText.includes('CUPOM') ||
      cleanUpperText.includes('NOTA FISCAL') ||
      cleanUpperText.includes('DANFE') ||
      cleanUpperText.includes('TOTAL') ||
      cleanUpperText.includes('VALOR');

    if (isCupom) {
      const parsed = await extractExpenseFromText(textContent);
      if (parsed.valor > 0 || parsed.descricao) {
        await db.insert(schema.gastosCampanha).values({
          descricao: parsed.descricao || 'Gasto registrado por foto',
          valor: String(parsed.valor || 0),
          categoria: parsed.categoria || 'OUTROS',
          forma_pagamento: parsed.forma_pagamento || 'PIX',
          fornecedor_nome: parsed.fornecedor_nome || null,
          comprovante_url: mediaUrl || null,
          responsavel_nome: user.nome,
          status_auditoria: 'PENDENTE',
          observacoes: `Comprovante fotográfico por ${user.nome} (${senderPhone})`,
        });

        await reply(senderPhone, `🧾 *COMPROVANTE FISCAL REGISTRADO!*\nDescrição: ${parsed.descricao}\nValor: R$ ${Number(parsed.valor).toFixed(2)}\nFornecedor: ${parsed.fornecedor_nome || 'A identificar'}\nCategoria TSE: ${parsed.categoria}\nComprovante: *Foto anexada* 📸\nStatus: *Em Auditoria Contábil*`);
        return { success: true, replied: true, action: 'CUPOM_REGISTRADO' };
      }
    }
  }

  // ── 11. Alternância BOT ↔ HUMANO ────────────────────────────────────────────

  const isMenuKeyword = ['MENU', 'INICIO', 'INÍCIO', 'BOT', 'ROBO', 'ROBÔ', 'VOLTAR', '0'].includes(cleanUpperText);
  const isHumanRequest = ['HUMANO', 'ATENDENTE', 'FALAR COM EQUIPE', 'FALAR COM HUMANO', 'SUPORTE'].includes(cleanUpperText);

  if (isMenuKeyword && statusConversa.modo === 'HUMANO') {
    await db.update(schema.conversaStatus)
      .set({ modo: 'BOT', atendente_nome: null, updated_at: new Date() })
      .where(eq(schema.conversaStatus.conversa_id, senderPhone));
    statusConversa.modo = 'BOT';
  }

  if (isHumanRequest) {
    await db.update(schema.conversaStatus)
      .set({ modo: 'HUMANO', updated_at: new Date() })
      .where(eq(schema.conversaStatus.conversa_id, senderPhone));

    await reply(senderPhone, '👤 *ATENDIMENTO HUMANO*\nTransferimos você para nossa equipe de comitê! Em instantes responderemos.\n\n_(Para reativar o menu automático, envie *MENU*)_');
    return { success: true, replied: true, action: 'TRANSFER_HUMANO' };
  }

  if (statusConversa.modo === 'HUMANO') {
    return { success: true, replied: false, action: 'MODO_HUMANO' };
  }

  // ── 12. Configuração do Bot ─────────────────────────────────────────────────

  const botCfg = await db.select().from(schema.botConfig).limit(1).then((r) => r[0]);
  if (botCfg && !botCfg.ativo) return { success: true, replied: false, action: 'BOT_DESLIGADO' };
  if (botCfg && botCfg.modo_padrao === 'HUMANO') return { success: true, replied: false, action: 'MODO_HUMANO_PADRAO' };

  const config = await db.select().from(schema.campanhaConfig).limit(1).then((r) => r[0]);

  // ── 13. Saudação / Primeiro contato / Menu ──────────────────────────────────

  const isGreeting = ['OI', 'OLA', 'OLÁ', 'BOM DIA', 'BOA TARDE', 'BOA NOITE', 'OPA', 'HELLO', 'HI', 'E AI'].includes(cleanUpperText);
  const msgCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.mensagensChat)
    .where(and(eq(schema.mensagensChat.conversa_id, senderPhone), eq(schema.mensagensChat.direcao, 'ENTRADA')))
    .then((r) => Number(r[0]?.count || 0));

  const isFirstContact = msgCount <= 1;

  if (isGreeting || isMenuKeyword || isFirstContact) {
    const boas = botCfg?.mensagem_boas_vindas || `Olá! Bem-vindo(a) ao canal oficial da campanha de ${config?.nome_urna || 'nossa liderança'}!`;
    const menu = botCfg?.menu_opcoes || `1 - Propostas do candidato\n2 - Falar com o comitê\n3 - Indicar apoiadores\n4 - Materiais e santinho\n5 - Grupo do bairro`;
    await reply(senderPhone, `${boas}\n\n${menu}\n\n_Envie o número da opção (1 a 5):_`);
    return { success: true, replied: true, action: 'BOAS_VINDAS' };
  }

  // ── 14. Opções do menu (1–5) ────────────────────────────────────────────────

  if (cleanUpperText === '1' || cleanUpperText.includes('PROPOSTA')) {
    const propostas = config?.propostas_ia || 'Trabalho sério pela saúde, educação e apoio ao trabalhador.';
    await reply(senderPhone, `📋 *PROPOSTAS OFICIAIS*\n\n${propostas}\n\n👉 _Digite *MENU* para voltar._`);
    return { success: true, replied: true, action: 'PROPOSTAS' };
  }

  if (cleanUpperText === '2' || cleanUpperText.includes('COMITE')) {
    await db.update(schema.conversaStatus).set({ modo: 'HUMANO', updated_at: new Date() }).where(eq(schema.conversaStatus.conversa_id, senderPhone));
    await reply(senderPhone, `👤 *ATENDIMENTO DO COMITÊ*\nVocê foi transferido! Em instantes responderemos.\n\n_(Para voltar ao bot: *MENU*)_`);
    return { success: true, replied: true, action: 'MENU_2_HUMANO' };
  }

  if (cleanUpperText === '3' || cleanUpperText.includes('INDICAR')) {
    await reply(senderPhone, `🗳️ *INDICAR APOIADORES*\nObrigado! Envie:\n• *Nome completo*\n• *Bairro / Cidade*\n• *WhatsApp com DDD*\n\n_(Digite *MENU* para voltar)_`);
    return { success: true, replied: true, action: 'MENU_3_INDICACAO' };
  }

  if (cleanUpperText === '4' || cleanUpperText.includes('MATERIAL') || cleanUpperText.includes('SANTINHO')) {
    const materiais = await db.select().from(schema.materiaisCampanha).limit(5);
    const lista = materiais.length > 0
      ? materiais.map((m) => `📎 *${m.titulo}*:\n${m.url}`).join('\n\n')
      : `📲 Compartilhe o número *${config?.numero_candidato || '55955'}* com amigos e familiares!`;
    await reply(senderPhone, `📄 *MATERIAIS OFICIAIS*\n\n${lista}\n\n👉 _Digite *MENU* para ver mais opções._`);
    return { success: true, replied: true, action: 'MENU_4_MATERIAIS' };
  }

  if (cleanUpperText === '5' || cleanUpperText.includes('GRUPO') || cleanUpperText.includes('BAIRRO')) {
    const link = config?.link_grupo_geral || 'https://chat.whatsapp.com/convite-campanha';
    await reply(senderPhone, `👥 *GRUPO OFICIAL*\nParticipe da nossa rede:\n\n👉 *${link}*\n\n_(Digite *MENU* para voltar)_`);
    return { success: true, replied: true, action: 'MENU_5_GRUPO' };
  }

  // ── 15. Coleta de dados do eleitor em onboarding ────────────────────────────

  if (user.status_onboarding !== 'COMPLETO') {
    const entities = await extractVoterEntities(textContent);
    const updates: any = {};
    if (entities.bairro && !user.bairro) { updates.bairro = entities.bairro; updates.status_onboarding = 'COMPLETO'; }
    if (entities.zona_eleitoral && !user.zona_eleitoral) updates.zona_eleitoral = entities.zona_eleitoral;
    if (entities.secao_eleitoral && !user.secao_eleitoral) updates.secao_eleitoral = entities.secao_eleitoral;
    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date();
      await db.update(schema.usuarios).set(updates).where(eq(schema.usuarios.id, user.id));
    }
  }

  // ── 16. Resposta livre via IA Groq ──────────────────────────────────────────

  if (!config) return { success: true, replied: false, action: 'SEM_CONFIG' };

  const aiReply = await generateCampaignBotResponse(
    textContent,
    {
      nome_urna: config.nome_urna,
      cargo: config.cargo,
      numero_candidato: config.numero_candidato,
      partido: config.partido,
      biografia_ia: config.biografia_ia,
      propostas_ia: config.propostas_ia,
      tom_voz_ia: config.tom_voz_ia,
    },
    user.nome
  );

  const finalReply = `${aiReply}\n\n_(Digite *MENU* para ver as opções)_`;
  await reply(senderPhone, finalReply);

  // Salva resposta da IA no histórico
  await db.insert(schema.mensagensChat).values({
    conversa_id: senderPhone,
    de_whatsapp: 'CAMPANHA',
    para_whatsapp: senderPhone,
    conteudo: finalReply,
    tipo: 'TEXTO',
    direcao: 'SAIDA',
    status: 'ENVIADO',
  });

  return { success: true, replied: true, action: 'IA_GROQ' };
}

/**
 * Atalho interno para envio de resposta com prioridade Baileys e fallback Meta
 */
async function reply(to: string, text: string): Promise<void> {
  const sent = await sendWhatsAppMessage(to, text);
  if (!sent) {
    console.error(`[Processor] Falha ao enviar mensagem de resposta para ${to}`);
  }
}
