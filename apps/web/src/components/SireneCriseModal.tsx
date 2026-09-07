/**
 * SireneCriseModal.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * War Room Cockpit: Modal & Banner de Alerta Máximo da "Sirene de Crise".
 * Exibe a Tríade Tática gerada por IA com cadeia de custódia e cópia instantânea.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import { Siren, AlertOctagon, Copy, Check, Scale, ShieldAlert, Send, X } from 'lucide-react';

export interface CrisisIncidentData {
  id: string;
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  topico: string;
  sinteseNarrativa: string;
  contraNarrativas: Array<{
    publicoAlvo: string;
    tom: string;
    mensagem: string;
  }>;
  minutaJuridica: {
    remedio: string;
    fundamentoLegal: string;
    pedidoTutela: string;
  };
  evidenciaSha256: string;
  createdAt: string;
}

interface SireneCriseModalProps {
  incident: CrisisIncidentData | null;
  onClose: () => void;
  onDispatchWhatsApp?: (msg: string) => void;
}

export const SireneCriseModal: React.FC<SireneCriseModalProps> = ({
  incident,
  onClose,
  onDispatchWhatsApp,
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedLegal, setCopiedLegal] = useState(false);

  if (!incident) return null;

  const handleCopyText = (text: string, index?: number) => {
    navigator.clipboard.writeText(text);
    if (index !== undefined) {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } else {
      setCopiedLegal(true);
      setTimeout(() => setCopiedLegal(false), 2000);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '780px',
          background: 'var(--bg-card)',
          borderRadius: '16px',
          border: '2px solid #ef4444',
          boxShadow: '0 0 35px rgba(239, 68, 68, 0.45)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        {/* Cabeçalho de Emergência Tática */}
        <div
          style={{
            background: 'linear-gradient(90deg, #991b1b, #ef4444)',
            color: '#ffffff',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'pulse 1s infinite',
              }}
            >
              <Siren size={22} color="#ffffff" />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.9 }}>
                War Room • Sirene de Crise Ativada
              </div>
              <div style={{ fontWeight: 800, fontSize: '1.15rem' }}>
                {incident.topico}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Corpo do Alerta */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Síntese do Ataque */}
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              borderLeft: '4px solid #ef4444',
              padding: '12px 16px',
              borderRadius: '0 8px 8px 0',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase' }}>
              Diagnóstico de Inteligência Artificial:
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginTop: '4px', fontWeight: 500 }}>
              {incident.sinteseNarrativa}
            </div>
          </div>

          {/* Tríade Tática: Contranarrativas */}
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '10px' }}>
              Tríade Tática de Contragolpe (Respostas Segmentadas):
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {incident.contraNarrativas.map((cn, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                      {cn.publicoAlvo} • Tom: {cn.tom}
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handleCopyText(cn.mensagem, idx)}
                        className="btn-action"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 8px',
                          fontSize: '0.75rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        {copiedIndex === idx ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                        {copiedIndex === idx ? 'Copiado' : 'Copiar'}
                      </button>
                      {onDispatchWhatsApp && (
                        <button
                          onClick={() => onDispatchWhatsApp(cn.mensagem)}
                          className="btn-action"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 8px',
                            fontSize: '0.75rem',
                            borderRadius: '6px',
                            background: '#10b981',
                            color: '#ffffff',
                            cursor: 'pointer',
                          }}
                        >
                          <Send size={12} /> Disparar
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {cn.mensagem}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Minuta Jurídica TSE */}
          <div
            style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Scale size={16} color="var(--accent-primary)" />
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  Minuta Jurídica TSE (Ação Imediata)
                </span>
              </div>
              <button
                onClick={() =>
                  handleCopyText(
                    `REMEDIO: ${incident.minutaJuridica.remedio}\nFUNDAMENTO: ${incident.minutaJuridica.fundamentoLegal}\nPEDIDO: ${incident.minutaJuridica.pedidoTutela}\nHASH EVIDENCIA: ${incident.evidenciaSha256}`
                  )
                }
                className="btn-action"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  fontSize: '0.75rem',
                  borderRadius: '6px',
                }}
              >
                {copiedLegal ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                {copiedLegal ? 'Copiado' : 'Copiar Petição'}
              </button>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <div><strong>Remédio:</strong> {incident.minutaJuridica.remedio}</div>
              <div><strong>Fundamento:</strong> {incident.minutaJuridica.fundamentoLegal}</div>
              <div><strong>Pedido de Tutela:</strong> {incident.minutaJuridica.pedidoTutela}</div>
            </div>
          </div>

          {/* Cadeia de Custódia Probatória */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.7rem',
              color: 'var(--text-secondary)',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '10px',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldAlert size={12} />
              Cadeia de Custódia ICP-Brasil: <code style={{ color: 'var(--text-primary)' }}>{incident.evidenciaSha256.substring(0, 24)}...</code>
            </span>
            <span>Registrado em: {new Date(incident.createdAt).toLocaleTimeString('pt-BR')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
