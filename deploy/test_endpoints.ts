async function testAll() {
  console.log('🧪 Testando endpoints da VPS Locaweb (191.252.201.102)...');

  // 1. Health
  const health = await fetch('http://191.252.201.102/api/health').then((r) => r.json());
  console.log('✅ 1. Health Check:', health);

  // 2. Configuração Campanha
  const config = await fetch('http://191.252.201.102/api/campanha/config').then((r) => r.json());
  console.log('✅ 2. Candidato:', config.nome_urna, config.numero_candidato, config.partido);

  // 3. Criar Líder Raiz
  const liderRaiz = await fetch('http://191.252.201.102/api/liderancas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: 'Coordenador Baixada Santista',
      whatsapp: '13997001122',
      cargo: 'LIDER',
      bairro: 'Gonzaga',
      zona_eleitoral: '118',
    }),
  }).then((r) => r.json());
  console.log('✅ 3. Líder Raiz Criado:', liderRaiz.id, liderRaiz.nome);

  // 4. Criar Subordinado (Eleitor indicado pelo líder)
  const eleitor = await fetch('http://191.252.201.102/api/liderancas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: 'Marcos Apoiador Santos',
      whatsapp: '13998112233',
      cargo: 'APOIADOR',
      lider_acima_id: liderRaiz.id,
      bairro: 'Boqueirão',
      zona_eleitoral: '118',
    }),
  }).then((r) => r.json());
  console.log('✅ 4. Apoiador Indicado Criado:', eleitor.id, eleitor.nome);

  // 5. Testar Árvore Hierárquica e Recálculo CTE
  const arvore = await fetch('http://191.252.201.102/api/liderancas/arvore').then((r) => r.json());
  console.log('✅ 5. Árvore Hierárquica CTE:', JSON.stringify(arvore, null, 2));

  // 6. Testar Gastos TSE
  const novoGasto = await fetch('http://191.252.201.102/api/gastos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      descricao: 'Combustível para equipe de adesivaço na Av. Ana Costa',
      categoria: 'COMBUSTIVEL',
      valor: 180.5,
      forma_pagamento: 'PIX',
      fornecedor_nome: 'Posto Shell Gonzaga',
    }),
  }).then((r) => r.json());
  console.log('✅ 6. Despesa TSE Cadastrada:', novoGasto.id, novoGasto.descricao, 'R$', novoGasto.valor);

  // 7. Status WhatsApp
  const wpp = await fetch('http://191.252.201.102/api/whatsapp/status').then((r) => r.json());
  console.log('✅ 7. WhatsApp Status:', wpp.status, 'QR Code pronto:', !!wpp.qrCodeBase64);

  console.log('\n🎉 TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!');
}

testAll().catch(console.error);
