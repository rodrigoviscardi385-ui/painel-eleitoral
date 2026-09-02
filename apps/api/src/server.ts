import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import dotenv from 'dotenv';
import { authRoutes } from './routes/auth.js';
import { chatRoutes } from './routes/chat.js';
import { webhookRoutes } from './routes/webhook.js';
import { disparosRoutes } from './routes/disparos.js';
import { reportsRoutes } from './routes/reports.js';
import { metasRoutes } from './routes/metas.js';
import { liderancasRoutes } from './routes/liderancas.js';
import { whatsappRoutes } from './routes/whatsapp.js';
import { materiaisRoutes } from './routes/materiais.js';
import { botConfigRoutes } from './routes/botConfig.js';
import { campanhaRoutes } from './routes/campanha.js';
import { nativeWhatsAppService } from './services/nativeWhatsAppService.js';
import { db, recalculateNetworkMetrics } from './db/index.js';
import * as schema from './db/schema.js';
import { sql } from 'drizzle-orm';

dotenv.config();

const port = parseInt(process.env.PORT || '3001', 10);
const host = process.env.HOST || '0.0.0.0';

const fastify = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
  },
  disableRequestLogging: false,
});

async function seedInitialDataIfEmpty() {
  try {
    // 0. Auto-migração resiliente das tabelas auxiliares
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS campanha_config (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nome_urna TEXT NOT NULL DEFAULT 'Rodrigo da Saúde',
        nome_completo TEXT NOT NULL DEFAULT 'Rodrigo Viscardi',
        numero_candidato TEXT NOT NULL DEFAULT '2026',
        cargo TEXT NOT NULL DEFAULT 'Deputado Federal',
        partido TEXT NOT NULL DEFAULT 'AVANTE',
        coligacao TEXT DEFAULT 'Coligação Por Dias Melhores',
        slogan TEXT DEFAULT 'Trabalho, honestidade e compromisso com você',
        foto_url TEXT,
        logo_url TEXT,
        cor_primaria TEXT NOT NULL DEFAULT '#10b981',
        cidade TEXT NOT NULL DEFAULT 'São Paulo',
        estado TEXT NOT NULL DEFAULT 'SP',
        data_eleicao TEXT NOT NULL DEFAULT '2026-10-04',
        cnpj_campanha TEXT DEFAULT '00.000.000/0001-00',
        biografia_ia TEXT NOT NULL DEFAULT 'Candidato comprometido com a melhoria da saúde pública, geração de empregos e desenvolvimento sustentável das nossas comunidades.',
        propostas_ia TEXT NOT NULL DEFAULT 'SAÚDE: Fortalecimento dos postos de saúde, redução de filas para exames e valorização dos profissionais.\nEDUCAÇÃO: Escolas de tempo integral e tecnologia em sala de aula.\nEMPREGO: Apoio ao pequeno empreendedor e incentivos fiscais para empresas locais.',
        tom_voz_ia TEXT NOT NULL DEFAULT 'POPULAR',
        link_grupo_geral TEXT DEFAULT 'https://chat.whatsapp.com/convite-campanha',
        whatsapp_comite TEXT DEFAULT '',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      INSERT INTO campanha_config (nome_urna)
      SELECT 'Rodrigo da Saúde' WHERE NOT EXISTS (SELECT 1 FROM campanha_config);

      CREATE TABLE IF NOT EXISTS materiais_online (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        titulo TEXT NOT NULL,
        descricao TEXT,
        tipo TEXT NOT NULL DEFAULT 'LINK',
        url TEXT NOT NULL,
        tags TEXT NOT NULL DEFAULT '[]',
        ativo TEXT NOT NULL DEFAULT 'SIM',
        ordem INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS bot_config (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        modo TEXT NOT NULL DEFAULT 'BOT_ATIVO',
        mensagem_boas_vindas TEXT NOT NULL DEFAULT 'Olá! 👋 Sou o assistente virtual da campanha. Como posso ajudar?\n\n1️⃣ Conhecer as propostas\n2️⃣ Receber material de campanha\n3️⃣ Falar com um atendente\n\nDigite o número da opção desejada.',
        menu_opcoes TEXT NOT NULL DEFAULT '[{"numero":1,"texto":"Conhecer as propostas","acao":"INFO"},{"numero":2,"texto":"Receber material","acao":"MATERIAL"},{"numero":3,"texto":"Falar com atendente","acao":"HUMANO"}]',
        mensagem_encerramento_bot TEXT NOT NULL DEFAULT '✅ Obrigado pelo contato! Qualquer dúvida, estamos aqui.',
        mensagem_transferencia TEXT NOT NULL DEFAULT '⏳ Aguarde um momento! Vou conectar você com um atendente da nossa equipe. 🙋',
        horario_inicio TEXT NOT NULL DEFAULT '08:00',
        horario_fim TEXT NOT NULL DEFAULT '18:00',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      INSERT INTO bot_config (modo)
      SELECT 'BOT_ATIVO' WHERE NOT EXISTS (SELECT 1 FROM bot_config);

      CREATE TABLE IF NOT EXISTS conversa_status (
        conversa_id TEXT PRIMARY KEY,
        modo TEXT NOT NULL DEFAULT 'BOT',
        atendente_nome TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `).catch((migErr) => console.warn('Aviso ao auto-migrar tabelas auxiliares:', migErr));

    const [result] = (await db.execute(sql`SELECT COUNT(*) AS total FROM ${schema.usuarios}`)) as any;
    const count = parseInt(result?.total || '0', 10);

    if (count === 0) {
      console.log('Populando dados iniciais de demonstração (Comitê Eleitoral 2026)...');

      // 1. Criar Líder Geral (Admin)
      const [coordGeral] = await db
        .insert(schema.usuarios)
        .values({
          nome: 'Roberto Silveira (Coord. Geral)',
          whatsapp: '5511999991111',
          cargo: 'ADMIN',
          bairro: 'Centro',
          zona_eleitoral: '100',
          secao_eleitoral: '01',
          status_onboarding: 'COMPLETO',
          grupo_link_convite: 'https://chat.whatsapp.com/LiderancaGeral2026',
        })
        .returning();

      // 2. Criar Líderes Regionais
      const [liderZonaNorte] = await db
        .insert(schema.usuarios)
        .values({
          nome: 'Cláudia Mendes',
          whatsapp: '5511999992222',
          cargo: 'LIDER',
          lider_acima_id: coordGeral.id,
          bairro: 'Santana / Zona Norte',
          zona_eleitoral: '120',
          secao_eleitoral: '15',
          status_onboarding: 'COMPLETO',
          grupo_link_convite: 'https://chat.whatsapp.com/BaseNorteClaudia',
        })
        .returning();

      const [liderZonaSul] = await db
        .insert(schema.usuarios)
        .values({
          nome: 'Fernando Antunes',
          whatsapp: '5511999993333',
          cargo: 'LIDER',
          lider_acima_id: coordGeral.id,
          bairro: 'Santo Amaro / Zona Sul',
          zona_eleitoral: '150',
          secao_eleitoral: '42',
          status_onboarding: 'COMPLETO',
          grupo_link_convite: 'https://chat.whatsapp.com/BaseSulFernando',
        })
        .returning();

      const [subLiderBairro] = await db
        .insert(schema.usuarios)
        .values({
          nome: 'Pastor Elias Barbosa',
          whatsapp: '5511999994444',
          cargo: 'LIDER',
          lider_acima_id: liderZonaSul.id,
          bairro: 'Jardim Primavera',
          zona_eleitoral: '150',
          secao_eleitoral: '88',
          status_onboarding: 'COMPLETO',
          grupo_link_convite: 'https://chat.whatsapp.com/BasePrimaveraElias',
        })
        .returning();

      // 3. Criar Apoiadores
      const apoiadoresMock = [
        { nome: 'Carlos Eduardo Ramos', whatsapp: '5511988880001', lider_acima_id: liderZonaNorte.id, bairro: 'Santana', zona: '120' },
        { nome: 'Luciana Ferreira', whatsapp: '5511988880002', lider_acima_id: liderZonaNorte.id, bairro: 'Tucuruvi', zona: '120' },
        { nome: 'Beatriz Almeida', whatsapp: '5511988880003', lider_acima_id: liderZonaNorte.id, bairro: 'Santana', zona: '120' },
        { nome: 'Márcio Gonçalves', whatsapp: '5511988880004', lider_acima_id: subLiderBairro.id, bairro: 'Jardim Primavera', zona: '150' },
        { nome: 'Tatiane Ribeiro', whatsapp: '5511988880005', lider_acima_id: subLiderBairro.id, bairro: 'Jardim Primavera', zona: '150' },
        { nome: 'André Santos', whatsapp: '5511988880006', lider_acima_id: liderZonaSul.id, bairro: 'Santo Amaro', zona: '150' },
      ];

      for (const ap of apoiadoresMock) {
        await db.insert(schema.usuarios).values({
          nome: ap.nome,
          whatsapp: ap.whatsapp,
          cargo: 'APOIADOR',
          lider_acima_id: ap.lider_acima_id,
          bairro: ap.bairro,
          zona_eleitoral: ap.zona,
          secao_eleitoral: '01',
          status_onboarding: 'COMPLETO',
        });
      }

      // 4. Criar Metas Iniciais
      await db.insert(schema.metas).values([
        {
          titulo: 'Meta Geral Campanha 2026',
          tipo: 'GLOBAL',
          quantidade_meta: 3500,
          quantidade_atual: 6,
          data_fim: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
          meta_diaria_cadencia: 30,
          status_semaforo: 'AMARELO',
        },
        {
          titulo: 'Mobilização Zona Norte (Zona 120)',
          tipo: 'ZONA',
          alvo_referencia: 'Zona 120',
          quantidade_meta: 1200,
          quantidade_atual: 3,
          data_fim: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000),
          meta_diaria_cadencia: 15,
          status_semaforo: 'VERDE',
        },
        {
          titulo: 'Mobilização Zona Sul (Zona 150)',
          tipo: 'ZONA',
          alvo_referencia: 'Zona 150',
          quantidade_meta: 1500,
          quantidade_atual: 3,
          data_fim: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000),
          meta_diaria_cadencia: 15,
          status_semaforo: 'VERMELHO',
        },
      ]);

      await recalculateNetworkMetrics();
      console.log('Banco de dados inicializado com sucesso.');
    }
  } catch (err) {
    console.warn('Aviso: Seed inicial não executado (banco pode estar indisponível ou já inicializado):', err);
  }
}

async function bootstrap() {
  try {
    // 1. Registrar Helmet com CSP seguro
    await fastify.register(helmet, {
      contentSecurityPolicy: false, // Permite Swagger UI e SSE fluidos
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    });

    // 2. Registrar Rate Limiting (120 req/min por IP com resposta padrão)
    await fastify.register(rateLimit, {
      max: 120,
      timeWindow: '1 minute',
      errorResponseBuilder: () => ({
        statusCode: 429,
        error: 'Too Many Requests',
        message: 'Limite de requisições excedido. Tente novamente em instantes.',
      }),
    });

    // 3. Registrar CORS
    await fastify.register(cors, {
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-user-audit', 'Accept', 'Origin', 'X-Requested-With', 'Range'],
      exposedHeaders: ['Content-Disposition', 'Content-Type', 'Content-Length', 'Accept-Ranges'],
      credentials: true,
    });

    // 2. Registrar Documentação Swagger OpenAPI
    await fastify.register(swagger, {
      openapi: {
        info: {
          title: 'API Painel Eleitoral 2026',
          description: 'Microserviço de Gestão de Lideranças, Ingestão Groq WhatsApp e Streaming PDF',
          version: '1.0.0',
        },
      },
    });

    await fastify.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false,
      },
    });

    // 3. Health Check
    fastify.get('/health', async () => {
      const memoryUsage = process.memoryUsage();
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime_seconds: Math.floor(process.uptime()),
        memory_usage_mb: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024),
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        },
      };
    });

    // 4. Registrar Rotas
    await fastify.register(authRoutes);
    await fastify.register(chatRoutes);
    await fastify.register(webhookRoutes);
    await fastify.register(disparosRoutes);
    await fastify.register(reportsRoutes);
    await fastify.register(metasRoutes);
    await fastify.register(liderancasRoutes);
    await fastify.register(whatsappRoutes);
    await fastify.register(materiaisRoutes);
    await fastify.register(botConfigRoutes);
    await fastify.register(campanhaRoutes);

    // 5. Iniciar Servidor Imediatamente
    await fastify.listen({ port, host });
    console.log(`🚀 Servidor Fastify ativo em http://${host}:${port}`);
    console.log(`📖 Documentação Swagger disponível em http://${host}:${port}/docs`);
    console.log(`📊 Health Check disponível em http://${host}:${port}/health`);

    // 6. Executar Seed e Restaurar Conexão WhatsApp 24/7 em segundo plano
    setImmediate(() => {
      seedInitialDataIfEmpty().catch(() => {});
      nativeWhatsAppService.autoReconnectIfAuthenticated().catch(() => {});
    });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

bootstrap();
