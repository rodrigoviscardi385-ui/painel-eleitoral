import { Client } from 'ssh2';
import path from 'path';

const conn = new Client();

const VPS_HOST = '191.252.201.102';
const VPS_USER = 'root';
const VPS_PASS = 'Gustavo#55955';
const LOCAL_TAR = path.resolve(process.cwd(), 'api.tar.gz');
const REMOTE_TAR = '/tmp/api.tar.gz';
const REMOTE_DIR = '/var/www/painel-eleitoral/apps/api';

console.log('🚀 Iniciando deploy via pacote otimizado (49KB)...');

conn.on('ready', () => {
  console.log('✅ Conexão SSH estabelecida com sucesso.');

  conn.sftp((err, sftp) => {
    if (err) {
      console.error('❌ Erro no SFTP:', err);
      conn.end();
      process.exit(1);
    }

    console.log('📤 Enviando api.tar.gz para a VPS...');
    sftp.fastPut(LOCAL_TAR, REMOTE_TAR, (uploadErr: any) => {
      if (uploadErr) {
        console.error('❌ Falha no envio do pacote:', uploadErr);
        conn.end();
        process.exit(1);
      }

      console.log('✅ Pacote enviado com sucesso! Extraindo e instalando dependências...');

      const remoteScript = `
        mkdir -p ${REMOTE_DIR}
        tar -xzf ${REMOTE_TAR} -C ${REMOTE_DIR}
        
        cat << 'EOF' > ${REMOTE_DIR}/.env
PORT=3001
HOST=0.0.0.0
GROQ_API_KEY=\${process.env.GROQ_API_KEY || ''}
DATABASE_URL=postgresql://postgres:Gustavo%2355955@127.0.0.1:5432/painel_eleitoral
JWT_SECRET=painel_eleitoral_2026_super_secret_jwt_key
WEBHOOK_BASE_URL=http://191.252.201.102
META_WA_VERIFY_TOKEN=painel_eleitoral_meta_webhook_2026
EOF

        cd ${REMOTE_DIR}
        npm install --omit=dev
        pm2 delete painel-eleitoral-api 2>/dev/null || true
        pm2 start dist/server.js --name painel-eleitoral-api
        pm2 save
        sleep 3
        echo "=== STATUS PM2 ==="
        pm2 list
        echo "=== TESTE HEALTH CHECK ==="
        curl -i http://127.0.0.1:3001/api/health
      `;

      conn.exec(remoteScript, (execErr, stream) => {
        if (execErr) {
          console.error('❌ Erro ao executar script:', execErr);
          conn.end();
          process.exit(1);
        }

        stream.on('close', (code: number) => {
          console.log('\n🏁 Script remoto finalizado com código:', code);
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

