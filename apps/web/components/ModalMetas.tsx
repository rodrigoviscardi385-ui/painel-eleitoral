'use client';

import React, { useState, useEffect } from 'react';
import { X, Target, Calendar, Award, CheckCircle2 } from 'lucide-react';

interface ModalMetasProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  apiBaseUrl?: string;
}

export const ModalMetas: React.FC<ModalMetasProps> = ({
  isOpen,
  onClose,
  onSuccess,
  apiBaseUrl = '',
}) => {
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState<'GLOBAL' | 'ZONA' | 'BAIRRO' | 'LIDER'>('LIDER');
  const [alvoReferencia, setAlvoReferencia] = useState('');
  const [leaders, setLeaders] = useState<any[]>([]);
  const [quantidadeMeta, setQuantidadeMeta] = useState<number>(300);
  const [metaDiariaCadencia, setMetaDiariaCadencia] = useState<number>(10);
  const [dataFim, setDataFim] = useState(
    new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Carregar lista de líderes para seleção
  useEffect(() => {
    if (!isOpen) return;

    fetch(`${apiBaseUrl}/api/liderancas/tree?maskLGPD=false`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.lideres && Array.isArray(data.lideres)) {
          const extract = (arr: any[]): any[] => {
            let res: any[] = [];
            for (const item of arr) {
              res.push({
                id: item.id,
                nome: item.nome,
                cargo: item.cargo,
                zona_eleitoral: item.zona_eleitoral,
                bairro: item.bairro,
              });
              if (item.subordinados?.length) {
                res = res.concat(extract(item.subordinados));
              }
            }
            return res;
          };
          const all = extract(data.lideres);
          setLeaders(all);
          if (all.length > 0 && !alvoReferencia) {
            setAlvoReferencia(all[0].nome);
            setTitulo(`Meta de Mobilização - ${all[0].nome}`);
          }
        }
      })
      .catch(() => {});
  }, [isOpen, apiBaseUrl]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) {
      setErrorMsg('Informe o título da meta.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch(`${apiBaseUrl}/api/metas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo,
          tipo,
          alvo_referencia: alvoReferencia.trim() || null,
          quantidade_meta: Number(quantidadeMeta),
          meta_diaria_cadencia: Number(metaDiariaCadencia),
          data_fim: new Date(dataFim).toISOString(),
        }),
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Falha ao salvar meta.');
      }
    } catch (err) {
      setErrorMsg('Erro de conexão ao salvar meta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg glass-dropdown rounded-2xl p-6 border border-slate-700 shadow-2xl space-y-5">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Parametrizar Nova Meta Eleitoral</h3>
              <p className="text-xs text-slate-400">Defina objetivos territoriais e cadência diária de apoios.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-lg">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Título da Meta</label>
            <input
              type="text"
              placeholder="Ex: Mobilização Santana / Zona Norte"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Tipo de Meta</label>
              <select
                value={tipo}
                onChange={(e: any) => {
                  const newTipo = e.target.value;
                  setTipo(newTipo);
                  if (newTipo === 'LIDER' && leaders.length > 0) {
                    setAlvoReferencia(leaders[0].nome);
                    setTitulo(`Meta de Mobilização - ${leaders[0].nome}`);
                  } else if (newTipo === 'ZONA') {
                    setAlvoReferencia('Zona 120');
                    setTitulo('Meta de Mobilização - Zona 120');
                  } else if (newTipo === 'BAIRRO') {
                    setAlvoReferencia('Centro');
                    setTitulo('Meta de Mobilização - Centro');
                  } else {
                    setAlvoReferencia('Campanha Geral');
                    setTitulo('Meta Geral de Votos da Campanha');
                  }
                }}
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="LIDER">👤 Por Liderança</option>
                <option value="ZONA">📍 Por Zona Eleitoral</option>
                <option value="BAIRRO">🏙️ Por Bairro</option>
                <option value="GLOBAL">🌐 Global (Campanha)</option>
              </select>
            </div>

            {tipo === 'LIDER' ? (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Selecione o Líder *</label>
                <select
                  value={alvoReferencia}
                  onChange={(e) => {
                    const lNome = e.target.value;
                    setAlvoReferencia(lNome);
                    if (lNome) {
                      setTitulo(`Meta de Mobilização - ${lNome}`);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                  required
                >
                  <option value="">-- Selecione o Líder --</option>
                  {leaders.map((l) => (
                    <option key={l.id} value={l.nome}>
                      👤 {l.nome} ({l.cargo}) {l.zona_eleitoral ? `• Z:${l.zona_eleitoral}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Referência Territorial / Alvo</label>
                <input
                  type="text"
                  placeholder={tipo === 'ZONA' ? 'Ex: Zona 120' : tipo === 'BAIRRO' ? 'Ex: Centro ou Santana' : 'Ex: Campanha Geral'}
                  value={alvoReferencia}
                  onChange={(e) => setAlvoReferencia(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Total de Votos / Apoios (Meta)</label>
              <input
                type="number"
                min="1"
                value={quantidadeMeta}
                onChange={(e) => setQuantidadeMeta(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500 font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Cadência Diária Desejada</label>
              <input
                type="number"
                min="1"
                value={metaDiariaCadencia}
                onChange={(e) => setMetaDiariaCadencia(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500 font-bold"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Data Limite / Prazo Eleitoral</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg shadow-lg shadow-cyan-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'Salvando...' : 'Salvar Meta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
