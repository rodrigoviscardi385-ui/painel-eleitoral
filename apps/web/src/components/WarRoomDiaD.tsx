import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Users,
  MapPin,
  Vote,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Phone,
  MessageSquare,
  Search,
  Filter,
  PlusCircle,
  FileText,
  Radio,
  ExternalLink,
} from 'lucide-react';

interface SecaoFiscal {
  id: string;
  zona: string;
  secao: string;
  localVotacao: string;
  bairro: string;
  fiscalNome: string;
  fiscalWhatsApp: string;
  status: 'PRESENTE' | 'EM_TRANSITO' | 'DESCOBERTO' | 'OCORRENCIA';
  horaCheckin?: string;
  buRecebido: boolean;
  ocorrenciasCount: number;
}

export const WarRoomDiaD: React.FC = () => {
  const [selectedZona, setSelectedZona] = useState<string>('TODAS');
  const [selectedStatus, setSelectedStatus] = useState<string>('TODOS');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal de Nova Ocorrência
  const [isOcorrenciaModalOpen, setIsOcorrenciaModalOpen] = useState(false);
  const [selectedSecaoOcorrencia, setSelectedSecaoOcorrencia] = useState<SecaoFiscal | null>(null);
  const [tipoOcorrencia, setTipoOcorrencia] = useState('BOCA_URNA');
  const [descricaoOcorrencia, setDescricaoOcorrencia] = useState('');

  // Mock de Seções e Fiscais de Santos (Zonas 118 e 272)
  const [secoes, setSecoes] = useState<SecaoFiscal[]>([
    {
      id: '1',
      zona: '118',
      secao: '001',
      localVotacao: 'E.E. Barnabé',
      bairro: 'Encruzilhada',
      fiscalNome: 'Carlos Eduardo Souza',
      fiscalWhatsApp: '13997112233',
      status: 'PRESENTE',
      horaCheckin: '07:15',
      buRecebido: false,
      ocorrenciasCount: 0,
    },
    {
      id: '2',
      zona: '118',
      secao: '002',
      localVotacao: 'E.E. Barnabé',
      bairro: 'Encruzilhada',
      fiscalNome: 'Mariana Silva Ribeiro',
      fiscalWhatsApp: '13998223344',
      status: 'PRESENTE',
      horaCheckin: '07:22',
      buRecebido: false,
      ocorrenciasCount: 0,
    },
    {
      id: '3',
      zona: '118',
      secao: '015',
      localVotacao: 'Colégio Santista',
      bairro: 'Boqueirão',
      fiscalNome: 'Lucas Mendonça',
      fiscalWhatsApp: '13991223311',
      status: 'EM_TRANSITO',
      horaCheckin: undefined,
      buRecebido: false,
      ocorrenciasCount: 0,
    },
    {
      id: '4',
      zona: '118',
      secao: '028',
      localVotacao: 'UniSantos - Campus Dom Idílio',
      bairro: 'Gonzaga',
      fiscalNome: 'Sem Fiscal Atribuído',
      fiscalWhatsApp: '',
      status: 'DESCOBERTO',
      horaCheckin: undefined,
      buRecebido: false,
      ocorrenciasCount: 1,
    },
    {
      id: '5',
      zona: '272',
      secao: '045',
      localVotacao: 'E.M. Olívia Fernandes',
      bairro: 'Ponta da Praia',
      fiscalNome: 'Fernanda Rocha',
      fiscalWhatsApp: '13996554433',
      status: 'OCORRENCIA',
      horaCheckin: '07:40',
      buRecebido: false,
      ocorrenciasCount: 2,
    },
    {
      id: '6',
      zona: '272',
      secao: '052',
      localVotacao: 'E.E. Cidade de Santos',
      bairro: 'Aparecida',
      fiscalNome: 'Roberto Campos',
      fiscalWhatsApp: '13988776655',
      status: 'PRESENTE',
      horaCheckin: '07:10',
      buRecebido: true,
      ocorrenciasCount: 0,
    },
    {
      id: '7',
      zona: '272',
      secao: '088',
      localVotacao: 'UME Martim Afonso',
      bairro: 'Marapé',
      fiscalNome: 'Juliana Vieira',
      fiscalWhatsApp: '13997665544',
      status: 'PRESENTE',
      horaCheckin: '07:30',
      buRecebido: false,
      ocorrenciasCount: 0,
    },
    {
      id: '8',
      zona: '272',
      secao: '104',
      localVotacao: 'E.E. Suetônio Bittencourt',
      bairro: 'Estuário',
      fiscalNome: 'Sem Fiscal Atribuído',
      fiscalWhatsApp: '',
      status: 'DESCOBERTO',
      horaCheckin: undefined,
      buRecebido: false,
      ocorrenciasCount: 0,
    },
  ]);

  // Estatísticas do Dia D
  const stats = useMemo(() => {
    const total = secoes.length;
    const presentes = secoes.filter((s) => s.status === 'PRESENTE').length;
    const emTransito = secoes.filter((s) => s.status === 'EM_TRANSITO').length;
    const descobertas = secoes.filter((s) => s.status === 'DESCOBERTO').length;
    const ocorrencias = secoes.filter((s) => s.status === 'OCORRENCIA').length;
    const busRecebidos = secoes.filter((s) => s.buRecebido).length;
    const percentualCobertura = total > 0 ? Math.round(((presentes + emTransito) / total) * 100) : 0;

    return {
      total,
      presentes,
      emTransito,
      descobertas,
      ocorrencias,
      busRecebidos,
      percentualCobertura,
    };
  }, [secoes]);

  // Filtragem de seções
  const filteredSecoes = useMemo(() => {
    return secoes.filter((s) => {
      const matchZona = selectedZona === 'TODAS' || s.zona === selectedZona;
      const matchStatus = selectedStatus === 'TODOS' || s.status === selectedStatus;
      const matchQuery =
        !searchQuery ||
        s.secao.includes(searchQuery) ||
        s.localVotacao.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.bairro.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.fiscalNome.toLowerCase().includes(searchQuery.toLowerCase());

      return matchZona && matchStatus && matchQuery;
    });
  }, [secoes, selectedZona, selectedStatus, searchQuery]);

  const handleSalvarOcorrencia = () => {
    if (!selectedSecaoOcorrencia) return;

    setSecoes((prev) =>
      prev.map((s) => {
        if (s.id === selectedSecaoOcorrencia.id) {
          return {
            ...s,
            status: 'OCORRENCIA',
            ocorrenciasCount: s.ocorrenciasCount + 1,
          };
        }
        return s;
      })
    );

    setIsOcorrenciaModalOpen(false);
    setSelectedSecaoOcorrencia(null);
    setDescricaoOcorrencia('');
    alert('Ocorrência registrada! O Agente Jurídico foi acionado para averiguação.');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header do War Room */}
      <div
        className="glass-panel"
        style={{
          padding: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(15, 23, 42, 0.9) 100%)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
            }}
          >
            <Radio style={{ width: '26px', height: '26px', color: '#fff' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#f8fafc' }}>
                War Room do Dia D & Fiscalização de Urnas
              </h1>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '999px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span className="status-pulse error" style={{ width: '6px', height: '6px' }}></span>
                TEMPO REAL
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
              Monitoramento de presença dos fiscais de urna, denúncias de boca de urna e recebimento de BUs às 17h.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#e2e8f0',
            }}
          >
            <Clock style={{ width: '16px', height: '16px', color: '#38bdf8' }} />
            Votação: 08:00 às 17:00 (Horário de Brasília)
          </div>
        </div>
      </div>

      {/* Cards de Métricas do Dia D */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '18px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>Cobertura de Fiscais</span>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
            {stats.percentualCobertura}%
          </div>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            {stats.presentes + stats.emTransito} de {stats.total} seções vigiadas
          </span>
        </div>

        <div className="glass-panel" style={{ padding: '18px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>Fiscais Presentes</span>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>
            {stats.presentes}
          </div>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Check-in presencial confirmado</span>
        </div>

        <div
          className="glass-panel"
          style={{
            padding: '18px',
            border: stats.descobertas > 0 ? '1px solid rgba(245, 158, 11, 0.4)' : undefined,
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>Seções Descobertas</span>
          <div style={{ fontSize: '26px', fontWeight: 800, color: stats.descobertas > 0 ? '#fbbf24' : '#94a3b8', marginTop: '4px' }}>
            {stats.descobertas}
          </div>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Necessitam remanejamento urgente</span>
        </div>

        <div
          className="glass-panel"
          style={{
            padding: '18px',
            border: stats.ocorrencias > 0 ? '1px solid rgba(239, 68, 68, 0.4)' : undefined,
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>Ocorrências Abertas</span>
          <div style={{ fontSize: '26px', fontWeight: 800, color: stats.ocorrencias > 0 ? '#f87171' : '#34d399', marginTop: '4px' }}>
            {stats.ocorrencias}
          </div>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Boca de urna / Defeito de urna</span>
        </div>

        <div className="glass-panel" style={{ padding: '18px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>BUs Recebidos (Pós-17h)</span>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#a855f7', marginTop: '4px' }}>
            {stats.busRecebidos}
          </div>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Boletins prontos para auditoria</span>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div
        className="glass-panel"
        style={{
          padding: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '260px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
            <Search
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '16px',
                height: '16px',
                color: '#64748b',
              }}
            />
            <input
              type="text"
              placeholder="Buscar seção, escola, bairro ou fiscal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '36px' }}
            />
          </div>

          <select
            value={selectedZona}
            onChange={(e) => setSelectedZona(e.target.value)}
            className="input-field"
            style={{ width: 'auto', fontWeight: 600 }}
          >
            <option value="TODAS">Todas as Zonas</option>
            <option value="118">Zona 118 (Santos)</option>
            <option value="272">Zona 272 (Santos)</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="input-field"
            style={{ width: 'auto', fontWeight: 600 }}
          >
            <option value="TODOS">Todos os Status</option>
            <option value="PRESENTE">Presentes</option>
            <option value="EM_TRANSITO">Em Trânsito</option>
            <option value="DESCOBERTO">Descobertos</option>
            <option value="OCORRENCIA">Com Ocorrência</option>
          </select>
        </div>
      </div>

      {/* Tabela de Seções e Fiscais */}
      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(15, 23, 42, 0.4)' }}>
              <th style={{ padding: '14px 16px', color: '#94a3b8', fontWeight: 600 }}>Zona / Seção</th>
              <th style={{ padding: '14px 16px', color: '#94a3b8', fontWeight: 600 }}>Local de Votação (Escola)</th>
              <th style={{ padding: '14px 16px', color: '#94a3b8', fontWeight: 600 }}>Bairro</th>
              <th style={{ padding: '14px 16px', color: '#94a3b8', fontWeight: 600 }}>Fiscal Designado</th>
              <th style={{ padding: '14px 16px', color: '#94a3b8', fontWeight: 600 }}>Status do Fiscal</th>
              <th style={{ padding: '14px 16px', color: '#94a3b8', fontWeight: 600 }}>Boletim de Urna</th>
              <th style={{ padding: '14px 16px', color: '#94a3b8', fontWeight: 600, textAlign: 'right' }}>Ações Rápidas</th>
            </tr>
          </thead>
          <tbody>
            {filteredSecoes.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                  Nenhuma seção encontrada com os filtros selecionados.
                </td>
              </tr>
            ) : (
              filteredSecoes.map((s) => (
                <tr
                  key={s.id}
                  style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                    background: s.status === 'OCORRENCIA' ? 'rgba(239, 68, 68, 0.05)' : 'transparent',
                  }}
                >
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: '#f8fafc' }}>
                    <span style={{ color: '#38bdf8' }}>Z-{s.zona}</span> / Sec {s.secao}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#e2e8f0', fontWeight: 500 }}>
                    {s.localVotacao}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#94a3b8' }}>
                    {s.bairro}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontWeight: 600,
                          color: s.fiscalNome === 'Sem Fiscal Atribuído' ? '#f87171' : '#f1f5f9',
                        }}
                      >
                        {s.fiscalNome}
                      </span>
                      {s.fiscalWhatsApp && (
                        <a
                          href={`https://wa.me/55${s.fiscalWhatsApp}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '24px',
                            height: '24px',
                            borderRadius: '6px',
                            background: 'rgba(16, 185, 129, 0.2)',
                            color: '#34d399',
                          }}
                          title={`Chamar no WhatsApp (${s.fiscalWhatsApp})`}
                        >
                          <Phone style={{ width: '12px', height: '12px' }} />
                        </a>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {s.status === 'PRESENTE' && (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '999px',
                          background: 'rgba(16, 185, 129, 0.2)',
                          color: '#34d399',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <CheckCircle2 style={{ width: '12px', height: '12px' }} />
                        PRESENTE ({s.horaCheckin})
                      </span>
                    )}
                    {s.status === 'EM_TRANSITO' && (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '999px',
                          background: 'rgba(56, 189, 248, 0.2)',
                          color: '#38bdf8',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Clock style={{ width: '12px', height: '12px' }} />
                        A CAMINHO
                      </span>
                    )}
                    {s.status === 'DESCOBERTO' && (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '999px',
                          background: 'rgba(245, 158, 11, 0.2)',
                          color: '#fbbf24',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <AlertTriangle style={{ width: '12px', height: '12px' }} />
                        SEM FISCAL
                      </span>
                    )}
                    {s.status === 'OCORRENCIA' && (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '999px',
                          background: 'rgba(239, 68, 68, 0.2)',
                          color: '#f87171',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <ShieldAlert style={{ width: '12px', height: '12px' }} />
                        OCORRÊNCIA ({s.ocorrenciasCount})
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {s.buRecebido ? (
                      <span style={{ color: '#34d399', fontWeight: 600, fontSize: '12px' }}>
                        ✓ BU Auditado
                      </span>
                    ) : (
                      <span style={{ color: '#64748b', fontSize: '12px' }}>Aguardando 17h</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        onClick={() => {
                          setSelectedSecaoOcorrencia(s);
                          setIsOcorrenciaModalOpen(true);
                        }}
                        className="btn"
                        style={{
                          padding: '6px 10px',
                          fontSize: '11px',
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: '#f87171',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                        }}
                      >
                        <AlertTriangle style={{ width: '12px', height: '12px' }} />
                        Ocorrência
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Registro de Ocorrência */}
      {isOcorrenciaModalOpen && selectedSecaoOcorrencia && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: '520px',
              width: '100%',
              padding: '24px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#f87171',
                }}
              >
                <ShieldAlert style={{ width: '20px', height: '20px' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
                  Registrar Ocorrência Eleitoral
                </h3>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Zona {selectedSecaoOcorrencia.zona} • Seção {selectedSecaoOcorrencia.secao} • {selectedSecaoOcorrencia.localVotacao}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                  Tipo de Ocorrência
                </label>
                <select
                  value={tipoOcorrencia}
                  onChange={(e) => setTipoOcorrencia(e.target.value)}
                  className="input-field"
                >
                  <option value="BOCA_URNA">Boca de Urna Ilegal (Material no Chão / Aliciamento)</option>
                  <option value="URNA_DEFEITO">Urna Eletrônica Travada ou Substituída</option>
                  <option value="FISCAL_BARRADO">Fiscal Barrado pelo Presidente da Mesa</option>
                  <option value="TRANSPORTE_ILEGAL">Suspeita de Transporte Irregular de Eleitores</option>
                  <option value="OUTRO">Outra Violação Eleitoral</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                  Detalhes e Testemunhas
                </label>
                <textarea
                  rows={4}
                  value={descricaoOcorrencia}
                  onChange={(e) => setDescricaoOcorrencia(e.target.value)}
                  placeholder="Descreva o que ocorreu, nomes envolvidos e se há fotos/vídeos..."
                  className="input-field"
                  style={{ resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsOcorrenciaModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSalvarOcorrencia}
                  className="btn"
                  style={{ background: '#ef4444', color: '#fff' }}
                >
                  Acionar Jurídico
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
