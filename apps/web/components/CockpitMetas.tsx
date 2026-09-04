'use client';

import React, { useState } from 'react';
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
  Sparkles,
  Trophy,
  Award,
  Flame,
  MessageCircle,
  BarChart3,
  ShieldAlert,
  HardDrive,
  Receipt
} from 'lucide-react';
import { ModalBackup } from './ModalBackup';

interface RadarLeaderItem {
  id?: string;
  nome: string;
  regiao: string;
  tel: string;
  dias: number;
  apoios: number;
}

interface TopLeaderItem {
  id?: string;
  pos: string;
  medalha: string;
  nome: string;
  regiao: string;
  votos: number;
  badge: string;
}

interface PautaItem {
  tema: string;
  perc: number;
  mencoes: number;
  cor: string;
  textCor: string;
}

interface KpisData {
  total_lideres: number;
  total_apoiadores: number;
  cadastros_hoje: number;
  meta_global: number;
  meta_lideres?: number;
  meta_apoiadores_por_lider?: number;
  progresso_percentual: number;
  dias_restantes: number;
  cadencia_diaria_atual: number;
  cadencia_diaria_meta: number;
  cadencia_diaria_necessaria: number;
  status_semaforo: 'VERDE' | 'AMARELO' | 'VERMELHO';
  radar_abandono?: RadarLeaderItem[];
  top_lideres?: TopLeaderItem[];
  termometro_pautas?: PautaItem[];
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
  onOpenCreateGroup?: (leader?: any) => void;
  onOpenGastos?: () => void;
  isLoading?: boolean;
}

