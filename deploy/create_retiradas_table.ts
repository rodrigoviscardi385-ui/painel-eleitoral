import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ Conectado na VPS para criar a tabela de retiradas de materiais...');
  const sql = `
    CREATE TABLE IF NOT EXISTS retiradas_materiais (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      material_nome TEXT NOT NULL,
      quantidade INTEGER NOT NULL,
      data_retirada TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      responsavel_entrega TEXT,
      observacoes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_retiradas_usuario_id ON retiradas_materiais(usuario_id);
    CREATE INDEX IF NOT EXISTS idx_retiradas_data ON retiradas_materiais(data_retirada);
  `;

  conn.exec(`sudo -u postgres psql -d painel_eleitoral -c "${sql.replace(/\n/g, ' ')}"`, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code: number) => {
      console.log('Tabela retiradas_materiais criada com código:', code);
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
