import { pgTable, uuid, text, integer, timestamp, index, boolean } from 'drizzle-orm/pg-core';

export const usuarios = pgTable(
  'usuarios',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    nome: text('nome').notNull(),
    whatsapp: text('whatsapp').notNull().unique(),
    cargo: text('cargo', { enum: ['ADMIN', 'GESTOR', 'LIDER', 'APOIADOR'] }).default('APOIADOR').notNull(),
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
    opt_out: boolean('opt_out').default(false).notNull(),
    notas: text('notas'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  }
);

export const metas = pgTable(
  'metas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    titulo: text('titulo').notNull(),
    tipo: text('tipo', { enum: ['GLOBAL', 'ZONA', 'BAIRRO', 'LIDER'] }).default('GLOBAL').notNull(),
    alvo_referencia: text('alvo_referencia'),
    quantidade_meta: integer('quantidade_meta').default(100).notNull(),
    quantidade_atual: integer('quantidade_atual').default(0).notNull(),
    data_inicio: timestamp('data_inicio', { withTimezone: true }).defaultNow().notNull(),
    data_fim: timestamp('data_fim', { withTimezone: true }).notNull(),
    meta_diaria_cadencia: integer('meta_diaria_cadencia').default(5).notNull(),
    status_semaforo: text('status_semaforo', { enum: ['VERDE', 'AMARELO', 'VERMELHO'] }).default('VERDE').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  }
);

export const usuariosAuth = pgTable(
  'usuarios_auth',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuario_id: uuid('usuario_id'),
    nome: text('nome').notNull(),
    email: text('email').notNull().unique(),
    whatsapp: text('whatsapp'),
    senha_hash: text('senha_hash').notNull(),
    role: text('role', { enum: ['ADMIN', 'COORDENADOR', 'OPERADOR', 'LIDER'] }).default('OPERADOR').notNull(),
    permissoes: text('permissoes').default('["CHAT"]').notNull(),
    ativo: text('ativo').default('SIM').notNull(),
    ultimo_login: timestamp('ultimo_login', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  }
);

export const mensagensChat = pgTable(
  'mensagens_chat',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversa_id: text('conversa_id').notNull(),
    de_whatsapp: text('de_whatsapp').notNull(),
    para_whatsapp: text('para_whatsapp').notNull(),
    remetente_nome: text('remetente_nome'),
    conteudo: text('conteudo').notNull(),
    tipo: text('tipo', { enum: ['TEXTO', 'AUDIO', 'IMAGEM', 'DOCUMENTO'] }).default('TEXTO').notNull(),
    direcao: text('direcao', { enum: ['ENTRADA', 'SAIDA'] }).notNull(),
    status: text('status', { enum: ['PENDENTE', 'ENVIADO', 'ENTREGUE', 'LIDO', 'ERRO'] }).default('PENDENTE').notNull(),
    midia_url: text('midia_url'),
    atendente_nome: text('atendente_nome'),
    setor: text('setor').default('GERAL').notNull(),
    tags: text('tags').default('[]').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  }
);

export const materiaisOnline = pgTable(
  'materiais_online',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    titulo: text('titulo').notNull(),
    descricao: text('descricao'),
    tipo: text('tipo', { enum: ['PDF', 'LINK', 'IMAGEM', 'VIDEO'] }).default('LINK').notNull(),
    url: text('url').notNull(),
    tags: text('tags').default('[]').notNull(),
    ativo: text('ativo').default('SIM').notNull(),
    ordem: integer('ordem').default(0).notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  }
);

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

export const conversaStatus = pgTable(
  'conversa_status',
  {
    conversa_id: text('conversa_id').primaryKey(),
    modo: text('modo', { enum: ['BOT', 'HUMANO', 'AGUARDANDO'] }).default('BOT').notNull(),
    atendente_nome: text('atendente_nome'),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  }
);

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
  cor_primaria: text('cor_primaria').default('#10b981').notNull(),
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
  tom_voz_ia: text('tom_voz_ia').default('POPULAR').notNull(),
  link_grupo_geral: text('link_grupo_geral').default('https://chat.whatsapp.com/convite-campanha'),
  whatsapp_comite: text('whatsapp_comite').default(''),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
