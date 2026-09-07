import { Client } from 'ssh2';

const conn = new Client();

console.log('🚀 Conectando na VPS Locaweb para rodar a instalação completa...');

const setupCommands = `
set -e
echo "=========================================================="
echo "📦 1/5 ATUALIZANDO REPOSITÓRIOS E INSTALANDO POSTGRESQL..."
echo "=========================================================="
export DEBIAN_FRONTEND=noninteractive
apt update -y
apt install -y postgresql postgresql-contrib git curl wget ffmpeg build-essential

echo "⚙️ Configurando Banco de Dados PostgreSQL local..."
systemctl enable postgresql
systemctl start postgresql
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'Gustavo#55955';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = 'painel_eleitoral'" | grep -q 1 || sudo -u postgres psql -c "CREATE DATABASE painel_eleitoral;"
echo "✅ Banco de dados 'painel_eleitoral' criado e pronto!"

echo "=========================================================="
echo "💾 2/5 EXPANDINDO MEMÓRIA SWAP PARA MÁXIMA ESTABILIDADE..."
echo "=========================================================="
if [ ! -f /swapfile_extra ]; then
  fallocate -l 2G /swapfile_extra || dd if=/dev/zero of=/swapfile_extra bs=1M count=2048
  chmod 600 /swapfile_extra
  mkswap /swapfile_extra
  swapon /swapfile_extra
  echo '/swapfile_extra none swap sw 0 0' >> /etc/fstab
  echo "✅ Memória Swap expandida com sucesso!"
fi

echo "=========================================================="
echo "🟢 3/5 INSTALANDO NODE.JS 22 LTS E PM2..."
echo "=========================================================="
if ! command -v node &> /dev/null || [[ $(node -v) != v22* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt install -y nodejs
fi

npm install -g pm2 tsx
echo "✅ Node.js: $(node -v) | NPM: $(npm -v) | PM2: $(pm2 -v)"

echo "=========================================================="
echo "🌐 4/5 INSTALANDO BIBLIOTECAS GRÁFICAS DO CHROMIUM (WPP)..."
echo "=========================================================="
apt install -y ca-certificates fonts-liberation libasound2t64 libatk-bridge2.0-0 libatk1.0-0 \
  libcairo2 libcups2 libdbus-1-3 libdrm2 libgbm1 libglib2.0-0 libgtk-3-0 \
  libnspr4 libnss3 libpango-1.0-0 libx11-6 libx11-xcb1 libxcb1 \
  libxcomposite1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 \
  libxrender1 libxss1 libxtst6 xdg-utils chromium-browser || apt install -y chromium || true

echo "=========================================================="
echo "🛡️ 5/5 CONFIGURANDO DIRETÓRIO DO PROJETO E PERMISSÕES..."
echo "=========================================================="
mkdir -p /var/www/painel-eleitoral
echo "✅ Diretório /var/www/painel-eleitoral criado!"

echo "=========================================================="
echo "🎉 AMBIENTE DA VPS PRONTO PARA RECEBER O CÓDIGO DO SISTEMA!"
echo "=========================================================="
free -h
`;

conn.on('ready', () => {
  console.log('✅ Conexão SSH confirmada! Executando automação no servidor...');
  
  conn.exec(setupCommands, (err, stream) => {
    if (err) {
      console.error('Erro ao executar comandos:', err);
      conn.end();
      process.exit(1);
    }
    
    stream.on('close', (code: number, signal: string) => {
      console.log(`\n🎉 INSTALAÇÃO FINALIZADA COM CÓDIGO: ${code}`);
      conn.end();
      process.exit(code === 0 ? 0 : 1);
    }).on('data', (data: Buffer) => {
      process.stdout.write(data.toString());
    }).stderr.on('data', (data: Buffer) => {
      process.stderr.write(data.toString());
    });
  });
}).on('error', (err) => {
  console.error('❌ Erro na conexão SSH:', err);
  process.exit(1);
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
