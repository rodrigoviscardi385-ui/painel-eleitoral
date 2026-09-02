'use client';

import React, { useState, useEffect } from 'react';
import { 
  Send, 
  FileText, 
  Users, 
  ShieldCheck, 
  Sparkles, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw,
  Layers,
  Filter,
  Paperclip
} from 'lucide-react';

interface CampaignItem {
  id: string;
  titulo: string;
  mensagem_template: string;
  url_midia_pdf?: string | null;
  filtro_tipo: string;
  filtro_valor?: string | null;
  total_alvos: number;
  total_enviados: number;
  total_erros: number;
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'FALHA';
  created_at: string;
}

interface DisparadorWhatsAppProps {
  apiBaseUrl?: string;
}

export const DisparadorWhatsApp: React.FC<DisparadorWhatsAppProps> = ({
  apiBaseUrl = 'http://localhost:3001',
}) => {
  const [titulo, setTitulo] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'ZONA' | 'BAIRRO' | 'LIDER'>('TODOS');
  const [filtroValor, setFiltroValor] = useState('');
  const [mensagemTemplate, setMensagemTemplate] = useState(
    'Olá, {nome}! Tudo bem?\n\nPassando para compartilhar nossa cartilha de propostas para o bairro {bairro}. Contamos com seu apoio!\n\nJuntos pela nossa cidade!'
  );
  const [urlMidiaPdf, setUrlMidiaPdf] = useState('');
  const [previewAlvos, setPreviewAlvos] = useState<number>(0);
  const [isCalculatingPreview, setIsCalculatingPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [campanhas, setCampanhas] = useState<CampaignItem[]>([]);
  const [isLoadingCampanhas, setIsLoadingCampanhas] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Calcular prévia de público-alvo
  useEffect(() => {
    const fetchPreview = async () => {
      setIsCalculatingPreview(true);
      try {
        const res = await fetch(`${apiBaseUrl}/api/disparos/preview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filtro_tipo: filtroTipo, filtro_valor: filtroValor }),
        });
        if (res.ok) {
          const data = await res.json();
          setPreviewAlvos(data.total_destinatarios || 0);
        }
      } catch (err) {
        console.warn('Erro ao buscar prévia:', err);
      } finally {
        setIsCalculatingPreview(false);
      }
    };

    const timer = setTimeout(fetchPreview, 300);
    return () => clearTimeout(timer);
  }, [filtroTipo, filtroValor, apiBaseUrl]);

  // Carregar histórico de campanhas
  const loadCampanhas = async () => {
    setIsLoadingCampanhas(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/disparos`);
      if (res.ok) {
        const data = await res.json();
        setCampanhas(data || []);
      }
    } catch (err) {
      console.warn('Erro ao carregar campanhas:', err);
    } finally {
      setIsLoadingCampanhas(false);
    }
  };

  useEffect(() => {
    loadCampanhas();
    const interval = setInterval(loadCampanhas, 5000); // Polling suave para acompanhar progresso
    return () => clearInterval(interval);
  }, [apiBaseUrl]);

  const insertVariable = (tag: string) => {
    setMensagemTemplate((prev) => `${prev} ${tag}`);
  };

  const handleSubmitDisparo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !mensagemTemplate.trim()) {
      setStatusMessage({ type: 'error', text: 'Preencha o título e a mensagem do disparo.' });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await fetch(`${apiBaseUrl}/api/disparos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo,
          mensagem_template: mensagemTemplate,
          url_midia_pdf: urlMidiaPdf.trim() || null,
          filtro_tipo: filtroTipo,
          filtro_valor: filtroValor.trim() || null,
          usuario_responsavel: 'COORDENADOR-GERAL',
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatusMessage({
          type: 'success',
          text: `Campanha "${titulo}" enfileirada com sucesso! ${data.total_enfileirados} mensagens serão enviadas com intervalos anti-ban.`,
        });
        setTitulo('');
        loadCampanhas();
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Falha ao iniciar disparo.' });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Erro de conexão com o servidor de disparos.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 glass-panel rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Disparador em Massa & Envio de PDFs</h3>
            <p className="text-xs text-slate-400">
              Disparos humanizados com delay pseudo-aleatório (3-7s), templates dinâmicos e proteção anti-bloqueio.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400">
          <ShieldCheck className="w-4 h-4" />
          Proteção Anti-Ban Ativa
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="text-xs font-bold hover:underline">
            Fechar
          </button>
        </div>
      )}

      {/* Grid: Formulário de Criação e Histórico de Campanhas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Formulário de Criação (7 colunas) */}
        <div className="glass-panel rounded-xl p-6 lg:col-span-7">
          <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            Configurar Novo Disparo de Mobilização
          </h4>

          <form onSubmit={handleSubmitDisparo} className="space-y-4">
            {/* Título da Campanha */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Título da Campanha</label>
              <input
                type="text"
                placeholder="Ex: Envio da Cartilha de Propostas - Zona Norte"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            {/* Segmentação de Público */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-cyan-400" /> Filtrar Destinatários
                </label>
                <select
                  value={filtroTipo}
                  onChange={(e: any) => setFiltroTipo(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  <option value="TODOS">Toda a Base Eleitoral</option>
                  <option value="ZONA">Por Zona Eleitoral</option>
                  <option value="BAIRRO">Por Bairro Específico</option>
                  <option value="LIDER">Por Rede de um Líder</option>
                </select>
              </div>

              {filtroTipo !== 'TODOS' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Valor do Filtro {filtroTipo === 'ZONA' ? '(Número da Zona)' : '(Nome do Bairro/ID)'}
                  </label>
                  <input
                    type="text"
                    placeholder={filtroTipo === 'ZONA' ? 'Ex: 120' : 'Ex: Centro ou Santana'}
                    value={filtroValor}
                    onChange={(e) => setFiltroValor(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              )}
            </div>

            {/* Prévia de Destinatários */}
            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-cyan-400" />
                Destinatários Estimados:
              </span>
              <span className="font-bold text-white text-sm">
                {isCalculatingPreview ? 'Calculando...' : `${previewAlvos} eleitores`}
              </span>
            </div>

            {/* Template da Mensagem */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-300">Mensagem com Tags Dinâmicas</label>
                <span className="text-[10px] text-slate-400">Clique para inserir variável:</span>
              </div>

              {/* Botões de Inserção de Tags e Spintax */}
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                {[
                  { tag: '{nome}', label: 'Nome Eleitor' },
                  { tag: '{bairro}', label: 'Bairro' },
                  { tag: '{zona}', label: 'Zona' },
                  { tag: '{secao}', label: 'Seção' },
                  { tag: '{Olá|Oi|Tudo bem}', label: 'Saudação Variável' },
                  { tag: '{Confira|Veja as novidades}', label: 'Ação Variável' },
                ].map((item) => (
                  <button
                    key={item.tag}
                    type="button"
                    onClick={() => insertVariable(item.tag)}
                    className="px-2 py-0.5 text-[11px] font-mono bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/30 rounded transition-colors cursor-pointer"
                    title={item.label}
                  >
                    +{item.tag}
                  </button>
                ))}
              </div>

              <textarea
                rows={4}
                value={mensagemTemplate}
                onChange={(e) => setMensagemTemplate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                required
              />

              {/* Dica de Spintax Anti-Ban & Compliance TSE */}
              <div className="mt-2 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1 text-[11px]">
                <div className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Proteção Anti-Ban (Spintax) & Compliance TSE</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  • Use chaves com barras <code className="text-cyan-300">{"{Olá|Oi|Tudo bem}"}</code> para que cada mensagem seja disparada com uma redação diferente, evitando bloqueios da Meta.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  • Eleitores que responderem <strong>CANCELAR</strong> ou <strong>SAIR</strong> são imediatamente bloqueados pelo sistema, garantindo conformidade total com a Lei Eleitoral e LGPD.
                </p>
              </div>
            </div>

            {/* Anexo de PDF (URL Supabase Storage ou Link Público) */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                <Paperclip className="w-3.5 h-3.5 text-emerald-400" /> Anexo de Cartilha / Proposta em PDF (URL Pública)
              </label>
              <input
                type="url"
                placeholder="https://seu-projeto.supabase.co/storage/v1/object/public/campanha/cartilha.pdf"
                value={urlMidiaPdf}
                onChange={(e) => setUrlMidiaPdf(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Deixe em branco para disparar somente mensagem de texto.
              </p>
            </div>

            {/* Botão de Envio */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || previewAlvos === 0}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold text-xs rounded-lg shadow-lg shadow-cyan-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Enfileirando Campanha...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Iniciar Disparo Humanizado ({previewAlvos} Alvos)
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Histórico e Acompanhamento de Fila (5 colunas) */}
        <div className="glass-panel rounded-xl p-6 lg:col-span-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                Fila de Disparos em Tempo Real
              </h4>
              <button
                onClick={loadCampanhas}
                className="p-1 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Atualizar fila"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCampanhas ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {campanhas.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
                  Nenhuma campanha disparada ainda.
                </div>
              ) : (
                campanhas.map((camp) => {
                  const perc = camp.total_alvos > 0 ? (camp.total_enviados / camp.total_alvos) * 100 : 0;
                  const isRunning = camp.status === 'EM_ANDAMENTO';

                  return (
                    <div
                      key={camp.id}
                      className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-white line-clamp-1">{camp.titulo}</span>
                          <span className="text-[10px] text-slate-400">
                            Filtro: {camp.filtro_tipo} {camp.filtro_valor ? `(${camp.filtro_valor})` : ''}
                          </span>
                        </div>

                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                            camp.status === 'CONCLUIDO'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : camp.status === 'EM_ANDAMENTO'
                              ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 animate-pulse'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {camp.status}
                        </span>
                      </div>

                      {/* Barra de Progresso */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-300">
                          <span>
                            {camp.total_enviados} de {camp.total_alvos} enviados
                          </span>
                          <span className="font-bold">{perc.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              camp.status === 'FALHA' ? 'bg-rose-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(2, perc))}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
                        <span>Erros: <strong className="text-rose-400">{camp.total_erros}</strong></span>
                        <span>{new Date(camp.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-cyan-400" /> Cadência: 3s a 7s por envio
            </span>
            <span className="text-emerald-400 font-medium">Fila Segura</span>
          </div>
        </div>
      </div>
    </div>
  );
};
