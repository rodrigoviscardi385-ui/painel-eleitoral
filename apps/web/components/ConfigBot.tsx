'use client';

import React, { useState, useEffect } from 'react';
import { Bot, Save, RefreshCw, ToggleLeft, ToggleRight, Clock, MessageSquare, Users, Zap } from 'lucide-react';

interface BotConfigData {
  id?: string;
  modo: 'BOT_ATIVO' | 'HUMANO' | 'HIBRIDO';
  mensagem_boas_vindas: string;
  menu_opcoes: string;
  mensagem_encerramento_bot: string;
  mensagem_transferencia: string;
  horario_inicio: string;
  horario_fim: string;
}

interface ConfigBotProps {
  apiBaseUrl?: string;
}

const modoLabels = {
  BOT_ATIVO: { label: 'Bot Automático', desc: 'Bot responde a todas as mensagens automaticamente', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', icon: Bot },
  HIBRIDO: { label: 'Modo Híbrido', desc: 'Bot responde fora do horário; humano no horário configurado', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30', icon: Zap },
  HUMANO: { label: 'Atendimento Humano', desc: 'Bot desativado — operadores atendem manualmente', color: 'text-orange-400 bg-orange-500/10 border-orange-500/30', icon: Users },
};

const defaultConfig: BotConfigData = {
  modo: 'BOT_ATIVO',
  mensagem_boas_vindas: 'Olá! 👋 Sou o assistente da campanha. Como posso ajudar?\n\n1️⃣ Conhecer as propostas\n2️⃣ Receber material de campanha\n3️⃣ Falar com um atendente\n\nDigite o número da opção desejada.',
  menu_opcoes: '[{"numero":1,"texto":"Conhecer as propostas","acao":"INFO"},{"numero":2,"texto":"Receber material","acao":"MATERIAL"},{"numero":3,"texto":"Falar com atendente","acao":"HUMANO"}]',
  mensagem_encerramento_bot: '✅ Obrigado pelo contato! Qualquer dúvida, estamos aqui.',
  mensagem_transferencia: '⏳ Aguarde um momento! Vou conectar você com um atendente da nossa equipe. 🙋',
  horario_inicio: '08:00',
  horario_fim: '18:00',
};

export function ConfigBot({ apiBaseUrl = '' }: ConfigBotProps) {
  const [config, setConfig] = useState<BotConfigData>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/bot/config`);
      if (res.ok) {
        const data = await res.json();
        setConfig({ ...defaultConfig, ...data.config });
      }
    } catch {
      setError('Erro ao carregar configuração');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchConfig(); }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch(`${apiBaseUrl}/api/bot/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao salvar');
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <div className="text-slate-400 text-sm flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Carregando configurações...
        </div>
      </div>
    );
  }

  const ModoIcon = modoLabels[config.modo].icon;

  return (
    <div className="h-full flex flex-col bg-slate-950 text-white overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/80 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-emerald-400" />
          <span className="font-bold text-sm">Configuração do Chatbot</span>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${saved ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50'}`}
        >
          {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {saving ? 'Salvando...' : saved ? '✓ Salvo!' : 'Salvar'}
        </button>
      </div>

      {error && (
        <div className="mx-4 mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">{error}</div>
      )}

      <div className="p-4 space-y-5">
        {/* Modo de Operação */}
        <section className="space-y-2">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            Modo de Operação
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(Object.keys(modoLabels) as Array<keyof typeof modoLabels>).map((modo) => {
              const info = modoLabels[modo];
              const Icon = info.icon;
              const isSelected = config.modo === modo;
              return (
                <button
                  key={modo}
                  onClick={() => setConfig(c => ({ ...c, modo }))}
                  className={`p-3 rounded-xl border text-left transition-all ${isSelected ? info.color + ' ring-1 ring-current' : 'bg-slate-900 border-slate-700 hover:border-slate-600'}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4" />
                    <span className="text-xs font-bold">{info.label}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">{info.desc}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Horário de Atendimento (só para HIBRIDO) */}
        {config.modo === 'HIBRIDO' && (
          <section className="space-y-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              Horário de Atendimento Humano
            </h3>
            <div className="flex items-center gap-3 p-3 bg-slate-900 rounded-xl border border-slate-700">
              <div className="space-y-1 flex-1">
                <label className="text-xs text-slate-400">Início</label>
                <input
                  type="time"
                  value={config.horario_inicio}
                  onChange={e => setConfig(c => ({ ...c, horario_inicio: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <span className="text-slate-500 text-xs mt-4">até</span>
              <div className="space-y-1 flex-1">
                <label className="text-xs text-slate-400">Fim</label>
                <input
                  type="time"
                  value={config.horario_fim}
                  onChange={e => setConfig(c => ({ ...c, horario_fim: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-500">Fora deste horário, o bot responde automaticamente.</p>
          </section>
        )}

        {/* Mensagem de Boas-Vindas */}
        <section className="space-y-2">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
            Mensagem de Boas-Vindas / Menu
          </h3>
          <textarea
            value={config.mensagem_boas_vindas}
            onChange={e => setConfig(c => ({ ...c, mensagem_boas_vindas: e.target.value }))}
            rows={7}
            className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 resize-none font-mono leading-relaxed"
          />
          <p className="text-[10px] text-slate-500">Enviada quando o eleitor digita "oi", "olá", "menu" ou "ajuda".</p>
        </section>

        {/* Mensagem de Transferência */}
        <section className="space-y-2">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Mensagem ao Transferir para Atendente</h3>
          <textarea
            value={config.mensagem_transferencia}
            onChange={e => setConfig(c => ({ ...c, mensagem_transferencia: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
          />
        </section>

        {/* Mensagem de Encerramento */}
        <section className="space-y-2">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Mensagem de Encerramento</h3>
          <textarea
            value={config.mensagem_encerramento_bot}
            onChange={e => setConfig(c => ({ ...c, mensagem_encerramento_bot: e.target.value }))}
            rows={2}
            className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
          />
        </section>

        {/* Preview do Fluxo */}
        <section className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-800/30 space-y-3">
          <h3 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
            <Bot className="w-3.5 h-3.5" />
            Preview do Fluxo do Bot
          </h3>
          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex gap-2">
              <span className="text-slate-500 shrink-0">Eleitor:</span>
              <span className="text-white">"Oi"</span>
            </div>
            <div className="flex gap-2">
              <span className="text-emerald-400 shrink-0">Bot:</span>
              <span className="bg-slate-900 p-2 rounded-lg flex-1 whitespace-pre-wrap font-mono text-[10px] border border-slate-800">
                {config.mensagem_boas_vindas.slice(0, 150)}{config.mensagem_boas_vindas.length > 150 ? '...' : ''}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-slate-500 shrink-0">Eleitor:</span>
              <span className="text-white">"3"</span>
            </div>
            <div className="flex gap-2">
              <span className="text-emerald-400 shrink-0">Bot:</span>
              <span className="bg-slate-900 p-2 rounded-lg flex-1 font-mono text-[10px] border border-slate-800">{config.mensagem_transferencia}</span>
            </div>
            <div className="pt-1 text-[10px] text-blue-400 flex items-center gap-1">
              <Users className="w-3 h-3" />
              → Conversa aparece no painel como aguardando atendente
            </div>
          </div>
        </section>

        <div className="h-4" /> {/* Spacer bottom */}
      </div>
    </div>
  );
}
