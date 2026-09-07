import { Client } from 'ssh2';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const VPS_HOST = '191.252.201.102';
const VPS_USER = 'root';
const VPS_PASS = 'Gustavo#55955';
const ROOT_DIR = path.resolve(__dirname, '..');
const API_DIR = path.join(ROOT_DIR, 'apps', 'api');
const WEB_DIR = path.join(ROOT_DIR, 'apps', 'web');

const LOCAL_API_TAR = path.join(ROOT_DIR, 'api.tar.gz');
const LOCAL_WEB_TAR = path.join(ROOT_DIR, 'web.tar.gz');
const LOCAL_MIGRATION_SQL = path.join(API_DIR, 'src', 'db', 'migrations', '20260907_santos_postgis_territorial.sql');
const LOCAL_EQUIPE_RUA_SQL = path.join(API_DIR, 'src', 'db', 'migrations', '20260907_create_equipe_rua.sql');

const REMOTE_API_DIR = '/var/www/painel-eleitoral/apps/api';
const REMOTE_WEB_DIR = '/var/www/painel-eleitoral/apps/web';
const REMOTE_API_TAR = '/tmp/api.tar.gz';
const REMOTE_WEB_TAR = '/tmp/web.tar.gz';
const REMOTE_MIGRATION_SQL = '/tmp/migration_santos.sql';
const REMOTE_EQUIPE_RUA_SQL = '/tmp/migration_equipe_rua.sql';

