const BASE_URL = 'http://191.252.201.102';

async function main() {
  console.log('🧪 ========================================================');
  console.log('🧪 DIAGNÓSTICO COMPLETO DE TODOS OS CADASTROS DO SISTEMA');
  console.log('🧪 ========================================================\n');

  // 1. Health
  console.log('1️⃣ Testando /api/health...');
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  console.log('Status Health:', healthRes.status, await healthRes.json());

  // 2. Admin Login
  console.log('\n2️⃣ Testando Login Admin Master (/api/auth/login)...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@painel2026.com.br',
      senha: 'admin123',
    }),
  });
  const loginData = await loginRes.json();
  console.log('Status Login Admin:', loginRes.status, loginData.user?.email || loginData);
  const token = loginData.token;

  // 3. Register New User in Admin / LoginPage
  console.log('\n3️⃣ Testando Cadastro de Novo Usuário (/api/auth/register)...');
  const testEmail = `operador_${Date.now()}@teste.com`;
  const regUserRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: 'Operador Santos Teste',
      email: testEmail,
      senha: 'senha123456',
      whatsapp: '13991234567',
      cargo_desejado: 'OPERADOR',
    }),
  });
  console.log('Status Register User:', regUserRes.status, await regUserRes.json());

  // 4. Create Leader/Supporter (/api/liderancas)
  console.log('\n4️⃣ Testando Cadastro de Liderança/Apoiador (/api/liderancas)...');
  const testPhoneLider = `139${Math.floor(10000000 + Math.random() * 90000000)}`;
  const regLiderRes = await fetch(`${BASE_URL}/api/liderancas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      nome: 'Líder Vila Belmiro Teste',
      whatsapp: testPhoneLider,
      cargo: 'LIDER',
      bairro: 'Vila Belmiro',
      zona_eleitoral: '118',
      secao_eleitoral: '01',
    }),
  });
  console.log('Status Cadastro Liderança:', regLiderRes.status, await regLiderRes.json());

  // 5. Create Street Team Collaborator (/api/equipe-rua)
  console.log('\n5️⃣ Testando Cadastro de Colaborador de Rua (/api/equipe-rua)...');
  // Generate random valid-length CPF
  const randNum = Math.floor(100000000 + Math.random() * 900000000);
  const testCpf = `${randNum}99`;
  const testPhoneColab = `139${Math.floor(10000000 + Math.random() * 90000000)}`;
  const regColabRes = await fetch(`${BASE_URL}/api/equipe-rua`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      nome_completo: 'Carlos Mobilizador de Rua',
      cpf: testCpf,
      rg: '12345678-9',
      rg_orgao_emissor: 'SSP/SP',
      titulo_eleitor: '123456780199',
      zona_eleitoral: '118',
      secao_eleitoral: '02',
      telefone_whatsapp: testPhoneColab,
      endereco_completo: 'Rua Princesa Isabel, 100',
      bairro: 'Vila Belmiro',
      cidade: 'Santos',
      uf: 'SP',
      cep: '11000-000',
      tipo_jornada: 'MEIO_PERIODO',
      carga_horaria_semanal: 20,
      remuneracao_pactuada: 1500,
      forma_pagamento: 'PIX_CONTA_CAMPANHA',
      funcao_atividade: 'MOBILIZADOR_RUA',
    }),
  });
  const colabCreated = await regColabRes.json();
  console.log('Status Cadastro Colaborador Rua:', regColabRes.status, colabCreated);

  // 6. Validate Street Collaborator (/api/equipe-rua/auth/validar-colaborador)
  console.log('\n6️⃣ Testando Validar Colaborador com CPF (/api/equipe-rua/auth/validar-colaborador)...');
  const valColabRes = await fetch(`${BASE_URL}/api/equipe-rua/auth/validar-colaborador`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identificador: testCpf }),
  });
  const valData = await valColabRes.json();
  console.log('Status Validar Colaborador (CPF):', valColabRes.status, valData);

  console.log('\n6b. Testando Validar Colaborador com WhatsApp...');
  const valColabPhoneRes = await fetch(`${BASE_URL}/api/equipe-rua/auth/validar-colaborador`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identificador: testPhoneColab }),
  });
  console.log('Status Validar Colaborador (Phone):', valColabPhoneRes.status, await valColabPhoneRes.json());

  // 7. Primeiro Acesso / Criar Senha
  console.log('\n7️⃣ Testando Primeiro Acesso / Criar Senha (/api/equipe-rua/auth/primeiro-acesso)...');
  const primAcessoRes = await fetch(`${BASE_URL}/api/equipe-rua/auth/primeiro-acesso`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identificador: testCpf,
      novaSenha: 'senhaColab123',
    }),
  });
  const primAcessoData = await primAcessoRes.json();
  console.log('Status Primeiro Acesso:', primAcessoRes.status, primAcessoData);

  // 8. Login Colaborador Rua
  console.log('\n8️⃣ Testando Login Colaborador com Senha (/api/equipe-rua/auth/login)...');
  const loginColabRes = await fetch(`${BASE_URL}/api/equipe-rua/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identificador: testCpf,
      senha: 'senhaColab123',
    }),
  });
  const loginColabData = await loginColabRes.json();
  console.log('Status Login Colaborador:', loginColabRes.status, loginColabData);

  // 9. Coleta de Voto / Apoiador no PWA de Rua
  console.log('\n9️⃣ Testando Coleta de Voto / Apoiador no PWA (/api/equipe-rua/coleta-voto)...');
  const testPhoneVoto = `139${Math.floor(10000000 + Math.random() * 90000000)}`;
  const coletaRes = await fetch(`${BASE_URL}/api/equipe-rua/coleta-voto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: 'Apoiador Cívico Vila Belmiro',
      whatsapp: testPhoneVoto,
      bairro: 'Vila Belmiro',
      tags: ['Apoio 100%', 'Vila Belmiro'],
      lat: -23.9515,
      lng: -46.3395,
      membro_id: colabCreated?.id || valData?.id,
      cadastradoPor: 'Carlos Mobilizador de Rua',
    }),
  });
  console.log('Status Coleta de Voto PWA:', coletaRes.status, await coletaRes.json());

  // 10. Listar Apoiadores Coletados
  console.log('\n🔟 Testando Listar Apoiadores Coletados (/api/equipe-rua/apoiadores-coletados)...');
  const apoiadoresRes = await fetch(`${BASE_URL}/api/equipe-rua/apoiadores-coletados`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  console.log('Status Apoiadores Coletados:', apoiadoresRes.status, await apoiadoresRes.json());

  console.log('\n🏁 ========================================================');
  console.log('🏁 DIAGNÓSTICO CONCLUÍDO');
  console.log('🏁 ========================================================');
}

main().catch(console.error);
