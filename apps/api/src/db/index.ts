import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.js';
import { eq, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const connectionString =
  process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== ''
    ? process.env.DATABASE_URL
    : 'postgresql://postgres:Gustavo%2355955@127.0.0.1:5432/painel_eleitoral';

export const queryClient = postgres(connectionString, {
  max: 15,
  idle_timeout: 30,
  connect_timeout: 10,
});

export const db = drizzle(queryClient, { schema });

/**
 * Inicializa e garante a existência das tabelas no PostgreSQL da VPS
 * Cria índices e insere o registro inicial de configuração da campanha se não existir.
 */
export async function initDatabase() {
  console.log('[DB] Verificando e inicializando tabelas do PostgreSQL...');

  // 1. Extensão pgcrypto para UUIDs
  await queryClient`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`;

  // 2. Tabela usuarios
  await queryClient`
    CREATE TABLE IF NOT EXISTS usuarios (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nome TEXT NOT NULL,
      whatsapp TEXT NOT NULL UNIQUE,
      cargo TEXT NOT NULL DEFAULT 'APOIADOR',
      lider_acima_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
      bairro TEXT,
      zona_eleitoral TEXT,
      secao_eleitoral TEXT,
      status_onboarding TEXT NOT NULL DEFAULT 'COMPLETO',
      grupo_whatsapp_id TEXT,
      grupo_link_convite TEXT,
      total_indicados_diretos INTEGER NOT NULL DEFAULT 0,
      total_indicados_rede INTEGER NOT NULL DEFAULT 0,
      opt_out BOOLEAN NOT NULL DEFAULT false,
      notas TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  // 3. Tabela metas
  await queryClient`
    CREATE TABLE IF NOT EXISTS metas (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      titulo TEXT NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'GLOBAL',
      alvo_referencia TEXT,
      quantidade_meta INTEGER NOT NULL DEFAULT 100,
      quantidade_atual INTEGER NOT NULL DEFAULT 0,
      data_inicio TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      data_fim TIMESTAMPTZ NOT NULL,
      meta_diaria_cadencia INTEGER NOT NULL DEFAULT 5,
      status_semaforo TEXT NOT NULL DEFAULT 'VERDE',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  // 4. Tabela disparos_campanha
  await queryClient`
    CREATE TABLE IF NOT EXISTS disparos_campanha (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      titulo TEXT NOT NULL,
      mensagem_template TEXT NOT NULL,
      url_midia_pdf TEXT,
      filtro_tipo TEXT NOT NULL DEFAULT 'TODOS',
      filtro_valor TEXT,
      total_alvos INTEGER NOT NULL DEFAULT 0,
      total_enviados INTEGER NOT NULL DEFAULT 0,
      total_erros INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'PENDENTE',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  // 5. Tabela disparos_itens
  await queryClient`
    CREATE TABLE IF NOT EXISTS disparos_itens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      disparo_id UUID NOT NULL REFERENCES disparos_campanha(id) ON DELETE CASCADE,
      usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      whatsapp_destino TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDENTE',
      mensagem_final TEXT,
      erro_detalhe TEXT,
      enviado_em TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  // 6. Tabela logs_auditoria_lgpd
  await queryClient`
    CREATE TABLE IF NOT EXISTS logs_auditoria_lgpd (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      usuario_responsavel TEXT NOT NULL,
      acao TEXT NOT NULL,
      ip TEXT,
      detalhes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  // 7. Tabela usuarios_auth
  await queryClient`
    CREATE TABLE IF NOT EXISTS usuarios_auth (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      whatsapp TEXT,
      senha_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'OPERADOR',
      permissoes TEXT NOT NULL DEFAULT '["CHAT"]',
      ativo TEXT NOT NULL DEFAULT 'SIM',
      ultimo_login TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  // 8. Tabela mensagens_chat
  await queryClient`
    CREATE TABLE IF NOT EXISTS mensagens_chat (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversa_id TEXT NOT NULL,
      de_whatsapp TEXT NOT NULL,
      para_whatsapp TEXT NOT NULL,
      remetente_nome TEXT,
      conteudo TEXT NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'TEXTO',
      direcao TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDENTE',
      midia_url TEXT,
      atendente_nome TEXT,
      setor TEXT NOT NULL DEFAULT 'GERAL',
      tags TEXT NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  // 9. Tabela conversa_status
  await queryClient`
    CREATE TABLE IF NOT EXISTS conversa_status (
      conversa_id TEXT PRIMARY KEY,
      modo TEXT NOT NULL DEFAULT 'BOT',
      atendente_nome TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  // 10. Tabela campanha_config
  await queryClient`
    CREATE TABLE IF NOT EXISTS campanha_config (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nome_urna TEXT NOT NULL DEFAULT 'Gustavo Reis',
      nome_completo TEXT NOT NULL DEFAULT 'Gustavo Reis',
      numero_candidato TEXT NOT NULL DEFAULT '55955',
      cargo TEXT NOT NULL DEFAULT 'Deputado Federal',
      partido TEXT NOT NULL DEFAULT 'PSD',
      coligacao TEXT NOT NULL DEFAULT 'Coligação Por Dias Melhores',
      slogan TEXT NOT NULL DEFAULT 'Trabalho, honestidade e compromisso com você',
      foto_url TEXT,
      logo_url TEXT,
      cor_primaria TEXT NOT NULL DEFAULT '#10b981',
      cidade TEXT NOT NULL DEFAULT 'Santos',
      estado TEXT NOT NULL DEFAULT 'SP',
      data_eleicao TEXT NOT NULL DEFAULT '2026-10-04',
      cnpj_campanha TEXT DEFAULT '00.000.000/0001-00',
      biografia_ia TEXT NOT NULL DEFAULT 'Candidato focado em saúde, educação e desenvolvimento regional.',
      propostas_ia TEXT NOT NULL DEFAULT 'SAÚDE: ampliação de UBS e exames rápidos.\nEDUCAÇÃO: escolas em tempo integral.\nEMPREGO: atração de empresas e polos de inovação.',
      tom_voz_ia TEXT NOT NULL DEFAULT 'POPULAR',
      link_grupo_geral TEXT DEFAULT 'https://chat.whatsapp.com/convite-campanha',
      whatsapp_comite TEXT DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  // 11. Tabela gastos_campanha
  await queryClient`
    CREATE TABLE IF NOT EXISTS gastos_campanha (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      descricao TEXT NOT NULL,
      categoria TEXT NOT NULL DEFAULT 'OUTROS',
      valor NUMERIC(12, 2) NOT NULL,
      data_gasto TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      forma_pagamento TEXT NOT NULL DEFAULT 'PIX',
      fornecedor_nome TEXT,
      fornecedor_documento TEXT,
      numero_documento TEXT,
      comprovante_url TEXT,
      responsavel_nome TEXT,
      status_auditoria TEXT NOT NULL DEFAULT 'PENDENTE',
      observacoes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  // 12. Tabela chip_warming_config
  await queryClient`
    CREATE TABLE IF NOT EXISTS chip_warming_config (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      instance_name TEXT NOT NULL UNIQUE DEFAULT 'campanha_2026',
      status TEXT NOT NULL DEFAULT 'PAUSADO',
      fase_atual INTEGER NOT NULL DEFAULT 1,
      dias_ativos INTEGER NOT NULL DEFAULT 0,
      msgs_enviadas_hoje INTEGER NOT NULL DEFAULT 0,
      limite_diario_atual INTEGER NOT NULL DEFAULT 10,
      health_score INTEGER NOT NULL DEFAULT 35,
      numeros_parceiros TEXT NOT NULL DEFAULT '[]',
      simular_digitacao BOOLEAN NOT NULL DEFAULT true,
      delays_gaussianos BOOLEAN NOT NULL DEFAULT true,
      ultimo_ciclo_em TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  // 13. Tabela materiais_campanha
  await queryClient`
    CREATE TABLE IF NOT EXISTS materiais_campanha (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      titulo TEXT NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'PDF',
      url TEXT NOT NULL,
      descricao TEXT,
      tamanho_bytes INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  // 14. Tabela bot_config
  await queryClient`
    CREATE TABLE IF NOT EXISTS bot_config (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ativo BOOLEAN NOT NULL DEFAULT true,
      modo_padrao TEXT NOT NULL DEFAULT 'BOT',
      mensagem_boas_vindas TEXT NOT NULL DEFAULT 'Olá! Seja muito bem-vindo ao canal oficial da nossa campanha. Como posso te ajudar hoje?',
      menu_opcoes TEXT NOT NULL DEFAULT '1 - Conhecer as propostas do candidato\n2 - Falar com a equipe do comitê\n3 - Indicar apoiadores e eleitores\n4 - Receber materiais e santinho virtual\n5 - Conectar ao grupo do seu bairro',
      mensagem_encerramento TEXT NOT NULL DEFAULT 'Agradecemos imensamente o seu contato! Juntos construiremos uma cidade cada vez melhor.',
      mensagem_fora_horario TEXT NOT NULL DEFAULT 'Olá! Nosso horário de atendimento no comitê é das 08:00 às 20:00. Deixe sua mensagem que responderemos assim que iniciarmos o expediente!',
      horario_inicio TEXT NOT NULL DEFAULT '08:00',
      horario_fim TEXT NOT NULL DEFAULT '20:00',
      dias_funcionamento TEXT NOT NULL DEFAULT '["SEG", "TER", "QUA", "QUI", "SEX", "SAB"]',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  // 15. Tabela gestores_campanha
  await queryClient`
    CREATE TABLE IF NOT EXISTS gestores_campanha (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nome TEXT NOT NULL,
      whatsapp TEXT NOT NULL UNIQUE,
      cargo TEXT NOT NULL DEFAULT 'COORDENADOR GERAL',
      notificar_novos_grupos BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  // 16. Tabela boletins_urna (Apuração Prévia QR-BU)
  await queryClient`
    CREATE TABLE IF NOT EXISTS boletins_urna (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      municipio TEXT NOT NULL DEFAULT 'Santos',
      codigo_municipio TEXT NOT NULL DEFAULT '70750',
      zona TEXT NOT NULL,
      secao TEXT NOT NULL,
      local_votacao_nome TEXT,
      bairro TEXT,
      total_aptos INTEGER NOT NULL DEFAULT 0,
      total_comparecimento INTEGER NOT NULL DEFAULT 0,
      total_abstencoes INTEGER NOT NULL DEFAULT 0,
      votos_candidato INTEGER NOT NULL DEFAULT 0,
      votos_legenda INTEGER NOT NULL DEFAULT 0,
      votos_brancos INTEGER NOT NULL DEFAULT 0,
      votos_nulos INTEGER NOT NULL DEFAULT 0,
      cargo TEXT NOT NULL DEFAULT 'DEPUTADO FEDERAL',
      numero_candidato TEXT NOT NULL,
      dados_completos_json TEXT NOT NULL DEFAULT '{}',
      foto_comprovante_url TEXT,
      remetente_whatsapp TEXT,
      remetente_nome TEXT,
      validado BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  // 17. Tabela eleitores_identidade (PII Vault)
  await queryClient`
    CREATE TABLE IF NOT EXISTS eleitores_identidade (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nome_enc TEXT NOT NULL,
      whatsapp_enc TEXT NOT NULL,
      cpf_enc TEXT,
      blind_index_whatsapp TEXT NOT NULL,
      blind_index_cpf TEXT,
      key_version TEXT NOT NULL DEFAULT 'v1',
      consentimento_lgpd BOOLEAN NOT NULL DEFAULT true,
      opt_out_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  // 18. Tabela eleitores_analitico (Métricas e Território)
  await queryClient`
    CREATE TABLE IF NOT EXISTS eleitores_analitico (
      id UUID PRIMARY KEY REFERENCES eleitores_identidade(id) ON DELETE CASCADE,
      h3_index TEXT NOT NULL,
      bairro TEXT NOT NULL,
      zona_eleitoral TEXT,
      secao_eleitoral TEXT,
      score_engajamento NUMERIC NOT NULL DEFAULT 50.0,
      indice_sentimento NUMERIC NOT NULL DEFAULT 0.0,
      votos_influenciados INTEGER NOT NULL DEFAULT 1,
      pauta_prioritaria TEXT,
      logical_clock INTEGER NOT NULL DEFAULT 0,
      last_sync_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  // 19. Tabela sync_mutations_log (Sincronização Offline-First e CRDT)
  await queryClient`
    CREATE TABLE IF NOT EXISTS sync_mutations_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      mutation_id TEXT NOT NULL UNIQUE,
      device_id TEXT NOT NULL,
      logical_clock INTEGER NOT NULL,
      entity TEXT NOT NULL,
      record_id UUID NOT NULL,
      operation TEXT NOT NULL,
      delta_payload TEXT NOT NULL,
      hash_sha256 TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'COMMITTED',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  // 20. Tabela territorio_hex_analytics (Uber H3 Resolução 8)
  await queryClient`
    CREATE TABLE IF NOT EXISTS territorio_hex_analytics (
      h3_index TEXT PRIMARY KEY,
      bairro TEXT NOT NULL,
      zona_eleitoral INTEGER NOT NULL DEFAULT 118,
      total_eleitores INTEGER NOT NULL DEFAULT 0,
      votos_projetados INTEGER NOT NULL DEFAULT 0,
      indice_sentimento_liquido NUMERIC NOT NULL DEFAULT 0.0,
      indice_risco_perda NUMERIC NOT NULL DEFAULT 0.0,
      indice_rov NUMERIC NOT NULL DEFAULT 0.0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  // 21. Tabela sirene_crise_incidentes (Alertas Táticos da Sirene de Crise)
  await queryClient`
    CREATE TABLE IF NOT EXISTS sirene_crise_incidentes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      threat_level TEXT NOT NULL DEFAULT 'HIGH',
      topico TEXT NOT NULL,
      sintese_narrativa TEXT NOT NULL,
      contra_narrativas_json TEXT NOT NULL DEFAULT '[]',
      minuta_juridica_json TEXT NOT NULL DEFAULT '{}',
      evidencia_url TEXT,
      evidencia_sha256 TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'DETECTADO',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  // 22. Tabela bi_quociente_eleitoral (BI Executivo / Métrica da Vitória)
  await queryClient`
    CREATE TABLE IF NOT EXISTS bi_quociente_eleitoral (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      cargo TEXT NOT NULL DEFAULT 'DEPUTADO_FEDERAL',
      total_aptos_projetado INT NOT NULL DEFAULT 340000,
      abstencao_esperada_pct NUMERIC(4,2) NOT NULL DEFAULT 21.50,
      brancos_nulos_esperado_pct NUMERIC(4,2) NOT NULL DEFAULT 8.50,
      total_vagas_casa INT NOT NULL DEFAULT 70,
      quociente_eleitoral INT NOT NULL DEFAULT 68000,
      meta_nominal_candidato INT NOT NULL DEFAULT 55000,
      votos_auditados_atual INT NOT NULL DEFAULT 0,
      votos_declarados_atual INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  // 23. Tabela fraude_auditoria_log (Anti-Fraud Guard)
  await queryClient`
    CREATE TABLE IF NOT EXISTS fraude_auditoria_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      device_id TEXT NOT NULL,
      coordenador_nome TEXT,
      status TEXT NOT NULL DEFAULT 'CLEAN',
      fraud_score NUMERIC NOT NULL DEFAULT 0.0,
      flags_json TEXT NOT NULL DEFAULT '[]',
      total_auditados INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  // 24. Tabela push_subscriptions (WebPush RFC 8030 / VAPID)
  await queryClient`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      usuario_id TEXT NOT NULL,
      cargo TEXT NOT NULL DEFAULT 'COORDENACAO',
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  // Criação de índices estratégicos de performance
  await queryClient`CREATE INDEX IF NOT EXISTS idx_usuarios_whatsapp ON usuarios(whatsapp);`;
  await queryClient`CREATE INDEX IF NOT EXISTS idx_usuarios_lider_acima ON usuarios(lider_acima_id);`;
  await queryClient`CREATE INDEX IF NOT EXISTS idx_usuarios_cargo ON usuarios(cargo);`;
  await queryClient`CREATE INDEX IF NOT EXISTS idx_mensagens_chat_conv ON mensagens_chat(conversa_id);`;
  await queryClient`CREATE INDEX IF NOT EXISTS idx_mensagens_chat_data ON mensagens_chat(created_at);`;
  await queryClient`CREATE INDEX IF NOT EXISTS idx_gastos_categoria ON gastos_campanha(categoria);`;
  await queryClient`CREATE INDEX IF NOT EXISTS idx_materiais_tipo ON materiais_campanha(tipo);`;
  await queryClient`CREATE INDEX IF NOT EXISTS idx_gestores_whatsapp ON gestores_campanha(whatsapp);`;
  await queryClient`CREATE INDEX IF NOT EXISTS idx_eleitores_blind_wpp ON eleitores_identidade(blind_index_whatsapp);`;
  await queryClient`CREATE INDEX IF NOT EXISTS idx_eleitores_analitico_h3 ON eleitores_analitico(h3_index);`;
  await queryClient`CREATE INDEX IF NOT EXISTS idx_sync_mutations_clock ON sync_mutations_log(device_id, logical_clock);`;
  await queryClient`CREATE INDEX IF NOT EXISTS idx_territorio_hex_rov ON territorio_hex_analytics(indice_rov);`;
  await queryClient`CREATE INDEX IF NOT EXISTS idx_sirene_crise_status ON sirene_crise_incidentes(status);`;
  await queryClient`CREATE INDEX IF NOT EXISTS idx_fraude_device_id ON fraude_auditoria_log(device_id);`;
  await queryClient`CREATE INDEX IF NOT EXISTS idx_push_endpoint ON push_subscriptions(endpoint);`;

  // Seed da Configuração da Campanha se vazia
  const existingConfig = await db.select().from(schema.campanhaConfig).limit(1);
  if (existingConfig.length === 0) {
    await db.insert(schema.campanhaConfig).values({
      nome_urna: 'Gustavo Reis',
      nome_completo: 'Gustavo Reis',
      numero_candidato: '55955',
      cargo: 'Deputado Federal',
      partido: 'PSD',
      coligacao: 'Coligação Por Dias Melhores',
      slogan: 'Trabalho, honestidade e compromisso com você',
      cidade: 'Santos',
      estado: 'SP',
      cor_primaria: '#10b981',
      biografia_ia:
        'Gustavo Reis é candidato a Deputado Federal com forte compromisso com a saúde de qualidade, geração de empregos e desenvolvimento sustentável.',
      propostas_ia:
        'SAÚDE: Postos de saúde equipados e fila zero para cirurgias eletivas.\nEDUCAÇÃO: Valorização docente e tecnologia nas escolas.\nEMPREGO: Incentivo ao polo industrial e desoneração de pequenos negócios.',
      tom_voz_ia: 'POPULAR',
    });
    console.log('[DB] Campanha inicial inserida com sucesso.');
  }

  // Seed do Usuário Administrador Master se vazio
  const existingAdmin = await db.select().from(schema.usuariosAuth).limit(1);
  if (existingAdmin.length === 0) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('admin123', salt);
    await db.insert(schema.usuariosAuth).values({
      nome: 'Administrador Master',
      email: 'admin@painel2026.com.br',
      senha_hash: hash,
      role: 'ADMIN',
      permissoes: JSON.stringify(['ALL', 'CHAT', 'LIDERANCAS', 'DISPAROS', 'FINANCEIRO', 'CONFIG']),
      ativo: 'SIM',
    });
    console.log('[DB] Usuário Administrador Master criado: admin@painel2026.com.br / admin123');
  }

  // Seed do Chip Warming Config se vazio
  const existingChip = await db.select().from(schema.chipWarmingConfig).limit(1);
  if (existingChip.length === 0) {
    await db.insert(schema.chipWarmingConfig).values({
      instance_name: 'campanha_2026',
      status: 'PAUSADO',
      fase_atual: 1,
      limite_diario_atual: 15,
      health_score: 50,
      numeros_parceiros: '[]',
      simular_digitacao: true,
      delays_gaussianos: true,
    });
    console.log('[DB] Chip warming config inicializado.');
  }

  // Seed de Metas Iniciais se vazia
  const existingMetas = await db.select().from(schema.metas).limit(1);
  if (existingMetas.length === 0) {
    const dataFim = new Date('2026-10-04T23:59:59Z');
    await db.insert(schema.metas).values([
      {
        titulo: 'Meta Geral de Eleitores Cadastrados',
        tipo: 'GLOBAL',
        quantidade_meta: 20000,
        quantidade_atual: 0,
        data_fim: dataFim,
        meta_diaria_cadencia: 50,
        status_semaforo: 'VERDE',
      },
      {
        titulo: 'Rede de Lideranças Capitais (Santos/Baixada)',
        tipo: 'ZONA',
        alvo_referencia: 'Zona 118',
        quantidade_meta: 5000,
        quantidade_atual: 0,
        data_fim: dataFim,
        meta_diaria_cadencia: 15,
        status_semaforo: 'VERDE',
      },
    ]);
    console.log('[DB] Metas iniciais de campanha cadastradas.');
  }

  // Seed do Bot Config se vazio
  const existingBot = await db.select().from(schema.botConfig).limit(1);
  if (existingBot.length === 0) {
    await db.insert(schema.botConfig).values({
      ativo: true,
      modo_padrao: 'BOT',
      mensagem_boas_vindas: 'Olá! Seja muito bem-vindo ao canal oficial da nossa campanha. Como posso te ajudar hoje?',
      menu_opcoes: '1 - Conhecer as propostas do candidato\n2 - Falar com a equipe do comitê\n3 - Indicar apoiadores e eleitores\n4 - Receber materiais e santinho virtual\n5 - Conectar ao grupo do seu bairro',
      mensagem_encerramento: 'Agradecemos imensamente o seu contato! Juntos construiremos uma cidade cada vez melhor.',
      mensagem_fora_horario: 'Olá! Nosso horário de atendimento no comitê é das 08:00 às 20:00. Deixe sua mensagem que responderemos assim que iniciarmos o expediente!',
      horario_inicio: '08:00',
      horario_fim: '20:00',
      dias_funcionamento: '["SEG", "TER", "QUA", "QUI", "SEX", "SAB"]',
    });
    console.log('[DB] Configurações padrão do Chatbot inseridas.');
  }

  // Seed de Materiais Iniciais se vazio
  const existingMateriais = await db.select().from(schema.materiaisCampanha).limit(1);
  if (existingMateriais.length === 0) {
    await db.insert(schema.materiaisCampanha).values([
      {
        titulo: 'Santinho Digital Oficial 55955',
        tipo: 'SANTINHO',
        url: 'https://painel2026.com.br/materiais/santinho_55955.jpg',
        descricao: 'Santinho oficial em alta resolução para compartilhamento em grupos de WhatsApp e redes sociais.',
        tamanho_bytes: 450000,
      },
      {
        titulo: 'Plano de Governo e Propostas 2026',
        tipo: 'PDF',
        url: 'https://painel2026.com.br/materiais/plano_de_governo.pdf',
        descricao: 'Caderno completo com diretrizes e metas para Saúde, Educação e Emprego.',
        tamanho_bytes: 1850000,
      },
      {
        titulo: 'Vídeo Manifesto de Lançamento da Campanha',
        tipo: 'VIDEO',
        url: 'https://youtube.com/watch?v=campanha2026_oficial',
        descricao: 'Apresentação biográfica e trajetória de Gustavo Reis.',
        tamanho_bytes: 12000000,
      },
    ]);
    console.log('[DB] Materiais iniciais de campanha inseridos.');
  }

  // Seed de Gestor Coordenador se vazio
  const existingGestor = await db.select().from(schema.gestoresCampanha).limit(1);
  if (existingGestor.length === 0) {
    await db.insert(schema.gestoresCampanha).values({
      nome: 'Coordenador Geral de Campanha',
      whatsapp: '5511999998888',
      cargo: 'COORDENADOR GERAL',
      notificar_novos_grupos: true,
    });
    console.log('[DB] Gestor geral padrão inserido.');
  }

  console.log('[DB] Inicialização do banco concluída com sucesso!');
}

/**
 * Recalcula as métricas da rede hierárquica para um líder e seus ancestrais
 * Utiliza Common Table Expression (CTE) recursiva no PostgreSQL para máxima velocidade.
 */
export async function recalculateNetworkMetrics(userId?: string) {
  if (!userId) {
    // Recalcula para todos os usuários
    await queryClient`
      WITH RECURSIVE subordinates AS (
        SELECT id, lider_acima_id, id as root_id
        FROM usuarios
        WHERE lider_acima_id IS NOT NULL

        UNION ALL

        SELECT u.id, u.lider_acima_id, s.root_id
        FROM usuarios u
        INNER JOIN subordinates s ON s.id = u.lider_acima_id
      ),
      direct_counts AS (
        SELECT lider_acima_id, COUNT(*) as direct_count
        FROM usuarios
        WHERE lider_acima_id IS NOT NULL
        GROUP BY lider_acima_id
      ),
      network_counts AS (
        SELECT root_id, COUNT(*) as network_count
        FROM subordinates
        GROUP BY root_id
      )
      UPDATE usuarios u
      SET
        total_indicados_diretos = COALESCE(dc.direct_count, 0),
        total_indicados_rede = COALESCE(nc.network_count, 0)
      FROM direct_counts dc
      FULL OUTER JOIN network_counts nc ON nc.root_id = dc.lider_acima_id
      WHERE u.id = COALESCE(dc.lider_acima_id, nc.root_id);
    `;
    return;
  }

  // Recalculo específico para um nó e seus ancestrais
  await queryClient`
    WITH RECURSIVE ancestors AS (
      SELECT id, lider_acima_id
      FROM usuarios
      WHERE id = ${userId}::uuid

      UNION ALL

      SELECT u.id, u.lider_acima_id
      FROM usuarios u
      INNER JOIN ancestors a ON a.lider_acima_id = u.id
    ),
    all_subordinates AS (
      SELECT id, lider_acima_id, id as anc_id
      FROM usuarios
      WHERE lider_acima_id IN (SELECT id FROM ancestors)

      UNION ALL

      SELECT u.id, u.lider_acima_id, s.anc_id
      FROM usuarios u
      INNER JOIN all_subordinates s ON s.id = u.lider_acima_id
    )
    UPDATE usuarios u
    SET
      total_indicados_diretos = (
        SELECT COUNT(*) FROM usuarios d WHERE d.lider_acima_id = u.id
      ),
      total_indicados_rede = (
        SELECT COUNT(*) FROM all_subordinates sub WHERE sub.anc_id = u.id
      )
    WHERE u.id IN (SELECT id FROM ancestors);
  `;
}

/**
 * Retorna a árvore hierárquica de eleitores/lideranças formatada para visualização.
 * Permite anonimização para conformidade com a LGPD (máscara de telefone e sobrenome).
 */
export async function getHierarchyTree(rootId?: string, maskLGPD: boolean = false) {
  const users = await queryClient`
    SELECT
      id,
      nome,
      whatsapp,
      cargo,
      lider_acima_id,
      bairro,
      zona_eleitoral,
      total_indicados_diretos,
      total_indicados_rede,
      opt_out,
      created_at
    FROM usuarios
    ORDER BY total_indicados_rede DESC, created_at ASC;
  `;

  // Mapeamento e estruturação em árvore
  const userMap = new Map();
  const roots: any[] = [];

  for (const u of users) {
    let displayName = u.nome;
    let displayPhone = u.whatsapp;

    if (maskLGPD) {
      const parts = u.nome.trim().split(' ');
      displayName = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
      if (u.whatsapp.length >= 8) {
        displayPhone = u.whatsapp.slice(0, 4) + '****' + u.whatsapp.slice(-2);
      }
    }

    userMap.set(u.id, {
      ...u,
      nome: displayName,
      whatsapp: displayPhone,
      children: [],
    });
  }

  for (const u of users) {
    const node = userMap.get(u.id);
    if (u.lider_acima_id && userMap.has(u.lider_acima_id)) {
      userMap.get(u.lider_acima_id).children.push(node);
    } else {
      if (!rootId || u.id === rootId) {
        roots.push(node);
      }
    }
  }

  return roots;
}

/**
 * Trilha de Auditoria LGPD
 */
export async function logAuditLGPD(usuario: string, acao: string, ip?: string, detalhes?: any) {
  try {
    await db.insert(schema.logsAuditoriaLGPD).values({
      usuario_responsavel: usuario,
      acao,
      ip: ip || '127.0.0.1',
      detalhes: detalhes ? JSON.stringify(detalhes) : null,
    });
  } catch (err) {
    console.error('[LGPD AUDIT ERROR]', err);
  }
}
