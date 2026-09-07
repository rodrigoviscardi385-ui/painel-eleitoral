// Test upload of an image to the VPS API
const VPS_URL = 'http://191.252.201.102:3001';

async function testUpload() {
  console.log('🧪 Testando endpoint POST /api/upload...');
  
  // 1x1 transparent PNG in base64
  const sampleBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  const res = await fetch(`${VPS_URL}/api/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      base64: sampleBase64,
      filename: 'teste-foto.png',
      tipo: 'foto_candidato',
    }),
  });

  if (!res.ok) {
    console.error('❌ Falha no upload:', res.status, await res.text());
    process.exit(1);
  }

  const data = await res.json();
  console.log('✅ Upload concluído com sucesso:', data);

  // Agora testar download da imagem
  console.log(`📥 Testando GET ${VPS_URL}${data.url}...`);
  const getRes = await fetch(`${VPS_URL}${data.url}`);
  if (!getRes.ok) {
    console.error('❌ Falha ao buscar imagem enviada:', getRes.status);
    process.exit(1);
  }

  console.log('✅ Imagem servida com sucesso! Content-Type:', getRes.headers.get('content-type'));
  console.log('🎉 TUDO PRONTO E FUNCIONANDO PERFEITAMENTE!');
}

testUpload().catch(console.error);
