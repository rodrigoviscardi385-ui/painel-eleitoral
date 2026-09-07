/**
 * voiceParserService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Parser de Ingestão por Voz de Campo com Inteligência Artificial.
 * Converte notas de voz e relatos informais de rua em registros eleitorais estruturados.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

export interface StructuredVoterLead {
  nome: string;
  whatsapp?: string;
  bairro: string;
  intencao_voto: 'CONFIRMADO' | 'INDECISO' | 'OPOSICAO' | 'NAO_DECLARADO';
  score_engajamento: number;
  pautas_relevantes: string[];
  resumo_conversa: string;
  consentimento_informado: boolean;
}

export class VoiceParserService {
  private static groq: Groq | null = process.env.GROQ_API_KEY
    ? new Groq({ apiKey: process.env.GROQ_API_KEY })
    : null;

  /**
   * Converte transcrição de áudio de rua em Lead Estruturado
   */
  public static async parseCanvasserNote(transcriptionText: string): Promise<StructuredVoterLead> {
    if (!transcriptionText || transcriptionText.trim().length === 0) {
      throw new Error('Transcrição vazia fornecida para o parser.');
    }

    if (this.groq) {
      try {
        const completion = await this.groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: `Você é o Extrator de Inteligência de Campo do Painel Eleitoral 2026.
Analise a transcrição informal da conversa do cabo eleitoral com um cidadão e extraia estritamente um objeto JSON com o formato:
{
  "nome": string (Nome do eleitor identificado ou "Eleitor Anônimo"),
  "whatsapp": string ou null (número limpo com DDD se mencionado),
  "bairro": string (Bairro citado ou "Centro"),
  "intencao_voto": "CONFIRMADO" | "INDECISO" | "OPOSICAO" | "NAO_DECLARADO",
  "score_engajamento": number (0 a 100 estimando a simpatia ao candidato),
  "pautas_relevantes": string[] (ex: ["Saúde", "Creche", "Asfalto"]),
  "resumo_conversa": string (máximo 120 caracteres),
  "consentimento_informado": boolean (true se aceitou receber mensagens)
}
Responda EXCLUSIVAMENTE o JSON válido, sem tags markdown ou comentários.`,
            },
            {
              role: 'user',
              content: `Transcrição do relato de campo:\n"${transcriptionText}"`,
            },
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' },
        });

        const rawContent = completion.choices[0]?.message?.content || '{}';
        const parsed = JSON.parse(rawContent);

        return {
          nome: parsed.nome || 'Eleitor Anônimo',
          whatsapp: parsed.whatsapp || undefined,
          bairro: parsed.bairro || 'Território Geral',
          intencao_voto: parsed.intencao_voto || 'INDECISO',
          score_engajamento: Number(parsed.score_engajamento || 50),
          pautas_relevantes: Array.isArray(parsed.pautas_relevantes) ? parsed.pautas_relevantes : [],
          resumo_conversa: parsed.resumo_conversa || transcriptionText.slice(0, 120),
          consentimento_informado: Boolean(parsed.consentimento_informado ?? true),
        };
      } catch (err) {
        console.warn('[VOICE_PARSER] Erro ao chamar Groq, utilizando heurística estruturada local:', err);
      }
    }

    // Heurística tática determinística (Fallback local sem IA externa)
    const lower = transcriptionText.toLowerCase();
    let intencao: StructuredVoterLead['intencao_voto'] = 'INDECISO';
    let score = 50;

    if (
      lower.includes('não quer') ||
      lower.includes('vai votar no outro') ||
      lower.includes('voto no outro') ||
      lower.includes('odeia') ||
      lower.includes('contra') ||
      lower.includes('nem a pau')
    ) {
      intencao = 'OPOSICAO';
      score = 15;
    } else if (
      lower.includes('com certeza') ||
      lower.includes('fechado') ||
      lower.includes('apoia') ||
      lower.includes('vota nele') ||
      lower.includes('nosso candidato')
    ) {
      intencao = 'CONFIRMADO';
      score = 85;
    }

    const pautas: string[] = [];
    if (lower.includes('saúde') || lower.includes('hospital') || lower.includes('ubs') || lower.includes('remédio')) pautas.push('Saúde');
    if (lower.includes('segurança') || lower.includes('polícia') || lower.includes('assalto')) pautas.push('Segurança');
    if (lower.includes('escola') || lower.includes('creche') || lower.includes('educação')) pautas.push('Educação');
    if (lower.includes('buraco') || lower.includes('asfalto') || lower.includes('iluminação') || lower.includes('lixo')) pautas.push('Infraestrutura');

    return {
      nome: 'Eleitor de Campo',
      bairro: 'Território Mapeado',
      intencao_voto: intencao,
      score_engajamento: score,
      pautas_relevantes: pautas.length > 0 ? pautas : ['Demandas Gerais'],
      resumo_conversa: transcriptionText.slice(0, 120),
      consentimento_informado: !lower.includes('não me mande nada'),
    };
  }
}
