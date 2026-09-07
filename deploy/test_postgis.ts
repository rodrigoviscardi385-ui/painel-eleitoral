import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  console.log('Verificando PostGIS e pacotes PostgreSQL no Ubuntu da VPS...');
  conn.exec(`
    apt-get update -qq
    apt-get install -y -qq postgresql-postgis postgis postgresql-16-postgis-3 2>&1 || true
    sudo -u postgres psql -d painel_eleitoral -c "CREATE EXTENSION IF NOT EXISTS postgis; CREATE EXTENSION IF NOT EXISTS \\"uuid-ossp\\"; CREATE EXTENSION IF NOT EXISTS pg_trgm;"
    sudo -u postgres psql -d painel_eleitoral -c "SELECT postgis_full_version();"
  `, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d.toString()));
    stream.stderr.on('data', d => process.stderr.write(d.toString()));
    stream.on('close', code => {
      console.log('Finalizado com código:', code);
      conn.end();
      process.exit(code || 0);
    });
  });
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
      'diffie-hellman-group-exchange-sha256'
    ],
    serverHostKey: ['ssh-ed25519', 'ecdsa-sha2-nistp256', 'rsa-sha2-512', 'rsa-sha2-256'],
    cipher: ['chacha20-poly1305@openssh.com', 'aes128-gcm@openssh.com', 'aes256-gcm@openssh.com']
  }
});
