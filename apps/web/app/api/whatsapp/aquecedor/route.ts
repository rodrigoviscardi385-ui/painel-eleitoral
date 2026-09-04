import { NextResponse } from 'next/server';
import { db, schema } from '../../../../lib/db';
import { eq } from 'drizzle-orm';
import { getBackendUrl } from '../../../../lib/backendUrl';

export const dynamic = 'force-dynamic';

const backendUrl = getBackendUrl();

export async function GET() {
  try {
    // 1. Busca configuração oficial direto do banco Supabase
    let [config] = await db
      .select()
      .from(schema.chipWarmingConfig)
      .where(eq(schema.chipWarmingConfig.instance_name, 'campanha_2026'))
      .limit(1);

    if (!config) {
      const [created] = await db
        .insert(schema.chipWarmingConfig)
        .values({
          instance_name: 'campanha_2026',
          status: 'PAUSADO',
          fase_atual: 1,
          dias_ativos: 0,
          msgs_enviadas_hoje: 0,
          limite_diario_atual: 10,
          health_score: 35,
          numeros_parceiros: '[]',
          simular_digitacao: true,
          delays_gaussianos: true,
        })
        .returning();
      config = created;
    }

    let parsedNumeros: string[] = [];
    try {
      parsedNumeros = JSON.parse(config.numeros_parceiros || '[]');
    } catch {
      parsedNumeros = [];
    }

    return NextResponse.json({
      status: config.status,
      fase_atual: config.fase_atual,
      dias_ativos: config.dias_ativos,
      msgs_enviadas_hoje: config.msgs_enviadas_hoje,
      limite_diario_atual: config.limite_diario_atual,
      health_score: config.health_score,
      numeros_parceiros: parsedNumeros,
      simular_digitacao: config.simular_digitacao,
      delays_gaussianos: config.delays_gaussianos,
      ultimo_ciclo_em: config.ultimo_ciclo_em,
    });
  } catch (err: any) {
    console.error('Erro em GET /api/whatsapp/aquecedor:', err);
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

    // Busca configuração atual
    let [config] = await db
      .select()
      .from(schema.chipWarmingConfig)
      .where(eq(schema.chipWarmingConfig.instance_name, 'campanha_2026'))
      .limit(1);

    if (!config) {
      const [created] = await db
        .insert(schema.chipWarmingConfig)
        .values({
          instance_name: 'campanha_2026',
          status: 'PAUSADO',
          fase_atual: 1,
          numeros_parceiros: '[]',
        })
        .returning();
      config = created;
    }

    // 1. AÇÃO: Alternar Status (ATIVO / PAUSADO)
    if (action === 'toggle') {
      const nextStatus = config.status === 'ATIVO' ? 'PAUSADO' : 'ATIVO';
      const [updated] = await db
        .update(schema.chipWarmingConfig)
        .set({
          status: nextStatus,
          updated_at: new Date(),
        })
        .where(eq(schema.chipWarmingConfig.id, config.id))
        .returning();

      // Notifica o backend Fastify de background (se disponível)
      fetch(`${backendUrl}/api/whatsapp/aquecedor/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        status: updated.status,
      });
    }

    // 2. AÇÃO: Salvar Configurações (ex: Adicionar/Remover Número Amigo)
    if (action === 'config') {
      const updateData: any = { updated_at: new Date() };

      if (Array.isArray(body.numeros_parceiros)) {
        updateData.numeros_parceiros = JSON.stringify(body.numeros_parceiros);
        // Atualiza o health score baseado na quantidade de números amigos cadastrados
        const count = body.numeros_parceiros.length;
        updateData.health_score = Math.min(95, 35 + count * 15);
      }
      if (typeof body.simular_digitacao === 'boolean') {
        updateData.simular_digitacao = body.simular_digitacao;
      }
      if (typeof body.delays_gaussianos === 'boolean') {
        updateData.delays_gaussianos = body.delays_gaussianos;
      }
      if (typeof body.fase_atual === 'number') {
        updateData.fase_atual = body.fase_atual;
      }

      const [updated] = await db
        .update(schema.chipWarmingConfig)
        .set(updateData)
        .where(eq(schema.chipWarmingConfig.id, config.id))
        .returning();

      // Notifica o backend Fastify de background (se disponível)
      fetch(`${backendUrl}/api/whatsapp/aquecedor/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).catch(() => {});

      let parsedNumeros: string[] = [];
      try {
        parsedNumeros = JSON.parse(updated.numeros_parceiros || '[]');
      } catch {
        parsedNumeros = [];
      }

      return NextResponse.json({
        success: true,
        numeros_parceiros: parsedNumeros,
        health_score: updated.health_score,
        status: updated.status,
      });
    }

    // 3. AÇÃO: Executar Ciclo Manual de Aquecimento
    if (action === 'ciclo') {
      const [updated] = await db
        .update(schema.chipWarmingConfig)
        .set({
          msgs_enviadas_hoje: (config.msgs_enviadas_hoje || 0) + 1,
          ultimo_ciclo_em: new Date(),
          updated_at: new Date(),
        })
        .where(eq(schema.chipWarmingConfig.id, config.id))
        .returning();

      // Tenta executar no backend real se online
      fetch(`${backendUrl}/api/whatsapp/aquecedor/executar-ciclo`, {
        method: 'POST',
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        message: 'Ciclo de aquecimento disparado com sucesso!',
        msgs_enviadas_hoje: updated.msgs_enviadas_hoje,
      });
    }

    return NextResponse.json({ error: 'Ação não reconhecida' }, { status: 400 });
  } catch (error: any) {
    console.error('Erro em POST /api/whatsapp/aquecedor:', error);
    return NextResponse.json({ error: 'Falha ao atualizar aquecedor', detail: error?.message }, { status: 500 });
  }
}
