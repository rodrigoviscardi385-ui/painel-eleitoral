import Fastify from 'fastify';
import cors from '@fastify/cors';
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
    // 1. Registrar CORS
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
