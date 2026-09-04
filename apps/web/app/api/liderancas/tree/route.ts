import { NextResponse } from 'next/server';
import { db, schema } from '../../../../lib/db';
import { sql } from 'drizzle-orm';

function maskPhone(phone: string): string {
  if (!phone || phone.length < 8) return '****-****';
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 11) {
    return `+55 (${clean.slice(0, 2)}) 9****-${clean.slice(7)}`;
  }
  return `+55 ****-${clean.slice(-4)}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shouldMask = searchParams.get('maskLGPD') !== 'false';

    const rawHierarchy = (await db.execute(sql`
      WITH RECURSIVE hierarquia_liderancas AS (
        SELECT 
          u.id,
          u.nome,
          u.whatsapp,
          u.cargo,
          u.lider_acima_id,
          u.bairro,
          u.zona_eleitoral,
          u.secao_eleitoral,
          u.grupo_whatsapp_id,
          u.grupo_link_convite,
          u.total_indicados_diretos,
          u.total_indicados_rede,
          0 AS nivel,
          ARRAY[u.id::text] AS caminho_arvore,
          u.created_at
        FROM ${schema.usuarios} u
        WHERE (u.lider_acima_id IS NULL OR u.lider_acima_id = u.id OR u.lider_acima_id NOT IN (SELECT id FROM ${schema.usuarios}))

        UNION ALL

        SELECT 
          filho.id,
          filho.nome,
          filho.whatsapp,
          filho.cargo,
          filho.lider_acima_id,
          filho.bairro,
          filho.zona_eleitoral,
          filho.secao_eleitoral,
          filho.grupo_whatsapp_id,
          filho.grupo_link_convite,
          filho.total_indicados_diretos,
          filho.total_indicados_rede,
          pai.nivel + 1 AS nivel,
          pai.caminho_arvore || filho.id::text AS caminho_arvore,
          filho.created_at
        FROM ${schema.usuarios} filho
        INNER JOIN hierarquia_liderancas pai ON filho.lider_acima_id = pai.id
        WHERE NOT (filho.id::text = ANY(pai.caminho_arvore)) AND pai.nivel < 10
      )
      SELECT * FROM hierarquia_liderancas ORDER BY nivel ASC, nome ASC;
    `)) as any[];

    const formattedTree = rawHierarchy.map((node) => ({
      id: node.id,
      nome: node.nome,
      whatsapp: shouldMask ? maskPhone(node.whatsapp) : node.whatsapp,
      cargo: node.cargo,
      lider_acima_id: node.lider_acima_id,
      bairro: node.bairro || 'Não informado',
      zona_eleitoral: node.zona_eleitoral || '100',
      secao_eleitoral: node.secao_eleitoral || '01',
      grupo_whatsapp_id: node.grupo_whatsapp_id,
      grupo_link_convite: node.grupo_link_convite,
      total_indicados_diretos: parseInt(node.total_indicados_diretos || '0', 10),
      total_indicados_rede: parseInt(node.total_indicados_rede || '0', 10),
      nivel: parseInt(node.nivel || '0', 10),
      caminho_arvore: node.caminho_arvore,
      created_at: node.created_at,
    }));

    return NextResponse.json({
      tree: formattedTree,
      total_lideres: formattedTree.length,
      is_masked: shouldMask,
    });
  } catch (error) {
    console.error('Erro em /api/liderancas/tree:', error);
    return NextResponse.json({ tree: [], total_lideres: 0 }, { status: 500 });
  }
}
