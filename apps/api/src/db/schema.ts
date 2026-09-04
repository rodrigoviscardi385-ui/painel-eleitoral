import { pgTable, uuid, text, integer, timestamp, index, boolean, numeric } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const usuarios = pgTable(
  'usuarios',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    nome: text('nome').notNull(),
    whatsapp: text('whatsapp').notNull().unique(),
    cargo: text('cargo', { enum: ['ADMIN', 'GESTOR', 'LIDER', 'APOIADOR', 'VOLUNTARIO'] }).default('APOIADOR').notNull(),
    lider_acima_id: uuid('lider_acima_id'),
    bairro: text('bairro'),
    zona_eleitoral: text('zona_eleitoral'),
    secao_eleitoral: text('secao_eleitoral'),
    status_onboarding: text('status_onboarding', {
      enum: ['PENDENTE_NOME', 'PENDENTE_BAIRRO', 'PENDENTE_ZONA_SECAO', 'COMPLETO'],
    }).default('COMPLETO').notNull(),
    grupo_whatsapp_id: text('grupo_whatsapp_id'),
    grupo_link_convite: text('grupo_link_convite'),
    total_indicados_diretos: integer('total_indicados_diretos').default(0).notNull(),
    total_indicados_rede: integer('total_indicados_rede').default(0).notNull(),
    opt_out: boolean('opt_out').default(false).notNull(), // Bloqueio TSE / LGPD
    notas: text('notas'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_usuarios_whatsapp').on(table.whatsapp),
    index('idx_usuarios_lider_acima_id').on(table.lider_acima_id),
    index('idx_usuarios_cargo').on(table.cargo),
    index('idx_usuarios_zona_bairro').on(table.zona_eleitoral, table.bairro),
  ]
);

export const usuariosRelations = relations(usuarios, ({ one, many }) => ({
  liderAcima: one(usuarios, {
    fields: [usuarios.lider_acima_id],
    references: [usuarios.id],
    relationName: 'lider_subordinados',
  }),
  subordinados: many(usuarios, {
    relationName: 'lider_subordinados',
  }),
  disparosItens: many(disparosItens),
}));

export const metas = pgTable(
  'metas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    titulo: text('titulo').notNull(),
    tipo: text('tipo', { enum: ['GLOBAL', 'ZONA', 'BAIRRO', 'LIDER'] }).default('GLOBAL').notNull(),
    alvo_referencia: text('alvo_referencia'), // ex: "Zona 120", "Bairro Centro", "Nome do Líder"
    quantidade_meta: integer('quantidade_meta').default(100).notNull(),
    quantidade_atual: integer('quantidade_atual').default(0).notNull(),
    data_inicio: timestamp('data_inicio', { withTimezone: true }).defaultNow().notNull(),
    data_fim: timestamp('data_fim', { withTimezone: true }).notNull(),
    meta_diaria_cadencia: integer('meta_diaria_cadencia').default(5).notNull(),
    status_semaforo: text('status_semaforo', { enum: ['VERDE', 'AMARELO', 'VERMELHO'] }).default('VERDE').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_metas_tipo').on(table.tipo),
    index('idx_metas_status').on(table.status_semaforo),
  ]
);

export const disparosCampanha = pgTable(
  'disparos_campanha',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    titulo: text('titulo').notNull(),
    mensagem_template: text('mensagem_template').notNull(),
    url_midia_pdf: text('url_midia_pdf'),
    filtro_tipo: text('filtro_tipo', { enum: ['TODOS', 'ZONA', 'BAIRRO', 'LIDER'] }).default('TODOS').notNull(),
    filtro_valor: text('filtro_valor'),
    total_alvos: integer('total_alvos').default(0).notNull(),
    total_enviados: integer('total_enviados').default(0).notNull(),
    total_erros: integer('total_erros').default(0).notNull(),
    status: text('status', { enum: ['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDO', 'FALHA'] }).default('PENDENTE').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_disparos_status').on(table.status),
  ]
);

export const disparosItens = pgTable(
  'disparos_itens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    disparo_id: uuid('disparo_id').references(() => disparosCampanha.id, { onDelete: 'cascade' }).notNull(),
    usuario_id: uuid('usuario_id').references(() => usuarios.id, { onDelete: 'cascade' }).notNull(),
    whatsapp_destino: text('whatsapp_destino').notNull(),
    status: text('status', { enum: ['PENDENTE', 'ENVIADO', 'ERRO'] }).default('PENDENTE').notNull(),
    mensagem_final: text('mensagem_final'),
    erro_detalhe: text('erro_detalhe'),
    enviado_em: timestamp('enviado_em', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_disparos_itens_disparo_id').on(table.disparo_id),
    index('idx_disparos_itens_status').on(table.status),
  ]
);

export const logsAuditoriaLGPD = pgTable(
  'logs_auditoria_lgpd',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuario_responsavel: text('usuario_responsavel').notNull(),
    acao: text('acao').notNull(),
    ip: text('ip'),
    detalhes: text('detalhes'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_logs_acao').on(table.acao),
    index('idx_logs_created_at').on(table.created_at),
  ]
);

