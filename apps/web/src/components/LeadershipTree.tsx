import React, { useState, useMemo } from 'react';
import {
  Users,
  ChevronRight,
  ChevronDown,
  Phone,
  MapPin,
  RefreshCw,
  UserPlus,
  Shield,
  Search,
  Pencil,
  Trash2,
  ExternalLink,
  Plus,
  Filter,
  Package,
  UsersRound,
  Link,
  MessageSquare,
  Award,
  Trophy,
  Sparkles,
} from 'lucide-react';
import { api } from '../api.ts';

interface LeadershipTreeProps {
  treeData: any[];
  maskLGPD: boolean;
  onRefresh: () => void;
  onNewLeader: () => void;
  onEditLeader?: (node: any) => void;
  onDeleteLeader?: (node: any) => void;
  onAddSubordinate?: (leaderId: string) => void;
  onOpenRetirada?: (node: any) => void;
  onOpenCreateGroup?: (node: any) => void;
}

export const LeadershipTree: React.FC<LeadershipTreeProps> = ({
  treeData,
  maskLGPD,
  onRefresh,
  onNewLeader,
  onEditLeader,
  onDeleteLeader,
  onAddSubordinate,
  onOpenRetirada,
  onOpenCreateGroup,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('TODOS');
  const [selectedBairro, setSelectedBairro] = useState('TODOS');
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const toggleNode = (id: string) => {
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleRecalculate = async () => {
    try {
      setIsRecalculating(true);
      await api.recalcularMetricas();
      onRefresh();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setIsRecalculating(false);
    }
  };

  // Flatten para extrair estatísticas de lideranças e bairros
  const flatten = (nodes: any[]): any[] => {
    let list: any[] = [];
    for (const n of nodes) {
      list.push(n);
      if (n.children && n.children.length > 0) {
        list = list.concat(flatten(n.children));
      }
    }
    return list;
  };

  const allNodes = useMemo(() => flatten(treeData), [treeData]);

  const allBairros = useMemo(() => {
    const set = new Set<string>();
    for (const n of allNodes) {
      if (n.bairro && n.bairro.trim()) set.add(n.bairro.trim());
    }
    return Array.from(set).sort();
  }, [allNodes]);

  const topLeadersGamified = useMemo(() => {
    return [...allNodes]
      .filter((n) => n.cargo === 'LIDER' || n.cargo === 'GESTOR')
      .sort((a, b) => (b.total_indicados_rede || 0) - (a.total_indicados_rede || 0))
      .slice(0, 3);
  }, [allNodes]);

  const matchesSearch = (node: any): boolean => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const nameMatch = (node.nome || '').toLowerCase().includes(term);
    const phoneMatch = (node.whatsapp || '').includes(term);
    const bairroMatch = (node.bairro || '').toLowerCase().includes(term);
    const zonaMatch = (node.zona_eleitoral || '').includes(term);

    const childrenMatch = node.children && node.children.some((c: any) => matchesSearch(c));
    return nameMatch || phoneMatch || bairroMatch || zonaMatch || !!childrenMatch;
  };

  const matchesRole = (node: any): boolean => {
    if (selectedRole === 'TODOS') return true;
    const roleMatch = node.cargo === selectedRole;
    const childrenMatch = node.children && node.children.some((c: any) => matchesRole(c));
    return roleMatch || !!childrenMatch;
  };

  const matchesBairro = (node: any): boolean => {
    if (selectedBairro === 'TODOS') return true;
    const bMatch = node.bairro === selectedBairro;
    const childrenMatch = node.children && node.children.some((c: any) => matchesBairro(c));
    return bMatch || !!childrenMatch;
  };

  const filteredTree = useMemo(() => {
    return treeData.filter((root) => matchesSearch(root) && matchesRole(root) && matchesBairro(root));
  }, [treeData, searchTerm, selectedRole, selectedBairro]);

  const renderNode = (node: any, level = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes[node.id] !== false; // Padrão aberto

    const cargoColors: Record<string, string> = {
      ADMIN: '#8b5cf6',
      GESTOR: '#3b82f6',
      LIDER: '#10b981',
      APOIADOR: '#06b6d4',
      VOLUNTARIO: '#f59e0b',
    };

    return (
      <div key={node.id} style={{ marginTop: '8px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: level === 0 ? 'var(--bg-card-hover)' : 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            transition: 'all 0.15s ease',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '260px' }}>
            {hasChildren ? (
              <button
                onClick={() => toggleNode(node.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </button>
            ) : (
              <div style={{ width: '18px' }} />
            )}

            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: `${cargoColors[node.cargo] || '#10b981'}25`,
                color: cargoColors[node.cargo] || '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '14px',
              }}
            >
              {node.nome ? node.nome.charAt(0).toUpperCase() : '?'}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '14px' }}>
                  {node.nome}
                </span>
                <span
                  className="badge"
                  style={{
                    background: `${cargoColors[node.cargo] || '#10b981'}20`,
                    color: cargoColors[node.cargo] || '#10b981',
                    fontSize: '11px',
                  }}
                >
                  {node.cargo}
                </span>
                {node.opt_out && (
                  <span className="badge badge-vermelho" style={{ fontSize: '10px' }}>
                    Opt-out LGPD
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Phone size={12} />
                  {node.whatsapp}
                </span>
                {node.bairro && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={12} />
                    {node.bairro} {node.zona_eleitoral ? `(Zona ${node.zona_eleitoral})` : ''}
                  </span>
                )}
                {node.grupo_link_convite && (
                  <a
                    href={node.grupo_link_convite}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', textDecoration: 'none', fontWeight: 600 }}
                  >
                    <ExternalLink size={12} />
                    Grupo WhatsApp
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Métricas e Ações Rápidas */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Indicados Diretos</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {node.total_indicados_diretos || 0}
              </div>
            </div>

            <div style={{ textAlign: 'right', minWidth: '85px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Rede Total (CTE)</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--primary)' }}>
                {node.total_indicados_rede || 0} eleitores
              </div>
            </div>

            {/* Botões de Ação do Nó */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderLeft: '1px solid var(--border-color)', paddingLeft: '12px', flexWrap: 'wrap' }}>
              {/* Botão de WhatsApp Direto */}
              {node.whatsapp && (
                <a
                  href={`https://wa.me/55${node.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  title="Chamar contato no WhatsApp agora"
                  className="btn btn-secondary"
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    borderColor: 'rgba(16, 185, 129, 0.4)',
                    color: '#10b981',
                    textDecoration: 'none',
                  }}
                >
                  <MessageSquare size={13} />
                  <span>WhatsApp</span>
                </a>
              )}

              {/* Botão de Retirada de Material Físico */}
              {onOpenRetirada && (
                <button
                  onClick={() => onOpenRetirada(node)}
                  title="Registrar ou consultar retiradas de materiais (santinhos, adesivos, etc.)"
                  className="btn btn-secondary"
                  style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.3)', color: '#f59e0b' }}
                >
                  <Package size={14} />
                  <span>Materiais</span>
                </button>
              )}

              {/* Botão de Grupo de WhatsApp */}
              {node.grupo_link_convite ? (
                <a
                  href={node.grupo_link_convite}
                  target="_blank"
                  rel="noreferrer"
                  title="Abrir grupo oficial de WhatsApp da base"
                  className="btn btn-secondary"
                  style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.3)', color: '#10b981', textDecoration: 'none' }}
                >
                  <Link size={13} />
                  <span>Grupo</span>
                </a>
              ) : onOpenCreateGroup ? (
                <button
                  onClick={() => onOpenCreateGroup(node)}
                  title="Criar grupo oficial de WhatsApp para esta liderança"
                  className="btn btn-secondary"
                  style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <UsersRound size={13} color="#25D366" />
                  <span>Criar Grupo</span>
                </button>
              ) : null}

              {onAddSubordinate && (
                <button
                  onClick={() => onAddSubordinate(node.id)}
                  title="Cadastrar apoiador subordinado a este líder"
                  className="btn btn-secondary"
                  style={{ padding: '6px 8px', borderRadius: '6px' }}
                >
                  <Plus size={14} color="#10b981" />
                </button>
              )}

              {onEditLeader && (
                <button
                  onClick={() => onEditLeader(node)}
                  title="Editar dados da liderança"
                  className="btn btn-secondary"
                  style={{ padding: '6px 8px', borderRadius: '6px' }}
                >
                  <Pencil size={14} color="#38bdf8" />
                </button>
              )}

              {onDeleteLeader && (
                <button
                  onClick={() => onDeleteLeader(node)}
                  title="Excluir cadastro"
                  className="btn btn-secondary"
                  style={{ padding: '6px 8px', borderRadius: '6px' }}
                >
                  <Trash2 size={14} color="#ef4444" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Nós Filhos Recursivos */}
        {hasChildren && isExpanded && (
          <div className="tree-node-children">
            {node.children.map((child: any) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      {/* Header & Ações da Árvore */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '20px', color: 'var(--text-primary)' }}>Rede Hierárquica de Lideranças</h2>
            {maskLGPD && (
              <span className="badge badge-verde" style={{ display: 'inline-flex', gap: '4px' }}>
                <Shield size={12} />
                Protegido por LGPD
              </span>
            )}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
            Visualização em tempo real da capilaridade eleitoral gerada por cada líder e sua rede descendente.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleRecalculate}
            disabled={isRecalculating}
            className="btn btn-secondary"
            style={{ padding: '8px 14px', fontSize: '13px' }}
            title="Executa a query recursiva CTE no PostgreSQL da VPS"
          >
            <RefreshCw size={15} className={isRecalculating ? 'spin' : ''} />
            <span>{isRecalculating ? 'Recalculando...' : 'Recalcular Métricas'}</span>
          </button>

          <button onClick={onNewLeader} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
            <UserPlus size={16} />
            <span>Cadastrar Liderança / Apoiador</span>
          </button>
        </div>
      </div>

      {/* Gamificação & Leaderboard das Melhores Lideranças */}
      {topLeadersGamified.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '14px',
            marginBottom: '20px',
          }}
        >
          {topLeadersGamified.map((leader, idx) => {
            const medal = idx === 0 ? '🥇 TOP 1 • OURO' : idx === 1 ? '🥈 TOP 2 • PRATA' : '🥉 TOP 3 • BRONZE';
            const medalBorder =
              idx === 0
                ? 'rgba(234, 179, 8, 0.4)'
                : idx === 1
                ? 'rgba(148, 163, 184, 0.4)'
                : 'rgba(217, 119, 6, 0.4)';
            const medalBg =
              idx === 0
                ? 'linear-gradient(135deg, rgba(234, 179, 8, 0.12), rgba(15, 23, 42, 0.6))'
                : idx === 1
                ? 'linear-gradient(135deg, rgba(148, 163, 184, 0.12), rgba(15, 23, 42, 0.6))'
                : 'linear-gradient(135deg, rgba(217, 119, 6, 0.12), rgba(15, 23, 42, 0.6))';

            return (
              <div
                key={leader.id}
                style={{
                  padding: '14px 16px',
                  borderRadius: '12px',
                  background: medalBg,
                  border: `1px solid ${medalBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ fontSize: '22px' }}>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</div>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: idx === 0 ? '#fbbf24' : idx === 1 ? '#cbd5e1' : '#f59e0b' }}>
                      {medal}
                    </span>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>{leader.nome}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{leader.bairro || 'Sem bairro'}</div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--primary)' }}>
                    {leader.total_indicados_rede || 0}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>eleitores na rede</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Barra de Pesquisa e Filtros */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search
            size={18}
            color="var(--text-muted)"
            style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            placeholder="Buscar líder ou apoiador por nome, telefone ou bairro..."
            className="input-field"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '42px' }}
          />
        </div>

        {allBairros.length > 0 && (
          <select
            value={selectedBairro}
            onChange={(e) => setSelectedBairro(e.target.value)}
            className="input-field"
            style={{ width: 'auto', fontWeight: 600, fontSize: '12px', padding: '6px 12px' }}
          >
            <option value="TODOS">Todos os Bairros ({allBairros.length})</option>
            {allBairros.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        )}

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          {['TODOS', 'LIDER', 'GESTOR', 'VOLUNTARIO', 'APOIADOR'].map((role) => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={selectedRole === role ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px' }}
            >
              {role === 'TODOS' ? 'Todos os Cargos' : role}
            </button>
          ))}
        </div>
      </div>

      {/* Renderização da Árvore */}
      {filteredTree.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary)' }}>
          <Users size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <p style={{ fontSize: '15px', fontWeight: 600 }}>Nenhuma liderança encontrada para o filtro atual.</p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Limpe a busca ou clique em "Cadastrar Liderança" para adicionar novos membros.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {filteredTree.map((rootNode) => renderNode(rootNode))}
        </div>
      )}
    </div>
  );
};
