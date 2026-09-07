import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ Conectado na VPS para criar a tabela de boletins_urna (QR-BU)...');
  const sql = `
    DROP TABLE IF EXISTS boletins_urna CASCADE;
    CREATE TABLE boletins_urna (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      municipio TEXT NOT NULL DEFAULT 'Santos',
      codigo_municipio TEXT DEFAULT '70750',
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
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_bu_zona_secao ON boletins_urna(zona, secao);
    CREATE INDEX IF NOT EXISTS idx_bu_numero_candidato ON boletins_urna(numero_candidato);
    CREATE INDEX IF NOT EXISTS idx_bu_created_at ON boletins_urna(created_at);
  `;

  conn.exec(`sudo -u postgres psql -d painel_eleitoral -c "${sql.replace(/\n/g, ' ')}"`, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code: number) => {
      console.log('Tabela boletins_urna criada com código:', code);
      conn.end();
      process.exit(code);
    }).on('data', (d: Buffer) => process.stdout.write(d.toString()));
  });
}).connect({
  host: '191.252.201.102',
  port: 22,
  username: 'root',
  password: 'Gustavo#55955',
  algorithms: {
    kex: ['curve25519-sha256', 'ecdh-sha2-nistp256'],
    serverHostKey: ['ssh-ed25519'],
    cipher: ['chacha20-poly1305@openssh.com', 'aes128-gcm@openssh.com']
  }
});
