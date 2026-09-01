'use client';

import React, { useState } from 'react';
import {
  X,
  Users,
  Sparkles,
  Plus,
  ExternalLink,
  Copy,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

interface ModalCriarGrupoProps {
  isOpen: boolean;
  onClose: () => void;
  apiBaseUrl?: string;
  onGroupCreated?: (result: { groupId: string; inviteLink: string }) => void;
}

export function ModalCriarGrupo({
  isOpen,
  onClose,
  apiBaseUrl = 'http://localhost:3001',
  onGroupCreated,
}: ModalCriarGrupoProps) {
  const [nomeGrupo, setNomeGrupo] = useState('');
  const [numeroLider, setNumeroLider] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdGroup, setCreatedGroup] = useState<{ groupId: string; inviteLink: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeGrupo.trim()) {
      setError('Informe o nome do grupo.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/whatsapp/groups/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupName: nomeGrupo.trim(),
          leaderNumber: numeroLider.replace(/\D/g, ''),
        }),
      });

      const data = await res.json();
      if (res.ok && data.inviteLink) {
        setCreatedGroup({
          groupId: data.groupId,
          inviteLink: data.inviteLink,
          name: nomeGrupo.trim(),
        });
        if (onGroupCreated) {
          onGroupCreated(data);
        }
      } else {
        setError(data.error || 'Falha ao criar grupo de WhatsApp.');
      }
    } catch (err) {
      setError('Erro de comunicação com o servidor.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyInviteLink = () => {
    if (createdGroup?.inviteLink) {
      navigator.clipboard.writeText(createdGroup.inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-wide">
                Criar Grupo Oficial de WhatsApp
              </h2>
              <p className="text-xs text-slate-400">
                Automação oficial de grupo de base da campanha
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

        {/* Banner de Automação */}
        <div className="mx-6 mt-4 p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-start gap-2.5 text-xs text-purple-200">
          <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          <p>
            <strong>Automação Ativa:</strong> Todos os Gestores e Coordenadores cadastrados no sistema serão automaticamente inseridos no grupo e promovidos a <strong>Administradores</strong>.
          </p>
        </div>

        {/* Mensagem de Erro */}
        {error && (
          <div className="mx-6 mt-3 p-3 rounded-lg text-xs bg-rose-500/10 text-rose-300 border border-rose-500/30 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Corpo do Modal */}
        <div className="p-6">
          {!createdGroup ? (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Nome do Grupo *
                </label>
                <input
                  type="text"
                  placeholder="Ex: [Base] Carlos • Campanha 2026"
                  value={nomeGrupo}
                  onChange={(e) => setNomeGrupo(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  WhatsApp do Líder Responsável (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 11999998888 (deixe em branco se for grupo geral)"
                  value={numeroLider}
                  onChange={(e) => setNumeroLider(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-lg shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Criando Grupo no WhatsApp...
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" /> Criar Grupo Agora
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center space-y-4 py-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-sm font-bold text-white">Grupo Criado com Sucesso!</h3>
                <p className="text-xs text-slate-400 mt-0.5">{createdGroup.name}</p>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-left space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Link de Convite Oficial
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={createdGroup.inviteLink}
                    className="flex-1 px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-emerald-300 select-all font-mono"
                  />
                  <button
                    onClick={copyInviteLink}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                    title="Copiar link"
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <a
                  href={createdGroup.inviteLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-lg shadow-emerald-600/20 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Abrir no WhatsApp <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
                </a>
                <button
                  onClick={() => {
                    setCreatedGroup(null);
                    setNomeGrupo('');
                    setNumeroLider('');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Criar Outro Grupo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
