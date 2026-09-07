import React, { useState } from 'react';
import {
  DollarSign,
  PlusCircle,
  FileText,
  Check,
  X,
  Smartphone,
  Tag,
  CreditCard,
  Building,
  Fuel,
  Utensils,
  Printer,
  Megaphone,
  Sparkles,
  Users,
  Briefcase,
  Truck,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  Filter,
} from 'lucide-react';
import { api } from '../api.ts';

interface ExpensesTrackerProps {
  gastosData: {
    gastos: any[];
    totalGeral: number;
    quantidadeTotal: number;
    porCategoria: any[];
  };
  onRefresh: () => void;
  onNewGasto: () => void;
}

const CATEGORIAS_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  COMBUSTIVEL: { label: 'Combustível', icon: Fuel, color: '#f59e0b' },
  ALIMENTACAO: { label: 'Alimentação', icon: Utensils, color: '#f97316' },
  MATERIAL_GRAFICO: { label: 'Material Gráfico', icon: Printer, color: '#06b6d4' },
  EVENTOS: { label: 'Eventos / Comício', icon: Megaphone, color: '#a855f7' },
  IMPULSIONAMENTO: { label: 'Tráfego Pago', icon: Sparkles, color: '#3b82f6' },
  PESSOAL: { label: 'Pessoal & Cabos', icon: Users, color: '#10b981' },
  JURIDICO_CONTABIL: { label: 'Jurídico & Contábil', icon: Briefcase, color: '#6366f1' },
  TRANSPORTE: { label: 'Transporte & Locação', icon: Truck, color: '#f43f5e' },
  OUTROS: { label: 'Outras Despesas', icon: HelpCircle, color: '#64748b' },
};

