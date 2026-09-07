import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db, resetDatabaseToCleanSlate } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, desc, sql, and } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { generateExecutiveReportStream } from '../services/pdfService.js';
import fs from 'fs';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'painel_eleitoral_2026_super_secret_jwt_key';

function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.status(401).send({ error: 'Acesso negado. Token de autenticação não fornecido.' });
    return false;
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.role !== 'ADMIN') {
      reply.status(403).send({ error: 'Apenas o Administrador Geral tem permissão para gerenciar candidatos.' });
      return false;
    }
    return true;
  } catch (_) {
    reply.status(401).send({ error: 'Token inválido ou expirado.' });
    return false;
  }
}

export async function campanhaRoutes(app: FastifyInstance) {
  // Retorna configurações do candidato ativo e biografia da IA
  app.get('/api/campanha/config', async () => {
    // Busca candidato com flag ativo = true, ou fallback para o primeiro
    let config = await db
      .select()
      .from(schema.campanhaConfig)
      .where(eq(schema.campanhaConfig.ativo, true))
      .limit(1)
      .then((r) => r[0]);

    if (!config) {
      config = await db.select().from(schema.campanhaConfig).limit(1).then((r) => r[0]);
    }

    return config || {};
  });

  // Lista todos os candidatos cadastrados no sistema (Multi-Candidato ADM)
  app.get('/api/campanha/candidatos', async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const candidatos = await db
      .select()
      .from(schema.campanhaConfig)
      .orderBy(desc(schema.campanhaConfig.ativo), desc(schema.campanhaConfig.updated_at));
    return candidatos;
  });

  // Criação de um novo candidato no sistema
  app.post('/api/campanha/candidatos', async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const body = request.body as any;
    const {
      nome_urna,
      nome_completo,
      numero_candidato,
      cargo,
      partido,
      coligacao,
      slogan,
      foto_url,
      cor_primaria = '#10b981',
      cidade = 'Santos',
      estado = 'SP',
      data_eleicao = '2026-10-04',
      cnpj_campanha,
      biografia_ia,
      propostas_ia,
      tornar_ativo = false,
    } = body;

    if (!nome_urna || !numero_candidato || !cargo || !partido) {
      return reply.status(400).send({
        error: 'Nome na urna, número, cargo e partido são obrigatórios para cadastrar o candidato.',
      });
    }

    // Se solicitado para ser ativo ou se for o primeiro candidato
    const totalExistentes = await db
      .select({ count: sql`count(*)` })
      .from(schema.campanhaConfig)
      .then((r) => Number(r[0]?.count || 0));

    const deveSerAtivo = tornar_ativo || totalExistentes === 0;

    if (deveSerAtivo) {
      await db.update(schema.campanhaConfig).set({ ativo: false });
    }

    const [novoCandidato] = await db
      .insert(schema.campanhaConfig)
      .values({
        nome_urna: nome_urna.trim(),
        nome_completo: nome_completo ? nome_completo.trim() : nome_urna.trim(),
        numero_candidato: String(numero_candidato).trim(),
        cargo: cargo.trim(),
        partido: partido.trim().toUpperCase(),
        coligacao: coligacao ? coligacao.trim() : `Coligação ${partido.trim().toUpperCase()}`,
        slogan: slogan ? slogan.trim() : 'Trabalho e compromisso com o povo',
        foto_url: foto_url || null,
        cor_primaria: cor_primaria || '#10b981',
        cidade: cidade || 'Santos',
        estado: estado || 'SP',
        data_eleicao: data_eleicao || '2026-10-04',
        cnpj_campanha: cnpj_campanha || null,
        biografia_ia: biografia_ia || `Candidato oficial ao cargo de ${cargo} pelo partido ${partido}.`,
        propostas_ia: propostas_ia || 'Propostas voltadas ao desenvolvimento regional, saúde e educação.',
        ativo: deveSerAtivo,
      })
      .returning();

    return {
      success: true,
      message: `Candidato "${novoCandidato.nome_urna}" cadastrado com sucesso!`,
      candidato: novoCandidato,
    };
  });

  // Atualiza dados de um candidato específico
  app.put('/api/campanha/candidatos/:id', async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const { id } = request.params as any;
    const body = request.body as any;

    const existing = await db
      .select()
      .from(schema.campanhaConfig)
      .where(eq(schema.campanhaConfig.id, id))
      .limit(1)
      .then((r) => r[0]);

    if (!existing) {
      return reply.status(404).send({ error: 'Candidato não encontrado.' });
    }

    await db
      .update(schema.campanhaConfig)
      .set({
        ...body,
        updated_at: new Date(),
      })
      .where(eq(schema.campanhaConfig.id, id));

    const updated = await db
      .select()
      .from(schema.campanhaConfig)
      .where(eq(schema.campanhaConfig.id, id))
      .limit(1)
      .then((r) => r[0]);

    return {
      success: true,
      message: 'Dados do candidato atualizados com sucesso!',
      candidato: updated,
    };
  });

  // Ativa um candidato como o titular oficial da campanha no painel
  app.post('/api/campanha/candidatos/:id/ativar', async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const { id } = request.params as any;

    const candidate = await db
      .select()
      .from(schema.campanhaConfig)
      .where(eq(schema.campanhaConfig.id, id))
      .limit(1)
      .then((r) => r[0]);

    if (!candidate) {
      return reply.status(404).send({ error: 'Candidato não encontrado.' });
    }

    // 1. Desativa todos os candidatos
    await db.update(schema.campanhaConfig).set({ ativo: false });

    // 2. Ativa o candidato selecionado
    await db.update(schema.campanhaConfig).set({ ativo: true, updated_at: new Date() }).where(eq(schema.campanhaConfig.id, id));

    const activated = await db
      .select()
      .from(schema.campanhaConfig)
      .where(eq(schema.campanhaConfig.id, id))
      .limit(1)
      .then((r) => r[0]);

    return {
      success: true,
      message: `Candidato "${activated.nome_urna}" ativado como titular da campanha!`,
      candidato: activated,
    };
  });

  // Exclusão de candidato
  app.delete('/api/campanha/candidatos/:id', async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const { id } = request.params as any;

    const totalCandidatos = await db
      .select({ count: sql`count(*)` })
      .from(schema.campanhaConfig)
      .then((r) => Number(r[0]?.count || 0));

    if (totalCandidatos <= 1) {
      return reply.status(400).send({ error: 'Não é possível excluir o único candidato cadastrado no sistema.' });
    }

    const candidate = await db
      .select()
      .from(schema.campanhaConfig)
      .where(eq(schema.campanhaConfig.id, id))
      .limit(1)
      .then((r) => r[0]);

    if (!candidate) {
      return reply.status(404).send({ error: 'Candidato não encontrado.' });
    }

    await db.delete(schema.campanhaConfig).where(eq(schema.campanhaConfig.id, id));

    // Se o candidato excluído era o ativo, ativa o próximo disponível
    if (candidate.ativo) {
      const proximo = await db.select().from(schema.campanhaConfig).limit(1).then((r) => r[0]);
      if (proximo) {
        await db.update(schema.campanhaConfig).set({ ativo: true }).where(eq(schema.campanhaConfig.id, proximo.id));
      }
    }

    return { success: true, message: `Candidato "${candidate.nome_urna}" excluído com sucesso.` };
  });

  // Atualiza dados e propostas do candidato ativo (compatibilidade)
  app.put('/api/campanha/config', async (request, reply) => {
    const body = request.body as any;
    let existing = await db
      .select()
      .from(schema.campanhaConfig)
      .where(eq(schema.campanhaConfig.ativo, true))
      .limit(1)
      .then((r) => r[0]);

    if (!existing) {
      existing = await db.select().from(schema.campanhaConfig).limit(1).then((r) => r[0]);
    }

    if (!existing) {
      return reply.status(404).send({ error: 'Configuração da campanha não encontrada.' });
    }

    await db
      .update(schema.campanhaConfig)
      .set({
        ...body,
        updated_at: new Date(),
      })
      .where(eq(schema.campanhaConfig.id, existing.id));

    const updated = await db
      .select()
      .from(schema.campanhaConfig)
      .where(eq(schema.campanhaConfig.id, existing.id))
      .limit(1)
      .then((r) => r[0]);

    return updated;
  });

  // Download do Relatório Executivo Estratégico em PDF (Streaming de baixa memória)
  app.get('/api/campanha/relatorio-pdf', async (request, reply) => {
    try {
      const pdfStream = await generateExecutiveReportStream();
      reply.header('Content-Type', 'application/pdf');
      reply.header(
        'Content-Disposition',
        `attachment; filename="relatorio_executivo_campanha_${Date.now()}.pdf"`
      );
      return reply.send(pdfStream);
    } catch (err: any) {
      console.error('[PDF Stream Route Error]', err);
      return reply.status(500).send({ error: 'Falha ao gerar relatório PDF.' });
    }
  });

  // Lista campanhas de disparo em massa
  app.get('/api/campanha/disparos', async () => {
    const disparos = await db
      .select()
      .from(schema.disparosCampanha)
      .orderBy(desc(schema.disparosCampanha.created_at));
    return disparos;
  });

  // Criação e agendamento de um novo disparo em massa
  app.post('/api/campanha/disparos', async (request, reply) => {
    const { titulo, mensagem_template, filtro_tipo = 'TODOS', filtro_valor } = request.body as any;

    if (!titulo || !mensagem_template) {
      return reply.status(400).send({ error: 'Título e template de mensagem são obrigatórios.' });
    }

    // 1. Seleciona os destinatários elegíveis com base no filtro
    const conditions = [eq(schema.usuarios.opt_out, false)];

    if (filtro_tipo === 'BAIRRO' && filtro_valor) {
      conditions.push(eq(schema.usuarios.bairro, String(filtro_valor).trim()));
    } else if (filtro_tipo === 'ZONA' && filtro_valor) {
      conditions.push(eq(schema.usuarios.zona_eleitoral, String(filtro_valor).trim()));
    } else if (filtro_tipo === 'LIDER' || filtro_tipo === 'LIDERES') {
      conditions.push(sql`${schema.usuarios.cargo} IN ('LIDER', 'GESTOR')`);
    }

    const targetUsers = await db
      .select()
      .from(schema.usuarios)
      .where(and(...conditions));

    if (targetUsers.length === 0) {
      return reply.status(400).send({
        error: `Nenhum eleitor elegível encontrado para o filtro selecionado (${filtro_tipo}: ${filtro_valor || 'Todos'}).`,
      });
    }

    // 2. Cria a campanha
    const [novaCampanha] = await db
      .insert(schema.disparosCampanha)
      .values({
        titulo,
        mensagem_template,
        filtro_tipo,
        filtro_valor: filtro_valor || null,
        total_alvos: targetUsers.length,
        total_enviados: 0,
        total_erros: 0,
        status: 'EM_ANDAMENTO',
      })
      .returning();

    // 3. Insere os itens na fila individualmente
    const itemsToInsert = targetUsers.map((u) => ({
      disparo_id: novaCampanha.id,
      usuario_id: u.id,
      whatsapp_destino: u.whatsapp,
      status: 'PENDENTE' as const,
    }));

    // Inserção em lotes de 200
    const chunkSize = 200;
    for (let i = 0; i < itemsToInsert.length; i += chunkSize) {
      const chunk = itemsToInsert.slice(i, i + chunkSize);
      await db.insert(schema.disparosItens).values(chunk);
    }

    return {
      success: true,
      campanha: novaCampanha,
      total_alvos: targetUsers.length,
      message: `Disparo agendado! ${targetUsers.length} contatos foram colocados na fila anti-ban.`,
    };
  });

  // ─── Upload de Arquivo / Foto do Dispositivo (Base64) ─────────────────────
  app.post('/api/upload', async (request, reply) => {
    const body = request.body as any;
    const { base64, filename = 'foto.jpg', tipo = 'foto' } = body || {};

    if (!base64) {
      return reply.status(400).send({ error: 'Nenhum arquivo enviado.' });
    }

    try {
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Extrai os dados binários do base64 (suporta data:image/png;base64,... ou raw base64)
      const matches = base64.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
      let buffer: Buffer;
      let extension = 'jpg';

      if (matches && matches.length === 3) {
        const mimeType = matches[1];
        if (mimeType.includes('png')) extension = 'png';
        else if (mimeType.includes('webp')) extension = 'webp';
        else if (mimeType.includes('gif')) extension = 'gif';
        else if (mimeType.includes('pdf')) extension = 'pdf';
        buffer = Buffer.from(matches[2], 'base64');
      } else {
        buffer = Buffer.from(base64, 'base64');
      }

      const cleanFilename = `${tipo}_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
      const fullPath = path.join(uploadsDir, cleanFilename);

      fs.writeFileSync(fullPath, buffer);

      const fileUrl = `/api/uploads/${cleanFilename}`;
      return {
        success: true,
        url: fileUrl,
        filename: cleanFilename,
      };
    } catch (err: any) {
      return reply.status(500).send({ error: `Falha ao salvar arquivo: ${err.message}` });
    }
  });

  // ─── Servir Arquivos de Uploads ───────────────────────────────────────────
  app.get('/api/uploads/:filename', async (request, reply) => {
    const { filename } = request.params as { filename: string };
    const safeFilename = path.basename(filename);
    const filePath = path.join(process.cwd(), 'uploads', safeFilename);

    if (!fs.existsSync(filePath)) {
      return reply.status(404).send({ error: 'Arquivo não encontrado.' });
    }

    const ext = path.extname(safeFilename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    const buffer = fs.readFileSync(filePath);
    return reply.type(contentType).send(buffer);
  });

  // ─── Reset Administrativo Seguro de Dados de Teste (Zero-Data Protocol) ───
  app.post('/api/campanha/reset-dados-teste', async (request, reply) => {
    if (!requireAdmin(request, reply)) return;

    try {
      const counts = await resetDatabaseToCleanSlate();
      return {
        success: true,
        message: 'Protocolo Zero-Data executado com sucesso. Banco de dados limpo para produção.',
        timestamp: new Date().toISOString(),
        relatorio_integridade: counts,
      };
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: `Falha ao executar reset do banco de dados: ${err.message}`,
      });
    }
  });
}
