'use client';

import React, { useState, useEffect } from 'react';
import {
  Vote,
  Palette,
  Bot,
  MapPin,
  Save,
  RefreshCw,
  Sparkles,
  Check,
  Upload,
  ExternalLink,
  Shield,
  Calendar,
  Building2,
  FileText,
  User,
  MessageSquare,
  ChevronRight,
  Sun,
  Moon,
} from 'lucide-react';

export interface CampanhaConfigData {
  id?: string;
  nome_urna: string;
  nome_completo: string;
  numero_candidato: string;
  cargo: string;
  partido: string;
  coligacao?: string;
  slogan?: string;
  foto_url?: string;
  logo_url?: string;
  cor_primaria: string;
  cidade: string;
  estado: string;
  data_eleicao: string;
  cnpj_campanha?: string;
  biografia_ia: string;
  propostas_ia: string;
  tom_voz_ia: 'POPULAR' | 'FORMAL' | 'DESCONTRAIDO' | 'TECNICO';
  link_grupo_geral?: string;
  whatsapp_comite?: string;
}

interface ConfigCampanhaProps {
  apiBaseUrl?: string;
  onConfigUpdated?: (config: CampanhaConfigData) => void;
}

const PRESET_CORES = [
  { nome: 'Verde Esperança', hex: '#10b981', desc: 'Sustentabilidade, Renovação' },
  { nome: 'Azul Confiança', hex: '#0284c7', desc: 'Tradição, Segurança, Gestão' },
  { nome: 'Laranja Dinâmico', hex: '#f97316', desc: 'Juventude, Inovação, Coragem' },
  { nome: 'Vermelho Popular', hex: '#ef4444', desc: 'Luta Social, Trabalhador' },
  { nome: 'Amarelo Prosperidade', hex: '#eab308', desc: 'Otimismo, Crescimento' },
  { nome: 'Roxo Transformação', hex: '#8b5cf6', desc: 'Modernidade, Independente' },
];

const TOM_VOZ_OPCOES = [
  {
    valor: 'POPULAR',
    titulo: 'Popular & Comunitário',
    desc: 'Linguagem simples, calorosa, próxima do dia a dia do eleitor.',
  },
  {
    valor: 'FORMAL',
    titulo: 'Institucional & Polido',
    desc: 'Tom respeitoso, vocabulário formal, postura republicana e técnica.',
  },
  {
    valor: 'DESCONTRAIDO',
    titulo: 'Jovem & Engajado',
    desc: 'Linguagem dinâmica, direta, com emojis e ritmo de redes sociais.',
  },
  {
    valor: 'TECNICO',
    titulo: 'Fundamentado & Propositivo',
    desc: 'Baseado em dados estatísticos, metas orçamentárias e projetos de lei.',
  },
];

const defaultCampanha: CampanhaConfigData = {
  nome_urna: 'Rodrigo da Saúde',
  nome_completo: 'Rodrigo Viscardi',
  numero_candidato: '2026',
  cargo: 'Deputado Federal',
  partido: 'AVANTE',
  coligacao: 'Coligação Por Dias Melhores',
  slogan: 'Trabalho, honestidade e compromisso com você',
  foto_url: '',
  logo_url: '',
  cor_primaria: '#10b981',
  cidade: 'São Paulo',
  estado: 'SP',
  data_eleicao: '2026-10-04',
  cnpj_campanha: '00.000.000/0001-00',
  biografia_ia:
    'Líder comunitário com mais de 10 anos de atuação na defesa da saúde básica, combate às desigualdades e promoção da dignidade para as famílias.',
  propostas_ia:
    'SAÚDE: Reestruturação das UBSs, mutirões de exames aos sábados e farmácia popular abastecida.\nEDUCAÇÃO: Valorização salarial de professores e reforço escolar com inteligência artificial.\nEMPREGO: Linhas de microcrédito para autônomos e capacitação técnica para jovens.',
  tom_voz_ia: 'POPULAR',
  link_grupo_geral: 'https://chat.whatsapp.com/convite-campanha',
  whatsapp_comite: '5511999990000',
};

