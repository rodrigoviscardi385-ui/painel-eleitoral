import { pgTable, uuid, text, integer, timestamp, index, boolean, numeric } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── Tabela Principal: Usuários, Líderes, Apoiadores e Gestores ─────────────
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
    opt_out: boolean('opt_out').default(false).notNull(), // Conformidade TSE / LGPD
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

// ─── Tabela de Metas Territoriais e Globais ─────────────────────────────────
export const metas = pgTable(
  'metas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    titulo: text('titulo').notNull(),
    tipo: text('tipo', { enum: ['GLOBAL', 'ZONA', 'BAIRRO', 'LIDER'] }).default('GLOBAL').notNull(),
    alvo_referencia: text('alvo_referencia'), // ex: "Zona 120", "Bairro Centro"
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

// ─── Tabela de Disparos de Campanha em Massa ────────────────────────────────
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

// ─── Itens Individuais da Fila de Disparo ───────────────────────────────────
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

// ─── Trilha de Auditoria e Conformidade LGPD ────────────────────────────────
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

// ─── Usuários com Acesso ao Painel Administrativo (RBAC) ────────────────────
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
    permissoes: text('permissoes').default('["CHAT"]').notNull(), // JSON array de permissões
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

// ─── Mensagens do Chat ao Vivo Integrado ao WhatsApp ────────────────────────
export const mensagensChat = pgTable(
  'mensagens_chat',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversa_id: text('conversa_id').notNull(), // Telefone ou JID do contato
    de_whatsapp: text('de_whatsapp').notNull(),
    para_whatsapp: text('para_whatsapp').notNull(),
    remetente_nome: text('remetente_nome'),
    conteudo: text('conteudo').notNull(),
    tipo: text('tipo', { enum: ['TEXTO', 'AUDIO', 'IMAGEM', 'DOCUMENTO'] }).default('TEXTO').notNull(),
    direcao: text('direcao', { enum: ['ENTRADA', 'SAIDA'] }).notNull(),
    status: text('status', { enum: ['PENDENTE', 'ENVIADO', 'ENTREGUE', 'LIDO', 'ERRO'] }).default('PENDENTE').notNull(),
    midia_url: text('midia_url'),
    remote_jid: text('remote_jid'),
    atendente_nome: text('atendente_nome'),
    setor: text('setor').default('GERAL').notNull(), // 'GERAL' | 'AGENDA' | 'JURIDICO' | 'MATERIAIS'
    tags: text('tags').default('[]').notNull(), // JSON array de tags
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_mensagens_chat_conversa_id').on(table.conversa_id),
    index('idx_mensagens_chat_created_at').on(table.created_at),
    index('idx_mensagens_chat_status').on(table.status),
  ]
);

// ─── Status do Atendimento por Conversa (Bot vs Humano) ─────────────────────
export const conversaStatus = pgTable(
  'conversa_status',
  {
    conversa_id: text('conversa_id').primaryKey(),
    remote_jid: text('remote_jid'),
    modo: text('modo', { enum: ['BOT', 'HUMANO', 'AGUARDANDO'] }).default('BOT').notNull(),
    atendente_nome: text('atendente_nome'),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  }
);

// ─── Personalização White-Label da Campanha ─────────────────────────────────
export const campanhaConfig = pgTable('campanha_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome_urna: text('nome_urna').default('Gustavo Reis').notNull(),
  nome_completo: text('nome_completo').default('Gustavo Reis').notNull(),
  numero_candidato: text('numero_candidato').default('55955').notNull(),
  cargo: text('cargo').default('Deputado Federal').notNull(),
  partido: text('partido').default('PSD').notNull(),
  coligacao: text('coligacao').default('Coligação Por Dias Melhores').notNull(),
  slogan: text('slogan').default('Trabalho, honestidade e compromisso com você').notNull(),
  foto_url: text('foto_url'),
  logo_url: text('logo_url'),
  cor_primaria: text('cor_primaria').default('#10b981').notNull(), // Hex padrão verde esmeralda
  cidade: text('cidade').default('Santos').notNull(),
  estado: text('estado').default('SP').notNull(),
  data_eleicao: text('data_eleicao').default('2026-10-04').notNull(),
  cnpj_campanha: text('cnpj_campanha').default('00.000.000/0001-00'),
  biografia_ia: text('biografia_ia').default(
    'Candidato comprometido com a melhoria da saúde pública, geração de empregos e desenvolvimento regional.'
  ).notNull(),
  propostas_ia: text('propostas_ia').default(
    'SAÚDE: Fortalecimento dos postos de saúde, redução de filas para exames e valorização dos profissionais.\nEDUCAÇÃO: Escolas de tempo integral e tecnologia em sala de aula.\nEMPREGO: Apoio ao pequeno empreendedor e incentivos fiscais para empresas locais.'
  ).notNull(),
  tom_voz_ia: text('tom_voz_ia').default('POPULAR').notNull(), // POPULAR, FORMAL, DESCONTRAIDO, TECNICO
  link_grupo_geral: text('link_grupo_geral').default('https://chat.whatsapp.com/convite-campanha'),
  whatsapp_comite: text('whatsapp_comite').default(''),
  ativo: boolean('ativo').default(true).notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Controle Financeiro e Gastos da Campanha (Prestação de Contas) ─────────
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
    numero_documento: text('numero_documento'), // NF / Cupom
    comprovante_url: text('comprovante_url'), // Link da foto do recibo
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

// ─── Aquecimento e Proteção Anti-Ban do WhatsApp ────────────────────────────
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

// ─── Acervo Digital de Materiais de Campanha ────────────────────────────────
export const materiaisCampanha = pgTable(
  'materiais_campanha',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    titulo: text('titulo').notNull(),
    tipo: text('tipo', { enum: ['SANTINHO', 'PDF', 'VIDEO', 'IMAGEM', 'LINK'] }).default('PDF').notNull(),
    url: text('url').notNull(),
    descricao: text('descricao'),
    tamanho_bytes: integer('tamanho_bytes').default(0),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_materiais_tipo').on(table.tipo),
    index('idx_materiais_created_at').on(table.created_at),
  ]
);

