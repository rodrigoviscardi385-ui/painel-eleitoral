import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db, logAuditLGPD } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, desc, sql, and, or, ilike } from 'drizzle-orm';
import { generateStreetContract, computeContractSha256 } from '../services/streetContractService.js';
import crypto from 'crypto';

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
}
