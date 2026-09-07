import React, { useState, useRef, useEffect } from 'react';
import {
  Activity,
  QrCode,
  FileDown,
  ShieldCheck,
  Users,
  MessageSquare,
  DollarSign,
  Send,
  Sliders,
  Sparkles,
  FolderOpen,
  Bot,
  ShieldAlert,
  Printer,
  UsersRound,
  UserCog,
  Database,
  Vote,
  Sun,
  Moon,
  Menu,
  X,
  Plus,
  ChevronDown,
  LogOut,
  Calculator,
  Radio,
  Scale,
  UserPlus,
  PlusCircle,
  LayoutDashboard,
  TrendingUp,
} from 'lucide-react';
import { api } from '../api.ts';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  wppStatus: any;
  onOpenQrModal: () => void;
  maskLGPD: boolean;
  onToggleLGPD: () => void;
  candidate: any;
  onOpenPosterModal: () => void;
  onOpenGroupModal: () => void;
  onOpenManagersModal: () => void;
  onOpenAuthModal: () => void;
  onOpenBackupModal: () => void;
  onOpenComplianceModal?: () => void;
  onOpenNewLeader?: () => void;
  onOpenNewExpense?: () => void;
  onOpenNewMeta?: () => void;
  currentUser?: any;
  onLogout?: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

