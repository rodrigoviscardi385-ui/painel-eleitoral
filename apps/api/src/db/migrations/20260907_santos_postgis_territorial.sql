-- ============================================================================
-- CONSÓRCIO GERAL-ELEITORAL-2026: ENGENHARIA DE DADOS & INFRAESTRUTURA GEOESPACIAL
-- MIGRAÇÃO DE BANCO: INFRAESTRUTURA TERRITORIAL DE SANTOS / SP (TRE-SP 2026)
-- Target: PostgreSQL 16+ com PostGIS 3.4+ | Sistema de Coordenadas: WGS84 (SRID 4326)
-- ============================================================================

-- 1. Habilitar extensões geoespaciais e de performance
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Tabela: Zonas Eleitorais de Santos (118ª, 272ª e 273ª ZEs)
CREATE TABLE IF NOT EXISTS zonas_eleitorais (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_zona VARCHAR(10) NOT NULL UNIQUE,       -- '118', '272', '273'
    municipio VARCHAR(100) NOT NULL DEFAULT 'Santos',
    uf VARCHAR(2) NOT NULL DEFAULT 'SP',
    total_eleitores_aptos INT NOT NULL DEFAULT 0,
    descricao_regiao TEXT,                         -- Ex: 'Centro, Morros e Zona Noroeste'
    geom GEOMETRY(MultiPolygon, 4326) NOT NULL,   -- Polígono de delimitação territorial
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tabela: Locais de Votação (Escolas e Colégios Mapeados)
CREATE TABLE IF NOT EXISTS locais_votacao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zona_id UUID NOT NULL REFERENCES zonas_eleitorais(id) ON DELETE CASCADE,
    nome_escola VARCHAR(255) NOT NULL,
    endereco VARCHAR(255) NOT NULL,
    bairro VARCHAR(100) NOT NULL,
    secoes_vinculadas INT[] NOT NULL DEFAULT '{}',
    capacidade_eleitores INT NOT NULL DEFAULT 0,
    geom GEOMETRY(Point, 4326) NOT NULL,           -- Ponto exato da fachada/escola (WGS84)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Tabela: Leads de Eleitores (Captura via WhatsApp / Áudio Whisper)
CREATE TABLE IF NOT EXISTS leads_eleitores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    telefone VARCHAR(30),                          -- Telefone sanitizado (E.164)
    telefone_hash VARCHAR(64),                     -- SHA-256 para anonimização e compliance LGPD
    zona_id UUID REFERENCES zonas_eleitorais(id) ON DELETE SET NULL,
    local_votacao_id UUID REFERENCES locais_votacao(id) ON DELETE SET NULL,
    intencao_voto VARCHAR(50),                     -- Ex: '272', 'SIMPATIZANTE', 'INDECISO'
    score_engajamento NUMERIC(5, 2) DEFAULT 50.0,
    geoloc_captura GEOMETRY(Point, 4326),          -- Ponto GPS da abordagem física (se disponível)
    audio_transcricao_raw TEXT,                    -- Texto bruto vindo do Whisper
    metadata_ner JSONB DEFAULT '{}'::jsonb,        -- Entidades extraídas pelo LLM
    lead_dedup_hash VARCHAR(64) UNIQUE,            -- Hash canônico de desduplicação invisível
    interacoes_count INT NOT NULL DEFAULT 1,
    voluntario_captador_id VARCHAR(100),
    data_cadastro TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Índices Espaciais GiST (Resolução Sub-Milissegundo para Mapas de Calor e Spatial Joins)
CREATE INDEX IF NOT EXISTS idx_zonas_eleitorais_geom 
    ON zonas_eleitorais USING GIST (geom);

CREATE INDEX IF NOT EXISTS idx_locais_votacao_geom 
    ON locais_votacao USING GIST (geom);

CREATE INDEX IF NOT EXISTS idx_leads_eleitores_geoloc 
    ON leads_eleitores USING GIST (geoloc_captura);

-- Índices relacionais e trigrams para buscas ultrarrápidas
CREATE INDEX IF NOT EXISTS idx_leads_eleitores_zona 
    ON leads_eleitores(zona_id);

CREATE INDEX IF NOT EXISTS idx_leads_eleitores_escola 
    ON leads_eleitores(local_votacao_id);

CREATE INDEX IF NOT EXISTS idx_leads_eleitores_nome_trgm 
    ON leads_eleitores USING GIN (nome gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_locais_votacao_bairro 
    ON locais_votacao(bairro);

-- ============================================================================
-- 6. FUNÇÃO DETERMINÍSTICA: INGESTÃO E RESOLUÇÃO ESPACIAL DE LEADS (ÁUDIO BOT)
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_resolver_e_ingerir_lead(
    p_nome VARCHAR,
    p_telefone VARCHAR,
    p_bairro_declarado VARCHAR,
    p_intencao_voto VARCHAR,
    p_longitude DOUBLE PRECISION DEFAULT NULL,
    p_latitude DOUBLE PRECISION DEFAULT NULL,
    p_audio_raw TEXT DEFAULT NULL,
    p_voluntario_id VARCHAR DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_ponto_captura GEOMETRY(Point, 4326) := NULL;
    v_zona_encontrada_id UUID := NULL;
    v_local_votacao_id UUID := NULL;
    v_numero_zona VARCHAR(10) := NULL;
    v_dedup_hash VARCHAR(64);
    v_lead_id UUID;
    v_acao VARCHAR(20);
BEGIN
    -- 1. Construir geometria de captura caso lat/lon sejam válidos
    IF p_longitude IS NOT NULL AND p_latitude IS NOT NULL THEN
        v_ponto_captura := ST_SetSRID(ST_Point(p_longitude, p_latitude), 4326);
    END IF;

    -- 2. Resolver Zona Eleitoral via PostGIS
    IF v_ponto_captura IS NOT NULL THEN
        -- Cruzamento espacial direto no polígono da zona
        SELECT id, numero_zona 
        INTO v_zona_encontrada_id, v_numero_zona
        FROM zonas_eleitorais
        WHERE ST_Contains(geom, v_ponto_captura)
        LIMIT 1;

        -- Localizar escola mais próxima em raio de até 1.500 metros
        SELECT id 
        INTO v_local_votacao_id
        FROM locais_votacao
        WHERE ST_DWithin(geom::geography, v_ponto_captura::geography, 1500)
        ORDER BY ST_Distance(geom::geography, v_ponto_captura::geography) ASC
        LIMIT 1;
    END IF;

    -- 3. Fallback semântico se GPS não estava disponível: inferir por Bairro Oficial
    IF v_zona_encontrada_id IS NULL AND p_bairro_declarado IS NOT NULL THEN
        SELECT lv.zona_id, ze.numero_zona, lv.id
        INTO v_zona_encontrada_id, v_numero_zona, v_local_votacao_id
        FROM locais_votacao lv
        JOIN zonas_eleitorais ze ON ze.id = lv.zona_id
        WHERE LOWER(lv.bairro) = LOWER(TRIM(p_bairro_declarado))
        LIMIT 1;
    END IF;

    -- 4. Cálculo da chave determinística de desduplicação invisível
    -- Se tiver telefone: hash(telefone). Se não tiver: hash(nome_normalizado + bairro)
    IF p_telefone IS NOT NULL AND LENGTH(TRIM(p_telefone)) >= 8 THEN
        v_dedup_hash := encode(sha256(regexp_replace(p_telefone, '\D', '', 'g')::bytea), 'hex');
    ELSE
        v_dedup_hash := encode(sha256(LOWER(TRIM(p_nome) || '_' || COALESCE(p_bairro_declarado, 'santos'))::bytea), 'hex');
    END IF;

    -- 5. Upsert idempotente no PostgreSQL
    INSERT INTO leads_eleitores (
        nome,
        telefone,
        telefone_hash,
        zona_id,
        local_votacao_id,
        intencao_voto,
        geoloc_captura,
        audio_transcricao_raw,
        lead_dedup_hash,
        voluntario_captador_id,
        interacoes_count
    ) VALUES (
        p_nome,
        p_telefone,
        v_dedup_hash,
        v_zona_encontrada_id,
        v_local_votacao_id,
        p_intencao_voto,
        v_ponto_captura,
        p_audio_raw,
        v_dedup_hash,
        p_voluntario_id,
        1
    )
    ON CONFLICT (lead_dedup_hash) DO UPDATE SET
        interacoes_count = leads_eleitores.interacoes_count + 1,
        local_votacao_id = COALESCE(leads_eleitores.local_votacao_id, EXCLUDED.local_votacao_id),
        zona_id = COALESCE(leads_eleitores.zona_id, EXCLUDED.zona_id),
        geoloc_captura = COALESCE(leads_eleitores.geoloc_captura, EXCLUDED.geoloc_captura),
        intencao_voto = COALESCE(EXCLUDED.intencao_voto, leads_eleitores.intencao_voto),
        updated_at = NOW()
    RETURNING id, (CASE WHEN xmax = 0 THEN 'INSERIDO' ELSE 'ATUALIZADO_DEDUP' END)
    INTO v_lead_id, v_acao;

    -- Retornar resultado estruturado para o pipeline do Bot
    RETURN jsonb_build_object(
        'success', true,
        'lead_id', v_lead_id,
        'acao', v_acao,
        'numero_zona', v_numero_zona,
        'zona_id', v_zona_encontrada_id,
        'local_votacao_id', v_local_votacao_id,
        'dedup_hash', v_dedup_hash
    );
END;
$$;
