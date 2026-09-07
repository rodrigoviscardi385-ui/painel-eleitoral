/**
 * streetContractService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Gerador Oficial de Contratos Eleitorais de Prestação de Serviços (Equipe de Rua)
 * Em total conformidade com:
 *   • Artigo 100 da Lei Federal nº 9.504/1997 (Inexistência de Vínculo Empregatício)
 *   • Resolução TSE nº 23.607/2019 (Prestação de Contas e Contratação de Militância)
 *   • Opções jurídicas validadas: MEIO PERÍODO (4h/20h) e PERÍODO INTEGRAL (8h/40h)
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface WorkerContractData {
  id?: string;
  nome_completo: string;
  cpf: string;
  rg: string;
  rg_orgao_emissor?: string;
  titulo_eleitor?: string | null;
  zona_eleitoral?: string | null;
  secao_eleitoral?: string | null;
  telefone_whatsapp: string;
  endereco_completo: string;
  bairro: string;
  cidade?: string;
  uf?: string;
  cep: string;
  dados_bancarios_banco?: string | null;
  dados_bancarios_agencia?: string | null;
  dados_bancarios_conta?: string | null;
  chave_pix?: string | null;
  funcao_atividade?: string;
  tipo_jornada: 'MEIO_PERIODO' | 'PERIODO_INTEGRAL';
  carga_horaria_semanal?: number;
  remuneracao_pactuada: number | string;
  forma_pagamento?: string;
  data_inicio?: string | Date;
  data_fim?: string | Date;
  observacoes?: string | null;
}

export interface CandidateContractData {
  nome_urna?: string;
  nome_completo?: string;
  numero_candidato?: string;
  cargo?: string;
  partido?: string;
  coligacao?: string;
  cnpj_campanha?: string | null;
  cidade?: string;
  estado?: string;
  data_eleicao?: string;
}

function formatDateBR(dateInput?: string | Date): string {
  if (!dateInput) {
    return new Date().toLocaleDateString('pt-BR');
  }
  const d = new Date(dateInput);
  return isNaN(d.getTime()) ? new Date().toLocaleDateString('pt-BR') : d.toLocaleDateString('pt-BR');
}

function formatCurrency(val: number | string): string {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  return (isNaN(num) ? 0 : num).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function extensoReais(val: number | string): string {
  const num = Math.round(Number(val) || 0);
  if (num === 1500) return 'um mil e quinhentos reais';
  if (num === 2000) return 'dois mil reais';
  if (num === 2500) return 'dois mil e quinhentos reais';
  if (num === 3000) return 'três mil reais';
  if (num === 1000) return 'um mil reais';
  if (num === 1200) return 'um mil e duzentos reais';
  return `${formatCurrency(num)} de acordo com os limites eleitorais`;
}

export function generateStreetContract(
  worker: WorkerContractData,
  candidate?: CandidateContractData,
  options?: { tipo_jornada?: 'MEIO_PERIODO' | 'PERIODO_INTEGRAL'; carga_horaria_semanal?: number; remuneracao?: number | string }
) {
  const jornada = options?.tipo_jornada || worker.tipo_jornada || 'MEIO_PERIODO';
  const isMeioPeriodo = jornada === 'MEIO_PERIODO';
  const horasSemanais = options?.carga_horaria_semanal || (isMeioPeriodo ? 20 : 40);
  const horasDiarias = isMeioPeriodo ? 4 : 8;
  const valorRemuneracao = options?.remuneracao || worker.remuneracao_pactuada || (isMeioPeriodo ? 1500 : 3000);

  const candNome = candidate?.nome_completo || candidate?.nome_urna || 'GUSTAVO REIS';
  const candUrna = candidate?.nome_urna || 'GUSTAVO REIS';
  const candNumero = candidate?.numero_candidato || '55955';
  const candCargo = candidate?.cargo || 'Deputado Estadual';
  const candPartido = candidate?.partido || 'PSD';
  const candColigacao = candidate?.coligacao || 'Coligação Renovação e Trabalho';
  const candCnpj = candidate?.cnpj_campanha || '55.955.000/0001-26';
  const cidadeBase = candidate?.cidade || 'Santos';
  const estadoBase = candidate?.estado || 'SP';

  const dataInicioFormatada = formatDateBR(worker.data_inicio);
  const dataFimFormatada = formatDateBR(worker.data_fim || candidate?.data_eleicao || '2026-10-04');
  const dataHojeExtenso = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date());

  const clausulaJornadaTexto = isMeioPeriodo
    ? `3.1. A prestação de serviços se dará sob o regime estrito de MEIO PERÍODO, com carga horária diária de até 4 (quatro) horas e total de ${horasSemanais} (vinte) horas semanais, em turnos e itinerários previamente definidos pela coordenação geral de campanha, garantida a total autonomia de deslocamento do(a) CONTRATADO(A) e sem exigência de exclusividade funcional fora dos horários ajustados.`
    : `3.1. A prestação de serviços se dará sob o regime de PERÍODO INTEGRAL, com carga horária diária de até 8 (oito) horas e total de ${horasSemanais} (quarenta) horas semanais, com intervalo obrigatório de no mínimo 1 (uma) hora para refeição e descanso, em itinerários e ações públicas designadas pela coordenação geral de campanha, em conformidade com o cronograma eleitoral oficial.`;

  const clausulaJornadaHtml = isMeioPeriodo
    ? `<p><strong>3.1. REGIME DE MEIO PERÍODO:</strong> A prestação de serviços se dará sob o regime estrito de <strong>MEIO PERÍODO</strong>, com carga horária diária de até <strong>4 (quatro) horas</strong> e limite máximo de <strong>${horasSemanais} (vinte) horas semanais</strong>, em turnos e itinerários previamente alinhados com a coordenação de campanha, garantida a autonomia do(a) CONTRATADO(A) e sem exigência de dedicação exclusiva fora das horas convencionadas.</p>`
    : `<p><strong>3.1. REGIME DE PERÍODO INTEGRAL:</strong> A prestação de serviços se dará sob o regime de <strong>PERÍODO INTEGRAL</strong>, com carga horária diária de até <strong>8 (oito) horas</strong> e limite de <strong>${horasSemanais} (quarenta) horas semanais</strong>, com intervalo obrigatório de no mínimo 1 (uma) hora destinado a repouso e alimentação, distribuído conforme plano operacional de mobilização de rua.</p>`;

  // Montagem do Texto Puro (TXT)
  const plainText = `
INSTRUMENTO PARTICULAR DE CONTRATO DE PRESTAÇÃO DE SERVIÇOS TEMPORÁRIOS DE CAMPANHA ELEITORAL SEM VÍNCULO EMPREGATÍCIO
(Nos termos do Artigo 100 da Lei Federal nº 9.504/1997 e da Resolução TSE nº 23.607/2019)

CONTRATANTE:
ELEIÇÃO 2026 - ${candNome.toUpperCase()} - ${candCargo.toUpperCase()}
Número Eleitoral: ${candNumero} | Partido: ${candPartido} (${candColigacao})
CNPJ de Campanha: ${candCnpj}
Endereço do Comitê Central: Município de ${cidadeBase}/${estadoBase}

CONTRATADO(A):
Nome Completo: ${worker.nome_completo.toUpperCase()}
CPF: ${worker.cpf} | RG: ${worker.rg} (${worker.rg_orgao_emissor || 'SSP/SP'})
Título de Eleitor: ${worker.titulo_eleitor || 'Não informado'} | Zona: ${worker.zona_eleitoral || '--'} | Seção: ${worker.secao_eleitoral || '--'}
Endereço: ${worker.endereco_completo}, Bairro: ${worker.bairro}, ${worker.cidade || cidadeBase}/${worker.uf || estadoBase} - CEP: ${worker.cep}
Telefone/WhatsApp: ${worker.telefone_whatsapp}

As partes acima qualificadas têm, entre si, justo e avençado o presente Contrato de Prestação de Serviços Temporários para Campanha Eleitoral, mediante as cláusulas e condições seguintes:

CLÁUSULA PRIMEIRA – DO OBJETO
1.1. O presente instrumento tem por objeto a prestação de serviços de apoio operacional, militância e divulgação de rua da campanha eleitoral do(a) CONTRATANTE, compreendendo atividades como: distribuição de material gráfico informativo (panfletagem/santinhos), exibição de bandeiras e faixas, adesivaço em pontos autorizados, mobilização popular em carreatas, caminhadas e comícios, de acordo com o plano de ação e as posturas municipais vigentes.

CLÁUSULA SEGUNDA – DA INEXISTÊNCIA DE VÍNCULO EMPREGATÍCIO (LEI Nº 9.504/1997, ART. 100)
2.1. Em observância irrestrita e expressa ao ARTIGO 100 DA LEI FEDERAL Nº 9.504/1997, as partes reconhecem e declaram expressamente que a prestação de serviços contratada NÃO GERA QUALQUER ESPÉCIE DE VÍNCULO EMPREGATÍCIO entre o(a) CONTRATADO(A) e o(a) CONTRATANTE, seu Partido Político ou sua Coligação.
2.2. A presente relação é de cunho eminentemente cívico-eleitoral e de prestação temporária de serviços autônomos, não incidindo direitos previstos na CLT, aviso prévio, FGTS, férias, 13º salário ou qualquer indenização rescisória.

CLÁUSULA TERCEIRA – DA JORNADA DE TRABALHO E MODALIDADE PACTUADA
${clausulaJornadaTexto}
3.2. A função precípua exercida será: ${worker.funcao_atividade || 'MOBILIZADOR DE CAMPANHA / EQUIPE DE RUA'}.

CLÁUSULA QUARTA – DA REMUNERAÇÃO E FORMA DE PAGAMENTO (RESOLUÇÃO TSE 23.607/2019)
4.1. Pela prestação dos serviços ora pactuados, o(a) CONTRATANTE pagará ao(à) CONTRATADO(A) o valor total de ${formatCurrency(valorRemuneracao)} (${extensoReais(valorRemuneracao)}), a ser adimplido exclusivamente através da Conta Bancária Eleitoral da Campanha.
4.2. Dados de Pagamento do(a) CONTRATADO(A):
- Chave PIX: ${worker.chave_pix || worker.cpf} (Vinculada ao CPF do titular)
- Banco: ${worker.dados_bancarios_banco || 'Não informado'} | Agência: ${worker.dados_bancarios_agencia || '--'} | Conta: ${worker.dados_bancarios_conta || '--'}
4.3. É vedado expressamente o pagamento por meios não rastreáveis ou em desacordo com as exigências do Sistema de Prestação de Contas Eleitorais (SPCE/TSE).

CLÁUSULA QUINTA – DAS OBRIGAÇÕES E VEDAÇÕES ELEITORAIS ESTRITAS
5.1. O(A) CONTRATADO(A) obriga-se a agir com urbanidade, respeito aos cidadãos e zelar pela correta guarda e distribuição do material de campanha.
5.2. VEDAÇÃO TERMINANTE DE BOCA DE URNA: Fica expressa e formalmente PROIBIDA a prática de boca de urna no dia do pleito eleitoral (${dataFimFormatada}), distribuição de material de campanha próximo a locais de votação ou qualquer conduta tipificada como crime eleitoral pelo Art. 39, § 5º da Lei 9.504/1997. O descumprimento acarretará rescisão contratual imediata por justa causa e responsabilização pessoal do infrator.

CLÁUSULA SEXTA – DA VIGÊNCIA E RESCISÃO
6.1. O presente contrato vigorará no período de ${dataInicioFormatada} até ${dataFimFormatada}, cessando automaticamente com o término do pleito.
6.2. O contrato poderá ser rescindido a qualquer tempo por qualquer das partes mediante comunicação com 24 (vinte e quatro) horas de antecedência, ou imediatamente em caso de descumprimento das cláusulas aqui pactuadas.

CLÁUSULA SÉTIMA – DO FORO
7.1. Para dirimir qualquer controvérsia decorrente do presente contrato, as partes elegem o Foro da Comarca de ${cidadeBase}/${estadoBase}, com renúncia expressa a qualquer outro.

${cidadeBase}/${estadoBase}, ${dataHojeExtenso}.

____________________________________________________________
CONTRATANTE: ELEIÇÃO 2026 - ${candNome.toUpperCase()}
CNPJ: ${candCnpj}

____________________________________________________________
CONTRATADO(A): ${worker.nome_completo.toUpperCase()}
CPF: ${worker.cpf}

TESTEMUNHAS:

1. _________________________________      2. _________________________________
Nome:                                    Nome:
CPF:                                     CPF:
`;

  // Montagem do HTML Formatado para Impressão e PDF
  const printableHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Contrato Eleitoral TSE - ${worker.nome_completo}</title>
  <style>
    @page {
      size: A4;
      margin: 18mm 18mm 18mm 18mm;
    }
    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 11pt;
      line-height: 1.45;
      color: #111827;
      background-color: #ffffff;
      margin: 0;
      padding: 24px;
    }
    .header-box {
      border-bottom: 2px solid #047857;
      padding-bottom: 12px;
      margin-bottom: 18px;
      text-align: center;
    }
    .badge-tse {
      display: inline-block;
      font-family: Arial, sans-serif;
      background-color: #065f46;
      color: #ffffff;
      font-size: 8.5pt;
      font-weight: bold;
      padding: 3px 10px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    h1 {
      font-size: 13pt;
      font-weight: bold;
      margin: 4px 0;
      text-transform: uppercase;
      letter-spacing: 0.2px;
      color: #0f172a;
    }
    h2 {
      font-size: 10pt;
      font-weight: normal;
      color: #475569;
      margin: 2px 0 0 0;
    }
    .badge-jornada {
      display: inline-block;
      font-family: Arial, sans-serif;
      background-color: ${isMeioPeriodo ? '#dbeafe' : '#fef3c7'};
      color: ${isMeioPeriodo ? '#1e40af' : '#92400e'};
      border: 1px solid ${isMeioPeriodo ? '#93c5fd' : '#fcd34d'};
      font-size: 9pt;
      font-weight: bold;
      padding: 2px 8px;
      border-radius: 4px;
      margin-top: 6px;
    }
    .section-title {
      font-family: Arial, sans-serif;
      font-size: 10pt;
      font-weight: bold;
      color: #047857;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 2px;
      margin-top: 14px;
      margin-bottom: 6px;
      text-transform: uppercase;
    }
    .qualification-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 10pt;
    }
    .qualification-table td {
      padding: 4px 6px;
      vertical-align: top;
      border: 1px solid #e2e8f0;
    }
    .qualification-table .label {
      font-weight: bold;
      background-color: #f8fafc;
      width: 26%;
      color: #334155;
    }
    p {
      margin: 6px 0;
      text-align: justify;
      text-indent: 1.5em;
    }
    p.no-indent {
      text-indent: 0;
    }
    .alert-box {
      border: 1px solid #bbf7d0;
      background-color: #f0fdf4;
      padding: 8px 12px;
      border-radius: 4px;
      margin: 10px 0;
      font-size: 9.5pt;
    }
    .signatures-block {
      margin-top: 35px;
      page-break-inside: avoid;
    }
    .sig-row {
      display: flex;
      justify-content: space-between;
      margin-top: 25px;
    }
    .sig-col {
      width: 46%;
      text-align: center;
    }
    .sig-line {
      border-top: 1px solid #000000;
      margin-bottom: 4px;
      padding-top: 4px;
      font-size: 9.5pt;
      font-weight: bold;
    }
    .sig-sub {
      font-size: 8.5pt;
      color: #475569;
    }
    .footer-note {
      margin-top: 30px;
      font-size: 8pt;
      color: #64748b;
      text-align: center;
      border-top: 1px dashed #cbd5e1;
      padding-top: 8px;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>

  <div class="header-box">
    <div class="badge-tse">Justiça Eleitoral • Eleições Gerais 2026 • SPCE/TSE</div>
    <h1>CONTRATO DE PRESTAÇÃO DE SERVIÇOS TEMPORÁRIOS DE CAMPANHA</h1>
    <h2>Regido pelo Artigo 100 da Lei Federal nº 9.504/1997 e Resolução TSE nº 23.607/2019</h2>
    <div>
      <span class="badge-jornada">MODALIDADE: ${isMeioPeriodo ? 'MEIO PERÍODO (20 HORAS SEMANAIS)' : 'PERÍODO INTEGRAL (40 HORAS SEMANAIS)'}</span>
    </div>
  </div>

  <div class="section-title">1. Qualificação das Partes Contratantes</div>
  <table class="qualification-table">
    <tr>
      <td class="label">CONTRATANTE:</td>
      <td><strong>ELEIÇÃO 2026 - ${candNome.toUpperCase()}</strong> | Cargo: ${candCargo} | Partido: ${candPartido} (${candColigacao})<br/>
      <strong>CNPJ de Campanha:</strong> ${candCnpj} | Comitê Central: ${cidadeBase}/${estadoBase}</td>
    </tr>
    <tr>
      <td class="label">CONTRATADO(A):</td>
      <td><strong>${worker.nome_completo.toUpperCase()}</strong><br/>
      <strong>CPF:</strong> ${worker.cpf} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>RG:</strong> ${worker.rg} (${worker.rg_orgao_emissor || 'SSP/SP'})<br/>
      <strong>Título de Eleitor:</strong> ${worker.titulo_eleitor || 'Não informado'} &nbsp;|&nbsp; <strong>Zona:</strong> ${worker.zona_eleitoral || '--'} &nbsp;|&nbsp; <strong>Seção:</strong> ${worker.secao_eleitoral || '--'}<br/>
      <strong>Endereço:</strong> ${worker.endereco_completo}, ${worker.bairro}, ${worker.cidade || cidadeBase}/${worker.uf || estadoBase} - CEP: ${worker.cep}<br/>
      <strong>WhatsApp:</strong> ${worker.telefone_whatsapp}
      </td>
    </tr>
    <tr>
      <td class="label">DADOS BANCÁRIOS / PIX:</td>
      <td>
        <strong>Chave PIX:</strong> ${worker.chave_pix || worker.cpf} (Titularidade obrigatória do Contratado)<br/>
        <strong>Banco:</strong> ${worker.dados_bancarios_banco || 'Não informado'} | <strong>Agência:</strong> ${worker.dados_bancarios_agencia || '--'} | <strong>Conta:</strong> ${worker.dados_bancarios_conta || '--'}
      </td>
    </tr>
  </table>

  <p class="no-indent">Pelo presente instrumento particular, as partes acima qualificadas celebram o presente Contrato de Prestação de Serviços Temporários para Campanha Eleitoral, subordinando-se às seguintes cláusulas e condições:</p>

  <p><strong>CLÁUSULA PRIMEIRA – DO OBJETO:</strong> O presente contrato tem por objeto a prestação de serviços de apoio operacional, mobilização e divulgação de campanha eleitoral de rua em prol da candidatura do(a) CONTRATANTE no pleito de 2026, compreendendo atividades cívicas de distribuição de informativos de campanha (santinhos, praguinhas e folhetos), acionamento e agitação de bandeiras (bandeiraço), adesivaço em pontos regulares, apoio logístico e participação em carreatas e caminhadas autorizadas pelas vias públicas do município de ${cidadeBase}/${estadoBase}.</p>

  <div class="alert-box">
    <strong>CLÁUSULA SEGUNDA – DA TOTAL INEXISTÊNCIA DE VÍNCULO EMPREGATÍCIO (ART. 100 DA LEI Nº 9.504/1997):</strong><br/>
    Em observância obrigatória e irrevogável ao <strong>Artigo 100 da Lei Federal nº 9.504/1997</strong>, as partes expressamente declaram e anuem que a contratação de pessoal para prestação de serviços nas campanhas eleitorais <strong>NÃO GERA QUALQUER VÍNCULO EMPREGATÍCIO</strong> com o candidato ou com o partido/coligação contratante, configurando prestação de serviços cívico-eleitorais sem direitos decorrentes da Consolidação das Leis do Trabalho (CLT), tais como férias, aviso prévio, décimo terceiro salário ou depósito fundiário (FGTS).
  </div>

  <p><strong>CLÁUSULA TERCEIRA – DA JORNADA DE ATIVIDADES E CARGA HORÁRIA:</strong></p>
  ${clausulaJornadaHtml}
  <p>3.2. A função contratada corresponde à de <strong>${worker.funcao_atividade || 'MOBILIZADOR DE EQUIPE DE RUA'}</strong>, não havendo exclusividade fora das horas convencionadas.</p>

  <p><strong>CLÁUSULA QUARTA – DA CONTRAPRESTAÇÃO E PRESTAÇÃO DE CONTAS TSE:</strong> Pela execução pontual dos serviços, o(a) CONTRATANTE pagará ao(à) CONTRATADO(A) a importância de <strong>${formatCurrency(valorRemuneracao)} (${extensoReais(valorRemuneracao)})</strong>, adimplida por transferência eletrônica ou PIX a partir da Conta Bancária Eleitoral específica de campanha, ficando vedado o pagamento em dinheiro físico sem o respectivo Recibo Eleitoral do Sistema SPCE/TSE.</p>

  <p><strong>CLÁUSULA QUINTA – DAS VEDAÇÕES E PROIBIÇÃO DE BOCA DE URNA:</strong> O(A) CONTRATADO(A) compromete-se a agir com discrição, boa-fé e civilidade, ficando terminantemente <strong>PROIBIDA A PRÁTICA DE BOCA DE URNA NO DIA DO PLEITO</strong> (Art. 39, § 5º da Lei 9.504/1997), propaganda em locais de votação ou coação a eleitores, sob pena de rescisão sumária e responsabilidade penal pessoal.</p>

  <p><strong>CLÁUSULA SEXTA – DA VIGÊNCIA E RESCISÃO:</strong> Este contrato tem vigência de <strong>${dataInicioFormatada}</strong> até <strong>${dataFimFormatada}</strong>, podendo ser rescindido imotivadamente por qualquer das partes mediante comunicação prévia de 24 horas.</p>

  <p><strong>CLÁUSULA SÉTIMA – DO FORO:</strong> As partes elegem o Foro Eleitoral e Cível da Comarca de ${cidadeBase}/${estadoBase} para dirimir eventuais dúvidas.</p>

  <p class="no-indent" style="margin-top: 18px;">E, por estarem justos e contratados, assinam o presente em 2 (duas) vias de igual teor e forma na presença das testemunhas abaixo qualificadas.</p>

  <p style="text-align: right; margin-top: 15px;">${cidadeBase}/${estadoBase}, ${dataHojeExtenso}.</p>

  <div class="signatures-block">
    <div class="sig-row">
      <div class="sig-col">
        <div class="sig-line">ELEIÇÃO 2026 - ${candNome.toUpperCase()}</div>
        <div class="sig-sub">CONTRATANTE • CNPJ: ${candCnpj}</div>
      </div>
      <div class="sig-col">
        <div class="sig-line">${worker.nome_completo.toUpperCase()}</div>
        <div class="sig-sub">CONTRATADO(A) • CPF: ${worker.cpf}</div>
      </div>
    </div>

    <div class="sig-row" style="margin-top: 40px;">
      <div class="sig-col">
        <div class="sig-line">TESTEMUNHA 1</div>
        <div class="sig-sub">Nome: ___________________________________<br/>CPF: __________________ RG: ______________</div>
      </div>
      <div class="sig-col">
        <div class="sig-line">TESTEMUNHA 2</div>
        <div class="sig-sub">Nome: ___________________________________<br/>CPF: __________________ RG: ______________</div>
      </div>
    </div>
  </div>

  <div class="footer-note">
    Documento emitido eletronicamente via Sistema Eleitoral Santos 2026 • Validado em conformidade com o Artigo 100 da Lei 9.504/97 e Resolução TSE 23.607/2019.
  </div>

</body>
</html>`;

  return {
    plainText,
    printableHtml,
    jornada,
    horasSemanais,
    horasDiarias,
    valorRemuneracao,
    candidate: {
      nome: candNome,
      cargo: candCargo,
      partido: candPartido,
      cnpj: candCnpj,
    },
    worker: {
      nome: worker.nome_completo,
      cpf: worker.cpf,
      rg: worker.rg,
      telefone_whatsapp: worker.telefone_whatsapp,
    },
    dataInicio: dataInicioFormatada,
    dataFim: dataFimFormatada,
  };
}
