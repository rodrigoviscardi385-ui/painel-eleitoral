import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ Conectado na VPS para adicionar a coluna ativo em campanha_config...');
  const sql = `ALTER TABLE campanha_config ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true NOT NULL;`;

  conn.exec(`sudo -u postgres psql -d painel_eleitoral -c "${sql}"`, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code: number) => {
      console.log('Coluna ativo migrada com código:', code);
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
