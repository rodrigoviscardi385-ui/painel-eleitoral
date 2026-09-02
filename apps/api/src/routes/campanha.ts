import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const campanhaConfigSchema = z.object({
  nome_urna: z.string().min(2).max(100),
  nome_completo: z.string().min(2).max(150),
  numero_candidato: z.string().min(1).max(20),
  cargo: z.string().min(2).max(100),
  partido: z.string().min(1).max(50),
  coligacao: z.string().max(255).optional().nullable(),
  slogan: z.string().max(255).optional().nullable(),
  foto_url: z.string().optional().nullable(),
  logo_url: z.string().optional().nullable(),
  cor_primaria: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#10b981'),
  cidade: z.string().min(2).max(100),
  estado: z.string().length(2).toUpperCase(),
  data_eleicao: z.string().default('2026-10-04'),
  cnpj_campanha: z.string().max(30).optional().nullable(),
  biografia_ia: z.string().max(3000),
  propostas_ia: z.string().max(5000),
  tom_voz_ia: z.enum(['POPULAR', 'FORMAL', 'DESCONTRAIDO', 'TECNICO']).default('POPULAR'),
  link_grupo_geral: z.string().url().optional().nullable().or(z.literal('')),
  whatsapp_comite: z.string().max(30).optional().nullable(),
}).strip();

// Cache em memória para desempenho máximo e tolerância a falhas
let cachedConfig: any = null;

export async function getCampanhaConfigFromDb() {
  if (cachedConfig) return cachedConfig;
  try {
    const [cfg] = await db.select().from(schema.campanhaConfig).limit(1);
    if (cfg) {
      cachedConfig = cfg;
      return cfg;
    }
    // Cria registro padrão se não existir
    const [novo] = await db.insert(schema.campanhaConfig).values({}).returning();
    cachedConfig = novo;
    return novo;
  } catch (err) {
    console.warn('[Campanha] Aviso ao ler do DB, usando fallback padrão:', err);
    return {
      nome_urna: 'Rodrigo da Saúde',
      nome_completo: 'Rodrigo Viscardi',
      numero_candidato: '2026',
      cargo: 'Deputado Federal',
      partido: 'AVANTE',
      coligacao: 'Coligação Por Dias Melhores',
      slogan: 'Trabalho, honestidade e compromisso com você',
      foto_url: null,
      logo_url: null,
      cor_primaria: '#10b981',
      cidade: 'São Paulo',
      estado: 'SP',
      data_eleicao: '2026-10-04',
      cnpj_campanha: '00.000.000/0001-00',
      biografia_ia: 'Candidato comprometido com a melhoria da saúde pública, geração de empregos e desenvolvimento sustentável das nossas comunidades.',
      propostas_ia: 'SAÚDE: Fortalecimento dos postos de saúde, redução de filas para exames e valorização dos profissionais.\nEDUCAÇÃO: Escolas de tempo integral e tecnologia em sala de aula.\nEMPREGO: Apoio ao pequeno empreendedor e incentivos fiscais para empresas locais.',
      tom_voz_ia: 'POPULAR',
      link_grupo_geral: 'https://chat.whatsapp.com/convite-campanha',
      whatsapp_comite: '',
    };
  }
}

export async function campanhaRoutes(fastify: FastifyInstance) {
  /** GET /api/campanha/config — Ler dados atuais da campanha */
  fastify.get('/api/campanha/config', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const config = await getCampanhaConfigFromDb();
      return reply.send({ config });
    } catch (err) {
      console.error('[Campanha] Erro na rota GET:', err);
      return reply.status(500).send({ error: 'Erro ao obter dados da campanha' });
    }
  });

  /** PUT /api/campanha/config — Atualizar dados da campanha */
  fastify.put('/api/campanha/config', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = campanhaConfigSchema.partial().parse(request.body);
      const [existe] = await db.select({ id: schema.campanhaConfig.id }).from(schema.campanhaConfig).limit(1);

      let resultado;
      if (existe) {
        const [atualizado] = await db
          .update(schema.campanhaConfig)
          .set({ ...(body as any), updated_at: new Date() })
          .where(eq(schema.campanhaConfig.id, existe.id))
          .returning();
        resultado = atualizado;
      } else {
        const [novo] = await db.insert(schema.campanhaConfig).values(body as any).returning();
        resultado = novo;
      }

      cachedConfig = resultado;
      return reply.send({ config: resultado, ok: true });
    } catch (err: any) {
      if (err?.name === 'ZodError') {
        return reply.status(400).send({ error: 'Dados inválidos', detalhes: err.errors });
      }
      console.error('[Campanha] Erro ao salvar:', err);
      return reply.status(500).send({ error: 'Erro ao salvar personalização da campanha' });
    }
  });
}
