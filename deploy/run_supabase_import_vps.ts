import { Client } from 'ssh2';
import path from 'path';

const conn = new Client();

const VPS_HOST = '191.252.201.102';
const VPS_USER = 'root';
const VPS_PASS = 'Gustavo#55955';
const LOCAL_SCRIPT = path.resolve(process.cwd(), 'deploy/import_supabase_script.mjs');
const REMOTE_SCRIPT = '/tmp/import_supabase.mjs';

console.log('🔄 Conectando à VPS para executar a importação do antigo Supabase...');

conn.on('ready', () => {
  console.log('✅ Conexão SSH estabelecida com a VPS.');

  conn.sftp((sftpErr, sftp) => {
    if (sftpErr) {
      console.error('❌ Erro no SFTP:', sftpErr);
      conn.end();
      process.exit(1);
    }

    console.log('📤 Enviando script de migração para a VPS...');
    sftp.fastPut(LOCAL_SCRIPT, REMOTE_SCRIPT, (putErr) => {
      if (putErr) {
        console.error('❌ Erro ao enviar script:', putErr);
        conn.end();
        process.exit(1);
      }

      console.log('✅ Script enviado! Executando migração na VPS...');

      conn.exec(`node ${REMOTE_SCRIPT}`, (execErr, stream) => {
        if (execErr) {
          console.error('❌ Erro na execução remota:', execErr);
          conn.end();
          process.exit(1);
        }

        stream.on('close', (code: number) => {
          console.log('\n🏁 Migração finalizada com código:', code);
          conn.end();
          process.exit(code === 0 ? 0 : 1);
        });

        stream.on('data', (data: Buffer) => {
          process.stdout.write(data.toString());
        });

        stream.stderr.on('data', (data: Buffer) => {
          process.stderr.write(data.toString());
        });
      });
    });
  });
}).on('error', (err) => {
  console.error('❌ Erro de conexão:', err.message);
  process.exit(1);
}).connect({
  host: VPS_HOST,
  port: 22,
  username: VPS_USER,
  password: VPS_PASS,
  readyTimeout: 30000,
  keepaliveInterval: 2000,
  algorithms: {
    kex: [
      'curve25519-sha256',
      'curve25519-sha256@libssh.org',
      'ecdh-sha2-nistp256',
      'ecdh-sha2-nistp384',
      'ecdh-sha2-nistp521',
      'diffie-hellman-group-exchange-sha256',
      'diffie-hellman-group14-sha256',
    ],
    serverHostKey: [
      'ssh-ed25519',
      'ecdsa-sha2-nistp256',
      'ecdsa-sha2-nistp384',
      'ecdsa-sha2-nistp521',
      'rsa-sha2-512',
      'rsa-sha2-256',
    ],
    cipher: [
      'chacha20-poly1305@openssh.com',
      'aes128-gcm',
      'aes128-gcm@openssh.com',
      'aes256-gcm',
      'aes256-gcm@openssh.com',
      'aes128-ctr',
      'aes192-ctr',
      'aes256-ctr',
    ],
  },
});

