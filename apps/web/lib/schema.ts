import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core';

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
    tags: text('tags').default('[]').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  }
);
