import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'painel_eleitoral_jwt_secret_campanha_2026_super_key';

export interface TokenPayload {
  id: string;
  nome: string;
  email: string;
  role: 'ADMIN' | 'COORDENADOR' | 'OPERADOR' | 'LIDER';
  permissoes: string[];
}

export function verifyJwt(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (err) {
    return null;
  }
}

export async function authRoutes(fastify: FastifyInstance) {
  // Inicialização: Se não houver nenhum admin no banco, criar o Super Admin padrão
  try {
    const [existingAdmin] = await db
      .select()
      .from(schema.usuariosAuth)
      .where(eq(schema.usuariosAuth.email, 'admin@painel.com'))
      .limit(1);

    if (!existingAdmin) {
      const salt = await bcrypt.genSalt(10);
      const defaultHash = await bcrypt.hash('admin123', salt);

      await db.insert(schema.usuariosAuth).values({
        nome: 'Super Administrador',
        email: 'admin@painel.com',
        senha_hash: defaultHash,
        role: 'ADMIN',
        permissoes: JSON.stringify(['COCKPIT', 'ARVORE', 'DISPAROS', 'CHAT', 'LGPD', 'USUARIOS', 'METAS']),
        ativo: 'SIM',
      });
      console.log('✓ Super Admin padrão criado: admin@painel.com / admin123');
    }
  } catch (err) {
    console.warn('Aviso ao verificar admin inicial:', err);
  }

  /**
   * POST /api/auth/login
   */
  fastify.post('/api/auth/login', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body: any = request.body || {};
      const { email, senha } = body;

      if (!email || !senha) {
        return reply.status(400).send({ error: 'Informe e-mail e senha' });
      }

      const cleanEmail = String(email).trim().toLowerCase();

      const [user] = await db
        .select()
        .from(schema.usuariosAuth)
        .where(eq(schema.usuariosAuth.email, cleanEmail))
        .limit(1);

      if (!user) {
        return reply.status(401).send({ error: 'Credenciais inválidas' });
      }

      if (user.ativo === 'NAO') {
        return reply.status(403).send({ error: 'Usuário desativado pelo administrador' });
      }

      const isValid = await bcrypt.compare(senha, user.senha_hash);
      if (!isValid) {
        return reply.status(401).send({ error: 'Credenciais inválidas' });
      }

      let permissoes: string[] = [];
      try {
        permissoes = JSON.parse(user.permissoes);
      } catch {
        permissoes = ['CHAT'];
      }

      const tokenPayload: TokenPayload = {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role as any,
        permissoes,
      };

      const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

      // Atualizar timestamp de último login
      await db
        .update(schema.usuariosAuth)
        .set({ ultimo_login: new Date() })
        .where(eq(schema.usuariosAuth.id, user.id))
        .catch(() => {});

      return reply.send({
        success: true,
        token,
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
      console.error('Erro no login:', error);
      return reply.status(500).send({ error: 'Falha interna no processo de autenticação' });
    }
  });

  /**
   * GET /api/auth/me
   */
  fastify.get('/api/auth/me', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authHeader = request.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

      if (!token) {
        return reply.status(401).send({ error: 'Token não fornecido' });
      }

      const payload = verifyJwt(token);
      if (!payload) {
        return reply.status(401).send({ error: 'Token expirado ou inválido' });
      }

      const [user] = await db
        .select()
        .from(schema.usuariosAuth)
        .where(eq(schema.usuariosAuth.id, payload.id))
        .limit(1);

      if (!user || user.ativo === 'NAO') {
        return reply.status(401).send({ error: 'Usuário não encontrado ou inativo' });
      }

      let permissoes: string[] = [];
      try {
        permissoes = JSON.parse(user.permissoes);
      } catch {
        permissoes = ['CHAT'];
      }

      return reply.send({
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
      return reply.status(401).send({ error: 'Sessão inválida' });
    }
  });

  /**
   * GET /api/auth/usuarios (Listar usuários do sistema)
   */
  fastify.get('/api/auth/usuarios', async (request: FastifyRequest, reply: FastifyReply) => {
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

      return reply.send({ usuarios: formatted });
    } catch (error) {
      console.error('Erro ao listar usuários auth:', error);
      return reply.status(500).send({ error: 'Falha ao buscar usuários do sistema' });
    }
  });

  /**
   * POST /api/auth/usuarios (Cadastrar novo login com permissões)
   */
  fastify.post('/api/auth/usuarios', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body: any = request.body || {};
      const { nome, email, senha, whatsapp, role = 'OPERADOR', permissoes = ['CHAT'] } = body;

      if (!nome || !email || !senha) {
        return reply.status(400).send({ error: 'Nome, e-mail e senha são obrigatórios' });
      }

      const cleanEmail = String(email).trim().toLowerCase();

      // Verificar se email já existe
      const [existing] = await db
        .select()
        .from(schema.usuariosAuth)
        .where(eq(schema.usuariosAuth.email, cleanEmail))
        .limit(1);

      if (existing) {
        return reply.status(400).send({ error: 'Já existe um usuário cadastrado com este e-mail' });
      }

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

      return reply.status(201).send({
        success: true,
        usuario: {
          id: novoUsuario.id,
          nome: novoUsuario.nome,
          email: novoUsuario.email,
          role: novoUsuario.role,
          permissoes,
          ativo: novoUsuario.ativo,
        },
      });
    } catch (error) {
      console.error('Erro ao cadastrar usuário auth:', error);
      return reply.status(500).send({ error: 'Falha ao cadastrar usuário' });
    }
  });

  /**
   * PUT /api/auth/usuarios/:id (Atualizar dados, permissões e status)
   */
  fastify.put('/api/auth/usuarios/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const body: any = request.body || {};

      const updateData: any = {
        updated_at: new Date(),
      };

      if (body.nome) updateData.nome = String(body.nome).trim();
      if (body.role) updateData.role = body.role;
      if (body.ativo !== undefined) updateData.ativo = body.ativo;
      if (body.permissoes !== undefined) updateData.permissoes = JSON.stringify(body.permissoes);
      if (body.whatsapp !== undefined) updateData.whatsapp = String(body.whatsapp).replace(/\D/g, '');

      if (body.senha && String(body.senha).length >= 4) {
        const salt = await bcrypt.genSalt(10);
        updateData.senha_hash = await bcrypt.hash(body.senha, salt);
      }

      const [updated] = await db
        .update(schema.usuariosAuth)
        .set(updateData)
        .where(eq(schema.usuariosAuth.id, id))
        .returning();

      return reply.send({ success: true, usuario: updated });
    } catch (error) {
      console.error('Erro ao atualizar usuário auth:', error);
      return reply.status(500).send({ error: 'Falha ao atualizar usuário' });
    }
  });

  /**
   * DELETE /api/auth/usuarios/:id (Remover usuário)
   */
  fastify.delete('/api/auth/usuarios/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      await db.delete(schema.usuariosAuth).where(eq(schema.usuariosAuth.id, id));
      return reply.send({ success: true, message: 'Usuário removido com sucesso' });
    } catch (error) {
      console.error('Erro ao remover usuário auth:', error);
      return reply.status(500).send({ error: 'Falha ao remover usuário' });
    }
  });
}
