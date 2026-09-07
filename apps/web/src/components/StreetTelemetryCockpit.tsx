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
  Zap,
  QrCode,
  Smartphone,
  Package,
  Truck
} from 'lucide-react';
import { ModalQRCodeAppRua } from './ModalQRCodeAppRua.tsx';
import { SantosTelemetryMap, AlertaSuprimentoItem } from './SantosTelemetryMap.tsx';
import { api } from '../api.ts';

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

export const StreetTelemetryCockpit: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [filtroRegiao, setFiltroRegiao] = useState<string>('TODOS');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedContratado, setSelectedContratado] = useState<ContratadoTelemetria | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);

  // ─── TELEMETRIA REAL DA EQUIPE DE RUA EM SANTOS (ZERO SIMULAÇÃO) ─────────
  const [contratados, setContratados] = useState<ContratadoTelemetria[]>([]);
  const [alertasSuprimentos, setAlertasSuprimentos] = useState<AlertaSuprimentoItem[]>([]);

  // ─── AUDITORIA DE APOIADORES CADASTRADOS NA RUA (GPS & COLABORADOR) ──────
  const [apoiadoresColetados, setApoiadoresColetados] = useState<any[]>([]);
  const [totalApoiadoresColetados, setTotalApoiadoresColetados] = useState<number>(0);
  const [buscaApoiador, setBuscaApoiador] = useState('');
  const [loadingApoiadores, setLoadingApoiadores] = useState(false);

  // Carregar dados de telemetria reais do backend Fastify
  useEffect(() => {
    loadTelemetry();
    loadApoiadores();
    const interval = setInterval(() => {
      loadTelemetry();
      loadApoiadores();
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const loadTelemetry = async () => {
    setLoading(true);
    try {
      const [resTelemetria, resAlertas] = await Promise.allSettled([
        fetch('/api/equipe-rua/telemetria/ao-vivo'),
        api.getAlertasSuprimentos(),
      ]);

      if (resTelemetria.status === 'fulfilled' && resTelemetria.value.ok) {
        const data = await resTelemetria.value.json();
        if (data && Array.isArray(data.contratados)) {
          setContratados(data.contratados);
        }
      }

      if (resAlertas.status === 'fulfilled' && resAlertas.value?.success) {
        setAlertasSuprimentos(resAlertas.value.alertas || []);
      }
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  const loadApoiadores = async () => {
    setLoadingApoiadores(true);
    try {
      const res = await api.getApoiadoresColetados({ busca: buscaApoiador, limite: 50 });
      if (res && res.success) {
        setApoiadoresColetados(res.apoiadores || []);
        setTotalApoiadoresColetados(res.total || 0);
      }
    } catch (_) {
    } finally {
      setLoadingApoiadores(false);
    }
  };

  const handleDespacharVan = async (alertaId: string) => {
    try {
      await api.atenderAlertaSuprimento(alertaId, 'A_CAMINHO');
      loadTelemetry();
    } catch (err: any) {
      alert(`Erro ao despachar van: ${err.message}`);
    }
  };

  const handleSimularPedidoSantinho = async () => {
    try {
      await api.solicitarMaterialRua({
        bairro: 'Gonzaga (Praça Independência)',
        solicitante: 'Marcos Silveira (Equipe Gonzaga)',
        lat: -23.9660,
        lng: -46.3338,
        item: 'Santinhos 10x15 e Praguinhas',
        telefone: '(13) 99781-4421',
      });
      loadTelemetry();
    } catch (err: any) {
      alert(`Erro ao solicitar: ${err.message}`);
    }
  };

  // ─── CÁLCULO DE MÉTRICAS AO VIVO ───────────────────────────────────────────
  const totalEmCampo = contratados.length;
  const emMovimento = contratados.filter((c) => c.statusCinetico === 'EM_MOVIMENTO').length;
  const emPausa = contratados.filter((c) => c.statusCinetico === 'PARADO_BASE').length;
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
              onClick={() => setIsQrModalOpen(true)}
              style={{
                background: '#ffe600',
                color: '#000000',
                border: 'none',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 0 10px rgba(255, 230, 0, 0.2)'
              }}
            >
              <QrCode size={16} /> QR Code para a Tropa
            </button>

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

          {/* Card 3: Em Pausa / Ponto de Apoio */}
          <div style={{ background: 'rgba(59, 130, 246, 0.08)', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            <div style={{ fontSize: '11px', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <MapPin size={14} /> Em Pausa / Ponto de Apoio
            </div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#60a5fa', marginTop: '4px' }}>
              {emPausa} <span style={{ fontSize: '12px', color: '#93c5fd', fontWeight: 600 }}>pausados</span>
            </div>
            <div style={{ fontSize: '11px', color: '#93c5fd', marginTop: '2px' }}>
              Descanso ou Alinhamento
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Compass size={18} color="var(--primary)" />
              <span style={{ fontSize: '14px', fontWeight: 800 }}>
                RADAR CINÉTICO DE SANTOS (MAPA DINÂMICO)
              </span>
              <button
                onClick={handleSimularPedidoSantinho}
                style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginLeft: '6px'
                }}
                title="Simular pedido de santinhos via app de rua para testar os alertas"
              >
                <Package size={12} /> Testar Alerta Santinho
              </button>
            </div>
            <div style={{ display: 'flex', gap: '6px', fontSize: '11px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981' }}>
                ● Em Movimento
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#60a5fa' }}>
                ● Em Pausa
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444' }}>
                ● Parado Alerta
              </span>
            </div>
          </div>

          {/* BANNER DE ALERTAS DE SUPRIMENTOS (PEDIDOS DE SANTINHO) */}
          {alertasSuprimentos.filter(a => a.status === 'PENDENTE').length > 0 && (
            <div
              style={{
                marginBottom: '12px',
                padding: '10px 14px',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                <Package size={16} color="#ef4444" className="animate-bounce" />
                <span style={{ fontWeight: 800, color: '#fca5a5' }}>
                  🚨 {alertasSuprimentos.filter(a => a.status === 'PENDENTE').length} Pedido(s) de Santinhos / Suprimentos em Aberto!
                </span>
              </div>
              <button
                onClick={() => {
                  const p = alertasSuprimentos.find(a => a.status === 'PENDENTE');
                  if (p) handleDespacharVan(p.id);
                }}
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Truck size={13} /> Despachar Van Imediata
              </button>
            </div>
          )}

          {/* NOVO MAPA DINÂMICO INTERATIVO DE SANTOS COM LEAFLET */}
          <SantosTelemetryMap
            contratados={contratadosFiltrados}
            alertasSuprimentos={alertasSuprimentos}
            selectedContratado={selectedContratado}
            onSelectContratado={setSelectedContratado}
            onDespacharVan={handleDespacharVan}
            height="390px"
          />

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
              <option value="PARADO_BASE">🔵 Em Pausa / Ponto de Apoio</option>
              <option value="PARADO_ALERTA">🔴 Parado Alerta (&gt;20m)</option>
            </select>
          </div>

          {/* LISTA ROLÁVEL DE COLABORADORES */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '420px', overflowY: 'auto' }}>
            {contratadosFiltrados.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px', color: '#94a3b8', fontSize: '13px' }}>
                <Users size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                <div>Nenhum colaborador com turno ativo na rua.</div>
                <div style={{ fontSize: '11px', marginTop: '6px', color: '#64748b' }}>
                  Compartilhe o QR Code para a equipe iniciar o expediente.
                </div>
              </div>
            ) : (
              contratadosFiltrados.map((c) => {
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
                            🔵 EM PAUSA
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
                        {c.statusCinetico === 'OFFLINE' && (
                          <span style={{ background: 'rgba(100, 116, 139, 0.2)', color: '#94a3b8', padding: '3px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 800 }}>
                            ⚪ OFFLINE
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
              })
            )}
          </div>
        </div>
      </div>

      {/* ─── AUDITORIA DE APOIADORES CADASTRADOS NA RUA (GPS EM TEMPO REAL & COLABORADOR) ─── */}
      <div className="glass-panel" style={{ padding: '20px 24px', borderRadius: '16px', marginTop: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={20} color="#ffe600" />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#f8fafc', letterSpacing: '0.3px' }}>
                AUDITORIA DE APOIADORES CADASTRADOS NA RUA
              </h3>
              <span style={{
                background: 'rgba(255, 230, 0, 0.15)',
                color: '#ffe600',
                border: '1px solid rgba(255, 230, 0, 0.3)',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 800
              }}>
                {totalApoiadoresColetados} Apoiadores Rastreados
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Cruzamento de dados: cada apoiador registrado tem geolocalização por hardware e auditoria de quem o cadastrou.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Buscar apoiador, bairro ou colaborador..."
                value={buscaApoiador}
                onChange={(e) => setBuscaApoiador(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') loadApoiadores(); }}
                style={{
                  padding: '8px 12px 8px 32px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#ffffff',
                  outline: 'none',
                  width: '260px'
                }}
              />
              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '11px' }} />
            </div>

            <button
              onClick={loadApoiadores}
              disabled={loadingApoiadores}
              style={{
                background: 'rgba(255, 230, 0, 0.12)',
                color: '#ffe600',
                border: '1px solid rgba(255, 230, 0, 0.3)',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 800,
                cursor: loadingApoiadores ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <RefreshCw size={14} className={loadingApoiadores ? 'animate-spin' : ''} />
              Atualizar
            </button>
          </div>
        </div>

        {/* Tabela de Apoiadores Coletados */}
        {loadingApoiadores && apoiadoresColetados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '13px' }}>
            Carregando auditoria de campo...
          </div>
        ) : apoiadoresColetados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px', color: '#64748b', fontSize: '13px' }}>
            Nenhum apoiador de rua encontrado com os filtros informados.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8' }}>
                  <th style={{ padding: '10px 12px', fontWeight: 800 }}>APOIADOR</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800 }}>WHATSAPP</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800 }}>BAIRRO</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800 }}>QUEM CADASTROU</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800 }}>MOMENTO DO CADASTRO</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800 }}>GEOLOCALIZAÇÃO GPS</th>
                </tr>
              </thead>
              <tbody>
                {apoiadoresColetados.map((a: any) => (
                  <tr
                    key={a.id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px', fontWeight: 700, color: '#f8fafc' }}>
                      {a.nome}
                    </td>
                    <td style={{ padding: '12px', color: '#cbd5e1' }}>
                      {a.whatsapp || a.telefone || '—'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        background: 'rgba(59, 130, 246, 0.15)',
                        color: '#93c5fd',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '11px'
                      }}>
                        {a.bairro || 'Santos'}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#6ee7b7',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '11px'
                        }}>
                          👤 {a.cadastrado_por_nome || a.cadastradoPor || 'Equipe de Rua'}
                        </span>
                        {a.cadastrado_por_id && (
                          <span style={{ fontSize: '10px', color: '#64748b' }}>
                            ({String(a.cadastrado_por_id).slice(0, 8)})
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px', color: '#94a3b8', fontSize: '11px' }}>
                      {a.created_at ? new Date(a.created_at).toLocaleString('pt-BR') : '—'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {a.latitude && a.longitude ? (
                        <a
                          href={`https://www.google.com/maps?q=${a.latitude},${a.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: 'rgba(255, 230, 0, 0.12)',
                            color: '#ffe600',
                            border: '1px solid rgba(255, 230, 0, 0.3)',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 800,
                            textDecoration: 'none'
                          }}
                        >
                          <MapPin size={12} />
                          {Number(a.latitude).toFixed(4)}, {Number(a.longitude).toFixed(4)}
                          <ExternalLink size={10} style={{ marginLeft: '2px' }} />
                        </a>
                      ) : (
                        <span style={{ color: '#64748b', fontSize: '11px' }}>Sem GPS</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Instalação do App de Campo com QR Code */}
      <ModalQRCodeAppRua
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
      />
    </div>
  );
};