export const fluxosOnboardingTemp = pgTable(
  'fluxos_onboarding_temp',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    whatsapp: text('whatsapp').notNull().unique(),
    etapa_atual: text('etapa_atual').notNull(),
    dados_temporarios: text('dados_temporarios').default('{}').notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_onboarding_whatsapp').on(table.whatsapp),
  ]
);

export const usuariosAuth = pgTable(
  'usuarios_auth',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuario_id: uuid('usuario_id').references(() => usuarios.id, { onDelete: 'set null' }),
    nome: text('nome').notNull(),
    email: text('email').notNull().unique(),
    whatsapp: text('whatsapp'),
    senha_hash: text('senha_hash').notNull(),
    role: text('role', { enum: ['ADMIN', 'COORDENADOR', 'OPERADOR', 'LIDER'] }).default('OPERADOR').notNull(),
    permissoes: text('permissoes').default('["CHAT"]').notNull(), // JSON string com array de permissões
    ativo: text('ativo').default('SIM').notNull(),
    ultimo_login: timestamp('ultimo_login', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_usuarios_auth_email').on(table.email),
    index('idx_usuarios_auth_role').on(table.role),
  ]
);

export const mensagensChat = pgTable(
  'mensagens_chat',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversa_id: text('conversa_id').notNull(), // WhatsApp do contato (ex: "5513991063105" ou "120363001@g.us")
    de_whatsapp: text('de_whatsapp').notNull(),
    para_whatsapp: text('para_whatsapp').notNull(),
    remetente_nome: text('remetente_nome'),
    conteudo: text('conteudo').notNull(),
    tipo: text('tipo', { enum: ['TEXTO', 'AUDIO', 'IMAGEM', 'DOCUMENTO'] }).default('TEXTO').notNull(),
    direcao: text('direcao', { enum: ['ENTRADA', 'SAIDA'] }).notNull(),
    status: text('status', { enum: ['PENDENTE', 'ENVIADO', 'ENTREGUE', 'LIDO', 'ERRO'] }).default('PENDENTE').notNull(),
    midia_url: text('midia_url'),
    atendente_nome: text('atendente_nome'),
    setor: text('setor').default('GERAL').notNull(), // 'GERAL' | 'AGENDA' | 'JURIDICO' | 'MATERIAIS'
    tags: text('tags').default('[]').notNull(), // JSON string com array de tags
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_mensagens_chat_conversa_id').on(table.conversa_id),
    index('idx_mensagens_chat_created_at').on(table.created_at),
    index('idx_mensagens_chat_status').on(table.status),
  ]
);

export const whatsappSessions = pgTable(
  'whatsapp_sessions',
  {
    session_id: text('session_id').primaryKey(),
    creds_data: text('creds_data').notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  }
);

// ─── Biblioteca de Materiais Online ────────────────────────────────────────
export const materiaisOnline = pgTable(
  'materiais_online',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    titulo: text('titulo').notNull(),
    descricao: text('descricao'),
    tipo: text('tipo', { enum: ['PDF', 'LINK', 'IMAGEM', 'VIDEO'] }).default('LINK').notNull(),
    url: text('url').notNull(),
    tags: text('tags').default('[]').notNull(), // JSON array de strings
    ativo: text('ativo').default('SIM').notNull(),
    ordem: integer('ordem').default(0).notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_materiais_ativo').on(table.ativo),
    index('idx_materiais_tipo').on(table.tipo),
  ]
);

