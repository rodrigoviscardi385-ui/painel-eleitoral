import postgres from 'postgres';

const SUPABASE_URL = 'postgresql://postgres.irpjyfoykknhlevmedig:030210.Gege%40@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

const sql = postgres(SUPABASE_URL, {
  ssl: 'require',
  connect_timeout: 15,
  prepare: false
});

async function main() {
  console.log('🔄 Conectando ao Supabase antigo...');
  try {
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;

    console.log(`\n📋 Encontradas ${tables.length} tabelas no schema public:`);
    for (const t of tables) {
      const name = t.table_name;
      try {
        const [cnt] = await sql.unsafe(`SELECT count(*) as count FROM "${name}"`);
        console.log(`- ${name}: ${cnt.count} registros`);
      } catch (e: any) {
        console.log(`- ${name}: erro ao contar (${e.message})`);
      }
    }

    console.log('\n🔍 Inspecionando dados detalhados das tabelas principais:');

    // Campanhas / Config
    const configs = await sql.unsafe('SELECT * FROM campanha_config LIMIT 5').catch(() => []);
    if (configs.length) {
      console.log('\n--- campanha_config ---');
      console.log(JSON.stringify(configs, null, 2));
    }

    // Usuarios (7)
    const usuariosOld = await sql.unsafe('SELECT * FROM usuarios').catch(() => []);
    console.log('\n--- usuarios (antigo) ---');
    console.log(JSON.stringify(usuariosOld, null, 2));

    // Metas (4)
    const metasOld = await sql.unsafe('SELECT * FROM metas').catch(() => []);
    console.log('\n--- metas (antigo) ---');
    console.log(JSON.stringify(metasOld, null, 2));

    // Bot config
    const botCfg = await sql.unsafe('SELECT * FROM bot_config').catch(() => []);
    console.log('\n--- bot_config (antigo) ---');
    console.log(JSON.stringify(botCfg, null, 2));

    // Chip warming config
    const chipCfg = await sql.unsafe('SELECT * FROM chip_warming_config').catch(() => []);
    console.log('\n--- chip_warming_config (antigo) ---');
    console.log(JSON.stringify(chipCfg, null, 2));

    // Usuarios Auth
    const usuarios = await sql.unsafe('SELECT id, nome, email, role, password_hash FROM usuarios_auth').catch(() => []);
    console.log('\n--- usuarios_auth ---');
    console.log(JSON.stringify(usuarios, null, 2));


    await sql.end();
    console.log('\n✅ Inspeção do Supabase concluída com sucesso!');
  } catch (err: any) {
    console.error('❌ Erro de conexão:', err.message);
    process.exit(1);
  }
}

main();
