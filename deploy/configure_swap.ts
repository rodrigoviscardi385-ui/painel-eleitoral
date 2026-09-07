import { Client } from 'ssh2';

const VPS_HOST = '191.252.201.102';
const VPS_USER = 'root';
const VPS_PASS = 'Gustavo#55955';

async function main() {
  console.log('══════════════════════════════════════════════════════════════════════');
  console.log('⚡ CONFIGURAÇÃO DE SWAP OTIMIZADO (6GB TOTAL + SWAPPINESS=15)');
  console.log('══════════════════════════════════════════════════════════════════════\n');

  const conn = new Client();

  await new Promise<void>((resolve, reject) => {
    conn.on('ready', () => {
      console.log('✅ Conectado na VPS Locaweb via SSH.');

      const script = `
        echo "=== [1/5] DESATIVANDO ARQUIVO DE SWAP ATUAL ==="
        swapoff /swapfile_extra || true

        echo "=== [2/5] ALOCANDO NOVO SWAPFILE DE 5GB (TOTAL 6GB COM PARTIÇÃO) ==="
        rm -f /swapfile_extra
        fallocate -l 5G /swapfile_extra || dd if=/dev/zero of=/swapfile_extra bs=1M count=5120 status=progress
        chmod 600 /swapfile_extra
        mkswap /swapfile_extra

        echo "=== [3/5] ATIVANDO NOVO SWAP ==="
        swapon /swapfile_extra

        echo "=== [4/5] PERSISTINDO NO FSTAB ==="
        grep -qxF '/swapfile_extra none swap sw 0 0' /etc/fstab || echo '/swapfile_extra none swap sw 0 0' >> /etc/fstab

        echo "=== [5/5] AJUSTANDO SWAPPINESS=15 E VFS_CACHE_PRESSURE=50 PARA ALTA PERFORMANCE ==="
        cat << 'EOF' > /etc/sysctl.d/99-swap-tuning.conf
vm.swappiness=15
vm.vfs_cache_pressure=50
EOF
        sysctl --system > /dev/null

        echo "\n=== RESULTADO FINAL DE MEMÓRIA E SWAP ==="
        free -h
        echo "\n=== DISPOSITIVOS DE SWAP ATIVOS ==="
        swapon --show
        echo "\n=== SWAPPINESS ATUAL ==="
        cat /proc/sys/vm/swappiness
        echo "\n=== ESPAÇO EM DISCO DISPONÍVEL ==="
        df -h /
      `;

      conn.exec(script, (err, stream) => {
        if (err) return reject(err);

        stream.on('data', (d: Buffer) => process.stdout.write(d.toString()));
        stream.stderr.on('data', (d: Buffer) => process.stderr.write(d.toString()));
        stream.on('close', (code: number) => {
          conn.end();
          if (code === 0) {
            console.log('\n🎉 Swap otimizado configurado com sucesso na VPS!');
            resolve();
          } else {
            reject(new Error(`Script finalizou com código ${code}`));
          }
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
}

main().catch((err) => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
