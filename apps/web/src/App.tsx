import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { CockpitSpeedometer } from './components/CockpitSpeedometer.tsx';
import { LeadershipTree } from './components/LeadershipTree.tsx';
import { LiveChat } from './components/LiveChat.tsx';
import { ExpensesTracker } from './components/ExpensesTracker.tsx';
import { CampaignBroadcast } from './components/CampaignBroadcast.tsx';
import { CandidateConfig } from './components/CandidateConfig.tsx';
import { WhatsAppModal } from './components/WhatsAppModal.tsx';
import { MateriaisOnline } from './components/MateriaisOnline.tsx';
import { ConfigBot } from './components/ConfigBot.tsx';
import { AquecedorChipAntiBan } from './components/AquecedorChipAntiBan.tsx';
import {
  NewLeaderModal,
  NewMetaModal,
  NewExpenseModal,
  ModalQRCodeComite,
  ModalCriarGrupo,
  ModalGestores,
  ModalUsuariosAuth,
  ModalLGPD,
  ModalEditarLideranca,
  ModalConfirmarExclusao,
  ModalBackup,
  ModalRetiradaMaterial,
} from './components/Modals.tsx';
import { LoginPage } from './components/LoginPage.tsx';
import { AdminPage } from './components/AdminPage.tsx';
import { ApuracaoBU } from './components/ApuracaoBU.tsx';
import { QuocienteEleitoralSimulator } from './components/QuocienteEleitoralSimulator.tsx';
import { WarRoomDiaD } from './components/WarRoomDiaD.tsx';
import { ComplianceTSEModal } from './components/ComplianceTSEModal.tsx';
import { api } from './api.ts';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('cockpit');
  const [maskLGPD, setMaskLGPD] = useState(true); // Mascarado por padrão por segurança LGPD
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // Modais de Criação e Gestão
  const [isNewLeaderOpen, setIsNewLeaderOpen] = useState(false);
  const [isNewMetaOpen, setIsNewMetaOpen] = useState(false);
  const [isNewExpenseOpen, setIsNewExpenseOpen] = useState(false);
  const [isPosterOpen, setIsPosterOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupModalLeaderId, setGroupModalLeaderId] = useState<string | undefined>(undefined);
  const [isManagersModalOpen, setIsManagersModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLgpdModalOpen, setIsLgpdModalOpen] = useState(false);
  const [isComplianceModalOpen, setIsComplianceModalOpen] = useState(false);

  // Novos Modais do Sistema Antigo Migrado
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isEditLeaderOpen, setIsEditLeaderOpen] = useState(false);
  const [selectedEditLeader, setSelectedEditLeader] = useState<any>(null);
  const [isDeleteLeaderOpen, setIsDeleteLeaderOpen] = useState(false);
  const [selectedDeleteLeader, setSelectedDeleteLeader] = useState<any>(null);
  const [initialParentId, setInitialParentId] = useState<string | undefined>(undefined);

  // Retirada de Materiais
  const [isRetiradaModalOpen, setIsRetiradaModalOpen] = useState(false);
  const [selectedRetiradaLeader, setSelectedRetiradaLeader] = useState<any>(null);

  // Estados de Dados da Campanha
  const [wppStatus, setWppStatus] = useState<any>({ status: 'CONNECTING' });
  const [candidate, setCandidate] = useState<any>(null);
  const [metas, setMetas] = useState<any[]>([]);
  const [treeData, setTreeData] = useState<any[]>([]);
  const [conversas, setConversas] = useState<any[]>([]);
  const [gastosData, setGastosData] = useState<any>({ gastos: [], totalGeral: 0, quantidadeTotal: 0, porCategoria: [] });
  const [disparos, setDisparos] = useState<any[]>([]);
  const [chipConfig, setChipConfig] = useState<any>(null);
  const [materiais, setMateriais] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Autenticação & Sessão do Usuário
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Verificar se o usuário já possui sessão ativa ao abrir o app
  useEffect(() => {
    checkAuthSession();
  }, []);

  const checkAuthSession = async () => {
    try {
      setIsCheckingAuth(true);
      const user = await api.getMe();
      setCurrentUser(user);
    } catch (_) {
      setCurrentUser(null);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  // Carregamento Inicial e Polling Periódico após autenticado
  useEffect(() => {
    if (!currentUser) return;
    loadAllData();

    // Polling a cada 5 segundos para manter status do WhatsApp e chat sincronizados
    const interval = setInterval(() => {
      loadWhatsAppStatus();
      if (activeTab === 'chat') {
        loadConversas();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [currentUser, activeTab, maskLGPD]);

  const loadAllData = async () => {
    try {
      setIsLoading(true);
      await Promise.allSettled([
        loadWhatsAppStatus(),
        loadCandidate(),
        loadMetas(),
        loadTree(),
        loadConversas(),
        loadGastos(),
        loadDisparos(),
        loadChipConfig(),
        loadMateriais(),
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadWhatsAppStatus = async () => {
    try {
      const status = await api.getWhatsAppStatus();
      setWppStatus(status);
    } catch (_) {}
  };

  // Tema Claro / Escuro
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('painel_theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
      document.body.classList.add('light');
      document.body.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.body.classList.add('dark');
      document.body.classList.remove('light');
    }
    localStorage.setItem('painel_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const loadCandidate = async () => {
    try {
      const data = await api.getCampanhaConfig();
      setCandidate(data);
      if (data?.cor_primaria) {
        document.documentElement.style.setProperty('--primary', data.cor_primaria);
        document.documentElement.style.setProperty('--primary-hover', data.cor_primaria);
        document.documentElement.style.setProperty('--primary-glow', `${data.cor_primaria}55`);
        document.documentElement.style.setProperty('--primary-light', `${data.cor_primaria}22`);
      }
    } catch (_) {}
  };

  const loadMetas = async () => {
    try {
      const data = await api.getMetas();
      setMetas(data);
    } catch (_) {}
  };

  const loadTree = async () => {
    try {
      const data = await api.getArvore(maskLGPD);
      setTreeData(data);
    } catch (_) {}
  };

  const loadConversas = async () => {
    try {
      const data = await api.getConversas();
      setConversas(data);
    } catch (_) {}
  };

  const loadGastos = async () => {
    try {
      const data = await api.getGastos();
      setGastosData(data);
    } catch (_) {}
  };

  const loadDisparos = async () => {
    try {
      const data = await api.getDisparos();
      setDisparos(data);
    } catch (_) {}
  };

  const loadChipConfig = async () => {
    try {
      const data = await api.getChipWarming();
      setChipConfig(data);
    } catch (_) {}
  };

  const loadMateriais = async () => {
    try {
      const data = await api.getMateriais();
      setMateriais(data || []);
    } catch (_) {}
  };

  // Tratamento da Transição de Anonimização LGPD
  const handleToggleLGPD = () => {
    if (maskLGPD) {
      // Se está mascarado e quer desmascarar, exige justificativa operacional
      setIsLgpdModalOpen(true);
    } else {
      // Se quer mascarar de volta, ativa imediatamente
      setMaskLGPD(true);
    }
  };

  const handleConfirmUnmask = async (justificativa: string) => {
    try {
      await api.registrarAuditoriaUnmask(justificativa);
      setMaskLGPD(false);
    } catch (err: any) {
      alert(`Erro ao registrar auditoria LGPD: ${err.message}`);
    }
  };

  // Cálculo de Resumo para o Cockpit
  const totalEleitores = treeData.reduce((acc, root) => acc + 1 + (root.total_indicados_rede || 0), 0);
  const totalLideres = treeData.filter((t) => t.cargo === 'LIDER' || t.cargo === 'GESTOR').length;

  // Tela de verificação inicial
  if (isCheckingAuth) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#090d16' }}>
        <div style={{ textAlign: 'center', color: '#94a3b8' }}>
          <div className="status-pulse online" style={{ width: '16px', height: '16px', margin: '0 auto 12px' }}></div>
          <span style={{ fontSize: '14px', fontWeight: 600 }}>Carregando Painel Eleitoral...</span>
        </div>
      </div>
    );
  }

  // Se não autenticado, bloqueia o acesso e exibe a Tela de Login e Cadastro
  if (!currentUser) {
    return (
      <LoginPage
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          loadAllData();
        }}
        candidate={candidate}
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Barra de Navegação Superior */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        wppStatus={wppStatus}
        onOpenQrModal={() => setIsQrModalOpen(true)}
        maskLGPD={maskLGPD}
        onToggleLGPD={handleToggleLGPD}
        candidate={candidate}
        onOpenPosterModal={() => setIsPosterOpen(true)}
        onOpenGroupModal={() => setIsGroupModalOpen(true)}
        onOpenManagersModal={() => setIsManagersModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onOpenComplianceModal={() => setIsComplianceModalOpen(true)}
        currentUser={currentUser}
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogout={() => {
          api.logout();
          setCurrentUser(null);
        }}
        onOpenNewLeader={() => {
          setInitialParentId(undefined);
          setIsNewLeaderOpen(true);
        }}
        onOpenNewExpense={() => setIsNewExpenseOpen(true)}
        onOpenNewMeta={() => setIsNewMetaOpen(true)}
      />

      {/* Conteúdo da Aba Ativa */}
      <main
        style={{
          flex: 1,
          maxWidth: '1440px',
          width: '100%',
          margin: '0 auto',
          padding: activeTab === 'chat' ? '12px 24px' : '24px',
          height: activeTab === 'chat' ? 'calc(100vh - 72px)' : 'auto',
          maxHeight: activeTab === 'chat' ? 'calc(100vh - 72px)' : 'none',
          overflow: activeTab === 'chat' ? 'hidden' : 'visible',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        {activeTab === 'cockpit' && (
          <CockpitSpeedometer
            metas={metas}
            overview={{
              totalEleitores,
              totalLideres,
              totalConversas: conversas.length,
              totalGastos: gastosData.totalGeral,
            }}
            treeData={treeData}
            onNewMeta={() => setIsNewMetaOpen(true)}
            onOpenBackup={() => setIsBackupModalOpen(true)}
            onOpenSimulador={() => setActiveTab('simulador')}
            onOpenWarRoom={() => setActiveTab('warroom')}
            onOpenApuracao={() => setActiveTab('apuracao')}
            onDeleteMeta={async (id) => {
              try {
                await api.deleteMeta(id);
                loadMetas();
              } catch (err: any) {
                alert(`Erro ao excluir meta: ${err.message}`);
              }
            }}
          />
        )}

        {activeTab === 'simulador' && (
          <QuocienteEleitoralSimulator />
        )}

        {activeTab === 'warroom' && (
          <WarRoomDiaD />
        )}

        {activeTab === 'apuracao' && (
          <ApuracaoBU />
        )}

        {activeTab === 'liderancas' && (
          <LeadershipTree
            treeData={treeData}
            maskLGPD={maskLGPD}
            onRefresh={loadTree}
            onNewLeader={() => {
              setInitialParentId(undefined);
              setIsNewLeaderOpen(true);
            }}
            onEditLeader={(node) => {
              setSelectedEditLeader(node);
              setIsEditLeaderOpen(true);
            }}
            onDeleteLeader={(node) => {
              setSelectedDeleteLeader(node);
              setIsDeleteLeaderOpen(true);
            }}
            onAddSubordinate={(leaderId) => {
              setInitialParentId(leaderId);
              setIsNewLeaderOpen(true);
            }}
            onOpenRetirada={(node) => {
              setSelectedRetiradaLeader(node);
              setIsRetiradaModalOpen(true);
            }}
            onOpenCreateGroup={(node) => {
              setGroupModalLeaderId(node.id);
              setIsGroupModalOpen(true);
            }}
          />
        )}

        {activeTab === 'chat' && (
          <LiveChat conversas={conversas} onRefreshConversas={loadConversas} />
        )}

        {activeTab === 'gastos' && (
          <ExpensesTracker
            gastosData={gastosData}
            onRefresh={loadGastos}
            onNewGasto={() => setIsNewExpenseOpen(true)}
          />
        )}

        {activeTab === 'disparos' && (
          <CampaignBroadcast
            disparos={disparos}
            chipConfig={chipConfig}
            onRefresh={() => {
              loadDisparos();
              loadChipConfig();
            }}
          />
        )}

        {activeTab === 'antiban' && (
          <AquecedorChipAntiBan
            chipConfig={chipConfig}
            onRefresh={loadChipConfig}
          />
        )}

        {activeTab === 'materiais' && (
          <MateriaisOnline
            materiais={materiais}
            onRefresh={loadMateriais}
          />
        )}

        {activeTab === 'bot' && (
          <ConfigBot />
        )}

        {activeTab === 'config' && (
          <CandidateConfig config={candidate} onRefresh={loadCandidate} />
        )}

        {activeTab === 'adm' && (
          <AdminPage
            currentUser={currentUser}
            onCandidateChanged={() => {
              loadCandidate();
              loadAllData();
            }}
          />
        )}
      </main>

      {/* Modais */}
      <WhatsAppModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        wppStatus={wppStatus}
        onRefresh={loadWhatsAppStatus}
      />

      <NewLeaderModal
        isOpen={isNewLeaderOpen}
        onClose={() => {
          setIsNewLeaderOpen(false);
          setInitialParentId(undefined);
        }}
        leadersList={treeData}
        initialParentId={initialParentId}
        onSuccess={() => {
          loadTree();
          loadMetas();
        }}
      />

      <ModalEditarLideranca
        isOpen={isEditLeaderOpen}
        onClose={() => {
          setIsEditLeaderOpen(false);
          setSelectedEditLeader(null);
        }}
        leader={selectedEditLeader}
        leadersList={treeData}
        onSuccess={() => {
          loadTree();
          loadMetas();
        }}
      />

      <ModalConfirmarExclusao
        isOpen={isDeleteLeaderOpen}
        onClose={() => {
          setIsDeleteLeaderOpen(false);
          setSelectedDeleteLeader(null);
        }}
        leader={selectedDeleteLeader}
        onSuccess={() => {
          loadTree();
          loadMetas();
        }}
      />

      <ModalBackup
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        onSuccess={() => {
          loadAllData();
        }}
      />

      <NewMetaModal
        isOpen={isNewMetaOpen}
        onClose={() => setIsNewMetaOpen(false)}
        onSuccess={loadMetas}
      />

      <NewExpenseModal
        isOpen={isNewExpenseOpen}
        onClose={() => setIsNewExpenseOpen(false)}
        onSuccess={loadGastos}
      />

      <ModalQRCodeComite
        isOpen={isPosterOpen}
        onClose={() => setIsPosterOpen(false)}
        candidate={candidate}
      />

      <ModalCriarGrupo
        isOpen={isGroupModalOpen}
        onClose={() => {
          setIsGroupModalOpen(false);
          setGroupModalLeaderId(undefined);
        }}
        leadersList={treeData}
        initialLeaderId={groupModalLeaderId}
        onSuccess={loadTree}
      />

      <ModalRetiradaMaterial
        isOpen={isRetiradaModalOpen}
        onClose={() => {
          setIsRetiradaModalOpen(false);
          setSelectedRetiradaLeader(null);
        }}
        leader={selectedRetiradaLeader}
      />

      <ModalGestores
        isOpen={isManagersModalOpen}
        onClose={() => setIsManagersModalOpen(false)}
      />

      <ModalUsuariosAuth
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <ModalLGPD
        isOpen={isLgpdModalOpen}
        onClose={() => setIsLgpdModalOpen(false)}
        onConfirm={handleConfirmUnmask}
      />

      <ComplianceTSEModal
        isOpen={isComplianceModalOpen}
        onClose={() => setIsComplianceModalOpen(false)}
        candidate={candidate}
      />
    </div>
  );
};
