import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  FileText,
  Clock,
  Briefcase,
  DollarSign,
  Search,
  Filter,
  Trash2,
  Edit2,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Phone,
  MapPin,
  ShieldCheck,
  Building,
  Printer,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import { api } from '../api';
import { StreetTeamModal } from './StreetTeamModal';
import { StreetContractModal } from './StreetContractModal';

export const StreetTeamManager: React.FC = () => {
  const [membros, setMembros] = useState<any[]>([]);
  const [metricas, setMetricas] = useState({
    total: 0,
    meioPeriodo: 0,
    periodoIntegral: 0,
    folhaTotal: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroJornada, setFiltroJornada] = useState<string>('');
  const [filtroStatus, setFiltroStatus] = useState<string>('');

  // Modais
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [contractModalMember, setContractModalMember] = useState<any | null>(null);

  useEffect(() => {
    loadData();
  }, [searchTerm, filtroJornada, filtroStatus]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getEquipeRua({
        busca: searchTerm,
        tipo_jornada: filtroJornada || undefined,
        status_contrato: filtroStatus || undefined,
      });
      setMembros(res.membros || []);
      setMetricas(res.metricas || { total: 0, meioPeriodo: 0, periodoIntegral: 0, folhaTotal: 0 });
    } catch (err: any) {
      console.error('Erro ao carregar equipe de rua:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, nome: string) => {
    if (!confirm(`Deseja remover ${nome} da Equipe de Rua?`)) return;
    try {
      await api.deleteEquipeRua(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir membro.');
    }
  };

  const handleUpdateStatus = async (id: string, novoStatus: string) => {
    try {
      await api.updateEquipeRua(id, { status_contrato: novoStatus });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar status.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Bar Header */}
      <div className="bg-slate-900/80 border border-slate-800 backdrop-blur-md rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Módulo Segregado TSE • Lei 9.504/97
            </span>
            <span className="text-xs text-slate-400">• Santos/SP 2026</span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1.5 tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-emerald-400" /> Equipe de Rua & Contratos Eleitorais
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Cadastro independente de militância e mobilizadores de rua com emissão jurídica de contratos TSE (Meio Período e Período Integral).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2"
            title="Recarregar dados"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          <button
            onClick={() => {
              setEditingMember(null);
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition-all hover:scale-[1.02]"
          >
            <UserPlus className="w-4 h-4" />
            Cadastrar Equipe de Rua
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>TOTAL EQUIPE DE RUA</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">{metricas.total}</div>
          <div className="text-xs text-slate-500 mt-1">Militantes cadastrados</div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>MEIO PERÍODO (20H)</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-sky-400">{metricas.meioPeriodo}</div>
          <div className="text-xs text-slate-500 mt-1">4h diárias • Sem exclusividade</div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>PERÍODO INTEGRAL (40H)</span>
            <Briefcase className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{metricas.periodoIntegral}</div>
          <div className="text-xs text-slate-500 mt-1">8h diárias de mobilização</div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>FOLHA TOTAL PACTUADA</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {metricas.folhaTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
          <div className="text-xs text-slate-500 mt-1">Conta Eleitoral TSE</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-md">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, CPF, WhatsApp ou bairro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={filtroJornada}
            onChange={(e) => setFiltroJornada(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="">Todas as Modalidades</option>
            <option value="MEIO_PERIODO">Meio Período (20h)</option>
            <option value="PERIODO_INTEGRAL">Período Integral (40h)</option>
          </select>

          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="">Todos os Status</option>
            <option value="MINUTA_GERADA">Minuta Gerada</option>
            <option value="ASSINADO">Assinado</option>
            <option value="PAGO">Pago</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
        </div>
      </div>

      {/* Street Team Member Cards */}
      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center text-slate-400">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs">Carregando equipe de rua...</p>
        </div>
      ) : membros.length === 0 ? (
        <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-12 text-center">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-white">Nenhum membro da equipe de rua cadastrado</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Cadastre os membros da militância de rua para gerar os contratos conforme o Artigo 100 da Lei 9.504/1997 com opções de Meio Período e Período Integral.
          </p>
          <button
            onClick={() => {
              setEditingMember(null);
              setIsCreateModalOpen(true);
            }}
            className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-lg shadow-emerald-950"
          >
            <UserPlus className="w-4 h-4" />
            Cadastrar Primeiro Membro
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {membros.map((m) => {
            const isMeio = m.tipo_jornada === 'MEIO_PERIODO';
            const statusColors: Record<string, string> = {
              MINUTA_GERADA: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
              ASSINADO: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
              PAGO: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
              CANCELADO: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
            };

            return (
              <div
                key={m.id}
                className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all hover:translate-y-[-2px] group"
              >
                <div>
                  {/* Card Top: Badges & Actions */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border flex items-center gap-1.5 ${
                        isMeio
                          ? 'bg-sky-500/10 text-sky-300 border-sky-500/20'
                          : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                      }`}
                    >
                      {isMeio ? <Clock className="w-3 h-3" /> : <Briefcase className="w-3 h-3" />}
                      {isMeio ? 'Meio Período (20h)' : 'Período Integral (40h)'}
                    </span>

                    <span
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                        statusColors[m.status_contrato] || statusColors.MINUTA_GERADA
                      }`}
                    >
                      {m.status_contrato.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Nome & Cargo */}
                  <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                    {m.nome_completo}
                  </h3>
                  <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-slate-500" />
                    <span>{m.bairro}, {m.cidade || 'Santos'} • Zona {m.zona_eleitoral || '118'}</span>
                  </div>

                  {/* Detalhes Civis & Bancários */}
                  <div className="mt-3.5 space-y-1.5 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">CPF:</span>
                      <span className="font-mono text-slate-200">{m.cpf}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">WhatsApp:</span>
                      <a
                        href={`https://wa.me/55${m.telefone_whatsapp}?text=Ol%C3%A1%20${encodeURIComponent(m.nome_completo)},%20falamos%20da%20coordena%C3%A7%C3%A3o%20da%20Campanha%20Gustavo%20Reis.`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" /> {m.telefone_whatsapp}
                      </a>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Função:</span>
                      <span className="font-medium text-slate-300">
                        {m.funcao_atividade === 'MOBILIZADOR_RUA' ? 'Mobilizador de Rua' : m.funcao_atividade}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-800/80 pt-1.5">
                      <span className="text-slate-500 font-semibold">Remuneração:</span>
                      <span className="text-emerald-400 font-bold">
                        {Number(m.remuneracao_pactuada).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Botão Gerar Contrato + Menu */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  {/* Botão de Destaque: GERAR CONTRATO */}
                  <button
                    onClick={() => setContractModalMember(m)}
                    className="flex-1 px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all hover:scale-[1.02]"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Gerar Contrato TSE
                  </button>

                  <button
                    onClick={() => {
                      setEditingMember(m);
                      setIsCreateModalOpen(true);
                    }}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition-colors"
                    title="Editar dados"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDelete(m.id, m.nome_completo)}
                    className="p-2 bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 rounded-xl text-xs transition-colors"
                    title="Excluir membro"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modais */}
      {isCreateModalOpen && (
        <StreetTeamModal
          memberToEdit={editingMember}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingMember(null);
          }}
          onSuccess={(saved) => {
            setIsCreateModalOpen(false);
            setEditingMember(null);
            loadData();
            // Abre automaticamente o contrato para o novo membro gerado!
            setContractModalMember(saved);
          }}
        />
      )}

      {contractModalMember && (
        <StreetContractModal
          member={contractModalMember}
          onClose={() => setContractModalMember(null)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
};
