-- ============================================================================
-- PAINEL ELEITORAL 2026: MÓDULO EXCLUSIVO DE EQUIPE DE RUA & CONTRATOS TSE
-- Tabela: equipe_rua (Conforme Lei 9.504/1997 art. 100 e Resolução TSE 23.607/2019)
-- ============================================================================

CREATE TABLE IF NOT EXISTS equipe_rua (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_completo TEXT NOT NULL,
    cpf VARCHAR(14) NOT NULL UNIQUE,
    rg VARCHAR(30) NOT NULL,
    rg_orgao_emissor VARCHAR(30) NOT NULL DEFAULT 'SSP/SP',
    titulo_eleitor VARCHAR(20),
    zona_eleitoral VARCHAR(10),
    secao_eleitoral VARCHAR(10),
    telefone_whatsapp VARCHAR(30) NOT NULL,
    endereco_completo TEXT NOT NULL,
    bairro VARCHAR(100) NOT NULL,
    cidade VARCHAR(100) NOT NULL DEFAULT 'Santos',
    uf VARCHAR(2) NOT NULL DEFAULT 'SP',
    cep VARCHAR(10) NOT NULL,

    -- Dados Bancários para Pagamento Eleitoral (TSE)
    dados_bancarios_banco TEXT,
    dados_bancarios_agencia TEXT,
    dados_bancarios_conta TEXT,
    chave_pix TEXT,

    -- Contratação & Jornada
    funcao_atividade TEXT NOT NULL DEFAULT 'MOBILIZADOR_RUA',
    tipo_jornada TEXT NOT NULL DEFAULT 'MEIO_PERIODO', -- 'MEIO_PERIODO' (4h) ou 'PERIODO_INTEGRAL' (8h)
    carga_horaria_semanal INT NOT NULL DEFAULT 20,     -- 20h para meio período, 40h para integral
    remuneracao_pactuada NUMERIC(10, 2) NOT NULL DEFAULT 1500.00,
    forma_pagamento TEXT NOT NULL DEFAULT 'PIX_CONTA_CAMPANHA',

    -- Vigência da Campanha
    data_inicio TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    data_fim TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '45 days'),

    -- Status e Auditoria
    status_contrato TEXT NOT NULL DEFAULT 'MINUTA_GERADA', -- 'MINUTA_GERADA', 'ASSINADO', 'PAGO', 'CANCELADO'
    observacoes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equipe_rua_cpf ON equipe_rua(cpf);
CREATE INDEX IF NOT EXISTS idx_equipe_rua_whatsapp ON equipe_rua(telefone_whatsapp);
CREATE INDEX IF NOT EXISTS idx_equipe_rua_tipo_jornada ON equipe_rua(tipo_jornada);
CREATE INDEX IF NOT EXISTS idx_equipe_rua_funcao ON equipe_rua(funcao_atividade);
CREATE INDEX IF NOT EXISTS idx_equipe_rua_status ON equipe_rua(status_contrato);
