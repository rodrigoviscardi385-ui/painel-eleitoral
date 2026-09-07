import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH Connected.');
  conn.exec(
    "sudo -u postgres psql -d painel_eleitoral -c 'SELECT count(*) FROM equipe_rua;' -c 'SELECT count(*) FROM usuarios;' -c 'SELECT id, nome, email, role, ativo FROM usuarios_auth;' -c 'SELECT id, nome_completo, cpf, telefone_whatsapp, primeiro_acesso_realizado FROM equipe_rua LIMIT 5;'",
    (err, stream) => {
      if (err) {
        console.error(err);
        conn.end();
        return;
      }
      stream.on('data', (d: Buffer) => process.stdout.write(d.toString()));
      stream.stderr.on('data', (d: Buffer) => process.stderr.write(d.toString()));
      stream.on('close', () => {
        conn.end();
        process.exit(0);
      });
    }
  );
}).on('error', (err) => {
  console.error('SSH Error:', err);
  process.exit(1);
}).connect({
  host: '191.252.201.102',
  port: 22,
  username: 'root',
  password: 'Gustavo#55955',
  readyTimeout: 30000,
  algorithms: {
    kex: [
      'curve25519-sha256',
      'curve25519-sha256@libssh.org',
      'ecdh-sha2-nistp256',
      'diffie-hellman-group-exchange-sha256',
    ],
    serverHostKey: ['ssh-ed25519', 'ecdsa-sha2-nistp256', 'rsa-sha2-512', 'rsa-sha2-256'],
    cipher: ['chacha20-poly1305@openssh.com', 'aes128-gcm@openssh.com', 'aes256-gcm@openssh.com'],
  },
});
