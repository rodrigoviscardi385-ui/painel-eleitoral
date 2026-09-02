import { NextResponse } from 'next/server';
import { db, schema } from '../../../../lib/db';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [config] = await db.select().from(schema.botConfig).limit(1);
    return NextResponse.json({ config });
  } catch (error: any) {
    console.error('Erro na rota GET /api/bot/config:', error);
    return NextResponse.json({ error: 'Falha ao buscar configurações do bot', detalhe: error?.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const [existing] = await db.select().from(schema.botConfig).limit(1);

    if (existing) {
      const [updated] = await db
        .update(schema.botConfig)
        .set({
          ...body,
          updated_at: new Date(),
        })
        .where(eq(schema.botConfig.id, existing.id))
        .returning();
      return NextResponse.json({ success: true, config: updated });
    } else {
      const [novo] = await db
        .insert(schema.botConfig)
        .values({
          ...body,
        })
        .returning();
      return NextResponse.json({ success: true, config: novo });
    }
  } catch (error: any) {
    console.error('Erro na rota POST /api/bot/config:', error);
    return NextResponse.json({ error: 'Falha ao salvar configurações do bot', detalhe: error?.message }, { status: 500 });
  }
}