// ─── Configuração do Chatbot ────────────────────────────────────────────────
export const botConfig = pgTable('bot_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  modo: text('modo', { enum: ['BOT_ATIVO', 'HUMANO', 'HIBRIDO'] }).default('BOT_ATIVO').notNull(),
  mensagem_boas_vindas: text('mensagem_boas_vindas').default(
    'Olá! 👋 Sou o assistente virtual da campanha. Como posso ajudar?\n\n1️⃣ Conhecer as propostas\n2️⃣ Receber material de campanha\n3️⃣ Falar com um atendente\n\nDigite o número da opção desejada.'
  ).notNull(),
  menu_opcoes: text('menu_opcoes').default(
    '[{"numero":1,"texto":"Conhecer as propostas","acao":"INFO"},{"numero":2,"texto":"Receber material","acao":"MATERIAL"},{"numero":3,"texto":"Falar com atendente","acao":"HUMANO"}]'
  ).notNull(),
  mensagem_encerramento_bot: text('mensagem_encerramento_bot').default(
    '✅ Obrigado pelo contato! Qualquer dúvida, estamos aqui.'
  ).notNull(),
  mensagem_transferencia: text('mensagem_transferencia').default(
    '⏳ Aguarde um momento! Vou conectar você com um atendente da nossa equipe. 🙋'
  ).notNull(),
  horario_inicio: text('horario_inicio').default('08:00').notNull(),
  horario_fim: text('horario_fim').default('18:00').notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Status de Atendimento por Conversa ────────────────────────────────────
export const conversaStatus = pgTable(
  'conversa_status',
  {
    conversa_id: text('conversa_id').primaryKey(),
    modo: text('modo', { enum: ['BOT', 'HUMANO', 'AGUARDANDO'] }).default('BOT').notNull(),
    atendente_nome: text('atendente_nome'),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  }
);

// ─── Configuração Geral da Campanha (White-Label) ───────────────────────────
export const campanhaConfig = pgTable('campanha_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome_urna: text('nome_urna').default('Rodrigo da Saúde').notNull(),
  nome_completo: text('nome_completo').default('Rodrigo Viscardi').notNull(),
  numero_candidato: text('numero_candidato').default('2026').notNull(),
  cargo: text('cargo').default('Deputado Federal').notNull(),
  partido: text('partido').default('AVANTE').notNull(),
  coligacao: text('coligacao').default('Coligação Por Dias Melhores').notNull(),
  slogan: text('slogan').default('Trabalho, honestidade e compromisso com você').notNull(),
  foto_url: text('foto_url'),
  logo_url: text('logo_url'),
  cor_primaria: text('cor_primaria').default('#10b981').notNull(), // hex verde esmeralda padrão
  cidade: text('cidade').default('São Paulo').notNull(),
  estado: text('estado').default('SP').notNull(),
  data_eleicao: text('data_eleicao').default('2026-10-04').notNull(),
  cnpj_campanha: text('cnpj_campanha').default('00.000.000/0001-00'),
  biografia_ia: text('biografia_ia').default(
    'Candidato comprometido com a melhoria da saúde pública, geração de empregos e desenvolvimento sustentável das nossas comunidades.'
  ).notNull(),
  propostas_ia: text('propostas_ia').default(
    'SAÚDE: Fortalecimento dos postos de saúde, redução de filas para exames e valorização dos profissionais.\nEDUCAÇÃO: Escolas de tempo integral e tecnologia em sala de aula.\nEMPREGO: Apoio ao pequeno empreendedor e incentivos fiscais para empresas locais.'
  ).notNull(),
  tom_voz_ia: text('tom_voz_ia').default('POPULAR').notNull(), // POPULAR, FORMAL, DESCONTRAIDO, TECNICO
  link_grupo_geral: text('link_grupo_geral').default('https://chat.whatsapp.com/convite-campanha'),
  whatsapp_comite: text('whatsapp_comite').default(''),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Controle Financeiro e Gastos da Campanha ──────────────────────────────
export const gastosCampanha = pgTable(
  'gastos_campanha',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    descricao: text('descricao').notNull(),
    categoria: text('categoria', {
      enum: [
        'COMBUSTIVEL',
        'ALIMENTACAO',
        'MATERIAL_GRAFICO',
        'EVENTOS',
        'IMPULSIONAMENTO',
        'PESSOAL',
        'JURIDICO_CONTABIL',
        'TRANSPORTE',
        'OUTROS',
      ],
    }).default('OUTROS').notNull(),
    valor: numeric('valor', { precision: 12, scale: 2 }).notNull(),
    data_gasto: timestamp('data_gasto', { withTimezone: true }).defaultNow().notNull(),
    forma_pagamento: text('forma_pagamento', {
      enum: ['PIX', 'CARTAO', 'TRANSFERENCIA', 'DINHEIRO', 'BOLETO'],
    }).default('PIX').notNull(),
    fornecedor_nome: text('fornecedor_nome'),
    fornecedor_documento: text('fornecedor_documento'), // CNPJ ou CPF
    numero_documento: text('numero_documento'), // NF / Cupom / Recibo
    comprovante_url: text('comprovante_url'), // Link ou caminho da foto
    responsavel_nome: text('responsavel_nome'),
    status_auditoria: text('status_auditoria', {
      enum: ['APROVADO', 'PENDENTE', 'REJEITADO'],
    }).default('PENDENTE').notNull(),
    observacoes: text('observacoes'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_gastos_categoria').on(table.categoria),
    index('idx_gastos_data_gasto').on(table.data_gasto),
    index('idx_gastos_status').on(table.status_auditoria),
  ]
);

export const chipWarmingConfig = pgTable(
  'chip_warming_config',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    instance_name: text('instance_name').default('campanha_2026').notNull().unique(),
    status: text('status', { enum: ['ATIVO', 'PAUSADO', 'CONCLUIDO'] }).default('PAUSADO').notNull(),
    fase_atual: integer('fase_atual').default(1).notNull(), // 1 a 4
    dias_ativos: integer('dias_ativos').default(0).notNull(),
    msgs_enviadas_hoje: integer('msgs_enviadas_hoje').default(0).notNull(),
    limite_diario_atual: integer('limite_diario_atual').default(10).notNull(),
    health_score: integer('health_score').default(35).notNull(), // 0 a 100%
    numeros_parceiros: text('numeros_parceiros').default('[]').notNull(), // JSON string array
    simular_digitacao: boolean('simular_digitacao').default(true).notNull(),
    delays_gaussianos: boolean('delays_gaussianos').default(true).notNull(),
    ultimo_ciclo_em: timestamp('ultimo_ciclo_em', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_chip_warming_instance').on(table.instance_name),
  ]
);
