'use client';

import React, { useState, useEffect } from 'react';
import { 
  GitBranch, 
  ChevronRight, 
  ChevronDown, 
  User, 
  Users, 
  Shield, 
  ExternalLink, 
  Search, 
  Eye, 
  EyeOff, 
  CheckCircle,
  MapPin,
  Vote,
  Sparkles,
  Loader2,
  Pencil,
  Trash2
} from 'lucide-react';
import { ModalEditarLideranca } from './ModalEditarLideranca';
import { ModalConfirmarExclusao } from './ModalConfirmarExclusao';

export interface TreeNode {
  id: string;
  nome: string;
  whatsapp: string;
  cargo: 'ADMIN' | 'GESTOR' | 'LIDER' | 'APOIADOR';
  lider_acima_id?: string | null;
  bairro?: string | null;
  zona_eleitoral?: string | null;
  secao_eleitoral?: string | null;
  grupo_whatsapp_id?: string | null;
  grupo_link_convite?: string | null;
  total_indicados_diretos: number;
  total_indicados_rede: number;
  nivel: number;
  caminho_arvore?: string[];
  created_at: string;
}

interface ArvoreLiderancaProps {
  nodes: TreeNode[];
  isMasked: boolean;
  onToggleMask: () => void;
  apiBaseUrl?: string;
  onOpenCreateGroup?: () => void;
  onRefresh?: () => void;
}

