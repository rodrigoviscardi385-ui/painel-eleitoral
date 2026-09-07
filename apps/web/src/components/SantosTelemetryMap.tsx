import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Compass,
  Layers,
  MapPin,
  RefreshCw,
  Navigation,
  ShieldCheck,
  Package,
  AlertTriangle,
  Footprints,
  Zap,
  Truck
} from 'lucide-react';

export interface ContratadoTelemetria {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  bairro: string;
  regiao: 'ORLA' | 'ZONA_NOROESTE' | 'CENTRO' | 'MORROS';
  funcao: string;
  statusCinetico: 'EM_MOVIMENTO' | 'PARADO_BASE' | 'PARADO_ALERTA' | 'DESLOCAMENTO_VEICULO' | 'OFFLINE';
  velocidadeKmh: number;
  tempoParadoMinutos: number;
  passosHoje: number;
  kmRodados: number;
  cadastrosHoje: number;
  bateriaPct: number;
  latitude: number;
  longitude: number;
  ultimaAtualizacao: string;
  breadcrumbs: { lat: number; lng: number; hora: string }[];
}

export interface AlertaSuprimentoItem {
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
}

interface SantosTelemetryMapProps {
  contratados: ContratadoTelemetria[];
  alertasSuprimentos?: AlertaSuprimentoItem[];
  selectedContratado?: ContratadoTelemetria | null;
  onSelectContratado?: (c: ContratadoTelemetria) => void;
  onDespacharVan?: (alertaId: string) => void;
  height?: string;
}

// Pontos de Referência da Mobilização em Santos (100% Rua e Panfletagem)
const BASES_CAMPANHA_SANTOS = [
  { id: 'base_gonzaga', nome: 'Ponto de Referência - Gonzaga', lat: -23.9660, lng: -46.3338, desc: 'Praça das Bandeiras / Av. Ana Costa' },
  { id: 'base_zn', nome: 'Ponto Zona Noroeste', lat: -23.9315, lng: -46.3680, desc: 'Jardim Castelo / Sambódromo' },
  { id: 'base_ponta_praia', nome: 'Ponto Orla Ponta da Praia', lat: -23.9855, lng: -46.3075, desc: 'Travessia de Balsas / Canal 6' },
  { id: 'base_centro', nome: 'Comitê Central - Vila Mathias', lat: -23.9510, lng: -46.3290, desc: 'Rua Carvalho de Mendonça' },
  { id: 'base_morros', nome: 'Ponto Tático Nova Cintra', lat: -23.9470, lng: -46.3450, desc: 'Morro Nova Cintra / Lagoa da Saudade' },
];

