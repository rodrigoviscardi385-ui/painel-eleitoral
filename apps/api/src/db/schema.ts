import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

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
    acao: text('acao', {
      enum: ['DESMASCARAR_DADOS', 'EXPORTAR_RELATORIO_PDF', 'DISPARO_MASSA', 'ALTERAR_META'],
    }).notNull(),
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