export function ConfigCampanha({ apiBaseUrl = '', onConfigUpdated }: ConfigCampanhaProps) {
  const [config, setConfig] = useState<CampanhaConfigData>(defaultCampanha);
  const [activeTab, setActiveTab] = useState<'urna' | 'visual' | 'ia' | 'comite'>('urna');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/campanha/config`);
      if (res.ok) {
        const data = await res.json();
        if (data?.config) {
          setConfig({ ...defaultCampanha, ...data.config });
          if (onConfigUpdated) onConfigUpdated(data.config);
        }
      }
    } catch {
      setError('Não foi possível conectar à API de campanha.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSavedSuccess(false);

    try {
      const res = await fetch(`${apiBaseUrl}/api/campanha/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Erro ao salvar alterações da campanha.');
      }

      const data = await res.json();
      setConfig(data.config);
      if (onConfigUpdated) onConfigUpdated(data.config);

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: any) {
      setError(err.message || 'Erro inesperado ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-3">
        <RefreshCw className="w-7 h-7 animate-spin text-emerald-400" />
        <span className="text-xs">Carregando dados da campanha...</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-950 text-white overflow-y-auto">
      {/* Top Header com Botão Salvar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-slate-800 bg-slate-900/90 sticky top-0 z-20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-slate-950 shadow-lg"
            style={{ backgroundColor: config.cor_primaria }}
          >
            <Vote className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-white uppercase tracking-tight">
                Personalização da Campanha (White-Label)
              </h2>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full text-slate-950"
                style={{ backgroundColor: config.cor_primaria }}
              >
                {config.numero_candidato}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Configure os dados do candidato, identidade visual, cérebro da IA e contatos do comitê.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {savedSuccess && (
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 animate-fadeIn">
              <Check className="w-4 h-4" /> Dados atualizados!
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-black rounded-xl transition-all shadow-lg text-slate-950 cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: config.cor_primaria }}
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
            ) : (
              <Save className="w-4 h-4 text-slate-950" />
            )}
            <span>{saving ? 'Gravando...' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-5 mt-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Grid: Abas de Navegação + Conteúdo + Preview do Card Eleitoral */}
      <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Painel de Configuração (8 Colunas) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Menu de Sub-Abas */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('urna')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'urna'
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Vote className="w-3.5 h-3.5 text-emerald-400" />
              1. Candidato & Urna
            </button>
            <button
              onClick={() => setActiveTab('visual')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'visual'
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Palette className="w-3.5 h-3.5 text-blue-400" />
              2. Cores & Logotipo
            </button>
            <button
              onClick={() => setActiveTab('ia')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'ia'
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-purple-400" />
              3. Cérebro da IA (Propostas)
            </button>
            <button
              onClick={() => setActiveTab('comite')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'comite'
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-orange-400" />
              4. Comitê & Localidade
            </button>
          </div>

          {/* ABA 1: Candidato & Urna */}
          {activeTab === 'urna' && (
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 animate-fadeIn">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                <Vote className="w-4 h-4 text-emerald-400" />
                Dados Oficiais de Votação (TSE)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Nome de Urna <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={config.nome_urna}
                    onChange={(e) => setConfig({ ...config, nome_urna: e.target.value })}
                    placeholder="Ex: Rodrigo da Saúde"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-slate-500">Nome exibido na tela da urna eletrônica.</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Número do Candidato <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={config.numero_candidato}
                    onChange={(e) => setConfig({ ...config, numero_candidato: e.target.value })}
                    placeholder="Ex: 2026 ou 12345"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-slate-500">Número que o eleitor digitará para votar.</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Cargo em Disputa <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={config.cargo}
                    onChange={(e) => setConfig({ ...config, cargo: e.target.value })}
                    placeholder="Ex: Deputado Federal, Prefeito, Vereador"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Partido Político <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={config.partido}
                    onChange={(e) => setConfig({ ...config, partido: e.target.value })}
                    placeholder="Ex: AVANTE, MDB, PL, PT"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Nome Completo Oficial</label>
                  <input
                    type="text"
                    value={config.nome_completo}
                    onChange={(e) => setConfig({ ...config, nome_completo: e.target.value })}
                    placeholder="Ex: Rodrigo Viscardi da Silva"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Coligação Partidária</label>
                  <input
                    type="text"
                    value={config.coligacao || ''}
                    onChange={(e) => setConfig({ ...config, coligacao: e.target.value })}
                    placeholder="Ex: Coligação A Força do Povo (AVANTE / PSD / PODE)"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Slogan / Frase de Campanha</label>
                  <input
                    type="text"
                    value={config.slogan || ''}
                    onChange={(e) => setConfig({ ...config, slogan: e.target.value })}
                    placeholder="Ex: Trabalho, honestidade e compromisso com você"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ABA 2: Cores & Identidade Visual */}
          {activeTab === 'visual' && (
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-5 animate-fadeIn">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                <Palette className="w-4 h-4 text-blue-400" />
                Paleta de Cores & Logotipos
              </div>

              {/* Presets de Cores */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">
                  Cor de Destaque da Campanha (Botões, Títulos e Cartazes)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {PRESET_CORES.map((preset) => {
                    const isSelected = config.cor_primaria.toLowerCase() === preset.hex.toLowerCase();
                    return (
                      <button
                        key={preset.hex}
                        type="button"
                        onClick={() => setConfig({ ...config, cor_primaria: preset.hex })}
                        className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-800 border-white/40 ring-2 ring-white/20'
                            : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div
                          className="w-7 h-7 rounded-lg shrink-0 shadow-md border border-white/20"
                          style={{ backgroundColor: preset.hex }}
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">{preset.nome}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{preset.hex}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cor Customizada */}
              <div className="flex items-center gap-3 p-3 bg-slate-900 rounded-xl border border-slate-800">
                <input
                  type="color"
                  value={config.cor_primaria}
                  onChange={(e) => setConfig({ ...config, cor_primaria: e.target.value })}
                  className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-white">Seletor de Cor Livre</span>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Código Hexadecimal selecionado: <strong>{config.cor_primaria}</strong>
                  </p>
                </div>
              </div>

              {/* Seletor de Modo Claro / Escuro */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="text-xs font-semibold text-slate-300">
                  Modo de Exibição do Painel (Claro / Escuro)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        localStorage.setItem('theme', 'dark');
                        document.documentElement.classList.add('dark');
                        document.documentElement.classList.remove('light');
                      } catch {}
                    }}
                    className="p-3.5 rounded-xl border border-slate-700 bg-slate-900 text-left flex items-center gap-3 cursor-pointer hover:border-slate-500 transition-all"
                  >
                    <div className="p-2 rounded-lg bg-slate-800 text-cyan-400">
                      <Moon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Modo Escuro (Padrão)</div>
                      <div className="text-[11px] text-slate-400">Ambiente de comitê, telões e operações noturnas.</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      try {
                        localStorage.setItem('theme', 'light');
                        document.documentElement.classList.remove('dark');
                        document.documentElement.classList.add('light');
                      } catch {}
                    }}
                    className="p-3.5 rounded-xl border border-slate-300 bg-white text-left flex items-center gap-3 cursor-pointer hover:border-slate-400 transition-all text-slate-900 shadow-sm"
                  >
                    <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                      <Sun className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Modo Claro</div>
                      <div className="text-[11px] text-slate-600">Ambientes externos, luz do dia e relatórios impressos.</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* URLs de Imagens */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">URL da Foto do Candidato</label>
                  <input
                    type="text"
                    value={config.foto_url || ''}
                    onChange={(e) => setConfig({ ...config, foto_url: e.target.value })}
                    placeholder="https://exemplo.com/foto-candidato.jpg"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] text-slate-500">
                    Foto em alta resolução para cartazes e QR Code do comitê.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">URL do Logotipo da Campanha</label>
                  <input
                    type="text"
                    value={config.logo_url || ''}
                    onChange={(e) => setConfig({ ...config, logo_url: e.target.value })}
                    placeholder="https://exemplo.com/logo-campanha.png"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] text-slate-500">Formato PNG transparente recomendado.</p>
                </div>
              </div>
            </div>
          )}

          {/* ABA 3: Cérebro da IA (Propostas & Biografia) */}
          {activeTab === 'ia' && (
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                  <Bot className="w-4 h-4 text-purple-400" />
                  Alimentação da Inteligência Artificial (Groq / Llama 3.3)
                </div>
                <span className="text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded-full font-bold">
                  Anti-Alucinação Ativa
                </span>
              </div>

              {/* Tom de Voz */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">
                  Tom de Voz do Assistente Virtual
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {TOM_VOZ_OPCOES.map((t) => {
                    const isSelected = config.tom_voz_ia === t.valor;
                    return (
                      <button
                        key={t.valor}
                        type="button"
                        onClick={() =>
                          setConfig({ ...config, tom_voz_ia: t.valor as CampanhaConfigData['tom_voz_ia'] })
                        }
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-purple-950/40 border-purple-500 text-purple-200'
                            : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="text-xs font-bold mb-1 flex items-center justify-between">
                          <span>{t.titulo}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-purple-400" />}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">{t.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Biografia Resumida */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>História & Biografia do Candidato (Quem é ele?)</span>
                  <span className="text-[10px] text-slate-500">Usado pela IA quando eleitores perguntam quem é</span>
                </label>
                <textarea
                  rows={3}
                  value={config.biografia_ia}
                  onChange={(e) => setConfig({ ...config, biografia_ia: e.target.value })}
                  placeholder="Conte resumidamente a trajetória do candidato, profissão, causas e conquistas..."
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 leading-relaxed resize-none"
                />
              </div>

              {/* Propostas e Bandeiras */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Propostas Oficiais por Tema (Saúde, Educação, Segurança, etc.)</span>
                  <span className="text-[10px] text-slate-500">A IA consultará esta lista antes de responder</span>
                </label>
                <textarea
                  rows={6}
                  value={config.propostas_ia}
                  onChange={(e) => setConfig({ ...config, propostas_ia: e.target.value })}
                  placeholder="SAÚDE: Proposta 1, Proposta 2...&#10;EDUCAÇÃO: Proposta 1, Proposta 2..."
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-purple-500 leading-relaxed resize-none"
                />
                <p className="text-[10px] text-slate-500">
                  Dica: Escreva em tópicos claros. Quando o eleitor perguntar sobre saúde, o bot citará as propostas cadastradas aqui.
                </p>
              </div>
            </div>
          )}

          {/* ABA 4: Comitê & Localidade */}
          {activeTab === 'comite' && (
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 animate-fadeIn">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                <MapPin className="w-4 h-4 text-orange-400" />
                Território, Prazos & Conformidade Legal
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Cidade / Município Foco</label>
                  <input
                    type="text"
                    value={config.cidade}
                    onChange={(e) => setConfig({ ...config, cidade: e.target.value })}
                    placeholder="Ex: São Paulo, Campinas, Curitiba"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Estado (UF)</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={config.estado}
                    onChange={(e) => setConfig({ ...config, estado: e.target.value.toUpperCase() })}
                    placeholder="SP"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white uppercase font-mono focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Data Oficial da Eleição</label>
                  <input
                    type="date"
                    value={config.data_eleicao}
                    onChange={(e) => setConfig({ ...config, data_eleicao: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                  <p className="text-[10px] text-slate-500">Usado para cálculo do velocímetro e cadência diária.</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">CNPJ da Campanha</label>
                  <input
                    type="text"
                    value={config.cnpj_campanha || ''}
                    onChange={(e) => setConfig({ ...config, cnpj_campanha: e.target.value })}
                    placeholder="00.000.000/0001-00"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                  />
                  <p className="text-[10px] text-slate-500">Exibido nos relatórios executivos em PDF para prestação de contas.</p>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Link de Convite do Grupo Geral de Base</label>
                  <input
                    type="url"
                    value={config.link_grupo_geral || ''}
                    onChange={(e) => setConfig({ ...config, link_grupo_geral: e.target.value })}
                    placeholder="https://chat.whatsapp.com/..."
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                  <p className="text-[10px] text-slate-500">Enviado automaticamente para novos líderes e apoiadores entrarem na comunidade.</p>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-300">WhatsApp Oficial do Comitê Central</label>
                  <input
                    type="text"
                    value={config.whatsapp_comite || ''}
                    onChange={(e) => setConfig({ ...config, whatsapp_comite: e.target.value })}
                    placeholder="5511999990000"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Card de Visualização em Tempo Real (4 Colunas) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            Visualização ao Vivo da Campanha
          </div>

          {/* Card do Candidato */}
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-2xl overflow-hidden relative space-y-4">
            {/* Faixa de cor partidária no topo */}
            <div
              className="absolute top-0 left-0 right-0 h-2.5"
              style={{ backgroundColor: config.cor_primaria }}
            />

            <div className="flex items-start gap-3.5 pt-2">
              {config.foto_url ? (
                <img
                  src={config.foto_url}
                  alt={config.nome_urna}
                  className="w-16 h-16 rounded-2xl object-cover border-2 shadow-md shrink-0"
                  style={{ borderColor: config.cor_primaria }}
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl shadow-md shrink-0 text-slate-950"
                  style={{ backgroundColor: config.cor_primaria }}
                >
                  {config.nome_urna.substring(0, 2).toUpperCase()}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {config.partido}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {config.cidade}-{config.estado}
                  </span>
                </div>
                <h3 className="text-base font-black text-white truncate mt-1">{config.nome_urna}</h3>
                <p className="text-xs text-slate-400 font-medium">{config.cargo}</p>
              </div>
            </div>

            {/* Caixa de Voto */}
            <div
              className="p-3.5 rounded-2xl text-center space-y-1 shadow-inner border border-white/10"
              style={{ backgroundColor: `${config.cor_primaria}20` }}
            >
              <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                VOTE PARA {config.cargo.toUpperCase()}
              </div>
              <div
                className="text-3xl font-black tracking-widest font-mono"
                style={{ color: config.cor_primaria }}
              >
                {config.numero_candidato}
              </div>
            </div>

            {/* Slogan */}
            {config.slogan && (
              <p className="text-xs text-slate-300 italic text-center font-serif leading-relaxed px-2">
                "{config.slogan}"
              </p>
            )}

            {/* Detalhes de Auditoria / CNPJ */}
            <div className="pt-3 border-t border-slate-800/80 text-[10px] text-slate-500 space-y-1 font-mono">
              <div>Eleição: {config.data_eleicao}</div>
              {config.coligacao && <div className="truncate">Coligação: {config.coligacao}</div>}
              {config.cnpj_campanha && <div>CNPJ: {config.cnpj_campanha}</div>}
            </div>
          </div>

          {/* Dica para o Candidato */}
          <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-800/30 text-xs text-emerald-200/90 space-y-2">
            <div className="font-bold flex items-center gap-1 text-emerald-400">
              <Shield className="w-3.5 h-3.5" />
              Impacto no Sistema:
            </div>
            <p className="text-[11px] leading-relaxed text-slate-300">
              As alterações salvas aqui atualizam automaticamente:
              <br />• O cabeçalho do Cockpit de Metas
              <br />• O cartaz gerado com QR Code para novos líderes
              <br />• As respostas da inteligência artificial no WhatsApp
              <br />• O cabeçalho dos relatórios executivos em PDF
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
