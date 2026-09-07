/**
 * server.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Servidor Fastify principal do Painel Eleitoral 2026.
 * Segurança:
 *   • JWT_SECRET exclusivamente de variável de ambiente (sem fallback hardcoded)
 *   • CORS configurado via CORS_ORIGIN do .env
 *   • Integração exclusiva com Meta Cloud API (Baileys removido)
 *   • rawBody habilitado para verificação HMAC do webhook
 * ─────────────────────────────────────────────────────────────────────────────
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import dotenv from 'dotenv';
import { initDatabase } from './db/index.js';
import { startQueueWorker } from './services/queueWorker.js';
import { initWhatsApp } from './services/wppService.js';

import { authRoutes } from './routes/auth.js';
import { whatsappRoutes } from './routes/whatsapp.js';
import { liderancasRoutes } from './routes/liderancas.js';
import { metasRoutes } from './routes/metas.js';
import { chatRoutes } from './routes/chat.js';
import { gastosRoutes } from './routes/gastos.js';
import { campanhaRoutes } from './routes/campanha.js';
import { materiaisRoutes } from './routes/materiais.js';
import { botConfigRoutes } from './routes/botConfig.js';
import { gestoresRoutes } from './routes/gestores.js';
import { reportsRoutes } from './routes/reports.js';
import { backupRoutes } from './routes/backup.js';
import { locaisVotacaoRoutes } from './routes/locaisVotacao.js';
import { buRoutes } from './routes/bu.js';
import { metaWebhookRoutes } from './routes/metaWebhook.js';
import { syncRoutes } from './routes/sync.js';
import { h3AnalyticsRoutes } from './routes/h3Analytics.js';
import { sireneCriseRoutes } from './routes/sireneCrise.js';
import { gapAnalysisRoutes } from './routes/gapAnalysisRoutes.js';
import { equipeRuaRoutes } from './routes/equipeRuaRoutes.js';

dotenv.config();

// ─── Validações críticas de ambiente ──────────────────────────────────────────
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '') {
  console.error('❌ FATAL: JWT_SECRET não configurado no .env. O servidor não pode iniciar com segurança.');
  console.error('   Gere uma chave forte: openssl rand -hex 64');
  process.exit(1);
}

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const app = Fastify({
  logger: {
    level: 'info',
  },
  bodyLimit: 30 * 1024 * 1024, // 30MB para upload de fotos e comprovantes
  disableRequestLogging: false,
});

// Adiciona rawBody para verificação HMAC do webhook da Meta
app.addContentTypeParser('application/json', { parseAs: 'buffer' }, function (req, body, done) {
  (req as any).rawBody = body;
  try {
    done(null, JSON.parse(body.toString()));
  } catch (err: any) {
    done(err, undefined);
  }
});

// 1. Plugins de Segurança e CORS
await app.register(cors, {
  origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
});

await app.register(helmet, {
  contentSecurityPolicy: false,
});

await app.register(rateLimit, {
  max: 150, // Reduzido de 300 para 150 req/min (mais seguro)
  timeWindow: '1 minute',
});

// 2. Swagger / Documentação OpenAPI
await app.register(swagger, {
  openapi: {
    info: {
      title: 'Painel Eleitoral 2026 - API Oficial',
      description: 'API de inteligência, mobilização de lideranças, WhatsApp Cloud API Meta e controle financeiro TSE.',
      version: '2.1.0',
    },
    servers: [
      {
        url: `${process.env.WEBHOOK_BASE_URL || 'http://localhost:3001'}`,
        description: 'Servidor de Produção',
      },
      {
        url: `http://localhost:${PORT}`,
        description: 'Desenvolvimento Local',
      },
    ],
  },
});

await app.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: false,
  },
});

// 3. Health Check
app.get('/api/health', async () => {
  return {
    status: 'online',
    timestamp: new Date().toISOString(),
    version: '2.1.0',
    service: 'painel-eleitoral-api',
    whatsapp_provider: 'META_CLOUD_API_OFICIAL',
  };
});

// 4. Registro de Todas as Rotas
await app.register(authRoutes);
await app.register(whatsappRoutes);
await app.register(liderancasRoutes);
await app.register(metasRoutes);
await app.register(chatRoutes);
await app.register(gastosRoutes);
await app.register(campanhaRoutes);
await app.register(materiaisRoutes);
await app.register(botConfigRoutes);
await app.register(gestoresRoutes);
await app.register(reportsRoutes);
await app.register(backupRoutes);
await app.register(locaisVotacaoRoutes);
await app.register(buRoutes);
await app.register(metaWebhookRoutes);
await app.register(syncRoutes);
await app.register(h3AnalyticsRoutes);
await app.register(sireneCriseRoutes);
await app.register(gapAnalysisRoutes);
await app.register(equipeRuaRoutes);

// 5. Inicialização do Servidor
async function startServer() {
  try {
    console.log('=====================================================');
    console.log('🏛️  PAINEL ELEITORAL 2026 - INICIANDO SISTEMA...');
    console.log('📡  Integração: WhatsApp Cloud API Oficial da Meta');
    console.log('=====================================================');

    await initDatabase();
    startQueueWorker();
    initWhatsApp().catch((e) => console.warn('[server] Aviso ao iniciar WhatsApp Baileys:', e?.message));

    await app.listen({ port: PORT, host: HOST });
    console.log(`🚀 API rodando em http://${HOST}:${PORT}`);
    console.log(`📖 Swagger disponível em http://${HOST}:${PORT}/docs`);
    console.log(`🌐 Webhook Meta: ${process.env.WEBHOOK_BASE_URL || 'http://localhost:3001'}/api/whatsapp/meta-webhook`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Graceful Shutdown
const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
  process.on(signal, async () => {
    console.log(`Recebido ${signal}. Finalizando servidor com segurança...`);
    await app.close();
    process.exit(0);
  });
});

startServer();
