import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const renderUrl = process.env.NEXT_PUBLIC_API_URL || 'https://painel-eleitoral-api.onrender.com';
  
  // Keep-alive não-bloqueante para o Render não hibernar
  if (renderUrl && renderUrl.includes('onrender.com')) {
    fetch(`${renderUrl}/health`, { method: 'GET', signal: AbortSignal.timeout(5000) })
      .catch(() => {});
  }

  return NextResponse.json({
    status: 'healthy',
    time: new Date().toISOString(),
    service: 'painel-eleitoral-web',
  });
}
