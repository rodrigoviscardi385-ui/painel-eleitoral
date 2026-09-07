import React, { useState } from 'react';
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
  MoreHorizontal,
  ChevronRight,
  LogOut,
  Calculator,
  Radio,
  Scale,
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
  currentUser?: any;
  onLogout?: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
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
  currentUser,
  onLogout,
  theme = 'dark',
  onToggleTheme,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isOnline = wppStatus?.status === 'CONNECTED';
  const isQrReady = wppStatus?.status === 'QR_READY';

  const navTabs = [
    // 🎯 ESTRATÉGIA ELEITORAL
    { id: 'cockpit', label: 'Cockpit Geral', icon: Activity, category: 'ESTRATEGIA' },
    { id: 'simulador', label: 'Simulador QE/QP', icon: Calculator, category: 'ESTRATEGIA' },
    { id: 'warroom', label: 'War Room Dia D', icon: Radio, category: 'ESTRATEGIA' },
    { id: 'apuracao', label: '🗳️ Apuração BU', icon: Vote, category: 'ESTRATEGIA' },
    // 👥 OPERAÇÃO DE CAMPO & REDE
    { id: 'liderancas', label: 'Lideranças & Rede', icon: Users, category: 'CAMPO' },
    { id: 'materiais', label: 'Acervo Digital', icon: FolderOpen, category: 'CAMPO' },
    // 💬 COMUNICAÇÃO & MENSAGERIA
    { id: 'chat', label: 'Chat WhatsApp', icon: MessageSquare, category: 'COMMS' },
    { id: 'disparos', label: 'Disparos', icon: Send, category: 'COMMS' },
    { id: 'bot', label: 'Robô & Menus', icon: Bot, category: 'COMMS' },
    // ⚖️ GOVERNANÇA & ADM
    { id: 'gastos', label: 'Controle TSE Gastos', icon: DollarSign, category: 'GOV' },
    { id: 'antiban', label: 'Tiers Meta API', icon: ShieldAlert, category: 'GOV' },
    { id: 'config', label: 'Candidato & IA', icon: Sliders, category: 'GOV' },
    ...(currentUser?.role === 'ADMIN' ? [{ id: 'adm', label: 'Painel ADM', icon: ShieldCheck, category: 'GOV' }] : []),
  ];

  // Abas principais para a barra inferior móvel
  const mobilePrimaryTabs = [
    { id: 'cockpit', label: 'Cockpit', icon: Activity },
    { id: 'warroom', label: 'Dia D', icon: Radio },
    { id: 'liderancas', label: 'Rede', icon: Users },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'apuracao', label: 'Apuração', icon: Vote },
  ];

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header
        style={{
          borderBottom: '1px solid var(--border-color)',
          background: theme === 'light' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(11, 15, 23, 0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          transition: 'background-color 0.2s ease, border-color 0.2s ease',
        }}
      >
        <div
          style={{
            maxWidth: '1440px',
            margin: '0 auto',
            padding: '10px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {/* Linha Superior: Marca, Ações Rápidas de Gestão e Modais */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            {/* Identidade do Candidato */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              {candidate?.foto_url ? (
                <img
                  src={candidate.foto_url}
                  alt={candidate.nome_urna}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    objectFit: 'cover',
                    border: '2px solid var(--primary)',
                    boxShadow: '0 2px 10px var(--primary-glow)',
                    flexShrink: 0,
                  }}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px var(--primary-glow)',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '16px',
                    flexShrink: 0,
                  }}
                >
                  {candidate?.nome_urna?.charAt(0) || <Sparkles size={20} />}
                </div>
              )}

              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
                  <span
                    style={{
                      fontSize: '16px',
                      fontWeight: 800,
                      letterSpacing: '-0.02em',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {candidate?.nome_urna || 'Gustavo Reis'}
                  </span>
                  <span
                    className="badge"
                    style={{
                      background: 'var(--primary-light)',
                      color: 'var(--primary)',
                      border: '1px solid var(--primary)',
                      padding: '2px 8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {candidate?.numero_candidato || '55955'} • {candidate?.partido || 'PSD'}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {candidate?.cargo || 'Deputado Federal'} • {candidate?.cidade || 'Santos'} / {candidate?.estado || 'SP'}
                </div>
              </div>
            </div>

            {/* Ações Desktop */}
            <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Alternador de Tema Claro / Escuro */}
              {onToggleTheme && (
                <button
                  onClick={onToggleTheme}
                  className="btn btn-secondary"
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    height: '34px',
                    borderRadius: 'var(--radius-md)',
                  }}
                  title={`Alternar para ${theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}`}
                >
                  {theme === 'dark' ? (
                    <>
                      <Sun size={15} color="#f59e0b" />
                      <span>Modo Claro</span>
                    </>
                  ) : (
                    <>
                      <Moon size={15} color="#6366f1" />
                      <span>Modo Escuro</span>
                    </>
                  )}
                </button>
              )}

              <button
                onClick={onOpenPosterModal}
                className="btn btn-secondary"
                style={{ padding: '6px 10px', fontSize: '11px', height: '34px' }}
                title="Gerar Cartaz com QR Code para imprimir no comitê"
              >
                <Printer size={14} />
                <span>Cartaz QR</span>
              </button>

              <button
                onClick={onOpenGroupModal}
                className="btn btn-secondary"
                style={{ padding: '6px 10px', fontSize: '11px', height: '34px' }}
                title="Criar novo grupo de base no WhatsApp para liderança"
              >
                <UsersRound size={14} />
                <span>Criar Grupo</span>
              </button>

              {currentUser?.role === 'ADMIN' && (
                <>
                  <button
                    onClick={onOpenManagersModal}
                    className="btn btn-secondary"
                    style={{ padding: '6px 10px', fontSize: '11px', height: '34px' }}
                    title="Gerenciar coordenadores e administradores de grupos"
                  >
                    <Users size={14} />
                    <span>Gestores</span>
                  </button>

                  <button
                    onClick={onOpenAuthModal}
                    className="btn btn-secondary"
                    style={{ padding: '6px 10px', fontSize: '11px', height: '34px' }}
                    title="Gerenciar acessos RBAC e contas do sistema"
                  >
                    <UserCog size={14} />
                    <span>Acessos</span>
                  </button>

                  <button
                    onClick={onOpenBackupModal}
                    className="btn btn-secondary"
                    style={{ padding: '6px 11px', fontSize: '11px', height: '34px' }}
                    title="Central de Backup, Exportação Excel/JSON e Importação"
                  >
                    <Database size={14} color="var(--primary)" />
                    <span>Backup</span>
                  </button>
                </>
              )}

              {/* Status WhatsApp */}
              <button
                onClick={onOpenQrModal}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '11px', height: '34px' }}
                title="Gerenciar Conexão WhatsApp Oficial da Meta"
              >
                <span className={`status-pulse ${isOnline ? 'online' : 'offline'}`}></span>
                <QrCode size={14} />
                <span>{isOnline ? 'WhatsApp Oficial Ativo' : isQrReady ? 'Conectar' : 'WhatsApp'}</span>
              </button>

              {/* Toggle LGPD */}
              <button
                onClick={onToggleLGPD}
                className="btn btn-secondary"
                style={{
                  padding: '6px 10px',
                  fontSize: '11px',
                  height: '34px',
                  borderColor: maskLGPD ? 'var(--primary)' : 'var(--border-color)',
                  color: maskLGPD ? 'var(--primary)' : 'var(--text-secondary)',
                }}
                title="Anonimização e Auditoria LGPD"
              >
                <ShieldCheck size={14} />
                <span>LGPD: {maskLGPD ? 'Ativo' : 'Off'}</span>
              </button>

              {/* Checklist e Consultoria TSE */}
              {onOpenComplianceModal && (
                <button
                  onClick={onOpenComplianceModal}
                  className="btn btn-secondary"
                  style={{
                    padding: '6px 11px',
                    fontSize: '11px',
                    height: '34px',
                    borderColor: 'rgba(16, 185, 129, 0.3)',
                    color: '#34d399',
                  }}
                  title="Checklist e Diretrizes de Compliance Eleitoral TSE"
                >
                  <Scale size={14} />
                  <span>Compliance TSE</span>
                </button>
              )}

              {/* Download Relatório PDF */}
              <a
                href={api.getRelatorioPdfUrl()}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
                style={{ padding: '6px 12px', fontSize: '11px', height: '34px', textDecoration: 'none' }}
                title="Download do Relatório Executivo Estratégico em PDF"
              >
                <FileDown size={14} />
                <span>Relatório PDF</span>
              </a>

              {/* Usuário Logado & Sair */}
              {currentUser && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '4px', borderLeft: '1px solid var(--border-color)', paddingLeft: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.2 }}>
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>
                      {currentUser.nome || currentUser.login}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 700 }}>
                      {currentUser.role || 'ADMIN'}
                    </span>
                  </div>
                  {onLogout && (
                    <button
                      onClick={onLogout}
                      className="btn btn-secondary"
                      style={{ padding: '6px 8px', fontSize: '11px', height: '34px', color: '#ef4444' }}
                      title="Sair do painel"
                    >
                      <LogOut size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Ações Mobile (Topo em Telas Pequenas) */}
            <div className="mobile-only" style={{ display: 'none', alignItems: 'center', gap: '8px' }}>
              {onToggleTheme && (
                <button
                  onClick={onToggleTheme}
                  className="btn btn-secondary"
                  style={{ padding: '6px 10px', height: '36px', borderRadius: '8px' }}
                  title="Alternar Tema"
                >
                  {theme === 'dark' ? <Sun size={16} color="#f59e0b" /> : <Moon size={16} color="#6366f1" />}
                </button>
              )}

              <button
                onClick={onOpenQrModal}
                className="btn btn-secondary"
                style={{ padding: '6px 10px', height: '36px', borderRadius: '8px' }}
                title="Status WhatsApp"
              >
                <span className={`status-pulse ${isOnline ? 'online' : 'offline'}`}></span>
              </button>

              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="btn btn-primary"
                style={{ padding: '6px 10px', height: '36px', borderRadius: '8px' }}
                title="Menu Completo"
              >
                {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>

          {/* Linha Inferior: Abas de Navegação Desktop */}
          <nav
            className="desktop-only"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              overflowX: 'auto',
            }}
          >
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 13px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: isActive ? 'var(--primary)' : 'transparent',
                    color: isActive ? '#ffffff' : 'var(--text-secondary)',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: '12px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Drawer Móvel de Ações & Menu Completo */}
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
              maxWidth: '100%',
              height: '85vh',
              maxHeight: '85vh',
              borderRadius: '24px 24px 0 0',
              padding: '24px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              animation: 'modal-fade-in 0.25s ease-out',
            }}
          >
            {/* Header do Drawer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '18px', margin: 0 }}>Menu da Campanha</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {candidate?.nome_urna} • {candidate?.numero_candidato}
                </span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="btn btn-secondary"
                style={{ padding: '6px 10px', height: '36px', borderRadius: '50%' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Ações Rápidas no Celular */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <button
                onClick={() => {
                  onOpenPosterModal();
                  setIsMobileMenuOpen(false);
                }}
                className="btn btn-secondary"
                style={{ padding: '10px', fontSize: '12px', justifyContent: 'flex-start' }}
              >
                <Printer size={16} color="var(--primary)" />
                <span>Cartaz QR</span>
              </button>

              <button
                onClick={() => {
                  onOpenGroupModal();
                  setIsMobileMenuOpen(false);
                }}
                className="btn btn-secondary"
                style={{ padding: '10px', fontSize: '12px', justifyContent: 'flex-start' }}
              >
                <UsersRound size={16} color="var(--primary)" />
                <span>Criar Grupo</span>
              </button>

              <button
                onClick={() => {
                  onOpenQrModal();
                  setIsMobileMenuOpen(false);
                }}
                className="btn btn-secondary"
                style={{ padding: '10px', fontSize: '12px', justifyContent: 'flex-start' }}
              >
                <QrCode size={16} color="var(--primary)" />
                <span>WhatsApp API</span>
              </button>

              <a
                href={api.getRelatorioPdfUrl()}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
                style={{ padding: '10px', fontSize: '12px', justifyContent: 'flex-start', textDecoration: 'none' }}
              >
                <FileDown size={16} color="var(--primary)" />
                <span>Relatório PDF</span>
              </a>

              {currentUser?.role === 'ADMIN' && (
                <>
                  <button
                    onClick={() => {
                      onOpenBackupModal();
                      setIsMobileMenuOpen(false);
                    }}
                    className="btn btn-secondary"
                    style={{ padding: '10px', fontSize: '12px', justifyContent: 'flex-start' }}
                  >
                    <Database size={16} color="var(--primary)" />
                    <span>Backup & Dados</span>
                  </button>

                  <button
                    onClick={() => {
                      onOpenManagersModal();
                      setIsMobileMenuOpen(false);
                    }}
                    className="btn btn-secondary"
                    style={{ padding: '10px', fontSize: '12px', justifyContent: 'flex-start' }}
                  >
                    <Users size={16} color="var(--primary)" />
                    <span>Gestores ADM</span>
                  </button>
                </>
              )}
            </div>

            {/* Lista Completa de Módulos da Campanha */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '6px' }}>
                Módulos do Sistema
              </span>
              {navTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: isActive ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                      background: isActive ? 'var(--primary-light)' : 'transparent',
                      color: isActive ? 'var(--primary)' : 'var(--text-primary)',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '14px',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Icon size={18} />
                      <span>{tab.label}</span>
                    </div>
                    <ChevronRight size={16} color="var(--text-muted)" />
                  </button>
                );
              })}
            </div>

            {/* Rodapé do Drawer com Usuário e Logout */}
            {currentUser && onLogout && (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>{currentUser.nome}</span>
                  <span style={{ display: 'block', fontSize: '11px', color: 'var(--primary)' }}>{currentUser.role}</span>
                </div>
                <button
                  onClick={onLogout}
                  className="btn btn-secondary"
                  style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', padding: '8px 14px' }}
                >
                  <LogOut size={16} />
                  <span>Sair</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Barra de Navegação Inferior Móvel Fixa (Padrão WhatsApp / App Nativo) */}
      <div className="mobile-bottom-nav mobile-only">
        {mobilePrimaryTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`mobile-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} />
              <span>{tab.label}</span>
            </button>
          );
        })}

        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className={`mobile-nav-item ${isMobileMenuOpen ? 'active' : ''}`}
        >
          <MoreHorizontal size={22} />
          <span>Mais...</span>
        </button>
      </div>
    </>
  );
};
