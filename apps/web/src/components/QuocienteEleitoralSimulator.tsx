import React, { useState, useMemo } from 'react';
import {
  Calculator,
  Award,
  TrendingUp,
  HelpCircle,
  BarChart2,
  Users,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  Info,
  RefreshCw,
} from 'lucide-react';

interface ChapaSimulada {
  id: string;
  nome: string;
  votosEstimados: number;
  candidatoPrincipalNome: string;
  votosCandidatoPrincipal: number;
}

export const QuocienteEleitoralSimulator: React.FC = () => {
  // Parâmetros Gerais da Eleição
  const [cargo, setCargo] = useState<'VEREADOR' | 'DEP_FEDERAL' | 'DEP_ESTADUAL'>('VEREADOR');
  const [municipioEstado, setMunicipioEstado] = useState('Santos / SP');
  const [eleitoresAptos, setEleitoresAptos] = useState<number>(353000);
  const [taxaAbstencao, setTaxaAbstencao] = useState<number>(21.5); // %
  const [taxaBrancosNulos, setTaxaBrancosNulos] = useState<number>(8.0); // %
  const [numeroVagas, setNumeroVagas] = useState<number>(21); // Vagas em Santos

  // Dados da Chapa do Candidato
  const [votosChapa, setVotosChapa] = useState<number>(28500);
  const [nomeCandidato, setNomeCandidato] = useState('Gustavo Reis');
  const [numeroCandidato, setNumeroCandidato] = useState('55955');
  const [partidoCandidato, setPartidoCandidato] = useState('PSD');
  const [votosCandidato, setVotosCandidato] = useState<number>(4200);

  // Cálculos Eleitorais Oficiais do TSE (Lei 14.211/2021)
  const calculos = useMemo(() => {
    // 1. Total de comparecimento
    const totalComparecimento = Math.round(eleitoresAptos * (1 - taxaAbstencao / 100));
    // 2. Votos Brancos e Nulos
    const totalBrancosNulos = Math.round(totalComparecimento * (taxaBrancosNulos / 100));
    // 3. Votos Válidos (Nominais + Legenda)
    const votosValidos = totalComparecimento - totalBrancosNulos;

    // 4. Quociente Eleitoral (QE) = Votos Válidos / Vagas
    const qe = Math.round(votosValidos / numeroVagas);

    // 5. Cláusula de Desempenho Individual = 10% do QE
    const clausulaIndividual = Math.round(qe * 0.1);

    // 6. Regra 80/20 do TSE para Sobras:
    // Partido deve atingir no mínimo 80% do QE
    const notaCortePartidoSobras = Math.round(qe * 0.8);
    // Candidato deve atingir no mínimo 20% do QE
    const notaCorteCandidatoSobras = Math.round(qe * 0.2);

    // 7. Cálculo da Chapa do Candidato:
    // Quociente Partidário (QP) = Votos do Partido / QE (desprezando a fração)
    const qpChapa = Math.floor(votosChapa / qe);
    const sobraChapa = votosChapa % qe;

    // Votos necessários para mais 1 vaga direta
    const votosParaProximaVagaDireta = (qpChapa + 1) * qe - votosChapa;

    // Situação do Candidato:
    const cumpreClausulaIndividual = votosCandidato >= clausulaIndividual;
    const chapaCumpre80 = votosChapa >= notaCortePartidoSobras;
    const candidatoCumpre20 = votosCandidato >= notaCorteCandidatoSobras;

    let statusCandidato: 'ELEITO_DIRETO' | 'ELEITO_SOBRAS' | 'SUPLENTE' | 'RISCO_CORTE';
    let motivoStatus = '';

    if (!cumpreClausulaIndividual) {
      statusCandidato = 'RISCO_CORTE';
      motivoStatus = `Não atinge a cláusula de barreira individual de 10% do QE (${clausulaIndividual.toLocaleString('pt-BR')} votos). Faltam ${(clausulaIndividual - votosCandidato).toLocaleString('pt-BR')} votos.`;
    } else if (qpChapa >= 1 && votosCandidato >= Math.round(votosChapa * 0.12)) {
      statusCandidato = 'ELEITO_DIRETO';
      motivoStatus = `Chapa conquistou ${qpChapa} vaga(s) direta(s) e o candidato tem votação suficiente para figurar entre os eleitos diretos.`;
    } else if (chapaCumpre80 && candidatoCumpre20) {
      statusCandidato = 'ELEITO_SOBRAS';
      motivoStatus = `Chapa atinge a cláusula de 80% do QE (${notaCortePartidoSobras.toLocaleString('pt-BR')}) e o candidato tem mais de 20% do QE (${notaCorteCandidatoSobras.toLocaleString('pt-BR')}), estando apto a disputar as sobras pela maior média.`;
    } else {
      statusCandidato = 'SUPLENTE';
      motivoStatus = `Candidato cumpre requisitos mínimos, mas a chapa precisa de maior soma de votos para garantir sua cadeira no plenário.`;
    }

    return {
      totalComparecimento,
      totalBrancosNulos,
      votosValidos,
      qe,
      clausulaIndividual,
      notaCortePartidoSobras,
      notaCorteCandidatoSobras,
      qpChapa,
      sobraChapa,
      votosParaProximaVagaDireta,
      cumpreClausulaIndividual,
      chapaCumpre80,
      candidatoCumpre20,
      statusCandidato,
      motivoStatus,
    };
  }, [
    eleitoresAptos,
    taxaAbstencao,
    taxaBrancosNulos,
    numeroVagas,
    votosChapa,
    votosCandidato,
  ]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header do Módulo */}
      <div
        className="glass-panel"
        style={{
          padding: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.12) 0%, rgba(15, 23, 42, 0.9) 100%)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
            }}
          >
            <Calculator style={{ width: '26px', height: '26px', color: '#fff' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#f8fafc' }}>
                Simulador de Quociente Eleitoral (QE / QP) & Sobras
              </h1>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '999px',
                  background: 'rgba(59, 130, 246, 0.2)',
                  color: '#60a5fa',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                }}
              >
                Lei 14.211 / Regra 80/20 TSE
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
              Projeção matemática em tempo real da linha de corte de vagas, quociente partidário e viabilidade eleitoral da chapa.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <select
            value={cargo}
            onChange={(e) => {
              const val = e.target.value as any;
              setCargo(val);
              if (val === 'VEREADOR') setNumeroVagas(21);
              if (val === 'DEP_FEDERAL') setNumeroVagas(70);
              if (val === 'DEP_ESTADUAL') setNumeroVagas(94);
            }}
            className="input-field"
            style={{ width: 'auto', fontWeight: 600 }}
          >
            <option value="VEREADOR">Vereador (Municipal Santos / 21 vagas)</option>
            <option value="DEP_ESTADUAL">Deputado Estadual (SP / 94 vagas)</option>
            <option value="DEP_FEDERAL">Deputado Federal (SP / 70 vagas)</option>
          </select>
        </div>
      </div>

      {/* Cards de Métricas Principais do Quociente */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {/* Card 1: Quociente Eleitoral */}
        <div className="glass-panel" style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>Quociente Eleitoral (QE)</span>
            <Calculator style={{ width: '18px', height: '18px', color: '#3b82f6' }} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#60a5fa' }}>
            {calculos.qe.toLocaleString('pt-BR')}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
            Votos válidos necessários para 1 vaga direta
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: 'linear-gradient(90deg, #3b82f6, #06b6d4)',
            }}
          />
        </div>

        {/* Card 2: Vagas Diretas da Chapa */}
        <div className="glass-panel" style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>Vagas Diretas da Chapa (QP)</span>
            <Award style={{ width: '18px', height: '18px', color: '#10b981' }} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#34d399' }}>
            {calculos.qpChapa} {calculos.qpChapa === 1 ? 'Vaga' : 'Vagas'}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
            Sobra da chapa: +{calculos.sobraChapa.toLocaleString('pt-BR')} votos
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: 'linear-gradient(90deg, #10b981, #059669)',
            }}
          />
        </div>

        {/* Card 3: Cláusula Individual (10% do QE) */}
        <div className="glass-panel" style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>Cláusula Individual (10% QE)</span>
            <Users style={{ width: '18px', height: '18px', color: '#f59e0b' }} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#fbbf24' }}>
            {calculos.clausulaIndividual.toLocaleString('pt-BR')}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
            Mínimo de votos do candidato para assumir a vaga
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: 'linear-gradient(90deg, #f59e0b, #d97706)',
            }}
          />
        </div>

        {/* Card 4: Status do Candidato */}
        <div
          className="glass-panel"
          style={{
            padding: '20px',
            position: 'relative',
            overflow: 'hidden',
            border:
              calculos.statusCandidato === 'ELEITO_DIRETO' || calculos.statusCandidato === 'ELEITO_SOBRAS'
                ? '1px solid rgba(16, 185, 129, 0.3)'
                : '1px solid rgba(245, 158, 11, 0.3)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>Projeção do Candidato</span>
            <Sparkles style={{ width: '18px', height: '18px', color: '#a855f7' }} />
          </div>
          <div
            style={{
              fontSize: '20px',
              fontWeight: 800,
              color:
                calculos.statusCandidato === 'ELEITO_DIRETO'
                  ? '#34d399'
                  : calculos.statusCandidato === 'ELEITO_SOBRAS'
                  ? '#60a5fa'
                  : calculos.statusCandidato === 'SUPLENTE'
                  ? '#fbbf24'
                  : '#f87171',
            }}
          >
            {calculos.statusCandidato === 'ELEITO_DIRETO' && '🟢 ELEITO DIRETO'}
            {calculos.statusCandidato === 'ELEITO_SOBRAS' && '🔵 ELEITO NAS SOBRAS'}
            {calculos.statusCandidato === 'SUPLENTE' && '🟡 1º SUPLENTE DA CHAPA'}
            {calculos.statusCandidato === 'RISCO_CORTE' && '🔴 ABAIXO DA CLÁUSULA'}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>
            {votosCandidato.toLocaleString('pt-BR')} votos estimados ({((votosCandidato / calculos.qe) * 100).toFixed(1)}% do QE)
          </div>
        </div>
      </div>

      {/* Grid Principal: Parâmetros e Diagnóstico Estratégico */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
        {/* Painel de Parâmetros e Sliders */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp style={{ width: '18px', height: '18px', color: '#3b82f6' }} />
            Parâmetros da Eleição ({municipioEstado})
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Eleitores Aptos */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#cbd5e1' }}>Eleitores Aptos</label>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#60a5fa' }}>{eleitoresAptos.toLocaleString('pt-BR')}</span>
              </div>
              <input
                type="range"
                min="50000"
                max="1000000"
                step="5000"
                value={eleitoresAptos}
                onChange={(e) => setEleitoresAptos(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#3b82f6', cursor: 'pointer' }}
              />
            </div>

            {/* Abstenção Estimada */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#cbd5e1' }}>Abstenção Estimada (%)</label>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#f59e0b' }}>{taxaAbstencao}% ({Math.round(eleitoresAptos * (taxaAbstencao / 100)).toLocaleString('pt-BR')} eleitores)</span>
              </div>
              <input
                type="range"
                min="10"
                max="40"
                step="0.5"
                value={taxaAbstencao}
                onChange={(e) => setTaxaAbstencao(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#f59e0b', cursor: 'pointer' }}
              />
            </div>

            {/* Brancos e Nulos */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#cbd5e1' }}>Brancos e Nulos (%)</label>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8' }}>{taxaBrancosNulos}%</span>
              </div>
              <input
                type="range"
                min="2"
                max="20"
                step="0.5"
                value={taxaBrancosNulos}
                onChange={(e) => setTaxaBrancosNulos(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#94a3b8', cursor: 'pointer' }}
              />
            </div>

            {/* Vagas na Câmara */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#cbd5e1' }}>Vagas em Disputa</label>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#10b981' }}>{numeroVagas} Vagas</span>
              </div>
              <input
                type="number"
                min="9"
                max="100"
                value={numeroVagas}
                onChange={(e) => setNumeroVagas(Math.max(1, Number(e.target.value)))}
                className="input-field"
                style={{ padding: '8px 12px' }}
              />
            </div>

            <hr style={{ borderColor: 'rgba(255, 255, 255, 0.08)', margin: '8px 0' }} />

            {/* Dados da Chapa */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Votos da Chapa ({partidoCandidato})
                </label>
                <input
                  type="number"
                  value={votosChapa}
                  onChange={(e) => setVotosChapa(Math.max(0, Number(e.target.value)))}
                  className="input-field"
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Votos do Candidato ({nomeCandidato})
                </label>
                <input
                  type="number"
                  value={votosCandidato}
                  onChange={(e) => setVotosCandidato(Math.max(0, Number(e.target.value)))}
                  className="input-field"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Painel de Diagnóstico Estratégico da IA e Regra 80/20 */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles style={{ width: '18px', height: '18px', color: '#a855f7' }} />
            Diagnóstico Estratégico da Chapa (Regra TSE 80/20)
          </h2>

          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              background: 'rgba(30, 41, 59, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <Info style={{ width: '18px', height: '18px', color: '#38bdf8', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9' }}>Parecer da Coordenação</div>
                <div style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '4px', lineHeight: 1.5 }}>
                  {calculos.motivoStatus}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
              <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.6)' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Meta para Próxima Vaga Direta</span>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#38bdf8', marginTop: '2px' }}>
                  +{calculos.votosParaProximaVagaDireta.toLocaleString('pt-BR')} votos
                </div>
              </div>

              <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.6)' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Cláusula Sobra Partido (80%)</span>
                <div
                  style={{
                    fontSize: '15px',
                    fontWeight: 700,
                    color: calculos.chapaCumpre80 ? '#34d399' : '#f87171',
                    marginTop: '2px',
                  }}
                >
                  {calculos.chapaCumpre80 ? '✓ Atingida' : `Faltam ${(calculos.notaCortePartidoSobras - votosChapa).toLocaleString('pt-BR')}`}
                </div>
              </div>
            </div>
          </div>

          {/* Dicas Estratégicas para o Candidato */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0' }}>Recomendações do Agente Estrategista:</span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#94a3b8' }}>
              <ChevronRight style={{ width: '14px', height: '14px', color: '#10b981', flexShrink: 0 }} />
              <span>Concentrar mobilização nas zonas com maior quociente para blindar os votos de legenda da federação.</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#94a3b8' }}>
              <ChevronRight style={{ width: '14px', height: '14px', color: '#10b981', flexShrink: 0 }} />
              <span>Atingir pelo menos {calculos.notaCorteCandidatoSobras.toLocaleString('pt-BR')} votos nominais (20% do QE) para estar apto à disputa de sobras.</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#94a3b8' }}>
              <ChevronRight style={{ width: '14px', height: '14px', color: '#10b981', flexShrink: 0 }} />
              <span>Garantir que a chapa completa some ao menos {calculos.qe.toLocaleString('pt-BR')} votos válidos.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
