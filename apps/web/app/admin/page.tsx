'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { 
  Target, 
  GitBranch, 
  Send, 
  Shield, 
  FileDown, 
  Activity, 
  Vote, 
  RefreshCw,
  Eye,
  EyeOff,
  AlertOctagon,
  CheckCircle2,
  MessageSquare,
  KeyRound,
  LogOut,
  User,
  Sun,
  Moon,
} from 'lucide-react';
import { CockpitMetas } from '../../components/CockpitMetas';
import { ArvoreLideranca, TreeNode } from '../../components/ArvoreLideranca';
import { DisparadorWhatsApp } from '../../components/DisparadorWhatsApp';
import { ChatAoVivo } from '../../components/ChatAoVivo';
import { MateriaisOnline } from '../../components/MateriaisOnline';
import { ConfigBot } from '../../components/ConfigBot';
import { ConfigCampanha, CampanhaConfigData } from '../../components/ConfigCampanha';
import { ControleGastos } from '../../components/ControleGastos';
import { ModalMetas } from '../../components/ModalMetas';
import { ModalConectarWhatsApp } from '../../components/ModalConectarWhatsApp';
import { ModalQRCodeComite } from '../../components/ModalQRCodeComite';
import { ModalGestores } from '../../components/ModalGestores';
import { ModalCriarGrupo } from '../../components/ModalCriarGrupo';
import { ModalUsuariosAuth } from '../../components/ModalUsuariosAuth';
import { ModalNovoCadastro } from '../../components/ModalNovoCadastro';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { Smartphone, QrCode, UserCheck, Users, BookOpen, Settings, Receipt, UserPlus } from 'lucide-react';

const API_BASE_URL = !process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL.includes('localhost') ? '' : process.env.NEXT_PUBLIC_API_URL;

