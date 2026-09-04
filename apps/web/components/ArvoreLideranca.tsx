'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  GitBranch, 
  ChevronRight, 
  ChevronDown, 
  User, 
  Users, 
  Search, 
  Eye, 
  EyeOff, 
  MapPin, 
  Vote, 
  Loader2, 
  Pencil, 
  Trash2,
  AlertCircle,
  UserPlus
} from 'lucide-react';
import { ModalEditarLideranca } from './ModalEditarLideranca';
import { ModalConfirmarExclusao } from './ModalConfirmarExclusao';
import { ModalNovoCadastro } from './ModalNovoCadastro';

export interface TreeNode {
  id: string;
  nome: string;
  whatsapp: string;
  cargo: 'ADMIN' | 'GESTOR' | 'LIDER' | 'APOIADOR' | 'VOLUNTARIO';
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
  nodes?: TreeNode[];
  isMasked: boolean;
  onToggleMask: () => void;
  apiBaseUrl?: string;
  onOpenCreateGroup?: (leader?: TreeNode) => void;
  onRefresh?: () => void;
}

export const ArvoreLideranca: React.FC<ArvoreLiderancaProps> = ({
  nodes = [],
  isMasked,
  onToggleMask,
  apiBaseUrl = '',
  onOpenCreateGroup,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [lazySupporters, setLazySupporters] = useState<Record<string, TreeNode[]>>({});
  const [loadingLazy, setLoadingLazy] = useState<Record<string, boolean>>({});

  // Modais de Edição e Exclusão
  const [selectedEditNode, setSelectedEditNode] = useState<TreeNode | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDeleteNode, setSelectedDeleteNode] = useState<TreeNode | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isNovoCadastroOpen, setIsNovoCadastroOpen] = useState(false);

  // Lista garantida de nós válidos
  const safeNodes = useMemo(() => {
    if (!Array.isArray(nodes)) return [];
    return nodes.filter((n) => n && typeof n.id === 'string');
  }, [nodes]);

  // Mapa rápido de IDs existentes para identificar nós órfãos
  const nodeMap = useMemo(() => {
    const map = new Map<string, TreeNode>();
    safeNodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [safeNodes]);

  // Auto-expand root level nodes by default
  useEffect(() => {
    const initialExpanded: Record<string, boolean> = {};
    safeNodes
      .filter((n) => !n.lider_acima_id || n.nivel === 0 || !nodeMap.has(n.lider_acima_id))
      .forEach((n) => {
        initialExpanded[n.id] = true;
      });
    setExpandedNodes(initialExpanded);
  }, [safeNodes, nodeMap]);

  const toggleExpand = async (nodeId: string) => {
    const nextState = !expandedNodes[nodeId];
    setExpandedNodes((prev) => ({ ...prev, [nodeId]: nextState }));

    // Se está expandindo e ainda não tem os apoiadores em lazy loading, busca da API
    if (nextState && !lazySupporters[nodeId]) {
      setLoadingLazy((prev) => ({ ...prev, [nodeId]: true }));
      try {
        const fetchUrl = apiBaseUrl
          ? `${apiBaseUrl}/api/liderancas/${nodeId}/supporters?maskLGPD=${isMasked}`
          : `/api/liderancas/${nodeId}/supporters?maskLGPD=${isMasked}`;

        const res = await fetch(fetchUrl);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.supporters)) {
            setLazySupporters((prev) => ({ ...prev, [nodeId]: data.supporters }));
          }
        }
      } catch (err) {
        console.warn('Falha ao carregar apoiadores em lazy loading:', err);
      } finally {
        setLoadingLazy((prev) => ({ ...prev, [nodeId]: false }));
      }
    }
  };

  // Filtragem segura de nós
  const filteredNodes = useMemo(() => {
    const term = (searchTerm || '').trim().toLowerCase();
    if (!term) return safeNodes;

    return safeNodes.filter((node) => {
      const nome = (node.nome || '').toLowerCase();
      const bairro = (node.bairro || '').toLowerCase();
      const zona = (node.zona_eleitoral || '').toLowerCase();
      const whatsapp = (node.whatsapp || '').toLowerCase();
      return (
        nome.includes(term) ||
        bairro.includes(term) ||
        zona.includes(term) ||
        whatsapp.includes(term)
      );
    });
  }, [safeNodes, searchTerm]);

  // Estrutura hierárquica por níveis com proteção contra ciclos
  const getChildNodes = (parentId: string): TreeNode[] => {
    const directChildren = safeNodes.filter(
      (n) => n.lider_acima_id === parentId && n.id !== parentId
    );
    const lazyChildren = lazySupporters[parentId] || [];

    const all = [...directChildren];
    lazyChildren.forEach((lc) => {
      if (lc && lc.id !== parentId && !all.some((d) => d.id === lc.id)) {
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
      case 'VOLUNTARIO':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
      default:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
  };

  const handleActionSuccess = () => {
    if (onRefresh) {
      onRefresh();
    }
    setLazySupporters({});
  };

  // Renderização recursiva com proteção estrita contra overflow de pilha
  const renderNode = (node: TreeNode, depth = 0, visited = new Set<string>()): React.ReactNode => {
    if (!node || !node.id) return null;
    if (depth > 10) return null; // Teto de segurança anti-stack overflow
    if (visited.has(node.id)) return null; // Prevenção de loop circular A -> B -> A

    const currentVisited = new Set(visited);
    currentVisited.add(node.id);

    const isExpanded = !!expandedNodes[node.id];
    const children = getChildNodes(node.id);
    const hasChildren = (node.total_indicados_diretos || 0) > 0 || children.length > 0;
    const isLoading = !!loadingLazy[node.id];

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
          style={{ marginLeft: `${Math.min(depth * 20, 80)}px` }}
        >
          {/* Informações do Líder / Apoiador */}
          <div className="flex items-center gap-3">
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
                    : node.cargo === 'GESTOR'
                    ? 'bg-indigo-500/20 text-indigo-400'
                    : node.cargo === 'LIDER'
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : node.cargo === 'VOLUNTARIO'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-emerald-500/20 text-emerald-400'
                }`}
              >
                {node.cargo === 'LIDER' || node.cargo === 'ADMIN' || node.cargo === 'GESTOR' ? (
                  <Users className="w-4 h-4" />
                ) : (
                  <User className="w-4 h-4" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-100">{node.nome || 'Sem Nome'}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${getCargoBadge(node.cargo)}`}>
                    {node.cargo || 'APOIADOR'}
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
                  <span className="font-mono text-slate-300">{node.whatsapp || '-'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Estatísticas e Ações */}
          <div className="flex items-center gap-4 mt-3 sm:mt-0 justify-end">
            <div className="flex items-center gap-3 text-xs">
              <div className="text-right">
                <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Diretos</span>
                <span className="font-bold text-cyan-400">{node.total_indicados_diretos || 0}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Rede</span>
                <span className="font-bold text-indigo-400">{node.total_indicados_rede || 0}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
              {/* Regra de Negócio: Apenas Líder ou Admin têm direito de criar Grupo Oficial de WhatsApp */}
              {(node.cargo === 'LIDER' || node.cargo === 'ADMIN') && (
                <button
                  onClick={() => {
                    if (onOpenCreateGroup) {
                      onOpenCreateGroup(node);
                    }
                  }}
                  className="p-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-400 transition-colors cursor-pointer"
                  title={`Criar Grupo Oficial de WhatsApp para ${node.nome}`}
                >
                  <Users className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={() => {
                  setSelectedEditNode(node);
                  setIsEditModalOpen(true);
                }}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 transition-colors cursor-pointer"
                title={`Editar cadastro de ${node.nome}`}
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => {
                  setSelectedDeleteNode(node);
                  setIsDeleteModalOpen(true);
                }}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-400 transition-colors cursor-pointer"
                title={`Excluir cadastro de ${node.nome}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Nós Filhos (Recursão Protegida) */}
        {isExpanded && children.length > 0 && (
          <div className="border-l-2 border-slate-800/80 ml-6 pl-2">
            {children.map((child) => renderNode(child, depth + 1, currentVisited))}
          </div>
        )}
      </div>
    );
  };

  // Identificação segura de raízes (nós sem pai ou nós órfãos cujo pai não existe)
  const rootNodes = useMemo(() => {
    return filteredNodes.filter(
      (n) => !n.lider_acima_id || n.nivel === 0 || !nodeMap.has(n.lider_acima_id)
    );
  }, [filteredNodes, nodeMap]);

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

          {/* Botão de Cadastro Manual de Líderes, Gestores, Apoiadores e Voluntários */}
          <button
            onClick={() => setIsNovoCadastroOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 rounded-lg shadow-md shadow-cyan-600/20 transition-all cursor-pointer whitespace-nowrap"
            title="Cadastrar manualmente Líder, Gestor, Apoiador ou Voluntário"
          >
            <UserPlus className="w-3.5 h-3.5 text-cyan-200" />
            <span>+ Novo Cadastro</span>
          </button>

          {/* Botão de Criar Grupo de Base */}
          {onOpenCreateGroup && (
            <button
              onClick={() => onOpenCreateGroup()}
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
            <AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            Nenhum líder ou apoiador encontrado para o filtro aplicado.
          </div>
        ) : (
          rootNodes.map((root) => renderNode(root, 0))
        )}
      </div>

      {/* Modal de Novo Cadastro */}
      <ModalNovoCadastro
        isOpen={isNovoCadastroOpen}
        onClose={() => setIsNovoCadastroOpen(false)}
        lideresDisponiveis={safeNodes}
        onSuccess={() => {
          handleActionSuccess();
        }}
      />

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
