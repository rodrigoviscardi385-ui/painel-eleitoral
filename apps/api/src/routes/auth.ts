import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'painel_eleitoral_2026_super_secret_jwt_key';

export async function authRoutes(app: FastifyInstance) {
  // Registro de Novo Usuário (Acesso Público na Página de Login)
  app.post('/api/auth/register', async (request, reply) => {
    const { nome, email, senha, whatsapp, cargo_desejado } = request.body as any;

    if (!nome || !email || !senha) {
      return reply.status(400).send({ error: 'Nome, e-mail e senha são obrigatórios.' });
    }

    if (String(senha).length < 6) {
      return reply.status(400).send({ error: 'A senha deve conter no mínimo 6 caracteres.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await db
      .select()
      .from(schema.usuariosAuth)
      .where(eq(schema.usuariosAuth.email, cleanEmail))
      .limit(1)
      .then((r) => r[0]);

    if (existing) {
      return reply.status(409).send({ error: 'Este e-mail já está cadastrado no sistema.' });
    }

    // Novos usuários criados pela tela de cadastro recebem perfil OPERADOR por padrão
    const role = 'OPERADOR';
    const permissoes = ['CHAT', 'LIDERANCAS'];

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(senha, salt);

    const [newUser] = await db
      .insert(schema.usuariosAuth)
      .values({
        nome: nome.trim(),
        email: cleanEmail,
        senha_hash: hash,
        whatsapp: whatsapp ? whatsapp.replace(/\D/g, '') : null,
        role,
        permissoes: JSON.stringify(permissoes),
        ativo: 'SIM',
      })
      .returning();

    const token = jwt.sign(
      {
        id: newUser.id,
        nome: newUser.nome,
        email: newUser.email,
        role: newUser.role,
        permissoes,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      success: true,
      message: 'Usuário cadastrado com sucesso!',
      token,
      user: {
        id: newUser.id,
        nome: newUser.nome,
        email: newUser.email,
        role: newUser.role,
        permissoes,
      },
    };
  });

  // Login do Painel Administrativo
  app.post('/api/auth/login', async (request, reply) => {
    const { email, senha } = request.body as any;

    if (!email || !senha) {
      return reply.status(400).send({ error: 'E-mail e senha são obrigatórios.' });
    }

    const inputIdentifier = email.trim().toLowerCase();
    const user = await db
      .select()
      .from(schema.usuariosAuth)
      .where(sql`LOWER(${schema.usuariosAuth.email}) = ${inputIdentifier} OR LOWER(${schema.usuariosAuth.nome}) = ${inputIdentifier}`)
      .limit(1)
      .then((r) => r[0]);

    if (!user || user.ativo !== 'SIM') {
      return reply.status(401).send({ error: 'Credenciais inválidas ou usuário inativo.' });
    }

    const isValidPassword = await bcrypt.compare(senha, user.senha_hash);
    if (!isValidPassword) {
      return reply.status(401).send({ error: 'Credenciais inválidas.' });
    }

    // Atualiza último login
    await db
      .update(schema.usuariosAuth)
      .set({ ultimo_login: new Date() })
      .where(eq(schema.usuariosAuth.id, user.id));

    const token = jwt.sign(
      {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
        permissoes: JSON.parse(user.permissoes || '[]'),
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
        permissoes: JSON.parse(user.permissoes || '[]'),
      },
    };
  });

  // Validação de Sessão Atual
  app.get('/api/auth/me', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Token não fornecido.' });
    }

    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET) as any;

      const user = await db
        .select()
        .from(schema.usuariosAuth)
        .where(eq(schema.usuariosAuth.id, decoded.id))
        .then((r) => r[0]);

      if (!user || user.ativo !== 'SIM') {
        return reply.status(401).send({ error: 'Usuário não encontrado ou inativo.' });
      }

      return {
        user: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          role: user.role,
          permissoes: JSON.parse(user.permissoes || '[]'),
        },
      };
    } catch (err) {
      return reply.status(401).send({ error: 'Token inválido ou expirado.' });
    }
  });

  // Lista todos os usuários administrativos com acesso RBAC
  app.get('/api/auth/usuarios', async () => {
    const users = await db.select().from(schema.usuariosAuth);
    return users.map((u) => ({
      id: u.id,
      nome: u.nome,
      email: u.email,
      whatsapp: u.whatsapp,
      role: u.role,
      permissoes: JSON.parse(u.permissoes || '[]'),
      ativo: u.ativo,
      ultimo_login: u.ultimo_login,
      created_at: u.created_at,
    }));
  });

  // Criação de novo operador, coordenador ou gestor
  app.post('/api/auth/usuarios', async (request, reply) => {
    const { nome, email, senha, whatsapp, role = 'OPERADOR', permissoes = ['CHAT'] } = request.body as any;

    if (!nome || !email || !senha) {
      return reply.status(400).send({ error: 'Nome, e-mail e senha são obrigatórios.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await db
      .select()
      .from(schema.usuariosAuth)
      .where(eq(schema.usuariosAuth.email, cleanEmail))
      .limit(1)
      .then((r) => r[0]);

    if (existing) {
      return reply.status(409).send({ error: 'Este e-mail já está cadastrado.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(senha, salt);

    const [newUser] = await db
      .insert(schema.usuariosAuth)
      .values({
        nome: nome.trim(),
        email: cleanEmail,
        senha_hash: hash,
        whatsapp: whatsapp ? whatsapp.replace(/\D/g, '') : null,
        role,
        permissoes: JSON.stringify(Array.isArray(permissoes) ? permissoes : [permissoes]),
        ativo: 'SIM',
      })
      .returning();

    return {
      id: newUser.id,
      nome: newUser.nome,
      email: newUser.email,
      role: newUser.role,
      permissoes: JSON.parse(newUser.permissoes),
      ativo: newUser.ativo,
    };
  });

  // Atualização de usuário
  app.put('/api/auth/usuarios/:id', async (request, reply) => {
    const { id } = request.params as any;
    const { nome, email, senha, whatsapp, role, permissoes, ativo } = request.body as any;

    const existing = await db
      .select()
      .from(schema.usuariosAuth)
      .where(eq(schema.usuariosAuth.id, id))
      .limit(1)
      .then((r) => r[0]);

    if (!existing) {
      return reply.status(404).send({ error: 'Usuário não encontrado.' });
    }

    const updateData: any = {
      updated_at: new Date(),
    };

    if (nome) updateData.nome = nome.trim();
    if (email) updateData.email = email.trim().toLowerCase();
    if (whatsapp !== undefined) updateData.whatsapp = whatsapp ? whatsapp.replace(/\D/g, '') : null;
    if (role) updateData.role = role;
    if (permissoes) updateData.permissoes = JSON.stringify(Array.isArray(permissoes) ? permissoes : [permissoes]);
    if (ativo) updateData.ativo = ativo;
    if (senha && senha.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      updateData.senha_hash = await bcrypt.hash(senha.trim(), salt);
    }

    await db.update(schema.usuariosAuth).set(updateData).where(eq(schema.usuariosAuth.id, id));

    const updated = await db
      .select()
      .from(schema.usuariosAuth)
      .where(eq(schema.usuariosAuth.id, id))
      .limit(1)
      .then((r) => r[0]);

    return {
      id: updated.id,
      nome: updated.nome,
      email: updated.email,
      whatsapp: updated.whatsapp,
      role: updated.role,
      permissoes: JSON.parse(updated.permissoes || '[]'),
      ativo: updated.ativo,
    };
  });

  // Exclusão de usuário
  app.delete('/api/auth/usuarios/:id', async (request, reply) => {
    const { id } = request.params as any;

    const existing = await db
      .select()
      .from(schema.usuariosAuth)
      .where(eq(schema.usuariosAuth.id, id))
      .limit(1)
      .then((r) => r[0]);

    if (!existing) {
      return reply.status(404).send({ error: 'Usuário não encontrado.' });
    }

    await db.delete(schema.usuariosAuth).where(eq(schema.usuariosAuth.id, id));
    return { success: true, message: 'Usuário removido com sucesso.' };
  });
}