export const CockpitMetas: React.FC<CockpitMetasProps> = ({
  kpis,
  metas,
  onOpenModalMeta,
  onExportPdf,
  onOpenCreateGroup,
  onOpenGastos,
  isLoading = false,
}) => {
  const [showBackupModal, setShowBackupModal] = useState(false);

  const getSemaforoColor = (status: string) => {
    switch (status) {
      case 'VERDE':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400',
          dot: 'bg-emerald-500',
          text: 'Meta no Ritmo Ideal',
        };
      case 'AMARELO':
        return {
          bg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400',
          dot: 'bg-amber-500',
          text: 'Atenção / Acelerar',
        };
      default:
        return {
          bg: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400',
          dot: 'bg-rose-500',
          text: 'Abaixo da Cadência',
        };
    }
  };

  const semaforoInfo = getSemaforoColor(kpis.status_semaforo);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Barra de Ações Rápidas do Cockpit */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            Cockpit de Metas & Cadência Eleitoral
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Acompanhamento em tempo real de velocímetro, metas territoriais e ritmo diário de adesão.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {onOpenCreateGroup && (
            <button
              onClick={onOpenCreateGroup}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
              title="Criar novo grupo oficial de WhatsApp para qualquer líder ou bairro"
            >
              <Users className="w-4 h-4 text-indigo-100" />
              Criar Grupo Base
            </button>
          )}

          <button
            onClick={onOpenModalMeta}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl shadow-sm shadow-cyan-600/20 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Nova Meta
          </button>

          {onOpenGastos && (
            <button
              onClick={onOpenGastos}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer bg-amber-500 hover:bg-amber-400 text-white shadow-amber-500/20"
              title="Acessar Controle de Gastos, Inserção Manual e OCR por foto"
            >
              <Receipt className="w-4 h-4 text-white" />
              Gastos & Finanças
            </button>
          )}

          <button
            onClick={() => setShowBackupModal(true)}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer bg-slate-900 hover:bg-slate-800 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500 shadow-emerald-600/20"
            title="Download do banco para Pendrive/HD e Relatório Oficial TSE"
          >
            <HardDrive className="w-4 h-4 text-emerald-400 dark:text-white" />
            Backup & TSE
          </button>

          <button
            onClick={onExportPdf}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700"
          >
            <FileDown className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Relatório PDF
          </button>
        </div>
      </div>

      {/* Grid de KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Líderes */}
        <div className="glass-panel rounded-2xl p-5 relative overflow-hidden group hover:border-cyan-400/60 dark:hover:border-cyan-500/40 transition-all bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Lideranças Ativas</span>
            <div className="p-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/20">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">{kpis.total_lideres}</span>
            <span className="text-xs text-cyan-600 dark:text-cyan-400 font-bold flex items-center">
              <Sparkles className="w-3 h-3 mr-0.5" /> Coordenadores & Líderes
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Responsáveis diretos pela formação dos grupos de base.
          </div>
        </div>

        {/* Card 2: Total Apoiadores */}
        <div className="glass-panel rounded-2xl p-5 relative overflow-hidden group hover:border-emerald-400/60 dark:hover:border-emerald-500/40 transition-all bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Apoiadores Cadastrados</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">{kpis.total_apoiadores}</span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">+{kpis.cadastros_hoje} hoje</span>
          </div>
          <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Eleitores confirmados na árvore de fidelização.
          </div>
        </div>

        {/* Card 3: Meta Geral & Progresso */}
        <div className="glass-panel rounded-2xl p-5 relative overflow-hidden group hover:border-indigo-400/60 dark:hover:border-indigo-500/40 transition-all bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Meta Geral Campanha</span>
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
              <Target className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-black text-slate-900 dark:text-white">{kpis.progresso_percentual.toFixed(1)}%</span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {kpis.total_apoiadores} / {kpis.meta_global}
            </span>
          </div>
          <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5">
            <div
              className="bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(2, kpis.progresso_percentual))}%` }}
            />
          </div>
        </div>

        {/* Card 4: Semáforo e Ritmo Diário */}
        <div className={`glass-panel rounded-2xl p-5 border ${semaforoInfo.bg} relative overflow-hidden transition-all shadow-sm`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider">Semáforo de Cadência</span>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className={`w-2.5 h-2.5 rounded-full ${semaforoInfo.dot} animate-ping`} />
              <span className="text-[10px] font-black">{kpis.status_semaforo}</span>
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">{kpis.cadencia_diaria_atual}</span>
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">/ {kpis.cadencia_diaria_meta} meta diária</span>
          </div>
          <div className="mt-3 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
            <span>Necessário p/ bater meta:</span>
            <span className="font-bold text-slate-900 dark:text-white">{kpis.cadencia_diaria_necessaria}/dia</span>
          </div>
        </div>
      </div>

      {/* Banner de Destaque & Acesso Rápido a Gastos */}
      {onOpenGastos && (
        <div className="rounded-2xl p-4 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/30 shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Controle de Gastos & Prestação de Contas TSE</h4>
                <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-amber-500 text-white uppercase tracking-wider">Disponível</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Lançamento manual de despesas, envio de notas fiscais por foto com OCR de IA automático e exportação em planilha oficial.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenGastos}
            className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-400 rounded-xl shadow-sm shadow-amber-500/25 transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5"
          >
            Abrir Gestão de Gastos
            <span className="text-amber-200">→</span>
          </button>
        </div>
      )}

      {/* Seção Central: Velocímetro de Metas Territoriais e Detalhamento */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel do Velocímetro de Campanha */}
        <div className="glass-panel rounded-2xl p-6 lg:col-span-1 flex flex-col justify-between bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                Velocímetro de Mobilização
              </h3>
              <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1 font-medium">
                <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> {kpis.dias_restantes} dias restantes
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              O velocímetro calcula a velocidade de captação de apoiadores comparando os cadastros recebidos via WhatsApp com o tempo restante até a eleição.
            </p>

            {/* Visual Gauge Radial / Progress representation */}
            <div className="relative flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="text-center space-y-1">
                <div className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                  {kpis.cadencia_diaria_atual} <span className="text-base font-normal text-slate-500 dark:text-slate-400">cadastros/dia</span>
                </div>
                <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {kpis.cadencia_diaria_atual >= kpis.cadencia_diaria_meta ? 'Acima da meta estabelecida' : 'Abaixo do ritmo recomendado'}
                </div>
              </div>

              <div className="w-full mt-6 space-y-2">
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <span>Ritmo Mínimo: {kpis.cadencia_diaria_meta}/dia</span>
                  <span>Ideal: {Math.ceil(kpis.cadencia_diaria_meta * 1.5)}/dia</span>
                </div>
                <div className="w-full bg-slate-200/80 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5">
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

          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Última atualização:</span>
            <span className="text-slate-800 dark:text-slate-200 font-mono font-medium">Tempo Real</span>
          </div>
        </div>

        {/* Lista de Metas por Zona e Bairro */}
        <div className="glass-panel rounded-2xl p-6 lg:col-span-2 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Metas Territoriais e Zonas Estratégicas
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {metas.length} meta(s) monitorada(s)
            </span>
          </div>

          <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
            {metas.length === 0 ? (
              <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                Nenhuma meta cadastrada ainda. Clique em "Nova Meta" para definir objetivos de campanha.
              </div>
            ) : (
              metas.map((meta) => {
                const perc = meta.quantidade_meta > 0 ? (meta.quantidade_atual / meta.quantidade_meta) * 100 : 0;
                const statusTheme = getSemaforoColor(meta.status_semaforo);

                return (
                  <div
                    key={meta.id}
                    className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{meta.titulo}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-50 dark:bg-slate-800 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/20">
                          {meta.tipo} {meta.alvo_referencia ? `• ${meta.alvo_referencia}` : ''}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3">
                        <span>Meta Diária: <strong className="text-slate-700 dark:text-slate-200">{meta.meta_diaria_cadencia} apoios</strong></span>
                        <span>•</span>
                        <span>Prazo: {new Date(meta.data_fim).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 sm:w-56">
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between text-[11px] font-medium text-slate-600 dark:text-slate-300">
                          <span>{meta.quantidade_atual} votos</span>
                          <span className="font-bold text-slate-900 dark:text-white">{perc.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-cyan-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(3, perc))}%` }}
                          />
                        </div>
                      </div>

                      <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border shadow-sm ${statusTheme.bg}`}>
                        {meta.status_semaforo}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RADAR ANTI-ABANDONO + RANKING GAMIFICADO + TERMÔMETRO DE PAUTAS           */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Radar Anti-Abandono de Lideranças */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 shrink-0">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Radar Anti-Abandono</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Lideranças sem novos cadastros</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 shrink-0">
                  {kpis.radar_abandono && kpis.radar_abandono.length > 0 ? `${kpis.radar_abandono.length} em alerta` : 'Ativo'}
                </span>
              </div>

              <div className="space-y-2.5">
                {!kpis.radar_abandono || kpis.radar_abandono.length === 0 ? (
                  <div className="py-6 px-4 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
                    <CheckCircle2 className="w-7 h-7 mx-auto text-emerald-500" />
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Radar 100% Saudável</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Nenhuma liderança inativa no momento. O robô monitorará cadastros e alertará aqui caso algum líder reduza o ritmo.
                    </p>
                  </div>
                ) : (
                  kpis.radar_abandono.map((l, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{l.nome}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {l.regiao} • <span className="text-amber-600 dark:text-amber-400 font-bold">{l.dias} {l.dias === 1 ? 'dia' : 'dias'} inativo</span>
                        </p>
                      </div>
                      {l.tel && (
                        <a
                          href={`https://wa.me/${l.tel}?text=${encodeURIComponent(`Olá, ${l.nome.split(' ')[0]}! Tudo bem? Passando para saber como estão as mobilizações na sua região. Conta com a nossa equipe no que precisar! 🗳️🚀`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center gap-1 shrink-0 transition-all shadow-sm cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-white" />
                          Acordar Líder
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Ranking Top Militância (Gamificação) */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30 shrink-0">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Top 5 Lideranças</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Ranking oficial de mobilização</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30 shrink-0">
                  Gamificado
                </span>
              </div>

              <div className="space-y-2">
                {!kpis.top_lideres || kpis.top_lideres.length === 0 ? (
                  <div className="py-6 px-4 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
                    <Trophy className="w-7 h-7 mx-auto text-purple-400" />
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Ranking Pronto para Iniciar</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Conforme os líderes cadastrarem apoiadores, os 5 maiores destaques da campanha aparecerão aqui no pódio.
                    </p>
                  </div>
                ) : (
                  kpis.top_lideres.map((r, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-base shrink-0">{r.medalha}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{r.nome}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{r.regiao} • {r.badge}</p>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 px-2 py-0.5 rounded-lg border border-purple-200 dark:border-purple-500/20 shrink-0">
                        {r.votos} {r.votos === 1 ? 'apoio' : 'apoios'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Termômetro de Pautas (Ouvidoria Popular) */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 shrink-0">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Termômetro de Pautas</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Demandas captadas no WhatsApp</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 shrink-0">
                  IA Ouvidoria
                </span>
              </div>

              <div className="space-y-3">
                {(kpis.termometro_pautas && kpis.termometro_pautas.length > 0 ? kpis.termometro_pautas : [
                  { tema: 'Saúde & Atendimento Comunitário', perc: 40, mencoes: 0, cor: 'bg-emerald-500', textCor: 'text-emerald-700 dark:text-emerald-400' },
                  { tema: 'Zeladoria Urbana, Asfalto & Serviços', perc: 25, mencoes: 0, cor: 'bg-amber-500', textCor: 'text-amber-700 dark:text-amber-400' },
                  { tema: 'Segurança Pública & Policiamento', perc: 20, mencoes: 0, cor: 'bg-blue-500', textCor: 'text-blue-700 dark:text-blue-400' },
                  { tema: 'Educação, Creches & Juventude', perc: 15, mencoes: 0, cor: 'bg-purple-500', textCor: 'text-purple-700 dark:text-purple-400' },
                ]).map((p, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">{p.tema}</span>
                      <span className={`font-bold font-mono ${p.textCor}`}>{p.perc}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className={`${p.cor} h-full rounded-full transition-all duration-500`} style={{ width: `${Math.max(4, p.perc)}%` }} />
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 text-right">{p.mencoes} {p.mencoes === 1 ? 'menção' : 'menções'}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Backup para Pendrive/HD e Relatório TSE */}
      <ModalBackup
        isOpen={showBackupModal}
        onClose={() => setShowBackupModal(false)}
        campanhaNome="Gustavo Reis"
        cnpjCampanha="55.955.000/0001-26"
      />
    </div>
  );
};
