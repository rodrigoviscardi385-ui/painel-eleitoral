import { Client } from 'ssh2';
import path from 'path';

const conn = new Client();

const VPS_HOST = '191.252.201.102';
const VPS_USER = 'root';
const VPS_PASS = 'Gustavo#55955';
const LOCAL_TAR = path.resolve(process.cwd(), 'web.tar.gz');
const REMOTE_TAR = '/tmp/web.tar.gz';
const REMOTE_DIR = '/var/www/painel-eleitoral/apps/web';

console.log('🚀 Iniciando deploy do Frontend para a VPS Locaweb (24KB)...');

conn.on('ready', () => {
  console.log('✅ Conexão SSH estabelecida com a VPS.');

  conn.sftp((err, sftp) => {
    if (err) {
      console.error('❌ Erro no SFTP:', err);
      conn.end();
      process.exit(1);
    }

    console.log('📤 Enviando web.tar.gz para a VPS...');
    sftp.fastPut(LOCAL_TAR, REMOTE_TAR, (uploadErr: any) => {
      if (uploadErr) {
        console.error('❌ Falha no envio do pacote web:', uploadErr);
        conn.end();
        process.exit(1);
      }

      console.log('✅ Pacote web enviado com sucesso! Extraindo, instalando dependências e compilando com Vite...');

      const remoteScript = `
        mkdir -p ${REMOTE_DIR}
        tar -xzf ${REMOTE_TAR} -C ${REMOTE_DIR}
        systemctl reload nginx
        
        echo "=== TESTE FRONTEND NGINX ==="
        curl -i http://127.0.0.1/ | head -n 25
      `;

      conn.exec(remoteScript, (execErr, stream) => {
        if (execErr) {
          console.error('❌ Erro ao executar script de deploy web:', execErr);
          conn.end();
          process.exit(1);
        }

        stream.on('close', (code: number) => {
          console.log('\n🏁 Deploy do Frontend finalizado na VPS com código:', code);
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

