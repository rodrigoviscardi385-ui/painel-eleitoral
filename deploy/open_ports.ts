import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  conn.exec(
    'iptables -I INPUT -p tcp --dport 3001 -j ACCEPT && ufw allow 3001/tcp && ufw allow 80/tcp && ufw allow 443/tcp && curl -s http://127.0.0.1:3001/api/health',
    (err, stream) => {
      stream.on('data', (d) => process.stdout.write(d.toString()));
      stream.on('close', (code) => {
        console.log('Ports updated, code:', code);
        conn.end();
        process.exit(0);
      });
    }
  );
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