// ─── Retiradas de Materiais Físicos por Lideranças e Apoiadores ─────────────
export const retiradasMateriais = pgTable(
  'retiradas_materiais',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuario_id: uuid('usuario_id').references(() => usuarios.id, { onDelete: 'cascade' }).notNull(),
    material_nome: text('material_nome').notNull(), // ex: "Santinhos 10x15", "Adesivo de Carro", "Bandeira com Haste", "Cartaz Comitê"
    quantidade: integer('quantidade').notNull(),
    data_retirada: timestamp('data_retirada', { withTimezone: true }).defaultNow().notNull(),
    responsavel_entrega: text('responsavel_entrega'), // Nome de quem entregou no comitê
    observacoes: text('observacoes'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_retiradas_usuario_id').on(table.usuario_id),
    index('idx_retiradas_data').on(table.data_retirada),
  ]
);

// ─── Configuração do Chatbot de Atendimento ─────────────────────────────────
export const botConfig = pgTable('bot_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  ativo: boolean('ativo').default(true).notNull(),
  modo_padrao: text('modo_padrao', { enum: ['BOT', 'HUMANO', 'HIBRIDO'] }).default('BOT').notNull(),
  mensagem_boas_vindas: text('mensagem_boas_vindas').default(
    'Olá! Seja muito bem-vindo ao canal oficial da nossa campanha. Como posso te ajudar hoje?'
  ).notNull(),
  menu_opcoes: text('menu_opcoes').default(
    '1 - Conhecer as propostas do candidato\n2 - Falar com a equipe do comitê\n3 - Indicar apoiadores e eleitores\n4 - Receber materiais e santinho virtual\n5 - Conectar ao grupo do seu bairro'
  ).notNull(),
  mensagem_encerramento: text('mensagem_encerramento').default(
    'Agradecemos imensamente o seu contato! Juntos construiremos uma cidade cada vez melhor.'
  ).notNull(),
  mensagem_fora_horario: text('mensagem_fora_horario').default(
    'Olá! Nosso horário de atendimento no comitê é das 08:00 às 20:00. Deixe sua mensagem que responderemos assim que iniciarmos o expediente!'
  ).notNull(),
  horario_inicio: text('horario_inicio').default('08:00').notNull(),
  horario_fim: text('horario_fim').default('20:00').notNull(),
  dias_funcionamento: text('dias_funcionamento').default('["SEG", "TER", "QUA", "QUI", "SEX", "SAB"]').notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Gestores e Administradores de Grupos de Base ───────────────────────────
export const gestoresCampanha = pgTable(
  'gestores_campanha',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    nome: text('nome').notNull(),
    whatsapp: text('whatsapp').notNull().unique(),
    cargo: text('cargo').default('COORDENADOR GERAL').notNull(),
    notificar_novos_grupos: boolean('notificar_novos_grupos').default(true).notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_gestores_whatsapp').on(table.whatsapp),
  ]
);