interface HubItem {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  defaultTab: string;
  subTabs: { id: string; label: string; icon: React.ElementType }[];
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  wppStatus,
  onOpenQrModal,
  maskLGPD,
  onToggleLGPD,
  candidate,
  onOpenPosterModal,
  onOpenGroupModal,
  onOpenManagersModal,
  onOpenAuthModal,
  onOpenBackupModal,
  onOpenComplianceModal,
  onOpenNewLeader,
  onOpenNewExpense,
  onOpenNewMeta,
  currentUser,
  onLogout,
  theme = 'dark',
  onToggleTheme,
}) => {
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const actionsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const isOnline = wppStatus?.status === 'CONNECTED';
  const isQrReady = wppStatus?.status === 'QR_READY';

  // Fechar dropdowns ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
        setIsActionsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ─── 5 HUBS ESTRATÉGICOS MINIMALISTAS ────────────────────────────────────────
  const hubs: HubItem[] = [
    {
      id: 'cockpit',
      label: 'Visão Geral',
      shortLabel: 'Geral',
      icon: LayoutDashboard,
      defaultTab: 'cockpit',
      subTabs: [],
    },
    {
      id: 'rede',
      label: 'Mobilização & Rede',
      shortLabel: 'Mobilização',
      icon: Users,
      defaultTab: 'liderancas',
      subTabs: [
        { id: 'liderancas', label: 'Árvore de Lideranças', icon: Users },
        { id: 'materiais', label: 'Acervo Digital', icon: FolderOpen },
      ],
    },
    {
      id: 'comunicacao',
      label: 'Comunicação',
      shortLabel: 'Comunicação',
      icon: MessageSquare,
      defaultTab: 'chat',
      subTabs: [
        { id: 'chat', label: 'Chat WhatsApp', icon: MessageSquare },
        { id: 'disparos', label: 'Disparos em Massa', icon: Send },
        { id: 'bot', label: 'Robô & Menus IA', icon: Bot },
      ],
    },
    {
      id: 'eleicao',
      label: 'Dia D & Apuração',
      shortLabel: 'Dia D',
      icon: Vote,
      defaultTab: 'warroom',
      subTabs: [
        { id: 'warroom', label: 'War Room Dia D', icon: Radio },
        { id: 'apuracao', label: 'Apuração BU', icon: Vote },
        { id: 'simulador', label: 'Simulador QE/QP', icon: Calculator },
      ],
    },
    {
      id: 'governanca',
      label: 'Governança & TSE',
      shortLabel: 'Governança',
      icon: ShieldCheck,
      defaultTab: 'gastos',
      subTabs: [
        { id: 'gastos', label: 'Controle de Gastos', icon: DollarSign },
        { id: 'antiban', label: 'Tiers Meta API', icon: ShieldAlert },
        { id: 'config', label: 'Candidato & IA', icon: Sliders },
        ...(currentUser?.role === 'ADMIN' ? [{ id: 'adm', label: 'Painel ADM', icon: ShieldCheck }] : []),
      ],
    },
  ];

  // Identificar qual Hub está ativo com base na tab selecionada
  const activeHub = hubs.find(
    (h) => h.id === activeTab || h.defaultTab === activeTab || h.subTabs.some((s) => s.id === activeTab)
  ) || hubs[0];

  const handleSelectHub = (hub: HubItem) => {
    setActiveTab(hub.defaultTab);
  };

  return (
    <>
      <header
        style={{
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-card)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          transition: 'background-color 0.25s ease, border-color 0.25s ease',
        }}
      >
        <div
          style={{
            maxWidth: '1440px',
            margin: '0 auto',
            padding: '8px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {/* Linha Principal: Identidade + Hubs Principais + Ações Utilitárias */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', minWidth: 0, width: '100%' }}>
            
            {/* Identidade do Candidato / Logotipo (Protegido contra compressão) */}
            <div
              className="header-brand-box"
              onClick={() => setActiveTab('cockpit')}
              title="Ir para o Cockpit Geral"
            >
              {candidate?.foto_url ? (
                <img
                  src={candidate.foto_url}
                  alt={candidate.nome_urna}
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    objectFit: 'cover',
                    border: '1.5px solid var(--primary)',
                    boxShadow: '0 2px 8px var(--primary-glow)',
                    flexShrink: 0,
                  }}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px var(--primary-glow)',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '15px',
                    flexShrink: 0,
                  }}
                >
                  {candidate?.nome_urna?.charAt(0) || <Sparkles size={18} />}
                </div>
              )}

              <div style={{ flexShrink: 0, lineHeight: 1.25 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="header-brand-name">
                    {candidate?.nome_urna || 'Gustavo Reis'}
                  </span>
                  <span
                    className="badge badge-verde"
                    style={{ padding: '2px 7px', fontSize: '11px', fontWeight: 700 }}
                  >
                    {candidate?.numero_candidato || '55955'}
                  </span>
                </div>
                <div className="header-brand-sub">
                  {candidate?.partido || 'PSD'} • {candidate?.cargo || 'Deputado Estadual'}
                </div>
              </div>
            </div>

            {/* 5 HUBS PRINCIPAIS (DESKTOP) */}
            <nav className="desktop-only nav-hubs-bar">
              {hubs.map((hub) => {
                const Icon = hub.icon;
                const isHubActive = activeHub.id === hub.id;
                return (
                  <button
                    key={hub.id}
                    onClick={() => handleSelectHub(hub)}
                    className={`nav-hub-btn ${isHubActive ? 'active' : ''}`}
                    title={hub.label}
                  >
                    <Icon size={15} style={{ flexShrink: 0 }} />
                    <span className="nav-label-full">{hub.label}</span>
                    <span className="nav-label-short">{hub.shortLabel}</span>
                  </button>
                );
              })}
            </nav>

            {/* AÇÕES UTILITÁRIAS & PERFIL (DIREITA) */}
            <div className="desktop-only nav-actions-bar">
              
              {/* WhatsApp Status Pill */}
              <button
                onClick={onOpenQrModal}
                className="btn btn-secondary btn-sm"
                style={{
                  gap: '6px',
                  borderRadius: 'var(--radius-full)',
                  borderColor: isOnline ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)',
                  background: isOnline ? 'var(--primary-light)' : undefined,
                  color: isOnline ? 'var(--primary)' : 'var(--text-secondary)',
                  padding: '5px 11px',
                  flexShrink: 0,
                }}
                title="Status da Conexão com WhatsApp"
              >
                <span className={`status-pulse ${isOnline ? 'online' : isQrReady ? 'warning' : 'offline'}`} />
                <QrCode size={13} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '12px', fontWeight: 600 }}>
                  {isOnline ? (
                    <>
                      <span className="action-label-full">WhatsApp Conectado</span>
                      <span className="action-label-short">WhatsApp</span>
                    </>
                  ) : isQrReady ? (
                    'Escanear QR'
                  ) : (
                    'WhatsApp'
                  )}
                </span>
              </button>

              {/* LGPD Privacy Switch */}
              <button
                onClick={onToggleLGPD}
                className="btn btn-secondary btn-sm"
                style={{
                  gap: '6px',
                  borderRadius: 'var(--radius-full)',
                  borderColor: maskLGPD ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)',
                  color: maskLGPD ? 'var(--primary)' : 'var(--text-secondary)',
                  padding: '5px 11px',
                  flexShrink: 0,
                }}
                title={maskLGPD ? 'Dados anonimizados por padrão LGPD' : 'Dados abertos (Auditado)'}
              >
                <ShieldCheck size={14} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '12px' }}>
                  <span className="action-label-full">LGPD: {maskLGPD ? 'Ativo' : 'Off'}</span>
                  <span className="action-label-short">{maskLGPD ? 'LGPD' : 'LGPD Off'}</span>
                </span>
              </button>

              {/* Botão + Nova Ação (Dropdown Minimalista) */}
              <div ref={actionsRef} style={{ position: 'relative', flexShrink: 0 }}>
                <button
                  onClick={() => setIsActionsOpen(!isActionsOpen)}
                  className="btn btn-primary btn-sm"
                  style={{ borderRadius: 'var(--radius-full)', gap: '5px', padding: '5px 12px' }}
                  title="Criar nova ação ou registrar dado"
                >
                  <Plus size={15} style={{ flexShrink: 0 }} />
                  <span className="action-label-full">Nova Ação</span>
                  <span className="action-label-short">+ Ação</span>
                  <ChevronDown size={13} style={{ opacity: 0.8 }} />
                </button>

                {isActionsOpen && (
                  <div className="dropdown-menu">
                    <div style={{ padding: '6px 10px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Atalhos Rápidos
                    </div>
                    {onOpenNewLeader && (
                      <button
                        className="dropdown-item"
                        onClick={() => {
                          setIsActionsOpen(false);
                          onOpenNewLeader();
                        }}
                      >
                        <UserPlus size={15} color="var(--primary)" />
                        <span>Cadastrar Líder</span>
                      </button>
                    )}
                    {onOpenNewExpense && (
                      <button
                        className="dropdown-item"
                        onClick={() => {
                          setIsActionsOpen(false);
                          onOpenNewExpense();
                        }}
                      >
                        <DollarSign size={15} color="#3b82f6" />
                        <span>Lançar Despesa TSE</span>
                      </button>
                    )}
                    {onOpenNewMeta && (
                      <button
                        className="dropdown-item"
                        onClick={() => {
                          setIsActionsOpen(false);
                          onOpenNewMeta();
                        }}
                      >
                        <PlusCircle size={15} color="#f59e0b" />
                        <span>Nova Meta de Votos</span>
                      </button>
                    )}
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setIsActionsOpen(false);
                        onOpenGroupModal();
                      }}
                    >
                      <UsersRound size={15} color="#8b5cf6" />
                      <span>Criar Grupo WhatsApp</span>
                    </button>
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setIsActionsOpen(false);
                        onOpenPosterModal();
                      }}
                    >
                      <Printer size={15} color="var(--text-secondary)" />
                      <span>Cartaz QR para Comitê</span>
                    </button>
                    <div className="dropdown-divider" />
                    <a
                      href={api.getRelatorioPdfUrl()}
                      target="_blank"
                      rel="noreferrer"
                      className="dropdown-item"
                      onClick={() => setIsActionsOpen(false)}
                    >
                      <FileDown size={15} color="var(--primary)" />
                      <span>Exportar Relatório PDF</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Alternador de Tema (Sun/Moon) */}
              {onToggleTheme && (
                <button
                  onClick={onToggleTheme}
                  className="btn btn-secondary btn-icon"
                  style={{ width: '34px', height: '34px' }}
                  title={`Alternar para ${theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}`}
                >
                  {theme === 'dark' ? <Sun size={15} color="#f59e0b" /> : <Moon size={15} color="#6366f1" />}
                </button>
              )}

              {/* Menu de Perfil / Conta do Usuário */}
              <div ref={profileRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px',
                    borderRadius: 'var(--radius-full)',
                  }}
                  title="Menu da Conta"
                >
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--bg-hover)',
                      border: '1.5px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                    }}
                  >
                    {currentUser?.nome?.charAt(0) || currentUser?.login?.charAt(0) || 'U'}
                  </div>
                </button>

                {isProfileOpen && (
                  <div className="dropdown-menu" style={{ width: '230px' }}>
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)' }}>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
                        {currentUser?.nome || currentUser?.login || 'Operador'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 600 }}>
                        {currentUser?.role || 'ADMIN'}
                      </div>
                    </div>

                    {onOpenComplianceModal && (
                      <button
                        className="dropdown-item"
                        onClick={() => {
                          setIsProfileOpen(false);
                          onOpenComplianceModal();
                        }}
                      >
                        <Scale size={14} color="#10b981" />
                        <span>Compliance Eleitoral TSE</span>
                      </button>
                    )}

                    {currentUser?.role === 'ADMIN' && (
                      <>
                        <button
                          className="dropdown-item"
                          onClick={() => {
                            setIsProfileOpen(false);
                            onOpenManagersModal();
                          }}
                        >
                          <Users size={14} />
                          <span>Gestores Regionais</span>
                        </button>
                        <button
                          className="dropdown-item"
                          onClick={() => {
                            setIsProfileOpen(false);
                            onOpenAuthModal();
                          }}
                        >
                          <UserCog size={14} />
                          <span>Contas & Permissões</span>
                        </button>
                        <button
                          className="dropdown-item"
                          onClick={() => {
                            setIsProfileOpen(false);
                            onOpenBackupModal();
                          }}
                        >
                          <Database size={14} color="var(--primary)" />
                          <span>Central de Backup</span>
                        </button>
                      </>
                    )}

                    <div className="dropdown-divider" />
                    {onLogout && (
                      <button
                        className="dropdown-item"
                        onClick={() => {
                          setIsProfileOpen(false);
                          onLogout();
                        }}
                        style={{ color: 'var(--danger)' }}
                      >
                        <LogOut size={14} />
                        <span>Sair do Sistema</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Header Icons */}
            <div className="mobile-only" style={{ alignItems: 'center', gap: '8px' }}>
              <button
                onClick={onOpenQrModal}
                className="btn btn-secondary btn-icon"
                style={{
                  width: '36px',
                  height: '36px',
                  borderColor: isOnline ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-color)',
                  color: isOnline ? 'var(--primary)' : 'var(--text-secondary)',
                }}
                title={isOnline ? 'WhatsApp Conectado' : 'Conectar WhatsApp'}
              >
                <QrCode size={16} />
              </button>

              {onToggleTheme && (
                <button
                  onClick={onToggleTheme}
                  className="btn btn-secondary btn-icon"
                  style={{ width: '36px', height: '36px' }}
                >
                  {theme === 'dark' ? <Sun size={16} color="#f59e0b" /> : <Moon size={16} color="#6366f1" />}
                </button>
              )}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="btn btn-primary btn-icon"
                style={{ width: '36px', height: '36px' }}
              >
                {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>

          {/* Sub-Pills Contextuais (aparece quando o Hub ativo possui sub-abas) */}
          {activeHub.subTabs.length > 0 && (
            <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', paddingTop: '2px' }}>
              <div className="sub-pill-container">
                {activeHub.subTabs.map((sub) => {
                  const SubIcon = sub.icon;
                  const isSubActive = activeTab === sub.id;
                  return (
                    <button
                      key={sub.id}
                      onClick={() => setActiveTab(sub.id)}
                      className={`sub-pill-btn ${isSubActive ? 'active' : ''}`}
                    >
                      <SubIcon size={13} />
                      <span>{sub.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Drawer Móvel de Menu Completo */}
      {isMobileMenuOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setIsMobileMenuOpen(false)}
          style={{ zIndex: 1000, padding: 0 }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxHeight: '85vh',
              borderRadius: '20px 20px 0 0',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '16px', margin: 0 }}>Navegação da Campanha</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {candidate?.nome_urna} • {candidate?.numero_candidato}
                </span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="btn btn-secondary btn-icon"
                style={{ width: '32px', height: '32px' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Lista dos 5 Hubs e Sub-abas no Celular */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
              {hubs.map((hub) => {
                const HubIcon = hub.icon;
                return (
                  <div key={hub.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      <HubIcon size={14} color="var(--primary)" />
                      <span>{hub.label}</span>
                    </div>

                    {hub.subTabs.length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        {hub.subTabs.map((sub) => {
                          const SubIcon = sub.icon;
                          const isSubActive = activeTab === sub.id;
                          return (
                            <button
                              key={sub.id}
                              onClick={() => {
                                setActiveTab(sub.id);
                                setIsMobileMenuOpen(false);
                              }}
                              className={`btn ${isSubActive ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                              style={{ justifyContent: 'flex-start' }}
                            >
                              <SubIcon size={14} />
                              <span>{sub.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setActiveTab(hub.defaultTab);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`btn ${activeTab === hub.defaultTab ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                        style={{ justifyContent: 'flex-start' }}
                      >
                        <HubIcon size={14} />
                        <span>Visão Geral</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Logout Mobile */}
            {onLogout && (
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onLogout();
                }}
                className="btn btn-danger btn-sm"
                style={{ marginTop: 'auto' }}
              >
                <LogOut size={14} />
                <span>Sair do Painel</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Barra de Navegação Inferior Móvel (Atalhos Essenciais) */}
      <div className="mobile-bottom-nav mobile-only">
        <button
          onClick={() => setActiveTab('cockpit')}
          className={`mobile-nav-item ${activeTab === 'cockpit' ? 'active' : ''}`}
        >
          <LayoutDashboard size={20} />
          <span>Início</span>
        </button>
        <button
          onClick={() => setActiveTab('liderancas')}
          className={`mobile-nav-item ${activeTab === 'liderancas' || activeTab === 'materiais' ? 'active' : ''}`}
        >
          <Users size={20} />
          <span>Rede</span>
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`mobile-nav-item ${activeTab === 'chat' || activeTab === 'disparos' ? 'active' : ''}`}
        >
          <MessageSquare size={20} />
          <span>Chat</span>
        </button>
        <button
          onClick={() => setActiveTab('warroom')}
          className={`mobile-nav-item ${activeTab === 'warroom' || activeTab === 'apuracao' ? 'active' : ''}`}
        >
          <Vote size={20} />
          <span>Dia D</span>
        </button>
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="mobile-nav-item"
        >
          <Menu size={20} />
          <span>Menu</span>
        </button>
      </div>
    </>
  );
};
