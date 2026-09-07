import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  FileText,
  Clock,
  Briefcase,
  DollarSign,
  Search,
  Filter,
  Trash2,
  Edit2,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Phone,
  MapPin,
  ShieldCheck,
  Building,
  Printer,
  ChevronRight,
  ExternalLink,
  Lock,
  QrCode,
  Share2,
} from 'lucide-react';
import { api } from '../api.ts';
import { StreetTeamModal } from './StreetTeamModal.tsx';
import { StreetContractModal } from './StreetContractModal.tsx';

export const StreetTeamManager: React.FC = () => {
  const [membros, setMembros] = useState<any[]>([]);
  const [metricas, setMetricas] = useState({
    total: 0,
    meioPeriodo: 0,
    periodoIntegral: 0,
    folhaTotal: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroJornada, setFiltroJornada] = useState<string>('');
  const [filtroStatus, setFiltroStatus] = useState<string>('');

  // Modais
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [contractModalMember, setContractModalMember] = useState<any | null>(null);

  useEffect(() => {
    loadData();
  }, [searchTerm, filtroJornada, filtroStatus]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getEquipeRua({
        busca: searchTerm,
        tipo_jornada: filtroJornada || undefined,
        status_contrato: filtroStatus || undefined,
      });
      setMembros(res.membros || []);
      setMetricas(res.metricas || { total: 0, meioPeriodo: 0, periodoIntegral: 0, folhaTotal: 0 });
    } catch (err: any) {
      console.error('Erro ao carregar equipe de rua:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, nome: string) => {
    if (!confirm(`Deseja remover ${nome} da Equipe de Rua?`)) return;
    try {
      await api.deleteEquipeRua(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir membro.');
    }
  };

  // Conta total assinados
  const totalAssinadosGovBr = membros.filter((m) => m.status_contrato === 'ASSINADO').length;

  return (
    <div className="street-container">
      {/* ─── 1. HEADER DO MÓDULO ISOLADO ───────────────────────────────────── */}
      <div className="glass-panel street-header-card">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span
              className="badge"
              style={{
                background: 'rgba(16, 185, 129, 0.12)',
                color: 'var(--primary)',
                borderColor: 'rgba(16, 185, 129, 0.3)',
                fontWeight: 700,
              }}
            >
              <ShieldCheck size={14} /> Módulo Segregado TSE • Lei nº 9.504/97 Art. 100
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Santos/SP • Zonas 118ª e 272ª
            </span>
          </div>

          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={26} color="var(--primary)" />
            Equipe de Rua & Contratos Gov.br
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0', maxWidth: '680px' }}>
            Cadastro independente de militância de campo com geração dinâmica de contratos (Meio Período vs Período Integral) e assinatura digital biométrica via Gov.br (Lei 14.063/2020).
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={loadData}
            className="btn btn-secondary btn-sm"
            style={{ borderRadius: 'var(--radius-md)' }}
            title="Recarregar lista"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Atualizar</span>
          </button>

          <button
            onClick={() => {
              setEditingMember(null);
              setIsCreateModalOpen(true);
            }}
            className="btn btn-primary"
            style={{ borderRadius: 'var(--radius-md)', padding: '9px 18px' }}
          >
            <UserPlus size={16} />
            <span>Novo Cadastro de Rua</span>
          </button>
        </div>
      </div>

      {/* ─── 2. CARDS DE INDICADORES EXECUTIVOS ─────────────────────────────── */}
      <div className="street-metrics-grid">
        <div className="street-metric-card">
          <div className="street-metric-icon" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Total Equipe de Rua
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
              {metricas.total}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Militantes registrados</div>
          </div>
        </div>

        <div className="street-metric-card">
          <div className="street-metric-icon" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Meio Período (20h)
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#3b82f6', marginTop: '2px' }}>
              {metricas.meioPeriodo}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>4h diárias de ação</div>
          </div>
        </div>

        <div className="street-metric-card">
          <div className="street-metric-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
            <Briefcase size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Período Integral (40h)
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#f59e0b', marginTop: '2px' }}>
              {metricas.periodoIntegral}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>8h diárias de campo</div>
          </div>
        </div>

        <div className="street-metric-card">
          <div className="street-metric-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--primary)' }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Assinados no Gov.br
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--primary)', marginTop: '2px' }}>
              {totalAssinadosGovBr} <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>/ {metricas.total}</span>
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Carimbados com fé pública</div>
          </div>
        </div>
      </div>

      {/* ─── 3. BARRA DE BUSCA E FILTROS ────────────────────────────────────── */}
      <div className="glass-panel street-filters-bar">
        <div style={{ position: 'relative', flex: 1, minWidth: '240px', maxWidth: '420px' }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            placeholder="Buscar por nome, CPF, WhatsApp ou bairro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '36px', height: '38px', fontSize: '13px' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <select
            value={filtroJornada}
            onChange={(e) => setFiltroJornada(e.target.value)}
            className="input-field"
            style={{ height: '38px', width: 'auto', minWidth: '170px' }}
          >
            <option value="">Todas as Modalidades</option>
            <option value="MEIO_PERIODO">Meio Período (20h)</option>
            <option value="PERIODO_INTEGRAL">Período Integral (40h)</option>
          </select>

          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="input-field"
            style={{ height: '38px', width: 'auto', minWidth: '180px' }}
          >
            <option value="">Todos os Status</option>
            <option value="MINUTA_GERADA">Minuta Gerada</option>
            <option value="AGUARDANDO_ASSINATURA">Aguardando Gov.br</option>
            <option value="ASSINADO">Assinado via Gov.br</option>
            <option value="PAGO">Pago (PIX-CPF)</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
        </div>
      </div>

      {/* ─── 4. LISTAGEM EM TABELA / CARDS ─────────────────────────────────── */}
      {loading ? (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center' }}>
          <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px auto', color: 'var(--primary)' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Carregando equipe de rua e contratos...</p>
        </div>
      ) : membros.length === 0 ? (
        <div className="glass-panel" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <Users size={42} style={{ color: 'var(--text-muted)', margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Nenhum membro da equipe de rua encontrado</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '460px', margin: '8px auto 18px auto' }}>
            Cadastre ativistas e coordenadores de bairro para formalizar contratos conforme o Art. 100 da Lei 9.504/97 com assinatura digital pelo Gov.br.
          </p>
          <button
            onClick={() => {
              setEditingMember(null);
              setIsCreateModalOpen(true);
            }}
            className="btn btn-primary btn-sm"
          >
            <UserPlus size={15} />
            <span>Cadastrar Primeiro Trabalhador</span>
          </button>
        </div>
      ) : (
        <div className="glass-panel street-table-card">
          <div style={{ overflowX: 'auto' }}>
            <table className="street-table">
              <thead>
                <tr>
                  <th>Trabalhador(a) / Contratado(a)</th>
                  <th>Modalidade de Jornada</th>
                  <th>Remuneração TSE</th>
                  <th>Status Assinatura Gov.br</th>
                  <th>Contato / Local</th>
                  <th style={{ textAlign: 'right' }}>Ações Rápidas</th>
                </tr>
              </thead>
              <tbody>
                {membros.map((m) => {
                  const isMeio = m.tipo_jornada === 'MEIO_PERIODO';
                  const isAssinado = m.status_contrato === 'ASSINADO';
                  const isAguardando = m.status_contrato === 'AGUARDANDO_ASSINATURA';

                  return (
                    <tr key={m.id}>
                      {/* Nome & Documentos */}
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '13.5px' }}>
                          {m.nome_completo}
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '2px' }}>
                          CPF: {m.cpf} • RG: {m.rg}
                        </div>
                        {m.chave_pix && (
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            PIX: <span style={{ fontFamily: 'monospace' }}>{m.chave_pix}</span>
                          </div>
                        )}
                      </td>

                      {/* Modalidade de Jornada */}
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: isMeio ? 'rgba(59, 130, 246, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                            color: isMeio ? '#3b82f6' : '#f59e0b',
                            borderColor: isMeio ? 'rgba(59, 130, 246, 0.3)' : 'rgba(245, 158, 11, 0.3)',
                            fontSize: '11.5px',
                            fontWeight: 700,
                          }}
                        >
                          {isMeio ? <Clock size={12} /> : <Briefcase size={12} />}
                          {isMeio ? 'Meio Período (20h)' : 'Período Integral (40h)'}
                        </span>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                          {isMeio ? '4h diárias móveis' : '8h diárias de campo'}
                        </div>
                      </td>

                      {/* Remuneração */}
                      <td>
                        <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '14px' }}>
                          {Number(m.remuneracao_pactuada).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {m.forma_pagamento === 'PIX_CONTA_CAMPANHA' ? 'PIX Conta Campanha' : m.forma_pagamento}
                        </div>
                      </td>

                      {/* Status Gov.br */}
                      <td>
                        {isAssinado ? (
                          <div>
                            <span
                              className="badge badge-verde"
                              style={{ fontWeight: 700, gap: '4px' }}
                            >
                              <CheckCircle size={13} /> Assinado no Gov.br
                            </span>
                            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              Certificado ITI Prata/Ouro
                            </div>
                          </div>
                        ) : isAguardando ? (
                          <div>
                            <span
                              className="badge badge-amarelo"
                              style={{ fontWeight: 700, gap: '4px' }}
                            >
                              <Clock size={13} /> Aguardando Assinatura
                            </span>
                            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              Link enviado ao celular
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span
                              className="badge"
                              style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', borderColor: 'var(--border-color)' }}
                            >
                              <FileText size={12} /> Minuta Preparada
                            </span>
                            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              Pendente de envio Gov.br
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Contato & Local */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12.5px', color: 'var(--text-primary)' }}>
                          <Phone size={13} color="var(--primary)" />
                          <a
                            href={`https://wa.me/55${m.telefone_whatsapp}?text=Ol%C3%A1%20${encodeURIComponent(m.nome_completo)},%20falamos%20da%20Coordena%C3%A7%C3%A3o%20Eleitoral%202026.`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: 'var(--text-primary)', textDecoration: 'none' }}
                          >
                            {m.telefone_whatsapp}
                          </a>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          <MapPin size={12} />
                          <span>{m.bairro}, Santos • Zona {m.zona_eleitoral || '118ª'}</span>
                        </div>
                      </td>

                      {/* Ações Rápidas */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {/* Botão Dinâmico Principal: Gerar Contrato */}
                          <button
                            onClick={() => setContractModalMember(m)}
                            className="btn btn-primary btn-sm"
                            style={{ gap: '5px', padding: '6px 12px' }}
                            title="Visualizar Minuta e Assinar no Gov.br"
                          >
                            <FileText size={14} />
                            <span>Gerar Contrato</span>
                          </button>

                          {/* Editar */}
                          <button
                            onClick={() => {
                              setEditingMember(m);
                              setIsCreateModalOpen(true);
                            }}
                            className="btn btn-secondary btn-icon"
                            style={{ width: '32px', height: '32px' }}
                            title="Editar dados cadastrais"
                          >
                            <Edit2 size={13} />
                          </button>

                          {/* Excluir */}
                          <button
                            onClick={() => handleDelete(m.id, m.nome_completo)}
                            className="btn btn-danger btn-icon"
                            style={{ width: '32px', height: '32px' }}
                            title="Remover cadastro"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── 5. MODAL DE CADASTRO / EDIÇÃO ─────────────────────────────────── */}
      {isCreateModalOpen && (
        <StreetTeamModal
          memberToEdit={editingMember}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingMember(null);
          }}
          onSuccess={(saved) => {
            setIsCreateModalOpen(false);
            setEditingMember(null);
            loadData();
            // Abre automaticamente o contrato para assinar no Gov.br!
            setContractModalMember(saved);
          }}
        />
      )}

      {/* ─── 6. MODAL DO CONTRATO & ASSINATURA GOV.BR ───────────────────────── */}
      {contractModalMember && (
        <StreetContractModal
          member={contractModalMember}
          onClose={() => setContractModalMember(null)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
};
