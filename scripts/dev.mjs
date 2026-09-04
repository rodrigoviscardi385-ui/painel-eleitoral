import { spawn } from 'child_process';
import path from 'path';

console.log('================================================================');
console.log('🚀 Painel Eleitoral 2026 - Inicializando Web & API WhatsApp');
console.log('================================================================');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

const rootDir = process.cwd();

// 1. Inicia a API Fastify / Baileys (Porta 3001)
console.log('📡 [1/2] Iniciando API Fastify / Baileys (porta 3001)...');
const apiProcess = spawn(npmCmd, ['run', 'dev:api'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true,
});

// 2. Inicia o Frontend Next.js (Porta 3000)
console.log('🌐 [2/2] Iniciando Frontend Next.js (porta 3000)...');
const webProcess = spawn(npmCmd, ['run', 'dev:web'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true,
});

function cleanup() {
  console.log('\n🛑 Encerrando processos...');
  try {
    if (isWindows) {
      if (apiProcess.pid) spawn('taskkill', ['/pid', String(apiProcess.pid), '/f', '/t']);
      if (webProcess.pid) spawn('taskkill', ['/pid', String(webProcess.pid), '/f', '/t']);
    } else {
      apiProcess.kill();
      webProcess.kill();
    }
  } catch {}
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
