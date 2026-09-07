import postgres from '/var/www/painel-eleitoral/apps/api/node_modules/postgres/src/index.js';

const SUPABASE_URL = 'postgresql://postgres.irpjyfoykknhlevmedig:030210.Gege%40@aws-0-us-west-2.pooler.supabase.com:6543/postgres';
const LOCAL_DB_URL = 'postgresql://postgres:Gustavo%2355955@127.0.0.1:5432/painel_eleitoral';

const sqlRemote = postgres(SUPABASE_URL, { ssl: 'require', connect_timeout: 15, prepare: false });
const sqlLocal = postgres(LOCAL_DB_URL, { prepare: false });

async function run() {
  console.log('🚀 Conectando ao antigo Supabase e ao banco local da VPS...');

  // 1. Importar Usuários / Lideranças
  console.log('\n📦 1. Importando lideranças e eleitores...');
  const usuariosOld = await sqlRemote`SELECT * FROM usuarios`;
  console.log(`   Encontrados ${usuariosOld.length} usuários no Supabase.`);

  for (const u of usuariosOld) {
    try {
      await sqlLocal`
        INSERT INTO usuarios (
          id, nome, whatsapp, cargo, lider_acima_id, bairro, zona_eleitoral,
          secao_eleitoral, status_onboarding, grupo_whatsapp_id, grupo_link_convite,
          total_indicados_diretos, total_indicados_rede, notas, opt_out, created_at, updated_at
        ) VALUES (
          ${u.id}, ${u.nome}, ${u.whatsapp}, ${u.cargo || 'APOIADOR'}, ${u.lider_acima_id || null},
          ${u.bairro || null}, ${u.zona_eleitoral || null}, ${u.secao_eleitoral || null},
          ${u.status_onboarding || 'COMPLETO'}, ${u.grupo_whatsapp_id || null}, ${u.grupo_link_convite || null},
          ${u.total_indicados_diretos || 0}, ${u.total_indicados_rede || 0}, ${u.notas || null},
          ${u.opt_out || false}, ${u.created_at || new Date()}, ${u.updated_at || new Date()}
        )
        ON CONFLICT (id) DO UPDATE SET
          nome = EXCLUDED.nome,
          whatsapp = EXCLUDED.whatsapp,
          cargo = EXCLUDED.cargo,
          bairro = EXCLUDED.bairro,
          zona_eleitoral = EXCLUDED.zona_eleitoral,
          secao_eleitoral = EXCLUDED.secao_eleitoral,
          updated_at = EXCLUDED.updated_at
      `;
      console.log(`   ✅ Importado: ${u.nome} (${u.cargo} - ${u.bairro || 'Sem bairro'})`);
    } catch (err) {
      console.error(`   ❌ Erro ao importar usuário ${u.nome}:`, err.message);
    }
  }

  // 2. Importar Metas
  console.log('\n📦 2. Importando metas de campanha...');
  const metasOld = await sqlRemote`SELECT * FROM metas`;
  console.log(`   Encontradas ${metasOld.length} metas no Supabase.`);

  for (const m of metasOld) {
    try {
      await sqlLocal`
        INSERT INTO metas (
          id, titulo, tipo, alvo_referencia, quantidade_meta, quantidade_atual,
          data_inicio, data_fim, meta_diaria_cadencia, status_semaforo, created_at, updated_at
        ) VALUES (
          ${m.id}, ${m.titulo}, ${m.tipo || 'GLOBAL'}, ${m.alvo_referencia || null},
          ${m.quantidade_meta || 100}, ${m.quantidade_atual || 0}, ${m.data_inicio || new Date()},
          ${m.data_fim || new Date(Date.now() + 30*86400000)}, ${m.meta_diaria_cadencia || 10},
          ${m.status_semaforo || 'VERDE'}, ${m.created_at || new Date()}, ${m.updated_at || new Date()}
        )
        ON CONFLICT (id) DO UPDATE SET
          titulo = EXCLUDED.titulo,
          tipo = EXCLUDED.tipo,
          alvo_referencia = EXCLUDED.alvo_referencia,
          quantidade_meta = EXCLUDED.quantidade_meta,
          data_fim = EXCLUDED.data_fim,
          meta_diaria_cadencia = EXCLUDED.meta_diaria_cadencia,
          status_semaforo = EXCLUDED.status_semaforo
      `;
      console.log(`   ✅ Importada meta: ${m.titulo} (${m.quantidade_meta})`);
    } catch (err) {
      console.error(`   ❌ Erro ao importar meta ${m.titulo}:`, err.message);
    }
  }

  // 3. Importar Campanha Config
  console.log('\n📦 3. Sincronizando dados e metas do candidato...');
  const configsOld = await sqlRemote`SELECT * FROM campanha_config LIMIT 1`;
  if (configsOld.length > 0) {
    const c = configsOld[0];
    await sqlLocal`
      UPDATE campanha_config SET
        nome_urna = ${c.nome_urna || 'Gustavo Reis'},
        nome_completo = ${c.nome_completo || 'Gustavo Reis'},
        numero_candidato = ${c.numero_candidato || '55955'},
        cargo = ${c.cargo || 'Deputado Federal'},
        partido = ${c.partido || 'PSD'},
        coligacao = ${c.coligacao || 'Coligação Por Dias Melhores'},
        slogan = ${c.slogan || 'Trabalho, honestidade e compromisso com você'},
        cidade = ${c.cidade || 'Santos'},
        estado = ${c.estado || 'SP'},
        propostas_ia = ${c.propostas_ia || ''},
        biografia_ia = ${c.biografia_ia || ''},
        updated_at = NOW()
    `;
    console.log('   ✅ Configurações do candidato atualizadas com os dados do Supabase!');
  }

  // 4. Recalcular total de indicados
  console.log('\n📦 4. Recalculando contadores de liderança...');
  await sqlLocal`
    UPDATE usuarios u
    SET total_indicados_diretos = (
      SELECT count(*) FROM usuarios sub WHERE sub.lider_acima_id = u.id
    )
  `;

  // Resumo final
  const [uCnt] = await sqlLocal`SELECT count(*) FROM usuarios`;
  const [mCnt] = await sqlLocal`SELECT count(*) FROM metas`;
  console.log(`\n🎉 SUCESSO TOTAL! Banco da VPS atualizado!`);
  console.log(`   Total de Usuários/Lideranças na VPS: ${uCnt.count}`);
  console.log(`   Total de Metas Territoriais na VPS: ${mCnt.count}`);

  await sqlRemote.end();
  await sqlLocal.end();
  process.exit(0);
}

run().catch((e) => {
  console.error('ERRO FATAL:', e);
  process.exit(1);
});
