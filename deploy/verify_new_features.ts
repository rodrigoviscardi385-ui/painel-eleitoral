async function testAll() {
  const BASE = 'http://191.252.201.102';

  console.log('🔍 1. Testando Health Check...');
  const resHealth = await fetch(`${BASE}/api/health`);
  console.log('Health:', resHealth.status, await resHealth.json());

  console.log('\n🏫 2. Testando Busca de Escolas de Santos (Passo 3)...');
  const resEscolas = await fetch(`${BASE}/api/locais-votacao?busca=Martim`);
  const escolas = await resEscolas.json();
  console.log(`Escolas encontradas (${escolas.length}):`, escolas.map((e: any) => `${e.nome_escola} - ${e.bairro} (Zona ${e.zona_eleitoral})`));

  console.log('\n📊 3. Testando Estatísticas Eleitorais de Santos...');
  const resStats = await fetch(`${BASE}/api/locais-votacao/estatisticas`);
  console.log('Estatísticas Santos:', await resStats.json());

  console.log('\n🗳️ 4. Testando Apuração Prévia BU (Passo 1 / Pergunta do BU)...');
  const resApuracao = await fetch(`${BASE}/api/bu/apuracao`);
  console.log('Apuração Inicial:', await resApuracao.json());

  console.log('\n📱 5. Testando Processamento de QR-BU Oficial...');
  // QRBU Oficial Simulado do TSE: Zona 118, Seção 1 (EMEF Martim Afonso), 300 aptos, 260 comp, candidato 55955 com 84 votos
  const qrMock = 'QRBU:VR=01;ORIG=OFICIAL;MUNIC=SANTOS;UF=SP;ZON=118;SEC=1;APT=300;COM=260;FAL=40;VOT=55955:84;VOT=55:12;VOT=13:45;VOT=22:78;BRN=15;NUL=26;HASH=AB12CD34;';
  const resBU = await fetch(`${BASE}/api/bu/processar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      qrCodeData: qrMock,
      enviadoPorNome: 'Coordenador Regional Santos',
      enviadoPorWhatsApp: '13997123456',
    }),
  });
  console.log('Resultado Processar BU:', resBU.status, await resBU.json());

  console.log('\n🗳️ 6. Testando Apuração com o BU Processado...');
  const resApuracaoFinal = await fetch(`${BASE}/api/bu/apuracao`);
  const apuracaoFinal = await resApuracaoFinal.json();
  console.log('Totais de Votos do Candidato:', apuracaoFinal.totalVotosCandidato);
  console.log('Comparecimento:', apuracaoFinal.totalComparecimento);
  console.log('Seções Apuradas:', apuracaoFinal.totalSecoesApuradas, `(${apuracaoFinal.percentualApurado}%)`);
  console.log('Média por Seção:', apuracaoFinal.mediaPorSecao);
  console.log('Projeção 100% Urnas Santos:', apuracaoFinal.projecaoTotalVotos, 'votos estimados');
  console.log('Por Zona:', apuracaoFinal.porZona);
  console.log('Ranking Bairros:', apuracaoFinal.rankingBairros);

  console.log('\n✅ Todos os testes de validação finalizados com sucesso!');
}

testAll().catch(console.error);
