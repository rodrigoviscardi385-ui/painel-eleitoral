import { NextResponse } from 'next/server';
import { getBackendUrl } from '../../../../lib/backendUrl';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const backendUrl = getBackendUrl();

  try {
    const body = await request.json();
    const res = await fetch(`${backendUrl}/api/whatsapp/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
    const errData = await res.json().catch(() => ({}));
    return NextResponse.json({ error: errData.error || 'Falha na simulação' }, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({
      error: 'Servidor Backend / Baileys offline.',
      detalhe: err.message,
    }, { status: 503 });
  }
}
