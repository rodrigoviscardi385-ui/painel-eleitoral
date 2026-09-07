-- Migração: Autenticação Restrita de Colaboradores e Auditoria GPS de Apoiadores
ALTER TABLE equipe_rua ADD COLUMN IF NOT EXISTS senha_hash TEXT;
ALTER TABLE equipe_rua ADD COLUMN IF NOT EXISTS primeiro_acesso_realizado BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE equipe_rua ADD COLUMN IF NOT EXISTS ultimo_login_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS longitude NUMERIC;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cadastrado_por_nome TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cadastrado_por_id TEXT;

CREATE INDEX IF NOT EXISTS idx_usuarios_cadastrado_por ON usuarios(cadastrado_por_id);
