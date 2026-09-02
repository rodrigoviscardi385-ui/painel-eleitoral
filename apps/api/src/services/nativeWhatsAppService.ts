import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  proto,
  downloadMediaMessage,
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import pino from 'pino';
import path from 'path';
import fs from 'fs';
import { extractSupportersFromText, transcribeAudioWithWhisper } from './groqExtractor.js';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, inArray } from 'drizzle-orm';

export interface WhatsAppStatus {
  connected: boolean;
  instanceName: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'QRCODE' | 'CONNECTING';
  qrcode?: string | null;
  phone?: string | null;
  name?: string | null;
}

class NativeWhatsAppService {
  private sock: WASocket | null = null;
  private currentQrCode: string | null = null;
  public isConnected = false;
  private authDir = path.resolve(process.cwd(), 'baileys_auth_info');
  private isInitializing = false;

  constructor() {
    if (!fs.existsSync(this.authDir)) {
      fs.mkdirSync(this.authDir, { recursive: true });
    }
  }

  /**
   * Obtém o status da conexão atual
   */
  async getStatus(): Promise<WhatsAppStatus> {
    const user = this.sock?.user;
    return {
      connected: this.isConnected,
      instanceName: 'campanha_2026',
      status: this.isConnected ? 'CONNECTED' : this.currentQrCode ? 'QRCODE' : 'DISCONNECTED',
      qrcode: this.currentQrCode,
      phone: user?.id?.split(':')[0] || null,
      name: user?.name || null,
    };
  }

  /**
   * Auto-reconecta na inicialização do servidor se houver credenciais salvas (local ou Supabase)
   */
  async autoReconnectIfAuthenticated(): Promise<void> {
    try {
      const credsPath = path.join(this.authDir, 'creds.json');
      if (!fs.existsSync(credsPath)) {
        // Tenta restaurar do Supabase Cloud Storage
        const [sessionRecord] = await db
          .select()
          .from(schema.whatsappSessions)
          .where(eq(schema.whatsappSessions.session_id, 'campanha_2026'))
          .limit(1);

        if (sessionRecord?.creds_data) {
          console.log('☁️ Restaurando sessão 24/7 do WhatsApp do Supabase Cloud...');
          const files = JSON.parse(sessionRecord.creds_data);
          for (const [filename, content] of Object.entries(files)) {
            fs.writeFileSync(path.join(this.authDir, filename), content as string, 'utf-8');
          }
        }
      }

      if (fs.existsSync(path.join(this.authDir, 'creds.json'))) {
        console.log('🔄 Credenciais do WhatsApp detectadas. Restaurando conexão 24/7 em segundo plano...');
        await this.initialize().catch((err) => {
          console.error('Falha na auto-reconexão do WhatsApp:', err);
        });
      }
    } catch (err) {
      console.warn('Aviso ao verificar sessão na nuvem:', err);
    }
  }

  /**
   * Inicializa o socket do WhatsApp e gera o QR Code oficial
   */
  async initialize(): Promise<WhatsAppStatus> {
    if (this.isConnected && this.sock) {
      return this.getStatus();
    }

    if (this.isInitializing) {
      return this.getStatus();
    }

    this.isInitializing = true;

    try {
      const { state, saveCreds } = await useMultiFileAuthState(this.authDir);

      this.sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        browser: ['Painel Eleitoral 2026', 'Chrome', '1.0.0'],
        syncFullHistory: false,
      });

