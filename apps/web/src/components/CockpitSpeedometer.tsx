import React, { useState } from 'react';
import {
  TrendingUp,
  Clock,
  Target,
  Users,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  PlusCircle,
  Database,
  FileText,
  Award,
  Flame,
  Trash2,
  Compass,
  Calculator,
  Radio,
  Vote,
  MapPin,
  Calendar,
  Sparkles,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';

interface CockpitProps {
  metas: any[];
  overview: {
    totalEleitores: number;
    totalLideres: number;
    totalConversas: number;
    totalGastos: number;
  };
  treeData?: any[];
  onNewMeta: () => void;
  onOpenBackup?: () => void;
  onExportPdf?: () => void;
  onDeleteMeta?: (id: string) => void;
  onOpenSimulador?: () => void;
  onOpenWarRoom?: () => void;
  onOpenApuracao?: () => void;
}

export const CockpitSpeedometer: React.FC<CockpitProps> = ({
  metas,
  overview,
  treeData = [],
  onNewMeta,
  onOpenBackup,
  onExportPdf,
  onDeleteMeta,
  onOpenSimulador,
  onOpenWarRoom,
  onOpenApuracao,
}) => {
  const [intelTab, setIntelTab] = useState<'ranking' | 'bairros' | 'pautas' | 'metas'>('ranking');

  const globalMeta = metas.find((m) => m.tipo === 'GLOBAL') || metas[0] || {
    titulo: 'Meta Geral de Campanha',
    quantidade_meta: 20000,
    quantidade_atual: overview.totalEleitores,
    dias_restantes: 30,
    faltam: 20000 - overview.totalEleitores,
    ritmo_necessario_dia: 26,
    status_semaforo: 'VERDE',
    percentual: Math.round((overview.totalEleitores / 20000) * 100),
  };

  // Cores do semáforo
  const semaforoColor =
    globalMeta.status_semaforo === 'VERMELHO'
      ? '#f43f5e'
      : globalMeta.status_semaforo === 'AMARELO'
      ? '#f59e0b'
      : '#10b981';

  // Cálculo SVG Gauge Circular (Raio 80, Circunferência ~= 502)
  const radius = 76;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - ((globalMeta.percentual || 0) / 100) * circumference;

  // Flatten tree para obter líderes
  const flattenTree = (nodes: any[]): any[] => {
    let list: any[] = [];
    for (const n of nodes) {
      list.push(n);
      if (n.children && n.children.length > 0) {
        list = list.concat(flattenTree(n.children));
      }
    }
    return list;
  };

  const allLeaders = flattenTree(treeData);
  const topLeaders = [...allLeaders]
    .sort((a, b) => (b.total_indicados_rede || 0) - (a.total_indicados_rede || 0))
    .slice(0, 6);

  const radarInativos = allLeaders
    .filter((l) => (l.total_indicados_diretos || 0) === 0)
    .slice(0, 4);

  const pautas = [
    { tema: 'Saúde & Fila Zero nos Postos', perc: 42, mencoes: 184, cor: '#10b981' },
    { tema: 'Educação & Tecnologia Escolar', perc: 26, mencoes: 114, cor: '#3b82f6' },
    { tema: 'Emprego & Apoio ao Empreendedor', perc: 18, mencoes: 79, cor: '#8b5cf6' },
    { tema: 'Segurança & Iluminação Pública', perc: 10, mencoes: 44, cor: '#f59e0b' },
    { tema: 'Transporte & Mobilidade Urbana', perc: 4, mencoes: 18, cor: '#06b6d4' },
  ];

  // Cálculo de Cobertura por Bairro
  const bairroMap = new Map<string, { total: number; lideres: number }>();
  for (const l of allLeaders) {
    const b = l.bairro || 'Sem Bairro';
    const curr = bairroMap.get(b) || { total: 0, lideres: 0 };
    curr.lideres += 1;
    curr.total += 1 + (l.total_indicados_rede || 0);
    bairroMap.set(b, curr);
  }

  const radarBairros = Array.from(bairroMap.entries())
    .map(([bairro, data]) => ({ bairro, ...data }))
    .sort((a, b) => b.total - a.total);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ─── 1. BANNER EXECUTIVO & RESUMO DE CADÊNCIA ────────────────────────── */}
      <div
        className="glass-panel"
        style={{
          padding: '22px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span
              className="badge"
              style={{
                background: `${semaforoColor}18`,
                color: semaforoColor,
                borderColor: `${semaforoColor}40`,
                fontWeight: 700,
              }}
            >
              {globalMeta.status_semaforo === 'VERMELHO' ? (
                <XCircle size={13} />
              ) : globalMeta.status_semaforo === 'AMARELO' ? (
                <AlertTriangle size={13} />
              ) : (
                <CheckCircle2 size={13} />
              )}
              Ritmo: {globalMeta.status_semaforo}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Eleições 2026 • 04 de Outubro
            </span>
          </div>

          <h2 style={{ fontSize: '22px', margin: 0 }}>Cockpit Estratégico</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px', maxWidth: '600px' }}>
            Acompanhamento da cadência de votos, ritmo diário necessário e inteligência territorial da campanha.
          </p>
        </div>

        {/* Ações Rápidas do Cabeçalho */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={onNewMeta} className="btn btn-primary btn-sm">
            <PlusCircle size={15} />
            <span>Definir Meta</span>
          </button>

          {onOpenBackup && (
            <button onClick={onOpenBackup} className="btn btn-secondary btn-sm" title="Backup e auditoria">
              <Database size={15} color="var(--primary)" />
              <span>Backup</span>
            </button>
          )}

          {onExportPdf && (
            <button onClick={onExportPdf} className="btn btn-secondary btn-sm" title="Exportar Relatório PDF">
              <FileText size={15} color="#8b5cf6" />
              <span>Relatório</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── 2. ATALHOS ESTRATÉGICOS: DIA D, SIMULADOR & APURAÇÃO ───────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '12px',
        }}
      >
        {onOpenSimulador && (
          <div
            onClick={onOpenSimulador}
            className="glass-panel"
            style={{
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(59, 130, 246, 0.12)',
                color: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Calculator size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Simulador QE/QP</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Projeção de sobras TSE 80/20</div>
            </div>
            <ArrowUpRight size={15} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
          </div>
        )}

        {onOpenWarRoom && (
          <div
            onClick={onOpenWarRoom}
            className="glass-panel"
            style={{
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(244, 63, 94, 0.12)',
                color: '#f43f5e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Radio size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>War Room Dia D</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Fiscalização de urnas e seções</div>
            </div>
            <ArrowUpRight size={15} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
          </div>
        )}

        {onOpenApuracao && (
          <div
            onClick={onOpenApuracao}
            className="glass-panel"
            style={{
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(16, 185, 129, 0.12)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Vote size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Apuração de BUs</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Leitura e auditoria de QR-BU</div>
            </div>
            <ArrowUpRight size={15} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
          </div>
        )}
      </div>

      {/* ─── 3. GRID HERO: VELOCÍMETRO RADIAL + 4 KPIS ESSENCIAIS ──────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(300px, 380px) 1fr',
          gap: '20px',
          alignItems: 'stretch',
        }}
      >
        {/* Velocímetro / Anel Radial */}
        <div
          className="glass-panel"
          style={{
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          <div style={{ position: 'relative', width: '180px', height: '180px' }}>
            <svg width="180" height="180" className="gauge-svg">
              <circle
                cx="90"
                cy="90"
                r={radius}
                className="gauge-circle-bg"
                strokeWidth="12"
              />
              <circle
                cx="90"
                cy="90"
                r={radius}
                className="gauge-circle-progress"
                stroke={semaforoColor}
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>

            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '34px', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', lineHeight: 1 }}>
                {globalMeta.percentual || 0}%
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '2px' }}>
                Conquistado
              </span>
            </div>
          </div>

          <div style={{ marginTop: '16px', width: '100%' }}>
            <h4 style={{ fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>
              {globalMeta.titulo}
            </h4>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Faltam {(globalMeta.faltam || 0).toLocaleString('pt-BR')} votos para a meta
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                paddingTop: '14px',
                marginTop: '14px',
                borderTop: '1px solid var(--border-color)',
              }}
            >
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Atual</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-heading)' }}>
                  {overview.totalEleitores.toLocaleString('pt-BR')}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Meta Geral</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                  {globalMeta.quantidade_meta.toLocaleString('pt-BR')}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ritmo</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: semaforoColor, fontFamily: 'var(--font-heading)' }}>
                  {globalMeta.ritmo_necessario_dia || 0}/dia
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Cards de Métricas em Tempo Real */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
          {/* Card 1: Eleitores & Apoiadores */}
          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-card-title">Eleitores & Apoiadores</span>
              <div className="kpi-card-icon">
                <Users size={18} />
              </div>
            </div>
            <div className="kpi-card-value">
              {overview.totalEleitores.toLocaleString('pt-BR')}
            </div>
            <div className="kpi-card-footer">
              <span style={{ color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                <TrendingUp size={13} /> Base mapeada
              </span>
              <span>• Votos confirmados</span>
            </div>
          </div>

          {/* Card 2: Lideranças de Rede */}
          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-card-title">Líderes de Rede</span>
              <div className="kpi-card-icon" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
                <Target size={18} />
              </div>
            </div>
            <div className="kpi-card-value">
              {overview.totalLideres.toLocaleString('pt-BR')}
            </div>
            <div className="kpi-card-footer">
              <span style={{ color: '#3b82f6', fontWeight: 600 }}>Multiplicadores</span>
              <span>• Mobilização direta</span>
            </div>
          </div>

          {/* Card 3: Atendimentos WhatsApp */}
          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-card-title">Interações WhatsApp</span>
              <div className="kpi-card-icon" style={{ background: 'rgba(6, 182, 212, 0.12)', color: '#06b6d4' }}>
                <MessageSquare size={18} />
              </div>
            </div>
            <div className="kpi-card-value">
              {overview.totalConversas.toLocaleString('pt-BR')}
            </div>
            <div className="kpi-card-footer">
              <span style={{ color: '#06b6d4', fontWeight: 600 }}>Groq IA Ativo</span>
              <span>• Conversas sincronizadas</span>
            </div>
          </div>

          {/* Card 4: Gastos de Campanha TSE */}
          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-card-title">Despesas Declaradas TSE</span>
              <div className="kpi-card-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
                <Clock size={18} />
              </div>
            </div>
            <div className="kpi-card-value" style={{ fontSize: '24px' }}>
              R$ {overview.totalGastos.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="kpi-card-footer">
              <span style={{ color: '#f59e0b', fontWeight: 600 }}>Prestação de Contas</span>
              <span>• Controle contábil</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 4. HUB DE INTELIGÊNCIA EM ABAS COMPACTAS ────────────────────────── */}
      <div className="glass-panel" style={{ padding: '20px 24px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '14px',
            marginBottom: '18px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <h3 style={{ fontSize: '17px', margin: 0 }}>Inteligência da Campanha</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Análise tática de lideranças, território e feedback da população
            </span>
          </div>

          {/* Seletor em Pills das Sub-Inteligências */}
          <div className="sub-pill-container">
            <button
              onClick={() => setIntelTab('ranking')}
              className={`sub-pill-btn ${intelTab === 'ranking' ? 'active' : ''}`}
            >
              <Award size={13} />
              <span>Ranking de Líderes</span>
            </button>
            <button
              onClick={() => setIntelTab('bairros')}
              className={`sub-pill-btn ${intelTab === 'bairros' ? 'active' : ''}`}
            >
              <MapPin size={13} />
              <span>Bairros ({radarBairros.length})</span>
            </button>
            <button
              onClick={() => setIntelTab('pautas')}
              className={`sub-pill-btn ${intelTab === 'pautas' ? 'active' : ''}`}
            >
              <Flame size={13} />
              <span>Pautas Populares</span>
            </button>
            <button
              onClick={() => setIntelTab('metas')}
              className={`sub-pill-btn ${intelTab === 'metas' ? 'active' : ''}`}
            >
              <Target size={13} />
              <span>Metas por Zona ({metas.length})</span>
            </button>
          </div>
        </div>

        {/* ── ABA 1: RANKING DE LIDERANÇAS & RADAR DE ATENÇÃO ────────────────── */}
        {intelTab === 'ranking' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {/* Top Líderes */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Award size={16} color="#fbbf24" />
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Top Mobilizadores na Rede
                </span>
              </div>

              {topLeaders.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Nenhum líder registrado ainda.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {topLeaders.map((leader, index) => {
                    const badgeIcon = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}º`;
                    return (
                      <div
                        key={leader.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          background: 'var(--bg-input)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '16px' }}>{badgeIcon}</span>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {leader.nome}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              {leader.bairro || 'Sem bairro'}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-heading)' }}>
                            {leader.total_indicados_rede || 0}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '4px' }}>eleitores</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Radar de Atenção (Líderes sem indicação) */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Compass size={16} color="#f59e0b" />
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Radar de Atenção (Ação Necessária)
                </span>
              </div>

              {radarInativos.length === 0 ? (
                <div style={{ padding: '16px', background: 'var(--primary-light)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <p style={{ fontSize: '13px', color: 'var(--primary)', margin: 0 }}>
                    ✨ Excelente! Todas as lideranças cadastradas possuem apoiadores ativos na base.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {radarInativos.map((l) => (
                    <div
                      key={l.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: 'var(--bg-input)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid rgba(245, 158, 11, 0.2)',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{l.nome}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {l.bairro || 'Sem bairro'} • {l.whatsapp}
                        </div>
                      </div>
                      <span className="badge badge-amarelo" style={{ fontSize: '10.5px' }}>
                        Cobrar Apoio
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ABA 2: COBERTURA POR BAIRRO ────────────────────────────────────── */}
        {intelTab === 'bairros' && (
          <div>
            {radarBairros.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Nenhum bairro cadastrado ainda.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                {radarBairros.map((rb) => {
                  const percTotal = overview.totalEleitores > 0 ? Math.round((rb.total / overview.totalEleitores) * 100) : 0;
                  const isZonaFria = rb.total <= 2;
                  return (
                    <div
                      key={rb.bairro}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-input)',
                        border: isZonaFria ? '1px solid rgba(244, 63, 94, 0.25)' : '1px solid var(--border-subtle)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '13.5px' }}>{rb.bairro}</span>
                        <span className={`badge ${isZonaFria ? 'badge-vermelho' : 'badge-verde'}`} style={{ fontSize: '10px' }}>
                          {isZonaFria ? 'Zona Fria' : 'Ativo'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        <span>{rb.lideres} {rb.lideres === 1 ? 'líder' : 'líderes'}</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{rb.total} votos ({percTotal}%)</span>
                      </div>
                      <div style={{ height: '5px', background: 'var(--border-subtle)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${Math.min(100, Math.max(8, percTotal * 2))}%`,
                            height: '100%',
                            background: isZonaFria ? 'var(--danger)' : 'var(--primary)',
                            borderRadius: 'var(--radius-full)',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── ABA 3: TERMOÔMETRO DE PAUTAS (IA GROQ) ─────────────────────────── */}
        {intelTab === 'pautas' && (
          <div style={{ maxWidth: '680px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {pautas.map((p) => (
                <div key={p.tema}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{p.tema}</span>
                    <span style={{ color: p.cor, fontWeight: 700 }}>{p.perc}% ({p.mencoes} menções)</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--border-subtle)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div style={{ width: `${p.perc}%`, height: '100%', background: p.cor, borderRadius: 'var(--radius-full)' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ABA 4: METAS TERRITORIAIS E ESPECÍFICAS ────────────────────────── */}
        {intelTab === 'metas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {metas.map((m) => {
              const pct = m.percentual || 0;
              const barColor =
                m.status_semaforo === 'VERMELHO'
                  ? '#f43f5e'
                  : m.status_semaforo === 'AMARELO'
                  ? '#f59e0b'
                  : '#10b981';

              return (
                <div
                  key={m.id}
                  style={{
                    background: 'var(--bg-input)',
                    padding: '14px 18px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>{m.titulo}</span>
                      {m.alvo_referencia && (
                        <span className="badge badge-blue">
                          {m.alvo_referencia}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {m.quantidade_atual} / {m.quantidade_meta} ({pct}%)
                      </span>
                      <span
                        className="badge"
                        style={{
                          background: `${barColor}18`,
                          color: barColor,
                          borderColor: `${barColor}35`,
                        }}
                      >
                        {m.status_semaforo}
                      </span>
                      {onDeleteMeta && (
                        <button
                          onClick={() => onDeleteMeta(m.id)}
                          title="Excluir meta"
                          style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      height: '6px',
                      width: '100%',
                      background: 'var(--border-subtle)',
                      borderRadius: 'var(--radius-full)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: barColor,
                        transition: 'width 0.6s ease',
                        borderRadius: 'var(--radius-full)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
