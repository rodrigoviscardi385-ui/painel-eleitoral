import { Client } from 'ssh2';

const conn = new Client();

console.log('🔄 Tentando login com root e nova senha...');

conn.on('ready', () => {
  console.log('🎉 SUCESSO TOTAL! Senha aceita! Conectado na VPS Locaweb como root!');
  
  conn.exec('uname -a && free -h && df -h /', (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      console.log('Comando finalizado com código:', code);
      conn.end();
      process.exit(0);
    }).on('data', (data) => {
      console.log(data.toString());
    });
  });
}).on('error', (err) => {
  console.log('❌ Erro:', err.message);
  process.exit(1);
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
      'ecdh-sha2-nistp384',
      'ecdh-sha2-nistp521',
      'diffie-hellman-group-exchange-sha256',
      'diffie-hellman-group14-sha256'
    ],
    serverHostKey: [
      'ssh-ed25519',
      'ecdsa-sha2-nistp256',
      'ecdsa-sha2-nistp384',
      'ecdsa-sha2-nistp521',
      'rsa-sha2-512',
      'rsa-sha2-256'
    ],
    cipher: [
      'chacha20-poly1305@openssh.com',
      'aes128-gcm',
      'aes128-gcm@openssh.com',
      'aes256-gcm',
      'aes256-gcm@openssh.com',
      'aes128-ctr',
      'aes192-ctr',
      'aes256-ctr'
    ]
  }
});