export const SantosTelemetryMap: React.FC<SantosTelemetryMapProps> = ({
  contratados,
  alertasSuprimentos = [],
  selectedContratado,
  onSelectContratado,
  onDespacharVan,
  height = '420px',
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const breadcrumbLayerRef = useRef<L.Polyline | null>(null);
  const [mapStyle, setMapStyle] = useState<'DARK' | 'VOYAGER' | 'OSM'>('DARK');
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Inicializar o mapa do Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Coordenadas centrais de Santos/SP
    const santosCenter: [number, number] = [-23.9618, -46.3322];

    const map = L.map(mapContainerRef.current, {
      center: santosCenter,
      zoom: 13,
      minZoom: 11,
      maxZoom: 18,
      zoomControl: false,
    });

    // Adiciona controle de zoom no canto superior direito
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Camada inicial de azulejos (CartoDB Dark Matter)
    const initialTileUrl =
      mapStyle === 'VOYAGER'
        ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
        : mapStyle === 'OSM'
        ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

    const tile = L.tileLayer(initialTileUrl, {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    tileLayerRef.current = tile;

    // Grupo de marcadores
    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;

    mapInstanceRef.current = map;

    // Ajustar tamanho após render
    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Troca dinâmica do estilo de azulejos
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;

    const urls: Record<'DARK' | 'VOYAGER' | 'OSM', string> = {
      DARK: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      VOYAGER: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      OSM: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    };

    tileLayerRef.current.setUrl(urls[mapStyle]);
  }, [mapStyle]);

  // Atualizar marcadores no mapa
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    // 1. Plotar Bases Oficiais da Campanha
    BASES_CAMPANHA_SANTOS.forEach((base) => {
      const baseIcon = L.divIcon({
        className: 'santos-base-marker',
        html: `
          <div style="
            width: 28px;
            height: 28px;
            border-radius: 8px;
            background: #1e293b;
            border: 2px solid #3b82f6;
            box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #60a5fa;
            font-size: 14px;
            cursor: pointer;
          ">
            ⛺
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([base.lat, base.lng], { icon: baseIcon }).addTo(markersGroup);
      marker.bindPopup(`
        <div style="font-family: sans-serif; padding: 4px; min-width: 170px;">
          <div style="font-weight: 800; font-size: 13px; color: #1e293b; margin-bottom: 2px;">${base.nome}</div>
          <div style="font-size: 11px; color: #64748b;">${base.desc}</div>
          <div style="margin-top: 6px; font-size: 10px; font-weight: 700; color: #3b82f6; background: #eff6ff; padding: 3px 6px; border-radius: 4px; display: inline-block;">
            PONTO DE APOIO OFICIAL
          </div>
        </div>
      `);
    });

    // 2. Plotar Alertas Ativos de Santinhos (🚨 Pedidos com Urgência)
    const alertasPendentes = alertasSuprimentos.filter((a) => a.status === 'PENDENTE' || a.status === 'A_CAMINHO');
    alertasPendentes.forEach((alerta) => {
      const isACaminho = alerta.status === 'A_CAMINHO';
      const alertColor = isACaminho ? '#f59e0b' : '#ef4444';

      const alertIcon = L.divIcon({
        className: 'santos-supply-alert-marker',
        html: `
          <div style="position: relative; cursor: pointer;">
            <div style="
              position: absolute;
              top: -8px;
              left: -8px;
              width: 44px;
              height: 44px;
              border-radius: 50%;
              background: ${alertColor}33;
              border: 2px solid ${alertColor};
              animation: ping 1.2s cubic-bezier(0, 0, 0.2, 1) infinite;
            "></div>
            <div style="
              position: relative;
              width: 28px;
              height: 28px;
              border-radius: 50%;
              background: ${alertColor};
              border: 2px solid #ffffff;
              box-shadow: 0 0 16px ${alertColor};
              display: flex;
              align-items: center;
              justify-content: center;
              color: #ffffff;
              font-size: 13px;
              font-weight: 900;
            ">
              ${isACaminho ? '🚚' : '🚨'}
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([alerta.lat, alerta.lng], { icon: alertIcon }).addTo(markersGroup);
      
      const popupHtml = `
        <div style="font-family: sans-serif; padding: 6px; min-width: 210px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            <span style="font-size: 14px;">${isACaminho ? '🚚' : '🚨'}</span>
            <span style="font-weight: 900; font-size: 13px; color: ${alertColor};">
              ${isACaminho ? 'VAN A CAMINHO' : 'PEDIDO DE SANTINHOS'}
            </span>
          </div>
          <div style="font-size: 12px; font-weight: 700; color: #0f172a;">${alerta.solicitante}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Bairro: <strong>${alerta.bairro}</strong></div>
          <div style="font-size: 11px; color: #475569; margin-top: 2px;">Item: ${alerta.item}</div>
          <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">
            Solicitado: ${new Date(alerta.createdAt).toLocaleTimeString('pt-BR')}
          </div>
          ${
            !isACaminho && onDespacharVan
              ? `
            <button
              id="btn-despachar-${alerta.id}"
              style="
                margin-top: 8px;
                width: 100%;
                background: #ef4444;
                color: #ffffff;
                border: none;
                border-radius: 6px;
                padding: 6px 10px;
                font-size: 11px;
                font-weight: 800;
                cursor: pointer;
              "
            >
              🚚 Despachar Van de Apoio
            </button>
          `
              : ''
          }
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-despachar-${alerta.id}`);
        if (btn && onDespacharVan) {
          btn.onclick = () => {
            onDespacharVan(alerta.id);
            marker.closePopup();
          };
        }
      });
    });

    // 3. Plotar Colaboradores de Campo
    contratados.forEach((c) => {
      // Coordenadas válidas ou fallback estimado por região
      let lat = c.latitude;
      let lng = c.longitude;

      if (!lat || !lng || lat === 0 || lng === 0) {
        if (c.regiao === 'CENTRO') {
          lat = -23.9350;
          lng = -46.3280;
        } else if (c.regiao === 'ZONA_NOROESTE') {
          lat = -23.9360;
          lng = -46.3710;
        } else if (c.regiao === 'MORROS') {
          lat = -23.9480;
          lng = -46.3450;
        } else {
          lat = -23.9680;
          lng = -46.3350;
        }
      }

      const isSelected = selectedContratado?.id === c.id;
      const colorPin =
        c.statusCinetico === 'EM_MOVIMENTO'
          ? '#10b981'
          : c.statusCinetico === 'PARADO_BASE'
          ? '#3b82f6'
          : c.statusCinetico === 'DESLOCAMENTO_VEICULO'
          ? '#a855f7'
          : '#ef4444';

      const iconLabel =
        c.statusCinetico === 'EM_MOVIMENTO'
          ? '🚶'
          : c.statusCinetico === 'PARADO_BASE'
          ? '📍'
          : c.statusCinetico === 'DESLOCAMENTO_VEICULO'
          ? '⚡'
          : '⚠️';

      const customIcon = L.divIcon({
        className: 'santos-colaborador-marker',
        html: `
          <div style="
            position: relative;
            cursor: pointer;
            display: flex;
            flex-direction: column;
            align-items: center;
          ">
            <div style="
              width: ${isSelected ? '32px' : '26px'};
              height: ${isSelected ? '32px' : '26px'};
              border-radius: 50%;
              background: ${colorPin};
              border: 3px solid #ffffff;
              box-shadow: 0 0 ${isSelected ? '18px' : '10px'} ${colorPin};
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: ${isSelected ? '14px' : '12px'};
              transition: all 0.2s ease;
            ">
              ${iconLabel}
            </div>
            <div style="
              background: rgba(15, 23, 42, 0.88);
              color: #ffffff;
              font-size: 10px;
              font-weight: 800;
              padding: 2px 6px;
              border-radius: 6px;
              border: 1px solid rgba(255, 255, 255, 0.15);
              white-space: nowrap;
              margin-top: 3px;
              box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
            ">
              ${c.nome.split(' ')[0]} • ${c.velocidadeKmh.toFixed(1)} km/h
            </div>
          </div>
        `,
        iconSize: [60, 48],
        iconAnchor: [30, 20],
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(markersGroup);

      marker.on('click', () => {
        if (onSelectContratado) {
          onSelectContratado(c);
        }
      });

      // Tooltip informativo
      marker.bindTooltip(
        `<b>${c.nome}</b><br/>${c.bairro} • ${c.statusCinetico.replace('_', ' ')}<br/>${c.passosHoje.toLocaleString('pt-BR')} passos • ${c.cadastrosHoje} eleitores`,
        { direction: 'top', offset: [0, -20] }
      );
    });

    // 4. Se houver colaborador selecionado com histórico, traçar rota (Polyline)
    if (breadcrumbLayerRef.current) {
      breadcrumbLayerRef.current.remove();
      breadcrumbLayerRef.current = null;
    }

    if (selectedContratado && selectedContratado.breadcrumbs && selectedContratado.breadcrumbs.length > 1) {
      const latLngs = selectedContratado.breadcrumbs.map((b) => [b.lat, b.lng] as [number, number]);
      const polyline = L.polyline(latLngs, {
        color: '#10b981',
        weight: 4,
        opacity: 0.85,
        dashArray: '6, 8',
      }).addTo(map);
      breadcrumbLayerRef.current = polyline;

      // Foca no colaborador
      const lastPoint = latLngs[latLngs.length - 1];
      if (lastPoint) {
        map.panTo(lastPoint);
      }
    }
  }, [contratados, alertasSuprimentos, selectedContratado]);

  // Função para recentralizar em Santos
  const handleRecenterSantos = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([-23.9618, -46.3322], 13, { animate: true });
    }
  };

  const totalEmCampo = contratados.length;
  const alertasPendentesCount = alertasSuprimentos.filter((a) => a.status === 'PENDENTE').length;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height,
        borderRadius: '14px',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
      }}
    >
      {/* Contêiner do Mapa do Leaflet */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', background: '#0a0f1d' }} />

      {/* Barra Flutuante de Informações e Controle Tático Superior */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          zIndex: 1000,
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        {/* Indicador de Status Santos */}
        <div
          style={{
            background: 'rgba(10, 15, 29, 0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '8px',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            fontWeight: 800,
            color: '#f8fafc',
          }}
        >
          <Compass size={14} color="#10b981" />
          <span>SANTOS / SP • RADAR CINÉTICO</span>
          <span
            style={{
              background: '#10b98122',
              color: '#10b981',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '10px',
            }}
          >
            {totalEmCampo} em campo
          </span>
        </div>

        {/* Badge de Alertas de Santinho */}
        {alertasPendentesCount > 0 && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.9)',
              backdropFilter: 'blur(8px)',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontWeight: 800,
              color: '#ffffff',
              animation: 'pulse 1.4s infinite',
            }}
          >
            <Package size={14} />
            <span>🚨 {alertasPendentesCount} PEDIDO DE SANTINHOS ATIVO!</span>
          </div>
        )}
      </div>

      {/* Botões de Ação Inferiores do Mapa */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          right: '12px',
          zIndex: 1000,
          display: 'flex',
          gap: '6px',
        }}
      >
        {/* Botão de Troca de Estilo */}
        <button
          onClick={() => {
            const next = mapStyle === 'DARK' ? 'VOYAGER' : mapStyle === 'VOYAGER' ? 'OSM' : 'DARK';
            setMapStyle(next);
          }}
          style={{
            background: 'rgba(10, 15, 29, 0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#f8fafc',
            borderRadius: '8px',
            padding: '6px 10px',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}
          title="Alternar estilo do mapa (Dark, Ruas Claras, OpenStreetMap)"
        >
          <Layers size={13} color="#60a5fa" />
          {mapStyle === 'DARK' ? 'Modo Tático Dark' : mapStyle === 'VOYAGER' ? 'Ruas Claras' : 'OSM'}
        </button>

        {/* Botão de Recentralizar em Santos */}
        <button
          onClick={handleRecenterSantos}
          style={{
            background: 'rgba(10, 15, 29, 0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#10b981',
            borderRadius: '8px',
            padding: '6px 10px',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}
          title="Centralizar mapa em Santos"
        >
          <Navigation size={13} />
          Centralizar Santos
        </button>
      </div>

      {/* Legenda de Ícones Inferior Esquerda */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          zIndex: 1000,
          background: 'rgba(10, 15, 29, 0.82)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          padding: '6px 10px',
          display: 'flex',
          gap: '10px',
          fontSize: '10px',
          fontWeight: 700,
          color: '#cbd5e1',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span> Em Movimento
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }}></span> Em Pausa
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></span> Alerta/Parado
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          📍 Pontos de Referência
        </span>
      </div>
    </div>
  );
};
