/**
 * sprint_validation.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Bateria de Testes Automatizados de Engenharia: Validação das 4 Sprints.
 * Execução direta via: npx tsx tests/sprint_validation.ts
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { CryptoVaultService } from '../apps/api/src/services/cryptoVaultService.js';
import { IdempotencyService } from '../apps/api/src/services/idempotencyService.js';
import { LgpdComplianceService } from '../apps/api/src/services/lgpdComplianceService.js';
import { VoiceParserService } from '../apps/api/src/services/voiceParserService.js';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${testName} - ${detail || 'Asserção falhou'}`);
    failedTests++;
  }
}

async function runSprintValidationSuite() {
  console.log('================================================================');
  console.log('🏛️  SUÍTE DE VALIDAÇÃO DE ENGENHARIA - PAINEL ELEITORAL 2026');
  console.log('================================================================\n');

  // ─── SPRINT 1: PII VAULT, CRIPTOGRAFIA & LGPD ──────────────────────────────
  console.log('--- [SPRINT 1: INFRAESTRUTURA CORE & PII VAULT] ---');

  // Teste 1.1: Criptografia AES-256-GCM Envelope Encryption
  const plainText = 'Candidato Gustavo Reis 55955 - CPF: 123.456.789-00';
  const encrypted = CryptoVaultService.encrypt(plainText);
  assert(
    encrypted.encryptedData.length > 0 && encrypted.iv.length > 0 && encrypted.authTag.length > 0,
    'AES-256-GCM: Geração de cifra, IV e Auth Tag válidos'
  );

  // Teste 1.2: Decriptação e integridade do payload
  const decrypted = CryptoVaultService.decrypt(encrypted);
  assert(decrypted === plainText, 'AES-256-GCM: Decriptação idêntica ao texto plano original');

  // Teste 1.3: Blind Index determinístico e unidirecional
  const cpf1 = '123.456.789-00';
  const cpf2 = '12345678900'; // Formatação diferente deve normalizar para o mesmo hash
  const blind1 = CryptoVaultService.computeBlindIndex(cpf1);
  const blind2 = CryptoVaultService.computeBlindIndex(cpf2);
  assert(
    blind1 === blind2 && blind1.length === 64,
    'Blind Index: Busca exata determinística sem expor dados civis'
  );

  // Teste 1.4: Idempotência Atômica
  const idempotencyKey = `idemp_test_${Date.now()}`;
  const lock1 = await IdempotencyService.acquireLock(idempotencyKey);
  assert(lock1.acquired === true, 'Idempotência: Aquisição de primeiro lock com sucesso');

  const lock2 = await IdempotencyService.acquireLock(idempotencyKey);
  assert(
    lock2.acquired === false && lock2.state === 'PROCESSING',
    'Idempotência: Bloqueio atômico contra requisição duplicada simultânea'
  );

  await IdempotencyService.commit(idempotencyKey, { acknowledged: true });
  const lock3 = await IdempotencyService.acquireLock(idempotencyKey);
  assert(
    lock3.acquired === false && lock3.state === 'COMMITTED',
    'Idempotência: Replay de resposta consolidada sem reexecução no banco'
  );

  // Teste 1.5: Salvaguarda LGPD de Opt-out Irreversível
  const allowedTransition = LgpdComplianceService.validateConsentTransition(true, true);
  assert(allowedTransition.allowed === true, 'LGPD: Manutenção de consentimento ativo permitida');

  const optOutTransition = LgpdComplianceService.validateConsentTransition(true, false);
  assert(optOutTransition.allowed === true, 'LGPD: Registro de opt-out (revogação) permitido');

  const illegalTransition = LgpdComplianceService.validateConsentTransition(false, true);
  assert(
    illegalTransition.allowed === false,
    'LGPD: Reversão de opt-out bloqueada sumariamente por conformidade legal'
  );

  // ─── SPRINT 2: MOTOR DE SINCRONIZAÇÃO & INGESTÃO POR VOZ ───────────────────
  console.log('\n--- [SPRINT 2: MOTOR DE SINCRONIZAÇÃO & APP DE CAMPO] ---');

  // Teste 2.1: Parser de Notas de Voz de Campo
  const sampleVoiceTranscription =
    'Conversei com o morador Carlos no bairro Aparecida. Ele disse que com certeza vota no candidato e elogiou a proposta para os postos de saúde da região.';
  const parsedLead = await VoiceParserService.parseCanvasserNote(sampleVoiceTranscription);
  assert(
    parsedLead.intencao_voto === 'CONFIRMADO' && parsedLead.pautas_relevantes.includes('Saúde'),
    'Parser de Voz: Extração automática de intenção de voto confirmada e pauta de saúde'
  );

  // Teste 2.2: Detecção de oposição em relato informal
  const hostileTranscription =
    'Eleitor no Gonzaga disse que não quer saber de política e vai votar no outro com certeza.';
  const hostileLead = await VoiceParserService.parseCanvasserNote(hostileTranscription);
  assert(
    hostileLead.intencao_voto === 'OPOSICAO' && hostileLead.score_engajamento <= 20,
    'Parser de Voz: Identificação precisa de eleitor de oposição com baixo score'
  );

  // ─── SPRINT 3: WAR ROOM, SIRENE DE CRISE & RES. TSE 23.610 ─────────────────
  console.log('\n--- [SPRINT 3: INTELIGÊNCIA ANALÍTICA & SIRENE DE CRISE] ---');

  // Teste 3.1: Etiqueta Obrigatória de Transparência de IA (TSE Res. 23.610/2019)
  const draftMessage = 'Confira as novas propostas do candidato para a educação e creches de tempo integral.';
  const disclaimedMessage = LgpdComplianceService.applyAiTransparencyDisclaimer(draftMessage);
  assert(
    disclaimedMessage.includes('Resolução TSE nº 23.610/2019'),
    'TSE Res. 23.610/2019: Inclusão inegociável de transparência de Inteligência Artificial'
  );

  // Teste 3.2: Cadeia de Custódia Probatória (Hash SHA-256)
  const evidenceData = 'video_montagem_fake_whatsapp_2026.mp4';
  const evidenceHash = CryptoVaultService.generateEvidenceHash(evidenceData);
  assert(
    evidenceHash.length === 64,
    'Sirene de Crise: Geração de hash SHA-256 imutável para instrução em AIJE/TSE'
  );

  // ─── GAP ANALYSIS: BI DO QUOCIENTE, ANTI-FRAUDE & PUSH RFC 8030 ─────────────
  console.log('\n--- [GAP ANALYSIS: MÓDULOS DE GUERRA POLÍTICA] ---');

  // Teste 4.1: Anti-Fraud Guard - Detecção de Cadastros em Velocidade Inumana
  const now = Date.now();
  const fakeBatch = [
    { timestamp: now, whatsapp: '13991110001', latitude: -23.96, longitude: -46.33 },
    { timestamp: now + 5000, whatsapp: '13991110002', latitude: -23.96, longitude: -46.33 },
    { timestamp: now + 9000, whatsapp: '13991110003', latitude: -23.96, longitude: -46.33 },
    { timestamp: now + 12000, whatsapp: '13991110004', latitude: -23.96, longitude: -46.33 },
  ];
  const { AntiFraudGuardService } = await import('../apps/api/src/services/antiFraudGuardService.js');
  const fraudReport = await AntiFraudGuardService.auditBatch('dev_bot_test', 'Cabo Suspeito', fakeBatch);
  assert(
    fraudReport.fraudScore >= 45.0 && fraudReport.flags.includes('VELOCIDADE_INUMANA_CADASTRO'),
    'Anti-Fraud Guard: Detecção imediata de rajada inumana de cadastros e números sequenciais'
  );

  // Teste 4.2: Anti-Fraud Guard - Lote limpo com velocidade e espaçamento natural
  const cleanBatch = [
    { timestamp: now, whatsapp: '13997812041', latitude: -23.961, longitude: -46.332 },
    { timestamp: now + 180000, whatsapp: '13988223399', latitude: -23.968, longitude: -46.339 },
  ];
  const cleanReport = await AntiFraudGuardService.auditBatch('dev_human_test', 'Líder Genuíno', cleanBatch);
  assert(
    cleanReport.status === 'CLEAN' && cleanReport.fraudScore === 0,
    'Anti-Fraud Guard: Aprovação de militância com ritmo humano e dispersão geográfica'
  );

  // Teste 4.3: Push Notification Service - Estrutura RFC 8030 High Priority
  const { PushNotificationService } = await import('../apps/api/src/services/pushNotificationService.js');
  const pushBroadcast = await PushNotificationService.broadcastUrgentCrisis({
    incidentId: 'crs_test_01',
    topic: 'Denúncia Infundada sobre Postos de Saúde',
    synthesis: 'Áudio manipulado tentando desestabilizar a campanha na Zona Noroeste.',
    threatLevel: 'CRITICAL',
    actionUrl: '/warroom?incident=crs_test_01',
  });
  assert(
    pushBroadcast.status === 'BROADCAST_COMPLETED',
    'Push High Priority: Disparo de emergência com bypass sonoro e Full-Screen Intent'
  );

  // ─── RESULTADO FINAL ───────────────────────────────────────────────────────
  console.log('\n================================================================');
  console.log(`📊 RESULTADO DA SUÍTE: ${passedTests} APROVADOS | ${failedTests} FALHAS`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSprintValidationSuite().catch((err) => {
  console.error('❌ Erro fatal na execução dos testes:', err);
  process.exit(1);
});