async function main() {
  const startTime = Date.now();
  console.log('══════════════════════════════════════════════════════════════════════');
  console.log('🚀 SINCRONIZAÇÃO TOTAL AUTOMÁTICA: GIT + VPS LOCAWEB (191.252.201.102)');
  console.log('══════════════════════════════════════════════════════════════════════\n');

  // 1. Build Local do Backend e Frontend
  console.log('📦 [1/6] Compilando Backend (apps/api)...');
  execSync('npm run build', { cwd: API_DIR, stdio: 'inherit' });

  console.log('\n🎨 [2/6] Compilando Frontend (apps/web)...');
  execSync('npm run build', { cwd: WEB_DIR, stdio: 'inherit' });

  // 2. Empacotar arquivos otimizados
  console.log('\n🗜️ [3/6] Gerando pacotes comprimidos de deploy...');
  if (fs.existsSync(LOCAL_API_TAR)) fs.unlinkSync(LOCAL_API_TAR);
  if (fs.existsSync(LOCAL_WEB_TAR)) fs.unlinkSync(LOCAL_WEB_TAR);

  execSync(`tar -czf "${LOCAL_API_TAR}" dist package.json`, { cwd: API_DIR, stdio: 'inherit' });
  execSync(`tar -czf "${LOCAL_WEB_TAR}" dist package.json`, { cwd: WEB_DIR, stdio: 'inherit' });

  const apiSize = (fs.statSync(LOCAL_API_TAR).size / 1024).toFixed(1);
  const webSize = (fs.statSync(LOCAL_WEB_TAR).size / 1024).toFixed(1);
  console.log(`✅ Pacotes prontos: api.tar.gz (${apiSize} KB), web.tar.gz (${webSize} KB)`);

  // 3. Conexão SSH e Upload via SFTP para a VPS
  console.log('\n📡 [4/6] Conectando à VPS Locaweb via SSH2 e enviando pacotes...');
  const conn = new Client();

  await new Promise<void>((resolve, reject) => {
    conn.on('ready', () => {
      console.log('✅ Conexão SSH estabelecida com sucesso.');
      conn.sftp((sftpErr, sftp) => {
        if (sftpErr) return reject(sftpErr);

        console.log('📤 Enviando api.tar.gz...');
        sftp.fastPut(LOCAL_API_TAR, REMOTE_API_TAR, (err1: any) => {
          if (err1) return reject(err1);

          console.log('📤 Enviando web.tar.gz...');
          sftp.fastPut(LOCAL_WEB_TAR, REMOTE_WEB_TAR, (err2: any) => {
            if (err2) return reject(err2);

            const uploadEquipeRua = () => {
              if (fs.existsSync(LOCAL_EQUIPE_RUA_SQL)) {
                console.log('📤 Enviando migração SQL Equipe de Rua & Contratos TSE...');
                sftp.fastPut(LOCAL_EQUIPE_RUA_SQL, REMOTE_EQUIPE_RUA_SQL, (err4: any) => {
                  if (err4) return reject(err4);
                  resolve();
                });
              } else {
                resolve();
              }
            };

            if (fs.existsSync(LOCAL_MIGRATION_SQL)) {
              console.log('📤 Enviando migração SQL territorial (Santos PostGIS)...');
              sftp.fastPut(LOCAL_MIGRATION_SQL, REMOTE_MIGRATION_SQL, (err3: any) => {
                if (err3) return reject(err3);
                uploadEquipeRua();
              });
            } else {
              uploadEquipeRua();
            }
          });
        });
      });
    }).on('error', (err) => {
      reject(err);
    }).connect({
      host: VPS_HOST,
      port: 22,
      username: VPS_USER,
      password: VPS_PASS,
      readyTimeout: 30000,
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
  });

  // 4. Executar descompactação, migração, reload do PM2 e Nginx
  console.log('\n⚙️ [5/6] Aplicando atualizações e reiniciando serviços na VPS...');
  const remoteDeployScript = `
    mkdir -p ${REMOTE_API_DIR} ${REMOTE_WEB_DIR}

    # Descompactar Web
    tar -xzf ${REMOTE_WEB_TAR} -C ${REMOTE_WEB_DIR}
    
    # Descompactar API
    tar -xzf ${REMOTE_API_TAR} -C ${REMOTE_API_DIR}

    # Garantir .env da API apenas se nao existir
    if [ ! -f "${REMOTE_API_DIR}/.env" ]; then
      cat << 'EOF' > ${REMOTE_API_DIR}/.env
PORT=3001
HOST=0.0.0.0
DATABASE_URL=postgresql://postgres:Gustavo%2355955@127.0.0.1:5432/painel_eleitoral
JWT_SECRET=painel_eleitoral_2026_super_secret_jwt_key
WEBHOOK_BASE_URL=http://191.252.201.102
META_WA_VERIFY_TOKEN=painel_eleitoral_meta_webhook_2026
EOF
    fi

    # Executar migração SQL PostGIS caso exista
    if [ -f "${REMOTE_MIGRATION_SQL}" ]; then
      echo "--- EXECUTANDO MIGRAÇÃO POSTGIS SANTOS NO POSTGRESQL ---"
      sudo -u postgres psql -d painel_eleitoral -f ${REMOTE_MIGRATION_SQL} || true
      rm -f ${REMOTE_MIGRATION_SQL}
    fi

    # Executar migração SQL Equipe de Rua & Contratos TSE caso exista
    if [ -f "${REMOTE_EQUIPE_RUA_SQL}" ]; then
      echo "--- EXECUTANDO MIGRAÇÃO EQUIPE DE RUA & CONTRATOS TSE NO POSTGRESQL ---"
      sudo -u postgres psql -d painel_eleitoral -f ${REMOTE_EQUIPE_RUA_SQL} || true
      rm -f ${REMOTE_EQUIPE_RUA_SQL}
    fi

    # Instalar dependências de produção se necessário e reiniciar PM2
    cd ${REMOTE_API_DIR}
    npm install --omit=dev --silent
    pm2 reload painel-eleitoral-api || pm2 start dist/server.js --name painel-eleitoral-api
    pm2 save

    # Recarregar Nginx para servir o novo build imediatamente
    systemctl reload nginx

    # Limpeza de temporários
    rm -f ${REMOTE_API_TAR} ${REMOTE_WEB_TAR}

    sleep 2
    echo "\n=== TESTE HEALTH API NA VPS ==="
    curl -s http://127.0.0.1:3001/api/health
    echo "\n=== TESTE HTTP FRONTEND NA VPS ==="
    curl -Is http://127.0.0.1/ | head -n 5
  `;

  await new Promise<void>((resolve, reject) => {
    conn.exec(remoteDeployScript, (execErr, stream) => {
      if (execErr) return reject(execErr);

      stream.on('close', (code: number) => {
        conn.end();
        if (code === 0) {
          console.log('✅ VPS atualizada com sucesso!');
          resolve();
        } else {
          console.warn(`⚠️ Script remoto finalizou com código ${code}`);
          resolve();
        }
      });

      stream.on('data', (d: Buffer) => process.stdout.write(d.toString()));
      stream.stderr.on('data', (d: Buffer) => process.stderr.write(d.toString()));
    });
  });

  // 5. Git Add, Commit e Push automático
  console.log('\n🐙 [6/6] Sincronizando repositório Git com o GitHub...');
  try {
    execSync('git add .', { cwd: ROOT_DIR, stdio: 'inherit' });
    const status = execSync('git status --porcelain', { cwd: ROOT_DIR, encoding: 'utf-8' });
    if (status.trim().length > 0) {
      const commitMsg = `feat: assinatura digital Gov.br Lei 14.063/2020, selo ITI, gestao de contratos TSE e arquitetura de agentes [${new Date().toISOString()}]`;
      execSync(`git commit -m "${commitMsg}"`, { cwd: ROOT_DIR, stdio: 'inherit' });
      console.log('✅ Commit realizado com sucesso.');
    } else {
      console.log('ℹ️ Nenhuma alteração pendente para commit local.');
    }

    console.log('🚀 Enviando commits para o GitHub (origin main)...');
    execSync('git push origin main', { cwd: ROOT_DIR, stdio: 'inherit' });
    console.log('✅ Repositório GitHub atualizado com sucesso!');
  } catch (gitErr: any) {
    console.error('⚠️ Aviso durante operação Git:', gitErr.message);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n══════════════════════════════════════════════════════════════════════');
  console.log(`🎉 DEPLOY E SINCRONIZAÇÃO CONCLUÍDOS EM ${elapsed}s!`);
  console.log('🌐 Painel Online: http://191.252.201.102/');
  console.log('🔌 API Online:    http://191.252.201.102/api/health');
  console.log('🐙 GitHub:        https://github.com/rodrigoviscardi385-ui/painel-eleitoral');
  console.log('══════════════════════════════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('\n❌ Erro durante a sincronização:', err);
  process.exit(1);
});