// ─── Apuração Prévia e Boletins de Urna (QR-BU do TSE) ──────────────────────
export const boletinsUrna = pgTable(
  'boletins_urna',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    municipio: text('municipio').default('Santos').notNull(),
    codigo_municipio: text('codigo_municipio').default('70750'), // Código TSE Santos
    zona: text('zona').notNull(), // ex: "118" ou "272"
    secao: text('secao').notNull(), // ex: "45"
    local_votacao_nome: text('local_votacao_nome'),
    bairro: text('bairro'),
    total_aptos: integer('total_aptos').default(0).notNull(),
    total_comparecimento: integer('total_comparecimento').default(0).notNull(),
    total_abstencoes: integer('total_abstencoes').default(0).notNull(),
    votos_candidato: integer('votos_candidato').default(0).notNull(),
    votos_legenda: integer('votos_legenda').default(0).notNull(),
    votos_brancos: integer('votos_brancos').default(0).notNull(),
    votos_nulos: integer('votos_nulos').default(0).notNull(),
    cargo: text('cargo').default('DEPUTADO FEDERAL').notNull(),
    numero_candidato: text('numero_candidato').notNull(),
    dados_completos_json: text('dados_completos_json').default('{}').notNull(),
    foto_comprovante_url: text('foto_comprovante_url'),
    remetente_whatsapp: text('remetente_whatsapp'),
    remetente_nome: text('remetente_nome'),
    validado: boolean('validado').default(true).notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_bu_zona_secao').on(table.zona, table.secao),
    index('idx_bu_numero_candidato').on(table.numero_candidato),
    index('idx_bu_created_at').on(table.created_at),
  ]
);

// ─── Configurações da WhatsApp Cloud API Oficial da Meta ─────────────────────
export const metaWppConfig = pgTable('meta_wpp_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  phone_number_id: text('phone_number_id'),
  waba_id: text('waba_id'),
  access_token: text('access_token'),
  verify_token: text('verify_token').default('painel_eleitoral_meta_webhook_2026').notNull(),
  display_phone_number: text('display_phone_number'),
  status: text('status', {
    enum: ['CONFIG_PENDING', 'CONNECTED', 'ERROR'],
  }).default('CONFIG_PENDING').notNull(),
  webhook_url: text('webhook_url').default('http://191.252.201.102/api/whatsapp/meta-webhook').notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── PII Vault (Dados Pessoais Criptografados - AES-256-GCM + Blind Index) ────
export const eleitoresIdentidade = pgTable(
  'eleitores_identidade',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    nome_enc: text('nome_enc').notNull(),
    whatsapp_enc: text('whatsapp_enc').notNull(),
    cpf_enc: text('cpf_enc'),
    blind_index_whatsapp: text('blind_index_whatsapp').notNull(),
    blind_index_cpf: text('blind_index_cpf'),
    key_version: text('key_version').default('v1').notNull(),
    consentimento_lgpd: boolean('consentimento_lgpd').default(true).notNull(),
    opt_out_at: timestamp('opt_out_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_eleitores_blind_wpp').on(table.blind_index_whatsapp),
    index('idx_eleitores_blind_cpf').on(table.blind_index_cpf),
    index('idx_eleitores_consentimento').on(table.consentimento_lgpd),
  ]
);

// ─── Dados Eleitorais Analíticos Descaracterizados (Estatística e Território) ──
export const eleitoresAnalitico = pgTable(
  'eleitores_analitico',
  {
    id: uuid('id').primaryKey().references(() => eleitoresIdentidade.id, { onDelete: 'cascade' }),
    h3_index: text('h3_index').notNull(), // Uber H3 Resolução 8
    bairro: text('bairro').notNull(),
    zona_eleitoral: text('zona_eleitoral'),
    secao_eleitoral: text('secao_eleitoral'),
    score_engajamento: numeric('score_engajamento').default('50.0').notNull(),
    indice_sentimento: numeric('indice_sentimento').default('0.0').notNull(), // -1.0 a +1.0
    votos_influenciados: integer('votos_influenciados').default(1).notNull(),
    pauta_prioritaria: text('pauta_prioritaria'),
    logical_clock: integer('logical_clock').default(0).notNull(),
    last_sync_at: timestamp('last_sync_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_eleitores_analitico_h3').on(table.h3_index),
    index('idx_eleitores_analitico_bairro').on(table.bairro),
    index('idx_eleitores_analitico_score').on(table.score_engajamento),
  ]
);

// ─── Log Distribuído de Mutações Offline-First (CRDT / Vector Clocks) ─────────
export const syncMutationsLog = pgTable(
  'sync_mutations_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mutation_id: text('mutation_id').notNull().unique(), // UUIDv7 do dispositivo
    device_id: text('device_id').notNull(),
    logical_clock: integer('logical_clock').notNull(),
    entity: text('entity').notNull(),
    record_id: uuid('record_id').notNull(),
    operation: text('operation').notNull(), // INSERT, UPDATE, DELETE
    delta_payload: text('delta_payload').notNull(),
    hash_sha256: text('hash_sha256').notNull(),
    status: text('status').default('COMMITTED').notNull(), // COMMITTED, REJECTED_LGPD, CONFLICT_RESOLVED
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_sync_device_clock').on(table.device_id, table.logical_clock),
    index('idx_sync_record_id').on(table.record_id),
    index('idx_sync_status').on(table.status),
  ]
);

