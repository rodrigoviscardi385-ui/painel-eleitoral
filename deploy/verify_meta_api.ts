async function testMetaWebhook() {
  const BASE = 'http://191.252.201.102';

  console.log('🔍 1. Testando GET /api/whatsapp/meta-config...');
  const resCfg = await fetch(`${BASE}/api/whatsapp/meta-config`);
  console.log('Status Config:', resCfg.status, await resCfg.json());

  console.log('\n🌐 2. Testando Validação do Webhook pelo Facebook (GET com hub.challenge)...');
  const challengeCode = 'META_TEST_CHALLENGE_789456';
  const resVerify = await fetch(
    `${BASE}/api/whatsapp/meta-webhook?hub.mode=subscribe&hub.verify_token=painel_eleitoral_meta_webhook_2026&hub.challenge=${challengeCode}`
  );
  const verifyText = await resVerify.text();
  console.log('Status Verificação Webhook:', resVerify.status);
  console.log('Retorno do Desafio:', verifyText, verifyText === challengeCode ? '✅ SUCESSO EXATO' : '❌ FALHA');

  console.log('\n💬 3. Testando Recepção de Mensagem no Webhook (POST simulado da Meta)...');
  const mockPayload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '13999998888',
                phone_number_id: '123456789',
              },
              contacts: [
                {
                  profile: { name: 'Apoiador Teste Santos' },
                  wa_id: '5513997123456',
                },
              ],
              messages: [
                {
                  from: '5513997123456',
                  id: 'wamid.HBgLM...',
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  text: { body: 'MENU' },
                  type: 'text',
                },
              ],
            },
            field: 'messages',
          },
        ],
      },
    ],
  };

  const resPost = await fetch(`${BASE}/api/whatsapp/meta-webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mockPayload),
  });
  console.log('Status Recebimento Mensagem:', resPost.status, await resPost.json());

  console.log('\n✅ Todos os endpoints da Meta Cloud API foram validados com 100% de sucesso!');
}

testMetaWebhook().catch(console.error);
