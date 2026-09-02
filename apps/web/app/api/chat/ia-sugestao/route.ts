import { NextResponse } from 'next/server';
import { db, schema } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mensagem_eleitor, contexto_eleitor, instrucoes_extras } = body;

    if (!mensagem_eleitor) {
      return NextResponse.json({ error: 'Mensagem do eleitor é obrigatória' }, { status: 400 });
    }

    const [campanha] = await db.select().from(schema.campanhaConfig).limit(1);

    const nomeCandidato = campanha?.nome_urna || 'Rodrigo da Saúde';
    const cargo = campanha?.cargo || 'Deputado Federal';
    const numero = campanha?.numero_candidato || '2026';
    const partido = campanha?.partido || 'AVANTE';
    const propostas = campanha?.propostas_ia || 'Saúde de qualidade, educação e emprego.';
    const biografia = campanha?.biografia_ia || 'Candidato com forte atuação social.';

    const groqApiKey = process.env.GROQ_API_KEY || '';

    if (groqApiKey) {
      const prompt = `Você é o copiloto oficial de atendimento do comitê eleitoral de ${nomeCandidato}, candidato(a) a ${cargo} (${numero} - ${partido}).
Biografia: ${biografia}
Propostas principais: ${propostas}

Contexto do Eleitor: ${JSON.stringify(contexto_eleitor || {})}
Instruções extras do operador: ${instrucoes_extras || 'Nenhuma'}

Mensagem recebida do eleitor: "${mensagem_eleitor}"

Gere uma resposta educada, empática, persuasiva e direta para o operador enviar ao eleitor no WhatsApp. Não use introduções, retorne apenas o texto exato da mensagem sugerida.`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 350,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const sugestao = data.choices?.[0]?.message?.content?.trim();
        if (sugestao) {
          return NextResponse.json({ sugestao });
        }
      }
    }

    // Fallback inteligente caso a chave Groq não esteja no ambiente
    const primeiroNome = contexto_eleitor?.nome ? contexto_eleitor.nome.split(' ')[0] : 'amigo(a)';
    const sugestaoFallback = `Olá, ${primeiroNome}! Muito obrigado pelo seu contato com a equipe do ${nomeCandidato}. ${
      mensagem_eleitor.toLowerCase().includes('proposta') || mensagem_eleitor.toLowerCase().includes('saude')
        ? `Nossa prioridade é transformar a saúde pública com postos funcionando e mais especialistas. Conte com o ${numero}!`
        : `Estamos à disposição para somar forças pela nossa cidade. Como podemos te apoiar ainda mais?`
    }`;

    return NextResponse.json({ sugestao: sugestaoFallback });
  } catch (error: any) {
    console.error('Erro na rota /api/chat/ia-sugestao:', error);
    return NextResponse.json({ error: 'Falha ao gerar sugestão de IA', detalhe: error?.message }, { status: 500 });
  }
}
