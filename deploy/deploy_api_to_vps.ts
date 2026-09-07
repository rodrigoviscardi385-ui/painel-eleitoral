import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';

const conn = new Client();

const VPS_HOST = '191.252.201.102';
const VPS_USER = 'root';
const VPS_PASS = 'Gustavo#55955';
const REMOTE_APP_DIR = '/var/www/painel-eleitoral/apps/api';
const LOCAL_API_DIR = path.resolve(process.cwd(), 'apps/api');

console.log('🚀 Iniciando deploy automático do Backend para a VPS Locaweb...');

async function uploadDirectory(sftp: any, localDir: string, remoteDir: string) {
  // Garante que o diretório remoto existe
  await new Promise<void>((resolve) => {
    sftp.mkdir(remoteDir, () => resolve());
  });

  const entries = fs.readdirSync(localDir, { withFileTypes: true });

  for (const entry of entries) {
    // Ignora node_modules locais e logs
    if (entry.name === 'node_modules' || entry.name === 'sessions_wpp' || entry.name === '.git') {
      continue;
    }

    const localPath = path.join(localDir, entry.name);
    const remotePath = `${remoteDir}/${entry.name}`;

    if (entry.isDirectory()) {
      await uploadDirectory(sftp, localPath, remotePath);
    } else {
      await new Promise<void>((resolve, reject) => {
        sftp.fastPut(localPath, remotePath, (err: any) => {
          if (err) {
            console.error(`Erro ao subir ${entry.name}:`, err.message);
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }
  }
}

conn.on('ready', () => {
  console.log('✅ Conexão SSH estabelecida com a VPS.');

  conn.sftp(async (err, sftp) => {
    if (err) {
      console.error('❌ Erro no SFTP:', err);
      conn.end();
      process.exit(1);
    }

    try {
      console.log('📁 Criando estrutura de diretórios na VPS...');
      await new Promise<void>((resolve) => {
        conn.exec(`mkdir -p ${REMOTE_APP_DIR}`, (e, stream) => {
          stream.on('close', () => resolve());
        });
      });

      console.log('📤 Enviando arquivos do Backend (dist, src, package.json)...');
      await uploadDirectory(sftp, LOCAL_API_DIR, REMOTE_APP_DIR);

      // Escreve .env oficial com banco local na VPS
      const envContent = `PORT=3001
HOST=0.0.0.0
GROQ_API_KEY=\${process.env.GROQ_API_KEY || ''}
DATABASE_URL=postgresql://postgres:Gustavo%2355955@127.0.0.1:5432/painel_eleitoral
JWT_SECRET=painel_eleitoral_2026_super_secret_jwt_key
`;

      await new Promise<void>((resolve, reject) => {
        const stream = sftp.createWriteStream(`${REMOTE_APP_DIR}/.env`);
        stream.write(envContent);
        stream.end(() => resolve());
      });

      console.log('📦 Arquivos sincronizados com sucesso!');
      console.log('⚙️ Executando npm install e iniciando processo com PM2 na VPS...');

      const installCommand = `
        cd ${REMOTE_APP_DIR} &&
        npm install --omit=dev --silent &&
        pm2 delete painel-eleitoral-api || true &&
        pm2 start dist/server.js --name painel-eleitoral-api &&
        pm2 save &&
        sleep 3 &&
        curl -s http://127.0.0.1:3001/api/health
      `;

      conn.exec(installCommand, (execErr, stream) => {
        if (execErr) throw execErr;

        stream.on('close', (code) => {
          console.log('\n🏁 Processo de inicialização na VPS concluído com código:', code);
          conn.end();
          process.exit(0);
        });

        stream.on('data', (data: Buffer) => {
          process.stdout.write(data.toString());
        });

        stream.stderr.on('data', (data: Buffer) => {
          process.stderr.write(data.toString());
        });
      });
    } catch (e: any) {
      console.error('❌ Erro durante upload/deploy:', e.message || e);
      conn.end();
      process.exit(1);
    }
  });
}).on('error', (err) => {
  console.error('❌ Erro de conexão:', err.message);
  process.exit(1);
}).connect({
  host: VPS_HOST,
  port: 22,
  username: VPS_USER,
  password: VPS_PASS,
  readyTimeout: 20000,
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
