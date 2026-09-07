import React, { useState, useEffect } from 'react';
import {
  Users,
  Activity,
  MapPin,
  Clock,
  Battery,
  AlertTriangle,
  CheckCircle,
  Navigation,
  RefreshCw,
  Search,
  Filter,
  Phone,
  ShieldCheck,
  FileText,
  ExternalLink,
  ChevronRight,
  Compass,
  Footprints,
  Eye,
  Radio,
  Zap
} from 'lucide-react';
import { api } from '../api.ts';

interface ContratadoTelemetria {
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

export const StreetTelemetryCockpit: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [filtroRegiao, setFiltroRegiao] = useState<string>('TODOS');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedContratado, setSelectedContratado] = useState<ContratadoTelemetria | null>(null);

  // ─── DADOS INICIAIS REALISTAS DE TELEMETRIA DA EQUIPE DE RUA EM SANTOS ───────
  const [contratados, setContratados] = useState<ContratadoTelemetria[]>([
    {
      id: 'rua_01',
      nome: 'Carlos Eduardo Mendes',
      cpf: '342.***.***-18',
      telefone: '(13) 99741-2290',
      bairro: 'Gonzaga',
      regiao: 'ORLA',
      funcao: 'Mobilizador de Calçada',
      statusCinetico: 'EM_MOVIMENTO',
      velocidadeKmh: 4.1,
      tempoParadoMinutos: 0,
      passosHoje: 5820,
      kmRodados: 4.6,
      cadastrosHoje: 22,
      bateriaPct: 78,
      latitude: -23.9658,
      longitude: -46.3335,
      ultimaAtualizacao: 'Agora mesmo',
      breadcrumbs: [
        { lat: -23.9680, lng: -46.3310, hora: '10:00' },
        { lat: -23.9665, lng: -46.3325, hora: '10:45' },
        { lat: -23.9658, lng: -46.3335, hora: '11:30' }
      ]
    },
    {
      id: 'rua_02',
      nome: 'Mariana Silveira Ramos',
      cpf: '419.***.***-02',
      telefone: '(13) 98832-1140',
      bairro: 'Praça Mauá (Centro)',
      regiao: 'CENTRO',
      funcao: 'Coordenadora de Tenda Fixa',
      statusCinetico: 'PARADO_BASE',
      velocidadeKmh: 0.2,
      tempoParadoMinutos: 45,
      passosHoje: 1420,
      kmRodados: 1.1,
      cadastrosHoje: 38,
      bateriaPct: 91,
      latitude: -23.9332,
      longitude: -46.3284,
      ultimaAtualizacao: '1 min atrás',
      breadcrumbs: [
        { lat: -23.9332, lng: -46.3284, hora: '08:30' },
        { lat: -23.9332, lng: -46.3284, hora: '11:30' }
      ]
    },
    {
      id: 'rua_03',
      nome: 'Roberto Antunes Costa',
      cpf: '280.***.***-67',
      telefone: '(13) 99120-8877',
      bairro: 'Rádio Clube (Zona Noroeste)',
      regiao: 'ZONA_NOROESTE',
      funcao: 'Panfletagem Volante',
      statusCinetico: 'PARADO_ALERTA',
      velocidadeKmh: 0.0,
      tempoParadoMinutos: 28, // Parado há mais de 20 min sem base
      passosHoje: 890,
      kmRodados: 0.7,
      cadastrosHoje: 4,
      bateriaPct: 42,
      latitude: -23.9421,
      longitude: -46.3712,
      ultimaAtualizacao: '2 min atrás',
      breadcrumbs: [
        { lat: -23.9410, lng: -46.3700, hora: '09:15' },
        { lat: -23.9421, lng: -46.3712, hora: '11:00' }
      ]
    },
    {
      id: 'rua_04',
      nome: 'Fernanda Lima Nogueira',
      cpf: '388.***.***-91',
      telefone: '(13) 99650-4411',
      bairro: 'Ponta da Praia',
      regiao: 'ORLA',
      funcao: 'Apoio Saída da Balsa',
      statusCinetico: 'EM_MOVIMENTO',
      velocidadeKmh: 3.6,
      tempoParadoMinutos: 0,
      passosHoje: 7100,
      kmRodados: 5.4,
      cadastrosHoje: 31,
      bateriaPct: 69,
      latitude: -23.9872,
      longitude: -46.3015,
      ultimaAtualizacao: 'Agora mesmo',
      breadcrumbs: [
        { lat: -23.9850, lng: -46.3050, hora: '09:00' },
        { lat: -23.9872, lng: -46.3015, hora: '11:30' }
      ]
    },
    {
      id: 'rua_05',
      nome: 'Thiago Barreto Junior',
      cpf: '512.***.***-55',
      telefone: '(13) 99188-3322',
      bairro: 'Monte Serrat',
      regiao: 'MORROS',
      funcao: 'Líder de Área Monte Serrat',
      statusCinetico: 'EM_MOVIMENTO',
      velocidadeKmh: 2.8, // Caminhada em subida de morro
      tempoParadoMinutos: 0,
      passosHoje: 8300,
      kmRodados: 4.2,
      cadastrosHoje: 19,
      bateriaPct: 81,
      latitude: -23.9380,
      longitude: -46.3350,
      ultimaAtualizacao: 'Agora mesmo',
      breadcrumbs: [
        { lat: -23.9360, lng: -46.3330, hora: '08:45' },
        { lat: -23.9380, lng: -46.3350, hora: '11:30' }
      ]
    },
    {
      id: 'rua_06',
      nome: 'Van Suprimentos 01 (Santos)',
      cpf: 'Logística Campanha',
      telefone: '(13) 99901-5500',
      bairro: 'Av. Ana Costa',
      regiao: 'ORLA',
      funcao: 'Van Logística de Reabastecimento',
      statusCinetico: 'DESLOCAMENTO_VEICULO',
      velocidadeKmh: 32.5,
      tempoParadoMinutos: 0,
      passosHoje: 0,
      kmRodados: 24.8,
      cadastrosHoje: 0,
      bateriaPct: 99,
      latitude: -23.9520,
      longitude: -46.3310,
      ultimaAtualizacao: 'Agora mesmo',
      breadcrumbs: []
    }
  ]);

  // Carregar dados de telemetria reais do backend Fastify se disponível
  useEffect(() => {
    loadTelemetry();
    const interval = setInterval(loadTelemetry, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadTelemetry = async () => {
    try {
      const res = await fetch('/api/equipe-rua/telemetria/ao-vivo');
      if (res.ok) {
        const data = await res.json();
        if (data && data.contratados && data.contratados.length > 0) {
          setContratados(data.contratados);
        }
      }
    } catch (_) {}
  };

  // ─── CÁLCULO DE MÉTRICAS AO VIVO ───────────────────────────────────────────
  const totalEmCampo = contratados.length;
  const emMovimento = contratados.filter((c) => c.statusCinetico === 'EM_MOVIMENTO').length;
  const emTendaBase = contratados.filter((c) => c.statusCinetico === 'PARADO_BASE').length;
  const paradosAlerta = contratados.filter((c) => c.statusCinetico === 'PARADO_ALERTA').length;
  const kmTotais = contratados.reduce((acc, c) => acc + c.kmRodados, 0).toFixed(1);
  const cadastrosTotais = contratados.reduce((acc, c) => acc + c.cadastrosHoje, 0);

  // ─── FILTROS ───────────────────────────────────────────────────────────────
  const contratadosFiltrados = contratados.filter((c) => {
    const matchBusca =
      c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.bairro.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.telefone.includes(searchTerm);
    const matchRegiao = filtroRegiao === 'TODOS' || c.regiao === filtroRegiao;
    const matchStatus = filtroStatus === 'TODOS' || c.statusCinetico === filtroStatus;
    return matchBusca && matchRegiao && matchStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '10px 0' }}>
      {/* ─── HEADER EXECUTIVO DE TELEMETRIA ─────────────────────────────────── */}
      <div className="glass-panel" style={{ padding: '18px 24px', borderRadius: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '3px 10px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Radio size={12} className="animate-pulse" /> RADAR DE TELEMETRIA AO VIVO • SANTOS
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Lei nº 9.504/97 Art. 100 • Auditoria de Jornada & Anti-Fraude
              </span>
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
              Fiscalização Cinética & Rastreamento da Tropa de Rua
            </h1>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => {
                alert('Exportando Relatório Circunstanciado de Atividades (PDF assinado ICP-Brasil para o SPCE/TSE)...');
              }}
              style={{
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <FileText size={15} /> Exportar Relatório TSE
            </button>

            <button
              onClick={loadTelemetry}
              style={{
                background: 'var(--primary)',
                color: '#000',
                border: 'none',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <RefreshCw size={14} /> Atualizar Radar
            </button>
          </div>
        </div>

        {/* ─── 5 CARDS DE MÉTRICAS EM TEMPO REAL ────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            marginTop: '16px'
          }}
        >
          {/* Card 1: Total em Campo */}
          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              Cabos Ativos no Terreno
            </div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text)', marginTop: '4px' }}>
              {totalEmCampo} <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>pessoas</span>
            </div>
            <div style={{ fontSize: '11px', color: '#10b981', marginTop: '2px' }}>
              100% com GPS homologado
            </div>
          </div>

          {/* Card 2: Em Movimento */}
          <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Footprints size={14} /> Em Movimento (Panfletando)
            </div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#10b981', marginTop: '4px' }}>
              {emMovimento} <span style={{ fontSize: '12px', color: '#6ee7b7', fontWeight: 600 }}>andando</span>
            </div>
            <div style={{ fontSize: '11px', color: '#6ee7b7', marginTop: '2px' }}>
              Velocidade média: 3.8 km/h
            </div>
          </div>

          {/* Card 3: Em Tenda Base */}
          <div style={{ background: 'rgba(59, 130, 246, 0.08)', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            <div style={{ fontSize: '11px', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <MapPin size={14} /> Em Base / Tenda Oficial
            </div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#60a5fa', marginTop: '4px' }}>
              {emTendaBase} <span style={{ fontSize: '12px', color: '#93c5fd', fontWeight: 600 }}>fixos</span>
            </div>
            <div style={{ fontSize: '11px', color: '#93c5fd', marginTop: '2px' }}>
              Praça Mauá e Gonzaga
            </div>
          </div>

          {/* Card 4: Alerta de Ociosidade */}
          <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <AlertTriangle size={14} /> Alerta de Ociosidade
            </div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#ef4444', marginTop: '4px' }}>
              {paradosAlerta} <span style={{ fontSize: '12px', color: '#fca5a5', fontWeight: 600 }}>parado &gt;20 min</span>
            </div>
            <div style={{ fontSize: '11px', color: '#fca5a5', marginTop: '2px' }}>
              Requer acionamento da liderança
            </div>
          </div>

          {/* Card 5: Km Totais & Apoios */}
          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              Km Rodados & Votos Hoje
            </div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#ffe600', marginTop: '4px' }}>
              {kmTotais} <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>km</span>
            </div>
            <div style={{ fontSize: '11px', color: '#10b981', marginTop: '2px' }}>
              {cadastrosTotais} apoiadores capturados
            </div>
          </div>
        </div>
      </div>

      {/* ─── CORPO PRINCIPAL: RADAR TÁTICO & LISTA DE FISCALIZAÇÃO ──────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
        {/* COLUNA ESQUERDA: RADAR GRÁFICO TÁTICO DE SANTOS */}
        <div className="glass-panel" style={{ padding: '18px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Compass size={18} color="var(--primary)" />
              <span style={{ fontSize: '14px', fontWeight: 800 }}>
                RADAR CINÉTICO DE SANTOS (MAPA DINÂMICO)
              </span>
            </div>
            <div style={{ display: 'flex', gap: '6px', fontSize: '11px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981' }}>
                ● Em Movimento
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#60a5fa' }}>
                ● Tenda Oficial
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444' }}>
                ● Parado Alerta
              </span>
            </div>
          </div>

          {/* SIMULADOR GRÁFICO DO MAPA DE SANTOS COM COORDENADAS PROJETADAS */}
          <div
            style={{
              position: 'relative',
              height: '360px',
              backgroundColor: '#0a0f1d',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              overflow: 'hidden',
              backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 0)',
              backgroundSize: '24px 24px'
            }}
          >
            {/* Contornos Simbólicos das Zonas de Santos */}
            <div style={{ position: 'absolute', top: '15px', left: '20px', fontSize: '11px', color: '#64748b', fontWeight: 700 }}>
              ZONA NOROESTE (Rádio Clube / Castelo)
            </div>
            <div style={{ position: 'absolute', top: '15px', right: '20px', fontSize: '11px', color: '#64748b', fontWeight: 700 }}>
              CENTRO HISTÓRICO & PORTO
            </div>
            <div style={{ position: 'absolute', bottom: '15px', right: '20px', fontSize: '11px', color: '#64748b', fontWeight: 700 }}>
              ORLA (Gonzaga, Boqueirão, Ponta da Praia)
            </div>
            <div style={{ position: 'absolute', top: '45%', left: '35%', fontSize: '11px', color: '#475569', fontWeight: 700 }}>
              MONTE SERRAT & MORROS
            </div>

            {/* PINOS INTERATIVOS DOS CONTRATADOS */}
            {contratados.map((c) => {
              // Projeção fictícia de coordenadas de Santos no plano 2D
              let top = '50%';
              let left = '50%';
              if (c.regiao === 'CENTRO') { top = '22%'; left = '72%'; }
              if (c.regiao === 'ZONA_NOROESTE') { top = '28%'; left = '20%'; }
              if (c.regiao === 'MORROS') { top = '48%'; left = '45%'; }
              if (c.regiao === 'ORLA') {
                if (c.bairro === 'Gonzaga') { top = '78%'; left = '52%'; }
                else if (c.bairro === 'Ponta da Praia') { top = '82%'; left = '82%'; }
                else { top = '68%'; left = '60%'; }
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

              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedContratado(c)}
                  style={{
                    position: 'absolute',
                    top,
                    left,
                    transform: 'translate(-50%, -50%)',
                    cursor: 'pointer',
                    zIndex: isSelected ? 20 : 10,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                  }}
                >
                  <div
                    style={{
                      width: isSelected ? '26px' : '20px',
                      height: isSelected ? '26px' : '20px',
                      borderRadius: '50%',
                      backgroundColor: colorPin,
                      border: '3px solid #ffffff',
                      boxShadow: `0 0 ${isSelected ? '16px' : '10px'} ${colorPin}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      animation: c.statusCinetico === 'EM_MOVIMENTO' ? 'pulse 1.4s infinite' : 'none'
                    }}
                  >
                    {c.statusCinetico === 'EM_MOVIMENTO' && (
                      <Footprints size={11} color="#000" />
                    )}
                    {c.statusCinetico === 'PARADO_BASE' && (
                      <MapPin size={11} color="#fff" />
                    )}
                    {c.statusCinetico === 'PARADO_ALERTA' && (
                      <AlertTriangle size={11} color="#fff" />
                    )}
                    {c.statusCinetico === 'DESLOCAMENTO_VEICULO' && (
                      <Zap size={11} color="#fff" />
                    )}
                  </div>

                  <div
                    style={{
                      background: 'rgba(0, 0, 0, 0.85)',
                      color: '#ffffff',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 800,
                      marginTop: '4px',
                      whiteSpace: 'nowrap',
                      border: isSelected ? `1px solid ${colorPin}` : '1px solid #333'
                    }}
                  >
                    {c.nome.split(' ')[0]} ({c.velocidadeKmh} km/h)
                  </div>
                </div>
              );
            })}
          </div>

          {/* DETALHES DO COLABORADOR SELECIONADO NO RADAR */}
          {selectedContratado ? (
            <div
              style={{
                marginTop: '14px',
                padding: '14px',
                borderRadius: '12px',
                background: 'rgba(30, 41, 59, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.12)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 800 }}>{selectedContratado.nome}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {selectedContratado.funcao} • {selectedContratado.bairro} ({selectedContratado.regiao})
                  </div>
                </div>

                <a
                  href={`https://wa.me/55${selectedContratado.telefone.replace(/\D/g, '')}?text=Olá%20${encodeURIComponent(selectedContratado.nome.split(' ')[0])},%20aqui%20é%20da%20coordenação%20de%20rua.`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    background: '#10b981',
                    color: '#000',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '11px',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <Phone size={13} /> Notificar no WhatsApp
                </a>
              </div>

              {/* Status Cinético Específico */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '8px',
                  marginTop: '12px',
                  padding: '10px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>VELOCIDADE</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--primary)' }}>
                    {selectedContratado.velocidadeKmh} km/h
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>TEMPO PARADO</div>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 800,
                      color: selectedContratado.tempoParadoMinutos > 15 ? '#ef4444' : '#60a5fa'
                    }}
                  >
                    {selectedContratado.tempoParadoMinutos} min
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>PASSOS / KM</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#ffe600' }}>
                    {selectedContratado.kmRodados} km
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>BATERIA</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#10b981' }}>
                    {selectedContratado.bateriaPct}%
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '12px', color: '#94a3b8' }}>
              💡 Clique em qualquer pino no mapa acima para inspecionar a velocidade e o rastro do colaborador.
            </div>
          )}
        </div>

        {/* COLUNA DIREITA: LISTAGEM DA TROPA & FILTROS */}
        <div className="glass-panel" style={{ padding: '18px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '14px', fontWeight: 800 }}>
              LISTA DA TROPA EM CAMPO ({contratadosFiltrados.length})
            </div>
          </div>

          {/* Barra de Busca & Filtros */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                placeholder="Buscar por nome, bairro ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px 8px 32px',
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '12px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            </div>

            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              style={{
                background: 'rgba(15, 23, 42, 0.7)',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                fontSize: '11px',
                padding: '0 8px'
              }}
            >
              <option value="TODOS">Todos os Status</option>
              <option value="EM_MOVIMENTO">🟢 Em Movimento</option>
              <option value="PARADO_BASE">🔵 Em Tenda Base</option>
              <option value="PARADO_ALERTA">🔴 Parado Alerta (&gt;20m)</option>
            </select>
          </div>

          {/* LISTA ROLÁVEL DE COLABORADORES */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '420px', overflowY: 'auto' }}>
            {contratadosFiltrados.map((c) => {
              const isSelected = selectedContratado?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedContratado(c)}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    background: isSelected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(30, 41, 59, 0.4)',
                    border: isSelected ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 800 }}>{c.nome}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {c.bairro} • {c.telefone}
                      </div>
                    </div>

                    {/* Tag de Status Cinético */}
                    <div>
                      {c.statusCinetico === 'EM_MOVIMENTO' && (
                        <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '3px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 800 }}>
                          🟢 ANDANDO ({c.velocidadeKmh} km/h)
                        </span>
                      )}
                      {c.statusCinetico === 'PARADO_BASE' && (
                        <span style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '3px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 800 }}>
                          🔵 NA TENDA
                        </span>
                      )}
                      {c.statusCinetico === 'PARADO_ALERTA' && (
                        <span style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '3px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 800 }}>
                          🔴 PARADO ({c.tempoParadoMinutos} min)
                        </span>
                      )}
                      {c.statusCinetico === 'DESLOCAMENTO_VEICULO' && (
                        <span style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', padding: '3px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 800 }}>
                          🟣 EM VEÍCULO ({c.velocidadeKmh} km/h)
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '11px', color: '#94a3b8' }}>
                    <span>📍 {c.passosHoje} passos ({c.kmRodados} km)</span>
                    <span style={{ color: '#ffe600', fontWeight: 700 }}>🏆 {c.cadastrosHoje} apoios hoje</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
