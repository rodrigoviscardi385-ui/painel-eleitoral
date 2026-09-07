import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  console.log('--- INSPECTION OF DISK & SWAP ---');
  conn.exec(`
    echo "=== FREE MEMORY & SWAP ==="
    free -h
    echo "\n=== SWAPON ACTIVE DEVICES ==="
    swapon --show
    echo "\n=== DISK SPACE ROOT (/) ==="
    df -h /
    echo "\n=== SWAPPINESS VALUE ==="
    cat /proc/sys/vm/swappiness
    echo "\n=== FSTAB CONFIG ==="
    cat /etc/fstab
  `, (err, stream) => {
    if (err) throw err;
    stream.on('data', (d: Buffer) => process.stdout.write(d.toString()));
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
  readyTimeout: 15000,
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
