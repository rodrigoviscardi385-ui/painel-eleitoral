import Groq from 'groq-sdk';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.GROQ_API_KEY) {
  console.warn('[Groq] AVISO: GROQ_API_KEY não configurada no .env. Funções de IA estarão indisponíveis.');
}

export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

/**
 * Transcreve áudio PTT/WhatsApp utilizando Whisper-Large-v3 na Groq (resposta em < 1s)
 */
export async function transcribeAudio(audioFilePath: string): Promise<string> {
  try {
    const fileStream = fs.createReadStream(audioFilePath);

    const transcription = await groq.audio.transcriptions.create({
      file: fileStream,
      model: 'whisper-large-v3',
      language: 'pt',
      response_format: 'verbose_json',
      temperature: 0.0,
      prompt: 'Transcrição em português de áudio de eleitor, liderança ou campanha eleitoral 2026.',
    });

    return transcription.text || '';
  } catch (error: any) {
    console.error('[Groq Whisper Error]', error?.message || error);
    throw new Error(`Falha ao transcrever áudio com Groq Whisper: ${error?.message}`);
  }
}

export interface VoterEntityExtracted {
  nome?: string;
  whatsapp?: string;
  bairro?: string;
  zona_eleitoral?: string;
  secao_eleitoral?: string;
  intencao_apoio?: 'ALTA' | 'MEDIA' | 'BAIXA' | 'INDECISO' | 'OPOSICAO';
  resumo?: string;
  lider_mencionado?: string;
}

// Modelo nativo Groq estável — não depende de roteamento OpenAI externo
const GROQ_TEXT_MODEL = 'llama-3.3-70b-versatile';

/**
 * Extrai entidades estruturadas (nome, bairro, whatsapp, zona) do texto usando IA
 */
export async function extractVoterEntities(text: string): Promise<VoterEntityExtracted> {
  try {
    const systemPrompt = `Você é um assistente de inteligência artificial eleitoral de ponta.
Sua missão é extrair dados de cadastro de eleitores e apoiadores a partir de conversas transcritas ou mensagens de WhatsApp.
Retorne EXCLUSIVAMENTE um objeto JSON válido com as seguintes chaves (se não encontrar alguma, retorne null):
{
  "nome": string | null,
  "whatsapp": string | null (apenas dígitos numéricos com DDD, ex: 13999998888),
  "bairro": string | null,
  "zona_eleitoral": string | null,
  "secao_eleitoral": string | null,
  "intencao_apoio": "ALTA" | "MEDIA" | "BAIXA" | "INDECISO" | "OPOSICAO" | null,
  "resumo": string,
  "lider_mencionado": string | null
}`;

    const completion = await groq.chat.completions.create({
      model: GROQ_TEXT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analise a seguinte mensagem e extraia os dados:\n"""\n${text}\n"""` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return {};

    return JSON.parse(content) as VoterEntityExtracted;
  } catch (error: any) {
    console.error('[Groq Entity Extraction Error]', error?.message || error);
    return { resumo: text };
  }
}

/**
 * Gera resposta inteligente do chatbot de campanha usando a biografia, tom de voz e propostas
 */
export async function generateCampaignBotResponse(
  userMessage: string,
  candidateConfig: {
    nome_urna: string;
    cargo: string;
    numero_candidato: string;
    partido: string;
    biografia_ia: string;
    propostas_ia: string;
    tom_voz_ia: string;
  },
  voterName?: string
): Promise<string> {
  try {
    const systemPrompt = `Você é a IA oficial de atendimento pelo WhatsApp da campanha de ${candidateConfig.nome_urna} (${candidateConfig.partido}), candidato(a) a ${candidateConfig.cargo}, número ${candidateConfig.numero_candidato}.
Seu tom de voz é ${candidateConfig.tom_voz_ia} (acolhedor, direto, popular e inspirador).

Diretrizes obrigatórias:
1. Responda em até 3 parágrafos curtos, ideal para leitura rápida no WhatsApp (máximo 120 palavras).
2. Use a biografia e propostas oficiais abaixo:
---
BIOGRAFIA: ${candidateConfig.biografia_ia}
PROPOSTAS: ${candidateConfig.propostas_ia}
---
3. Se o eleitor perguntar sobre temas não cobertos pelas propostas, informe cordialmente que a equipe de gabinete anotará a sugestão e que ele pode deixar o bairro para acompanhamento.
4. Jamais invente promessas que não estejam no texto.
5. Sempre termine convidando para participar ou chamando pelo nome se souber. ${voterName ? `O nome do eleitor é ${voterName}.` : ''}`;

    const completion = await groq.chat.completions.create({
      model: GROQ_TEXT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    return (
      completion.choices[0]?.message?.content ||
      `Olá! Obrigado pela mensagem. A equipe de ${candidateConfig.nome_urna} (${candidateConfig.numero_candidato}) recebeu seu contato e em breve retornaremos!`
    );
  } catch (error: any) {
    console.error('[Groq Bot Response Error]', error?.message || error);
    return `Olá! Agradecemos o contato. A equipe do candidato ${candidateConfig.nome_urna} (${candidateConfig.numero_candidato}) já registrou sua mensagem.`;
  }
}

export interface ExtractedExpense {
  descricao: string;
  valor: number;
  categoria:
    | 'COMBUSTIVEL'
    | 'ALIMENTACAO'
    | 'MATERIAL_GRAFICO'
    | 'EVENTOS'
    | 'IMPULSIONAMENTO'
    | 'PESSOAL'
    | 'JURIDICO_CONTABIL'
    | 'TRANSPORTE'
    | 'OUTROS';
  forma_pagamento: 'PIX' | 'CARTAO' | 'TRANSFERENCIA' | 'DINHEIRO' | 'BOLETO';
  fornecedor_nome?: string;
  fornecedor_documento?: string;
  numero_documento?: string;
}

/**
 * Extrai dados estruturados de um gasto/despesa a partir do texto enviado pelo líder via #gasto
 */
export async function extractExpenseFromText(text: string): Promise<ExtractedExpense> {
  try {
    const systemPrompt = `Você é um contador e auditor eleitoral especializado em prestação de contas do TSE.
Sua tarefa é ler um texto descritivo de gasto de campanha enviado por uma liderança via WhatsApp e extrair os dados em JSON.
Categorias válidas: COMBUSTIVEL, ALIMENTACAO, MATERIAL_GRAFICO, EVENTOS, IMPULSIONAMENTO, PESSOAL, JURIDICO_CONTABIL, TRANSPORTE, OUTROS.
Formas de pagamento válidas: PIX, CARTAO, TRANSFERENCIA, DINHEIRO, BOLETO.

Retorne EXCLUSIVAMENTE um objeto JSON válido:
{
  "descricao": string,
  "valor": number (ex: 150.50),
  "categoria": string,
  "forma_pagamento": string,
  "fornecedor_nome": string | null,
  "fornecedor_documento": string | null,
  "numero_documento": string | null
}`;

    const completion = await groq.chat.completions.create({
      model: GROQ_TEXT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Extraia o gasto deste texto:\n"""\n${text}\n"""` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error('Sem resposta da IA');

    return JSON.parse(content) as ExtractedExpense;
  } catch (error: any) {
    console.error('[Groq Expense Extraction Error]', error?.message || error);
    return {
      descricao: text,
      valor: 0,
      categoria: 'OUTROS',
      forma_pagamento: 'PIX',
    };
  }
}
