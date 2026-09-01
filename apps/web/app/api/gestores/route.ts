import { NextResponse } from 'next/server';
import { db, schema } from '../../../lib/db';
import { eq, inArray } from 'drizzle-orm';

export async function GET() {
  try {
    const gestores = await db
      .select()
      .from(schema.usuarios)
      .where(inArray(schema.usuarios.cargo, ['ADMIN', 'GESTOR']))
      .orderBy(schema.usuarios.nome);

    return NextResponse.json({ gestores, total: gestores.length });
  } catch (error) {
    return NextResponse.json({ error: 'Falha ao buscar gestores' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nome, whatsapp, cargo = 'GESTOR', bairro, zona_eleitoral } = body || {};

    if (!nome || !whatsapp) {
      return NextResponse.json({ error: 'Nome e WhatsApp são obrigatórios' }, { status: 400 });
    }

    let cleanWhatsapp = String(whatsapp).replace(/\D/g, '');
    if (cleanWhatsapp.length < 8) {
      return NextResponse.json({ error: 'WhatsApp inválido. Informe o número com DDD.' }, { status: 400 });
    }
    if (cleanWhatsapp.length === 10 || cleanWhatsapp.length === 11) {
      cleanWhatsapp = `55${cleanWhatsapp}`;
    }

    const [novoGestor] = await db
      .insert(schema.usuarios)
      .values({
        nome: String(nome).trim(),
        whatsapp: cleanWhatsapp,
        cargo: cargo === 'ADMIN' ? 'ADMIN' : 'GESTOR',
        bairro: bairro ? String(bairro).trim() : 'Geral',
        zona_eleitoral: zona_eleitoral ? String(zona_eleitoral).trim() : null,
        status_onboarding: 'COMPLETO',
      })
      .onConflictDoUpdate({
        target: schema.usuarios.whatsapp,
        set: {
          nome: String(nome).trim(),
          cargo: cargo === 'ADMIN' ? 'ADMIN' : 'GESTOR',
          bairro: bairro ? String(bairro).trim() : 'Geral',
          zona_eleitoral: zona_eleitoral ? String(zona_eleitoral).trim() : null,
          status_onboarding: 'COMPLETO',
          updated_at: new Date(),
        },
      })
      .returning();

    return NextResponse.json({ success: true, gestor: novoGestor }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Falha ao cadastrar gestor', detail: error?.message }, { status: 500 });
  }
}
