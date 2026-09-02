-- Migration: Chatbot + Materiais Online
-- Execute no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS materiais_online (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT NOT NULL DEFAULT 'LINK' CHECK (tipo IN ('PDF', 'LINK', 'IMAGEM', 'VIDEO')),
  url TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  ativo TEXT NOT NULL DEFAULT 'SIM',
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_materiais_ativo ON materiais_online(ativo);
CREATE INDEX IF NOT EXISTS idx_materiais_tipo ON materiais_online(tipo);

CREATE TABLE IF NOT EXISTS bot_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modo TEXT NOT NULL DEFAULT 'BOT_ATIVO' CHECK (modo IN ('BOT_ATIVO', 'HUMANO', 'HIBRIDO')),
  mensagem_boas_vindas TEXT NOT NULL DEFAULT E'Ola! Sou o assistente virtual da campanha. Como posso ajudar?\n\n1 - Conhecer as propostas\n2 - Receber material de campanha\n3 - Falar com um atendente\n\nDigite o numero da opcao desejada.',
  menu_opcoes TEXT NOT NULL DEFAULT '[{"numero":1,"texto":"Conhecer as propostas","acao":"INFO"},{"numero":2,"texto":"Receber material","acao":"MATERIAL"},{"numero":3,"texto":"Falar com atendente","acao":"HUMANO"}]',
  mensagem_encerramento_bot TEXT NOT NULL DEFAULT 'Obrigado pelo contato! Qualquer duvida, estamos aqui.',
  mensagem_transferencia TEXT NOT NULL DEFAULT 'Aguarde um momento! Vou conectar voce com um atendente da nossa equipe.',
  horario_inicio TEXT NOT NULL DEFAULT '08:00',
  horario_fim TEXT NOT NULL DEFAULT '18:00',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO bot_config (modo)
SELECT 'BOT_ATIVO' WHERE NOT EXISTS (SELECT 1 FROM bot_config);

CREATE TABLE IF NOT EXISTS conversa_status (
  conversa_id TEXT PRIMARY KEY,
  modo TEXT NOT NULL DEFAULT 'BOT' CHECK (modo IN ('BOT', 'HUMANO', 'AGUARDANDO')),
  atendente_nome TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
