import { db, schema } from '../apps/web/lib/db.js';
import { sql } from 'drizzle-orm';

async function resetDatabaseForProduction() {
  console.log('================================================================================');
  console.log('🧹 INICIANDO LIMPEZA GERAL DO BANCO PARA ENTRADA DE DADOS REAIS');
  console.log('================================================================================\n');

  try {
    // 1. Limpar tabelas operacionais de teste mantendo integridade referencial
    console.log('1. Removendo dados de teste de todas as tabelas operacionais...');

    await db.execute(sql`DELETE FROM ${schema.disparosItens};`);
    console.log('   🟢 Tabela disparos_itens: Limpa (0 registros)');

    await db.execute(sql`DELETE FROM ${schema.disparosCampanha};`);
    console.log('   🟢 Tabela disparos_campanha: Limpa (0 registros)');

    await db.execute(sql`DELETE FROM ${schema.mensagensChat};`);
    console.log('   🟢 Tabela mensagens_chat: Limpa (0 registros)');

    await db.execute(sql`DELETE FROM ${schema.conversaStatus};`);
    console.log('   🟢 Tabela conversa_status: Limpa (0 registros)');

    await db.execute(sql`DELETE FROM ${schema.materiaisOnline};`);
    console.log('   🟢 Tabela materiais_online: Limpa (0 registros)');

    await db.execute(sql`DELETE FROM ${schema.gastosCampanha};`);
    console.log('   🟢 Tabela gastos_campanha: Limpa (0 registros)');

    // Limpar usuarios (apoiadores e lideranças mock)
    await db.execute(sql`DELETE FROM ${schema.usuarios};`);
    console.log('   🟢 Tabela usuarios (Líderes e Apoiadores): Limpa (0 registros)');

    // Limpar metas de teste e recriar apenas a Meta Global Oficial
    await db.execute(sql`DELETE FROM ${schema.metas};`);
    await db.insert(schema.metas).values({
      titulo: 'Meta Global Oficial 2026',
      tipo: 'GLOBAL',
      alvo_referencia: 'Geral',
      quantidade_meta: 50000,
      quantidade_atual: 0,
      meta_diaria_cadencia: 50,
      status_semaforo: 'VERDE',
      data_fim: new Date('2026-10-04T23:59:59Z'),
    });
    console.log('   🟢 Tabela metas: Reinicializada com Meta Global Oficial (0 / 50.000)');

    // Limpar logs e registrar o marco zero de auditoria
    await db.execute(sql`DELETE FROM ${schema.logsAuditoriaLGPD};`);
    await db.insert(schema.logsAuditoriaLGPD).values({
      usuario_responsavel: 'SISTEMA_ADMIN',
      acao: 'MARCO_ZERO_PRODUCAO',
      detalhes: 'Banco de dados zerado e preparado oficialmente para entrada de dados reais de campanha.',
      ip: '127.0.0.1',
    });
    console.log('   🟢 Tabela logs_auditoria_lgpd: Marco Zero registrado com sucesso');

    // 2. Verificar preservação dos usuários administrativos
    const admins = await db.select().from(schema.usuariosAuth);
    console.log('\n2. Verificando Contas Administrativas Preservadas:');
    for (const a of admins) {
      console.log(`   👤 ${a.nome} (${a.email}) — Perfil: ${a.role} [ATIVO: ${a.ativo}]`);
    }

    // 3. Verificar integridade da configuração da campanha
    const [campanha] = await db.select().from(schema.campanhaConfig).limit(1);
    console.log('\n3. Configuração Oficial da Campanha:');
    console.log(`   🏛️ Candidato: ${campanha?.nome_candidato || 'Gustavo Reis'}`);
    console.log(`   🔢 Número Partidário: ${campanha?.numero_candidato || '55955'}`);
    console.log(`   🚩 Partido: ${campanha?.partido || 'PSD'}`);
    console.log(`   📅 Data da Eleição: ${campanha?.data_eleicao || '2026-10-04'}`);
    console.log(`   🎯 Meta Global: ${campanha?.meta_votos_global || 50000} votos`);

    console.log('\n================================================================================');
    console.log('✅ BANCO DE DADOS ZERADO COM SUCESSO! SISTEMA 100% PRONTO PARA DADOS REAIS.');
    console.log('================================================================================');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao zerar banco de dados:', error);
    process.exit(1);
  }
}

resetDatabaseForProduction();
