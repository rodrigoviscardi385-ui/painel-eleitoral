import { resetDatabaseToCleanSlate, queryClient } from './index.js';

async function run() {
  console.log('══════════════════════════════════════════════════════════════════════');
  console.log('🧹 EXECUTANDO PROTOCOLO ZERO-DATA: LIMPEZA COMPLETA DO BANCO DE DADOS');
  console.log('══════════════════════════════════════════════════════════════════════');

  try {
    const results = await resetDatabaseToCleanSlate();
    console.log('\n✅ SUCESSO ABSOLUTO! BANCO 100% ZERADO E PRONTO PARA PRODUÇÃO:');
    console.table(results);
    await queryClient.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERRO AO EXECUTAR O RESET:', error);
    await queryClient.end();
    process.exit(1);
  }
}

run();
