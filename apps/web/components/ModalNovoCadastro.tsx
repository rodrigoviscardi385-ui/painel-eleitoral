'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  UserPlus,
  Phone,
  MapPin,
  Vote,
  Users,
  Shield,
  Heart,
  Star,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { TreeNode } from './ArvoreLideranca';

interface ModalNovoCadastroProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  lideresDisponiveis?: TreeNode[];
  liderPreSelecionadoId?: string | null;
}

export function ModalNovoCadastro({
  isOpen,
  onClose,
  onSuccess,
  lideresDisponiveis = [],
  liderPreSelecionadoId = null,
}: ModalNovoCadastroProps) {
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [cargo, setCargo] = useState<'LIDER' | 'GESTOR' | 'APOIADOR' | 'VOLUNTARIO'>('LIDER');
  const [bairro, setBairro] = useState('');
  const [zona, setZona] = useState('');
  const [secao, setSecao] = useState('');
  const [liderAcimaId, setLiderAcimaId] = useState<string>('');
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNome('');
      setWhatsapp('');
      setCargo('LIDER');
      setBairro('');
      setZona('');
      setSecao('');
      setLiderAcimaId(liderPreSelecionadoId || '');
      setNotas('');
      setMessage(null);
    }
  }, [isOpen, liderPreSelecionadoId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setMessage({ type: 'error', text: 'Informe o nome completo.' });
      return;
    }
    if (!whatsapp.trim()) {
      setMessage({ type: 'error', text: 'Informe o número de WhatsApp.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/liderancas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome.trim(),
          whatsapp: whatsapp.trim(),
          cargo,
          bairro: bairro.trim(),
          zona_eleitoral: zona.trim(),
          secao_eleitoral: secao.trim(),
          lider_acima_id: liderAcimaId || null,
          notas: notas.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao cadastrar.');
      }

      setMessage({
        type: 'success',
        text: `Cadastro de ${nome} (${cargo}) realizado com sucesso!`,
      });

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 900);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Falha ao salvar cadastro.' });
    } finally {
      setLoading(false);
    }
  };

  const cargosDesc = {
    LIDER: {
      label: 'Líder Comunitário',
      desc: 'Capta eleitores, forma rede e tem direito a criar Grupo Oficial de WhatsApp.',
      icon: Users,
      badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    },
    GESTOR: {
      label: 'Gestor / Coord.',
      desc: 'Coordenador da campanha, promovido a administrador em todos os grupos.',
      icon: Shield,
      badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    },
    APOIADOR: {
      label: 'Apoiador / Eleitor',
      desc: 'Eleitor cadastrado na base comunitária que vota e apoia o candidato.',
      icon: Heart,
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    },
    VOLUNTARIO: {
      label: 'Voluntário de Rua',
      desc: 'Militante ativo em carreatas, distribuição de materiais e mobilização.',
      icon: Star,
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="glass-panel w-full max-w-lg rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden animate-scaleUp">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Novo Cadastro Manual</h3>
              <p className="text-xs text-slate-400">Cadastre Líderes, Gestores, Apoiadores e Voluntários</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Messages */}
        {message && (
          <div
            className={`p-3.5 mx-5 mt-4 rounded-xl text-xs flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
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

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Seletor de Cargo */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
              Função na Campanha:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['LIDER', 'GESTOR', 'APOIADOR', 'VOLUNTARIO'] as const).map((c) => {
                const Item = cargosDesc[c];
                const Icon = Item.icon;
                const isSelected = cargo === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCargo(c)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-cyan-500 bg-cyan-500/15 ring-1 ring-cyan-500/40 text-white'
                        : 'border-slate-800 bg-slate-900/40 hover:bg-slate-800/60 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />
                      <span className="text-xs font-bold">{Item.label}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 line-clamp-2">{Item.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nome e WhatsApp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Nome Completo *</label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: João Silva"
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">WhatsApp / Celular *</label>
              <input
                type="text"
                required
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="Ex: (11) 98765-4321"
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          {/* Bairro, Zona e Seção */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Bairro / Região</label>
              <input
                type="text"
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                placeholder="Ex: Centro"
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Zona Eleitoral</label>
              <input
                type="text"
                value={zona}
                onChange={(e) => setZona(e.target.value)}
                placeholder="Ex: 120"
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Seção</label>
              <input
                type="text"
                value={secao}
                onChange={(e) => setSecao(e.target.value)}
                placeholder="Ex: 45"
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Indicado por (Líder Acima) */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Indicado por / Líder Superior (Opcional):
            </label>
            <select
              value={liderAcimaId}
              onChange={(e) => setLiderAcimaId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="">Nenhum (Liderança Direta da Coordenação)</option>
              {lideresDisponiveis.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome} ({l.cargo}) {l.bairro ? `— ${l.bairro}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Observações / Notas */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Observações Internas</label>
            <textarea
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ex: Reunião agendada para sábado, liderança de igreja..."
              className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 rounded-xl shadow-lg shadow-cyan-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Cadastrar {cargosDesc[cargo].label}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
