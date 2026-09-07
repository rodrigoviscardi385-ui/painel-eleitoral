import React from 'react';
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
} from 'lucide-react';
import { api } from '../api.ts';

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
  const globalMeta = metas.find((m) => m.tipo === 'GLOBAL') || metas[0] || {
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
      ? '#ef4444'
      : globalMeta.status_semaforo === 'AMARELO'
      ? '#f59e0b'
      : '#10b981';

  // Cálculo SVG Gauge (Circunferência = 2 * PI * 80 ~= 502)
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - ((globalMeta.percentual || 0) / 100) * circumference;

  // Flatten tree para obter todos os líderes e ordenar
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
    .slice(0, 5);

  const radarInativos = allLeaders
    .filter((l) => (l.total_indicados_diretos || 0) === 0)
    .slice(0, 4);

  const pautas = [
    { tema: 'Saúde & Fila Zero', perc: 42, mencoes: 184, cor: '#10b981' },
    { tema: 'Educação & Tecnologia Escolar', perc: 26, mencoes: 114, cor: '#3b82f6' },
    { tema: 'Emprego & Desoneração Local', perc: 18, mencoes: 79, cor: '#8b5cf6' },
    { tema: 'Segurança & Iluminação Pública', perc: 10, mencoes: 44, cor: '#f59e0b' },
    { tema: 'Transporte & Mobilidade Urbana', perc: 4, mencoes: 18, cor: '#06b6d4' },
  ];

  // Cálculo de Cobertura Territorial por Bairro
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner do Cockpit com Ações */}
      <div
        className="glass-panel"
        style={{
          padding: '24px 32px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(15, 23, 42, 0.8))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span
              className="badge"
              style={{
                background: `${semaforoColor}25`,
                color: semaforoColor,
                borderColor: `${semaforoColor}50`,
              }}
            >
              {globalMeta.status_semaforo === 'VERMELHO' ? (
                <XCircle size={14} />
              ) : globalMeta.status_semaforo === 'AMARELO' ? (
                <AlertTriangle size={14} />
              ) : (
                <CheckCircle2 size={14} />
              )}
              Semáforo Eleitoral: {globalMeta.status_semaforo}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Eleições 2026 • 04 de Outubro
            </span>
          </div>

          <h2 style={{ fontSize: '24px', color: '#ffffff' }}>Cockpit de Cadência & Metas</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '650px', marginTop: '4px' }}>
            Monitoramento em tempo real do ritmo diário de captação de votos, capilaridade territorial e balanço da mobilização.
          </p>
        </div>

        {/* Botões de Ações Estratégicas */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={onNewMeta} className="btn btn-primary" style={{ padding: '9px 16px', fontSize: '13px' }}>
            <PlusCircle size={16} />
            <span>Nova Meta</span>
          </button>

          {onOpenBackup && (
            <button onClick={onOpenBackup} className="btn btn-secondary" style={{ padding: '9px 16px', fontSize: '13px' }}>
              <Database size={16} color="#10b981" />
              <span>Backup & Relatórios</span>
            </button>
          )}

          {onExportPdf && (
            <button onClick={onExportPdf} className="btn btn-secondary" style={{ padding: '9px 16px', fontSize: '13px' }}>
              <FileText size={16} color="#8b5cf6" />
              <span>Relatório TSE</span>
            </button>
          )}
        </div>
      </div>

      {/* Barra de Atalhos Rápidos da Estratégia de Campanha */}
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
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.12), rgba(15, 23, 42, 0.7))',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(37, 99, 235, 0.25)', color: '#60a5fa' }}>
              <Calculator size={18} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>Simulador Quociente QE/QP</div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Projeção de vagas e sobras TSE 80/20</div>
            </div>
          </div>
        )}

        {onOpenWarRoom && (
          <div
            onClick={onOpenWarRoom}
            className="glass-panel"
            style={{
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(15, 23, 42, 0.7))',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.25)', color: '#f87171' }}>
              <Radio size={18} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>War Room do Dia D</div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Fiscalização de urnas e escolas em tempo real</div>
            </div>
          </div>
        )}

        {onOpenApuracao && (
          <div
            onClick={onOpenApuracao}
            className="glass-panel"
            style={{
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(15, 23, 42, 0.7))',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.25)', color: '#34d399' }}>
              <Vote size={18} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>Apuração Prévia de BUs</div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Leitura e auditoria do QR-BU das urnas</div>
            </div>
          </div>
        )}
      </div>

      {/* Grid Principal: Velocímetro SVG + Cards de Estatísticas */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(300px, 420px) 1fr',
          gap: '24px',
          alignItems: 'stretch',
        }}
      >
        {/* Card do Velocímetro de Cadência */}
        <div
          className="glass-panel"
          style={{
            padding: '30px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          <div style={{ position: 'relative', width: '200px', height: '200px' }}>
            <svg width="200" height="200" style={{ transform: 'rotate(-90deg)' }}>
              <circle
                cx="100"
                cy="100"
                r={radius}
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth="16"
                fill="none"
              />
              <circle
                cx="100"
                cy="100"
                r={radius}
                stroke={semaforoColor}
                strokeWidth="16"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.5s ease' }}
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
              <span style={{ fontSize: '36px', fontWeight: 900, color: '#ffffff', fontFamily: 'Outfit' }}>
                {globalMeta.percentual || 0}%
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Atingido
              </span>
            </div>
          </div>

          <div style={{ marginTop: '20px', width: '100%' }}>
            <h3 style={{ fontSize: '18px', color: '#ffffff', marginBottom: '8px' }}>
              {globalMeta.titulo}
            </h3>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-around',
                padding: '12px 0',
                borderTop: '1px solid var(--border-color)',
                marginTop: '12px',
              }}
            >
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Atual</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)' }}>
                  {overview.totalEleitores.toLocaleString('pt-BR')}
                </div>
              </div>
              <div style={{ width: '1px', background: 'var(--border-color)' }}></div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Meta Geral</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>
                  {globalMeta.quantidade_meta.toLocaleString('pt-BR')}
                </div>
              </div>
              <div style={{ width: '1px', background: 'var(--border-color)' }}></div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Ritmo Diário</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: semaforoColor }}>
                  {globalMeta.ritmo_necessario_dia || 0}/dia
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Cards de Métricas em Tempo Real */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {/* Eleitores Totais */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Eleitores & Apoiadores
              </span>
              <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '8px', borderRadius: '10px' }}>
                <Users size={20} color="#10b981" />
              </div>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff' }}>
              {overview.totalEleitores.toLocaleString('pt-BR')}
            </div>
            <div style={{ fontSize: '12px', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
              <TrendingUp size={14} />
              <span>Cadastrados no banco</span>
            </div>
          </div>

          {/* Lideranças Ativas */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Líderes de Rede
              </span>
              <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '8px', borderRadius: '10px' }}>
                <Target size={20} color="#3b82f6" />
              </div>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff' }}>
              {overview.totalLideres.toLocaleString('pt-BR')}
            </div>
            <div style={{ fontSize: '12px', color: '#60a5fa', marginTop: '6px' }}>
              Capilaridade territorial ativa
            </div>
          </div>

          {/* Conversas de WhatsApp */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Atendimentos WhatsApp
              </span>
              <div style={{ background: 'rgba(6, 182, 212, 0.15)', padding: '8px', borderRadius: '10px' }}>
                <MessageSquare size={20} color="#06b6d4" />
              </div>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff' }}>
              {overview.totalConversas.toLocaleString('pt-BR')}
            </div>
            <div style={{ fontSize: '12px', color: '#22d3ee', marginTop: '6px' }}>
              IA Whisper & Llama ativos
            </div>
          </div>

          {/* Gastos de Campanha */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Despesas TSE
              </span>
              <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '8px', borderRadius: '10px' }}>
                <Clock size={20} color="#f59e0b" />
              </div>
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff' }}>
              R$ {overview.totalGastos.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '12px', color: '#fbbf24', marginTop: '6px' }}>
              Prestação de contas contábil
            </div>
          </div>
        </div>
      </div>

      {/* Grid Secundário: Ranking Top Líderes + Radar de Atenção + Termômetro de Pautas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Top Líderes */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Award size={20} color="#fbbf24" />
            <h3 style={{ fontSize: '16px', color: '#ffffff', margin: 0 }}>Ranking de Mobilização</h3>
          </div>

          {topLeaders.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Nenhum líder com rede registrada ainda.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {topLeaders.map((leader, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}º`;
                return (
                  <div
                    key={leader.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      background: 'rgba(15, 23, 42, 0.5)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '18px' }}>{medal}</span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>{leader.nome}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{leader.bairro || 'Sem bairro'}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--primary)' }}>
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

        {/* Radar de Atenção */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Compass size={20} color="#f59e0b" />
            <h3 style={{ fontSize: '16px', color: '#ffffff', margin: 0 }}>Radar de Atenção (Líderes sem Votos)</h3>
          </div>

          {radarInativos.length === 0 ? (
            <div style={{ padding: '14px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <p style={{ fontSize: '12px', color: '#10b981', margin: 0 }}>
                🎉 Excelente! Todos os líderes possuem pelo menos 1 apoiador vinculado na rede.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {radarInativos.map((l) => (
                <div
                  key={l.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    background: 'rgba(15, 23, 42, 0.5)',
                    borderRadius: '8px',
                    border: '1px solid rgba(245, 158, 11, 0.2)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>{l.nome}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {l.bairro || 'Sem bairro'} • {l.whatsapp}
                    </div>
                  </div>
                  <span className="badge badge-amarelo" style={{ fontSize: '10px' }}>
                    Requer Visita
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Termômetro de Pautas */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Flame size={20} color="#ef4444" />
            <h3 style={{ fontSize: '16px', color: '#ffffff', margin: 0 }}>Termômetro de Pautas da População</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pautas.map((p) => (
              <div key={p.tema}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: '#ffffff', fontWeight: 600 }}>{p.tema}</span>
                  <span style={{ color: p.cor, fontWeight: 700 }}>{p.perc}% ({p.mencoes})</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${p.perc}%`, height: '100%', background: p.cor, borderRadius: '4px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Radar de Cobertura Territorial por Bairro */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
              <MapPin size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', color: '#ffffff', margin: 0 }}>Radar de Cobertura Territorial por Bairro</h3>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Distribuição de apoiadores e detecção de zonas frias para atuação da militância
              </span>
            </div>
          </div>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#38bdf8' }}>
            {radarBairros.length} bairros mapeados
          </span>
        </div>

        {radarBairros.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Nenhum bairro cadastrado ainda.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
            {radarBairros.slice(0, 8).map((rb) => {
              const percTotal = overview.totalEleitores > 0 ? Math.round((rb.total / overview.totalEleitores) * 100) : 0;
              const isZonaFria = rb.total <= 2;
              return (
                <div
                  key={rb.bairro}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '12px',
                    background: isZonaFria ? 'rgba(239, 68, 68, 0.06)' : 'rgba(15, 23, 42, 0.5)',
                    border: isZonaFria ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 700, color: '#ffffff', fontSize: '14px' }}>{rb.bairro}</span>
                    <span
                      className="badge"
                      style={{
                        background: isZonaFria ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                        color: isZonaFria ? '#f87171' : '#34d399',
                        fontSize: '10px',
                      }}
                    >
                      {isZonaFria ? 'Zona Fria' : 'Ativo'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    <span>{rb.lideres} {rb.lideres === 1 ? 'liderança' : 'lideranças'}</span>
                    <span style={{ fontWeight: 700, color: '#f8fafc' }}>{rb.total} votos ({percTotal}%)</span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.min(100, Math.max(8, percTotal * 2))}%`,
                        height: '100%',
                        background: isZonaFria ? '#ef4444' : 'linear-gradient(90deg, #10b981, #06b6d4)',
                        borderRadius: '999px',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lista de Metas Territoriais e Específicas */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', color: '#ffffff' }}>
            Metas Territoriais & Mobilização por Zona
          </h3>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Total de metas ativas: {metas.length}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {metas.map((m) => {
            const pct = m.percentual || 0;
            const barColor =
              m.status_semaforo === 'VERMELHO'
                ? '#ef4444'
                : m.status_semaforo === 'AMARELO'
                ? '#f59e0b'
                : '#10b981';

            return (
              <div
                key={m.id}
                style={{
                  background: 'rgba(15, 23, 42, 0.5)',
                  padding: '16px 20px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 600, color: '#ffffff', fontSize: '15px' }}>{m.titulo}</span>
                    {m.alvo_referencia && (
                      <span className="badge badge-azul">
                        {m.alvo_referencia}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {m.quantidade_atual} / {m.quantidade_meta} ({pct}%)
                    </span>
                    <span
                      className="badge"
                      style={{
                        background: `${barColor}20`,
                        color: barColor,
                        borderColor: `${barColor}40`,
                      }}
                    >
                      {m.status_semaforo}
                    </span>
                    {onDeleteMeta && (
                      <button
                        onClick={() => onDeleteMeta(m.id)}
                        title="Excluir meta"
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Barra de Progresso */}
                <div
                  style={{
                    height: '8px',
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.08)',
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
      </div>
    </div>
  );
};
