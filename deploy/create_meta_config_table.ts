import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ Conectado na VPS para criar a tabela de meta_wpp_config (Meta Cloud API)...');
  const sql = `
    CREATE TABLE IF NOT EXISTS meta_wpp_config (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      phone_number_id TEXT,
      waba_id TEXT,
      access_token TEXT,
      verify_token TEXT NOT NULL DEFAULT 'painel_eleitoral_meta_webhook_2026',
      display_phone_number TEXT,
      status TEXT NOT NULL DEFAULT 'CONFIG_PENDING',
      webhook_url TEXT NOT NULL DEFAULT 'http://191.252.201.102/api/whatsapp/meta-webhook',
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `;

  conn.exec(`sudo -u postgres psql -d painel_eleitoral -c "${sql.replace(/\n/g, ' ')}"`, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code: number) => {
      console.log('Tabela meta_wpp_config criada com código:', code);
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
