import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  console.log('Configurando Nginx na VPS para expor a API e o Painel na porta 80 pública...');

  const nginxScript = `
    apt-get update -y
    apt-get install -y nginx
    
    cat << 'EOF' > /etc/nginx/sites-available/default
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;

    # Proxy para a API Fastify
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /docs {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    # Frontend estático
    root /var/www/painel-eleitoral/apps/web/dist;
    index index.html;

    # Evita cache do index.html para que atualizações de UI/UX entrem imediatamente no navegador
    location = /index.html {
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
        add_header Pragma "no-cache";
        add_header Expires 0;
    }

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
    }
}
EOF

    systemctl restart nginx
    systemctl enable nginx
    curl -i http://127.0.0.1/api/health
  `;

  conn.exec(nginxScript, (err, stream) => {
    stream.on('data', (d) => process.stdout.write(d.toString()));
    stream.on('close', (code) => {
      console.log('\nNginx configurado com código:', code);
      conn.end();
      process.exit(code === 0 ? 0 : 1);
    });
  });
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
