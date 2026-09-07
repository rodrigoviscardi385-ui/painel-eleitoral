import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ Conectado na VPS!');
  conn.exec(`
    echo "--- NODE VERSION ---"
    node -v || echo "Node não encontrado"
    echo "--- PM2 VERSION ---"
    pm2 -v || echo "PM2 não encontrado"
    echo "--- POSTGRESQL STATUS ---"
    systemctl is-active postgresql || echo "Postgres inativo"
    sudo -u postgres psql -c "SELECT datname FROM pg_database WHERE datname='painel_eleitoral';"
    echo "--- MEMORY & SWAP ---"
    free -h
  `, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.end();
      process.exit(0);
    }).on('data', (d) => process.stdout.write(d.toString()));
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
