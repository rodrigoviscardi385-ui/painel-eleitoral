import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  const backendUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  try {
    const res = await fetch(`${backendUrl}/api/whatsapp/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
    const errData = await res.json().catch(() => ({}));
    return NextResponse.json({ error: errData.error || 'Falha ao conectar WhatsApp' }, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({
      error: 'Servidor Fastify / Baileys offline. Certifique-se de que a API está rodando na porta 3001.',
      detalhe: err.message,
    }, { status: 503 });
  }
}
