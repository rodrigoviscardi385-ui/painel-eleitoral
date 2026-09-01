'use client';

import React, { useState, useEffect } from 'react';
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
  CheckCircle2
} from 'lucide-react';
import { CockpitMetas } from '../../components/CockpitMetas';
import { ArvoreLideranca, TreeNode } from '../../components/ArvoreLideranca';
import { DisparadorWhatsApp } from '../../components/DisparadorWhatsApp';
import { ModalMetas } from '../../components/ModalMetas';
import { ModalConectarWhatsApp } from '../../components/ModalConectarWhatsApp';
import { ModalQRCodeComite } from '../../components/ModalQRCodeComite';
import { ModalGestores } from '../../components/ModalGestores';
import { ModalCriarGrupo } from '../../components/ModalCriarGrupo';
import { Smartphone, QrCode, UserCheck, Users } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'cockpit' | 'arvore' | 'disparos' | 'lgpd'>('cockpit');
  const [isMasked, setIsMasked] = useState(true);
  const [showUnmaskModal, setShowUnmaskModal] = useState(false);
  const [isModalMetaOpen, setIsModalMetaOpen] = useState(false);
  const [isModalWhatsAppOpen, setIsModalWhatsAppOpen] = useState(false);
  const [isModalQRCodeComiteOpen, setIsModalQRCodeComiteOpen] = useState(false);
  const [isModalGestoresOpen, setIsModalGestoresOpen] = useState(false);
  const [isModalCriarGrupoOpen, setIsModalCriarGrupoOpen] = useState(false);
  const [whatsappConnected, setWhatsappConnected] = useState(true);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [unmaskReason, setUnmaskReason] = useState('');
  const [unmaskAuditStatus, setUnmaskAuditStatus] = useState<string | null>(null);

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

  // Carregar dados da API Fastify
  const refreshData = async () => {
    try {
      // 1. KPIs de Metas
      const resKpis = await fetch(`${API_BASE_URL}/api/metas/kpis`);
      if (resKpis.ok) {
        const data = await resKpis.json();
        if (data.kpis) setKpis(data.kpis);
        if (data.metas) setMetas(data.metas);
      }

      // 2. Árvore de Lideranças
      const resTree = await fetch(`${API_BASE_URL}/api/liderancas/tree?maskLGPD=${isMasked}`);
      if (resTree.ok) {
        const data = await resTree.json();
        if (Array.isArray(data.tree)) setTreeNodes(data.tree);
      }
    } catch (err) {
      console.warn('API backend offline ou em inicialização. Usando dados locais.', err);
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
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Topo / Header Principal */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 glass-panel rounded-2xl border border-slate-700/80">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-600 to-emerald-600 text-white shadow-lg shadow-cyan-600/30">
            <Vote className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white tracking-tight">SISTEMA ELEITORAL 2026</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Free-Tier Ativo
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Cockpit de Campanha, Árvore de Lideranças, Ingestão Groq WhatsApp e Disparador
            </p>
          </div>
        </div>

        {/* Ações Globais */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Botão Conectar WhatsApp */}
          <button
            onClick={() => setIsModalWhatsAppOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
            title="Conectar WhatsApp do Comitê ou abrir simulador"
          >
            <Smartphone className="w-4 h-4 text-emerald-200" />
            <span>Conectar WhatsApp</span>
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

          {/* Botão Criar Grupo de WhatsApp */}
          <button
            onClick={() => setIsModalCriarGrupoOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
            title="Criar novo grupo oficial de WhatsApp para qualquer líder ou bairro"
          >
            <Users className="w-4 h-4 text-indigo-200" />
            <span>Criar Grupo</span>
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
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <FileDown className={`w-4 h-4 text-emerald-400 ${isExportingPdf ? 'animate-bounce' : ''}`} />
            {isExportingPdf ? 'Gerando Stream...' : 'Baixar PDF'}
          </button>

          {/* Atualizar */}
          <button
            onClick={refreshData}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            title="Atualizar Dados"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Alerta de Auditoria LGPD */}
      {unmaskAuditStatus && (
        <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <span>{unmaskAuditStatus}</span>
        </div>
      )}

      {/* Navegação por Abas */}
      <nav className="flex items-center gap-2 p-1.5 glass-panel rounded-xl border border-slate-800 overflow-x-auto">
        <button
          onClick={() => setActiveTab('cockpit')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'cockpit'
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Target className="w-4 h-4" />
          Cockpit de Metas & Velocímetro
        </button>

        <button
          onClick={() => setActiveTab('arvore')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'arvore'
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <GitBranch className="w-4 h-4" />
          Árvore de Lideranças
        </button>

        <button
          onClick={() => setActiveTab('disparos')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'disparos'
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Send className="w-4 h-4" />
          Disparador em Massa
        </button>

        <button
          onClick={() => setActiveTab('lgpd')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'lgpd'
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Shield className="w-4 h-4" />
          Auditoria & Segurança LGPD
        </button>
      </nav>

      {/* Conteúdo da Aba Ativa */}
      <main>
        {activeTab === 'cockpit' && (
          <CockpitMetas
            kpis={kpis}
            metas={metas}
            onOpenModalMeta={() => setIsModalMetaOpen(true)}
            onExportPdf={handleExportPdf}
            onOpenCreateGroup={() => setIsModalCriarGrupoOpen(true)}
          />
        )}

        {activeTab === 'arvore' && (
          <ArvoreLideranca
            nodes={treeNodes}
            isMasked={isMasked}
            onToggleMask={() => {
              if (isMasked) setShowUnmaskModal(true);
              else setIsMasked(true);
            }}
            apiBaseUrl={API_BASE_URL}
            onOpenCreateGroup={() => setIsModalCriarGrupoOpen(true)}
            onRefresh={refreshData}
          />
        )}

        {activeTab === 'disparos' && (
          <DisparadorWhatsApp apiBaseUrl={API_BASE_URL} />
        )}

        {activeTab === 'lgpd' && (
          <div className="space-y-6 animate-fadeIn">
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

      {/* Modal de Criação de Grupo Oficial de WhatsApp */}
      <ModalCriarGrupo
        isOpen={isModalCriarGrupoOpen}
        onClose={() => setIsModalCriarGrupoOpen(false)}
        apiBaseUrl={API_BASE_URL}
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
