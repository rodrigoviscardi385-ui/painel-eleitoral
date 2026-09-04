'use client';

import React, { useState, useEffect } from 'react';
import {
  Flame,
  ShieldCheck,
  AlertTriangle,
  Play,
  Pause,
  RefreshCw,
  Sparkles,
  Plus,
  Trash2,
  HelpCircle,
  ExternalLink,
  CheckCircle2,
  Clock,
  MessageSquare,
  Cpu,
} from 'lucide-react';

interface AquecedorChipProps {
  apiBaseUrl?: string;
}

interface WarmingState {
  status: 'ATIVO' | 'PAUSADO' | 'CONCLUIDO';
  fase_atual: number;
  dias_ativos: number;
  msgs_enviadas_hoje: number;
  limite_diario_atual: number;
  health_score: number;
  numeros_parceiros: string[];
  simular_digitacao: boolean;
  delays_gaussianos: boolean;
  ultimo_ciclo_em?: string | null;
}

export const AquecedorChipAntiBan: React.FC<AquecedorChipProps> = ({
  apiBaseUrl = '',
}) => {
  const effectiveBaseUrl = !apiBaseUrl || apiBaseUrl === 'http://localhost:3001' ? '' : apiBaseUrl;

  const [data, setData] = useState<WarmingState>({
    status: 'PAUSADO',
    fase_atual: 1,
    dias_ativos: 0,
    msgs_enviadas_hoje: 0,
    limite_diario_atual: 10,
    health_score: 35,
    numeros_parceiros: [],
    simular_digitacao: true,
    delays_gaussianos: true,
    ultimo_ciclo_em: null,
  });

  const [loading, setLoading] = useState(false);
  const [novoNumero, setNovoNumero] = useState('');
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${effectiveBaseUrl}/api/whatsapp/aquecedor`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.warn('Falha ao consultar status do aquecedor:', e);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, [apiBaseUrl]);

  const handleToggle = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`${effectiveBaseUrl}/api/whatsapp/aquecedor?action=toggle`, {
        method: 'POST',
      });
      const resData = await res.json();
      if (res.ok) {
        setData((prev) => ({ ...prev, status: resData.status || (prev.status === 'ATIVO' ? 'PAUSADO' : 'ATIVO') }));
        setFeedback({
          tipo: 'sucesso',
          texto: resData.status === 'ATIVO'
            ? '🔥 Aquecedor de Chip ATIVADO! Intervalos inteligentes e IA ativos em segundo plano.'
            : '⏸️ Aquecedor PAUSADO com sucesso.',
        });
      }
    } catch (err) {
      setFeedback({ tipo: 'erro', texto: 'Erro ao alternar status do aquecedor.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddNumero = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = novoNumero.replace(/\D/g, '');
    if (clean.length < 10) {
      setFeedback({ tipo: 'erro', texto: 'Informe um telefone com DDD válido.' });
      return;
    }

    const fullNumber = clean.length === 10 || clean.length === 11 ? `55${clean}` : clean;
    if (data.numeros_parceiros.includes(fullNumber)) {
      setFeedback({ tipo: 'erro', texto: 'Este número já está na lista de aquecimento.' });
      return;
    }

    const updated = [...data.numeros_parceiros, fullNumber];
    try {
      const res = await fetch(`${effectiveBaseUrl}/api/whatsapp/aquecedor?action=config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numeros_parceiros: updated }),
      });
      if (res.ok) {
        setData((prev) => ({ ...prev, numeros_parceiros: updated }));
        setNovoNumero('');
        setFeedback({ tipo: 'sucesso', texto: `Número ${fullNumber} adicionado à rede de ping-pong!` });
      }
    } catch (e) {
      setFeedback({ tipo: 'erro', texto: 'Erro ao salvar novo número parceiro.' });
    }
  };

  const handleRemoveNumero = async (phone: string) => {
    const updated = data.numeros_parceiros.filter((p) => p !== phone);
    try {
      await fetch(`${effectiveBaseUrl}/api/whatsapp/aquecedor?action=config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numeros_parceiros: updated }),
      });
      setData((prev) => ({ ...prev, numeros_parceiros: updated }));
    } catch (e) {
      console.warn('Erro ao remover número:', e);
    }
  };

  const handleManualCycle = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`${effectiveBaseUrl}/api/whatsapp/aquecedor?action=ciclo`, {
        method: 'POST',
      });
      const resJson = await res.json();
      if (resJson.success) {
        setFeedback({
          tipo: 'sucesso',
          texto: `Mensagem enviada com sucesso para ${resJson.targetPhone}: "${resJson.message}"`,
        });
        fetchStatus();
      } else {
        setFeedback({ tipo: 'erro', texto: resJson.error || 'Falha ao executar ciclo.' });
      }
    } catch (e) {
      setFeedback({ tipo: 'erro', texto: 'Erro de conexão ao disparar ciclo manual.' });
    } finally {
      setLoading(false);
    }
  };

  // Cores dinâmicas baseadas no Health Score
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'from-emerald-500 to-teal-400 text-emerald-400';
    if (score >= 40) return 'from-amber-500 to-yellow-400 text-amber-400';
    return 'from-rose-500 to-orange-400 text-rose-400';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 70) return '🛡️ Maduro & Blindado (Seguro)';
    if (score >= 40) return '🔥 Em Maturação (Risco Médio)';
    return '❄️ Frio / Recém-Criado (Alto Risco de Ban)';
  };

  return (
    <div className="space-y-5">
      {/* Banner Principal Anti-Ban & Aquecedor */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-700/80 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-amber-500/10 to-orange-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
              <Flame className="w-3.5 h-3.5 animate-pulse" />
              Módulo Anti-Ban & Aquecedor Inteligente Meta
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
              Maturador Automático de Chip
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Protege o seu número oficial contra os algoritmos de bloqueio da Meta através de emulação canônica de navegador (Ubuntu/Chrome), simulação de digitação humana (<code className="text-cyan-300">composing</code>) e ping-pong de diálogos casuais com IA Groq LLaMA 3.3.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleManualCycle}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-200 bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 rounded-xl transition-all cursor-pointer disabled:opacity-50"
              title="Disparar um diálogo casual imediato gerado pela IA"
            >
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Simular Ciclo com IA</span>
            </button>

            <button
              onClick={handleToggle}
              disabled={loading}
              className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all shadow-lg cursor-pointer disabled:opacity-50 ${
                data.status === 'ATIVO'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-amber-500/25'
              }`}
            >
              {data.status === 'ATIVO' ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Pausar Aquecedor</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Ativar Aquecimento Automático</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Notificação de Feedback */}
        {feedback && (
          <div
            className={`mt-4 p-3 rounded-xl border text-xs flex items-center justify-between animate-fadeIn ${
              feedback.tipo === 'sucesso'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.tipo === 'sucesso' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span>{feedback.texto}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-white text-xs ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Termômetro de Saúde e Maturação */}
        <div className="mt-6 pt-5 border-t border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" /> Temperatura & Saúde do Chip
              </span>
              <span className={`text-xs font-bold ${getScoreColor(data.health_score)}`}>
                {getScoreLabel(data.health_score)} ({data.health_score}%)
              </span>
            </div>

            {/* Barra de Progresso Gradiente */}
            <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden relative">
              <div
                className={`h-full bg-gradient-to-r ${getScoreColor(data.health_score)} transition-all duration-700 ease-out`}
                style={{ width: `${Math.max(8, data.health_score)}%` }}
              />
            </div>

            <p className="text-[11px] text-slate-400">
              {data.health_score < 40
                ? '⚠️ Seu chip ainda não possui histórico suficiente. Disparar em massa neste estado causará bloqueio imediato pela Meta. Mantenha o aquecedor ativo por 7 dias.'
                : data.health_score < 70
                ? '⚡ O chip está amadurecendo bem. Recomendado enviar no máximo 25 mensagens por dia com Spintax ativado.'
                : '✅ Chip maduro e com alta pontuação de confiança. Seguro para cadência eleitoral normal.'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Fase de Maturação</span>
            <div className="my-1">
              <span className="text-2xl font-black text-amber-400">Fase {data.fase_atual}</span>
              <span className="text-xs text-slate-500 block">
                {data.fase_atual === 1
                  ? 'Dias 1 a 3 (Até 10 msgs/dia)'
                  : data.fase_atual === 2
                  ? 'Dias 4 a 7 (Até 25 msgs/dia)'
                  : data.fase_atual === 3
                  ? 'Dias 8 a 14 (Até 50 msgs/dia)'
                  : 'Fase 4 (Maduro / Produção)'}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-cyan-400" /> {data.dias_ativos} dias em maturação
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Envios de Hoje</span>
            <div className="my-1">
              <span className="text-2xl font-black text-cyan-400">
                {data.msgs_enviadas_hoje}
                <span className="text-sm font-normal text-slate-500"> / {data.limite_diario_atual}</span>
              </span>
              <span className="text-xs text-slate-500 block">Teto de segurança anti-ban</span>
            </div>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Limite rigorosamente respeitado
            </span>
          </div>
        </div>
      </div>

      {/* Seção Inferior: Rede de Números Parceiros & Tecnologias Ativas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Rede de Ping-Pong / Números Parceiros */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border border-slate-700/80 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-cyan-400" />
                Rede de Aquecimento Ping-Pong (Números Parceiros)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Cadastre celulares da equipe ou chips secundários para que o bot troque mensagens naturais e recíprocas.
              </p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              {data.numeros_parceiros.length} parceiro(s)
            </span>
          </div>

          {/* Adicionar Número Parceiro */}
          <form onSubmit={handleAddNumero} className="flex gap-2">
            <input
              type="text"
              value={novoNumero}
              onChange={(e) => setNovoNumero(e.target.value)}
              placeholder="Ex: 5511999998888 (com DDD)"
              className="flex-1 px-3.5 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-xl shadow-md transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar
            </button>
          </form>

          {/* Lista de Números Parceiros */}
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {data.numeros_parceiros.length === 0 ? (
              <div className="p-4 text-center rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-500">
                Nenhum número cadastrado. Adicione ao menos 1 número (ex: seu celular pessoal) para iniciar a troca de mensagens de aquecimento.
              </div>
            ) : (
              data.numeros_parceiros.map((num) => (
                <div
                  key={num}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="font-mono text-slate-200 font-semibold">{num}</span>
                    <span className="text-[10px] text-slate-500">Parceiro de Troca Recíproca</span>
                  </div>
                  <button
                    onClick={() => handleRemoveNumero(num)}
                    className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Remover número"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Tecnologias Anti-Ban Ativas & Guia de Desbanimento */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-700/80 shadow-lg space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Blindagem Ativa (Baileys Hardened)
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-200 block">Identificação Canônica</span>
                <span className="text-slate-400 text-[11px]">Emulação oficial de Chrome / Ubuntu (elimina a assinatura de bot).</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-200 block">Presença Humana (Composing)</span>
                <span className="text-slate-400 text-[11px]">Digitação simulada proporcional antes de cada envio.</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-200 block">Delays Gaussianos & Spintax</span>
                <span className="text-slate-400 text-[11px]">Variação de intervalos e palavras para impedir detecção de spam.</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" /> Foi banido? Como recuperar
              </span>
              <span>{showGuide ? '▲' : '▼'}</span>
            </button>

            {showGuide && (
              <div className="mt-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-slate-300 space-y-2 animate-fadeIn">
                <p className="font-semibold text-amber-400">Passos para Recuperação de Chip:</p>
                <ol className="list-decimal pl-4 space-y-1 text-slate-400">
                  <li>Abra o WhatsApp oficial no celular e toque em <strong>"Solicitar Análise"</strong>.</li>
                  <li>Insira o texto modelo: <em>"Olá suporte, sou usuário comum e meu número foi desconectado por engano. Utilizo para trabalho comunitário e comunicação pessoal. Solicito gentilmente a reativação."</em></li>
                  <li>O suporte da Meta costuma reativar em 4 a 12 horas para primeiras ocorrências.</li>
                  <li>Após reativado, <strong>NUNCA</strong> envie listas de transmissão ou disparos nas primeiras 72 horas. Deixe no Aquecedor Fase 1.</li>
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
