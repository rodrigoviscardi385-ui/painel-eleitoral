import { NextResponse } from 'next/server';
import { db, schema } from '../../../../lib/db';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'painel_eleitoral_jwt_secret_campanha_2026_super_key';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 });
    }

    const payload = jwt.verify(token, JWT_SECRET) as any;
    if (!payload?.id) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const [user] = await db
      .select()
      .from(schema.usuariosAuth)
      .where(eq(schema.usuariosAuth.id, payload.id))
      .limit(1);

    if (!user || user.ativo === 'NAO') {
      return NextResponse.json({ error: 'Usuário não encontrado ou inativo' }, { status: 401 });
    }

    let permissoes: string[] = [];
    try {
      permissoes = JSON.parse(user.permissoes);
    } catch {
      permissoes = ['CHAT'];
    }

    if ((user.role === 'ADMIN' || user.role === 'COORDENADOR') && !permissoes.includes('GASTOS')) {
      permissoes.push('GASTOS');
    }

    return NextResponse.json({
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        whatsapp: user.whatsapp,
        role: user.role,
        permissoes,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 });
  }
}
