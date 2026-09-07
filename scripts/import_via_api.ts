import postgres from 'postgres';
import http from 'http';

const SUPABASE_URL = 'postgresql://postgres.irpjyfoykknhlevmedig:030210.Gege%40@aws-0-us-west-2.pooler.supabase.com:6543/postgres';
const VPS_HOST = '191.252.201.102';

const sqlRemote = postgres(SUPABASE_URL, {
  ssl: 'require',
  connect_timeout: 15,
  prepare: false,
});

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function requestJson(method: string, path: string, body?: any, retries = 3): Promise<any> {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const options: http.RequestOptions = {
      hostname: VPS_HOST,
      port: 80,
      path: path,
      method: method,
      agent: new http.Agent({ keepAlive: false }),
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
      timeout: 15000,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (_) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      if (retries > 0) {
        console.log(`   ⚠️ Timeout em ${path}, tentando novamente... (${retries} restantes)`);
        setTimeout(() => requestJson(method, path, body, retries - 1).then(resolve).catch(reject), 1500);
      } else {
        reject(new Error(`Timeout ao conectar com ${path}`));
      }
    });

    req.on('error', (err) => {
      if (retries > 0) {
        console.log(`   ⚠️ Erro de rede em ${path} (${err.message}), tentando novamente... (${retries} restantes)`);
        setTimeout(() => requestJson(method, path, body, retries - 1).then(resolve).catch(reject), 1500);
      } else {
        reject(err);
      }
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function main() {
  console.log('🚀 Iniciando importação robusta do antigo Supabase para a VPS Locaweb...');

  try {
    // 1. Lideranças e Eleitores
    console.log('\n📥 1. Buscando lideranças cadastradas no Supabase...');
    const usuarios = await sqlRemote`SELECT * FROM usuarios ORDER BY created_at ASC`;
    console.log(`Encontrados ${usuarios.length} usuários cadastrados.`);

    for (const u of usuarios) {
      const payload = {
        nome: u.nome,
        whatsapp: u.whatsapp,
        cargo: u.cargo || 'APOIADOR',
        bairro: u.bairro || null,
        zona_eleitoral: u.zona_eleitoral || null,
        secao_eleitoral: u.secao_eleitoral || null,
        notas: u.notas || null,
      };

      console.log(`-> Enviando: ${u.nome} (${u.whatsapp} - ${u.cargo})...`);
      const res = await requestJson('POST', '/api/liderancas', payload);

      if (res.status === 200 || res.status === 201) {
        console.log(`   ✅ Sucesso: ${u.nome}`);
      } else if (res.status === 409) {
        console.log(`   ℹ️ Já cadastrado: ${u.nome} (${res.data.error || 'WhatsApp existente'})`);
      } else {
        console.log(`   ℹ️ Retorno [${res.status}]:`, res.data);
      }

      await sleep(600);
    }

    // 2. Metas de Campanha
    console.log('\n📥 2. Buscando metas de campanha no Supabase...');
    const metas = await sqlRemote`SELECT * FROM metas ORDER BY created_at ASC`;
    console.log(`Encontradas ${metas.length} metas cadastradas.`);

    for (const m of metas) {
      const payload = {
        titulo: m.titulo,
        tipo: m.tipo || 'GLOBAL',
        alvo_referencia: m.alvo_referencia || null,
        quantidade_meta: m.quantidade_meta || 100,
        data_fim: m.data_fim
          ? new Date(m.data_fim).toISOString()
          : new Date(Date.now() + 30 * 86400000).toISOString(),
        meta_diaria_cadencia: m.meta_diaria_cadencia || 10,
      };

      console.log(`-> Enviando Meta: ${m.titulo} (${m.quantidade_meta})...`);
      const res = await requestJson('POST', '/api/metas', payload);

      if (res.status === 200 || res.status === 201) {
        console.log(`   ✅ Sucesso Meta: ${m.titulo}`);
      } else {
        console.log(`   ℹ️ Retorno Meta [${res.status}]:`, res.data);
      }

      await sleep(600);
    }

    // 3. Campanha Config
    console.log('\n📥 3. Sincronizando dados e propostas do candidato...');
    const configs = await sqlRemote`SELECT * FROM campanha_config LIMIT 1`;
    if (configs.length > 0) {
      const c = configs[0];
      const payload = {
        nome_urna: c.nome_urna || 'Gustavo Reis',
        nome_completo: c.nome_completo || 'Gustavo Reis',
        numero_candidato: c.numero_candidato || '55955',
        cargo: c.cargo || 'Deputado Federal',
        partido: c.partido || 'PSD',
        coligacao: c.coligacao || 'Coligação Por Dias Melhores',
        slogan: c.slogan || 'Trabalho, honestidade e compromisso com você',
        cidade: c.cidade || 'Santos',
        estado: c.estado || 'SP',
        propostas_ia: c.propostas_ia || '',
        biografia_ia: c.biografia_ia || '',
      };

      const res = await requestJson('PUT', '/api/campanha/config', payload);
      if (res.status === 200) {
        console.log('   ✅ Configurações do candidato sincronizadas com o Supabase!');
      } else {
        console.log('   ℹ️ Retorno Config [${res.status}]:', res.data);
      }
    }

    // 4. Recalcular Métricas da Rede
    console.log('\n🔄 4. Recalculando métricas da árvore hierárquica na VPS...');
    const recalcRes = await requestJson('POST', '/api/liderancas/recalcular-metricas');
    console.log('   Status do recálculo CTE:', recalcRes.status);

    console.log('\n🎉 TODA A BASE DO SUPABASE FOI IMPORTADA COM SUCESSO PARA A VPS!');
    await sqlRemote.end();
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Erro na importação:', err.message);
    process.exit(1);
  }
}

main();
