import { NextResponse } from 'next/server';
import { db, schema } from '../../../../lib/db';
import { desc } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const users = await db
      .select({
        id: schema.usuariosAuth.id,
        nome: schema.usuariosAuth.nome,
        email: schema.usuariosAuth.email,
        whatsapp: schema.usuariosAuth.whatsapp,
        role: schema.usuariosAuth.role,
        permissoes: schema.usuariosAuth.permissoes,
        ativo: schema.usuariosAuth.ativo,
        ultimo_login: schema.usuariosAuth.ultimo_login,
        created_at: schema.usuariosAuth.created_at,
      })
      .from(schema.usuariosAuth)
      .orderBy(desc(schema.usuariosAuth.created_at));

    const formatted = users.map((u) => {
      let perms: string[] = [];
      try {
        perms = JSON.parse(u.permissoes);
      } catch {
        perms = ['CHAT'];
      }
      return { ...u, permissoes: perms };
    });

    return NextResponse.json({ usuarios: formatted });
  } catch (error) {
    return NextResponse.json({ error: 'Falha ao buscar usuários' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nome, email, senha, whatsapp, role = 'OPERADOR', permissoes = ['CHAT'] } = body || {};

    if (!nome || !email || !senha) {
      return NextResponse.json({ error: 'Nome, e-mail e senha são obrigatórios' }, { status: 400 });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senha, salt);

    const [novoUsuario] = await db
      .insert(schema.usuariosAuth)
      .values({
        nome: String(nome).trim(),
        email: cleanEmail,
        whatsapp: whatsapp ? String(whatsapp).replace(/\D/g, '') : null,
        senha_hash: senhaHash,
        role: role as any,
        permissoes: JSON.stringify(permissoes),
        ativo: 'SIM',
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        usuario: {
          id: novoUsuario.id,
          nome: novoUsuario.nome,
          email: novoUsuario.email,
          role: novoUsuario.role,
          permissoes,
          ativo: novoUsuario.ativo,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: 'Falha ao cadastrar usuário', detail: error?.message }, { status: 500 });
  }
}
