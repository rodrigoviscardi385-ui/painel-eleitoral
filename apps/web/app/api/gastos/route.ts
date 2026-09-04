import { NextResponse } from 'next/server';
import { db, schema } from '../../../lib/db';
import { desc, eq, and, sql, ilike } from 'drizzle-orm';

// Auto-criação da tabela resiliente
async function ensureGastosTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS gastos_campanha (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        descricao TEXT NOT NULL,
        categoria TEXT NOT NULL DEFAULT 'OUTROS',
        valor NUMERIC(12, 2) NOT NULL,
        data_gasto TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        forma_pagamento TEXT NOT NULL DEFAULT 'PIX',
        fornecedor_nome TEXT,
        fornecedor_documento TEXT,
        numero_documento TEXT,
        comprovante_url TEXT,
        responsavel_nome TEXT,
        status_auditoria TEXT NOT NULL DEFAULT 'PENDENTE',
        observacoes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  } catch (err) {
    console.warn('Aviso ao verificar tabela gastos_campanha:', err);
  }
}

export async function GET(request: Request) {
  try {
    await ensureGastosTable();

    const { searchParams } = new URL(request.url);
    const categoria = searchParams.get('categoria');
    const status = searchParams.get('status');
    const formaPagamento = searchParams.get('forma_pagamento');
    const search = searchParams.get('search');

    const conditions = [];

    if (categoria && categoria !== 'TODAS') {
      conditions.push(eq(schema.gastosCampanha.categoria, categoria as any));
    }

    if (status && status !== 'TODOS') {
      conditions.push(eq(schema.gastosCampanha.status_auditoria, status as any));
    }

    if (formaPagamento && formaPagamento !== 'TODAS') {
      conditions.push(eq(schema.gastosCampanha.forma_pagamento, formaPagamento as any));
    }

    if (search) {
      conditions.push(
        sql`(${schema.gastosCampanha.descricao} ILIKE ${`%${search}%`} OR ${schema.gastosCampanha.fornecedor_nome} ILIKE ${`%${search}%`} OR ${schema.gastosCampanha.numero_documento} ILIKE ${`%${search}%`})`
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const items = await db
      .select()
      .from(schema.gastosCampanha)
      .where(whereClause)
      .orderBy(desc(schema.gastosCampanha.data_gasto), desc(schema.gastosCampanha.created_at));

    // Métricas financeiras e de auditoria consolidadas
    const [statsResult] = (await db.execute(sql`
      SELECT 
        COALESCE(SUM(valor), 0) AS total_gasto,
        COALESCE(SUM(CASE WHEN status_auditoria = 'APROVADO' THEN valor ELSE 0 END), 0) AS total_aprovado,
        COALESCE(SUM(CASE WHEN status_auditoria = 'PENDENTE' THEN valor ELSE 0 END), 0) AS total_pendente,
        COALESCE(SUM(CASE WHEN status_auditoria = 'REJEITADO' THEN valor ELSE 0 END), 0) AS total_rejeitado,
        COUNT(*) AS total_registros,
        COUNT(CASE WHEN status_auditoria = 'PENDENTE' THEN 1 END) AS count_pendentes
      FROM gastos_campanha;
    `)) as any[];

    // Agrupamento por categoria
    const categoryStats = (await db.execute(sql`
      SELECT 
        categoria,
        COALESCE(SUM(valor), 0) AS total,
        COUNT(*) AS quantidade
      FROM gastos_campanha
      GROUP BY categoria
      ORDER BY total DESC;
    `)) as any[];

    return NextResponse.json({
      success: true,
      data: items,
      kpis: {
        totalGasto: Number(statsResult?.total_gasto || 0),
        totalAprovado: Number(statsResult?.total_aprovado || 0),
        totalPendente: Number(statsResult?.total_pendente || 0),
        totalRejeitado: Number(statsResult?.total_rejeitado || 0),
        totalRegistros: Number(statsResult?.total_registros || 0),
        countPendentes: Number(statsResult?.count_pendentes || 0),
        tetoLegalTSE: 350000.0, // Teto estimado para Deputado Federal / Municipal de referência
      },
      distribuicaoCategorias: categoryStats.map((c) => ({
        categoria: c.categoria,
        total: Number(c.total || 0),
        quantidade: Number(c.quantidade || 0),
      })),
    });
  } catch (error: any) {
    console.error('Erro ao buscar gastos da campanha:', error);
    return NextResponse.json(
      { error: 'Falha ao buscar despesas da campanha', detail: error?.message || String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureGastosTable();

    const body = await request.json();
    const {
      descricao,
      categoria = 'OUTROS',
      valor,
      data_gasto,
      forma_pagamento = 'PIX',
      fornecedor_nome,
      fornecedor_documento,
      numero_documento,
      comprovante_url,
      responsavel_nome,
      status_auditoria = 'PENDENTE',
      observacoes,
    } = body || {};

    if (!descricao || valor === undefined || valor === null) {
      return NextResponse.json(
        { error: 'A descrição e o valor do gasto são obrigatórios.' },
        { status: 400 }
      );
    }

    // Normalização do valor monetário
    let cleanValor = 0;
    if (typeof valor === 'number') {
      cleanValor = valor;
    } else {
      const sanitized = String(valor)
        .replace(/R\$\s?/g, '')
        .replace(/\./g, '')
        .replace(',', '.')
        .trim();
      cleanValor = parseFloat(sanitized) || 0;
    }

    if (cleanValor <= 0) {
      return NextResponse.json(
        { error: 'O valor do gasto deve ser maior que zero.' },
        { status: 400 }
      );
    }

    const [novoGasto] = await db
      .insert(schema.gastosCampanha)
      .values({
        descricao: String(descricao).trim(),
        categoria,
        valor: cleanValor.toFixed(2),
        data_gasto: data_gasto ? new Date(data_gasto) : new Date(),
        forma_pagamento,
        fornecedor_nome: fornecedor_nome ? String(fornecedor_nome).trim() : null,
        fornecedor_documento: fornecedor_documento ? String(fornecedor_documento).trim() : null,
        numero_documento: numero_documento ? String(numero_documento).trim() : null,
        comprovante_url: comprovante_url || null,
        responsavel_nome: responsavel_nome ? String(responsavel_nome).trim() : 'Comitê Central',
        status_auditoria,
        observacoes: observacoes ? String(observacoes).trim() : null,
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: 'Gasto registrado com sucesso.',
      data: novoGasto,
    });
  } catch (error: any) {
    console.error('Erro ao registrar gasto:', error);
    return NextResponse.json(
      { error: 'Erro interno ao salvar gasto.', detail: error?.message || String(error) },
      { status: 500 }
    );
  }
}
