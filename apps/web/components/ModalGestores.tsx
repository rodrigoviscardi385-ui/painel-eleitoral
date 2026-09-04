'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  UserCheck,
  ShieldCheck,
  Plus,
  Trash2,
  Phone,
  MapPin,
  Users,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

interface Gestor {
  id: string;
  nome: string;
  whatsapp: string;
  cargo: 'ADMIN' | 'GESTOR';
  bairro?: string;
  zona_eleitoral?: string;
  created_at: string;
}

interface ModalGestoresProps {
  isOpen: boolean;
  onClose: () => void;
  apiBaseUrl?: string;
}

export function ModalGestores({
  isOpen,
  onClose,
  apiBaseUrl = '',
}: ModalGestoresProps) {
  const effectiveBaseUrl = !apiBaseUrl || apiBaseUrl.includes('localhost') ? '' : apiBaseUrl;
  const [gestores, setGestores] = useState<Gestor[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [cargo, setCargo] = useState<'GESTOR' | 'ADMIN'>('GESTOR');
  const [bairro, setBairro] = useState('');

  const fetchGestores = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${effectiveBaseUrl}/api/gestores`);
      if (res.ok) {
        const data = await res.json();
        setGestores(data.gestores || []);
      }
    } catch (err) {
      console.error('Erro ao buscar gestores:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchGestores();
      setMessage(null);
    }
  }, [isOpen]);

  const handleCreateGestor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !whatsapp.trim()) {
      setMessage({ type: 'error', text: 'Preencha o nome e o WhatsApp do gestor.' });
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch(`${effectiveBaseUrl}/api/gestores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome.trim(),
          whatsapp: whatsapp.replace(/\D/g, ''),
          cargo,
          bairro: bairro.trim() || 'Geral',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({
          type: 'success',
          text: `Gestor ${nome} cadastrado com sucesso! Ele será co-administrador em todos os grupos de base.`,
        });
        setNome('');
        setWhatsapp('');
        setBairro('');
        fetchGestores();
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao cadastrar gestor.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Falha na conexão com o servidor.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGestor = async (id: string, nomeGestor: string) => {
    if (!confirm(`Deseja realmente remover o gestor ${nomeGestor}?`)) return;

    setDeletingId(id);
    try {
      const res = await fetch(`${effectiveBaseUrl}/api/gestores/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setGestores((prev) => prev.filter((g) => g.id !== id));
        setMessage({ type: 'success', text: `Gestor ${nomeGestor} removido.` });
      }
    } catch (err) {
      console.error('Erro ao excluir gestor:', err);
    } finally {
      setDeletingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-wide">
                Gestores & Administradores de Grupos
              </h2>
              <p className="text-xs text-slate-400">
                Co-administradores oficiais em todos os grupos de WhatsApp criados pelos Líderes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Banner Informativo */}
        <div className="mx-6 mt-4 p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-start gap-3 text-xs text-purple-200">
          <Users className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
          <p>
            <strong>Inclusão Automática 24/7:</strong> Sempre que um novo Líder Comunitário concluir o onboarding no WhatsApp, o robô criará o grupo de base e <strong>adicionará e promoverá a Administrador</strong> automaticamente todos os Gestores e Admins cadastrados abaixo.
          </p>
        </div>

        {/* Feedback Messages */}
        {message && (
          <div
            className={`mx-6 mt-3 p-3 rounded-lg text-xs flex items-center gap-2 border ${
              message.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
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

        {/* Corpo do Modal */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Formulário de Cadastro */}
          <form
            onSubmit={handleCreateGestor}
            className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-4"
          >
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Plus className="w-4 h-4 text-purple-400" /> Cadastrar Novo Gestor / Administrador
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Carlos Eduardo"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  WhatsApp com DDD *
                </label>
                <input
                  type="text"
                  placeholder="Ex: 11999998888"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Cargo / Função
                </label>
                <select
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors cursor-pointer"
                >
                  <option value="GESTOR">GESTOR (Coordenador Regional)</option>
                  <option value="ADMIN">ADMIN (Coordenação Geral)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Bairro / Região de Responsabilidade
                </label>
                <input
                  type="text"
                  placeholder="Ex: Zona Sul / Centro"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-lg shadow-lg shadow-purple-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" /> Adicionar Gestor
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Lista de Gestores */}
          <div>
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>Gestores Cadastrados ({gestores.length})</span>
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />}
            </h3>

            {gestores.length === 0 && !loading ? (
              <div className="p-8 text-center rounded-xl bg-slate-950/20 border border-slate-800 text-slate-500 text-xs">
                Nenhum gestor cadastrado ainda. Adicione o primeiro no formulário acima!
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5">
                {gestores.map((g) => (
                  <div
                    key={g.id}
                    className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg border ${
                          g.cargo === 'ADMIN'
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                            : 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                        }`}
                      >
                        {g.cargo === 'ADMIN' ? (
                          <ShieldCheck className="w-4 h-4" />
                        ) : (
                          <UserCheck className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{g.nome}</span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                              g.cargo === 'ADMIN'
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                            }`}
                          >
                            {g.cargo}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-500" />
                            {g.whatsapp}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            {g.bairro || 'Geral'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteGestor(g.id, g.nome)}
                      disabled={deletingId === g.id}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                      title="Excluir Gestor"
                    >
                      {deletingId === g.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
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
