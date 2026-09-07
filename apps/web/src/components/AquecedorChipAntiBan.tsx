/**
 * ControleDisparos.tsx (antigo AquecedorChipAntiBan)
 * ─────────────────────────────────────────────────────────────────────────────
 * Painel de controle de rate limit e throttle para disparos via
 * WhatsApp Cloud API Oficial da Meta.
 * (Conceito de "aquecimento de chip" não se aplica à Meta Cloud API.)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import { api } from '../api.ts';

interface ChipConfig {
  instance_name: string;
  status: 'ATIVO' | 'PAUSADO' | 'CONCLUIDO';
  fase_atual: number;
  dias_ativos: number;
  msgs_enviadas_hoje: number;
  limite_diario_atual: number;
  health_score: number;
  numeros_parceiros: string;
  simular_digitacao: boolean;
  delays_gaussianos: boolean;
  ultimo_ciclo_em?: string;
}

interface Props {
  chipConfig: ChipConfig | null;
  onRefresh: () => void;
}

// Tiers da Meta Cloud API (https://developers.facebook.com/docs/whatsapp/messaging-limits)
const META_TIERS = [
  { tier: 'Tier 0 (Teste)', limit: 250, color: '#f59e0b', desc: 'Conta Business não verificada' },
  { tier: 'Tier 1 (Padrão)', limit: 1000, color: '#3b82f6', desc: 'Conta verificada com qualidade alta' },
  { tier: 'Tier 2', limit: 10000, color: '#8b5cf6', desc: 'Alta qualidade por 7+ dias consecutivos' },
  { tier: 'Tier 3', limit: 100000, color: '#10b981', desc: 'Alta qualidade por 7+ dias no Tier 2' },
];

export const AquecedorChipAntiBan: React.FC<Props> = ({ chipConfig, onRefresh }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [novoLimite, setNovoLimite] = useState('');

  const config = chipConfig || {
    instance_name: 'meta_cloud_api',
    status: 'PAUSADO' as const,
    fase_atual: 1,
    dias_ativos: 0,
    msgs_enviadas_hoje: 0,
    limite_diario_atual: 1000,
    health_score: 100,
    numeros_parceiros: '[]',
    simular_digitacao: true,
    delays_gaussianos: true,
  };

  const progressPercent = Math.min(100, Math.round((config.msgs_enviadas_hoje / config.limite_diario_atual) * 100));
  const tier = META_TIERS.find((t) => t.limit <= config.limite_diario_atual) || META_TIERS[0];
  const progressColor = progressPercent > 85 ? '#ef4444' : progressPercent > 60 ? '#f59e0b' : '#10b981';

  const handleToggleStatus = async () => {
    try {
      setIsUpdating(true);
      const newStatus = config.status === 'ATIVO' ? 'PAUSADO' : 'ATIVO';
      await api.updateChipWarming({ status: newStatus });
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar status dos disparos.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateLimit = async () => {
    const limit = parseInt(novoLimite, 10);
    if (!limit || limit < 1 || limit > 100000) {
      alert('Limite inválido. Insira um valor entre 1 e 100.000.');
      return;
    }
    try {
      setIsUpdating(true);
      await api.updateChipWarming({ limite_diario_atual: limit });
      setNovoLimite('');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar limite.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleDelay = async () => {
    try {
      setIsUpdating(true);
      await api.updateChipWarming({ delays_gaussianos: !config.delays_gaussianos });
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar configuração de delay.');
    } finally {
      setIsUpdating(false);
    }
  };

  const card = (children: React.ReactNode, extra?: React.CSSProperties) => (
    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', ...extra }}>
      {children}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ background: 'rgba(16,185,129,0.15)', padding: '8px', borderRadius: '10px', fontSize: '1.2rem' }}>📊</span>
          Controle de Disparos — Meta Cloud API
        </h2>
        <p style={{ color: 'var(--text-muted)', margin: '6px 0 0 0', fontSize: '0.875rem' }}>
          Monitoramento de rate limit e throttle para a WhatsApp Cloud API Oficial da Meta.
          Disparos respeitam automaticamente os limites por tier para manter qualidade e evitar restrições.
        </p>
      </div>

      {/* Banner explicativo */}
      <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', padding: '14px 16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '1.5rem' }}>🛡️</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#10b981', marginBottom: '4px' }}>API Oficial — Zero Risco de Banimento</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Ao contrário de soluções não-oficiais, a Meta Cloud API não precisa de "aquecimento de chip".
            O controle aqui gerencia o <strong style={{ color: '#fff' }}>rate limit por tier</strong> e os <strong style={{ color: '#fff' }}>delays humanizados</strong> entre mensagens para otimizar a taxa de entrega.
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
        {/* Painel de status atual */}
        {card(
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>Status dos Disparos</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Meta Cloud API</div>
              </div>
              <button
                onClick={handleToggleStatus}
                disabled={isUpdating}
                style={{
                  background: config.status === 'ATIVO' ? '#10b981' : '#475569',
                  color: '#fff',
                  border: 'none',
                  padding: '7px 16px',
                  borderRadius: '20px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  transition: 'all 0.2s',
                }}
              >
                {config.status === 'ATIVO' ? '● Disparos Ativos' : '○ Disparos Pausados'}
              </button>
            </div>

            {/* Progress bar diário */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Uso diário ({progressPercent}%)</span>
                <span style={{ fontWeight: 700, color: progressColor }}>
                  {config.msgs_enviadas_hoje.toLocaleString()} / {config.limite_diario_atual.toLocaleString()}
                </span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '99px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${progressPercent}%`,
                    background: progressColor,
                    borderRadius: '99px',
                    transition: 'width 0.5s ease',
                    boxShadow: `0 0 8px ${progressColor}60`,
                  }}
                />
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Reset automático à meia-noite · Próximo reset: 00:00
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                { label: 'Enviadas Hoje', value: config.msgs_enviadas_hoje.toLocaleString(), color: '#10b981' },
                { label: 'Limite Diário', value: config.limite_diario_atual.toLocaleString(), color: '#38bdf8' },
                { label: 'Restantes Hoje', value: Math.max(0, config.limite_diario_atual - config.msgs_enviadas_hoje).toLocaleString(), color: '#a78bfa' },
                { label: 'Tier Atual', value: tier.tier.split('(')[0].trim(), color: tier.color },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '10px 12px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>{label}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color }}>{value}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Configuração de limite */}
        {card(
          <>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '4px' }}>Ajuste de Limite Diário</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Configure conforme o tier da sua conta Meta Business.
            </div>

            {/* Tiers da Meta */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {META_TIERS.map((t) => (
                <button
                  key={t.tier}
                  onClick={() => setNovoLimite(String(t.limit))}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: `1px solid ${novoLimite === String(t.limit) || (!novoLimite && config.limite_diario_atual === t.limit) ? t.color : 'var(--border)'}`,
                    background: novoLimite === String(t.limit) || (!novoLimite && config.limite_diario_atual === t.limit) ? `${t.color}15` : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: t.color }}>{t.tier}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.desc}</div>
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>
                    {t.limit.toLocaleString()}/dia
                  </div>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="number"
                className="input-field"
                placeholder="Ou insira valor personalizado"
                value={novoLimite}
                onChange={(e) => setNovoLimite(e.target.value)}
                style={{ flex: 1 }}
              />
              <button
                onClick={handleUpdateLimit}
                disabled={isUpdating || !novoLimite}
                className="btn btn-primary"
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Aplicar
              </button>
            </div>
          </>
        )}

        {/* Delay humanizado */}
        {card(
          <>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '4px' }}>Delay Humanizado entre Mensagens</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Delays gaussianos de 2–6 segundos entre envios para respeitar rate limits e simular comportamento humano.
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 16px',
                borderRadius: '10px',
                background: config.delays_gaussianos ? 'rgba(16,185,129,0.08)' : 'rgba(71,85,105,0.2)',
                border: `1px solid ${config.delays_gaussianos ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`,
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                  {config.delays_gaussianos ? '✅ Delays Ativos (2–6s)' : '⏩ Delay Mínimo (1s)'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {config.delays_gaussianos
                    ? 'Simula digitação humana — recomendado para altos volumes'
                    : 'Envios mais rápidos — cuidado com rate limits'}
                </div>
              </div>
              <button
                onClick={handleToggleDelay}
                disabled={isUpdating}
                style={{
                  background: config.delays_gaussianos ? '#10b981' : '#475569',
                  color: '#fff',
                  border: 'none',
                  padding: '7px 16px',
                  borderRadius: '20px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                }}
              >
                {config.delays_gaussianos ? 'Ligado' : 'Desligado'}
              </button>
            </div>

            <div style={{ marginTop: '14px', padding: '12px', background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700, marginBottom: '4px' }}>📌 Limites da Meta Cloud API:</div>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.8' }}>
                <li>Não existe número de telefone dedicado que possa ser banido</li>
                <li>Rate limit é por conta Business, não por número</li>
                <li>Qualidade é medida por taxa de leitura e reclamações</li>
                <li>Templates rejeitados reduzem automaticamente o tier</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
