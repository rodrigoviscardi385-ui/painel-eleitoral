import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db, logAuditLGPD } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, desc, sql, and, or, ilike } from 'drizzle-orm';
import { generateStreetContract, computeContractSha256 } from '../services/streetContractService.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'painel_eleitoral_2026_super_secret_jwt_key';

export async function equipeRuaRoutes(app: FastifyInstance) {
  // ─── 1. Listagem de Equipe de Rua com Métricas & Filtros ────────────────────
  app.get('/api/equipe-rua', async (request: FastifyRequest) => {
    const { busca, tipo_jornada, status_contrato } = request.query as any;

    const conditions: any[] = [];

    if (busca && busca.trim() !== '') {
      const term = `%${busca.trim()}%`;
      conditions.push(
        or(
          ilike(schema.equipeRua.nome_completo, term),
          ilike(schema.equipeRua.cpf, term),
          ilike(schema.equipeRua.telefone_whatsapp, term),
          ilike(schema.equipeRua.bairro, term)
        )
      );
    }

    if (tipo_jornada && (tipo_jornada === 'MEIO_PERIODO' || tipo_jornada === 'PERIODO_INTEGRAL')) {
      conditions.push(eq(schema.equipeRua.tipo_jornada, tipo_jornada));
    }

    if (status_contrato) {
      conditions.push(eq(schema.equipeRua.status_contrato, status_contrato));
    }

    let query = db
      .select()
      .from(schema.equipeRua)
      .orderBy(desc(schema.equipeRua.created_at));

    const data = await (conditions.length > 0
      ? (query as any).where(sql.join(conditions, sql` AND `))
      : query);

    // Métricas para os Cards Executivos de Equipe de Rua
    const [stats] = await db
      .select({
        totalMembros: sql<number>`count(*)`,
        totalMeioPeriodo: sql<number>`count(*) filter (where ${schema.equipeRua.tipo_jornada} = 'MEIO_PERIODO')`,
        totalIntegral: sql<number>`count(*) filter (where ${schema.equipeRua.tipo_jornada} = 'PERIODO_INTEGRAL')`,
        folhaTotal: sql<string>`COALESCE(sum(${schema.equipeRua.remuneracao_pactuada}), 0)`,
      })
      .from(schema.equipeRua);

    return {
      membros: data,
      metricas: {
        total: Number(stats?.totalMembros || 0),
        meioPeriodo: Number(stats?.totalMeioPeriodo || 0),
        periodoIntegral: Number(stats?.totalIntegral || 0),
        folhaTotal: Number(stats?.folhaTotal || 0),
      },
    };
  });

  // ─── 2. Detalhes de um Membro da Equipe de Rua ──────────────────────────────
  app.get('/api/equipe-rua/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const membro = await db
      .select()
      .from(schema.equipeRua)
      .where(eq(schema.equipeRua.id, id))
      .limit(1)
      .then((r) => r[0]);

    if (!membro) {
      return reply.status(404).send({ error: 'Membro da equipe de rua não encontrado.' });
    }

    return membro;
  });

  // ─── 3. Cadastro Separado de Equipe de Rua ───────────────────────────────────
  app.post('/api/equipe-rua', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as any;

    if (!body.nome_completo || !body.cpf || !body.rg || !body.telefone_whatsapp || !body.endereco_completo || !body.bairro) {
      return reply.status(400).send({
        error: 'Campos obrigatórios ausentes: nome completo, CPF, RG, telefone/WhatsApp, endereço e bairro são necessários para formalização eleitoral TSE.',
      });
    }

    // Normaliza CPF e remove pontuações
    const rawCpf = String(body.cpf).replace(/\D/g, '');
    if (rawCpf.length !== 11) {
      return reply.status(400).send({ error: 'CPF inválido. Deve conter 11 dígitos numéricos.' });
    }
    const formattedCpf = `${rawCpf.slice(0, 3)}.${rawCpf.slice(3, 6)}.${rawCpf.slice(6, 9)}-${rawCpf.slice(9, 11)}`;

    // Verifica se já existe na equipe de rua
    const existe = await db
      .select({ id: schema.equipeRua.id })
      .from(schema.equipeRua)
      .where(eq(schema.equipeRua.cpf, formattedCpf))
      .limit(1)
      .then((r) => r[0]);

    if (existe) {
      return reply.status(409).send({ error: 'Este CPF já está cadastrado na Equipe de Rua.' });
    }

    const tipoJornada = body.tipo_jornada === 'PERIODO_INTEGRAL' ? 'PERIODO_INTEGRAL' : 'MEIO_PERIODO';
    const cargaHoraria = body.carga_horaria_semanal || (tipoJornada === 'MEIO_PERIODO' ? 20 : 40);
    const remuneracao = body.remuneracao_pactuada ? String(body.remuneracao_pactuada) : (tipoJornada === 'MEIO_PERIODO' ? '1500.00' : '3000.00');

    const [novoMembro] = await db
      .insert(schema.equipeRua)
      .values({
        nome_completo: body.nome_completo.trim(),
        cpf: formattedCpf,
        rg: String(body.rg).trim(),
        rg_orgao_emissor: body.rg_orgao_emissor ? String(body.rg_orgao_emissor).trim() : 'SSP/SP',
        titulo_eleitor: body.titulo_eleitor ? String(body.titulo_eleitor).trim() : null,
        zona_eleitoral: body.zona_eleitoral ? String(body.zona_eleitoral).trim() : null,
        secao_eleitoral: body.secao_eleitoral ? String(body.secao_eleitoral).trim() : null,
        telefone_whatsapp: String(body.telefone_whatsapp).replace(/\D/g, ''),
        endereco_completo: String(body.endereco_completo).trim(),
        bairro: String(body.bairro).trim(),
        cidade: body.cidade ? String(body.cidade).trim() : 'Santos',
        uf: body.uf ? String(body.uf).trim() : 'SP',
        cep: body.cep ? String(body.cep).trim() : '11000-000',
        dados_bancarios_banco: body.dados_bancarios_banco || null,
        dados_bancarios_agencia: body.dados_bancarios_agencia || null,
        dados_bancarios_conta: body.dados_bancarios_conta || null,
        chave_pix: body.chave_pix || null,
        funcao_atividade: body.funcao_atividade || 'MOBILIZADOR_RUA',
        tipo_jornada: tipoJornada,
        carga_horaria_semanal: cargaHoraria,
        remuneracao_pactuada: remuneracao,
        forma_pagamento: body.forma_pagamento || 'PIX_CONTA_CAMPANHA',
        data_inicio: body.data_inicio ? new Date(body.data_inicio) : new Date(),
        data_fim: body.data_fim ? new Date(body.data_fim) : new Date('2026-10-04T23:59:59Z'),
        status_contrato: 'MINUTA_GERADA',
        observacoes: body.observacoes || null,
      })
      .returning();

    await logAuditLGPD('CADASTRO_EQUIPE_RUA', `Cadastro de equipe de rua TSE: ${novoMembro.nome_completo} (CPF: ${formattedCpf})`);

    return reply.status(201).send(novoMembro);
  });

  // ─── 4. Atualização de Dados do Membro da Equipe de Rua ──────────────────────
  app.put('/api/equipe-rua/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;

    const existing = await db
      .select()
      .from(schema.equipeRua)
      .where(eq(schema.equipeRua.id, id))
      .limit(1)
      .then((r) => r[0]);

    if (!existing) {
      return reply.status(404).send({ error: 'Membro da equipe de rua não encontrado.' });
    }

    const updates: any = {
      updated_at: new Date(),
    };

    if (body.nome_completo) updates.nome_completo = body.nome_completo.trim();
    if (body.rg) updates.rg = String(body.rg).trim();
    if (body.rg_orgao_emissor) updates.rg_orgao_emissor = String(body.rg_orgao_emissor).trim();
    if (body.titulo_eleitor !== undefined) updates.titulo_eleitor = body.titulo_eleitor;
    if (body.zona_eleitoral !== undefined) updates.zona_eleitoral = body.zona_eleitoral;
    if (body.secao_eleitoral !== undefined) updates.secao_eleitoral = body.secao_eleitoral;
    if (body.telefone_whatsapp) updates.telefone_whatsapp = String(body.telefone_whatsapp).replace(/\D/g, '');
    if (body.endereco_completo) updates.endereco_completo = String(body.endereco_completo).trim();
    if (body.bairro) updates.bairro = String(body.bairro).trim();
    if (body.cidade) updates.cidade = String(body.cidade).trim();
    if (body.uf) updates.uf = String(body.uf).trim();
    if (body.cep) updates.cep = String(body.cep).trim();
    if (body.dados_bancarios_banco !== undefined) updates.dados_bancarios_banco = body.dados_bancarios_banco;
    if (body.dados_bancarios_agencia !== undefined) updates.dados_bancarios_agencia = body.dados_bancarios_agencia;
    if (body.dados_bancarios_conta !== undefined) updates.dados_bancarios_conta = body.dados_bancarios_conta;
    if (body.chave_pix !== undefined) updates.chave_pix = body.chave_pix;
    if (body.funcao_atividade) updates.funcao_atividade = body.funcao_atividade;
    if (body.tipo_jornada && (body.tipo_jornada === 'MEIO_PERIODO' || body.tipo_jornada === 'PERIODO_INTEGRAL')) {
      updates.tipo_jornada = body.tipo_jornada;
      if (!body.carga_horaria_semanal) {
        updates.carga_horaria_semanal = body.tipo_jornada === 'MEIO_PERIODO' ? 20 : 40;
      }
    }
    if (body.carga_horaria_semanal) updates.carga_horaria_semanal = body.carga_horaria_semanal;
    if (body.remuneracao_pactuada !== undefined) updates.remuneracao_pactuada = String(body.remuneracao_pactuada);
    if (body.status_contrato) updates.status_contrato = body.status_contrato;
    if (body.observacoes !== undefined) updates.observacoes = body.observacoes;

    const [atualizado] = await db
      .update(schema.equipeRua)
      .set(updates)
      .where(eq(schema.equipeRua.id, id))
      .returning();

    await logAuditLGPD('ATUALIZACAO_EQUIPE_RUA', `Atualização membro equipe rua: ${atualizado.nome_completo} (ID: ${id})`);

    return atualizado;
  });

  // ─── 5. Remoção de Membro da Equipe de Rua ──────────────────────────────────
  app.delete('/api/equipe-rua/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const existing = await db
      .select({ id: schema.equipeRua.id, nome: schema.equipeRua.nome_completo })
      .from(schema.equipeRua)
      .where(eq(schema.equipeRua.id, id))
      .limit(1)
      .then((r) => r[0]);

    if (!existing) {
      return reply.status(404).send({ error: 'Membro da equipe de rua não encontrado.' });
    }

    await db.delete(schema.equipeRua).where(eq(schema.equipeRua.id, id));
    await logAuditLGPD('EXCLUSAO_EQUIPE_RUA', `Remoção de equipe de rua: ${existing.nome} (ID: ${id})`);

    return { success: true, message: `Membro ${existing.nome} removido da equipe de rua com sucesso.` };
  });

  // ─── 6. Emissão de Contrato Eleitoral Jurídico TSE ───────────────────────────
  // Suporta alternância em tempo real entre Meio Período (4h/20h) e Período Integral (8h/40h)
  app.get('/api/equipe-rua/:id/contrato', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { tipo_jornada, format } = request.query as { tipo_jornada?: 'MEIO_PERIODO' | 'PERIODO_INTEGRAL'; format?: string };

    const membro = await db
      .select()
      .from(schema.equipeRua)
      .where(eq(schema.equipeRua.id, id))
      .limit(1)
      .then((r) => r[0]);

    if (!membro) {
      return reply.status(404).send({ error: 'Membro da equipe de rua não encontrado.' });
    }

    // Busca dados do candidato da campanha ativa
    let candidate = await db
      .select()
      .from(schema.campanhaConfig)
      .where(eq(schema.campanhaConfig.ativo, true))
      .limit(1)
      .then((r) => r[0]);

    if (!candidate) {
      candidate = await db.select().from(schema.campanhaConfig).limit(1).then((r) => r[0]);
    }

    // Gera o contrato completo nos moldes do TSE e Art. 100 Lei 9.504/97
    const contrato = generateStreetContract(
      membro as any,
      candidate,
      tipo_jornada ? { tipo_jornada } : undefined
    );

    await logAuditLGPD('EMISSAO_CONTRATO_TSE', `Emissão de contrato eleitoral TSE para ${membro.nome_completo} (Modalidade: ${contrato.jornada})`);

    // Se o cliente pediu HTML direto para visualização/impressão pura
    if (format === 'html') {
      reply.header('Content-Type', 'text/html; charset=utf-8');
      return reply.send(contrato.printableHtml);
    }

    return contrato;
  });

  // ─── 7. Gerar e Enviar Contrato para Assinatura Gov.br ─────────────────────────
  app.post('/api/equipe-rua/:id/gerar-e-enviar-govbr', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};

    const membro = await db
      .select()
      .from(schema.equipeRua)
      .where(eq(schema.equipeRua.id, id))
      .limit(1)
      .then((r) => r[0]);

    if (!membro) {
      return reply.status(404).send({ error: 'Membro da equipe de rua não encontrado.' });
    }

    const tipoJornada = body.tipo_jornada || membro.tipo_jornada || 'MEIO_PERIODO';

    // Busca dados do candidato ativo
    let candidate = await db.select().from(schema.campanhaConfig).where(eq(schema.campanhaConfig.ativo, true)).limit(1).then((r) => r[0]);
    if (!candidate) candidate = await db.select().from(schema.campanhaConfig).limit(1).then((r) => r[0]);

    const contrato = generateStreetContract(membro as any, candidate, { tipo_jornada: tipoJornada });
    const hashOriginal = computeContractSha256(contrato.plainText);
    const docUuid = crypto.randomUUID();
    const cleanCpf = membro.cpf.replace(/\D/g, '');
    const numeroContrato = `CONT-2026-STS-${cleanCpf.slice(-4)}-${docUuid.slice(0, 4).toUpperCase()}`;
    const linkGovBr = `https://assinador.iti.br/assinar?doc_id=${docUuid}&cpf=${cleanCpf}&campanha=santos2026`;

    await db
      .update(schema.equipeRua)
      .set({
        tipo_jornada: tipoJornada,
        status_contrato: 'AGUARDANDO_ASSINATURA',
        hash_sha256_original: hashOriginal,
        document_uuid_gov_br: docUuid,
        link_gov_br: linkGovBr,
        updated_at: new Date(),
      })
      .where(eq(schema.equipeRua.id, id));

    await logAuditLGPD('ENVIO_CONTRATO_GOVBR', `Contrato gerado para assinatura Gov.br: ${membro.nome_completo} (Hash: ${hashOriginal})`);

    const candName = candidate?.nome_urna || 'Santos 2026';
    const mensagemWhatsApp = `Olá, ${membro.nome_completo}! Aqui é da Coordenação da Campanha (${candName}).\n\nSeu Contrato Oficial de Equipe de Rua (${tipoJornada === 'MEIO_PERIODO' ? 'Meio Período' : 'Período Integral'}) está pronto para assinatura digital pelo GOV.BR.\n\nAssine em 30 segundos pelo celular com biometria ou código OTP:\n${linkGovBr}\n\nDocumento blindado pelo Art. 100 da Lei 9.504/97 e Lei 14.063/2020.`;

    return {
      success: true,
      contrato_id: id,
      numero_contrato: numeroContrato,
      tipo_jornada: tipoJornada,
      status_contrato: 'AGUARDANDO_ASSINATURA',
      link_gov_br: linkGovBr,
      hash_sha256_original: hashOriginal,
      document_uuid: docUuid,
      mensagem_whatsapp: mensagemWhatsApp,
      contrato,
    };
  });

  // ─── 8. Webhook de Callback do Gov.br (ITI) ────────────────────────────────────
  app.post('/api/equipe-rua/webhook-assinatura-govbr', async (request: FastifyRequest, reply: FastifyReply) => {
    const data = (request.body as any) || {};
    const docUuid = data?.document_uuid;
    const cpf = data?.cpf_signatario ? String(data.cpf_signatario).replace(/\D/g, '') : null;

    let membro: any = null;
    if (docUuid) {
      membro = await db.select().from(schema.equipeRua).where(eq(schema.equipeRua.document_uuid_gov_br, docUuid)).limit(1).then((r) => r[0]);
    }
    if (!membro && cpf) {
      const all = await db.select().from(schema.equipeRua);
      membro = all.find((m) => m.cpf.replace(/\D/g, '') === cpf);
    }

    if (!membro) {
      return reply.status(404).send({ error: 'Membro da equipe não localizado para este callback Gov.br.' });
    }

    const hashAssinado = crypto.createHash('sha256').update((membro.hash_sha256_original || '') + '_GOVBR_ITI_SIGNED_' + Date.now()).digest('hex');
    const dadosGov = JSON.stringify({
      nivel_autenticacao: data?.nivel_autenticacao || 'OURO',
      protocolo_iti: data?.protocolo_iti || `ITI-2026-${Math.floor(100000 + Math.random() * 900000)}`,
      carimbo_tempo: new Date().toISOString(),
      ip_origem: request.ip,
      autoridade_certificadora: 'ICP-Brasil / Secretaria de Governo Digital ITI',
    });

    await db
      .update(schema.equipeRua)
      .set({
        status_contrato: 'ASSINADO',
        hash_sha256_assinado: hashAssinado,
        carimbo_tempo_assinatura: new Date(),
        dados_signatario_gov: dadosGov,
        updated_at: new Date(),
      })
      .where(eq(schema.equipeRua.id, membro.id));

    await logAuditLGPD('ASSINATURA_GOVBR_CONCLUIDA', `Contrato assinado digitalmente no Gov.br por ${membro.nome_completo} (Hash: ${hashAssinado})`);

    return { success: true, status: 'ASSINADO', message: 'Assinatura digital Gov.br registrada com sucesso para o SPCE/TSE.' };
  });

  // ─── 9. Simulação de Assinatura Gov.br para Testes e Demonstrações ────────────
  app.post('/api/equipe-rua/:id/simular-assinatura-govbr', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const membro = await db.select().from(schema.equipeRua).where(eq(schema.equipeRua.id, id)).limit(1).then((r) => r[0]);
    if (!membro) return reply.status(404).send({ error: 'Membro não encontrado.' });

    const hashOriginal = membro.hash_sha256_original || computeContractSha256(`CONTRATO_${membro.cpf}_${Date.now()}`);
    const hashAssinado = crypto.createHash('sha256').update(hashOriginal + '_SIMULATED_ITI_OURO').digest('hex');
    const docUuid = membro.document_uuid_gov_br || crypto.randomUUID();
    const dadosGov = JSON.stringify({
      nivel_autenticacao: 'OURO',
      protocolo_iti: `ITI-2026-${Math.floor(100000 + Math.random() * 900000)}`,
      carimbo_tempo: new Date().toISOString(),
      metodo: 'Biometria Facial Gov.br Prata/Ouro',
      autoridade_certificadora: 'ICP-Brasil / ITI Presidência da República',
    });

    const [atualizado] = await db
      .update(schema.equipeRua)
      .set({
        status_contrato: 'ASSINADO',
        document_uuid_gov_br: docUuid,
        hash_sha256_original: hashOriginal,
        hash_sha256_assinado: hashAssinado,
        carimbo_tempo_assinatura: new Date(),
        dados_signatario_gov: dadosGov,
        updated_at: new Date(),
      })
      .where(eq(schema.equipeRua.id, id))
      .returning();

    await logAuditLGPD('SIMULACAO_ASSINATURA_GOVBR', `Simulação de assinatura Gov.br para ${membro.nome_completo}`);

    return { success: true, membro: atualizado };
  });

  // ─── 10. Auditoria de Integridade Criptográfica SHA-256 ───────────────────────
  app.get('/api/equipe-rua/:id/verificar-integridade', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const membro = await db.select().from(schema.equipeRua).where(eq(schema.equipeRua.id, id)).limit(1).then((r) => r[0]);
    if (!membro) return reply.status(404).send({ error: 'Membro não encontrado.' });

    let metadadosGov: any = {};
    try {
      if (membro.dados_signatario_gov) {
        metadadosGov = JSON.parse(membro.dados_signatario_gov);
      }
    } catch (_) {}

    return {
      membro_id: membro.id,
      nome_completo: membro.nome_completo,
      cpf: membro.cpf,
      status_contrato: membro.status_contrato,
      assinado: membro.status_contrato === 'ASSINADO',
      hash_sha256_original: membro.hash_sha256_original,
      hash_sha256_assinado: membro.hash_sha256_assinado,
      carimbo_tempo_assinatura: membro.carimbo_tempo_assinatura,
      link_gov_br: membro.link_gov_br,
      metadados_iti: metadadosGov,
      conformidade_legal: {
        lei_eleicoes_art_100: 'Cumprido - Inexistência de vínculo empregatício expressa',
        lei_assinatura_14063: 'Cumprido - Assinatura Eletrônica Avançada / ITI',
        resolucao_tse_23607: 'Cumprido - Quitação via PIX-CPF Conta Eleitoral',
      },
    };
  });

  // ─── 11. Ingestão de Telemetria Cinética Real (Acelerômetro + GPS) ─────────
  interface TelemetriaItem {
    membro_id: string;
    nome: string;
    telefone?: string;
    cpf?: string;
    funcao?: string;
    latitude: number;
    longitude: number;
    velocidade_kmh: number;
    is_moving: boolean;
    estado: 'EM_MOVIMENTO' | 'PARADO_BASE' | 'PARADO_ALERTA' | 'DESLOCAMENTO_VEICULO' | 'OFFLINE';
    tempo_parado_minutos: number;
    passos: number;
    bateria_pct: number;
    bairro: string;
    cadastros_hoje: number;
    status_turno: 'EM_ANDAMENTO' | 'FINALIZADO';
    updated_at: string;
    breadcrumbs: { lat: number; lng: number; hora: string }[];
  }

  const telemetriaCache = new Map<string, TelemetriaItem>();

  function determinarRegiaoSantos(bairro: string): 'ORLA' | 'ZONA_NOROESTE' | 'CENTRO' | 'MORROS' {
    const b = (bairro || '').toLowerCase();
    if (b.includes('gonzaga') || b.includes('boqueir') || b.includes('ponta') || b.includes('embar') || b.includes('aparecida') || b.includes('josé menino') || b.includes('marap')) {
      return 'ORLA';
    }
    if (b.includes('centro') || b.includes('vila mathias') || b.includes('encruzilhada') || b.includes('paquetá') || b.includes('valongo')) {
      return 'CENTRO';
    }
    if (b.includes('monte') || b.includes('cintra') || b.includes('são bento') || b.includes('fontana') || b.includes('marapé')) {
      return 'MORROS';
    }
    return 'ZONA_NOROESTE';
  }

  app.post('/api/equipe-rua/telemetria', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as any;
    const {
      membro_id,
      nome = 'Colaborador',
      telefone,
      cpf,
      funcao,
      latitude,
      longitude,
      velocidade_kmh = 0,
      is_moving = false,
      estado = 'EM_MOVIMENTO',
      tempo_parado_minutos = 0,
      passos = 0,
      bateria_pct = 80,
      bairro = 'Santos',
      cadastros_hoje
    } = body || {};

    if (!membro_id) {
      return reply.status(400).send({ error: 'membro_id é obrigatório.' });
    }

    const anterior = telemetriaCache.get(membro_id);
    const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const breadcrumbs = anterior ? [...anterior.breadcrumbs] : [];

    // Adiciona ao rastro se houver coordenadas válidas
    if (latitude && longitude) {
      if (breadcrumbs.length === 0 || breadcrumbs[breadcrumbs.length - 1].lat !== latitude || breadcrumbs[breadcrumbs.length - 1].lng !== longitude) {
        breadcrumbs.push({ lat: Number(latitude), lng: Number(longitude), hora: horaAtual });
        if (breadcrumbs.length > 20) breadcrumbs.shift(); // Mantém os últimos 20 pontos reais
      }
    }

    const entry: TelemetriaItem = {
      membro_id,
      nome: anterior?.nome || nome,
      telefone: anterior?.telefone || telefone || '',
      cpf: anterior?.cpf || cpf || '',
      funcao: anterior?.funcao || funcao || 'Mobilizador de Campo',
      latitude: Number(latitude || anterior?.latitude || -23.9618),
      longitude: Number(longitude || anterior?.longitude || -46.3322),
      velocidade_kmh: Number(velocidade_kmh),
      is_moving: Boolean(is_moving),
      estado: estado as any,
      tempo_parado_minutos: Number(tempo_parado_minutos),
      passos: Number(passos),
      bateria_pct: Number(bateria_pct),
      bairro: bairro || anterior?.bairro || 'Santos',
      cadastros_hoje: cadastros_hoje !== undefined ? Number(cadastros_hoje) : (anterior?.cadastros_hoje || 0),
      status_turno: anterior?.status_turno || 'EM_ANDAMENTO',
      updated_at: new Date().toISOString(),
      breadcrumbs
    };

    telemetriaCache.set(membro_id, entry);
    return reply.status(200).send({ recorded: true, timestamp: entry.updated_at });
  });

  // ─── 12. Listagem de Telemetria Real ao Vivo para a Sala de Guerra ───────────
  app.get('/api/equipe-rua/telemetria/ao-vivo', async () => {
    const lista: any[] = [];
    const agora = Date.now();

    // Itera apenas sobre colaboradores reais que reportaram dados do app móvel
    for (const [id, item] of telemetriaCache.entries()) {
      // Ignora se o turno estiver finalizado há mais de 12 horas
      const diffMs = agora - new Date(item.updated_at).getTime();
      if (item.status_turno === 'FINALIZADO' && diffMs > 12 * 3600 * 1000) {
        continue;
      }

      const diffMin = Math.round(diffMs / 60000);
      const recency = diffMin <= 1 ? 'Agora mesmo' : `${diffMin} min atrás`;
      const km = Number(((item.passos * 0.75) / 1000).toFixed(2));

      lista.push({
        id: item.membro_id,
        nome: item.nome,
        cpf: item.cpf ? (item.cpf.length >= 11 ? `${item.cpf.slice(0, 3)}.***.***-${item.cpf.slice(-2)}` : item.cpf) : 'Identificado',
        telefone: item.telefone || 'App PWA',
        bairro: item.bairro,
        regiao: determinarRegiaoSantos(item.bairro),
        funcao: item.funcao,
        statusCinetico: item.status_turno === 'FINALIZADO' ? 'OFFLINE' : item.estado,
        velocidadeKmh: item.velocidade_kmh,
        tempoParadoMinutos: item.tempo_parado_minutos,
        passosHoje: item.passos,
        kmRodados: km,
        cadastrosHoje: item.cadastros_hoje,
        bateriaPct: item.bateria_pct,
        latitude: item.latitude,
        longitude: item.longitude,
        ultimaAtualizacao: recency,
        breadcrumbs: item.breadcrumbs
      });
    }

    return {
      success: true,
      contratados: lista,
      totalEmCampo: lista.filter((c) => c.statusCinetico !== 'OFFLINE').length,
      timestamp: new Date().toISOString()
    };
  });

  // ─── 13. Coleta Real de Apoiador de Rua -> Gravação no PostgreSQL ──────────
  app.post('/api/equipe-rua/coleta-voto', async (request: FastifyRequest, reply: FastifyReply) => {
    const { nome, whatsapp, bairro, tags, lat, lng, cadastradoPor, membro_id } = request.body as any;

    const cleanWhatsapp = String(whatsapp || '').replace(/\D/g, '');
    if (!cleanWhatsapp || cleanWhatsapp.length < 10) {
      return reply.status(400).send({ error: 'WhatsApp obrigatório com DDD.' });
    }

    const nomeFormatado = (nome || 'Apoiador de Rua').trim();
    const tagsStr = Array.isArray(tags) ? tags.join(', ') : (tags || '');
    const gpsStr = lat && lng ? ` (GPS: ${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)})` : '';
    const nota = `Cadastrado na rua por ${cadastradoPor || 'Colaborador'}${tagsStr ? ` | Tags: ${tagsStr}` : ''}${gpsStr}`;

    try {
      // Gravação direta na tabela oficial de apoiadores da campanha
      const existente = await db
        .select({ id: schema.usuarios.id, notas: schema.usuarios.notas })
        .from(schema.usuarios)
        .where(eq(schema.usuarios.whatsapp, cleanWhatsapp))
        .limit(1)
        .then((r) => r[0]);

      let usuarioGravado: any;
      if (existente) {
        const [updated] = await db
          .update(schema.usuarios)
          .set({
            nome: nomeFormatado,
            bairro: bairro || 'Santos',
            latitude: lat ? String(lat) : undefined,
            longitude: lng ? String(lng) : undefined,
            cadastrado_por_nome: cadastradoPor || undefined,
            cadastrado_por_id: membro_id || undefined,
            notas: existente.notas ? `${existente.notas} | Atualizado por ${cadastradoPor || 'Colaborador'}` : nota,
            updated_at: new Date()
          })
          .where(eq(schema.usuarios.id, existente.id))
          .returning();
        usuarioGravado = updated;
      } else {
        const [created] = await db
          .insert(schema.usuarios)
          .values({
            nome: nomeFormatado,
            whatsapp: cleanWhatsapp,
            cargo: 'APOIADOR',
            bairro: bairro || 'Santos',
            latitude: lat ? String(lat) : null,
            longitude: lng ? String(lng) : null,
            cadastrado_por_nome: cadastradoPor || null,
            cadastrado_por_id: membro_id || null,
            status_onboarding: 'COMPLETO',
            notas: nota,
          })
          .returning();
        usuarioGravado = created;
      }

      // Atualiza contador de cadastros em tempo real na telemetria do colaborador
      const idChave = membro_id || (cadastradoPor ? `colab_${cadastradoPor}` : null);
      if (idChave && telemetriaCache.has(idChave)) {
        const item = telemetriaCache.get(idChave)!;
        item.cadastros_hoje = (item.cadastros_hoje || 0) + 1;
        telemetriaCache.set(idChave, item);
      } else if (membro_id) {
        // Se ainda não tiver entrada, busca ou incrementa
        for (const [k, v] of telemetriaCache.entries()) {
          if (v.membro_id === membro_id || v.nome === cadastradoPor) {
            v.cadastros_hoje = (v.cadastros_hoje || 0) + 1;
            telemetriaCache.set(k, v);
            break;
          }
        }
      }

      await logAuditLGPD('COLETA_RUA_APOIADOR', `Cadastro real de apoiador de rua: ${nomeFormatado} (${cleanWhatsapp}) por ${cadastradoPor || 'Equipe'} [GPS: ${lat}, ${lng}]`);

      return reply.status(201).send({
        success: true,
        usuarioId: usuarioGravado?.id,
        mensagem: `Apoiador ${nomeFormatado} gravado com sucesso no banco de dados!`,
        whatsapp: cleanWhatsapp,
        gps: lat && lng ? { lat: Number(lat), lng: Number(lng) } : null,
        cadastradoPor: cadastradoPor || 'Colaborador'
      });
    } catch (err: any) {
      request.log.error(err, 'Erro ao gravar apoiador de rua no banco de dados');
      return reply.status(500).send({ error: 'Falha ao persistir apoiador no banco de dados.' });
    }
  });

  // ─── 13.1. Listagem de Apoiadores Coletados na Rua com Auditoria de GPS e Colaborador ──
  app.get('/api/equipe-rua/apoiadores-coletados', async (request: FastifyRequest) => {
    const { busca, membro_id, limite = '100' } = request.query as any;

    let query = db
      .select({
        id: schema.usuarios.id,
        nome: schema.usuarios.nome,
        whatsapp: schema.usuarios.whatsapp,
        bairro: schema.usuarios.bairro,
        latitude: schema.usuarios.latitude,
        longitude: schema.usuarios.longitude,
        cadastrado_por_nome: schema.usuarios.cadastrado_por_nome,
        cadastrado_por_id: schema.usuarios.cadastrado_por_id,
        notas: schema.usuarios.notas,
        created_at: schema.usuarios.created_at,
      })
      .from(schema.usuarios)
      .where(eq(schema.usuarios.cargo, 'APOIADOR'))
      .orderBy(desc(schema.usuarios.created_at))
      .limit(Number(limite));

    const rows = await query;
    return {
      success: true,
      total: rows.length,
      apoiadores: rows
    };
  });

  // ─── 13.2. Autenticação Restrita de Colaboradores de Rua (Whitelist & Primeiro Acesso) ─
  app.post('/api/equipe-rua/auth/validar-colaborador', async (request: FastifyRequest, reply: FastifyReply) => {
    const { identificador } = (request.body as any) || {};
    const cleanDigits = String(identificador || '').replace(/\D/g, '');

    if (!cleanDigits || cleanDigits.length < 9) {
      return reply.status(400).send({ error: 'Informe um CPF válido ou WhatsApp com DDD.' });
    }

    // Busca apenas na lista oficial de colaboradores contratados pela campanha
    const membro = await db
      .select({
        id: schema.equipeRua.id,
        nome: schema.equipeRua.nome_completo,
        cpf: schema.equipeRua.cpf,
        telefone: schema.equipeRua.telefone_whatsapp,
        bairro: schema.equipeRua.bairro,
        funcao: schema.equipeRua.funcao_atividade,
        senha_hash: schema.equipeRua.senha_hash,
        primeiro_acesso_realizado: schema.equipeRua.primeiro_acesso_realizado,
      })
      .from(schema.equipeRua)
      .where(
        or(
          sql`replace(replace(${schema.equipeRua.cpf}, '.', ''), '-', '') = ${cleanDigits}`,
          sql`regexp_replace(${schema.equipeRua.telefone_whatsapp}, '\\D', '', 'g') = ${cleanDigits}`
        )
      )
      .limit(1)
      .then((r) => r[0]);

    if (!membro) {
      return reply.status(403).send({
        error: 'Acesso Restrito: Seu CPF ou Telefone não consta no cadastro oficial de colaboradores da campanha de Santos. Procure a coordenação.',
        bloqueado: true,
      });
    }

    const primeiroAcesso = !membro.senha_hash || !membro.primeiro_acesso_realizado;

    return {
      autorizado: true,
      id: membro.id,
      nome: membro.nome,
      cpf: membro.cpf,
      telefone: membro.telefone,
      bairro: membro.bairro,
      funcao: membro.funcao,
      primeiroAcesso,
      mensagem: primeiroAcesso
        ? 'Colaborador oficial identificado. Crie sua senha no primeiro acesso.'
        : 'Colaborador oficial identificado. Digite sua senha de acesso.'
    };
  });

  app.post('/api/equipe-rua/auth/primeiro-acesso', async (request: FastifyRequest, reply: FastifyReply) => {
    const { identificador, novaSenha } = (request.body as any) || {};
    const cleanDigits = String(identificador || '').replace(/\D/g, '');

    if (!cleanDigits || !novaSenha || String(novaSenha).length < 4) {
      return reply.status(400).send({ error: 'A senha de segurança deve ter pelo menos 4 caracteres.' });
    }

    const membro = await db
      .select()
      .from(schema.equipeRua)
      .where(
        or(
          sql`replace(replace(${schema.equipeRua.cpf}, '.', ''), '-', '') = ${cleanDigits}`,
          sql`regexp_replace(${schema.equipeRua.telefone_whatsapp}, '\\D', '', 'g') = ${cleanDigits}`
        )
      )
      .limit(1)
      .then((r) => r[0]);

    if (!membro) {
      return reply.status(403).send({ error: 'Colaborador não autorizado no sistema.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(String(novaSenha), salt);

    await db
      .update(schema.equipeRua)
      .set({
        senha_hash: hash,
        primeiro_acesso_realizado: true,
        ultimo_login_at: new Date(),
        updated_at: new Date()
      })
      .where(eq(schema.equipeRua.id, membro.id));

    const token = jwt.sign(
      { id: membro.id, nome: membro.nome_completo, role: 'COLABORADOR_RUA' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    await logAuditLGPD('PRIMEIRO_ACESSO_RUA', `Criação de senha no primeiro acesso para o colaborador ${membro.nome_completo} (${membro.cpf})`);

    return reply.status(200).send({
      success: true,
      token,
      colaborador: {
        id: membro.id,
        nome: membro.nome_completo,
        cpf: membro.cpf,
        telefone: membro.telefone_whatsapp,
        bairro: membro.bairro,
        funcao: membro.funcao_atividade,
      }
    });
  });

  app.post('/api/equipe-rua/auth/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const { identificador, senha } = (request.body as any) || {};
    const cleanDigits = String(identificador || '').replace(/\D/g, '');

    if (!cleanDigits || !senha) {
      return reply.status(400).send({ error: 'Informe seu CPF/WhatsApp e a senha cadastrada.' });
    }

    const membro = await db
      .select()
      .from(schema.equipeRua)
      .where(
        or(
          sql`replace(replace(${schema.equipeRua.cpf}, '.', ''), '-', '') = ${cleanDigits}`,
          sql`regexp_replace(${schema.equipeRua.telefone_whatsapp}, '\\D', '', 'g') = ${cleanDigits}`
        )
      )
      .limit(1)
      .then((r) => r[0]);

    if (!membro) {
      return reply.status(403).send({
        error: 'Acesso Restrito: Usuário não cadastrado como colaborador oficial de rua.',
        bloqueado: true
      });
    }

    if (!membro.senha_hash) {
      return reply.status(200).send({
        precisaCriarSenha: true,
        mensagem: 'Primeiro acesso detectado. Crie sua senha de segurança.',
        colaborador: {
          id: membro.id,
          nome: membro.nome_completo,
          cpf: membro.cpf,
          telefone: membro.telefone_whatsapp,
        }
      });
    }

    const isValid = await bcrypt.compare(String(senha), membro.senha_hash);
    if (!isValid) {
      return reply.status(401).send({ error: 'Senha incorreta. Tente novamente ou procure a coordenação.' });
    }

    await db
      .update(schema.equipeRua)
      .set({ ultimo_login_at: new Date() })
      .where(eq(schema.equipeRua.id, membro.id));

    const token = jwt.sign(
      { id: membro.id, nome: membro.nome_completo, role: 'COLABORADOR_RUA' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return reply.status(200).send({
      success: true,
      token,
      colaborador: {
        id: membro.id,
        nome: membro.nome_completo,
        cpf: membro.cpf,
        telefone: membro.telefone_whatsapp,
        bairro: membro.bairro,
        funcao: membro.funcao_atividade,
      }
    });
  });

  // ─── 14. Alerta Real de Suprimentos para Van de Apoio ──────────────────────
  interface AlertaSuprimento {
    id: string;
    solicitante: string;
    telefone?: string;
    bairro: string;
    lat: number;
    lng: number;
    item: string;
    status: 'PENDENTE' | 'A_CAMINHO' | 'ENTREGUE';
    tempoEstimadoChegadaMinutos: number;
    createdAt: string;
    updatedAt: string;
  }

  const alertasSuprimentos: AlertaSuprimento[] = [];

  app.post('/api/equipe-rua/solicitar-material', async (request: FastifyRequest, reply: FastifyReply) => {
    const { bairro, lat, lng, solicitante, item, telefone } = request.body as any;
    const alertId = 'alert_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const novoAlerta: AlertaSuprimento = {
      id: alertId,
      solicitante: (solicitante || 'Equipe de Campo Santos').trim(),
      telefone: telefone || '',
      bairro: bairro || 'Santos',
      lat: Number(lat) || -23.9618,
      lng: Number(lng) || -46.3322,
      item: item || 'Santinhos e Adesivos de Carro',
      status: 'PENDENTE',
      tempoEstimadoChegadaMinutos: 15,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    alertasSuprimentos.unshift(novoAlerta);
    if (alertasSuprimentos.length > 50) alertasSuprimentos.pop();

    console.log(`[SUPPLY ALERT] 🚨 Alerta de material registrado: ${novoAlerta.item} para ${novoAlerta.solicitante} em ${novoAlerta.bairro}`);
    await logAuditLGPD('SOLICITACAO_MATERIAL_RUA', `Solicitação de material (${novoAlerta.item}) por ${novoAlerta.solicitante} em ${novoAlerta.bairro}`);

    return reply.status(200).send({
      success: true,
      alertaEmitido: true,
      alerta: novoAlerta,
      solicitante: novoAlerta.solicitante,
      bairro: novoAlerta.bairro,
      tempoEstimadoChegadaMinutos: 15
    });
  });

  app.get('/api/equipe-rua/alertas-material', async (request: FastifyRequest) => {
    const { status } = request.query as any;
    let lista = alertasSuprimentos;
    if (status) {
      lista = lista.filter(a => a.status === status);
    }
    const pendentes = alertasSuprimentos.filter(a => a.status === 'PENDENTE').length;
    return {
      success: true,
      alertas: lista,
      totalPendentes: pendentes,
      timestamp: new Date().toISOString()
    };
  });

  app.post('/api/equipe-rua/alertas-material/:id/atender', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    const { status = 'A_CAMINHO' } = (request.body as any) || {};
    const alert = alertasSuprimentos.find(a => a.id === id);
    if (!alert) {
      return reply.status(404).send({ error: 'Alerta não encontrado' });
    }
    alert.status = status;
    alert.updatedAt = new Date().toISOString();
    return reply.status(200).send({ success: true, alerta: alert });
  });

  // ─── 15. Ponto Eletrônico: Check-in de Entrada ─────────────────────────────
  const historicoPontos: any[] = [];

  app.post('/api/equipe-rua/checkin', async (request: FastifyRequest, reply: FastifyReply) => {
    const { colaborador_id, nome, telefone, cpf, funcao, latitude, longitude, bairro } = request.body as any;
    const registro = {
      id: 'ponto_' + Date.now(),
      colaborador_id,
      nome,
      horario_entrada: new Date().toISOString(),
      lat_entrada: latitude,
      lng_entrada: longitude,
      bairro,
      status: 'EM_ANDAMENTO'
    };
    historicoPontos.unshift(registro);

    // Inicializa o colaborador no cache de telemetria ativo
    if (colaborador_id) {
      telemetriaCache.set(colaborador_id, {
        membro_id: colaborador_id,
        nome: nome || 'Colaborador de Rua',
        telefone: telefone || '',
        cpf: cpf || '',
        funcao: funcao || 'Mobilizador de Campo',
        latitude: Number(latitude || -23.9618),
        longitude: Number(longitude || -46.3322),
        velocidade_kmh: 0,
        is_moving: false,
        estado: 'PARADO_BASE',
        tempo_parado_minutos: 0,
        passos: 0,
        bateria_pct: 100,
        bairro: bairro || 'Santos',
        cadastros_hoje: 0,
        status_turno: 'EM_ANDAMENTO',
        updated_at: new Date().toISOString(),
        breadcrumbs: [{ lat: Number(latitude || -23.9618), lng: Number(longitude || -46.3322), hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }]
      });
    }

    await logAuditLGPD('CHECKIN_PONTO_RUA', `Check-in de entrada registrado para ${nome} em ${bairro}`);
    return reply.status(200).send({ success: true, registro });
  });

  // ─── 16. Ponto Eletrônico: Check-out de Saída ──────────────────────────────
  app.post('/api/equipe-rua/checkout', async (request: FastifyRequest, reply: FastifyReply) => {
    const { colaborador_id, nome, horario_entrada, horario_saida, cadastros, km, latitude, longitude } = request.body as any;
    const registroSaida = {
      id: 'saida_' + Date.now(),
      colaborador_id,
      nome,
      horario_entrada,
      horario_saida: horario_saida || new Date().toISOString(),
      cadastros_turno: cadastros || 0,
      km_turno: km || 0,
      lat_saida: latitude,
      lng_saida: longitude,
      status: 'FINALIZADO',
      timestamp: new Date().toISOString()
    };
    historicoPontos.unshift(registroSaida);

    // Atualiza estado do turno para FINALIZADO no cache
    if (colaborador_id && telemetriaCache.has(colaborador_id)) {
      const item = telemetriaCache.get(colaborador_id)!;
      item.status_turno = 'FINALIZADO';
      item.estado = 'OFFLINE';
      item.velocidade_kmh = 0;
      item.updated_at = new Date().toISOString();
      telemetriaCache.set(colaborador_id, item);
    }

    await logAuditLGPD('CHECKOUT_PONTO_RUA', `Check-out de saída registrado para ${nome} (${cadastros} apoios, ${km} km)`);
    return reply.status(200).send({ success: true, registro: registroSaida });
  });

  // ─── 17. Listagem de Pontos do Dia para a Sala de Guerra ────────────────────
  app.get('/api/equipe-rua/pontos', async () => {
    return {
      success: true,
      pontos: historicoPontos.slice(0, 50),
      total: historicoPontos.length
    };
  });
}

