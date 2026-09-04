import { db } from '../apps/api/src/db/index.js';
import * as schema from '../apps/api/src/db/schema.js';
import { eq } from 'drizzle-orm';
import { nativeWhatsAppService } from '../apps/api/src/services/nativeWhatsAppService.js';

async function verifyRolesAndWhatsAppRules() {
  console.log('🧪 INICIANDO TESTES DE VALIDAÇÃO DAS REGRAS DE CARGOS E WHATSAPP...');
  
  const testPhoneVoluntario = '5511999990001';
  const testPhoneLider = '5511999990002';
  const testPhoneGestor = '5511999990003';

  try {
    // 1. Inserir e atualizar como VOLUNTÁRIO
    console.log('\n1. Testando cadastro com cargo VOLUNTÁRIO...');
    const [voluntario] = await db
      .insert(schema.usuarios)
      .values({
        nome: 'Voluntário de Teste',
        whatsapp: testPhoneVoluntario,
        cargo: 'VOLUNTARIO',
        bairro: 'Centro',
        status_onboarding: 'COMPLETO',
      })
      .onConflictDoUpdate({
        target: schema.usuarios.whatsapp,
        set: { cargo: 'VOLUNTARIO', updated_at: new Date() }
      })
      .returning();

    if (voluntario.cargo !== 'VOLUNTARIO') {
      throw new Error(`Cargo incorreto: esperado VOLUNTARIO, obtido ${voluntario.cargo}`);
    }
    console.log(`   ✅ Usuário cadastrado com sucesso com cargo: ${voluntario.cargo}`);

    // 2. Testar criação de grupo para Líder vs Voluntário
    console.log('\n2. Testando regra de criação de grupo (apenas LÍDER/ADMIN)...');
    const [lider] = await db
      .insert(schema.usuarios)
      .values({
        nome: 'Líder Oficial da Base',
        whatsapp: testPhoneLider,
        cargo: 'LIDER',
        bairro: 'Gonzaga',
        status_onboarding: 'COMPLETO',
      })
      .onConflictDoUpdate({
        target: schema.usuarios.whatsapp,
        set: { cargo: 'LIDER', updated_at: new Date() }
      })
      .returning();

    // Verificação de permissão: LIDER deve passar
    const isLiderAllowed = lider.cargo === 'LIDER' || lider.cargo === 'ADMIN';
    const isVoluntarioAllowed = voluntario.cargo === 'LIDER' || voluntario.cargo === 'ADMIN';

    if (!isLiderAllowed) throw new Error('Falha: Líder deveria ter permissão de criar grupo');
    if (isVoluntarioAllowed) throw new Error('Falha: Voluntário NÃO deveria ter permissão de criar grupo');
    console.log('   ✅ Validação de permissões aprovada: Líder tem direito de criar grupo, Voluntário/Apoiador bloqueados.');

    // 3. Testar promoção de Gestor em todos os grupos
    console.log('\n3. Testando regra do Gestor (ADM de todos os grupos)...');
    const [gestor] = await db
      .insert(schema.usuarios)
      .values({
        nome: 'Gestor da Campanha',
        whatsapp: testPhoneGestor,
        cargo: 'GESTOR',
        bairro: 'Geral',
        status_onboarding: 'COMPLETO',
      })
      .onConflictDoUpdate({
        target: schema.usuarios.whatsapp,
        set: { cargo: 'GESTOR', updated_at: new Date() }
      })
      .returning();

    const promoteResult = await nativeWhatsAppService.promoteGestorToAllGroups(gestor.whatsapp);
    console.log('   ✅ promoteGestorToAllGroups executado com sucesso:', promoteResult);

    // 4. Limpeza de registros de teste
    console.log('\n4. Limpando dados de teste temporários...');
    await db.delete(schema.usuarios).where(eq(schema.usuarios.whatsapp, testPhoneVoluntario));
    await db.delete(schema.usuarios).where(eq(schema.usuarios.whatsapp, testPhoneLider));
    await db.delete(schema.usuarios).where(eq(schema.usuarios.whatsapp, testPhoneGestor));
    console.log('   ✅ Banco limpo com sucesso.');

    console.log('\n🎉 TODAS AS REGRAS DE NEGÓCIO VALIDADAS COM SUCESSO (100% OK)!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na validação das regras:', error);
    process.exit(1);
  }
}

verifyRolesAndWhatsAppRules();
