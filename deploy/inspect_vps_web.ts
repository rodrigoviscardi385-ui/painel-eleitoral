import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  console.log('--- INSPECTING VPS WEB ---');
  conn.exec(`
    echo "=== NGINX STATUS ==="
    systemctl is-active nginx
    echo "=== NGINX SITES ==="
    cat /etc/nginx/sites-available/default | grep -E "root|proxy_pass|listen"
    echo "=== WEB DIR CONTENTS ==="
    ls -la /var/www/painel-eleitoral/apps/web
    echo "=== DIST DIR CONTENTS ==="
    ls -la /var/www/painel-eleitoral/apps/web/dist || echo "No dist dir"
    ls -la /var/www/painel-eleitoral/apps/web/dist/assets || echo "No assets dir"
    echo "=== DIST INDEX.HTML ==="
    cat /var/www/painel-eleitoral/apps/web/dist/index.html | head -n 30
    echo "=== LOCAL CURL ==="
    curl -I http://127.0.0.1/
  `, (err, stream) => {
    if (err) throw err;
    stream.on('data', (d) => process.stdout.write(d.toString()));
    stream.on('close', () => {
      conn.end();
      process.exit(0);
    });
  });
}).connect({
  host: '191.252.201.102',
  port: 22,
  username: 'root',
  password: 'Gustavo#55955',
  readyTimeout: 10000,
  algorithms: {
    kex: [
      'curve25519-sha256',
      'curve25519-sha256@libssh.org',
      'ecdh-sha2-nistp256',
      'diffie-hellman-group-exchange-sha256',
    ],
    serverHostKey: ['ssh-ed25519', 'ecdsa-sha2-nistp256', 'rsa-sha2-512', 'rsa-sha2-256'],
    cipher: ['chacha20-poly1305@openssh.com', 'aes128-gcm@openssh.com', 'aes256-gcm@openssh.com', 'aes128-ctr'],
  },
});
