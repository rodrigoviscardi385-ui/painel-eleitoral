'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  UserCheck,
  ShieldCheck,
  Plus,
  Trash2,
  Lock,
  Mail,
  Phone,
  CheckSquare,
  Square,
  AlertCircle,
  CheckCircle2,
  Loader2,
  KeyRound,
  Users,
} from 'lucide-react';

interface SystemUser {
  id: string;
  nome: string;
  email: string;
  whatsapp?: string;
  role: 'ADMIN' | 'COORDENADOR' | 'OPERADOR' | 'LIDER';
  permissoes: string[];
  ativo: string;
  ultimo_login?: string;
  created_at: string;
}

interface ModalUsuariosAuthProps {
  isOpen: boolean;
  onClose: () => void;
  apiBaseUrl?: string;
}

const AVAILABLE_PERMISSIONS = [
  { id: 'COCKPIT', label: 'Cockpit & Metas', desc: 'Visualização de gráficos e metas da campanha' },
  { id: 'ARVORE', label: 'Árvore de Liderança', desc: 'Acesso e gestão de líderes e apoiadores' },
  { id: 'DISPAROS', label: 'Disparos em Massa', desc: 'Criar e executar campanhas de WhatsApp' },
  { id: 'CHAT', label: 'Chat ao Vivo', desc: 'Responder eleitores em tempo real pelo painel' },
  { id: 'GASTOS', label: 'Gastos & Finanças', desc: 'Controle de despesas, recibos, OCR e prestação de contas' },
  { id: 'LGPD', label: 'Auditoria LGPD', desc: 'Desmascarar telefones e exportar relatórios' },
  { id: 'USUARIOS', label: 'Gestão de Logins', desc: 'Criar novos acessos para a equipe' },
];

