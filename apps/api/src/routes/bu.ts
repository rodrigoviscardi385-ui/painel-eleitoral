import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, desc, sql } from 'drizzle-orm';
import { parseBoletimUrna } from '../services/buDecoderService.js';
import { LOCAIS_VOTACAO_SANTOS } from '../data/locaisVotacaoSantos.js';

export async function buRoutes(app: FastifyInstance) {
  // Retorna o consolidado em tempo real da apuração prévia dos Boletins de Urna
  app.get('/api/bu/apuracao', async () => {
    // Busca candidato oficial ativo
    const config =
      (await db
        .select()
        .from(schema.campanhaConfig)
        .where(eq(schema.campanhaConfig.ativo, true))
        .limit(1)
        .then((r) => r[0])) ||
      (await db.select().from(schema.campanhaConfig).limit(1).then((r) => r[0]));

    const numeroAlvo = config?.numero_candidato || '55955';
    const nomeAlvo = config?.nome_urna || 'Gustavo Reis';

    // Total de seções conhecidas em Santos
    const totalSecoesCidade = LOCAIS_VOTACAO_SANTOS.reduce(
      (acc, curr) => acc + curr.secoes.length,
      0
    );

    // BUs recebidos
    const bus = await db
      .select()
      .from(schema.boletinsUrna)
      .where(eq(schema.boletinsUrna.numero_candidato, numeroAlvo));

    const totalSecoesApuradas = bus.length;
    const percentualApurado =
      totalSecoesCidade > 0
        ? Number(((totalSecoesApuradas / totalSecoesCidade) * 100).toFixed(1))
        : 0;

    const totalVotosCandidato = bus.reduce((acc, b) => acc + b.votos_candidato, 0);
    const totalComparecimento = bus.reduce((acc, b) => acc + b.total_comparecimento, 0);
    const totalAptos = bus.reduce((acc, b) => acc + b.total_aptos, 0);

    // Média de votos por seção apurada
    const mediaPorSecao =
      totalSecoesApuradas > 0
        ? Math.round(totalVotosCandidato / totalSecoesApuradas)
        : 0;

    // Projeção matemática para 100% das urnas de Santos
    const projecaoTotalVotos = mediaPorSecao * totalSecoesCidade;

    // Agrupamento por Zona (118 vs 272)
    const porZona = {
      '118': {
        secoesApuradas: bus.filter((b) => b.zona === '118').length,
        totalVotos: bus.filter((b) => b.zona === '118').reduce((acc, b) => acc + b.votos_candidato, 0),
      },
      '272': {
        secoesApuradas: bus.filter((b) => b.zona === '272').length,
        totalVotos: bus.filter((b) => b.zona === '272').reduce((acc, b) => acc + b.votos_candidato, 0),
      },
    };

    // Agrupamento por Bairro (ranking)
    const porBairroMap = new Map<string, { votos: number; secoes: number }>();
    for (const b of bus) {
      const bairro = b.bairro || 'Outros';
      const atual = porBairroMap.get(bairro) || { votos: 0, secoes: 0 };
      atual.votos += b.votos_candidato;
      atual.secoes += 1;
      porBairroMap.set(bairro, atual);
    }

    const rankingBairros = Array.from(porBairroMap.entries())
      .map(([bairro, d]) => ({ bairro, ...d }))
      .sort((a, b) => b.votos - a.votos);

    return {
      candidato: {
        nome: nomeAlvo,
        numero: numeroAlvo,
        cargo: config?.cargo || 'Deputado Federal',
      },
      cidade: 'Santos / SP',
      totalSecoesCidade,
      totalSecoesApuradas,
      percentualApurado,
      totalVotosCandidato,
      totalComparecimento,
      totalAptos,
      mediaPorSecao,
      projecaoTotalVotos,
      porZona,
      rankingBairros,
    };
  });

  // Lista todos os Boletins de Urna recebidos
  app.get('/api/bu/lista', async () => {
    const lista = await db
      .select()
      .from(schema.boletinsUrna)
      .orderBy(desc(schema.boletinsUrna.created_at))
      .limit(200);

    return lista;
  });

  // Processamento manual de QR-BU (Upload de foto ou texto)
  app.post('/api/bu/processar', async (request, reply) => {
    const body = (request.body as any) || {};
    const rawText = body.rawText || body.qrCodeData || body.textoBruto;
    const fotoUrl = body.fotoUrl || body.fotoBase64;
    const remetenteNome = body.remetenteNome || body.enviadoPorNome;
    const remetenteWhatsapp = body.remetenteWhatsapp || body.enviadoPorWhatsApp;

    if (!rawText || typeof rawText !== 'string') {
      return reply.status(400).send({ error: 'Texto bruto do QR-BU ou do Boletim é obrigatório.' });
    }

    const config =
      (await db
        .select()
        .from(schema.campanhaConfig)
        .where(eq(schema.campanhaConfig.ativo, true))
        .limit(1)
        .then((r) => r[0])) ||
      (await db.select().from(schema.campanhaConfig).limit(1).then((r) => r[0]));

    const numeroAlvo = config?.numero_candidato || '55955';
    const parsed = await parseBoletimUrna(rawText, numeroAlvo);

    if (!parsed.valido) {
      return reply.status(422).send({
        error: parsed.erro || 'Não foi possível validar o Boletim de Urna.',
        detalhes: parsed,
      });
    }

    // Salva ou atualiza no banco de dados
    const existing = await db
      .select()
      .from(schema.boletinsUrna)
      .where(
        sql`${schema.boletinsUrna.zona} = ${parsed.zona} AND ${schema.boletinsUrna.secao} = ${parsed.secao} AND ${schema.boletinsUrna.numero_candidato} = ${parsed.numeroCandidatoAlvo}`
      )
      .limit(1)
      .then((r) => r[0]);

    if (existing) {
      await db
        .update(schema.boletinsUrna)
        .set({
          votos_candidato: parsed.votosCandidato,
          total_comparecimento: parsed.totalComparecimento,
          total_aptos: parsed.totalAptos,
          total_abstencoes: parsed.totalAbstencoes,
          votos_legenda: parsed.votosLegenda,
          votos_brancos: parsed.votosBrancos,
          votos_nulos: parsed.votosNulos,
          dados_completos_json: JSON.stringify(parsed.votosPorCandidato),
          foto_comprovante_url: fotoUrl || existing.foto_comprovante_url,
          remetente_nome: remetenteNome || existing.remetente_nome,
          remetente_whatsapp: remetenteWhatsapp || existing.remetente_whatsapp,
        })
        .where(eq(schema.boletinsUrna.id, existing.id));
    } else {
      await db.insert(schema.boletinsUrna).values({
        municipio: parsed.municipio,
        codigo_municipio: parsed.codigoMunicipio,
        zona: parsed.zona,
        secao: parsed.secao,
        local_votacao_nome: parsed.localVotacaoNome,
        bairro: parsed.bairro,
        total_aptos: parsed.totalAptos,
        total_comparecimento: parsed.totalComparecimento,
        total_abstencoes: parsed.totalAbstencoes,
        votos_candidato: parsed.votosCandidato,
        votos_legenda: parsed.votosLegenda,
        votos_brancos: parsed.votosBrancos,
        votos_nulos: parsed.votosNulos,
        cargo: parsed.cargo,
        numero_candidato: parsed.numeroCandidatoAlvo,
        dados_completos_json: JSON.stringify(parsed.votosPorCandidato),
        foto_comprovante_url: fotoUrl || null,
        remetente_nome: remetenteNome || 'Painel Admin',
        remetente_whatsapp: remetenteWhatsapp || 'ADMIN',
      });
    }

    return {
      success: true,
      message: `Boletim da Zona ${parsed.zona}, Seção ${parsed.secao} processado com sucesso!`,
      bu: parsed,
    };
  });
}
