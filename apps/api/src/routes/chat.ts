import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, desc, or, sql } from 'drizzle-orm';
import { nativeWhatsAppService } from '../services/nativeWhatsAppService.js';
import Groq from 'groq-sdk';

// Gerenciador de clientes SSE (Server-Sent Events) conectados
const sseClients = new Set<FastifyReply>();

export function broadcastChatMessage(msg: any) {
  const data = `data: ${JSON.stringify(msg)}\n\n`;
  for (const client of sseClients) {
    try {
      client.raw.write(data);
    } catch {
      sseClients.delete(client);
    }
  }
}

export async function chatRoutes(fastify: FastifyInstance) {
  const groqApiKey = process.env.GROQ_API_KEY || '';
  const groq = groqApiKey ? new Groq({ apiKey: groqApiKey }) : null;

  /**
   * SSE Stream em tempo real
   * Conecta o frontend ao fluxo de novas mensagens instantâneas
   */
  fastify.get('/api/chat/stream', (request: FastifyRequest, reply: FastifyReply) => {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    reply.raw.write('event: connected\ndata: {"status":"connected"}\n\n');
    sseClients.add(reply);

    request.raw.on('close', () => {
      sseClients.delete(reply);
    });
  });

  /**
   * GET /api/chat/conversas
   * Retorna lista de conversas ativas agrupadas por contato
   */
  fastify.get('/api/chat/conversas', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Buscar as últimas mensagens de cada conversa
      const rawConversas = await db
        .select({
          conversa_id: schema.mensagensChat.conversa_id,
          remetente_nome: schema.mensagensChat.remetente_nome,
          ultima_mensagem: schema.mensagensChat.conteudo,
          tipo: schema.mensagensChat.tipo,
          status: schema.mensagensChat.status,
          tags: schema.mensagensChat.tags,
          created_at: schema.mensagensChat.created_at,
        })
        .from(schema.mensagensChat)
        .orderBy(desc(schema.mensagensChat.created_at));

      // Agrupar por conversa_id
      const conversasMap = new Map<string, any>();
      for (const msg of rawConversas) {
        if (!conversasMap.has(msg.conversa_id)) {
          let tagsList: string[] = [];
          try {
            tagsList = JSON.parse(msg.tags);
          } catch {
            tagsList = [];
          }

          conversasMap.set(msg.conversa_id, {
            id: msg.conversa_id,
            nome: msg.remetente_nome || msg.conversa_id,
            whatsapp: msg.conversa_id,
            ultima_mensagem: msg.ultima_mensagem,
            tipo: msg.tipo,
            status: msg.status,
            tags: tagsList,
            updated_at: msg.created_at,
            nao_lidas: msg.status === 'PENDENTE' || msg.status === 'ENTREGUE' ? 1 : 0,
          });
        }
      }

      // Buscar também apoiadores e líderes cadastrados no banco para enriquecer a lista
      const usuariosDb = await db
        .select({
          id: schema.usuarios.id,
          nome: schema.usuarios.nome,
          whatsapp: schema.usuarios.whatsapp,
          cargo: schema.usuarios.cargo,
          bairro: schema.usuarios.bairro,
          zona_eleitoral: schema.usuarios.zona_eleitoral,
        })
        .from(schema.usuarios);

      const listaFinal = Array.from(conversasMap.values());

      // Adicionar líderes/apoiadores que ainda não têm conversa ativa se a lista for pequena
      for (const u of usuariosDb) {
        const cleanPhone = u.whatsapp.replace(/\D/g, '');
        const existing = listaFinal.find((c) => c.whatsapp.includes(cleanPhone) || cleanPhone.includes(c.whatsapp));
        if (existing) {
          existing.nome = u.nome;
          existing.cargo = u.cargo;
          existing.bairro = u.bairro;
          existing.zona_eleitoral = u.zona_eleitoral;
        } else if (listaFinal.length < 20) {
          listaFinal.push({
            id: u.whatsapp,
            nome: u.nome,
            whatsapp: u.whatsapp,
            cargo: u.cargo,
            bairro: u.bairro,
            zona_eleitoral: u.zona_eleitoral,
            ultima_mensagem: 'Toque para iniciar conversa',
            tipo: 'TEXTO',
            status: 'LIDO',
            tags: [u.cargo],
            updated_at: new Date().toISOString(),
            nao_lidas: 0,
          });
        }
      }

      return reply.send({ conversas: listaFinal });
    } catch (error) {
      console.error('Erro ao listar conversas:', error);
      return reply.status(500).send({ error: 'Falha ao buscar conversas do chat' });
    }
  });

  /**
   * GET /api/chat/conversas/:phone
   * Histórico de mensagens de uma conversa específica
   */
  fastify.get('/api/chat/conversas/:phone', async (request: FastifyRequest<{ Params: { phone: string } }>, reply: FastifyReply) => {
    try {
      const { phone } = request.params;
      const cleanPhone = phone.replace(/\D/g, '');

      const msgs = await db
        .select()
        .from(schema.mensagensChat)
        .where(
          or(
            eq(schema.mensagensChat.conversa_id, phone),
            eq(schema.mensagensChat.conversa_id, cleanPhone),
            eq(schema.mensagensChat.de_whatsapp, cleanPhone),
            eq(schema.mensagensChat.para_whatsapp, cleanPhone)
          )
        )
        .orderBy(schema.mensagensChat.created_at);

      // Marcar mensagens recebidas como LIDAS
      await db
        .update(schema.mensagensChat)
        .set({ status: 'LIDO' })
        .where(eq(schema.mensagensChat.conversa_id, phone))
        .catch(() => {});

      return reply.send({ mensagens: msgs });
    } catch (error) {
      console.error('Erro ao buscar histórico de mensagens:', error);
      return reply.status(500).send({ error: 'Falha ao buscar mensagens' });
    }
  });

  /**
   * POST /api/chat/enviar
   * Envia uma mensagem via Baileys WhatsApp e grava no histórico
   */
  fastify.post('/api/chat/enviar', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body: any = request.body || {};
      const { para_whatsapp, conteudo, tipo = 'TEXTO', atendente_nome = 'Operador' } = body;

      if (!para_whatsapp || !conteudo) {
        return reply.status(400).send({ error: 'Destinatário e conteúdo são obrigatórios' });
      }

      let cleanPhone = String(para_whatsapp).replace(/\D/g, '');
      if (cleanPhone.length === 10 || cleanPhone.length === 11) {
        cleanPhone = `55${cleanPhone}`;
      }

      // Enviar via Baileys WhatsApp
      const sendSuccess = await nativeWhatsAppService.sendMessage(cleanPhone, conteudo);

      // Gravar no histórico do chat
      const [novaMensagem] = await db
        .insert(schema.mensagensChat)
        .values({
          conversa_id: cleanPhone,
          de_whatsapp: 'painel_central',
          para_whatsapp: cleanPhone,
          remetente_nome: atendente_nome,
          conteudo: String(conteudo).trim(),
          tipo: tipo as any,
          direcao: 'SAIDA',
          status: sendSuccess ? 'ENVIADO' : 'ERRO',
          atendente_nome,
        })
        .returning();

      // Transmitir para o frontend via SSE
      broadcastChatMessage(novaMensagem);

      return reply.send({
        success: sendSuccess,
        mensagem: novaMensagem,
      });
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      return reply.status(500).send({ error: 'Falha ao enviar mensagem de chat' });
    }
  });

  /**
   * POST /api/chat/copilot
   * Groq AI Copilot: Sugere a melhor resposta para a dúvida do eleitor
   */
  fastify.post('/api/chat/copilot', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body: any = request.body || {};
      const { mensagem_eleitor, nome_eleitor, contexto_bairro } = body;

      if (!groq) {
        return reply.send({
          sugestao: `Olá ${nome_eleitor || ''}! Muito obrigado pela sua mensagem e apoio à nossa caminhada. Conte comigo!`,
        });
      }

      const prompt = `Você é o assistente oficial de comunicação da campanha eleitoral de 2026.
O eleitor se chama "${nome_eleitor || 'Apoiador'}" e reside no bairro "${contexto_bairro || 'Santos/SP'}".
Ele enviou a seguinte mensagem no WhatsApp:
"${mensagem_eleitor}"

Gere uma resposta amigável, acolhedora, propositiva e clara em português do Brasil (máximo 2 a 3 parágrafos curtos) para ser enviada pela equipe de campanha. Inclua emojis de forma natural e profissional.`;

      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 300,
      });

      const sugestao = response.choices[0]?.message?.content?.trim() || 'Olá! Agradecemos sua mensagem e apoio à nossa campanha.';

      return reply.send({ sugestao });
    } catch (error) {
      console.warn('Aviso no copilot de chat:', error);
      return reply.send({
        sugestao: 'Olá! Muito obrigado pela mensagem e por caminhar junto com a gente nessa jornada por nossa cidade! 🚀🏛️',
      });
    }
  });
}
