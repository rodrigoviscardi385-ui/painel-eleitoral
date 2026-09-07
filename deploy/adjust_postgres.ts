import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ Conectado na VPS para afinar o PostgreSQL...');
  conn.exec(`
    # Permitir conexões locais com senha
    sed -i "s/127.0.0.1\\/32            scram-sha-256/127.0.0.1\\/32            scram-sha-256\\nlocal   all             all                                     trust/g" /etc/postgresql/*/main/pg_hba.conf || true
    systemctl restart postgresql
    echo "PostgreSQL pronto e reiniciado!"
  `, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.end();
      process.exit(0);
    }).on('data', (d) => process.stdout.write(d.toString()));
  });
}).connect({
  host: '191.252.201.102',
  port: 22,
  username: 'root',
  password: 'Gustavo#55955'
});
