import React, { useEffect, useState } from 'react';
import { Package, AlertTriangle, Truck, CheckCircle2, X, MapPin, Volume2 } from 'lucide-react';
import { api } from '../api.ts';

export interface AlertaSuprimento {
  id: string;
  solicitante: string;
  telefone?: string;
  bairro: string;
  lat: number;
  lng: number;
  item: string;
  status: 'PENDENTE' | 'A_CAMINHO' | 'ENTREGUE';
  tempoEstimadoChegadaMinutos: number;
  createdAt: string;
  updatedAt?: string;
}

interface SupplyAlertNotificationProps {
  onNavigateToTelemetry?: (alerta?: AlertaSuprimento) => void;
}

// Disparador de Alerta Sonoro Tático (Web Audio API)
export const playSupplyAlertChime = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    // Padrão de alerta de urgência: bip alternado 880Hz / 1174Hz
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1174, now + 0.12);
    osc.frequency.setValueAtTime(880, now + 0.24);
    osc.frequency.setValueAtTime(1174, now + 0.36);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.55);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.58);
  } catch (_) {}
};

export const SupplyAlertNotification: React.FC<SupplyAlertNotificationProps> = ({ onNavigateToTelemetry }) => {
  const [activeAlerts, setActiveAlerts] = useState<AlertaSuprimento[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [lastSeenAlertId, setLastSeenAlertId] = useState<string | null>(null);
  const [despachandoId, setDespachandoId] = useState<string | null>(null);

  // Polling a cada 3.5 segundos para capturar novos alertas em tempo real
  useEffect(() => {
    let isMounted = true;

    const checkAlerts = async () => {
      try {
        const res = await api.getAlertasSuprimentos();
        if (res && res.success && Array.isArray(res.alertas) && isMounted) {
          setActiveAlerts(res.alertas);

          // Detecta se há algum alerta novo PENDENTE que ainda não tocou som
          const novoPendente = res.alertas.find(
            (a) => a.status === 'PENDENTE' && !dismissedIds.has(a.id)
          );

          if (novoPendente && novoPendente.id !== lastSeenAlertId) {
            setLastSeenAlertId(novoPendente.id);
            playSupplyAlertChime();
          }
        }
      } catch (_) {}
    };

    checkAlerts();
    const interval = setInterval(checkAlerts, 3500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [dismissedIds, lastSeenAlertId]);

  // Filtra alertas que requerem ação e não foram dispensados
  const alertasVisiveis = activeAlerts.filter(
    (a) => (a.status === 'PENDENTE' || a.status === 'A_CAMINHO') && !dismissedIds.has(a.id)
  );

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
  };

  const handleDespachar = async (alerta: AlertaSuprimento) => {
    setDespachandoId(alerta.id);
    try {
      await api.atenderAlertaSuprimento(alerta.id, 'A_CAMINHO');
      // Atualiza localmente
      setActiveAlerts((prev) =>
        prev.map((a) => (a.id === alerta.id ? { ...a, status: 'A_CAMINHO' } : a))
      );
    } catch (err: any) {
      alert(`Erro ao despachar van: ${err.message}`);
    } finally {
      setDespachandoId(null);
    }
  };

  if (alertasVisiveis.length === 0) return null;

  // Mostra o alerta mais recente em destaque
  const alertaUrgente = alertasVisiveis[0];
  const isACaminho = alertaUrgente.status === 'A_CAMINHO';

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 99999,
        maxWidth: '440px',
        width: 'calc(100vw - 40px)',
        animation: 'slideInDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        style={{
          background: isACaminho ? 'rgba(15, 23, 42, 0.96)' : 'rgba(24, 10, 15, 0.97)',
          border: isACaminho
            ? '2px solid rgba(245, 158, 11, 0.7)'
            : '2px solid rgba(239, 68, 68, 0.9)',
          borderRadius: '16px',
          boxShadow: isACaminho
            ? '0 12px 36px rgba(245, 158, 11, 0.3)'
            : '0 12px 36px rgba(239, 68, 68, 0.45)',
          backdropFilter: 'blur(16px)',
          padding: '16px 18px',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Barra superior de pulso de emergência */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: isACaminho
              ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
              : 'linear-gradient(90deg, #ef4444, #dc2626, #ef4444)',
            animation: 'pulse 1s infinite',
          }}
        />

        {/* Cabeçalho do Alerta */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: isACaminho ? '#f59e0b22' : '#ef444422',
                border: isACaminho ? '1px solid #f59e0b' : '1px solid #ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: isACaminho ? 'none' : 'bounce 1s infinite',
              }}
            >
              {isACaminho ? <Truck size={18} color="#f59e0b" /> : <Package size={18} color="#ef4444" />}
            </div>
            <div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 900,
                  letterSpacing: '0.03em',
                  color: isACaminho ? '#f59e0b' : '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {isACaminho ? 'VAN DE SUPRIMENTOS DESPACHADA' : '🚨 ALERTA: PEDIDO DE SANTINHOS'}
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                {new Date(alertaUrgente.createdAt).toLocaleTimeString('pt-BR')} • Equipe de Campo
              </div>
            </div>
          </div>

          <button
            onClick={() => handleDismiss(alertaUrgente.id)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Dispensar alerta"
          >
            <X size={16} />
          </button>
        </div>

        {/* Informações da Solicitação */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '10px',
            padding: '10px 12px',
            marginBottom: '12px',
            fontSize: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#94a3b8' }}>Solicitante:</span>
            <strong style={{ color: '#ffffff' }}>{alertaUrgente.solicitante}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#94a3b8' }}>Bairro / Local:</span>
            <span style={{ color: '#60a5fa', fontWeight: 800 }}>📍 {alertaUrgente.bairro}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#94a3b8' }}>Item Solicitado:</span>
            <strong style={{ color: '#facc15' }}>{alertaUrgente.item}</strong>
          </div>
          {isACaminho && (
            <div
              style={{
                marginTop: '4px',
                paddingTop: '6px',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#34d399',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <CheckCircle2 size={13} /> Van de apoio em deslocamento (Previsão: 15 min)
            </div>
          )}
        </div>

        {/* Botões de Ação Imediata */}
        <div style={{ display: 'grid', gridTemplateColumns: isACaminho ? '1fr' : '1.2fr 1fr', gap: '8px' }}>
          {!isACaminho && (
            <button
              onClick={() => handleDespachar(alertaUrgente)}
              disabled={despachandoId === alertaUrgente.id}
              style={{
                background: '#ef4444',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '12px',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
              }}
            >
              <Truck size={15} />
              {despachandoId === alertaUrgente.id ? 'Despachando...' : 'Despachar Van Agora'}
            </button>
          )}

          {onNavigateToTelemetry && (
            <button
              onClick={() => {
                onNavigateToTelemetry(alertaUrgente);
                handleDismiss(alertaUrgente.id);
              }}
              style={{
                background: isACaminho ? '#3b82f6' : 'rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <MapPin size={15} color="#38bdf8" />
              Ver no Radar
            </button>
          )}
        </div>

        {/* Indicador de múltiplos alertas */}
        {alertasVisiveis.length > 1 && (
          <div
            style={{
              fontSize: '10px',
              color: '#94a3b8',
              textAlign: 'center',
              marginTop: '8px',
              fontWeight: 700,
            }}
          >
            + {alertasVisiveis.length - 1} outro(s) pedido(s) de material na fila
          </div>
        )}
      </div>
    </div>
  );
};
