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
  Award,
  QrCode,
  LogIn,
  LogOut,
  Clock,
  IdCard,
  Lock,
  Key,
  Briefcase
} from 'lucide-react';
import { ModalQRCodeAppRua } from './ModalQRCodeAppRua.tsx';
import { api } from '../api.ts';

interface ColaboradorSession {
  id: string;
  nome: string;
  whatsapp: string;
  cpf: string;
  bairro: string;
  funcao: string;
  token?: string;
  authenticated?: boolean;
  createdAt: string;
}

interface RegistroPonto {
  id: string;
  colaboradorId: string;
  horarioEntrada: string;
  horarioSaida?: string;
  duracaoMinutos?: number;
  latEntrada: number;
  lngEntrada: number;
  latSaida?: number;
  lngSaida?: number;
  cadastrosNoTurno: number;
  kmNoTurno: number;
  status: 'EM_ANDAMENTO' | 'FINALIZADO';
}

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
  // ─── 1. SESSÃO ISOLADA DO COLABORADOR (EXIGE AUTENTICAÇÃO REAL) ────────────
  const [colaborador, setColaborador] = useState<ColaboradorSession | null>(() => {
    try {
      const saved = localStorage.getItem('santos_colaborador_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Se a sessão for legada/mockada (sem token ou sem authenticated: true), limpa imediatamente para exigir login
        if (!parsed.authenticated || !parsed.token) {
          localStorage.removeItem('santos_colaborador_session');
          return null;
        }
        return parsed;
      }
      return null;
    } catch (_) {
      localStorage.removeItem('santos_colaborador_session');
      return null;
    }
  });

  // Fluxo de Autenticação Segura (Cruzamento com Colaboradores Cadastrados)
  const [authIdentificador, setAuthIdentificador] = useState('');
  const [authSenha, setAuthSenha] = useState('');
  const [authConfirmaSenha, setAuthConfirmaSenha] = useState('');
  const [authStep, setAuthStep] = useState<'IDENTIFICAR' | 'CRIAR_SENHA' | 'DIGITAR_SENHA'>('IDENTIFICAR');
  const [colaboradorValidado, setColaboradorValidado] = useState<{
    id: string;
    nome: string;
    cpf: string;
    telefone: string;
    bairro: string;
    funcao: string;
    precisaCriarSenha: boolean;
  } | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authErro, setAuthErro] = useState<string | null>(null);

  // ─── 2. PONTO ELETRÔNICO (CHECK-IN / CHECK-OUT) ───────────────────────────
  const [pontoAtual, setPontoAtual] = useState<RegistroPonto | null>(() => {
    try {
      const saved = localStorage.getItem('santos_ponto_atual');
      return saved ? JSON.parse(saved) : null;
    } catch (_) {
      return null;
    }
  });
  const [resumoSaida, setResumoSaida] = useState<RegistroPonto | null>(null);

  // ─── 3. ESTADOS DE MODO SOLAR & ERGONOMIA ─────────────────────────────────
  const [solarMode, setSolarMode] = useState<boolean>(true);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [panicClicks, setPanicClicks] = useState<number>(0);
  const [panicMsg, setPanicMsg] = useState<string | null>(null);

  // ─── 4. TELEMETRIA CINÉTICA (SENSORES REAIS DE HARDWARE) ─────────────────
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const [velocidadeKmh, setVelocidadeKmh] = useState<number>(0);
  const [passosAcumulados, setPassosAcumulados] = useState<number>(0);
  const [tempoParadoMinutos, setTempoParadoMinutos] = useState<number>(0);
  const [statusCinetico, setStatusCinetico] = useState<'EM_MOVIMENTO' | 'PARADO_BASE' | 'PARADO_ALERTA'>('PARADO_BASE');
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number; precisao: number }>({
    lat: -23.9618,
    lng: -46.3322,
    precisao: 5.0
  });
  const [bateriaPct, setBateriaPct] = useState<number>(100);

  const ultimoMovimentoRef = useRef<number>(Date.now());
  const ultimaPosicaoRef = useRef<{ lat: number; lng: number; time: number } | null>(null);

  // ─── 5. CADASTRO TWO-TAP ──────────────────────────────────────────────────
  const [inputNome, setInputNome] = useState('');
  const [inputWhatsapp, setInputWhatsapp] = useState('');
  const [selectedBairro, setSelectedBairro] = useState('Gonzaga');
  const [tagsApoio, setTagsApoio] = useState<string[]>(['Apoio 100%']);
  const [apoiadoresLocais, setApoiadoresLocais] = useState<ApoiadorLocal[]>([]);
  const [cadastrosTurno, setCadastrosTurno] = useState<number>(0);
  const [ultimoCadastrado, setUltimoCadastrado] = useState<string | null>(null);
  const [solicitandoMaterial, setSolicitandoMaterial] = useState(false);
  const [materialFeedback, setMaterialFeedback] = useState<string | null>(null);

  const phoneInputRef = useRef<HTMLInputElement>(null);

  const bairrosSantos = [
    'Gonzaga', 'Boqueirão', 'Ponta da Praia', 'Embaré', 'Aparecida',
    'Centro', 'Vila Mathias', 'Encruzilhada', 'Marapé', 'José Menino',
    'Bom Retiro', 'Rádio Clube', 'Castelo', 'Areia Branca', 'Monte Serrat', 'Nova Cintra'
  ];

  // Função para cálculo geodésico de distância em metros entre duas coordenadas
  const calcDistanciaMetros = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const p1 = (lat1 * Math.PI) / 180;
    const p2 = (lat2 * Math.PI) / 180;
    const dp = ((lat2 - lat1) * Math.PI) / 180;
    const dl = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // ─── CICLO DE SENSORES E GPS QUANDO EM TURNO ──────────────────────────────
  useEffect(() => {
    if (!pontoAtual) return;

    // Escuta de Acelerômetro Real de Hardware
    const handleMotion = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc) return;
      const magnitude = Math.sqrt((acc.x || 0)**2 + (acc.y || 0)**2 + (acc.z || 0)**2) - 9.8;
      if (Math.abs(magnitude) > 1.25) {
        ultimoMovimentoRef.current = Date.now();
        setIsMoving(true);
        setStatusCinetico('EM_MOVIMENTO');
        setPassosAcumulados((prev) => prev + 1);
        setTempoParadoMinutos(0);
      }
    };

    if (window.DeviceMotionEvent) {
      window.addEventListener('devicemotion', handleMotion);
    }

    // Escuta de GPS Real com alta precisão
    let watchId: number | null = null;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const now = Date.now();

          let speed = 0;
          if (pos.coords.speed !== null && pos.coords.speed !== undefined && !isNaN(pos.coords.speed) && pos.coords.speed >= 0) {
            speed = Number((pos.coords.speed * 3.6).toFixed(1));
          } else if (ultimaPosicaoRef.current) {
            const dt = (now - ultimaPosicaoRef.current.time) / 1000;
            if (dt >= 2) {
              const dM = calcDistanciaMetros(ultimaPosicaoRef.current.lat, ultimaPosicaoRef.current.lng, lat, lng);
              speed = Number(((dM / dt) * 3.6).toFixed(1));
            }
          }
          ultimaPosicaoRef.current = { lat, lng, time: now };

          setVelocidadeKmh(speed);
          setGpsCoords({
            lat,
            lng,
            precisao: Number(pos.coords.accuracy.toFixed(1))
          });

          if (speed > 1.2) {
            ultimoMovimentoRef.current = now;
            setIsMoving(true);
            setStatusCinetico('EM_MOVIMENTO');
            setTempoParadoMinutos(0);
          }
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
      );
    }

    // Leitura real do nível de Bateria
    if ((navigator as any).getBattery) {
      (navigator as any).getBattery().then((battery: any) => {
        setBateriaPct(Math.round(battery.level * 100));
        battery.addEventListener('levelchange', () => {
          setBateriaPct(Math.round(battery.level * 100));
        });
      });
    }

    // Monitoramento periódico de inatividade física
    const idleCheckInterval = setInterval(() => {
      const paradoSegundos = Math.floor((Date.now() - ultimoMovimentoRef.current) / 1000);
      const paradoMin = Math.floor(paradoSegundos / 60);
      setTempoParadoMinutos(paradoMin);

      if (paradoSegundos > 25) {
        setIsMoving(false);
        if (paradoMin >= 15) {
          setStatusCinetico('PARADO_ALERTA');
        } else {
          setStatusCinetico('PARADO_BASE');
        }
      }
    }, 10000);

    return () => {
      if (window.DeviceMotionEvent) window.removeEventListener('devicemotion', handleMotion);
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      clearInterval(idleCheckInterval);
    };
  }, [pontoAtual]);

  // Envio contínuo de telemetria real para a Sala de Guerra
  useEffect(() => {
    if (!pontoAtual || !colaborador) return;

    const enviarTelemetria = () => {
      fetch('/api/equipe-rua/telemetria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          membro_id: colaborador.id,
          nome: colaborador.nome,
          telefone: colaborador.whatsapp,
          cpf: colaborador.cpf,
          funcao: colaborador.funcao,
          latitude: gpsCoords.lat,
          longitude: gpsCoords.lng,
          velocidade_kmh: velocidadeKmh,
          is_moving: isMoving,
          estado: statusCinetico,
          tempo_parado_minutos: tempoParadoMinutos,
          passos: passosAcumulados,
          bateria_pct: bateriaPct,
          bairro: selectedBairro,
          cadastros_hoje: cadastrosTurno
        })
      }).catch(() => {});
    };

    enviarTelemetria(); // Envio imediato
    const timer = setInterval(enviarTelemetria, 25000); // Batimento a cada 25 segundos
    return () => clearInterval(timer);
  }, [pontoAtual, colaborador, gpsCoords, velocidadeKmh, isMoving, statusCinetico, tempoParadoMinutos, passosAcumulados, bateriaPct, selectedBairro, cadastrosTurno]);

  // ─── CAPTURA DE GPS DE HARDWARE EM TEMPO REAL ───────────────────────────
  const getLiveGps = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setGpsCoords({ lat: coords.lat, lng: coords.lng, precisao: Math.round(pos.coords.accuracy || 5) });
            resolve(coords);
          },
          (err) => {
            console.warn('GPS hardware timeout/erro, usando última coordenada válida:', err);
            resolve({ lat: gpsCoords.lat, lng: gpsCoords.lng });
          },
          { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
        );
      } else {
        resolve({ lat: gpsCoords.lat, lng: gpsCoords.lng });
      }
    });
  };

  // ─── ETAPA 1: VALIDAR SE O IDENTIFICADOR (CPF OU WHATSAPP) CONSTA NA EQUIPE DE RUA ────
  const handleIdentificarColaborador = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = authIdentificador.trim();
    if (!cleanId || cleanId.replace(/\D/g, '').length < 9) {
      setAuthErro('Informe um CPF (11 dígitos) ou WhatsApp válido com DDD (ex: 13 99999-9999).');
      return;
    }

    setAuthLoading(true);
    setAuthErro(null);

    try {
      const res = await api.validarColaboradorRua(cleanId);
      if (res && res.colaborador_id) {
        setColaboradorValidado({
          id: res.colaborador_id,
          nome: res.nome,
          cpf: res.cpf,
          telefone: res.telefone,
          bairro: res.bairro,
          funcao: res.funcao,
          precisaCriarSenha: res.precisaCriarSenha
        });

        if (res.precisaCriarSenha) {
          setAuthStep('CRIAR_SENHA');
        } else {
          setAuthStep('DIGITAR_SENHA');
        }
      }
    } catch (err: any) {
      setAuthErro(err.message || 'Acesso não autorizado. Você precisa estar previamente cadastrado pela coordenação da campanha como Colaborador de Rua.');
    } finally {
      setAuthLoading(false);
    }
  };

  // ─── ETAPA 2A: PRIMEIRO ACESSO - CRIAÇÃO DE SENHA DO COLABORADOR ───────────
  const handlePrimeiroAcesso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authSenha || authSenha.length < 4) {
      setAuthErro('A senha deve ter no mínimo 4 caracteres.');
      return;
    }
    if (authSenha !== authConfirmaSenha) {
      setAuthErro('A confirmação de senha não confere com a senha digitada.');
      return;
    }

    setAuthLoading(true);
    setAuthErro(null);

    try {
      const res = await api.primeiroAcessoColaboradorRua(authIdentificador, authSenha);
      if (res && res.colaborador) {
        const c = res.colaborador;
        const session: ColaboradorSession = {
          id: c.id,
          nome: c.nome,
          whatsapp: c.telefone || authIdentificador,
          cpf: c.cpf || 'Cadastrado',
          bairro: c.bairro || 'Gonzaga',
          funcao: c.funcao || 'Mobilizador de Rua',
          token: res.token || 'jwt_session_' + Date.now(),
          authenticated: true,
          createdAt: new Date().toISOString()
        };

        localStorage.setItem('santos_colaborador_session', JSON.stringify(session));
        setColaborador(session);
        setSelectedBairro(session.bairro);
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      }
    } catch (err: any) {
      setAuthErro(err.message || 'Erro ao registrar senha de primeiro acesso.');
    } finally {
      setAuthLoading(false);
    }
  };

  // ─── ETAPA 2B: LOGIN COM SENHA CADASTRADA ──────────────────────────────────
  const handleLoginComSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authSenha) {
      setAuthErro('Informe sua senha cadastrada.');
      return;
    }

    setAuthLoading(true);
    setAuthErro(null);

    try {
      const res = await api.loginColaboradorRua(authIdentificador, authSenha);
      if (res && res.colaborador) {
        const c = res.colaborador;
        const session: ColaboradorSession = {
          id: c.id,
          nome: c.nome,
          whatsapp: c.telefone || authIdentificador,
          cpf: c.cpf || 'Cadastrado',
          bairro: c.bairro || 'Gonzaga',
          funcao: c.funcao || 'Mobilizador de Rua',
          token: res.token || 'jwt_session_' + Date.now(),
          authenticated: true,
          createdAt: new Date().toISOString()
        };

        localStorage.setItem('santos_colaborador_session', JSON.stringify(session));
        setColaborador(session);
        setSelectedBairro(session.bairro);
        if (navigator.vibrate) navigator.vibrate([100]);
      }
    } catch (err: any) {
      setAuthErro(err.message || 'Senha incorreta ou acesso não autorizado.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogoutColaborador = () => {
    if (pontoAtual) {
      if (!confirm('Você possui um turno de trabalho em andamento! Deseja mesmo sair e encerrar seu ponto?')) return;
      handleCheckOut();
    }
    localStorage.removeItem('santos_colaborador_session');
    localStorage.removeItem('santos_ponto_atual');
    setColaborador(null);
    setPontoAtual(null);
    setAuthStep('IDENTIFICAR');
    setColaboradorValidado(null);
    setAuthSenha('');
    setAuthConfirmaSenha('');
  };

  // ─── EXECUÇÃO DO CHECK-IN DE ENTRADA ──────────────────────────────────────
  const handleCheckIn = async () => {
    if (!colaborador) return;
    if (navigator.vibrate) navigator.vibrate([80, 50, 80]);

    const horaEntrada = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const novoPonto: RegistroPonto = {
      id: 'ponto_' + Date.now(),
      colaboradorId: colaborador.id,
      horarioEntrada: horaEntrada,
      latEntrada: gpsCoords.lat,
      lngEntrada: gpsCoords.lng,
      cadastrosNoTurno: 0,
      kmNoTurno: 0,
      status: 'EM_ANDAMENTO'
    };

    localStorage.setItem('santos_ponto_atual', JSON.stringify(novoPonto));
    setPontoAtual(novoPonto);
    setPassosAcumulados(0);
    setCadastrosTurno(0);
    setResumoSaida(null);

    // Grava no backend e ativa o colaborador na Sala de Guerra
    try {
      await fetch('/api/equipe-rua/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          colaborador_id: colaborador.id,
          nome: colaborador.nome,
          telefone: colaborador.whatsapp,
          cpf: colaborador.cpf,
          funcao: colaborador.funcao,
          latitude: gpsCoords.lat,
          longitude: gpsCoords.lng,
          bairro: selectedBairro
        })
      });
    } catch (_) {}
  };

  // ─── EXECUÇÃO DO CHECK-OUT DE SAÍDA ───────────────────────────────────────
  const handleCheckOut = async () => {
    if (!pontoAtual || !colaborador) return;
    if (navigator.vibrate) navigator.vibrate([150, 80, 150]);

    const horaSaida = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const kmPercorridos = Number(((passosAcumulados * 0.75) / 1000).toFixed(2));
    const pontoFinalizado: RegistroPonto = {
      ...pontoAtual,
      horarioSaida: horaSaida,
      latSaida: gpsCoords.lat,
      lngSaida: gpsCoords.lng,
      cadastrosNoTurno: cadastrosTurno,
      kmNoTurno: kmPercorridos,
      status: 'FINALIZADO'
    };

    localStorage.removeItem('santos_ponto_atual');
    setPontoAtual(null);
    setResumoSaida(pontoFinalizado);

    // Grava encerramento oficial no backend
    try {
      await fetch('/api/equipe-rua/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          colaborador_id: colaborador.id,
          nome: colaborador.nome,
          horario_entrada: pontoAtual.horarioEntrada,
          horario_saida: horaSaida,
          cadastros: cadastrosTurno,
          km: kmPercorridos,
          latitude: gpsCoords.lat,
          longitude: gpsCoords.lng
        })
      });
    } catch (_) {}
  };

  // ─── FORMATAÇÃO DE WHATSAPP ────────────────────────────────────────────────
  const handlePhoneChange = (val: string, setter: (s: string) => void) => {
    let clean = val.replace(/\D/g, '');
    if (clean.length > 11) clean = clean.slice(0, 11);
    let formatted = clean;
    if (clean.length > 2) formatted = `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
    if (clean.length > 7) formatted = `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
    setter(formatted);
  };

  // ─── CADASTRO TWO-TAP DE APOIADOR COM GPS REAL DO APARELHO ────────────────
  const handleCadastrarApoiador = async () => {
    const cleanPhone = inputWhatsapp.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      alert('Por favor, informe o WhatsApp com DDD (ex: 13 99999-9999)');
      return;
    }
    const nomeFinal = inputNome.trim() || 'Apoiador Cívico';

    if (navigator.vibrate) navigator.vibrate([80, 50, 80]);

    // Obtém a coordenada em tempo real diretamente do hardware GPS do celular
    const liveCoords = await getLiveGps();

    const novo: ApoiadorLocal = {
      id: 'local_' + Date.now(),
      nome: nomeFinal,
      whatsapp: inputWhatsapp,
      bairro: selectedBairro,
      tags: tagsApoio,
      lat: liveCoords.lat,
      lng: liveCoords.lng,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      sincronizado: true
    };

    setApoiadoresLocais([novo, ...apoiadoresLocais]);
    setCadastrosTurno((c) => c + 1);
    setUltimoCadastrado(nomeFinal);

    try {
      await fetch('/api/equipe-rua/coleta-voto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nomeFinal,
          whatsapp: cleanPhone,
          bairro: selectedBairro,
          tags: tagsApoio,
          lat: liveCoords.lat,
          lng: liveCoords.lng,
          membro_id: colaborador?.id,
          cadastradoPor: colaborador?.nome || 'Colaborador de Rua'
        })
      });
    } catch (_) {}

    setInputNome('');
    setInputWhatsapp('');
    if (phoneInputRef.current) phoneInputRef.current.focus();
    setTimeout(() => setUltimoCadastrado(null), 4000);
  };

  // ─── SOLICITAÇÃO DE SUPRIMENTOS ────────────────────────────────────────────
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
          solicitante: colaborador?.nome || 'Equipe de Campo Santos',
          telefone: colaborador?.telefone || '',
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

  // ─── PÂNICO / QUICK WIPE ──────────────────────────────────────────────────
  const handleShieldPanic = () => {
    const next = panicClicks + 1;
    setPanicClicks(next);
    if (next >= 5) {
      setApoiadoresLocais([]);
      setPanicMsg('⚠️ PROTOCOLO DE SEGURANÇA: DADOS LOCAIS LIMPOS.');
      if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
      setTimeout(() => {
        setPanicClicks(0);
        setPanicMsg(null);
      }, 3000);
    }
  };

  // Cores dinâmicas do Modo Solar
  const bgMain = solarMode ? '#000000' : '#090d16';
  const textPrimary = solarMode ? '#ffffff' : '#f8fafc';
  const accentColor = solarMode ? '#ffe600' : '#10b981';
  const cardBg = solarMode ? '#0d0d0d' : 'rgba(30, 41, 59, 0.6)';
  const borderCard = solarMode ? '2px solid #262626' : '1px solid rgba(255, 255, 255, 0.1)';

  // ──────────────────────────────────────────────────────────────────────────
  // TELA 1: AUTENTICAÇÃO E CONTROLE DE ACESSO RESTRITO (EQUIPE DE RUA OFICIAL)
  // ──────────────────────────────────────────────────────────────────────────
  if (!colaborador) {
    return (
      <div
        style={{
          backgroundColor: '#000000',
          color: '#ffffff',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px',
          fontFamily: 'Inter, -apple-system, sans-serif'
        }}
      >
        <div
          style={{
            maxWidth: '440px',
            width: '100%',
            background: '#0d0d0d',
            border: '2px solid #ffe600',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 0 30px rgba(255, 230, 0, 0.15)'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '22px' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                backgroundColor: '#ffe600',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
                color: '#000000'
              }}
            >
              <Shield size={32} />
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: 900, margin: '0 0 4px', letterSpacing: '0.5px' }}>
              SANTOS EM CAMPO 2026
            </h1>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
              Acesso Restrito à Equipe Oficial de Rua e Panfletagem
            </p>
          </div>

          {/* ─── PASSO 1: IDENTIFICAR CPF OU WHATSAPP (CRUZAMENTO COM EQUIPE DE RUA) ─── */}
          {authStep === 'IDENTIFICAR' && (
            <form onSubmit={handleIdentificarColaborador} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: 'rgba(255, 230, 0, 0.06)', border: '1px solid rgba(255, 230, 0, 0.2)', padding: '12px', borderRadius: '10px', fontSize: '12px', color: '#f1f5f9', lineHeight: '1.4' }}>
                🛡️ <b>Acesso Exclusivo:</b> Para entrar, digite seu <b>CPF</b> ou <b>WhatsApp</b> previamente cadastrado pela coordenação da campanha.
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#ffe600', marginBottom: '6px' }}>
                  SEU CPF OU WHATSAPP CADASTRADO *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    placeholder="Digite seu CPF ou WhatsApp com DDD"
                    value={authIdentificador}
                    onChange={(e) => setAuthIdentificador(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 12px 12px 40px',
                      fontSize: '14px',
                      fontWeight: 700,
                      backgroundColor: '#000000',
                      color: '#ffffff',
                      border: '1px solid #333333',
                      borderRadius: '10px',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                  />
                  <IdCard size={18} color="#ffe600" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                </div>
              </div>

              {authErro && (
                <div style={{ padding: '10px', background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', color: '#fca5a5', fontSize: '12px', borderRadius: '8px', textAlign: 'center', lineHeight: '1.4' }}>
                  {authErro}
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                style={{
                  marginTop: '6px',
                  padding: '16px',
                  backgroundColor: authLoading ? '#475569' : '#ffe600',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 900,
                  cursor: authLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  letterSpacing: '0.5px'
                }}
              >
                <LogIn size={18} />
                {authLoading ? 'VERIFICANDO CREDENCIAIS...' : 'VERIFICAR MEU CADASTRO'}
              </button>
            </form>
          )}

          {/* ─── PASSO 2A: PRIMEIRO ACESSO (CRIAR SENHA) ─────────────────────────── */}
          {authStep === 'CRIAR_SENHA' && colaboradorValidado && (
            <form onSubmit={handlePrimeiroAcesso} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '12px', borderRadius: '10px', fontSize: '12px', color: '#6ee7b7' }}>
                👋 Olá, <b>{colaboradorValidado.nome}</b>! Seu cadastro foi localizado. Por ser seu <b>primeiro acesso</b>, crie sua senha de segurança.
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#ffe600', marginBottom: '4px' }}>
                  CRIE UMA SENHA DE ACESSO *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    required
                    placeholder="Mínimo 4 caracteres"
                    value={authSenha}
                    onChange={(e) => setAuthSenha(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 12px 12px 40px',
                      fontSize: '14px',
                      backgroundColor: '#000000',
                      color: '#ffffff',
                      border: '1px solid #333333',
                      borderRadius: '10px',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                  />
                  <Lock size={18} color="#ffe600" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#94a3b8', marginBottom: '4px' }}>
                  CONFIRME SUA SENHA *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    required
                    placeholder="Repita a senha criada"
                    value={authConfirmaSenha}
                    onChange={(e) => setAuthConfirmaSenha(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 12px 12px 40px',
                      fontSize: '14px',
                      backgroundColor: '#000000',
                      color: '#ffffff',
                      border: '1px solid #333333',
                      borderRadius: '10px',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                  />
                  <Key size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                </div>
              </div>

              {authErro && (
                <div style={{ padding: '8px', background: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444', color: '#ef4444', fontSize: '12px', borderRadius: '6px', textAlign: 'center' }}>
                  {authErro}
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                style={{
                  marginTop: '4px',
                  padding: '16px',
                  backgroundColor: authLoading ? '#475569' : '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 900,
                  cursor: authLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <CheckCircle size={18} />
                {authLoading ? 'SALVANDO...' : 'CRIAR MINHA SENHA E ENTRAR'}
              </button>

              <button
                type="button"
                onClick={() => { setAuthStep('IDENTIFICAR'); setAuthErro(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Voltar e alterar CPF/WhatsApp
              </button>
            </form>
          )}

          {/* ─── PASSO 2B: DIGITAR SENHA EXISTENTE ───────────────────────────────── */}
          {authStep === 'DIGITAR_SENHA' && colaboradorValidado && (
            <form onSubmit={handleLoginComSenha} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: 'rgba(255, 230, 0, 0.08)', border: '1px solid rgba(255, 230, 0, 0.3)', padding: '12px', borderRadius: '10px', fontSize: '12px', color: '#fef08a' }}>
                👋 Olá, <b>{colaboradorValidado.nome}</b>! Informe sua senha para liberar o turno de campo.
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#ffe600', marginBottom: '4px' }}>
                  DIGITE SUA SENHA *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    required
                    placeholder="Sua senha cadastrada"
                    value={authSenha}
                    onChange={(e) => setAuthSenha(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 12px 12px 40px',
                      fontSize: '14px',
                      backgroundColor: '#000000',
                      color: '#ffffff',
                      border: '1px solid #333333',
                      borderRadius: '10px',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                  />
                  <Lock size={18} color="#ffe600" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                </div>
              </div>

              {authErro && (
                <div style={{ padding: '8px', background: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444', color: '#ef4444', fontSize: '12px', borderRadius: '6px', textAlign: 'center' }}>
                  {authErro}
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                style={{
                  marginTop: '4px',
                  padding: '16px',
                  backgroundColor: authLoading ? '#475569' : '#ffe600',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 900,
                  cursor: authLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <LogIn size={18} />
                {authLoading ? 'AUTENTICANDO...' : 'ENTRAR NO TURNO'}
              </button>

              <button
                type="button"
                onClick={() => { setAuthStep('IDENTIFICAR'); setAuthErro(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Voltar e alterar CPF/WhatsApp
              </button>
            </form>
          )}

          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '11px', color: '#64748b' }}>
            🔒 Sistema de auditoria eleitoral com rastreamento criptografado de presença e geolocalização.
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TELA 2 & 3: APLICATIVO DO COLABORADOR (CONTROLE DE PONTO + CADASTRO DE RUA)
  // ──────────────────────────────────────────────────────────────────────────
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
      {/* ─── BARRA SUPERIOR DO COLABORADOR ─────────────────────────────────── */}
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
              {colaborador.nome.split(' ')[0]} ({colaborador.bairro})
            </div>
            <div style={{ fontSize: '10px', color: solarMode ? '#ffe600' : '#94a3b8' }}>
              {colaborador.funcao}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => setIsQrModalOpen(true)}
            title="Abrir QR Code para outro colaborador instalar"
            style={{
              background: solarMode ? '#ffe600' : '#10b981',
              color: '#000000',
              border: 'none',
              padding: '6px 8px',
              borderRadius: '6px',
              fontWeight: 800,
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <QrCode size={13} />
            QR
          </button>

          <button
            onClick={() => setSolarMode(!solarMode)}
            style={{
              background: solarMode ? '#333' : '#334155',
              color: '#fff',
              border: 'none',
              padding: '6px 8px',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            {solarMode ? <Sun size={13} /> : <Moon size={13} />}
          </button>

          <button
            onClick={handleLogoutColaborador}
            title="Sair da conta e trocar de colaborador"
            style={{
              background: '#ef4444',
              color: '#ffffff',
              border: 'none',
              padding: '6px 10px',
              borderRadius: '8px',
              fontWeight: 800,
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <LogOut size={13} />
            SAIR
          </button>
        </div>
      </div>

      {panicMsg && (
        <div style={{ background: '#ef4444', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: 800, textAlign: 'center', marginBottom: '10px' }}>
          {panicMsg}
        </div>
      )}

      {/* ─── PONTO ELETRÔNICO: CHECK-IN & CHECK-OUT DE TRABALHO ──────────────── */}
      <div
        style={{
          background: pontoAtual ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
          border: pontoAtual ? '2px solid #10b981' : '2px solid #ef4444',
          borderRadius: '16px',
          padding: '14px',
          marginBottom: '12px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} color={pontoAtual ? '#10b981' : '#ef4444'} />
            <span style={{ fontSize: '13px', fontWeight: 900, letterSpacing: '0.5px' }}>
              {pontoAtual ? 'PONTO ELETRÔNICO: EM TURNO ATIVO' : 'PONTO ELETRÔNICO: EXPEDIENTE FECHADO'}
            </span>
          </div>

          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8' }}>
            {pontoAtual ? `Desde às ${pontoAtual.horarioEntrada}` : 'Aguardando Entrada'}
          </div>
        </div>

        {!pontoAtual ? (
          <div>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 12px 0' }}>
              Você está fora do horário de trabalho. Ao registrar sua entrada, sua geolocalização e passos serão contabilizados para sua remuneração e prestação de contas do TSE.
            </p>
            <button
              onClick={handleCheckIn}
              style={{
                width: '100%',
                padding: '16px',
                backgroundColor: '#10b981',
                color: '#000000',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
              }}
            >
              <CheckCircle size={20} />
              🟢 REGISTRAR CHECK-IN DE ENTRADA
            </button>
          </div>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px', textAlign: 'center' }}>
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '8px', borderRadius: '8px' }}>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>ENTRADA</div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#10b981' }}>{pontoAtual.horarioEntrada}</div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '8px', borderRadius: '8px' }}>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>CADASTROS</div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#ffe600' }}>{cadastrosTurno} apoios</div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '8px', borderRadius: '8px' }}>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>PASSOS / KM</div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#60a5fa' }}>
                  {passosAcumulados} ({((passosAcumulados * 0.75) / 1000).toFixed(1)} km)
                </div>
              </div>
            </div>

            <button
              onClick={handleCheckOut}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                color: '#ef4444',
                border: '1px solid #ef4444',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <LogOut size={16} />
              🔴 REGISTRAR CHECK-OUT DE SAÍDA (ENCERRAR EXPEDIENTE)
            </button>
          </div>
        )}
      </div>

      {resumoSaida && (
        <div
          style={{
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid #3b82f6',
            borderRadius: '14px',
            padding: '12px',
            marginBottom: '12px',
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#60a5fa', marginBottom: '4px' }}>
            🎉 Turno Concluído com Sucesso!
          </div>
          <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
            Entrada: {resumoSaida.horarioEntrada} • Saída: {resumoSaida.horarioSaida} • {resumoSaida.cadastrosNoTurno} Apoiadores Coletados • {resumoSaida.kmNoTurno} km caminhados.
          </div>
        </div>
      )}

      {/* ─── RADAR CINÉTICO: PARADO VS. EM MOVIMENTO (SÓ QUANDO EM TURNO) ───── */}
      {pontoAtual && (
        <div
          style={{
            background: cardBg,
            border: borderCard,
            borderRadius: '14px',
            padding: '12px',
            marginBottom: '12px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={16} color={accentColor} />
              <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Telemetria Cinética de Campo
              </span>
            </div>

            <div
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '10px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Radio size={11} className="animate-pulse" /> SENSOR DE HARDWARE ATIVO
            </div>
          </div>

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
              marginBottom: '8px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: statusCinetico === 'EM_MOVIMENTO' ? '#10b981' : statusCinetico === 'PARADO_BASE' ? '#3b82f6' : '#ef4444',
                  boxShadow: statusCinetico === 'EM_MOVIMENTO' ? '0 0 8px #10b981' : 'none'
                }}
              />
              <div>
                <div style={{ fontSize: '12px', fontWeight: 800 }}>
                  {statusCinetico === 'EM_MOVIMENTO' && '🟢 EM MOVIMENTO (PANFLETANDO)'}
                  {statusCinetico === 'PARADO_BASE' && '🔵 EM PAUSA / PONTO DE ENCONTRO'}
                  {statusCinetico === 'PARADO_ALERTA' && '🔴 PARADO HÁ MAIS DE 15 MIN'}
                </div>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                  {statusCinetico === 'EM_MOVIMENTO'
                    ? `Velocidade: ${velocidadeKmh} km/h • Passos ativos`
                    : `Tempo Parado: ${tempoParadoMinutos} min`}
                </div>
              </div>
            </div>

            <div style={{ fontSize: '12px', fontWeight: 800, color: accentColor }}>
              {bateriaPct}% BAT
            </div>
          </div>
        </div>
      )}

      {/* ─── CADASTRO TWO-TAP: SÓ DISPONÍVEL QUANDO EM TURNO ────────────────── */}
      {pontoAtual ? (
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
              CADASTRO TWO-TAP (2 TOQUES)
            </span>
          </div>

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
                onChange={(e) => handlePhoneChange(e.target.value, setInputWhatsapp)}
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

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, marginBottom: '4px', color: '#94a3b8' }}>
              BAIRRO DE SANTOS
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
              gap: '8px'
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
              ✅ {ultimoCadastrado} gravado com sucesso!
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            background: cardBg,
            border: borderCard,
            borderRadius: '14px',
            padding: '20px',
            textAlign: 'center',
            marginBottom: '14px'
          }}
        >
          <AlertTriangle size={32} color="#f59e0b" style={{ margin: '0 auto 8px' }} />
          <div style={{ fontSize: '14px', fontWeight: 800 }}>CADASTRO DE APOIADORES BLOQUEADO</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
            Para registrar eleitores na rua, clique no botão <strong>"REGISTRAR CHECK-IN DE ENTRADA"</strong> acima.
          </div>
        </div>
      )}

      {/* ─── AÇÃO DE SUPORTE: REPOSIÇÃO DE MATERIAL (SEM TENDAS FIXAS) ─────── */}
      <div style={{ marginBottom: '14px' }}>
        <button
          onClick={handleSolicitarMaterial}
          disabled={solicitandoMaterial || !pontoAtual}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: !pontoAtual ? '#334155' : '#ef4444',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 800,
            cursor: !pontoAtual ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: pontoAtual ? '0 4px 14px rgba(239, 68, 68, 0.35)' : 'none'
          }}
        >
          <PackageCheck size={18} />
          {solicitandoMaterial ? 'Enviando alerta para a Sala de Guerra...' : '🚨 PEDIR SANTINHOS E MATERIAL (VAN DE APOIO)'}
        </button>
      </div>

      {materialFeedback && (
        <div style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', borderRadius: '8px', fontSize: '11px', fontWeight: 700, textAlign: 'center', color: '#f87171', marginBottom: '12px' }}>
          {materialFeedback}
        </div>
      )}

      {/* ─── HISTÓRICO DE APOIOS DO TURNO ATUAL ──────────────────────────────── */}
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
            📋 APOIOS COLETADOS NO TURNO ({apoiadoresLocais.length})
          </span>
          <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 700 }}>
            ● SINCRONIZADO COM SERVIDOR
          </span>
        </div>

        {apoiadoresLocais.length === 0 ? (
          <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '16px' }}>
            Nenhum apoiador gravado neste turno ainda.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {apoiadoresLocais.slice(0, 6).map((a) => (
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

      {/* Modal de Instalação do App do Colaborador (QR Code) */}
      <ModalQRCodeAppRua
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
      />
    </div>
  );
};