export const ExpensesTracker: React.FC<ExpensesTrackerProps> = ({
  gastosData,
  onRefresh,
  onNewGasto,
}) => {
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('TODOS');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const TETO_LEGAL_TSE = 350000.0;
  const totalGasto = gastosData.totalGeral || 0;
  const percTeto = Math.min(Math.round((totalGasto / TETO_LEGAL_TSE) * 100), 100);
  const saldoRestante = Math.max(TETO_LEGAL_TSE - totalGasto, 0);

  const handleUpdateStatus = async (id: string, status_auditoria: 'APROVADO' | 'REJEITADO') => {
    try {
      setUpdatingId(id);
      await api.updateGasto(id, { status_auditoria });
      onRefresh();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredGastos = gastosData.gastos.filter((g) => {
    const matchCat = filterCategory ? g.categoria === filterCategory : true;
    const matchStatus = filterStatus === 'TODOS' ? true : g.status_auditoria === filterStatus;
    return matchCat && matchStatus;
  });

  const totalAprovado = gastosData.gastos
    .filter((g) => g.status_auditoria === 'APROVADO')
    .reduce((acc, g) => acc + Number(g.valor || 0), 0);

  const totalPendente = gastosData.gastos
    .filter((g) => g.status_auditoria === 'PENDENTE' || !g.status_auditoria)
    .reduce((acc, g) => acc + Number(g.valor || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner de Finanças */}
      <div
        className="glass-panel"
        style={{
          padding: '24px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-verde">Controle e Auditoria TSE</span>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Prestação de Contas SPCE</span>
          </div>
          <h2 style={{ fontSize: '24px', color: '#ffffff' }}>Controle Financeiro de Campanha</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '650px', marginTop: '4px' }}>
            Acompanhamento contábil oficial, categorização TSE, conciliação e auditoria das despesas operacionais da campanha.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={onNewGasto} className="btn btn-primary" style={{ padding: '10px 18px' }}>
            <PlusCircle size={18} />
            <span>Lançar Nova Despesa</span>
          </button>
        </div>
      </div>

      {/* Card do Teto Legal TSE */}
      <div
        className="glass-panel"
        style={{
          padding: '20px 24px',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.8))',
          border: '1px solid rgba(59, 130, 246, 0.3)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '8px', borderRadius: '8px' }}>
              <ShieldCheck size={20} color="#3b82f6" />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
                Teto Legal de Gastos TSE: R$ {TETO_LEGAL_TSE.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Limite máximo permitido por lei para a candidatura na circunscrição
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Saldo Legal Disponível: </span>
              <strong style={{ fontSize: '14px', color: '#10b981' }}>
                R$ {saldoRestante.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </strong>
            </div>
            <span className="badge badge-azul">{percTeto}% Utilizado</span>
          </div>
        </div>

        {/* Barra de Progresso do Teto */}
        <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${percTeto}%`,
              background: percTeto > 85 ? '#ef4444' : percTeto > 65 ? '#f59e0b' : '#3b82f6',
              borderRadius: '4px',
              transition: 'width 0.6s ease',
            }}
          />
        </div>
      </div>

      {/* Grid de Totais e Status de Auditoria */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {/* Total Geral */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Total Desembolsado
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff' }}>
            R$ {gastosData.totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '12px', color: '#34d399', marginTop: '4px' }}>
            {gastosData.quantidadeTotal} lançamentos registrados
          </div>
        </div>

        {/* Total Aprovado */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Auditoria: Aprovados
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#10b981' }}>
            R$ {totalAprovado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Pronto para o SPCE / TSE
          </div>
        </div>

        {/* Total Pendente */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Auditoria: Pendentes
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#f59e0b' }}>
            R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '12px', color: '#fbbf24', marginTop: '4px' }}>
            Aguardando validação do comitê
          </div>
        </div>
      </div>

      {/* Dica WhatsApp #gasto */}
      <div
        style={{
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          padding: '14px 20px',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <Smartphone size={22} color="#10b981" />
        <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
          <strong>Dica para Lideranças de Campo:</strong> Coordenadores podem lançar gastos instantaneamente enviando pelo WhatsApp oficial a mensagem:{' '}
          <code style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '2px 8px', borderRadius: '4px', color: '#34d399' }}>
            #gasto 150 reais de combustível no posto Shell no PIX
          </code>
          . A IA Groq extrai valores, fornecedor e forma de pagamento automaticamente!
        </div>
      </div>

      {/* Tabela de Despesas com Filtros */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ fontSize: '18px', color: '#ffffff' }}>Lançamentos e Extrato de Despesas</h3>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Filtro Status */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {['TODOS', 'PENDENTE', 'APROVADO', 'REJEITADO'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={filterStatus === st ? 'btn btn-primary' : 'btn btn-secondary'}
                  style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '6px' }}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Filtro Categoria */}
            <select
              className="input-field"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{ width: '180px', padding: '6px 10px', fontSize: '12px' }}
            >
              <option value="">Todas as Categorias</option>
              {Object.entries(CATEGORIAS_CONFIG).map(([key, info]) => (
                <option key={key} value={key}>
                  {info.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredGastos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-secondary)' }}>
            <DollarSign size={40} style={{ opacity: 0.3, marginBottom: '8px' }} />
            <p style={{ fontSize: '14px', fontWeight: 600 }}>Nenhum gasto encontrado para os filtros selecionados.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px' }}>Data</th>
                  <th style={{ padding: '10px' }}>Descrição / Fornecedor</th>
                  <th style={{ padding: '10px' }}>Categoria TSE</th>
                  <th style={{ padding: '10px' }}>Pagamento</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Valor</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Auditoria</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredGastos.map((g) => {
                  const catInfo = CATEGORIAS_CONFIG[g.categoria] || CATEGORIAS_CONFIG.OUTROS;
                  const Icon = catInfo.icon;
                  return (
                    <tr key={g.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>
                        {new Date(g.data_gasto).toLocaleDateString('pt-BR')}
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <div style={{ fontWeight: 600, color: '#ffffff' }}>{g.descricao}</div>
                        {g.fornecedor_nome && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Fornecedor: {g.fornecedor_nome}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: catInfo.color, fontWeight: 600, fontSize: '12px' }}>
                          <Icon size={14} />
                          {catInfo.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>
                        {g.forma_pagamento || 'PIX'}
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 700, color: '#ffffff' }}>
                        R$ {Number(g.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                        <span
                          className={`badge ${
                            g.status_auditoria === 'APROVADO'
                              ? 'badge-verde'
                              : g.status_auditoria === 'REJEITADO'
                              ? 'badge-vermelho'
                              : 'badge-amarelo'
                          }`}
                          style={{ fontSize: '11px' }}
                        >
                          {g.status_auditoria || 'PENDENTE'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                          {g.status_auditoria !== 'APROVADO' && (
                            <button
                              onClick={() => handleUpdateStatus(g.id, 'APROVADO')}
                              disabled={updatingId === g.id}
                              title="Aprovar despesa"
                              style={{
                                background: 'rgba(16, 185, 129, 0.2)',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                color: '#10b981',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                cursor: 'pointer',
                              }}
                            >
                              <Check size={14} />
                            </button>
                          )}
                          {g.status_auditoria !== 'REJEITADO' && (
                            <button
                              onClick={() => handleUpdateStatus(g.id, 'REJEITADO')}
                              disabled={updatingId === g.id}
                              title="Rejeitar despesa"
                              style={{
                                background: 'rgba(239, 68, 68, 0.2)',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                color: '#ef4444',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                cursor: 'pointer',
                              }}
                            >
                              <X size={14} />
                            </button>
                          )}
                          {g.comprovante_url && (
                            <a
                              href={g.comprovante_url}
                              target="_blank"
                              rel="noreferrer"
                              title="Ver Comprovante"
                              style={{
                                background: 'rgba(59, 130, 246, 0.2)',
                                border: '1px solid rgba(59, 130, 246, 0.4)',
                                color: '#60a5fa',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                display: 'inline-flex',
                                alignItems: 'center',
                              }}
                            >
                              <ExternalLink size={14} />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
