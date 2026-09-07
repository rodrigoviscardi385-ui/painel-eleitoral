import { LOCAIS_VOTACAO_SANTOS } from '../data/locaisVotacaoSantos.js';
import { groq } from './groqService.js';

export interface ParsedBUResult {
  valido: boolean;
  municipio: string;
  codigoMunicipio: string;
  zona: string;
  secao: string;
  localVotacaoNome?: string;
  bairro?: string;
  totalAptos: number;
  totalComparecimento: number;
  totalAbstencoes: number;
  votosCandidato: number;
  votosLegenda: number;
  votosBrancos: number;
  votosNulos: number;
  cargo: string;
  numeroCandidatoAlvo: string;
  votosPorCandidato: Record<string, number>;
  rawQrText: string;
  erro?: string;
}

/**
 * Decodifica texto bruto de QR Code de Boletim de Urna (TSE QR-BU) ou texto de foto do BU
 */
export async function parseBoletimUrna(
  rawText: string,
  targetCandidateNumber = '55955'
): Promise<ParsedBUResult> {
  const clean = rawText.trim();

  // 1. Tenta decodificação nativa por Expressões Regulares do padrão TSE
  try {
    const isTSEPattern =
      clean.toUpperCase().includes('QRBU') ||
      clean.toUpperCase().includes('ZONA') ||
      clean.toUpperCase().includes('SEC') ||
      clean.toUpperCase().includes('MUNI');

    if (isTSEPattern) {
      let zona = '';
      let secao = '';
      let aptos = 0;
      let comp = 0;
      let abst = 0;
      let votosCandidato = 0;
      let brancos = 0;
      let nulos = 0;
      let legenda = 0;
      const votosPorCandidato: Record<string, number> = {};

      // Extrai Zona
      const matchZona = clean.match(/(?:ZONA|ZON|Z)[:\s=]*(\d{1,4})/i);
      if (matchZona) zona = String(parseInt(matchZona[1], 10));

      // Extrai Seção
      const matchSecao = clean.match(/(?:SECAO|SEÇÃO|SEC|SC)[:\s=]*(\d{1,4})/i);
      if (matchSecao) secao = String(parseInt(matchSecao[1], 10));

      // Extrai Aptos
      const matchAptos = clean.match(/(?:APTO|APT|APTOS)[:\s=]*(\d+)/i);
      if (matchAptos) aptos = parseInt(matchAptos[1], 10);

      // Extrai Comparecimento
      const matchComp = clean.match(/(?:COMP|COM|COMPARECIMENTO)[:\s=]*(\d+)/i);
      if (matchComp) comp = parseInt(matchComp[1], 10);

      // Extrai Abstenções
      const matchAbst = clean.match(/(?:ABST|FALT|ABSTENCAO)[:\s=]*(\d+)/i);
      if (matchAbst) abst = parseInt(matchAbst[1], 10);
      else if (aptos > 0 && comp > 0) abst = Math.max(0, aptos - comp);

      // Extrai Brancos e Nulos
      const matchBrancos = clean.match(/(?:BRANCO|BRANCOS|BR)[:\s=]*(\d+)/i);
      if (matchBrancos) brancos = parseInt(matchBrancos[1], 10);

      const matchNulos = clean.match(/(?:NULO|NULOS|NUL)[:\s=]*(\d+)/i);
      if (matchNulos) nulos = parseInt(matchNulos[1], 10);

      // Busca votos do candidato alvo
      const regexTarget = new RegExp(`(?:^|\\D)${targetCandidateNumber}[:\\s=-]+(\\d+)`, 'i');
      const matchTarget = clean.match(regexTarget);
      if (matchTarget) {
        votosCandidato = parseInt(matchTarget[1], 10);
        votosPorCandidato[targetCandidateNumber] = votosCandidato;
      }

      // Procura outros pares de candidato:votos (ex: 13:45, 22:80, 55:12)
      const allVotesMatches = clean.matchAll(/(?:^|\s)(\d{2,5})[:\s=-]+(\d+)/g);
      for (const m of allVotesMatches) {
        const num = m[1];
        const qtd = parseInt(m[2], 10);
        votosPorCandidato[num] = qtd;
        if (num === targetCandidateNumber) {
          votosCandidato = qtd;
        }
      }

      if (zona && secao) {
        // Vincula à escola oficial de Santos
        const escola = LOCAIS_VOTACAO_SANTOS.find(
          (l) => l.zona === zona && l.secoes.includes(parseInt(secao, 10))
        );

        return {
          valido: true,
          municipio: 'Santos',
          codigoMunicipio: '70750',
          zona,
          secao,
          localVotacaoNome: escola?.nome || `Local da Zona ${zona} Seção ${secao}`,
          bairro: escola?.bairro || 'Santos',
          totalAptos: aptos,
          totalComparecimento: comp,
          totalAbstencoes: abst,
          votosCandidato,
          votosLegenda: legenda,
          votosBrancos: brancos,
          votosNulos: nulos,
          cargo: 'DEPUTADO FEDERAL',
          numeroCandidatoAlvo: targetCandidateNumber,
          votosPorCandidato,
          rawQrText: clean,
        };
      }
    }
  } catch (err) {
    console.warn('[BU Decoder Regex Error]', err);
  }

  // 2. Se regex falhar ou formato for fotográfico/desestruturado, usamos IA Groq para interpretação
  try {
    const prompt = `Você é um perito do Tribunal Superior Eleitoral (TSE) especializado em ler Boletins de Urna (BU) e QR-BUs impressos de urnas eletrônicas.
Analise o texto abaixo e extraia com precisão absoluta os dados da seção e contagem de votos.
Candidato alvo prioritário: número ${targetCandidateNumber}.

Texto do BU:
"""
${clean}
"""

Retorne EXCLUSIVAMENTE um objeto JSON válido no formato:
{
  "valido": boolean,
  "zona": string (apenas dígitos numéricos da zona eleitoral, ex "118" ou "272"),
  "secao": string (apenas dígitos numéricos da seção, ex "45"),
  "municipio": string,
  "aptos": number,
  "comparecimento": number,
  "abstencoes": number,
  "votos_candidato_alvo": number (quantidade de votos do número ${targetCandidateNumber}),
  "votos_brancos": number,
  "votos_nulos": number,
  "votos_legenda": number,
  "votos_todos": { "numero": quantidade }
}`;

    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.0,
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');

    if (parsed.zona && parsed.secao) {
      const zStr = String(parseInt(parsed.zona, 10));
      const sStr = String(parseInt(parsed.secao, 10));

      const escola = LOCAIS_VOTACAO_SANTOS.find(
        (l) => l.zona === zStr && l.secoes.includes(parseInt(sStr, 10))
      );

      return {
        valido: true,
        municipio: parsed.municipio || 'Santos',
        codigoMunicipio: '70750',
        zona: zStr,
        secao: sStr,
        localVotacaoNome: escola?.nome || `Local da Zona ${zStr} Seção ${sStr}`,
        bairro: escola?.bairro || 'Santos',
        totalAptos: parsed.aptos || 300,
        totalComparecimento: parsed.comparecimento || 250,
        totalAbstencoes: parsed.abstencoes || 50,
        votosCandidato: parsed.votos_candidato_alvo || parsed.votos_todos?.[targetCandidateNumber] || 0,
        votosLegenda: parsed.votos_legenda || 0,
        votosBrancos: parsed.votos_brancos || 0,
        votosNulos: parsed.votos_nulos || 0,
        cargo: 'DEPUTADO FEDERAL',
        numeroCandidatoAlvo: targetCandidateNumber,
        votosPorCandidato: parsed.votos_todos || {},
        rawQrText: clean,
      };
    }
  } catch (error: any) {
    console.error('[Groq BU Parsing Error]', error?.message || error);
  }

  return {
    valido: false,
    municipio: '',
    codigoMunicipio: '',
    zona: '',
    secao: '',
    totalAptos: 0,
    totalComparecimento: 0,
    totalAbstencoes: 0,
    votosCandidato: 0,
    votosLegenda: 0,
    votosBrancos: 0,
    votosNulos: 0,
    cargo: 'DEPUTADO FEDERAL',
    numeroCandidatoAlvo: targetCandidateNumber,
    votosPorCandidato: {},
    rawQrText: clean,
    erro: 'Não foi possível extrair os dados da urna. Envie uma foto nítida do QR Code ou o texto completo com Zona, Seção e Votos.',
  };
}