      this.sock.ev.on('creds.update', async () => {
        await saveCreds();
        try {
          const files: Record<string, string> = {};
          const dirFiles = fs.readdirSync(this.authDir);
          for (const f of dirFiles) {
            if (f.endsWith('.json')) {
              files[f] = fs.readFileSync(path.join(this.authDir, f), 'utf-8');
            }
          }
          await db
            .insert(schema.whatsappSessions)
            .values({
              session_id: 'campanha_2026',
              creds_data: JSON.stringify(files),
              updated_at: new Date(),
            })
            .onConflictDoUpdate({
              target: schema.whatsappSessions.session_id,
              set: {
                creds_data: JSON.stringify(files),
                updated_at: new Date(),
              },
            });
        } catch (e) {
          // ignora erro de backup temporário
        }
      });

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            this.currentQrCode = await QRCode.toDataURL(qr, {
              width: 320,
              margin: 2,
              color: {
                dark: '#0F172A',
                light: '#FFFFFF',
              },
            });
            console.log('📲 QR Code Oficial do WhatsApp gerado com sucesso!');
          } catch (err) {
            console.error('Erro ao converter QR Code para Base64:', err);
          }
        }

        if (connection === 'close') {
          const shouldReconnect =
            (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;
          console.log('WhatsApp desconectado. Reconectar?', shouldReconnect);
          this.isConnected = false;
          this.currentQrCode = null;

          if (shouldReconnect) {
            this.isInitializing = false;
            setTimeout(() => this.initialize(), 3000);
          } else {
            // Limpa credenciais ao fazer logout
            if (fs.existsSync(this.authDir)) {
              fs.rmSync(this.authDir, { recursive: true, force: true });
            }
            await db
              .delete(schema.whatsappSessions)
              .where(eq(schema.whatsappSessions.session_id, 'campanha_2026'))
              .catch(() => {});
            this.isInitializing = false;
          }
        } else if (connection === 'open') {
          console.log('🟢 WhatsApp Conectado com Sucesso ao Aparelho Oficial!');
          this.isConnected = true;
          this.currentQrCode = null;
          this.isInitializing = false;
        }
      });

      // Processamento de Mensagens Recebidas em Tempo Real
      this.sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify' && m.type !== 'append') return;

        const myNumber = this.sock?.user?.id?.split(':')[0]?.split('@')[0] || '';

        for (const msg of m.messages) {
          if (!msg.message) continue;

          const remoteJid = msg.key.remoteJid;
          if (!remoteJid || remoteJid.endsWith('@g.us') || remoteJid === 'status@broadcast') continue;

          const senderNumber = remoteJid.split('@')[0].split(':')[0].replace(/\D/g, '');
          const isSelf = senderNumber === myNumber;

          if (msg.key.fromMe && !isSelf) continue;

          let incomingText =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            msg.message.videoMessage?.caption ||
            (msg.message as any).ephemeralMessage?.message?.conversation ||
            (msg.message as any).ephemeralMessage?.message?.extendedTextMessage?.text ||
            '';

          // Se for mensagem de áudio
          const audioMsg =
            msg.message.audioMessage ||
            (msg.message as any).ephemeralMessage?.message?.audioMessage;

          if (audioMsg) {
            try {
              console.log(`🎙️ Áudio recebido de ${senderNumber}. Transcrevendo com Groq Whisper...`);
              const buffer = await downloadMediaMessage(
                msg,
                'buffer',
                {},
                {
                  logger: pino({ level: 'silent' }),
                  reuploadRequest: this.sock!.updateMediaMessage,
                }
              );
              incomingText = await transcribeAudioWithWhisper(buffer as Buffer);
              console.log(`📝 Áudio transcrito: "${incomingText}"`);
            } catch (err) {
              console.error('Erro ao baixar/transcrever áudio:', err);
            }
          }

          if (!incomingText) continue;

          console.log(`📩 Mensagem recebida de ${remoteJid} (self: ${isSelf}): "${incomingText}"`);

          const trimmedIncoming = incomingText.trim();

          // 0. Interceptação de Compliance TSE / LGPD: Opt-Out e Reativação
          const optOutKeywords = /^(cancelar|sair|parar|nao quero|não quero|descadastrar|remover)$/i;
          const optInKeywords = /^(começar|comecar|iniciar|reativar|quero apoiar)$/i;

          if (optOutKeywords.test(trimmedIncoming)) {
            console.log(`🛑 Solicitação de Opt-Out TSE/LGPD detectada de ${senderNumber}`);
            try {
              await db
                .update(schema.usuarios)
                .set({
                  opt_out: true,
                  updated_at: new Date(),
                })
                .where(eq(schema.usuarios.whatsapp, senderNumber));

              await this.sendMessage(
                remoteJid,
                `🛑 *Descadastro Confirmado!*\n\n` +
                  `Você não receberá mais mensagens da nossa campanha eleitoral. Respeitamos a sua privacidade e a legislação do TSE (LGPD Eleitoral).\n\n` +
                  `Caso deseje reativar no futuro, basta nos enviar *COMEÇAR*. Tenha um excelente dia!`
              );
            } catch (optErr) {
              console.error('Erro ao processar opt-out no banco:', optErr);
            }
            continue;
          }

          if (optInKeywords.test(trimmedIncoming)) {
            try {
              await db
                .update(schema.usuarios)
                .set({
                  opt_out: false,
                  updated_at: new Date(),
                })
                .where(eq(schema.usuarios.whatsapp, senderNumber));
            } catch (optInErr) {
              console.warn('Aviso ao reativar opt-in:', optInErr);
            }
          }

          // Detecção de setor (se o eleitor escolheu no menu)
          let detectedSetor = 'GERAL';
          if (/agenda|comicio|evento/i.test(trimmedIncoming)) detectedSetor = 'AGENDA';
          else if (/juridico|denuncia|fake news|advogado/i.test(trimmedIncoming)) detectedSetor = 'JURIDICO';
          else if (/material|adesivo|santinho|bandeira/i.test(trimmedIncoming)) detectedSetor = 'MATERIAIS';

          // 1. Gravar no Histórico do Chat ao Vivo
          try {
            const { broadcastChatMessage } = await import('../routes/chat.js');
            const [savedMsg] = await db
              .insert(schema.mensagensChat)
              .values({
                conversa_id: senderNumber,
                de_whatsapp: senderNumber,
                para_whatsapp: 'painel_central',
                remetente_nome: msg.pushName || senderNumber,
                conteudo: incomingText,
                tipo: audioMsg ? 'AUDIO' : 'TEXTO',
                direcao: 'ENTRADA',
                status: 'LIDO',
                setor: detectedSetor,
                tags: JSON.stringify([]),
              })
              .returning();

            broadcastChatMessage(savedMsg);
          } catch (chatErr) {
            console.warn('Aviso ao gravar mensagem no chat:', chatErr);
          }

          // 2. Processar máquina de estado de onboarding / bot
          await this.processIncomingMessage(remoteJid, incomingText);
        }
      });

      return {
        connected: this.isConnected,
        instanceName: 'campanha_2026',
        status: this.isConnected ? 'CONNECTED' : 'QRCODE',
        qrcode: this.currentQrCode,
      };
    } catch (error) {
      console.error('Erro ao inicializar WhatsApp Baileys:', error);
      this.isInitializing = false;
      return {
        connected: false,
        instanceName: 'campanha_2026',
        status: 'DISCONNECTED',
      };
    }
  }

  /**
   * Processa a mensagem na máquina de estados e responde ao usuário
   */
  private async processIncomingMessage(senderJid: string, text: string) {
    try {
      const cleanNumber = senderJid.split('@')[0].split(':')[0].replace(/\D/g, '');
      const trimmedText = text.trim();

      // Verifica se o usuário já existe no banco (por número limpo ou por jid)
      const [existingUser] = await db
        .select()
        .from(schema.usuarios)
        .where(eq(schema.usuarios.whatsapp, cleanNumber))
        .limit(1);

      // Busca fluxo temporário em andamento
      const [tempFlow] = await db
        .select()
        .from(schema.fluxosOnboardingTemp)
        .where(eq(schema.fluxosOnboardingTemp.whatsapp, cleanNumber))
        .limit(1);

      // =========================================================================
      // FLUXO 1: NOVO USUÁRIO -> ONBOARDING DE LÍDER (PERGUNTA POR PERGUNTA)
      // =========================================================================
      if (!existingUser) {
        if (!tempFlow) {
          // Inicia Pergunta 1: Nome Completo
          await db.insert(schema.fluxosOnboardingTemp).values({
            whatsapp: cleanNumber,
            etapa_atual: 'LIDER_NOME',
            dados_temporarios: JSON.stringify({}),
          });

          await this.sendMessage(
            senderJid,
            `🗳️ *BEM-VINDO AO COMITÊ ELEITORAL 2026!*\n\n` +
              `Vamos iniciar o seu credenciamento oficial como *Líder Comunitário* da campanha.\n\n` +
              `1️⃣ *Para começar, qual é o seu Nome Completo?*`
          );
          return;
        }

        const currentStep = tempFlow.etapa_atual;
        let tempDados = JSON.parse(tempFlow.dados_temporarios || '{}');

        // Resposta da Pergunta 1 -> Salva Nome e Pergunta o Bairro
        if (currentStep === 'LIDER_NOME') {
          const nomeInformado = trimmedText.replace(/^meu nome [ée]\s*/i, '').replace(/[\n\r]/g, ' ').trim();
          tempDados.nome = nomeInformado || 'Líder Comunitário';

          await db
            .update(schema.fluxosOnboardingTemp)
            .set({
              etapa_atual: 'LIDER_BAIRRO',
              dados_temporarios: JSON.stringify(tempDados),
              updated_at: new Date(),
            })
            .where(eq(schema.fluxosOnboardingTemp.whatsapp, cleanNumber));

          const primeiroNome = tempDados.nome.split(' ')[0];
          await this.sendMessage(
            senderJid,
            `Prazer em falar com você, *${primeiroNome}*! 📍\n\n` +
              `2️⃣ *Em qual Bairro ou região você mora e atua politicamente?*`
          );
          return;
        }

        // Resposta da Pergunta 2 -> Salva Bairro e Pergunta a Zona Eleitoral
        if (currentStep === 'LIDER_BAIRRO') {
          const bairroInformado = trimmedText.replace(/^moro no\s*|^bairro\s*/i, '').trim();
          tempDados.bairro = bairroInformado || 'Centro';

          await db
            .update(schema.fluxosOnboardingTemp)
            .set({
              etapa_atual: 'LIDER_ZONA',
              dados_temporarios: JSON.stringify(tempDados),
              updated_at: new Date(),
            })
            .where(eq(schema.fluxosOnboardingTemp.whatsapp, cleanNumber));

          await this.sendMessage(
            senderJid,
            `Excelente! 🏛️\n\n` +
              `3️⃣ *Qual é o número da sua Zona Eleitoral de votação?*\n` +
              `_(Ex: 120 ou Zona 120)_`
          );
          return;
        }

        // Resposta da Pergunta 3 -> Salva Zona e Pergunta a Seção Eleitoral
        if (currentStep === 'LIDER_ZONA') {
          const zonaMatch = trimmedText.match(/\d+/);
          tempDados.zona = zonaMatch ? zonaMatch[0] : '120';

          await db
            .update(schema.fluxosOnboardingTemp)
            .set({
              etapa_atual: 'LIDER_SECAO',
              dados_temporarios: JSON.stringify(tempDados),
              updated_at: new Date(),
            })
            .where(eq(schema.fluxosOnboardingTemp.whatsapp, cleanNumber));

          await this.sendMessage(
            senderJid,
            `Anotado! 🗳️\n\n` +
              `4️⃣ *E qual é o número da sua Seção Eleitoral?*\n` +
              `_(Ex: 45 ou Seção 45)_`
          );
          return;
        }

        // Resposta da Pergunta 4 -> Salva Seção, Finaliza Cadastro do Líder e Cria Grupo Base
        if (currentStep === 'LIDER_SECAO') {
          const secaoMatch = trimmedText.match(/\d+/);
          const secao = secaoMatch ? secaoMatch[0] : '45';
          const zona = tempDados.zona || '120';
          const bairro = tempDados.bairro || 'Centro';
          const nome = tempDados.nome || 'Líder Comunitário';

          // Cria Líder Oficial no Supabase
          const [novoLider] = await db
            .insert(schema.usuarios)
            .values({
              nome,
              whatsapp: cleanNumber,
              cargo: 'LIDER',
              bairro,
              zona_eleitoral: zona,
              secao_eleitoral: secao,
              status_onboarding: 'COMPLETO',
            })
            .returning();

          // Cria Grupo da Base
          const primeiroNome = nome.split(' ')[0];
          const groupName = `[Base] ${primeiroNome} • Campanha 2026`;
          const groupResult = await this.createBaseGroup(groupName, cleanNumber);

          if (groupResult?.inviteLink) {
            await db
              .update(schema.usuarios)
              .set({
                grupo_link_convite: groupResult.inviteLink,
                grupo_whatsapp_id: groupResult.groupId,
              })
              .where(eq(schema.usuarios.id, novoLider.id));
          }

          await db
            .delete(schema.fluxosOnboardingTemp)
            .where(eq(schema.fluxosOnboardingTemp.whatsapp, cleanNumber));

          await this.sendMessage(
            senderJid,
            `🎉 *PARABÉNS, ${primeiroNome.toUpperCase()}! CADASTRO CONCLUÍDO COM SUCESSO!*\n\n` +
              `Você agora é oficialmente um *Líder Comunitário* da Campanha 2026.\n\n` +
              `👥 *Seu Grupo de Base:* ${groupName}\n` +
              `🔗 *Link de Convite:* ${groupResult?.inviteLink || 'Acesse pelo painel'}\n\n` +
              `━━━━━━━━━━━━━━━━━━━━\n` +
              `🎙️ *COMO CADASTRAR SEUS APOIADORES:*\n\n` +
              `• *Modo Áudio / Rápido:* Basta me mandar um áudio ou texto dizendo: _"Cadastra o Marcos do Centro zap 11 98888-7777 zona 120"_ que a IA cadastra direto!\n\n` +
              `• *Modo Guiado:* Digite *NOVO* a qualquer momento para eu fazer as perguntas passo a passo.`
          );
          return;
        }
      }

      // =========================================================================
      // FLUXO 2: LÍDER JÁ CADASTRADO
      // =========================================================================
      if (existingUser && existingUser.cargo === 'LIDER') {
        // Se o líder estiver em um fluxo temporário de cadastro guiado de apoiador
        if (tempFlow && tempFlow.etapa_atual.startsWith('APOIADOR_')) {
          const currentStep = tempFlow.etapa_atual;
          let tempDados = JSON.parse(tempFlow.dados_temporarios || '{}');

          // Resposta Pergunta 1: Nome do Apoiador
          if (currentStep === 'APOIADOR_NOME') {
            tempDados.nome = trimmedText;
            await db
              .update(schema.fluxosOnboardingTemp)
              .set({
                etapa_atual: 'APOIADOR_WHATSAPP',
                dados_temporarios: JSON.stringify(tempDados),
                updated_at: new Date(),
              })
              .where(eq(schema.fluxosOnboardingTemp.whatsapp, cleanNumber));

            await this.sendMessage(
              senderJid,
              `2️⃣ *Qual é o WhatsApp com DDD do ${tempDados.nome}?*\n` +
                `_(Se ele não tiver WhatsApp, responda apenas "sem telefone")_`
            );
            return;
          }

          // Resposta Pergunta 2: WhatsApp do Apoiador
          if (currentStep === 'APOIADOR_WHATSAPP') {
            const cleanEPhone = trimmedText.replace(/\D/g, '');
            tempDados.whatsapp = cleanEPhone.length >= 10 ? cleanEPhone : null;

            await db
              .update(schema.fluxosOnboardingTemp)
              .set({
                etapa_atual: 'APOIADOR_BAIRRO',
                dados_temporarios: JSON.stringify(tempDados),
                updated_at: new Date(),
              })
              .where(eq(schema.fluxosOnboardingTemp.whatsapp, cleanNumber));

            await this.sendMessage(
              senderJid,
              `3️⃣ *Em qual Bairro o ${tempDados.nome} mora?*\n` +
                `_(Se for no mesmo que o seu (${existingUser.bairro || 'sua região'}), responda apenas "mesmo")_`
            );
            return;
          }

          // Resposta Pergunta 3: Bairro do Apoiador
          if (currentStep === 'APOIADOR_BAIRRO') {
            if (/mesmo/i.test(trimmedText)) {
              tempDados.bairro = existingUser.bairro || 'Centro';
            } else {
              tempDados.bairro = trimmedText;
            }

            await db
              .update(schema.fluxosOnboardingTemp)
              .set({
                etapa_atual: 'APOIADOR_SECAO',
                dados_temporarios: JSON.stringify(tempDados),
                updated_at: new Date(),
              })
              .where(eq(schema.fluxosOnboardingTemp.whatsapp, cleanNumber));

            await this.sendMessage(
              senderJid,
              `4️⃣ *Você sabe a Zona e Seção de votação dele?*\n` +
                `_(Ex: Zona 120 Seção 45, ou responda "não sei" para concluir)_`
            );
            return;
          }

          // Resposta Pergunta 4: Seção -> Conclui Cadastro do Apoiador
          if (currentStep === 'APOIADOR_SECAO') {
            const zonaMatch = trimmedText.match(/zona\s*(\d+)/i) || trimmedText.match(/\b(\d{1,4})\b/);
            const secaoMatch = trimmedText.match(/se[çc][aã]o\s*(\d+)/i);

            const zona = zonaMatch ? zonaMatch[1] : existingUser.zona_eleitoral || '120';
            const secao = secaoMatch ? secaoMatch[1] : null;

            let eleitorWhatsapp = tempDados.whatsapp ? tempDados.whatsapp.replace(/\D/g, '') : null;
            if (eleitorWhatsapp && (eleitorWhatsapp.length === 10 || eleitorWhatsapp.length === 11)) {
              eleitorWhatsapp = `55${eleitorWhatsapp}`;
            }
            const finalZap = eleitorWhatsapp || `SEM_TEL_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

            // Garante que o Líder possui grupo oficial de base
            if (!existingUser.grupo_link_convite) {
              const primeiroNome = (existingUser.nome || 'Líder').split(' ')[0];
              const groupRes = await this.createBaseGroup(`[Base] ${primeiroNome} • Campanha 2026`, existingUser.whatsapp);
              if (groupRes?.inviteLink) {
                existingUser.grupo_link_convite = groupRes.inviteLink;
                existingUser.grupo_whatsapp_id = groupRes.groupId;
                await db
                  .update(schema.usuarios)
                  .set({
                    grupo_link_convite: groupRes.inviteLink,
                    grupo_whatsapp_id: groupRes.groupId,
                    updated_at: new Date(),
                  })
                  .where(eq(schema.usuarios.id, existingUser.id));
              }
            }

            const [novoEleitor] = await db
              .insert(schema.usuarios)
              .values({
                nome: tempDados.nome || 'Apoiador',
                whatsapp: finalZap,
                cargo: 'APOIADOR',
                bairro: tempDados.bairro || existingUser.bairro,
                zona_eleitoral: zona,
                secao_eleitoral: secao,
                lider_acima_id: existingUser.id,
                status_onboarding: 'COMPLETO',
              })
              .returning();

            // Adiciona o apoiador diretamente no grupo se tiver WhatsApp e envia convite
            if (eleitorWhatsapp && existingUser.grupo_whatsapp_id) {
              await this.addParticipantToGroup(existingUser.grupo_whatsapp_id, eleitorWhatsapp);
            }

            // Envia mensagem de boas-vindas com link no privado do apoiador
            if (eleitorWhatsapp && existingUser.grupo_link_convite) {
              await this.sendMessage(
                eleitorWhatsapp,
                `Olá, *${(tempDados.nome || 'Apoiador').split(' ')[0]}*! Tudo bem? 🗳️\n\n` +
                  `O líder *${existingUser.nome}* cadastrou seu apoio para a Campanha Eleitoral 2026.\n\n` +
                  `Participe do nosso grupo oficial no WhatsApp da sua região:\n` +
                  `👉 ${existingUser.grupo_link_convite}\n\n` +
                  `Contamos com você! Vamos juntos! 🚀`
              );
            }

            await db
              .delete(schema.fluxosOnboardingTemp)
              .where(eq(schema.fluxosOnboardingTemp.whatsapp, cleanNumber));

            await this.sendMessage(
              senderJid,
              `✅ *APOIADOR CADASTRADO COM SUCESSO!*\n\n` +
                `👤 *Nome:* ${tempDados.nome}\n` +
                `📱 *WhatsApp:* ${eleitorWhatsapp ? `+${eleitorWhatsapp}` : 'Sem telefone registrado'}\n` +
                `📍 *Bairro:* ${tempDados.bairro}\n` +
                `🗳️ *Zona/Seção:* ${zona} / ${secao || 'Pendente'}\n\n` +
                (eleitorWhatsapp && existingUser.grupo_link_convite
                  ? `🔗 *Link do seu grupo enviado automaticamente no WhatsApp dele!*\n\n`
                  : '') +
                `📊 Este voto foi computado na meta da sua base!`
            );
            return;
          }
        }

        // Se o líder digitou "NOVO" ou "CADASTRAR", inicia o modo guiado
        if (/^(novo|cadastrar|adicionar|cadastra|1)$/i.test(trimmedText)) {
          await db
            .insert(schema.fluxosOnboardingTemp)
            .values({
              whatsapp: cleanNumber,
              etapa_atual: 'APOIADOR_NOME',
              dados_temporarios: JSON.stringify({}),
            })
            .onConflictDoUpdate({
              target: schema.fluxosOnboardingTemp.whatsapp,
              set: { etapa_atual: 'APOIADOR_NOME', dados_temporarios: '{}', updated_at: new Date() },
            });

          await this.sendMessage(
            senderJid,
            `🤝 *CADASTRO GUIADO DE NOVO APOIADOR*\n\n` +
              `1️⃣ *Qual é o Nome Completo do apoiador?*`
          );
          return;
        }

        // Caso contrário, processa como Mensagem Rápida / Áudio Inteligente via Groq AI
        const extraction = await extractSupportersFromText(text);

        if (extraction.eleitores.length === 0) {
          await this.sendMessage(
            senderJid,
            `Olá *${existingUser.nome}*! 👋\n\n` +
              `Você pode cadastrar eleitores de duas formas:\n\n` +
              `1️⃣ *Por Áudio ou Texto:* Diga o nome, telefone e bairro da pessoa.\n` +
              `2️⃣ *Passo a Passo:* Digite *NOVO* para eu fazer as perguntas uma a uma.`
          );
          return;
        }

        // Garante que o Líder possui grupo oficial de base
        if (!existingUser.grupo_link_convite) {
          const primeiroNome = (existingUser.nome || 'Líder').split(' ')[0];
          const groupRes = await this.createBaseGroup(`[Base] ${primeiroNome} • Campanha 2026`, existingUser.whatsapp);
          if (groupRes?.inviteLink) {
            existingUser.grupo_link_convite = groupRes.inviteLink;
            existingUser.grupo_whatsapp_id = groupRes.groupId;
            await db
              .update(schema.usuarios)
              .set({
                grupo_link_convite: groupRes.inviteLink,
                grupo_whatsapp_id: groupRes.groupId,
                updated_at: new Date(),
              })
              .where(eq(schema.usuarios.id, existingUser.id));
          }
        }

        for (const e of extraction.eleitores) {
          let eleitorWhatsapp = e.whatsapp ? e.whatsapp.replace(/\D/g, '') : null;
          if (eleitorWhatsapp && (eleitorWhatsapp.length === 10 || eleitorWhatsapp.length === 11)) {
            eleitorWhatsapp = `55${eleitorWhatsapp}`;
          }
          const finalZap = eleitorWhatsapp || `SEM_TEL_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

          await db
            .insert(schema.usuarios)
            .values({
              nome: e.nome,
              whatsapp: finalZap,
              cargo: 'APOIADOR',
              bairro: e.bairro || existingUser.bairro,
              zona_eleitoral: e.zona_eleitoral || existingUser.zona_eleitoral,
              secao_eleitoral: e.secao_eleitoral,
              lider_acima_id: existingUser.id,
              status_onboarding: 'COMPLETO',
            });

          // Tenta adicionar ao grupo e envia convite
          if (eleitorWhatsapp && existingUser.grupo_whatsapp_id) {
            await this.addParticipantToGroup(existingUser.grupo_whatsapp_id, eleitorWhatsapp);
          }

          if (eleitorWhatsapp && existingUser.grupo_link_convite) {
            await this.sendMessage(
              eleitorWhatsapp,
              `Olá, *${e.nome.split(' ')[0]}*! Tudo bem? 🗳️\n\n` +
                `O líder *${existingUser.nome}* cadastrou seu apoio para a Campanha Eleitoral 2026.\n\n` +
                `Entre no nosso grupo oficial de WhatsApp da sua região:\n` +
                `👉 ${existingUser.grupo_link_convite}\n\n` +
                `Contamos com você! Vamos juntos! 🚀`
            );
          }
        }

        const nomesCadastrados = extraction.eleitores.map((e) => `• *${e.nome}* (${e.bairro || 'Região'})`).join('\n');

        await this.sendMessage(
          senderJid,
          `✅ *${extraction.eleitores.length} APOIADOR(ES) REGISTRADO(S) COM SUCESSO!*\n\n` +
            `${nomesCadastrados}\n\n` +
            (existingUser.grupo_link_convite
              ? `🔗 *O link do seu grupo de base foi enviado no WhatsApp de cada apoiador!*\n\n`
              : '') +
            `📊 Seus cadastros foram computados na meta da campanha. Continue enviando áudios ou digite *NOVO* para o modo guiado!`
        );
      }
    } catch (err) {
      console.error('Erro no processamento da mensagem do WhatsApp:', err);
    }
  }

  /**
   * Envia uma mensagem de texto via Baileys oficial com resolução canônica de JID (9º dígito Brasil)
   */
  async sendMessage(to: string, message: string): Promise<boolean> {
    if (!to || to.startsWith('SEM_TEL_') || to.startsWith('sem_contato_')) {
      return false;
    }

    let cleanNumber = to.replace(/\D/g, '');
    if (cleanNumber.length === 10 || cleanNumber.length === 11) {
      cleanNumber = `55${cleanNumber}`;
    }

    let jid = to.trim();
    if (!jid.includes('@')) {
      jid = `${cleanNumber}@s.whatsapp.net`;
    }

    if (this.sock && this.isConnected) {
      try {
        let targetJid = jid;

        // 1. Resolução canônica de JID no WhatsApp (evita descarte silencioso do 9º dígito no Brasil)
        try {
          const check = await this.sock.onWhatsApp(cleanNumber);
          if (check && check.length > 0 && check[0]?.exists && check[0]?.jid) {
            targetJid = check[0].jid;
          } else {
            // Tenta a variação do 9º dígito
            let altNumber = cleanNumber;
            if (cleanNumber.startsWith('55') && cleanNumber.length === 13 && cleanNumber[4] === '9') {
              altNumber = cleanNumber.slice(0, 4) + cleanNumber.slice(5); // remove 9
            } else if (cleanNumber.startsWith('55') && cleanNumber.length === 12) {
              altNumber = cleanNumber.slice(0, 4) + '9' + cleanNumber.slice(4); // adiciona 9
            }

            if (altNumber !== cleanNumber) {
              const altCheck = await this.sock.onWhatsApp(altNumber);
              if (altCheck && altCheck.length > 0 && altCheck[0]?.exists && altCheck[0]?.jid) {
                targetJid = altCheck[0].jid;
              }
            }
          }
        } catch (checkErr) {
          console.warn('Aviso ao resolver JID via onWhatsApp:', checkErr);
        }

        await this.sock.sendMessage(targetJid, { text: message });
        console.log(`📤 Mensagem enviada com sucesso via Baileys para ${targetJid}`);
        return true;
      } catch (err) {
        console.error(`Erro ao enviar mensagem Baileys para ${jid}:`, err);
      }
    } else {
      console.log(`[WhatsApp Simulado / Offline] Para ${jid}:\n${message}`);
    }
    return false;
  }

  /**
   * Cria um grupo de base oficial, adiciona o líder e todos os gestores/admins e os promove a administradores
   */
  async createBaseGroup(groupName: string, leaderNumber: string): Promise<{ groupId: string; inviteLink: string } | null> {
    if (this.sock && this.isConnected) {
      try {
        let cleanLeader = leaderNumber.replace(/\D/g, '');
        if (cleanLeader.length === 10 || cleanLeader.length === 11) {
          cleanLeader = `55${cleanLeader}`;
        }
        const myNumber = this.sock.user?.id?.split(':')[0]?.replace(/\D/g, '') || '';

        // Busca todos os Gestores e Admins cadastrados no banco
        const gestoresDb = await db
          .select({ whatsapp: schema.usuarios.whatsapp, nome: schema.usuarios.nome })
          .from(schema.usuarios)
          .where(inArray(schema.usuarios.cargo, ['ADMIN', 'GESTOR']));

        const participantsSet = new Set<string>();

        // Adiciona o Líder se for número válido e diferente do bot conectado
        if (cleanLeader && cleanLeader.length >= 12 && cleanLeader !== myNumber) {
          participantsSet.add(`${cleanLeader}@s.whatsapp.net`);
        }

        // Adiciona todos os Gestores / Coordenadores cadastrados
        for (const g of gestoresDb) {
          let cleanG = g.whatsapp.replace(/\D/g, '');
          if (cleanG.length === 10 || cleanG.length === 11) {
            cleanG = `55${cleanG}`;
          }
          if (cleanG.length >= 12 && cleanG !== myNumber) {
            participantsSet.add(`${cleanG}@s.whatsapp.net`);
          }
        }

        const candidateParticipants = Array.from(participantsSet);
        const validParticipants: string[] = [];

        // Filtra e valida apenas números reais existentes no WhatsApp
        for (const jid of candidateParticipants) {
          try {
            const check = await this.sock.onWhatsApp(jid);
            const found = check && check.length > 0 ? check[0] : null;
            if (found && found.exists && found.jid) {
              validParticipants.push(found.jid);
            }
          } catch (e) {
            console.warn(`Não foi possível checar número ${jid} no WhatsApp:`, e);
          }
        }

        console.log(`📋 Candidatos a participantes: ${candidateParticipants.length} | Validados no WhatsApp: ${validParticipants.length}`);

        let group: any = null;

        // 1. Tentar criar o grupo com os participantes reais validados
        if (validParticipants.length > 0) {
          try {
            group = await this.sock.groupCreate(groupName, validParticipants);
            console.log(`👥 Grupo Baileys criado com sucesso: "${groupName}" (${group.id}) com ${validParticipants.length} participante(s).`);

            // Promove os participantes validados a Administradores do Grupo
            await this.sock.groupParticipantsUpdate(group.id, validParticipants, 'promote').catch((err) => {
              console.warn('Aviso ao promover participantes a admin:', err);
            });
          } catch (createWithParticipantsErr: any) {
            console.warn(`⚠️ Aviso ao adicionar participantes na criação do grupo (${createWithParticipantsErr?.message || createWithParticipantsErr}).`);
          }
        }

        // 2. Se falhar ou não houver participantes válidos, cria o grupo diretamente com o socket autenticado
        if (!group) {
          try {
            group = await this.sock.groupCreate(groupName, []);
            console.log(`👥 Grupo Baileys criado com sucesso (solo): "${groupName}" (${group.id})`);
          } catch (createSoloErr: any) {
            console.warn(`⚠️ Aviso ao criar grupo solo: ${createSoloErr?.message || createSoloErr}`);
          }
        }

        // 3. Atualiza a descrição do grupo
        await this.sock.groupUpdateDescription(
          group.id,
          `🗳️ Grupo Oficial de Apoio Comunitário • Campanha Eleitoral 2026\n` +
            `👤 Liderança Responsável: ${groupName}\n` +
            `🏛️ Coordenação Geral & Gestão da Campanha`
        ).catch(() => {});

        // 4. Obtém o link de convite oficial
        const inviteCode = await this.sock.groupInviteCode(group.id);
        const inviteLink = `https://chat.whatsapp.com/${inviteCode}`;

        // 5. Tenta adicionar cada participante individualmente (se já não foram adicionados)
        if (candidateParticipants.length > 0) {
          for (const jid of candidateParticipants) {
            try {
              await this.sock.groupParticipantsUpdate(group.id, [jid], 'add');
              console.log(`➕ Participante ${jid} adicionado com sucesso ao grupo.`);
              await this.sock.groupParticipantsUpdate(group.id, [jid], 'promote').catch(() => {});
            } catch (addErr) {
              console.log(`ℹ️ Participante ${jid} possui restrição de privacidade no WhatsApp. Link oficial gerado: ${inviteLink}`);
            }
          }
        }

        return {
          groupId: group.id,
          inviteLink,
        };
      } catch (err) {
        console.error('Erro geral ao criar grupo Baileys:', err);
      }
    }

    return {
      groupId: `mock_group_${Date.now()}`,
      inviteLink: `https://chat.whatsapp.com/mock_${Date.now().toString(36)}`,
    };
  }

  /**
   * Adiciona um novo apoiador diretamente no grupo de WhatsApp da base
   */
  async addParticipantToGroup(groupId: string, participantNumber: string): Promise<boolean> {
    if (!this.sock || !this.isConnected || !groupId || groupId.startsWith('mock_')) return false;
    try {
      const clean = participantNumber.replace(/\D/g, '');
      if (clean.length < 10) return false;
      const jid = `${clean}@s.whatsapp.net`;
      const result = await this.sock.groupParticipantsUpdate(groupId, [jid], 'add');
      console.log(`👥 Apoiador ${clean} adicionado ao grupo ${groupId}:`, result);
      return true;
    } catch (err) {
      console.warn(`Aviso: Não foi possível adicionar ${participantNumber} diretamente no grupo (privacidade):`, err);
      return false;
    }
  }

  /**
   * Desconecta o WhatsApp e limpa credenciais
   */
  async logout(): Promise<boolean> {
    try {
      if (this.sock) {
        await this.sock.logout().catch(() => {});
        this.sock = null;
      }
      this.isConnected = false;
      this.currentQrCode = null;
      if (fs.existsSync(this.authDir)) {
        fs.rmSync(this.authDir, { recursive: true, force: true });
      }
      return true;
    } catch (err) {
      console.error('Erro ao desconectar WhatsApp:', err);
      return false;
    }
  }
}

export const nativeWhatsAppService = new NativeWhatsAppService();
