import { NextResponse } from 'next/server';
import { db, schema } from '../../../../lib/db';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  const backendUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // 1. Tenta consultar o serviço Fastify/Baileys ativo
  try {
    const res = await fetch(`${backendUrl}/api/whatsapp/status`, {
      cache: 'no-store',
      next: { revalidate: 0 },
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (err) {
    // Backend offline ou inacessível no momento
  }

  // 2. Fallback: verificar se há sessão salva no banco Supabase
  try {
    const [session] = await db
      .select()
      .from(schema.usuarios)
      .limit(1);

    return NextResponse.json({
      connected: false,
      status: 'DISCONNECTED',
      message: 'WhatsApp desconectado. Inicie a conexão para gerar o QR Code.',
      qrCode: null,
      phoneNumber: null,
    });
  } catch (error: any) {
    return NextResponse.json({
      connected: false,
      status: 'DISCONNECTED',
      message: 'Servidor de WhatsApp offline.',
      qrCode: null,
      phoneNumber: null,
    });
  }
}
