import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH conectado. Gerando certificado SSL e configurando Nginx na VPS...');

  const commands = [
    'openssl req -x509 -nodes -days 3650 -newkey rsa:2048 -keyout /etc/ssl/private/painel-eleitoral.key -out /etc/ssl/certs/painel-eleitoral.crt -subj "/CN=191.252.201.102" -addext "subjectAltName=IP:191.252.201.102"',
    `cat << 'EOF' > /etc/nginx/sites-available/default
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    listen 443 ssl default_server;
    listen [::]:443 ssl default_server;

    server_name _;

    ssl_certificate /etc/ssl/certs/painel-eleitoral.crt;
    ssl_certificate_key /etc/ssl/private/painel-eleitoral.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\$host;
        proxy_cache_bypass \\$http_upgrade;
        proxy_set_header X-Real-IP \\$remote_addr;
        proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\$scheme;
    }

    location /docs {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\$host;
    }

    root /var/www/painel-eleitoral/apps/web/dist;
    index index.html;

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
        try_files \\$uri \\$uri/ /index.html;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
    }
}
EOF`,
    'nginx -t && systemctl reload nginx'
  ].join(' && ');

  conn.exec(commands, (err, stream) => {
    if (err) throw err;
    stream.on('data', (d: Buffer) => process.stdout.write(d));
    stream.stderr.on('data', (d: Buffer) => process.stderr.write(d));
    stream.on('close', (code: number) => {
      console.log(`\nConfiguração de SSL finalizada com código: ${code}`);
      conn.end();
    });
  });
}).connect({
  host: '191.252.201.102',
  port: 22,
  username: 'root',
  password: 'Gustavo#55955'
});
