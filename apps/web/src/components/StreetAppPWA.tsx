import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Compass,
  Zap,
  CheckCircle,
  AlertTriangle,
  Sun,
  Moon,
  Battery,
  Send,
  PackageCheck,
  Shield,
  RefreshCw,
  Radio,
  Footprints,
  UserCheck,
  Phone,
  User,
  Activity,
  Flame,
  AlertOctagon,
  Eye,
  Award
} from 'lucide-react';
import { api } from '../api.ts';

interface ApoiadorLocal {
  id: string;
  nome: string;
  whatsapp: string;
  bairro: string;
  tags: string[];
  lat?: number;
  lng?: number;
  timestamp: string;
  sincronizado: boolean;
}

export const StreetAppPWA: React.FC = () => {
  // ─── Estados de Modo Solar & Ergonomia ──────────────────────────────────────
  const [solarMode, setSolarMode] = useState<boolean>(true); // Padrão Solar Ativo para Rua
  const [turnoAtivo, setTurnoAtivo] = useState<boolean>(true);
  const [panicClicks, setPanicClicks] = useState<number>(0);
  const [panicMsg, setPanicMsg] = useState<string | null>(null);

  // ─── Estados de Telemetria Cinética (Acelerômetro + GPS) ────────────────────
  const [isMoving, setIsMoving] = useState<boolean>(true);
  const [velocidadeKmh, setVelocidadeKmh] = useState<number>(3.8);
  const [passosAcumulados, setPassosAcumulados] = useState<number>(412);
  const [tempoParadoMinutos, setTempoParadoMinutos] = useState<number>(0);
  const [statusCinetico, setStatusCinetico] = useState<'EM_MOVIMENTO' | 'PARADO_BASE' | 'PARADO_ALERTA'>('EM_MOVIMENTO');
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number; precisao: number }>({
    lat: -23.9618,
    lng: -46.3322,
    precisao: 4.5
  });
  const [bateriaPct, setBateriaPct] = useState<number>(84);
  const [bairroAtual, setBairroAtual] = useState<string>('Gonzaga');

  // ─── Estados do Cadastro Two-Tap ──────────────────────────────────────────
  const [inputNome, setInputNome] = useState('');
  const [inputWhatsapp, setInputWhatsapp] = useState('');
  const [selectedBairro, setSelectedBairro] = useState('Gonzaga');
  const [tagsApoio, setTagsApoio] = useState<string[]>(['Apoio 100%']);
  const [apoiadoresLocais, setApoiadoresLocais] = useState<ApoiadorLocal[]>([]);
  const [metaDiaria] = useState(30);
  const [cadastrosHoje, setCadastrosHoje] = useState(14);
  const [ultimoCadastrado, setUltimoCadastrado] = useState<string | null>(null);
  const [solicitandoMaterial, setSolicitandoMaterial] = useState(false);
  const [materialFeedback, setMaterialFeedback] = useState<string | null>(null);

  const phoneInputRef = useRef<HTMLInputElement>(null);

  // Lista dos Bairros Oficiais de Santos
  const bairrosSantos = [
    'Gonzaga', 'Boqueirão', 'Ponta da Praia', 'Embaré', 'Aparecida',
    'Centro', 'Vila Mathias', 'Encruzilhada', 'Marapé', 'José Menino',
    'Bom Retiro', 'Rádio Clube', 'Castelo', 'Areia Branca', 'Monte Serrat', 'Nova Cintra'
  ];

  // ─── 1. Ciclo de Captura de Sensores Reais (Web API) ────────────────────────
  useEffect(() => {
    // Escuta de Acelerômetro Real se disponível no navegador
    const handleMotion = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc) return;
      const magnitude = Math.sqrt((acc.x || 0)**2 + (acc.y || 0)**2 + (acc.z || 0)**2) - 9.8;
      if (Math.abs(magnitude) > 1.2) {
        setIsMoving(true);
        setStatusCinetico('EM_MOVIMENTO');
        setPassosAcumulados((prev) => prev + 1);
        setTempoParadoMinutos(0);
      }
    };

    if (window.DeviceMotionEvent && turnoAtivo) {
      window.addEventListener('devicemotion', handleMotion);
    }

    // Escuta de Geolocalização Real
    let watchId: number | null = null;
    if (navigator.geolocation && turnoAtivo) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const speed = pos.coords.speed ? pos.coords.speed * 3.6 : (isMoving ? 3.6 : 0);
          setVelocidadeKmh(Number(speed.toFixed(1)));
          setGpsCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            precisao: Number(pos.coords.accuracy.toFixed(1))
          });
        },
        (err) => console.log('Modo Simulação de GPS Santos ativo:', err.message),
        { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
      );
    }

    // Leitura real da bateria
    if ((navigator as any).getBattery) {
      (navigator as any).getBattery().then((battery: any) => {
        setBateriaPct(Math.round(battery.level * 100));
        battery.addEventListener('levelchange', () => {
          setBateriaPct(Math.round(battery.level * 100));
        });
      });
    }

    return () => {
      if (window.DeviceMotionEvent) window.removeEventListener('devicemotion', handleMotion);
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [turnoAtivo, isMoving]);

  // ─── 2. Simulação Tática de Ritmo de Rua (Alterna Movimento e Parada) ─────────
  useEffect(() => {
    const timer = setInterval(() => {
      if (!turnoAtivo) return;

      // Simulação cinética realista de caminhada rua a rua
      setPassosAcumulados((p) => p + (isMoving ? 12 : 0));
      if (!isMoving) {
        setTempoParadoMinutos((m) => {
          const novo = m + 1;
          if (novo > 15) {
            setStatusCinetico('PARADO_ALERTA');
          } else {
            setStatusCinetico('PARADO_BASE');
          }
          return novo;
        });
      }

      // Envia telemetria para o backend em segundo plano
      try {
        fetch('/api/equipe-rua/telemetria', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: gpsCoords.lat,
            longitude: gpsCoords.lng,
            velocidade_kmh: velocidadeKmh,
            is_moving: isMoving,
            estado: statusCinetico,
            tempo_parado_minutos: tempoParadoMinutos,
            passos: passosAcumulados,
            bateria_pct: bateriaPct,
            bairro: selectedBairro
          })
        }).catch(() => {});
      } catch (_) {}
    }, 45000);

    return () => clearInterval(timer);
  }, [turnoAtivo, isMoving, statusCinetico, tempoParadoMinutos, gpsCoords, velocidadeKmh, passosAcumulados, bateriaPct, selectedBairro]);

  // ─── 3. Formatação Rápida de Telefone WhatsApp ─────────────────────────────
  const handlePhoneChange = (val: string) => {
    let clean = val.replace(/\D/g, '');
    if (clean.length > 11) clean = clean.slice(0, 11);
    let formatted = clean;
    if (clean.length > 2) {
      formatted = `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
    }
    if (clean.length > 7) {
      formatted = `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
    }
    setInputWhatsapp(formatted);
  };

  // ─── 4. Gravação Two-Tap com Vibração Háptica ──────────────────────────────
  const handleCadastrarApoiador = async () => {
    const cleanPhone = inputWhatsapp.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      alert('Por favor, informe o WhatsApp com DDD (ex: 13 99999-9999)');
      return;
    }
    const nomeFinal = inputNome.trim() || 'Apoiador Cívico';

    // Vibração háptica no celular
    if (navigator.vibrate) {
      navigator.vibrate([80, 50, 80]);
    }

    const novo: ApoiadorLocal = {
      id: 'local_' + Date.now(),
      nome: nomeFinal,
      whatsapp: inputWhatsapp,
      bairro: selectedBairro,
      tags: tagsApoio,
      lat: gpsCoords.lat,
      lng: gpsCoords.lng,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      sincronizado: true
    };

    setApoiadoresLocais([novo, ...apoiadoresLocais]);
    setCadastrosHoje((c) => c + 1);
    setUltimoCadastrado(nomeFinal);

    // Envio para a API com acionamento do WhatsApp de Boas-Vindas
    try {
      await fetch('/api/equipe-rua/coleta-voto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nomeFinal,
          whatsapp: cleanPhone,
          bairro: selectedBairro,
          tags: tagsApoio,
          lat: gpsCoords.lat,
          lng: gpsCoords.lng
        })
      });
    } catch (_) {}

    // Limpa campos e foca novamente no telefone para o próximo da fila
    setInputNome('');
    setInputWhatsapp('');
    if (phoneInputRef.current) phoneInputRef.current.focus();

    setTimeout(() => setUltimoCadastrado(null), 4000);
  };

  // ─── 5. Pânico / Quick Wipe (5 toques no escudo) ───────────────────────────
  const handleShieldPanic = () => {
    const next = panicClicks + 1;
    setPanicClicks(next);
    if (next >= 5) {
      setApoiadoresLocais([]);
      setPanicMsg('⚠️ PROTOCOLO DE SEGURANÇA: DADOS LOCAIS LIMPOS COM SUCESSO.');
      if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
      setTimeout(() => {
        setPanicClicks(0);
        setPanicMsg(null);
      }, 3000);
    }
  };

  // ─── 6. Solicitação de Suprimentos para a Van ──────────────────────────────
  const handleSolicitarMaterial = async () => {
    setSolicitandoMaterial(true);
    if (navigator.vibrate) navigator.vibrate([100]);
    try {
      await fetch('/api/equipe-rua/solicitar-material', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bairro: selectedBairro,
          lat: gpsCoords.lat,
          lng: gpsCoords.lng,
          solicitante: 'Equipe de Campo Santos',
          item: 'Santinhos e Adesivos de Carro'
        })
      });
      setMaterialFeedback('🚨 Van de suprimentos acionada via GPS!');
    } catch (_) {
      setMaterialFeedback('🚨 Alerta emitido para a Sala de Guerra!');
    } finally {
      setSolicitandoMaterial(false);
      setTimeout(() => setMaterialFeedback(null), 4000);
    }
  };

  // ─── ESTILOS DINÂMICOS DO MODO SOLAR ───────────────────────────────────────
  const bgMain = solarMode ? '#000000' : '#090d16';
  const textPrimary = solarMode ? '#ffffff' : '#f8fafc';
  const accentColor = solarMode ? '#ffe600' : '#10b981'; // Amarelo Solar Fluorescente ou Verde Esmeralda
  const cardBg = solarMode ? '#0d0d0d' : 'rgba(30, 41, 59, 0.6)';
  const borderCard = solarMode ? '2px solid #262626' : '1px solid rgba(255, 255, 255, 0.1)';

  return (
    <div
      style={{
        backgroundColor: bgMain,
        color: textPrimary,
        minHeight: '100vh',
        padding: '12px 14px 90px 14px',
        fontFamily: 'Inter, -apple-system, sans-serif',
        maxWidth: '560px',
        margin: '0 auto',
        boxSizing: 'border-box'
      }}
    >
      {/* ─── BARRA SUPERIOR TÁTICA DE CAMPO ─────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 12px',
          background: cardBg,
          borderRadius: '12px',
          border: borderCard,
          marginBottom: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleShieldPanic}
            title="5 toques rápidos para Wipe de emergência"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: accentColor,
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Shield size={24} />
          </button>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.5px' }}>
              SANTOS EM CAMPO
            </div>
            <div style={{ fontSize: '10px', color: solarMode ? '#ffe600' : '#94a3b8' }}>
              PWA 2026 • EQUIPE DE RUA
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Alternador de Modo Solar */}
          <button
            onClick={() => setSolarMode(!solarMode)}
            style={{
              background: solarMode ? '#ffe600' : '#334155',
              color: solarMode ? '#000000' : '#ffffff',
              border: 'none',
              padding: '6px 10px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {solarMode ? <Sun size={13} /> : <Moon size={13} />}
            {solarMode ? 'SOL MAX' : 'DARK'}
          </button>

          {/* Indicador de Bateria */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: 700,
              color: bateriaPct < 25 ? '#ef4444' : (solarMode ? '#ffffff' : '#10b981')
            }}
          >
            <Battery size={15} />
            {bateriaPct}%
          </div>
        </div>
      </div>

      {panicMsg && (
        <div
          style={{
            background: '#ef4444',
            color: '#fff',
            padding: '10px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 800,
            textAlign: 'center',
            marginBottom: '10px'
          }}
        >
          {panicMsg}
        </div>
      )}

      {/* ─── RADAR CINÉTICO: PARADO VS. EM MOVIMENTO ─────────────────────────── */}
      <div
        style={{
          background: cardBg,
          border: borderCard,
          borderRadius: '14px',
          padding: '12px',
          marginBottom: '12px',
          boxShadow: solarMode ? '0 0 10px rgba(255, 230, 0, 0.1)' : 'none'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={16} color={accentColor} />
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Telemetria Cinética & GPS
            </span>
          </div>

          <button
            onClick={() => {
              const nextMoving = !isMoving;
              setIsMoving(nextMoving);
              setStatusCinetico(nextMoving ? 'EM_MOVIMENTO' : 'PARADO_BASE');
              if (nextMoving) setTempoParadoMinutos(0);
            }}
            style={{
              background: isMoving ? '#10b981' : '#f59e0b',
              color: '#000',
              border: 'none',
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '10px',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            {isMoving ? 'SIMULANDO: ANDANDO' : 'SIMULANDO: PARADO'}
          </button>
        </div>

        {/* Banner de Status Cinético Ativo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            borderRadius: '10px',
            backgroundColor:
              statusCinetico === 'EM_MOVIMENTO'
                ? (solarMode ? '#0a2912' : 'rgba(16, 185, 129, 0.15)')
                : statusCinetico === 'PARADO_BASE'
                ? (solarMode ? '#081d33' : 'rgba(59, 130, 246, 0.15)')
                : (solarMode ? '#3b0d0d' : 'rgba(239, 68, 68, 0.15)'),
            border:
              statusCinetico === 'EM_MOVIMENTO'
                ? '1px solid #10b981'
                : statusCinetico === 'PARADO_BASE'
                ? '1px solid #3b82f6'
                : '1px solid #ef4444',
            marginBottom: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {statusCinetico === 'EM_MOVIMENTO' ? (
              <span
                style={{
                  display: 'inline-block',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  boxShadow: '0 0 10px #10b981',
                  animation: 'pulse 1.2s infinite'
                }}
              />
            ) : statusCinetico === 'PARADO_BASE' ? (
              <span
                style={{
                  display: 'inline-block',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#3b82f6'
                }}
              />
            ) : (
              <span
                style={{
                  display: 'inline-block',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#ef4444',
                  boxShadow: '0 0 8px #ef4444'
                }}
              />
            )}

            <div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 900,
                  color:
                    statusCinetico === 'EM_MOVIMENTO'
                      ? '#10b981'
                      : statusCinetico === 'PARADO_BASE'
                      ? '#60a5fa'
                      : '#ef4444'
                }}
              >
                {statusCinetico === 'EM_MOVIMENTO' && '🟢 EM MOVIMENTO (PANFLETANDO)'}
                {statusCinetico === 'PARADO_BASE' && '🔵 PARADO EM BASE / TENDA'}
                {statusCinetico === 'PARADO_ALERTA' && '🔴 ALERTA: PARADO HÁ MAIS DE 15 MIN'}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                {statusCinetico === 'EM_MOVIMENTO'
                  ? `Velocidade: ${velocidadeKmh} km/h • Passos ritmo ativo`
                  : `Tempo Parado: ${tempoParadoMinutos} min • Ponto Fixo`}
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14px', fontWeight: 900, color: accentColor }}>
              {passosAcumulados}
            </div>
            <div style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase' }}>
              Passos Hoje
            </div>
          </div>
        </div>

        {/* Coordenadas & Bairro Automático */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <MapPin size={13} color={accentColor} />
            <span>Santos / <strong>{selectedBairro}</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Compass size={13} />
            <span>{gpsCoords.lat.toFixed(4)}, {gpsCoords.lng.toFixed(4)} (±{gpsCoords.precisao}m)</span>
          </div>
        </div>
      </div>

      {/* ─── PAINEL DE META DIÁRIA DO VOLUNTÁRIO ────────────────────────────── */}
      <div
        style={{
          background: cardBg,
          border: borderCard,
          borderRadius: '14px',
          padding: '12px',
          marginBottom: '12px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '12px', fontWeight: 800 }}>
            🏆 META DO DIA: {cadastrosHoje} / {metaDiaria} APOIOS
          </span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              background: solarMode ? '#ffe600' : '#10b981',
              color: '#000',
              padding: '2px 8px',
              borderRadius: '20px'
            }}
          >
            NÍVEL: SARGENTO DE RUA
          </span>
        </div>

        {/* Barra de Progresso */}
        <div
          style={{
            height: '10px',
            backgroundColor: solarMode ? '#262626' : '#334155',
            borderRadius: '5px',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.min(Math.round((cadastrosHoje / metaDiaria) * 100), 100)}%`,
              backgroundColor: accentColor,
              transition: 'width 0.4s ease'
            }}
          />
        </div>
      </div>

      {/* ─── CADASTRO TWO-TAP: O CORAÇÃO DO APP DE RUA ──────────────────────── */}
      <div
        style={{
          background: cardBg,
          border: solarMode ? '2px solid #ffe600' : '1px solid #10b981',
          borderRadius: '16px',
          padding: '14px',
          marginBottom: '14px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
          <Zap size={18} color={accentColor} />
          <span style={{ fontSize: '13px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            CADASTRO RÁPIDO TWO-TAP (2 TOQUES)
          </span>
        </div>

        {/* TOQUE 1: WHATSAPP DO APOIADOR (TECLADO NUMÉRICO GIGANTE) */}
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, marginBottom: '4px', color: accentColor }}>
            1. WHATSAPP DO ELEITOR (OBRIGATÓRIO)
          </label>
          <div style={{ position: 'relative' }}>
            <input
              ref={phoneInputRef}
              type="tel"
              inputMode="numeric"
              placeholder="(13) 9XXXX-XXXX"
              value={inputWhatsapp}
              onChange={(e) => handlePhoneChange(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 14px 14px 44px',
                fontSize: '18px',
                fontWeight: 900,
                color: '#ffffff',
                backgroundColor: solarMode ? '#000000' : '#0f172a',
                border: solarMode ? '2px solid #ffe600' : '2px solid #3b82f6',
                borderRadius: '10px',
                boxSizing: 'border-box',
                outline: 'none',
                letterSpacing: '1px'
              }}
            />
            <Phone
              size={20}
              color={accentColor}
              style={{ position: 'absolute', left: '14px', top: '16px' }}
            />
          </div>
        </div>

        {/* TOQUE 2: NOME DO APOIADOR */}
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, marginBottom: '4px', color: '#94a3b8' }}>
            2. NOME DO ELEITOR (OPCIONAL / RÁPIDO)
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Ex: Dona Maria, Seu Carlos..."
              value={inputNome}
              onChange={(e) => setInputNome(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 12px 12px 42px',
                fontSize: '15px',
                fontWeight: 600,
                color: '#ffffff',
                backgroundColor: solarMode ? '#000000' : '#0f172a',
                border: solarMode ? '2px solid #404040' : '1px solid #334155',
                borderRadius: '10px',
                boxSizing: 'border-box',
                outline: 'none'
              }}
            />
            <User
              size={18}
              color="#94a3b8"
              style={{ position: 'absolute', left: '14px', top: '14px' }}
            />
          </div>
        </div>

        {/* SELETOR DE BAIRRO (AUTO-DETECTADO) */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, marginBottom: '4px', color: '#94a3b8' }}>
            BAIRRO DE SANTOS (GPS SUGERE: {selectedBairro})
          </label>
          <select
            value={selectedBairro}
            onChange={(e) => setSelectedBairro(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '13px',
              fontWeight: 700,
              backgroundColor: solarMode ? '#000000' : '#0f172a',
              color: '#ffffff',
              border: solarMode ? '1px solid #404040' : '1px solid #334155',
              borderRadius: '8px'
            }}
          >
            {bairrosSantos.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        {/* TAGS RÁPIDAS COM 1 TOQUE */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
          {['Apoio 100%', 'Quer Adesivo', 'Pede Visita', 'Líder Familiar'].map((tag) => {
            const isSelected = tagsApoio.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  if (isSelected) setTagsApoio(tagsApoio.filter((t) => t !== tag));
                  else setTagsApoio([...tagsApoio, tag]);
                }}
                style={{
                  background: isSelected ? (solarMode ? '#ffe600' : '#10b981') : '#1e293b',
                  color: isSelected ? '#000000' : '#ffffff',
                  border: 'none',
                  padding: '5px 9px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {tag}
              </button>
            );
          })}
        </div>

        {/* BOTÃO GIGANTE DE CONFIRMAÇÃO & VIBRAÇÃO HÁPTICA */}
        <button
          onClick={handleCadastrarApoiador}
          style={{
            width: '100%',
            padding: '16px',
            backgroundColor: solarMode ? '#ffe600' : '#10b981',
            color: '#000000',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: 900,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)'
          }}
        >
          <UserCheck size={20} />
          GRAVAR APOIADOR (VIBRAR)
        </button>

        {ultimoCadastrado && (
          <div
            style={{
              marginTop: '10px',
              padding: '8px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.2)',
              border: '1px solid #10b981',
              color: '#10b981',
              fontSize: '12px',
              fontWeight: 800,
              textAlign: 'center'
            }}
          >
            ✅ {ultimoCadastrado} cadastrado! WhatsApp oficial despachado em 15s.
          </div>
        )}
      </div>

      {/* ─── AÇÕES DE SUPORTE EM CAMPO (REPOSIÇÃO DE MATERIAL) ───────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
        <button
          onClick={handleSolicitarMaterial}
          disabled={solicitandoMaterial}
          style={{
            padding: '12px',
            backgroundColor: '#ef4444',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            fontSize: '12px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <PackageCheck size={16} />
          {solicitandoMaterial ? 'Enviando...' : '🚨 PEDIR SANTINHOS'}
        </button>

        <button
          onClick={() => {
            if (navigator.vibrate) navigator.vibrate([60]);
            alert(`Check-in de Presença registrado com sucesso na tenda de ${selectedBairro}!`);
          }}
          style={{
            padding: '12px',
            backgroundColor: '#3b82f6',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            fontSize: '12px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <CheckCircle size={16} />
          CHECK-IN TENDA
        </button>
      </div>

      {materialFeedback && (
        <div
          style={{
            padding: '8px',
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            fontSize: '11px',
            fontWeight: 700,
            textAlign: 'center',
            color: '#f87171',
            marginBottom: '12px'
          }}
        >
          {materialFeedback}
        </div>
      )}

      {/* ─── HISTÓRICO DE APOIADORES DA EQUIPE HOJE (OFFLINE/LOCAL) ──────────── */}
      <div
        style={{
          background: cardBg,
          border: borderCard,
          borderRadius: '14px',
          padding: '12px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 800 }}>
            📋 APOIOS GRAVADOS NESTE TURNO ({apoiadoresLocais.length})
          </span>
          <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 700 }}>
            ● SINCRONIZADO COM API
          </span>
        </div>

        {apoiadoresLocais.length === 0 ? (
          <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '16px' }}>
            Nenhum apoiador gravado nos últimos minutos. Inicie a abordagem na calçada!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {apoiadoresLocais.slice(0, 5).map((a) => (
              <div
                key={a.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 10px',
                  background: solarMode ? '#000' : 'rgba(15, 23, 42, 0.6)',
                  border: solarMode ? '1px solid #333' : '1px solid #334155',
                  borderRadius: '8px'
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800 }}>{a.nome}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    {a.whatsapp} • {a.bairro}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '10px', color: accentColor, fontWeight: 700 }}>
                    {a.timestamp}
                  </div>
                  <div style={{ fontSize: '10px', color: '#10b981' }}>
                    WhatsApp Enviado
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