export function ModalUsuariosAuth({
  isOpen,
  onClose,
  apiBaseUrl = 'http://localhost:3001',
}: ModalUsuariosAuthProps) {
  const [usuarios, setUsuarios] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'COORDENADOR' | 'OPERADOR' | 'LIDER'>('OPERADOR');
  const [selectedPerms, setSelectedPerms] = useState<string[]>(['CHAT']);

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/auth/usuarios`);
      if (res.ok) {
        const data = await res.json();
        setUsuarios(data.usuarios || []);
      }
    } catch (err) {
      console.error('Erro ao buscar usuários do sistema:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsuarios();
      setMessage(null);
    }
  }, [isOpen]);

  // Atualiza permissões padrão ao trocar de cargo
  const handleRoleChange = (newRole: 'ADMIN' | 'COORDENADOR' | 'OPERADOR' | 'LIDER') => {
    setRole(newRole);
    if (newRole === 'ADMIN') {
      setSelectedPerms(['COCKPIT', 'ARVORE', 'DISPAROS', 'CHAT', 'GASTOS', 'LGPD', 'USUARIOS']);
    } else if (newRole === 'COORDENADOR') {
      setSelectedPerms(['COCKPIT', 'ARVORE', 'DISPAROS', 'CHAT', 'GASTOS']);
    } else if (newRole === 'OPERADOR') {
      setSelectedPerms(['CHAT', 'DISPAROS']);
    } else {
      setSelectedPerms(['ARVORE', 'CHAT']);
    }
  };

  const togglePermission = (permId: string) => {
    setSelectedPerms((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim() || !senha.trim()) {
      setMessage({ type: 'error', text: 'Preencha o nome, e-mail e senha de acesso.' });
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/auth/usuarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome.trim(),
          email: email.trim().toLowerCase(),
          senha,
          whatsapp: whatsapp.replace(/\D/g, ''),
          role,
          permissoes: selectedPerms,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({
          type: 'success',
          text: `Usuário ${nome} cadastrado com sucesso com o cargo ${role}!`,
        });
        setNome('');
        setEmail('');
        setSenha('');
        setWhatsapp('');
        fetchUsuarios();
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao cadastrar login.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Falha na conexão com o servidor.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string, userName: string) => {
    if (!confirm(`Deseja realmente remover o acesso de ${userName}?`)) return;

    try {
      const res = await fetch(`${apiBaseUrl}/api/auth/usuarios/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setUsuarios((prev) => prev.filter((u) => u.id !== id));
        setMessage({ type: 'success', text: `Acesso de ${userName} removido.` });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao remover usuário.' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Gestão de Logins & Controle de Acessos
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  RBAC
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Cadastre e defina permissões para coordenadores, atendentes e líderes de campanha
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback de Mensagem */}
        {message && (
          <div
            className={`mx-6 mt-4 p-4 rounded-xl flex items-center gap-3 text-xs ${
              message.type === 'success'
                ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300'
                : 'bg-red-950/80 border border-red-800 text-red-300'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Conteúdo Principal com Duas Colunas */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Formulário de Cadastro (5 colunas) */}
          <div className="lg:col-span-5 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
              <Plus className="w-4 h-4 text-emerald-400" />
              Novo Acesso ao Sistema
            </h4>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nome Completo</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Carlos Oliveira"
                  required
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">E-mail de Login</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="carlos@campanha.com"
                  required
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Senha</label>
                  <input
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">WhatsApp</label>
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="13999998888"
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Cargo / Perfil</label>
                <select
                  value={role}
                  onChange={(e) => handleRoleChange(e.target.value as any)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500/60"
                >
                  <option value="OPERADOR">Operador / Atendente (Chat & Envios)</option>
                  <option value="COORDENADOR">Coordenador Geral (Metas, Árvore e Chat)</option>
                  <option value="ADMIN">Super Administrador (Acesso Total)</option>
                  <option value="LIDER">Líder Regional (Sua Rede Própria)</option>
                </select>
              </div>

              {/* Checkboxes de Permissões Granulares */}
              <div className="pt-2 border-t border-slate-800/80">
                <label className="block text-xs font-semibold text-slate-300 mb-2">Permissões Específicas</label>
                <div className="space-y-1.5">
                  {AVAILABLE_PERMISSIONS.map((perm) => {
                    const isChecked = selectedPerms.includes(perm.id);
                    return (
                      <button
                        key={perm.id}
                        type="button"
                        onClick={() => togglePermission(perm.id)}
                        className="w-full text-left p-2 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 flex items-start gap-2.5 transition-all cursor-pointer"
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div className="text-xs font-semibold text-slate-200">{perm.label}</div>
                          <div className="text-[10px] text-slate-500">{perm.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-emerald-950/50 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Cadastrar Usuário</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Lista de Usuários Cadastrados (7 colunas) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                Usuários com Acesso ({usuarios.length})
              </h4>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
                Carregando acessos...
              </div>
            ) : usuarios.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Nenhum usuário cadastrado além do Super Admin.
              </div>
            ) : (
              <div className="space-y-2.5">
                {usuarios.map((u) => (
                  <div
                    key={u.id}
                    className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/60 transition-all flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{u.nome}</span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            u.role === 'ADMIN'
                              ? 'bg-purple-950/80 text-purple-300 border border-purple-800/50'
                              : u.role === 'COORDENADOR'
                              ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/50'
                              : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/50'
                          }`}
                        >
                          {u.role}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span className="font-mono">{u.email}</span>
                        {u.whatsapp && <span className="font-mono">{u.whatsapp}</span>}
                      </div>

                      {/* Badges de Permissões */}
                      <div className="flex items-center gap-1 flex-wrap pt-1">
                        {u.permissoes.map((p) => (
                          <span
                            key={p}
                            className="text-[9px] px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800 font-mono"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>

                    {u.email !== 'admin@painel.com' && (
                      <button
                        onClick={() => handleDeleteUser(u.id, u.nome)}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                        title="Remover Acesso"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
