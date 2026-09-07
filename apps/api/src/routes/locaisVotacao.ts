import { FastifyInstance } from 'fastify';
import { LOCAIS_VOTACAO_SANTOS } from '../data/locaisVotacaoSantos.js';

function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export async function locaisVotacaoRoutes(app: FastifyInstance) {
  // Lista ou busca locais de votação de Santos/SP por nome de escola, bairro ou zona
  app.get('/api/locais-votacao', async (request) => {
    const { busca, zona, bairro } = request.query as any;

    let resultados = LOCAIS_VOTACAO_SANTOS;

    if (zona) {
      resultados = resultados.filter((l) => l.zona === String(zona));
    }

    if (bairro) {
      const bClean = normalizeText(String(bairro));
      resultados = resultados.filter((l) => normalizeText(l.bairro).includes(bClean));
    }

    if (busca) {
      const q = normalizeText(String(busca));
      resultados = resultados.filter(
        (l) =>
          normalizeText(l.nome).includes(q) ||
          normalizeText(l.bairro).includes(q) ||
          normalizeText(l.endereco).includes(q) ||
          l.zona.includes(q) ||
          l.secoes.some((s) => String(s) === q)
      );
    }

    return resultados.map((l) => ({
      ...l,
      nome_escola: l.nome,
      zona_eleitoral: l.zona,
    }));
  });

  // Retorna estatísticas gerais das zonas e seções de Santos
  app.get('/api/locais-votacao/estatisticas', async () => {
    const totalEscolas = LOCAIS_VOTACAO_SANTOS.length;
    const totalSecoes = LOCAIS_VOTACAO_SANTOS.reduce((acc, curr) => acc + curr.secoes.length, 0);

    const porZona = {
      '118': {
        escolas: LOCAIS_VOTACAO_SANTOS.filter((l) => l.zona === '118').length,
        secoes: LOCAIS_VOTACAO_SANTOS.filter((l) => l.zona === '118').reduce(
          (acc, curr) => acc + curr.secoes.length,
          0
        ),
      },
      '272': {
        escolas: LOCAIS_VOTACAO_SANTOS.filter((l) => l.zona === '272').length,
        secoes: LOCAIS_VOTACAO_SANTOS.filter((l) => l.zona === '272').reduce(
          (acc, curr) => acc + curr.secoes.length,
          0
        ),
      },
      '273': {
        escolas: LOCAIS_VOTACAO_SANTOS.filter((l) => l.zona === '273').length,
        secoes: LOCAIS_VOTACAO_SANTOS.filter((l) => l.zona === '273').reduce(
          (acc, curr) => acc + curr.secoes.length,
          0
        ),
      },
    };

    return {
      cidade: 'Santos',
      uf: 'SP',
      totalEscolas,
      totalSecoes,
      porZona,
    };
  });
}
