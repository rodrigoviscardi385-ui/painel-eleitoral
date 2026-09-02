-- Migration: Personalização da Campanha (White-Label)
-- Execute no Supabase SQL Editor ou PostgreSQL

CREATE TABLE IF NOT EXISTS campanha_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_urna TEXT NOT NULL DEFAULT 'Rodrigo da Saúde',
  nome_completo TEXT NOT NULL DEFAULT 'Rodrigo Viscardi',
  numero_candidato TEXT NOT NULL DEFAULT '2026',
  cargo TEXT NOT NULL DEFAULT 'Deputado Federal',
  partido TEXT NOT NULL DEFAULT 'AVANTE',
  coligacao TEXT NOT NULL DEFAULT 'Coligação Por Dias Melhores',
  slogan TEXT NOT NULL DEFAULT 'Trabalho, honestidade e compromisso com você',
  foto_url TEXT,
  logo_url TEXT,
  cor_primaria TEXT NOT NULL DEFAULT '#10b981',
  cidade TEXT NOT NULL DEFAULT 'São Paulo',
  estado TEXT NOT NULL DEFAULT 'SP',
  data_eleicao TEXT NOT NULL DEFAULT '2026-10-04',
  cnpj_campanha TEXT DEFAULT '00.000.000/0001-00',
  biografia_ia TEXT NOT NULL DEFAULT 'Candidato comprometido com a melhoria da saúde pública, geração de empregos e desenvolvimento sustentável das nossas comunidades.',
  propostas_ia TEXT NOT NULL DEFAULT 'SAÚDE: Fortalecimento dos postos de saúde, redução de filas para exames e valorização dos profissionais.
EDUCAÇÃO: Escolas de tempo integral e tecnologia em sala de aula.
EMPREGO: Apoio ao pequeno empreendedor e incentivos fiscais para empresas locais.',
  tom_voz_ia TEXT NOT NULL DEFAULT 'POPULAR',
  link_grupo_geral TEXT DEFAULT 'https://chat.whatsapp.com/convite-campanha',
  whatsapp_comite TEXT DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inserir registro inicial caso não exista
INSERT INTO campanha_config (nome_urna)
SELECT 'Rodrigo da Saúde' WHERE NOT EXISTS (SELECT 1 FROM campanha_config);
