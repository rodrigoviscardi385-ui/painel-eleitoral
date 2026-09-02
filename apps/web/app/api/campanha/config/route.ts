import { NextResponse } from 'next/server';
import { db, schema } from '../../../../lib/db';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [config] = await db.select().from(schema.campanhaConfig).limit(1);
    return NextResponse.json({ config });
  } catch (error: any) {
    console.error('Erro na rota GET /api/campanha/config:', error);
    return NextResponse.json({ error: 'Falha ao buscar configurações de campanha', detalhe: error?.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const [existing] = await db.select().from(schema.campanhaConfig).limit(1);

    if (existing) {
      const [updated] = await db
        .update(schema.campanhaConfig)
        .set({
          ...body,
          updated_at: new Date(),
        })
        .where(eq(schema.campanhaConfig.id, existing.id))
        .returning();
      return NextResponse.json({ success: true, config: updated });
    } else {
      const [novo] = await db
        .insert(schema.campanhaConfig)
        .values({
          ...body,
        })
        .returning();
      return NextResponse.json({ success: true, config: novo });
    }
  } catch (error: any) {
    console.error('Erro na rota POST /api/campanha/config:', error);
    return NextResponse.json({ error: 'Falha ao salvar configurações de campanha', detalhe: error?.message }, { status: 500 });
  }
}
