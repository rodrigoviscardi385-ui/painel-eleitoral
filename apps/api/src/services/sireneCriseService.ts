/**
 * sireneCriseService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Pipeline da "Sirene de Crise" com IA e Cadeia de Custódia Probatória.
 * Detecta anomalias de sentimento e gera a Tríade Tática de Resposta em <900ms.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import Groq from 'groq-sdk';
import { CryptoVaultService } from './cryptoVaultService.js';
import { LgpdComplianceService } from './lgpdComplianceService.js';
import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

export interface TacticalTriadResponse {
  sintese: string;
  contraNarrativas: Array<{
    publicoAlvo: string;
    tom: string;
    mensagem: string;
  }>;
  minutaJuridica: {
    remedio: string;
    fundamentoLegal: string;
    pedidoTutela: string;
  };
}

export interface CrisisIncident {
  id: string;
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  topico: string;
  sinteseNarrativa: string;
  contraNarrativas: TacticalTriadResponse['contraNarrativas'];
  minutaJuridica: TacticalTriadResponse['minutaJuridica'];
  evidenciaUrl?: string;
  evidenciaSha256: string;
  status: 'DETECTADO' | 'EM_RESPOSTA' | 'NEUTRALIZADO' | 'ARQUIVADO';
  createdAt: string;
}

export class SireneCriseService {
  private static groq: Groq | null = process.env.GROQ_API_KEY
    ? new Groq({ apiKey: process.env.GROQ_API_KEY })
    : null;

  /**
   * Processa uma menção adversária e gera imediatamente o pacote de resposta da Sirene de Crise
   */
  public static async processCrisisAlert(
    topico: string,
    relatoBruto: string,
    evidenciaUrl?: string
  ): Promise<CrisisIncident> {
    const startMs = Date.now();
    const evidenciaSha256 = CryptoVaultService.generateEvidenceHash(
      `${topico}::${relatoBruto}::${evidenciaUrl || ''}::${startMs}`
    );

    let triad: TacticalTriadResponse = {
      sintese: 'Ataque coordenado contra a imagem do candidato utilizando informações fora de contexto.',
      contraNarrativas: [
        {
          publicoAlvo: 'Militância Orgânica e WhatsApp',
          tom: 'Esclarecedor e Firme',
          mensagem: LgpdComplianceService.applyAiTransparencyDisclaimer(
            `Atenção grupo: está circulando uma montagem maldosa sobre ${topico}. A verdade é uma só: nossa trajetória é limpa e transparente. Compartilhem os dados reais!`
          ),
        },
        {
          publicoAlvo: 'Redes Sociais Públicas',
          tom: 'Institucional e Altivo',
          mensagem: LgpdComplianceService.applyAiTransparencyDisclaimer(
            `Diante dos ataques infundados sobre ${topico}, reafirmamos nosso compromisso com a verdade e o trabalho honesto por nossa gente.`
          ),
        },
      ],
      minutaJuridica: {
        remedio: 'Notificação Extrajudicial c/c Pedido de Direito de Resposta',
        fundamentoLegal: 'Art. 58 da Lei Federal 9.504/97 e Resolução TSE nº 23.610/2019',
        pedidoTutela: 'Remoção imediata da publicação no prazo de 2 horas sob pena de multa diária.',
      },
    };

    if (this.groq) {
      try {
        const completion = await this.groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: `Você é o Estrategista-Chefe da Sirene de Crise do Painel Eleitoral 2026.
Diante de uma denúncia ou boato adverso, gere instantaneamente em JSON estrito a Tríade Tática:
{
  "sintese": string (Resumo em 1 frase do ataque e da falsidade),
  "contraNarrativas": [
    { "publicoAlvo": string, "tom": string, "mensagem": string },
    { "publicoAlvo": string, "tom": string, "mensagem": string }
  ],
  "minutaJuridica": {
    "remedio": string (ex: "Direito de Resposta c/c Tutela de Urgência"),
    "fundamentoLegal": string (ex: "Art. 58 da Lei 9.504/97 e Res. TSE 23.610/2019"),
    "pedidoTutela": string (pedido liminar de remoção)
  }
}
Retorne EXCLUSIVAMENTE o JSON válido.`,
            },
            {
              role: 'user',
              content: `Tópico: ${topico}\nRelato do ataque adversário:\n"${relatoBruto}"`,
            },
          ],
          temperature: 0.2,
          response_format: { type: 'json_object' },
        });

        const rawJson = completion.choices[0]?.message?.content || '{}';
        const parsed = JSON.parse(rawJson);

        if (parsed.sintese && Array.isArray(parsed.contraNarrativas)) {
          triad = {
            sintese: parsed.sintese,
            contraNarrativas: parsed.contraNarrativas.map((cn: any) => ({
              publicoAlvo: cn.publicoAlvo || 'Geral',
              tom: cn.tom || 'Firme',
              mensagem: LgpdComplianceService.applyAiTransparencyDisclaimer(cn.mensagem || ''),
            })),
            minutaJuridica: {
              remedio: parsed.minutaJuridica?.remedio || triad.minutaJuridica.remedio,
              fundamentoLegal: parsed.minutaJuridica?.fundamentoLegal || triad.minutaJuridica.fundamentoLegal,
              pedidoTutela: parsed.minutaJuridica?.pedidoTutela || triad.minutaJuridica.pedidoTutela,
            },
          };
        }
      } catch (err) {
        console.warn('[SIRENE_CRISE] Fallback local ativado para síntese da crise:', err);
      }
    }

    // Grava no banco na tabela sirene_crise_incidentes
    const insertResult = await db.execute(sql`
      INSERT INTO sirene_crise_incidentes (
        threat_level, topico, sintese_narrativa, contra_narrativas_json, minuta_juridica_json, evidencia_url, evidencia_sha256, status, created_at
      ) VALUES (
        'CRITICAL',
        ${topico},
        ${triad.sintese},
        ${JSON.stringify(triad.contraNarrativas)},
        ${JSON.stringify(triad.minutaJuridica)},
        ${evidenciaUrl || null},
        ${evidenciaSha256},
        'DETECTADO',
        NOW()
      )
      RETURNING id, created_at;
    `);

    const insertedRows = insertResult as any[];
    const row = insertedRows[0] as { id: string; created_at: string };

    return {
      id: row.id,
      threatLevel: 'CRITICAL',
      topico,
      sinteseNarrativa: triad.sintese,
      contraNarrativas: triad.contraNarrativas,
      minutaJuridica: triad.minutaJuridica,
      evidenciaUrl,
      evidenciaSha256,
      status: 'DETECTADO',
      createdAt: new Date(row.created_at).toISOString(),
    };
  }

  /**
   * Retorna os incidentes ativos da Sirene de Crise
   */
  public static async getActiveIncidents(): Promise<CrisisIncident[]> {
    const result = await db.execute(sql`
      SELECT 
        id, threat_level, topico, sintese_narrativa, contra_narrativas_json, minuta_juridica_json, evidencia_url, evidencia_sha256, status, created_at
      FROM sirene_crise_incidentes
      ORDER BY created_at DESC
      LIMIT 20;
    `);

    const rows = result as any[];
    return rows.map((r) => ({
      id: r.id,
      threatLevel: r.threat_level,
      topico: r.topico,
      sinteseNarrativa: r.sintese_narrativa,
      contraNarrativas: JSON.parse(r.contra_narrativas_json || '[]'),
      minutaJuridica: JSON.parse(r.minuta_juridica_json || '{}'),
      evidenciaUrl: r.evidencia_url,
      evidenciaSha256: r.evidencia_sha256,
      status: r.status,
      createdAt: new Date(r.created_at).toISOString(),
    }));
  }
}
