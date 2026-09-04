import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const backendUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function GET() {
  try {
    const res = await fetch(`${backendUrl}/api/whatsapp/aquecedor`);
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
    return NextResponse.json({
      status: 'PAUSADO',
      fase_atual: 1,
      dias_ativos: 0,
      msgs_enviadas_hoje: 0,
      limite_diario_atual: 10,
      health_score: 30,
      numeros_parceiros: [],
      simular_digitacao: true,
      delays_gaussianos: true,
    });
  } catch (err) {
    return NextResponse.json({
      status: 'PAUSADO',
      fase_atual: 1,
      dias_ativos: 0,
      msgs_enviadas_hoje: 0,
      limite_diario_atual: 10,
      health_score: 30,
      numeros_parceiros: [],
      simular_digitacao: true,
      delays_gaussianos: true,
    });
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action'); // toggle, config, ciclo
    const body = await request.json().catch(() => ({}));

    let endpoint = `${backendUrl}/api/whatsapp/aquecedor/toggle`;
    if (action === 'config') endpoint = `${backendUrl}/api/whatsapp/aquecedor/config`;
    if (action === 'ciclo') endpoint = `${backendUrl}/api/whatsapp/aquecedor/executar-ciclo`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: 'Falha ao conectar com o serviço de aquecimento' }, { status: 500 });
  }
}