export default function AdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    nome: string;
    email: string;
    role: string;
    permissoes: string[];
  } | null>(null);

  const [activeTab, setActiveTab] = useState<'cockpit' | 'arvore' | 'disparos' | 'chat' | 'materiais' | 'gastos' | 'bot' | 'campanha' | 'lgpd'>('cockpit');
  const [campanha, setCampanha] = useState<CampanhaConfigData>({
    nome_urna: 'Gustavo Reis',
    nome_completo: 'Gustavo Reis',
    numero_candidato: '55955',
    cargo: 'Deputado Federal',
    partido: 'PSD',
    coligacao: 'Coligação Por Dias Melhores',
    slogan: 'Trabalho, honestidade e compromisso com você',
    foto_url: '',
    logo_url: '',
    cor_primaria: '#10b981',
    cidade: 'Santos',
    estado: 'SP',
    data_eleicao: '2026-10-04',
    cnpj_campanha: '00.000.000/0001-00',
    biografia_ia: '',
    propostas_ia: '',
    tom_voz_ia: 'POPULAR',
  });
  const [selectedChatContact, setSelectedChatContact] = useState<{
    id: string;
    nome: string;
    whatsapp: string;
    cargo?: string;
  } | null>(null);
  const [isMasked, setIsMasked] = useState(true);
  const [showUnmaskModal, setShowUnmaskModal] = useState(false);
  const [isModalMetaOpen, setIsModalMetaOpen] = useState(false);
  const [isModalWhatsAppOpen, setIsModalWhatsAppOpen] = useState(false);
  const [isModalQRCodeComiteOpen, setIsModalQRCodeComiteOpen] = useState(false);
  const [isModalGestoresOpen, setIsModalGestoresOpen] = useState(false);
  const [isModalCriarGrupoOpen, setIsModalCriarGrupoOpen] = useState(false);
  const [isModalUsuariosAuthOpen, setIsModalUsuariosAuthOpen] = useState(false);
  const [isModalNovoCadastroOpen, setIsModalNovoCadastroOpen] = useState(false);
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Monitorar status real do WhatsApp para o cabeçalho
  useEffect(() => {
    let isMounted = true;
    const checkWaStatus = async () => {
      try {
        const res = await fetch('/api/whatsapp/status');
        if (res.ok && isMounted) {
          const data = await res.json();
          setWhatsappConnected(Boolean(data.connected));
        }
      } catch {
        if (isMounted) setWhatsappConnected(false);
      }
    };
    checkWaStatus();
    const interval = setInterval(checkWaStatus, 20000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isModalWhatsAppOpen]);

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
      if (savedTheme === 'light') {
        setTheme('light');
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      } else {
        setTheme('dark');
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      }
    } catch {}
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem('theme', next);
      if (next === 'light') {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      }
    } catch {}
  };
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [unmaskReason, setUnmaskReason] = useState('');
  const [unmaskAuditStatus, setUnmaskAuditStatus] = useState<string | null>(null);
  const [selectedLeaderForGroup, setSelectedLeaderForGroup] = useState<{ id: string; nome: string; whatsapp: string } | null>(null);

  // Verificação de Autenticação na montagem
  useEffect(() => {
    const token = localStorage.getItem('auth_token') || Cookies.get('auth_token');
    const userStr = localStorage.getItem('auth_user');

    if (!token) {
      router.push('/login');
      return;
    }

    if (userStr) {
      try {
        const parsed = JSON.parse(userStr);
        setCurrentUser(parsed);
        // Se o usuário tiver permissão apenas para chat, abre na aba chat por padrão
        if (parsed.permissoes && !parsed.permissoes.includes('COCKPIT') && parsed.permissoes.includes('CHAT')) {
          setActiveTab('chat');
        }
      } catch {
        // ignora
      }
    }

    // Carregar dados de personalização da campanha (prioriza Next.js local)
    fetch('/api/campanha/config')
      .then((res) => {
        if (res.ok) return res.json();
        if (API_BASE_URL && API_BASE_URL !== 'http://localhost:3001') {
          return fetch(`${API_BASE_URL}/api/campanha/config`).then((r) => (r.ok ? r.json() : null));
        }
        return null;
      })
      .then((data) => {
        if (data?.config) setCampanha(data.config);
      })
      .catch(() => {});
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    Cookies.remove('auth_token');
    router.push('/login');
  };

  // Estados de Dados
  const [kpis, setKpis] = useState({
    total_lideres: 4,
    total_apoiadores: 6,
    cadastros_hoje: 2,
    meta_global: 3500,
    progresso_percentual: 0.17,
    dias_restantes: 45,
    cadencia_diaria_atual: 2,
    cadencia_diaria_meta: 30,
    cadencia_diaria_necessaria: 78,
    status_semaforo: 'AMARELO' as 'VERDE' | 'AMARELO' | 'VERMELHO',
  });

  const [metas, setMetas] = useState<any[]>([
    {
      id: '1',
      titulo: 'Meta Geral Campanha 2026',
      tipo: 'GLOBAL',
      alvo_referencia: 'Toda a Cidade',
      quantidade_meta: 3500,
      quantidade_atual: 6,
      data_fim: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
      meta_diaria_cadencia: 30,
      status_semaforo: 'AMARELO',
    },
    {
      id: '2',
      titulo: 'Mobilização Zona Norte (Zona 120)',
      tipo: 'ZONA',
      alvo_referencia: 'Zona 120',
      quantidade_meta: 1200,
      quantidade_atual: 3,
      data_fim: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000).toISOString(),
      meta_diaria_cadencia: 15,
      status_semaforo: 'VERDE',
    },
    {
      id: '3',
      titulo: 'Mobilização Zona Sul (Zona 150)',
      tipo: 'ZONA',
      alvo_referencia: 'Zona 150',
      quantidade_meta: 1500,
      quantidade_atual: 3,
      data_fim: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000).toISOString(),
      meta_diaria_cadencia: 15,
      status_semaforo: 'VERMELHO',
    },
  ]);

  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([]);

  const [auditLogs, setAuditLogs] = useState<any[]>([
    {
      id: '1',
      usuario: 'COORDENADOR-GERAL',
      acao: 'SESSAO_INICIADA',
      ip: '127.0.0.1',
      detalhes: 'Painel Eleitoral acessado em modo seguro (LGPD mascarado)',
      data: new Date().toLocaleTimeString('pt-BR'),
    },
  ]);

  // Carregar dados da API (Next.js interno com fallback para Fastify/API_BASE_URL)
  const refreshData = async () => {
    try {
      // 1. KPIs de Metas
      let resKpis = await fetch('/api/metas/kpis').catch(() => null);
      if (!resKpis || !resKpis.ok) {
        if (API_BASE_URL && API_BASE_URL !== 'http://localhost:3001') {
          resKpis = await fetch(`${API_BASE_URL}/api/metas/kpis`).catch(() => null);
        }
      }
      if (resKpis && resKpis.ok) {
        const data = await resKpis.json();
        if (data.kpis) setKpis(data.kpis);
        if (data.metas) setMetas(data.metas);
      }

      // 2. Árvore de Lideranças (busca direta do Postgres via Next.js)
      let resTree = await fetch(`/api/liderancas/tree?maskLGPD=${isMasked}`).catch(() => null);
      if (!resTree || !resTree.ok) {
        if (API_BASE_URL && API_BASE_URL !== 'http://localhost:3001') {
          resTree = await fetch(`${API_BASE_URL}/api/liderancas/tree?maskLGPD=${isMasked}`).catch(() => null);
        }
      }
      if (resTree && resTree.ok) {
        const data = await resTree.json();
        if (Array.isArray(data.tree)) setTreeNodes(data.tree);
      }
    } catch (err) {
      console.warn('Erro ao atualizar dados:', err);
    }
  };

  useEffect(() => {
    refreshData();
  }, [isMasked]);

  // Download do Relatório Executivo PDF com Streaming direto
  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/liderancas.pdf`, {
        headers: { 'x-user-audit': 'COORDENADOR-GERAL' },
      });

      if (!response.ok) throw new Error('Falha no streaming do relatório PDF');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Relatorio_Liderancas_Metas_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Registrar no log local
      setAuditLogs((prev) => [
        {
          id: String(Date.now()),
          usuario: 'COORDENADOR-GERAL',
          acao: 'EXPORTAR_RELATORIO_PDF',
          ip: '127.0.0.1',
          detalhes: 'Download do relatório executivo gerado via PDFMake Stream (<35MB RAM)',
          data: new Date().toLocaleTimeString('pt-BR'),
        },
        ...prev,
      ]);
    } catch (error) {
      console.error('Erro ao baixar PDF:', error);
      alert('Não foi possível gerar o PDF no momento. Verifique se o servidor Fastify está ativo na porta 3001.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Desmascarar LGPD com auditoria obrigatória
  const handleConfirmUnmask = async () => {
    if (!unmaskReason.trim()) {
      alert('Informe o motivo operacional para desmascaramento dos dados.');
      return;
    }

    try {
      await fetch(`${API_BASE_URL}/api/liderancas/audit/unmask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario_responsavel: 'COORDENADOR-GERAL',
          motivo: unmaskReason,
        }),
      });

      setAuditLogs((prev) => [
        {
          id: String(Date.now()),
          usuario: 'COORDENADOR-GERAL',
          acao: 'DESMASCARAR_DADOS',
          ip: '127.0.0.1',
          detalhes: `Desmascaramento autorizado. Motivo: ${unmaskReason}`,
          data: new Date().toLocaleTimeString('pt-BR'),
        },
        ...prev,
      ]);

      setIsMasked(false);
      setShowUnmaskModal(false);
      setUnmaskAuditStatus('Dados desmascarados com registro de auditoria ativo.');
      setTimeout(() => setUnmaskAuditStatus(null), 6000);
    } catch (err) {
      console.error('Erro na auditoria de desmascaramento:', err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Header */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 px-4 py-3 bg-white/95 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 backdrop-blur-md shadow-sm dark:shadow-none">
        <div className="flex items-center gap-3.5">
          {campanha.foto_url ? (
            <img
              src={campanha.foto_url}
              alt={campanha.nome_urna}
              className="w-12 h-12 rounded-2xl object-cover border-2 shadow-lg shadow-black/40"
              style={{ borderColor: campanha.cor_primaria }}
            />
          ) : (
            <div
              className="p-3 rounded-xl text-slate-950 font-black shadow-lg"
              style={{ backgroundColor: campanha.cor_primaria }}
            >
              <Vote className="w-6 h-6 text-slate-950" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {campanha.nome_urna.toUpperCase()}
              </h1>
              <span
                className="text-[11px] font-black px-2 py-0.5 rounded-full text-slate-950 font-mono shadow-sm"
                style={{ backgroundColor: campanha.cor_primaria }}
              >
                {campanha.numero_candidato}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {campanha.partido}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {campanha.cargo} • {campanha.cidade}-{campanha.estado}
              {campanha.slogan && <span className="hidden sm:inline"> • "{campanha.slogan}"</span>}
            </p>
          </div>
        </div>

        {/* Ações Globais & Perfil de Usuário */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Badge de Usuário Logado & Logout */}
          {currentUser && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-white">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-[11px]">
                {currentUser.nome.substring(0, 1).toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <div className="font-bold text-[11px] leading-tight text-slate-800 dark:text-white">{currentUser.nome}</div>
                <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-mono">{currentUser.role}</div>
              </div>
              <button
                onClick={handleLogout}
                className="ml-1 p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                title="Sair do Sistema"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Botão Alternar Modo Claro / Escuro */}
          <button
            onClick={toggleTheme}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border shadow-sm transition-all cursor-pointer bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700"
            title={theme === 'dark' ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Modo Claro</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-indigo-600" />
                <span className="hidden sm:inline">Modo Escuro</span>
              </>
            )}
          </button>

          {/* Botão Gestão de Logins (Admin Only) */}
          {(!currentUser || currentUser.role === 'ADMIN') && (
            <button
              onClick={() => setIsModalUsuariosAuthOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white dark:border-slate-700"
              title="Gerenciar acessos, atendentes e coordenadores da campanha"
            >
              <KeyRound className="w-4 h-4 text-amber-500" />
              <span>Acessos & Logins</span>
            </button>
          )}

          {/* Botão Conectar WhatsApp com Status Dinâmico */}
          <button
            onClick={() => setIsModalWhatsAppOpen(true)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg shadow-lg transition-all cursor-pointer ${
              whatsappConnected
                ? 'text-emerald-100 bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                : 'text-amber-300 bg-amber-950/80 border border-amber-500/40 hover:bg-amber-900/80 shadow-amber-900/20'
            }`}
            title={whatsappConnected ? 'WhatsApp Conectado e Ativo' : 'WhatsApp Desconectado - Clique para Conectar'}
          >
            <span className={`w-2 h-2 rounded-full ${whatsappConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <Smartphone className="w-4 h-4 text-white" />
            <span>{whatsappConnected ? 'WhatsApp Ativo' : 'Conectar WhatsApp'}</span>
          </button>

          {/* Botão QR Code do Comitê para novos Líderes */}
          <button
            onClick={() => setIsModalQRCodeComiteOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg shadow-lg shadow-cyan-600/20 transition-all cursor-pointer"
            title="Gerar cartaz e QR Code para novos líderes se cadastrarem pelo WhatsApp"
          >
            <QrCode className="w-4 h-4 text-cyan-200" />
            <span>QR Code Comitê</span>
          </button>

          {/* Botão Gestores e Administradores de Grupos */}
          <button
            onClick={() => setIsModalGestoresOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-lg shadow-lg shadow-purple-600/20 transition-all cursor-pointer"
            title="Cadastrar Gestores e Coordenadores que serão Administradores automáticos em todos os grupos de base"
          >
            <UserCheck className="w-4 h-4 text-purple-200" />
            <span>Gestores & ADMs</span>
          </button>

          {/* Botão Novo Cadastro Manual (Líder, Gestor, Apoiador, Voluntário) */}
          <button
            onClick={() => setIsModalNovoCadastroOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg shadow-lg shadow-cyan-600/25 transition-all cursor-pointer"
            title="Cadastrar manualmente Líder, Gestor, Apoiador ou Voluntário"
          >
            <UserPlus className="w-4 h-4 text-cyan-200" />
            <span>+ Novo Cadastro</span>
          </button>

          {/* Botão Criar Grupo de WhatsApp */}
          <button
            onClick={() => setIsModalCriarGrupoOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
            title="Criar novo grupo oficial de WhatsApp para qualquer líder ou bairro"
          >
            <Users className="w-4 h-4 text-indigo-200" />
            <span>Criar Grupo</span>
          </button>

          {/* Botão Atalho Gastos & Finanças */}
          <button
            onClick={() => setActiveTab('gastos')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
              activeTab === 'gastos'
                ? 'bg-amber-500 text-white border-amber-400 shadow-lg shadow-amber-500/25'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
            }`}
            title="Controle de Gastos & Prestação de Contas (Inserção manual e OCR por foto)"
          >
            <Receipt className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <span>Gastos</span>
          </button>

          {/* Botão LGPD */}
          <button
            onClick={() => {
              if (isMasked) {
                setShowUnmaskModal(true);
              } else {
                setIsMasked(true);
              }
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
              isMasked
                ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
            }`}
            title="Controle de Privacidade e Mascaramento LGPD"
          >
            {isMasked ? (
              <>
                <EyeOff className="w-4 h-4 text-cyan-400" />
                LGPD: Mascarado
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 text-rose-400" />
                LGPD: Visível
              </>
            )}
          </button>

          {/* Exportar PDF Stream */}
          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white dark:border-slate-600"
          >
            <FileDown className={`w-4 h-4 text-emerald-600 dark:text-emerald-400 ${isExportingPdf ? 'animate-bounce' : ''}`} />
            {isExportingPdf ? 'Gerando Stream...' : 'Baixar PDF'}
          </button>

          {/* Atualizar */}
          <button
            onClick={refreshData}
            className="p-2 rounded-lg transition-colors cursor-pointer bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 shadow-sm dark:bg-slate-800/80 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-white dark:border-slate-700"
            title="Atualizar Dados"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Alerta LGPD */}
      {unmaskAuditStatus && (
        <div className="px-4 py-2 bg-cyan-500/10 border-b border-cyan-500/30 text-cyan-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <span>{unmaskAuditStatus}</span>
        </div>
      )}

      {/* Navegação por Abas — Mobile-first: ícones + texto, scroll horizontal */}
      <nav className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-100/90 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-thin shrink-0">
        {(!currentUser || currentUser.permissoes.includes('COCKPIT')) && (
          <button
            onClick={() => setActiveTab('cockpit')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'cockpit'
                ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white font-bold shadow-sm border border-slate-200/90 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 font-medium'
            }`}
          >
            <Target className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span className="hidden sm:inline">Cockpit</span>
          </button>
        )}

        {(!currentUser || currentUser.permissoes.includes('ARVORE')) && (
          <button
            onClick={() => setActiveTab('arvore')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'arvore'
                ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white font-bold shadow-sm border border-slate-200/90 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 font-medium'
            }`}
          >
            <GitBranch className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span className="hidden sm:inline">Árvore</span>
          </button>
        )}

        {(!currentUser || currentUser.permissoes.includes('DISPAROS')) && (
          <button
            onClick={() => setActiveTab('disparos')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'disparos'
                ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white font-bold shadow-sm border border-slate-200/90 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 font-medium'
            }`}
          >
            <Send className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span className="hidden sm:inline">Disparos</span>
          </button>
        )}

        {(!currentUser || currentUser.permissoes.includes('CHAT')) && (
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'chat'
                ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 font-bold shadow-sm border border-emerald-300/80 dark:border-emerald-700/60'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 font-medium'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Chat ao Vivo</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          </button>
        )}

        {/* Nova aba: Materiais Online */}
        {(!currentUser || currentUser.role === 'ADMIN') && (
          <button
            onClick={() => setActiveTab('materiais')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'materiais'
                ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white font-bold shadow-sm border border-slate-200/90 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 font-medium'
            }`}
          >
            <BookOpen className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span className="hidden sm:inline">Materiais</span>
          </button>
        )}

        {/* Nova aba: Controle de Gastos & Finanças - Sempre visível com destaque */}
        <button
          onClick={() => setActiveTab('gastos')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'gastos'
              ? 'bg-amber-500 text-white font-bold shadow-md shadow-amber-500/25 border border-amber-400'
              : 'text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 hover:bg-amber-500/15 font-bold border border-amber-500/40 bg-amber-500/10'
          }`}
        >
          <Receipt className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span>Gastos & Finanças</span>
          <span className="px-1.5 py-0.5 text-[9px] font-black rounded-full bg-amber-500 text-white animate-pulse">NOVO</span>
        </button>

        {/* Nova aba: Config Bot */}
        {(!currentUser || currentUser.role === 'ADMIN') && (
          <button
            onClick={() => setActiveTab('bot')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'bot'
                ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white font-bold shadow-sm border border-slate-200/90 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 font-medium'
            }`}
          >
            <Settings className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Config Bot</span>
          </button>
        )}

        {/* Nova aba: Personalização da Campanha (White-Label) */}
        {(!currentUser || currentUser.role === 'ADMIN') && (
          <button
            onClick={() => setActiveTab('campanha')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'campanha'
                ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 font-bold shadow-sm border border-emerald-300/80 dark:border-emerald-700/60'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 font-medium'
            }`}
          >
            <Vote className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Personalizar Campanha</span>
          </button>
        )}

        {(!currentUser || currentUser.permissoes.includes('LGPD')) && (
          <button
            onClick={() => setActiveTab('lgpd')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'lgpd'
                ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white font-bold shadow-sm border border-slate-200/90 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 font-medium'
            }`}
          >
            <Shield className="w-4 h-4 text-indigo-600 dark:text-cyan-400" />
            <span className="hidden sm:inline">LGPD</span>
          </button>
        )}
      </nav>

      {/* Conteúdo da Aba Ativa */}
      <main className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'cockpit' && (
          <div className="h-full overflow-y-auto p-4 sm:p-6 max-w-7xl mx-auto">
            <ErrorBoundary fallbackTitle="Erro ao carregar o Cockpit de Metas">
              <CockpitMetas
                kpis={kpis}
                metas={metas}
                onOpenModalMeta={() => setIsModalMetaOpen(true)}
                onExportPdf={handleExportPdf}
                onOpenCreateGroup={(leader) => {
                  setSelectedLeaderForGroup(leader || null);
                  setIsModalCriarGrupoOpen(true);
                }}
                onOpenGastos={() => setActiveTab('gastos')}
              />
            </ErrorBoundary>
          </div>
        )}

        {activeTab === 'arvore' && (
          <div className="h-full overflow-y-auto p-4 sm:p-6 max-w-7xl mx-auto">
            <ErrorBoundary fallbackTitle="Erro ao renderizar a Árvore de Lideranças">
              <ArvoreLideranca
                nodes={treeNodes}
                isMasked={isMasked}
                onToggleMask={() => {
                  if (isMasked) setShowUnmaskModal(true);
                  else setIsMasked(true);
                }}
                apiBaseUrl={API_BASE_URL}
                onOpenCreateGroup={(leader) => {
                  setSelectedLeaderForGroup(leader || null);
                  setIsModalCriarGrupoOpen(true);
                }}
                onOpenChat={(contact) => {
                  setSelectedChatContact(contact);
                  setActiveTab('chat');
                }}
                onRefresh={refreshData}
              />
            </ErrorBoundary>
          </div>
        )}

        {activeTab === 'disparos' && (
          <div className="h-full overflow-y-auto p-4 sm:p-6 max-w-7xl mx-auto">
            <ErrorBoundary fallbackTitle="Erro ao carregar o Disparador">
              <DisparadorWhatsApp apiBaseUrl={API_BASE_URL} />
            </ErrorBoundary>
          </div>
        )}

        {/* Chat ao Vivo - ocupa 100% da altura disponível */}
        {activeTab === 'chat' && (
          <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-7rem)]">
            <ErrorBoundary fallbackTitle="Erro ao carregar o Chat ao Vivo">
              <ChatAoVivo
                apiBaseUrl={API_BASE_URL}
                currentUser={currentUser || { nome: 'Operador', role: 'ADMIN' }}
                initialContact={selectedChatContact}
              />
            </ErrorBoundary>
          </div>
        )}

        {/* Materiais Online */}
        {activeTab === 'materiais' && (
          <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-7rem)]">
            <ErrorBoundary fallbackTitle="Erro ao carregar Materiais Online">
              <MateriaisOnline apiBaseUrl={API_BASE_URL} />
            </ErrorBoundary>
          </div>
        )}

        {/* Controle de Gastos & Prestação de Contas */}
        {activeTab === 'gastos' && (
          <div className="h-full overflow-y-auto p-4 sm:p-6 max-w-7xl mx-auto">
            <ErrorBoundary fallbackTitle="Erro ao carregar o Controle de Gastos">
              <ControleGastos />
            </ErrorBoundary>
          </div>
        )}

        {/* Config Bot */}
        {activeTab === 'bot' && (
          <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-7rem)]">
            <ErrorBoundary fallbackTitle="Erro ao carregar Configuração do Bot">
              <ConfigBot apiBaseUrl={API_BASE_URL} />
            </ErrorBoundary>
          </div>
        )}

        {/* Personalização da Campanha (White-Label) */}
        {activeTab === 'campanha' && (
          <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-7rem)]">
            <ErrorBoundary fallbackTitle="Erro ao carregar Personalização da Campanha">
              <ConfigCampanha
                apiBaseUrl={API_BASE_URL}
                onConfigUpdated={(cfg) => setCampanha(cfg)}
              />
            </ErrorBoundary>
          </div>
        )}

        {activeTab === 'lgpd' && (
          <div className="h-full overflow-y-auto p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn">
            <div className="glass-panel rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-cyan-400" />
                  Trilha de Auditoria & Conformidade LGPD
                </h3>
                <span className="text-xs text-slate-400">
                  Registros imutáveis de ações críticas e desmascaramento
                </span>
              </div>

              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200">{log.acao}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-cyan-400 font-mono">
                          {log.usuario}
                        </span>
                      </div>
                      <p className="text-slate-400">{log.detalhes}</p>
                    </div>

                    <div className="text-right text-[11px] text-slate-500 font-mono">
                      <span>{log.data} • IP {log.ip}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal de Nova Meta */}
      <ModalMetas
        isOpen={isModalMetaOpen}
        onClose={() => setIsModalMetaOpen(false)}
        onSuccess={refreshData}
        apiBaseUrl={API_BASE_URL}
      />

      {/* Modal de Conexão WhatsApp & Simulador */}
      <ModalConectarWhatsApp
        isOpen={isModalWhatsAppOpen}
        onClose={() => setIsModalWhatsAppOpen(false)}
        apiBaseUrl={API_BASE_URL}
      />

      {/* Modal de QR Code do Comitê para novos Líderes */}
      <ModalQRCodeComite
        isOpen={isModalQRCodeComiteOpen}
        onClose={() => setIsModalQRCodeComiteOpen(false)}
        apiBaseUrl={API_BASE_URL}
      />

      {/* Modal de Gestão de Gestores e Administradores de Grupos */}
      <ModalGestores
        isOpen={isModalGestoresOpen}
        onClose={() => setIsModalGestoresOpen(false)}
        apiBaseUrl={API_BASE_URL}
      />

      {/* Modal de Gestão de Logins e Acessos ao Sistema (RBAC) */}
      <ModalUsuariosAuth
        isOpen={isModalUsuariosAuthOpen}
        onClose={() => setIsModalUsuariosAuthOpen(false)}
        apiBaseUrl={API_BASE_URL}
      />

      {/* Modal de Novo Cadastro Manual (Líder, Gestor, Apoiador, Voluntário) */}
      <ModalNovoCadastro
        isOpen={isModalNovoCadastroOpen}
        onClose={() => setIsModalNovoCadastroOpen(false)}
        lideresDisponiveis={treeNodes}
        onSuccess={refreshData}
      />

      {/* Modal de Criação de Grupo Oficial de WhatsApp */}
      <ModalCriarGrupo
        isOpen={isModalCriarGrupoOpen}
        onClose={() => {
          setIsModalCriarGrupoOpen(false);
          setSelectedLeaderForGroup(null);
        }}
        apiBaseUrl={API_BASE_URL}
        initialLeader={selectedLeaderForGroup}
        onGroupCreated={refreshData}
      />

      {/* Modal de Confirmação de Desmascaramento LGPD */}
      {showUnmaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md glass-dropdown rounded-2xl p-6 border border-rose-500/40 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Desmascaramento de Dados LGPD</h3>
                <p className="text-[11px] text-slate-400">Esta ação será registrada na trilha de auditoria legal.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Você está prestes a exibir os números de WhatsApp completos de todos os líderes e eleitores cadastrados.
              Por favor, justifique o motivo operacional:
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Motivo do Acesso</label>
              <textarea
                rows={2}
                placeholder="Ex: Auditoria de contatos para mobilização de comitê..."
                value={unmaskReason}
                onChange={(e) => setUnmaskReason(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowUnmaskModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                onClick={handleConfirmUnmask}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
              >
                Confirmar & Desmascarar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
