import Groq from 'groq-sdk';
import dotenv from 'dotenv';
import { Readable } from 'stream';

dotenv.config();

const groqApiKey = process.env.GROQ_API_KEY || 'gsk_demo_token';
const groq = new Groq({ apiKey: groqApiKey });

export interface ExtractedSupporter {
  nome: string;
  whatsapp?: string | null;
  bairro?: string | null;
  zona_eleitoral?: string | null;
  secao_eleitoral?: string | null;
  status_validacao?: 'COMPLETO' | 'PENDENTE_SECAO' | 'SEM_CONTATO_DIRETO';
  notas?: string | null;
}

export interface ExtractionResult {
  transcricao?: string;
  status: 'SUCESSO' | 'INCOMPREENSIVEL' | 'SEM_ELEITORES';
  eleitores: ExtractedSupporter[];
  total_identificados: number;
  mensagem_orientacao?: string;
  raw_response?: string;
}

/**
 * Transcreve áudio (.ogg, .opus, .mp3, etc.) utilizando Groq Whisper-large-v3
 * Executado diretamente em memória RAM (Buffer < 2MB sem salvar em disco)
 */
export async function transcribeAudioWithWhisper(
  audioBuffer: Buffer,
  filename = 'audio.ogg'
): Promise<string> {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === 'gsk_seu_token_groq_aqui') {
      console.log('GROQ_API_KEY de demonstração. Retornando transcrição simulada.');
      return 'Olá comitê, anote aí os meus apoiadores: Marcos Souza, telefone 11 99999-8888, mora no Centro, vota na zona cento e vinte seção quarenta e cinco.';
    }

    const formData = new FormData();
    const blob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/ogg' });
    formData.append('file', blob, filename);
    formData.append('model', 'whisper-large-v3');
    formData.append('language', 'pt');
    formData.append('response_format', 'json');
    formData.append('temperature', '0.0');
    formData.append('prompt', 'Transcrição eleitoral: nomes próprios brasileiros, bairros, números de telefone WhatsApp, zona eleitoral e seção eleitoral.');

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Erro na API Groq Whisper:', errText);
      return '';
    }

    const data = (await response.json()) as { text?: string };
    return data.text || '';
  } catch (error) {
    console.error('Erro na transcrição Whisper Groq:', error);
    return '';
  }
}

/**
 * Extrai múltiplos eleitores/apoiadores a partir de texto livre ou áudio transcrito
 * Utiliza IA Groq em modo JSON com suporte a multi-cadastro, normalização e fallbacks
 */
export async function extractSupportersFromText(text: string): Promise<ExtractionResult> {
  if (!text || text.trim().length === 0) {
    return {
      transcricao: text,
      status: 'INCOMPREENSIVEL',
      eleitores: [],
      total_identificados: 0,
      mensagem_orientacao: 'Não foi possível captar o áudio com clareza devido ao barulho de fundo. Pode repetir ou digitar o nome e o telefone?',
    };
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey || apiKey === 'gsk_seu_token_groq_aqui') {
    return {
      transcricao: text,
      status: 'SUCESSO',
      eleitores: [
        {
          nome: 'Marcos Souza',
          whatsapp: '5511999998888',
          bairro: 'Centro',
          zona_eleitoral: '120',
          secao_eleitoral: '45',
          status_validacao: 'COMPLETO',
          notas: 'Apoiador direto confirmado',
        },
      ],
      total_identificados: 1,
    };
  }

  const systemPrompt = `Você é um Engenheiro de Dados e Analista de Inteligência Eleitoral de alta precisão.
Sua missão é extrair cadastros de um ou múltiplos apoiadores e eleitores mencionados na mensagem de texto ou transcrição de áudio do líder comunitário.

Regras Estritas de Extração e Normalização:
1. TRATAMENTO MULTI-CADASTROS:
   - Itere por conjunções aditivas ("e também", "junto com", "a esposa dele", "o filho") para identificar TODOS os eleitores mencionados na mesma mensagem.
2. NORMALIZAÇÃO NUMÉRICA:
   - Converta números por extenso para inteiros (Ex: "zona cento e dezoito seção quarenta e dois" -> zona_eleitoral: "118", secao_eleitoral: "42").
3. HIGIENIZAÇÃO DE TELEFONES:
   - Remova caracteres não numéricos. Se vier com 8 ou 9 dígitos sem DDD, complete com DDI 55 e DDD 11 (ou infira o DDD padrão).
   - Se NÃO houver telefone mencionado, retorne whatsapp: null e status_validacao: "SEM_CONTATO_DIRETO".
4. STATUS DE VALIDAÇÃO:
   - Se tiver Nome, Telefone, Bairro, Zona e Seção: status_validacao = "COMPLETO".
   - Se faltar apenas a Seção Eleitoral: status_validacao = "PENDENTE_SECAO".
   - Se faltar o Telefone: status_validacao = "SEM_CONTATO_DIRETO".
5. CASOS DE BORDA:
   - Se a mensagem não contiver nenhum nome ou estiver totalmente incompreensível: retorne status: "INCOMPREENSIVEL" e eleitores: [].
6. FORMATO DE SAÍDA JSON ESTREITO:
{
  "status": "SUCESSO" | "INCOMPREENSIVEL" | "SEM_ELEITORES",
  "eleitores": [
    {
      "nome": "string",
      "whatsapp": "string ou null",
      "bairro": "string ou null",
      "zona_eleitoral": "string ou null",
      "secao_eleitoral": "string ou null",
      "status_validacao": "COMPLETO" | "PENDENTE_SECAO" | "SEM_CONTATO_DIRETO",
      "notas": "string ou null"
    }
  ],
  "mensagem_orientacao": "string ou null"
}`;

  const availableModels = [
    'openai/gpt-oss-120b',
    'qwen/qwen3.6-27b',
    'openai/gpt-oss-20b',
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
  ];

  for (const model of availableModels) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Mensagem enviada pelo líder:\n"""\n${text}\n"""` },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        continue;
      }

      const data = (await response.json()) as any;
      const content = data.choices?.[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);
      const eleitores: ExtractedSupporter[] = Array.isArray(parsed.eleitores)
        ? parsed.eleitores
        : parsed.nome
        ? [parsed]
        : [];

      return {
        transcricao: text,
        status: parsed.status || (eleitores.length > 0 ? 'SUCESSO' : 'SEM_ELEITORES'),
        eleitores,
        total_identificados: eleitores.length,
        mensagem_orientacao: parsed.mensagem_orientacao,
        raw_response: content,
      };
    } catch (err) {
      console.warn(`Tentativa com modelo ${model} falhou:`, err);
    }
  }

  return {
    transcricao: text,
    status: 'INCOMPREENSIVEL',
    eleitores: [],
    total_identificados: 0,
    mensagem_orientacao: 'Não consegui entender a mensagem com clareza. Pode digitar o nome e a zona do apoiador?',
    raw_response: 'Erro crítico na API Groq',
  };
}
