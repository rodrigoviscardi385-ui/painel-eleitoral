import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq } from 'drizzle-orm';

export async function botConfigRoutes(app: FastifyInstance) {
  // Retorna a parametrização atual do Chatbot
  app.get('/api/bot/config', async () => {
    const config = await db.select().from(schema.botConfig).limit(1).then((r) => r[0]);
    if (!config) {
      return {
        ativo: true,
        modo_padrao: 'BOT',
        mensagem_boas_vindas: 'Olá! Seja muito bem-vindo ao canal oficial da nossa campanha. Como posso te ajudar hoje?',
        menu_opcoes: '1 - Conhecer as propostas do candidato\n2 - Falar com a equipe do comitê\n3 - Indicar apoiadores e eleitores\n4 - Receber materiais e santinho virtual\n5 - Conectar ao grupo do seu bairro',
        mensagem_encerramento: 'Agradecemos imensamente o seu contato! Juntos construiremos uma cidade cada vez melhor.',
        mensagem_fora_horario: 'Olá! Nosso horário de atendimento no comitê é das 08:00 às 20:00. Deixe sua mensagem que responderemos assim que iniciarmos o expediente!',
        horario_inicio: '08:00',
        horario_fim: '20:00',
        dias_funcionamento: '["SEG", "TER", "QUA", "QUI", "SEX", "SAB"]',
      };
    }
    return config;
  });

  // Atualiza as opções e regras de atendimento do Chatbot
  app.put('/api/bot/config', async (request, reply) => {
    const body = request.body as any;
    const existing = await db.select().from(schema.botConfig).limit(1).then((r) => r[0]);

    const updateData: any = {
      ...body,
      updated_at: new Date(),
    };

    if (existing) {
      await db.update(schema.botConfig).set(updateData).where(eq(schema.botConfig.id, existing.id));
    } else {
      await db.insert(schema.botConfig).values(updateData);
    }

    const updated = await db.select().from(schema.botConfig).limit(1).then((r) => r[0]);
    return updated;
  });
}