export const ArvoreLideranca: React.FC<ArvoreLiderancaProps> = ({
  nodes,
  isMasked,
  onToggleMask,
  apiBaseUrl = 'http://localhost:3001',
  onOpenCreateGroup,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [lazySupporters, setLazySupporters] = useState<Record<string, TreeNode[]>>({});
  const [loadingLazy, setLoadingLazy] = useState<Record<string, boolean>>({});
  const [creatingGroupId, setCreatingGroupId] = useState<string | null>(null);
  const [createdInviteLinks, setCreatedInviteLinks] = useState<Record<string, string>>({});

  // Modais de Edição e Exclusão
  const [selectedEditNode, setSelectedEditNode] = useState<TreeNode | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDeleteNode, setSelectedDeleteNode] = useState<TreeNode | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleCreateGroup = async (leaderId: string, leaderNome: string) => {
    setCreatingGroupId(leaderId);
    try {
      const res = await fetch(`${apiBaseUrl}/api/liderancas/${leaderId}/create-group`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.inviteLink) {
        setCreatedInviteLinks((prev) => ({ ...prev, [leaderId]: data.inviteLink }));
        if (onRefresh) onRefresh();
      } else {
        alert(data.error || 'Não foi possível criar o grupo.');
      }
    } catch (err) {
      alert('Erro de conexão ao criar grupo de WhatsApp.');
    } finally {
      setCreatingGroupId(null);
    }
  };

  // Auto-expand root level nodes by default
  useEffect(() => {
    const initialExpanded: Record<string, boolean> = {};
    nodes.filter((n) => !n.lider_acima_id || n.nivel === 0).forEach((n) => {
      initialExpanded[n.id] = true;
    });
    setExpandedNodes(initialExpanded);
  }, [nodes]);

  const toggleExpand = async (nodeId: string) => {
    const nextState = !expandedNodes[nodeId];
    setExpandedNodes((prev) => ({ ...prev, [nodeId]: nextState }));

    // Se está expandindo e ainda não tem os apoiadores em lazy loading, busca da API
    if (nextState && !lazySupporters[nodeId]) {
      setLoadingLazy((prev) => ({ ...prev, [nodeId]: true }));
      try {
        const res = await fetch(`${apiBaseUrl}/api/liderancas/${nodeId}/supporters?maskLGPD=${isMasked}`);
        if (res.ok) {
          const data = await res.json();
          setLazySupporters((prev) => ({ ...prev, [nodeId]: data.supporters || [] }));
        }
      } catch (err) {
        console.warn('Falha ao carregar apoiadores em lazy loading:', err);
      } finally {
        setLoadingLazy((prev) => ({ ...prev, [nodeId]: false }));
      }
    }
  };

  // Filtragem de nós
  const filteredNodes = nodes.filter((node) => {
    const term = searchTerm.toLowerCase();
    return (
      node.nome.toLowerCase().includes(term) ||
      (node.bairro && node.bairro.toLowerCase().includes(term)) ||
      (node.zona_eleitoral && node.zona_eleitoral.includes(term)) ||
      node.whatsapp.includes(term)
    );
  });

  // Estrutura hierárquica por níveis
  const getChildNodes = (parentId: string): TreeNode[] => {
    const directChildren = nodes.filter((n) => n.lider_acima_id === parentId);
    const lazyChildren = lazySupporters[parentId] || [];
    
    // Mescla sem duplicatas
    const all = [...directChildren];
    lazyChildren.forEach((lc) => {
      if (!all.some((d) => d.id === lc.id)) {
        all.push(lc);
      }
    });
    return all;
  };

  const getCargoBadge = (cargo: string) => {
    switch (cargo) {
      case 'ADMIN':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'GESTOR':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
      case 'LIDER':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      default:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
  };

  const handleActionSuccess = () => {
    if (onRefresh) {
      onRefresh();
    }
    // Limpar cache de lazy loading para recarregar se necessário
    setLazySupporters({});
  };

  const renderNode = (node: TreeNode, depth = 0) => {
    const isExpanded = !!expandedNodes[node.id];
    const children = getChildNodes(node.id);
    const hasChildren = node.total_indicados_diretos > 0 || children.length > 0;
    const isLoading = loadingLazy[node.id];

    return (
      <div key={node.id} className="relative select-none">
        {/* Linha da Árvore */}
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 my-1.5 rounded-xl border transition-all ${
            depth === 0
              ? 'bg-slate-900/80 border-slate-700/80 shadow-md'
              : depth === 1
              ? 'bg-slate-900/50 border-slate-800'
              : 'bg-slate-950/40 border-slate-800/60'
          } hover:border-cyan-500/40`}
          style={{ marginLeft: `${Math.min(depth * 24, 96)}px` }}
        >
          {/* Informações do Líder / Apoiador */}
          <div className="flex items-center gap-3">
            {/* Botão de Expandir / Recolher */}
            {hasChildren ? (
              <button
                onClick={() => toggleExpand(node.id)}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                title={isExpanded ? 'Recolher' : 'Expandir subordinados'}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                ) : isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-cyan-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </button>
            ) : (
              <div className="w-6 flex justify-center text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
              </div>
            )}

            <div className="flex items-center gap-2.5">
              <div
                className={`p-2 rounded-lg ${
                  node.cargo === 'ADMIN'
                    ? 'bg-purple-500/20 text-purple-400'
                    : node.cargo === 'LIDER'
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'bg-emerald-500/20 text-emerald-400'
                }`}
              >
                {node.cargo === 'LIDER' || node.cargo === 'ADMIN' ? (
                  <Users className="w-4 h-4" />
                ) : (
                  <User className="w-4 h-4" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-100">{node.nome}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${getCargoBadge(node.cargo)}`}>
                    {node.cargo}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-cyan-400" /> {node.bairro || 'Sem Bairro'}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Vote className="w-3 h-3 text-emerald-400" /> Z: {node.zona_eleitoral || '-'} / S: {node.secao_eleitoral || '-'}
                  </span>
                  <span>•</span>
                  <span className="font-mono text-slate-300">{node.whatsapp}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Métricas do Nó e Ações */}
          <div className="mt-3 sm:mt-0 flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
            {/* Contadores de Rede (para quem tem liderança) */}
            {(node.cargo === 'LIDER' || node.cargo === 'ADMIN' || node.cargo === 'GESTOR' || node.total_indicados_rede > 0) && (
              <div className="flex items-center gap-2 text-xs mr-1">
                <span className="px-2 py-1 rounded bg-slate-800/80 border border-slate-700 text-slate-300">
                  Diretos: <strong className="text-cyan-400 font-bold">{node.total_indicados_diretos}</strong>
                </span>
                <span className="px-2 py-1 rounded bg-slate-800/80 border border-slate-700 text-slate-300">
                  Rede Total: <strong className="text-emerald-400 font-bold">{node.total_indicados_rede}</strong>
                </span>
              </div>
            )}

            {/* Link do Grupo WhatsApp ou Botão Criar Grupo */}
            {node.grupo_link_convite || createdInviteLinks[node.id] ? (
              <a
                href={node.grupo_link_convite || createdInviteLinks[node.id]}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/30 rounded-lg transition-all"
                title="Abrir grupo oficial do WhatsApp"
              >
                <Sparkles className="w-3 h-3 text-emerald-400" />
                Grupo Base
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </a>
            ) : node.cargo === 'LIDER' || node.cargo === 'ADMIN' || node.cargo === 'GESTOR' ? (
              <button
                onClick={() => handleCreateGroup(node.id, node.nome)}
                disabled={creatingGroupId === node.id}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/30 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                title="Criar grupo oficial de WhatsApp para este líder com ADMs automáticos"
              >
                {creatingGroupId === node.id ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
                    <span>Criando Grupo...</span>
                  </>
                ) : (
                  <>
                    <Users className="w-3 h-3 text-cyan-400" />
                    <span>+ Criar Grupo</span>
                  </>
                )}
              </button>
            ) : null}

            {/* Botão de Editar */}
            <button
              onClick={() => {
                setSelectedEditNode(node);
                setIsEditModalOpen(true);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 border border-slate-700 hover:border-cyan-500/40 transition-all cursor-pointer"
              title={`Editar dados de ${node.nome}`}
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>

            {/* Botão de Excluir */}
            <button
              onClick={() => {
                setSelectedDeleteNode(node);
                setIsDeleteModalOpen(true);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-700 hover:border-rose-500/40 transition-all cursor-pointer"
              title={`Excluir cadastro de ${node.nome}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Nós Filhos (Recursão) */}
        {isExpanded && children.length > 0 && (
          <div className="border-l-2 border-slate-800/80 ml-6 pl-2">
            {children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const rootNodes = filteredNodes.filter((n) => !n.lider_acima_id || n.nivel === 0);

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Barra Superior da Árvore */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 glass-panel rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Árvore Genealógica de Lideranças</h3>
            <p className="text-xs text-slate-400">
              Visualização hierárquica multinível com edição e exclusão integradas.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Campo de Busca */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome, bairro, zona..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Botão de Criar Grupo de Base */}
          {onOpenCreateGroup && (
            <button
              onClick={onOpenCreateGroup}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-md shadow-indigo-600/20 transition-all cursor-pointer whitespace-nowrap"
              title="Criar novo grupo oficial de WhatsApp para qualquer líder ou bairro"
            >
              <Users className="w-3.5 h-3.5 text-indigo-200" />
              <span>+ Criar Grupo</span>
            </button>
          )}

          {/* Botão de Mascaramento LGPD */}
          <button
            onClick={onToggleMask}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              isMasked
                ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
            }`}
            title={isMasked ? 'Clique para desmascarar (Registra Auditoria)' : 'Dados visíveis em modo auditoria'}
          >
            {isMasked ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-cyan-400" />
                LGPD: Ativo
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-rose-400" />
                LGPD: Desmascarado
              </>
            )}
          </button>
        </div>
      </div>

      {/* Área da Árvore */}
      <div className="glass-panel rounded-xl p-4 max-h-[600px] overflow-y-auto">
        {rootNodes.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            Nenhum líder ou apoiador encontrado para o filtro aplicado.
          </div>
        ) : (
          rootNodes.map((root) => renderNode(root, 0))
        )}
      </div>

      {/* Modal de Edição */}
      <ModalEditarLideranca
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        node={selectedEditNode}
        apiBaseUrl={apiBaseUrl}
        onSuccess={handleActionSuccess}
      />

      {/* Modal de Confirmação de Exclusão */}
      <ModalConfirmarExclusao
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        node={selectedDeleteNode}
        apiBaseUrl={apiBaseUrl}
        onSuccess={handleActionSuccess}
      />
    </div>
  );
};