// ─── Inteligência Geoespacial Hexagonal (H3 Resolução 8) ────────────────────
export const territorioHexAnalytics = pgTable(
  'territorio_hex_analytics',
  {
    h3_index: text('h3_index').primaryKey(),
    bairro: text('bairro').notNull(),
    zona_eleitoral: integer('zona_eleitoral').default(118).notNull(),
    total_eleitores: integer('total_eleitores').default(0).notNull(),
    votos_projetados: integer('votos_projetados').default(0).notNull(),
    indice_sentimento_liquido: numeric('indice_sentimento_liquido').default('0.0').notNull(),
    indice_risco_perda: numeric('indice_risco_perda').default('0.0').notNull(),
    indice_rov: numeric('indice_rov').default('0.0').notNull(), // Return on Visit
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_territorio_hex_bairro').on(table.bairro),
    index('idx_territorio_hex_rov').on(table.indice_rov),
    index('idx_territorio_hex_risco').on(table.indice_risco_perda),
  ]
);

// ─── Sirene de Crise (Incidentes Táticos e Cadeia de Custódia Probatória) ────
export const sireneCriseIncidentes = pgTable(
  'sirene_crise_incidentes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    threat_level: text('threat_level', { enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] }).default('HIGH').notNull(),
    topico: text('topico').notNull(),
    sintese_narrativa: text('sintese_narrativa').notNull(),
    contra_narrativas_json: text('contra_narrativas_json').default('[]').notNull(),
    minuta_juridica_json: text('minuta_juridica_json').default('{}').notNull(),
    evidencia_url: text('evidencia_url'),
    evidencia_sha256: text('evidencia_sha256').notNull(),
    status: text('status', { enum: ['DETECTADO', 'EM_RESPOSTA', 'NEUTRALIZADO', 'ARQUIVADO'] }).default('DETECTADO').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_sirene_crise_threat').on(table.threat_level),
    index('idx_sirene_crise_status').on(table.status),
    index('idx_sirene_crise_created').on(table.created_at),
  ]
);

// ─── BI / Simulador de Quociente Eleitoral (Métrica da Vitória) ───────────────
export const biQuocienteEleitoral = pgTable(
  'bi_quociente_eleitoral',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cargo: text('cargo').default('DEPUTADO_FEDERAL').notNull(),
    total_aptos_projetado: integer('total_aptos_projetado').default(340000).notNull(),
    abstencao_esperada_pct: numeric('abstencao_esperada_pct').default('21.50').notNull(),
    brancos_nulos_esperado_pct: numeric('brancos_nulos_esperado_pct').default('8.50').notNull(),
    total_vagas_casa: integer('total_vagas_casa').default(70).notNull(),
    quociente_eleitoral: integer('quociente_eleitoral').default(68000).notNull(),
    meta_nominal_candidato: integer('meta_nominal_candidato').default(55000).notNull(),
    votos_auditados_atual: integer('votos_auditados_atual').default(0).notNull(),
    votos_declarados_atual: integer('votos_declarados_atual').default(0).notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  }
);

// ─── Auditoria Anti-Fraude de Dados Internos (Guerra contra Bots e Fantasmas) ─
export const fraudeAuditoriaLog = pgTable(
  'fraude_auditoria_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    device_id: text('device_id').notNull(),
    coordenador_nome: text('coordenador_nome'),
    status: text('status', {
      enum: ['CLEAN', 'INVESTIGACAO_SUSPEITA', 'FRAUDE_CONFIRMADA_QUARANTINE'],
    }).default('CLEAN').notNull(),
    fraud_score: numeric('fraud_score').default('0.0').notNull(),
    flags_json: text('flags_json').default('[]').notNull(),
    total_auditados: integer('total_auditados').default(0).notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_fraude_device_id').on(table.device_id),
    index('idx_fraude_status').on(table.status),
    index('idx_fraude_created_at').on(table.created_at),
  ]
);

// ─── Inscrições WebPush / VAPID para a Sirene de Crise ────────────────────────
export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuario_id: text('usuario_id').notNull(),
    cargo: text('cargo').default('COORDENACAO').notNull(),
    endpoint: text('endpoint').notNull().unique(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_push_usuario').on(table.usuario_id),
    index('idx_push_endpoint').on(table.endpoint),
  ]
);



