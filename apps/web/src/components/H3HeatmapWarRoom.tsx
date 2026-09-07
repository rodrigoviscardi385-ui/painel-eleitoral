/**
 * H3HeatmapWarRoom.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Painel Tático de Inteligência Geoespacial Hexagonal (H3 Resolução 8).
 * Apresenta zonas críticas, Retorno sobre Visita (RoV) e controle da Sirene de Crise.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect } from 'react';
import { Hexagon, TrendingUp, AlertTriangle, ShieldCheck, Siren, RefreshCw, Zap } from 'lucide-react';

export interface HexZone {
  h3Index: string;
  bairro: string;
  totalEleitores: number;
  votosProjetados: number;
  indiceSentimento: number;
  indiceRiscoPerda: number;
  indiceRov: number;
  statusTatico: 'CONSOLIDADO' | 'ZONA_DE_DISPUTA' | 'ZONA_CRITICA';
}

interface H3HeatmapWarRoomProps {
  onTriggerCrisisDemo?: () => void;
}

export const H3HeatmapWarRoom: React.FC<H3HeatmapWarRoomProps> = ({ onTriggerCrisisDemo }) => {
  const [zones, setZones] = useState<HexZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState<HexZone | null>(null);

  const fetchHexagons = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v2/mapas/h3-heatmap');
      if (res.ok) {
        const json = await res.json();
        setZones(json.hexagons || []);
        if (json.hexagons && json.hexagons.length > 0) {
          setSelectedZone(json.hexagons[0]);
        }
      }
    } catch {
      // Fallback local se a API não estiver conectada
      const fallbackZones: HexZone[] = [
        { h3Index: '88a8107293fffff', bairro: 'Gonzaga', totalEleitores: 8400, votosProjetados: 3200, indiceSentimento: 0.42, indiceRiscoPerda: 0.25, indiceRov: 68.5, statusTatico: 'CONSOLIDADO' },
        { h3Index: '88a8107291fffff', bairro: 'Boqueirão', totalEleitores: 9100, votosProjetados: 4100, indiceSentimento: 0.58, indiceRiscoPerda: 0.18, indiceRov: 54.0, statusTatico: 'CONSOLIDADO' },
        { h3Index: '88a8107283fffff', bairro: 'Aparecida', totalEleitores: 8900, votosProjetados: 3100, indiceSentimento: -0.15, indiceRiscoPerda: 0.68, indiceRov: 89.4, statusTatico: 'ZONA_CRITICA' },
        { h3Index: '88a8107281fffff', bairro: 'Campo Grande', totalEleitores: 5800, votosProjetados: 1800, indiceSentimento: -0.32, indiceRiscoPerda: 0.79, indiceRov: 94.6, statusTatico: 'ZONA_CRITICA' },
        { h3Index: '88a8107287fffff', bairro: 'Marapé', totalEleitores: 4900, votosProjetados: 2100, indiceSentimento: 0.10, indiceRiscoPerda: 0.45, indiceRov: 76.8, statusTatico: 'ZONA_DE_DISPUTA' },
      ];
      setZones(fallbackZones);
      setSelectedZone(fallbackZones[2]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHexagons();
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        background: 'var(--bg-card)',
        borderRadius: '16px',
        border: '1px solid var(--border-subtle)',
        padding: '20px',
      }}
    >
      {/* Barra de Título e Ações Táticas */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.15)',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Hexagon size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
              Inteligência Territorial H3 • Retorno sobre Visita (RoV)
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Hexágonos Uber H3 Resolução 8 (~460m) • Sentimento em Tempo Real
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={fetchHexagons}
            className="btn-action"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '0.8rem',
              borderRadius: '8px',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Atualizar Malha
          </button>
          {onTriggerCrisisDemo && (
            <button
              onClick={onTriggerCrisisDemo}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                fontSize: '0.8rem',
                fontWeight: 700,
                borderRadius: '8px',
                background: '#ef4444',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 0 12px rgba(239, 68, 68, 0.35)',
              }}
            >
              <Siren size={14} /> Simular Sirene de Crise
            </button>
          )}
        </div>
      </div>

      {/* Grade Tática de Hexágonos */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '12px',
        }}
      >
        {zones.map((zone) => {
          const isSelected = selectedZone?.h3Index === zone.h3Index;
          const isCritical = zone.statusTatico === 'ZONA_CRITICA';
          const isDispute = zone.statusTatico === 'ZONA_DE_DISPUTA';

          return (
            <div
              key={zone.h3Index}
              onClick={() => setSelectedZone(zone)}
              style={{
                padding: '14px',
                borderRadius: '12px',
                border: isSelected
                  ? '2px solid var(--accent-primary)'
                  : isCritical
                  ? '1px solid rgba(239, 68, 68, 0.4)'
                  : '1px solid var(--border-subtle)',
                background: isCritical
                  ? 'rgba(239, 68, 68, 0.05)'
                  : isDispute
                  ? 'rgba(245, 158, 11, 0.05)'
                  : 'var(--bg-subtle)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  {zone.bairro}
                </span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: '6px',
                    background: isCritical ? '#ef4444' : isDispute ? '#f59e0b' : '#10b981',
                    color: '#ffffff',
                  }}
                >
                  RoV {zone.indiceRov.toFixed(1)}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <div>Eleitores: <strong>{zone.totalEleitores.toLocaleString('pt-BR')}</strong></div>
                <div>Votos Projetados: <strong>{zone.votosProjetados.toLocaleString('pt-BR')}</strong></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                  <span>Sentimento:</span>
                  <strong style={{ color: zone.indiceSentimento >= 0 ? '#10b981' : '#ef4444' }}>
                    {(zone.indiceSentimento * 100).toFixed(0)}%
                  </strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detalhe do Hexágono Selecionado */}
      {selectedZone && (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: '12px',
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Zap size={20} color="var(--accent-primary)" />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                Diretriz de Guerrilha para {selectedZone.bairro} (H3: <code>{selectedZone.h3Index}</code>)
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {selectedZone.statusTatico === 'ZONA_CRITICA'
                  ? '⚠️ Prioridade Máxima: Alto risco de perda e eleitorado indeciso. Direcionar caminhadas e material físico nas próximas 24h.'
                  : selectedZone.statusTatico === 'ZONA_DE_DISPUTA'
                  ? '⚡ Zona em Disputa: Intensificar disparos segmentados de WhatsApp sobre as pautas do bairro.'
                  : '✅ Base Consolidada: Manter cadência orgânica de mensagens de engajamento.'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
