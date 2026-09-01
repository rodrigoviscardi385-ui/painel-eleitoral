'use client';

import React from 'react';
import { 
  Users, 
  UserCheck, 
  Target, 
  TrendingUp, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  PlusCircle,
  FileDown,
  Sparkles
} from 'lucide-react';

interface KpisData {
  total_lideres: number;
  total_apoiadores: number;
  cadastros_hoje: number;
  meta_global: number;
  progresso_percentual: number;
  dias_restantes: number;
  cadencia_diaria_atual: number;
  cadencia_diaria_meta: number;
  cadencia_diaria_necessaria: number;
  status_semaforo: 'VERDE' | 'AMARELO' | 'VERMELHO';
}

interface MetaItem {
  id: string;
  titulo: string;
  tipo: string;
  alvo_referencia?: string | null;
  quantidade_meta: number;
  quantidade_atual: number;
  data_fim: string;
  meta_diaria_cadencia: number;
  status_semaforo: 'VERDE' | 'AMARELO' | 'VERMELHO';
}

interface CockpitMetasProps {
  kpis: KpisData;
  metas: MetaItem[];
  onOpenModalMeta: () => void;
  onExportPdf: () => void;
  onOpenCreateGroup?: () => void;
  isLoading?: boolean;
}

export const CockpitMetas: React.FC<CockpitMetasProps> = ({
  kpis,
  metas,
  onOpenModalMeta,
  onExportPdf,
  onOpenCreateGroup,
  isLoading = false,
}) => {
  const getSemaforoColor = (status: string) => {
    switch (status) {
      case 'VERDE':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          dot: 'bg-emerald-500',
          text: 'Meta no Ritmo Ideal',
        };
      case 'AMARELO':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
          dot: 'bg-amber-500',
          text: 'Atenção / Acelerar',
        };
      default:
        return {
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
          dot: 'bg-rose-500',
          text: 'Abaixo da Cadência',
        };
    }
  };

  const semaforoInfo = getSemaforoColor(kpis.status_semaforo);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Barra de Ações Rápidas do Cockpit */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-cyan-400" />
            Cockpit de Metas & Cadência Eleitoral
          </h2>
          <p className="text-xs text-slate-400">
            Acompanhamento em tempo real de velocímetro, metas territoriais e ritmo diário de adesão.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {onOpenCreateGroup && (
            <button
              onClick={onOpenCreateGroup}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
              title="Criar novo grupo oficial de WhatsApp para qualquer líder ou bairro"
            >
              <Users className="w-4 h-4 text-indigo-200" />
              Criar Grupo Base
            </button>
          )}

          <button
            onClick={onOpenModalMeta}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg shadow-lg shadow-cyan-600/20 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Nova Meta
          </button>

          <button
            onClick={onExportPdf}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <FileDown className="w-4 h-4 text-emerald-400" />
            Relatório PDF
          </button>
        </div>
      </div>

      {/* Grid de KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Líderes */}
        <div className="glass-panel rounded-xl p-5 relative overflow-hidden group hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Lideranças Ativas</span>
            <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{kpis.total_lideres}</span>
            <span className="text-xs text-cyan-400 font-medium flex items-center">
              <Sparkles className="w-3 h-3 mr-0.5" /> Coordenadores & Líderes
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-400">
            Responsáveis diretos pela formação dos grupos de base.
          </div>
        </div>

        {/* Card 2: Total Apoiadores */}
        <div className="glass-panel rounded-xl p-5 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Apoiadores Cadastrados</span>
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{kpis.total_apoiadores}</span>
            <span className="text-xs text-emerald-400 font-medium">+{kpis.cadastros_hoje} hoje</span>
          </div>
          <div className="mt-3 text-xs text-slate-400">
            Eleitores confirmados na árvore de fidelização.
          </div>
        </div>

        {/* Card 3: Meta Geral & Progresso */}
        <div className="glass-panel rounded-xl p-5 relative overflow-hidden group hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Meta Geral Campanha</span>
            <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Target className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-black text-white">{kpis.progresso_percentual.toFixed(1)}%</span>
            <span className="text-xs text-slate-400">
              {kpis.total_apoiadores} / {kpis.meta_global}
            </span>
          </div>
          <div className="mt-3 w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(2, kpis.progresso_percentual))}%` }}
            />
          </div>
        </div>

        {/* Card 4: Semáforo e Ritmo Diário */}
        <div className={`glass-panel rounded-xl p-5 border ${semaforoInfo.bg} relative overflow-hidden transition-all`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider">Semáforo de Cadência</span>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-900/80 border border-slate-700">
              <span className={`w-2.5 h-2.5 rounded-full ${semaforoInfo.dot} animate-ping`} />
              <span className="text-[10px] font-bold">{kpis.status_semaforo}</span>
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{kpis.cadencia_diaria_atual}</span>
            <span className="text-xs text-slate-300">/ {kpis.cadencia_diaria_meta} meta diária</span>
          </div>
          <div className="mt-3 text-xs text-slate-300 flex items-center justify-between">
            <span>Necessário p/ bater meta:</span>
            <span className="font-bold text-white">{kpis.cadencia_diaria_necessaria}/dia</span>
          </div>
        </div>
      </div>

      {/* Seção Central: Velocímetro de Metas Territoriais e Detalhamento */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel do Velocímetro de Campanha */}
        <div className="glass-panel rounded-xl p-6 lg:col-span-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                Velocímetro de Mobilização
              </h3>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                <Clock className="w-3 h-3 text-cyan-400" /> {kpis.dias_restantes} dias restantes
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              O velocímetro calcula a velocidade de captação de apoiadores comparando os cadastros recebidos via WhatsApp com o tempo restante até a eleição.
            </p>

            {/* Visual Gauge Radial / Progress representation */}
            <div className="relative flex flex-col items-center justify-center p-6 bg-slate-900/50 rounded-xl border border-slate-800">
              <div className="text-center space-y-1">
                <div className="text-4xl font-black tracking-tight text-white">
                  {kpis.cadencia_diaria_atual} <span className="text-lg font-normal text-slate-400">cadastros/dia</span>
                </div>
                <div className="text-xs font-medium text-emerald-400 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {kpis.cadencia_diaria_atual >= kpis.cadencia_diaria_meta ? 'Acima da meta estabelecida' : 'Abaixo do ritmo recomendado'}
                </div>
              </div>

              <div className="w-full mt-6 space-y-2">
                <div className="flex justify-between text-xs text-slate-400 font-medium">
                  <span>Ritmo Mínimo: {kpis.cadencia_diaria_meta}/dia</span>
                  <span>Ideal: {Math.ceil(kpis.cadencia_diaria_meta * 1.5)}/dia</span>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      kpis.cadencia_diaria_atual >= kpis.cadencia_diaria_meta
                        ? 'bg-emerald-500'
                        : kpis.cadencia_diaria_atual >= kpis.cadencia_diaria_meta / 2
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{
                      width: `${Math.min(100, Math.max(5, (kpis.cadencia_diaria_atual / (kpis.cadencia_diaria_meta * 1.5)) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Última atualização:</span>
            <span className="text-slate-200 font-mono">Tempo Real</span>
          </div>
        </div>

        {/* Lista de Metas por Zona e Bairro */}
        <div className="glass-panel rounded-xl p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              Metas Territoriais e Zonas Estratégicas
            </h3>
            <span className="text-xs text-slate-400">
              {metas.length} meta(s) monitorada(s)
            </span>
          </div>

          <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
            {metas.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
                Nenhuma meta cadastrada ainda. Clique em "Nova Meta" para definir objetivos de campanha.
              </div>
            ) : (
              metas.map((meta) => {
                const perc = meta.quantidade_meta > 0 ? (meta.quantidade_atual / meta.quantidade_meta) * 100 : 0;
                const statusTheme = getSemaforoColor(meta.status_semaforo);

                return (
                  <div
                    key={meta.id}
                    className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-100">{meta.titulo}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-cyan-500/20">
                          {meta.tipo} {meta.alvo_referencia ? `• ${meta.alvo_referencia}` : ''}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-3">
                        <span>Meta Diária: <strong>{meta.meta_diaria_cadencia} apoios</strong></span>
                        <span>•</span>
                        <span>Prazo: {new Date(meta.data_fim).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 sm:w-56">
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between text-[11px] font-medium text-slate-300">
                          <span>{meta.quantidade_atual} votos</span>
                          <span className="font-bold">{perc.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-cyan-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(3, perc))}%` }}
                          />
                        </div>
                      </div>

                      <div className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${statusTheme.bg}`}>
                        {meta.status_semaforo}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
