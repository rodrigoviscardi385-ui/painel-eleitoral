import { NextRequest } from 'next/server';
import { db, schema } from '../../../../lib/db';
import { sql, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;
      let lastCheck = new Date(Date.now() - 5000);

      // Envia evento inicial de handshake
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ status: 'STREAM_CONNECTED', timestamp: Date.now() })}\n\n`)
      );

      const intervalId = setInterval(async () => {
        if (isClosed) return;
        try {
          // Busca mensagens recebidas ou enviadas nos últimos segundos
          const novidades = (await db.execute(sql`
            SELECT id, conversa_id, de_whatsapp, para_whatsapp, remetente_nome, conteudo, tipo, direcao, status, midia_url, created_at
            FROM ${schema.mensagensChat}
            WHERE created_at > ${lastCheck}
            ORDER BY created_at ASC
            LIMIT 20;
          `)) as any[];

          if (novidades && novidades.length > 0) {
            lastCheck = new Date();
            for (const msg of novidades) {
              const eventPayload = `event: new_message\ndata: ${JSON.stringify(msg)}\n\n`;
              controller.enqueue(encoder.encode(eventPayload));
            }
          } else {
            // Heartbeat para manter a conexão SSE ativa
            controller.enqueue(encoder.encode(`event: ping\ndata: ${Date.now()}\n\n`));
          }
        } catch (err) {
          // Em caso de erro transitório no pooling, mantém o stream vivo
        }
      }, 2000);

      req.signal.addEventListener('abort', () => {
        isClosed = true;
        clearInterval(intervalId);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
