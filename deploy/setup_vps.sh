#!/bin/bash
# ==============================================================================
# Script de Instalação e Configuração Automática da VPS Locaweb (Ubuntu 22/24)
# Painel Eleitoral 2026 • Node.js 22 + Chromium + WPPConnect + PM2 + Swap
# ==============================================================================

set -e

echo "=========================================================="
echo "🚀 INICIANDO CONFIGURAÇÃO DA VPS PAINEL ELEITORAL 2026..."
echo "=========================================================="

# 1. Atualização do Sistema Operacional
echo "📦 1/6 Atualizando repositórios do Ubuntu..."
export DEBIAN_FRONTEND=noninteractive
apt update -y && apt upgrade -y

# 2. Configuração de 2 GB de Memória Swap (Garante estabilidade para o Chrome)
echo "💾 2/6 Configurando 2 GB de Memória Swap em SSD..."
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    sysctl vm.swappiness=10
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
    echo "✅ Swap de 2 GB ativado com sucesso!"
else
    echo "ℹ️ Swapfile já existente, pulando criação."
fi

# 3. Instalação de Ferramentas Essenciais e FFmpeg
echo "🛠️ 3/6 Instalando ferramentas essenciais (Git, Curl, FFmpeg, UFW)..."
apt install -y curl wget git htop ufw ffmpeg build-essential \
    ca-certificates gnupg libasound2 libatk-bridge2.0-0 libatk1.0-0 \
    libcairo2 libcups2 libdbus-1-3 libdrm2 libgbm1 libglib2.0-0 \
    libnspr4 libnss3 libpango-1.0-0 libx11-6 libx11-xcb1 libxcb1 \
    libxcomposite1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 \
    libxrender1 libxss1 libxtst6 xdg-utils

# 4. Instalação do Node.js 22 LTS
echo "🟢 4/6 Instalando Node.js 22 LTS..."
if ! command -v node &> /dev/null || [[ $(node -v) != v22* ]]; then
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg --yes
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list
    apt update -y
    apt install -y nodejs
fi

echo "✅ Node.js versão: $(node -v)"
echo "✅ NPM versão: $(npm -v)"

# 5. Instalação do PM2 (Gerenciador de Processos 24/7)
echo "⚙️ 5/6 Instalando PM2 globalmente..."
npm install -g pm2
pm2 startup systemd -u root --hp /root || true

# 6. Configuração do Firewall (UFW)
echo "🛡️ 6/6 Configurando portas de segurança no Firewall..."
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw allow 3001/tcp # Porta da API Fastify
ufw --force enable

echo "=========================================================="
echo "🎉 VPS CONFIGURADA COM SUCESSO E PRONTA PARA OPERAÇÃO 24/7!"
echo "=========================================================="
echo "Memória Total Disponível (RAM + Swap):"
free -h
