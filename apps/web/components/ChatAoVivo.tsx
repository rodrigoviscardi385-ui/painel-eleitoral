'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Search,
  Send,
  Sparkles,
  Bot,
  User,
  Phone,
  MapPin,
  Vote,
  ShieldCheck,
  Check,
  CheckCheck,
  Clock,
  RefreshCw,
  Zap,
  Tag,
  Filter,
  Users,
  AlertCircle,
  FileText,
  Volume2,
  ChevronRight,
  Smile,
} from 'lucide-react';

interface Conversa {
  id: string;
  nome: string;
  whatsapp: string;
  cargo?: string;
  bairro?: string;
  zona_eleitoral?: string;
  ultima_mensagem?: string;
  tipo?: string;
  status?: string;
  setor?: string;
  opt_out?: boolean;
  tags?: string[];
  updated_at: string;
  nao_lidas?: number;
}

interface Mensagem {
  id: string;
  conversa_id: string;
  de_whatsapp: string;
  para_whatsapp: string;
  remetente_nome?: string;
  conteudo: string;
  tipo: 'TEXTO' | 'AUDIO' | 'IMAGEM' | 'DOCUMENTO';
  direcao: 'ENTRADA' | 'SAIDA';
  status: 'PENDENTE' | 'ENVIADO' | 'ENTREGUE' | 'LIDO' | 'ERRO';
  midia_url?: string;
  atendente_nome?: string;
  created_at: string;
}

interface ChatAoVivoProps {
  apiBaseUrl?: string;
  currentUser?: { nome: string; role: string };
}

export function ChatAoVivo({
  apiBaseUrl = '',
  currentUser = { nome: 'Operador', role: 'ADMIN' },
}: ChatAoVivoProps) {
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [selectedConversa, setSelectedConversa] = useState<Conversa | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'NAO_LIDOS' | 'LIDERES' | 'OPT_OUT' | 'JURIDICO' | 'AGENDA'>('TODOS');
  const [loadingConversas, setLoadingConversas] = useState(false);
  const [loadingMensagens, setLoadingMensagens] = useState(false);
  const [sending, setSending] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [waStatus, setWaStatus] = useState<{ connected: boolean; status: string; phoneNumber?: string } | null>(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState('');
  const [newChatName, setNewChatName] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 0. Verificar Status de Conexão do WhatsApp
  const checkWaStatus = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/whatsapp/status`);
      if (res.ok) {
        const data = await res.json();
        setWaStatus({
          connected: data.connected ?? false,
          status: data.status || 'DISCONNECTED',
          phoneNumber: data.phoneNumber,
        });
      }
    } catch {
      setWaStatus({ connected: false, status: 'DISCONNECTED' });
    }
  };

  useEffect(() => {
    checkWaStatus();
    const interval = setInterval(checkWaStatus, 15000);
    return () => clearInterval(interval);
  }, [apiBaseUrl]);

  // 1. Buscar lista de conversas
  const fetchConversas = async () => {
    setLoadingConversas(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/chat/conversas`);
      if (res.ok) {
        const data = await res.json();
        setConversas(data.conversas || []);
        if (!selectedConversa && data.conversas && data.conversas.length > 0) {
          setSelectedConversa(data.conversas[0]);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar conversas:', err);
    } finally {
      setLoadingConversas(false);
    }
  };

  // 2. Buscar mensagens da conversa selecionada
  const fetchMensagens = async (phone: string) => {
    setLoadingMensagens(true);
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const res = await fetch(`${apiBaseUrl}/api/chat/conversas/${cleanPhone}`);
      if (res.ok) {
        const data = await res.json();
        setMensagens(data.mensagens || []);
        setTimeout(scrollToBottom, 100);
      }
    } catch (err) {
      console.error('Erro ao buscar mensagens:', err);
    } finally {
      setLoadingMensagens(false);
    }
  };

  useEffect(() => {
    fetchConversas();
  }, []);

  useEffect(() => {
    if (selectedConversa) {
      fetchMensagens(selectedConversa.whatsapp);
    }
  }, [selectedConversa?.whatsapp]);

  // Criar nova conversa manual com qualquer número
  const handleCreateNewChat = (e: React.FormEvent) => {
    e.preventDefault();
    let clean = newChatPhone.replace(/\D/g, '');
    if (!clean) return;
    if (clean.length === 10 || clean.length === 11) clean = `55${clean}`;

    const nova: Conversa = {
      id: clean,
      nome: newChatName.trim() || `Contato (${clean})`,
      whatsapp: clean,
      cargo: 'APOIADOR',
      ultima_mensagem: 'Toque para enviar mensagem',
      updated_at: new Date().toISOString(),
      nao_lidas: 0,
      tags: [],
    };

    setConversas((prev) => {
      const exists = prev.find((c) => c.whatsapp.replace(/\D/g, '') === clean);
      if (exists) return prev;
      return [nova, ...prev];
    });

    setSelectedConversa(nova);
    setNewChatPhone('');
    setNewChatName('');
    setShowNewChatModal(false);
  };

  // 3. Conexão SSE em Tempo Real para novas mensagens
  useEffect(() => {
    const eventSource = new EventSource(`${apiBaseUrl}/api/chat/stream`);

    eventSource.onmessage = (event) => {
      try {
        const novaMsg: Mensagem = JSON.parse(event.data);
        if (novaMsg && novaMsg.conversa_id) {
          // Atualiza lista de mensagens se for da conversa atual
          if (
            selectedConversa &&
            (novaMsg.conversa_id.includes(selectedConversa.whatsapp.replace(/\D/g, '')) ||
              selectedConversa.whatsapp.replace(/\D/g, '').includes(novaMsg.conversa_id))
          ) {
            setMensagens((prev) => [...prev, novaMsg]);
            setTimeout(scrollToBottom, 100);
          }

          // Atualiza conversa na barra lateral
          setConversas((prev) => {
            const index = prev.findIndex(
              (c) =>
                c.whatsapp.replace(/\D/g, '').includes(novaMsg.conversa_id) ||
                novaMsg.conversa_id.includes(c.whatsapp.replace(/\D/g, ''))
            );
            if (index !== -1) {
              const updated = [...prev];
              updated[index] = {
                ...updated[index],
                ultima_mensagem: novaMsg.conteudo,
                updated_at: novaMsg.created_at,
                nao_lidas: (updated[index].nao_lidas || 0) + (novaMsg.direcao === 'ENTRADA' ? 1 : 0),
              };
              return updated;
            }
            return prev;
          });
        }
      } catch (err) {
        console.warn('Erro ao processar evento SSE:', err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [selectedConversa, apiBaseUrl]);

  // 4. Envio de mensagem com sincronização de conversa_id
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !selectedConversa || sending) return;

    const texto = inputText.trim();
    setInputText('');
    setSending(true);
    setWarningMessage(null);

    try {
      const res = await fetch(`${apiBaseUrl}/api/chat/enviar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          para_whatsapp: selectedConversa.whatsapp,
          conversa_id: selectedConversa.id || selectedConversa.whatsapp,
          conteudo: texto,
          tipo: 'TEXTO',
          atendente_nome: currentUser.nome || 'Operador',
        }),
      });

      const data = await res.json();
      if (res.ok && data.mensagem) {
        // Mensagem inserida no estado se não veio pelo SSE
        setMensagens((prev) => {
          if (prev.some((m) => m.id === data.mensagem.id)) return prev;
          return [...prev, data.mensagem];
        });
        setTimeout(scrollToBottom, 100);

        if (data.success === false) {
          setWarningMessage('⚠️ Mensagem gravada no painel. O WhatsApp do servidor pode estar desconectado no momento.');
          setTimeout(() => setWarningMessage(null), 8000);
        }
      } else {
        setWarningMessage('❌ ' + (data.error || 'Erro ao enviar mensagem pelo WhatsApp.'));
        setTimeout(() => setWarningMessage(null), 8000);
      }
    } catch (err: any) {
      console.error('Erro ao enviar mensagem:', err);
      setWarningMessage('❌ Falha de rede ao tentar enviar: ' + (err.message || ''));
      setTimeout(() => setWarningMessage(null), 8000);
    } finally {
      setSending(false);
    }
  };

  // 5. Groq AI Copilot: Sugestão de Resposta
  const handleGenerateAiResponse = async () => {
    if (!selectedConversa || generatingAi) return;

    // Pega a última mensagem recebida do eleitor
    const ultimasMensagensEntrada = mensagens.filter((m) => m.direcao === 'ENTRADA');
    const ultimaMsg = ultimasMensagensEntrada[ultimasMensagensEntrada.length - 1];

    setGeneratingAi(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/chat/copilot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensagem_eleitor: ultimaMsg ? ultimaMsg.conteudo : 'Olá, como posso ajudar?',
          nome_eleitor: selectedConversa.nome,
          contexto_bairro: selectedConversa.bairro || 'Santos/SP',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.sugestao) {
          setInputText(data.sugestao);
        }
      }
    } catch (err) {
      console.error('Erro no Groq Copilot:', err);
    } finally {
      setGeneratingAi(false);
    }
  };

  // 6. Templates Rápidos
  const quickTemplates = [
    {
      label: '🏛️ Propostas',
      text: `Olá ${selectedConversa?.nome || ''}! Nossas principais propostas para nossa cidade focam em Saúde Humanizada, Segurança com Tecnologia e Fortalecimento dos Bairros. Saiba mais e participe da nossa caminhada! 🗳️`,
    },
    {
      label: '📍 Local Votação',
      text: `Olá! Seu local de votação fica na sua zona e seção de costume. Caso queira conferir ou transferir seu título, nossa equipe está à disposição para ajudar!`,
    },
    {
      label: '👥 Convite Líder',
      text: `Você tem perfil de liderança e queremos você na nossa coordenação de base do bairro! Vamos agendar um bate-papo com nossa coordenação? 🚀`,
    },
    {
      label: '🙏 Agradecimento',
      text: `Muito obrigado pelo seu apoio e carinho! Juntos somos mais fortes por uma cidade cada vez melhor! 🤝🏛️`,
    },
  ];

  // Filtragem de conversas
  const filteredConversas = conversas.filter((c) => {
    const matchesSearch =
      c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.whatsapp.includes(searchTerm) ||
      (c.bairro && c.bairro.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (filtroTipo === 'NAO_LIDOS') return (c.nao_lidas || 0) > 0;
    if (filtroTipo === 'LIDERES') return c.cargo === 'LIDER' || c.cargo === 'ADMIN';
    if (filtroTipo === 'OPT_OUT') return !!c.opt_out;
    if (filtroTipo === 'JURIDICO') return c.setor === 'JURIDICO';
    if (filtroTipo === 'AGENDA') return c.setor === 'AGENDA';
    return true;
  });

  return (
    <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 backdrop-blur-2xl rounded-3xl shadow-xl overflow-hidden h-full flex flex-col text-slate-900 dark:text-white transition-colors duration-200">
      {/* Top Header do Módulo */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-400">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Chat ao Vivo & Atendimento Multi-Canal
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                Tempo Real
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Receba e responda mensagens do WhatsApp diretamente pelo comitê eleitoral
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {waStatus?.connected ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>WhatsApp Conectado {waStatus.phoneNumber ? `(${waStatus.phoneNumber})` : ''}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>WhatsApp Desconectado</span>
            </div>
          )}

          <button
            onClick={() => setShowNewChatModal(true)}
            className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Iniciar conversa com qualquer número"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-200" />
            <span>+ Nova Conversa</span>
          </button>

          <button
            onClick={fetchConversas}
            disabled={loadingConversas}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl transition-all cursor-pointer"
            title="Atualizar Conversas"
          >
            <RefreshCw className={`w-4 h-4 ${loadingConversas ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Grid Principal: sidebar + chat, perfil oculto em mobile */}
      <div className="flex-1 min-h-0 flex flex-col md:grid md:grid-cols-12 overflow-hidden h-full max-h-full">
        {/* COLUNA 1: LISTA DE CONVERSAS — scroll independente */}
        <div className={`${selectedConversa ? 'hidden md:flex' : 'flex'} md:col-span-4 flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40 h-full max-h-full overflow-hidden min-h-0`}>
          {/* Busca & Filtros */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800/80 space-y-2.5 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar eleitor, líder ou bairro..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 shadow-sm"
              />
            </div>

            {/* Pills de Filtro */}
            <div className="flex items-center gap-1.5 text-[11px] overflow-x-auto pb-1 scrollbar-none">
              {(['TODOS', 'NAO_LIDOS', 'LIDERES', 'OPT_OUT', 'JURIDICO', 'AGENDA'] as const).map((tipo) => (
                <button
                  key={tipo}
                  onClick={() => setFiltroTipo(tipo)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all shrink-0 cursor-pointer ${
                    filtroTipo === tipo
                      ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 font-bold shadow-sm'
                      : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800/60 shadow-sm'
                  }`}
                >
                  {tipo === 'TODOS'
                    ? 'Todos'
                    : tipo === 'NAO_LIDOS'
                    ? 'Não Lidos'
                    : tipo === 'LIDERES'
                    ? 'Líderes'
                    : tipo === 'OPT_OUT'
                    ? '🛑 Opt-Out'
                    : tipo === 'JURIDICO'
                    ? '⚖️ Jurídico'
                    : '📅 Agenda'}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de Contatos com Scroll Isolado */}
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/40">
            {filteredConversas.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500">
                <Users className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-600 mb-2 opacity-60" />
                Nenhuma conversa encontrada
              </div>
            ) : (
              filteredConversas.map((c) => {
                const isSelected = selectedConversa?.whatsapp === c.whatsapp;
                return (
                  <button
                    key={c.id || c.whatsapp}
                    onClick={() => {
                      setSelectedConversa(c);
                      // Limpar badge de não lidas localmente
                      c.nao_lidas = 0;
                    }}
                    className={`w-full text-left p-3.5 transition-all flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-l-4 border-emerald-500'
                        : 'hover:bg-slate-100/80 dark:hover:bg-slate-900/60'
                    }`}
                  >
                    {/* Avatar com Iniciais */}
                    <div className="w-10 h-10 rounded-2xl bg-slate-200 dark:bg-gradient-to-tr dark:from-slate-800 dark:to-slate-700 border border-slate-300 dark:border-slate-700 flex items-center justify-center font-bold text-slate-800 dark:text-white text-xs shrink-0 shadow-sm">
                      {c.nome ? c.nome.substring(0, 2).toUpperCase() : 'WA'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{c.nome}</h4>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                          {c.updated_at
                            ? new Date(c.updated_at).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mb-1.5">
                        {c.ultima_mensagem || 'Clique para abrir conversa'}
                      </p>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {c.cargo && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              c.cargo === 'ADMIN'
                                ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800/40'
                                : c.cargo === 'LIDER'
                                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40'
                                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                            }`}
                          >
                            {c.cargo}
                          </span>
                        )}

                        {c.bairro && (
                          <span className="text-[9px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                            {c.bairro}
                          </span>
                        )}

                        {(c.nao_lidas || 0) > 0 && (
                          <span className="ml-auto text-[10px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-full shadow-sm">
                            {c.nao_lidas}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* COLUNA 2: ÁREA DE CHAT — scroll independente */}
        <div className={`${selectedConversa ? 'flex' : 'hidden md:flex'} md:col-span-5 flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex-1 h-full max-h-full overflow-hidden min-h-0`}>
          {selectedConversa ? (
            <>
              {/* Header do Chat Ativo */}
              <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 flex items-center justify-between shadow-sm dark:shadow-none shrink-0">
                <div className="flex items-center gap-3">
                  {/* Botão Voltar — visível apenas em mobile */}
                  <button
                    onClick={() => setSelectedConversa(null)}
                    className="md:hidden p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                    title="Voltar para lista"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                  </button>
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center font-bold text-emerald-700 dark:text-emerald-400 text-xs">
                    {selectedConversa.nome.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white">{selectedConversa.nome}</h3>
                      {selectedConversa.opt_out && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-500/30">
                          🛑 Opt-Out TSE
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5">
                      <span>{selectedConversa.whatsapp}</span>
                      {selectedConversa.bairro && <span>• {selectedConversa.bairro}</span>}
                      {selectedConversa.setor && selectedConversa.setor !== 'GERAL' && (
                        <span className="text-blue-600 dark:text-blue-400 font-semibold">• Setor: {selectedConversa.setor}</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <a
                    href={`https://wa.me/${selectedConversa.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/40 rounded-lg transition-all flex items-center gap-1 font-semibold"
                    title="Abrir no WhatsApp Web Oficial"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Feed de Mensagens com Scroll Isolado */}
              <div className="flex-1 min-h-0 p-4 overflow-y-auto space-y-3">
                {loadingMensagens ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    <RefreshCw className="w-5 h-5 mx-auto animate-spin text-emerald-400 mb-2" />
                    Carregando mensagens...
                  </div>
                ) : mensagens.length === 0 ? (
                  <div className="p-12 text-center text-xs text-slate-500 space-y-2">
                    <MessageSquare className="w-10 h-10 mx-auto text-slate-700" />
                    <p className="text-slate-400 font-medium">Nenhuma mensagem registrada nesta conversa.</p>
                    <p className="text-[11px] text-slate-500">
                      Envie uma mensagem abaixo para iniciar o diálogo com este eleitor.
                    </p>
                  </div>
                ) : (
                  mensagens.map((msg) => {
                    const isOutgoing = msg.direcao === 'SAIDA';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isOutgoing ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-sm ${
                            isOutgoing
                              ? 'bg-gradient-to-tr from-emerald-600 to-teal-600 text-white rounded-tr-none shadow-emerald-600/10'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700/60 rounded-tl-none'
                          }`}
                        >
                          {/* Nome do Remetente */}
                          {!isOutgoing && msg.remetente_nome && (
                            <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mb-0.5">
                              {msg.remetente_nome}
                            </div>
                          )}

                          {/* Tipo Áudio */}
                          {msg.tipo === 'AUDIO' && (
                            <div className="flex items-center gap-2 py-1 text-emerald-700 dark:text-emerald-300 font-semibold">
                              <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                              <span>[Mensagem de Áudio Transcrita]</span>
                            </div>
                          )}

                          {/* Conteúdo da Mensagem */}
                          <p className={`whitespace-pre-wrap font-normal ${isOutgoing ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                            {msg.conteudo}
                          </p>

                          {/* Rodapé do Balão: Hora e Status de Envio */}
                          <div
                            className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${
                              isOutgoing ? 'text-emerald-100/90' : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            <span>
                              {new Date(msg.created_at).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {isOutgoing && (
                              <span className="flex items-center gap-1">
                                {msg.status === 'ENVIADO' || msg.status === 'ENTREGUE' || msg.status === 'LIDO' ? (
                                  <CheckCheck className="w-3 h-3 text-emerald-200" />
                                ) : msg.status === 'PENDENTE' ? (
                                  <Clock className="w-3 h-3 text-amber-200" />
                                ) : (
                                  <AlertCircle className="w-3 h-3 text-rose-300" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Barra de Templates e Copilot IA */}
              <div className="px-3 pt-2 pb-1 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 space-y-2 shrink-0">
                {warningMessage && (
                  <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 text-xs text-amber-800 dark:text-amber-300 animate-fadeIn">
                    {warningMessage}
                  </div>
                )}
                <div className="flex items-center justify-between gap-1.5 overflow-x-auto scrollbar-none text-[10px]">
                  {/* Botão Copilot Groq AI */}
                  <button
                    type="button"
                    onClick={handleGenerateAiResponse}
                    disabled={generatingAi}
                    className="px-2.5 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    <Bot className={`w-3.5 h-3.5 ${generatingAi ? 'animate-spin' : ''}`} />
                    <span>{generatingAi ? 'Gerando Resposta IA...' : 'Sugerir Resposta IA'}</span>
                  </button>

                  {/* Respostas Rápidas */}
                  {quickTemplates.map((t, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setInputText(t.text)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-lg transition-all shrink-0 cursor-pointer shadow-sm"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Input de Mensagem */}
                <form onSubmit={handleSendMessage} className="flex items-center gap-2 pb-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Digite sua resposta ou use os atalhos acima..."
                    className="flex-1 px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 shadow-sm"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || sending}
                    className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4 text-white" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <MessageSquare className="w-12 h-12 text-slate-700 mb-3" />
              <p className="text-sm font-semibold text-slate-300">Selecione uma conversa ao lado</p>
              <p className="text-xs text-slate-500 mt-1">
                Para responder ou enviar mensagens em tempo real aos eleitores.
              </p>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* COLUNA 3: INTELIGÊNCIA DO ELEITOR / PERFIL POLÍTICO — scroll independente */}
        <div className="hidden md:flex md:col-span-3 flex-col h-full max-h-full overflow-hidden p-4 bg-slate-50/40 dark:bg-slate-950/60 border-l border-slate-200 dark:border-transparent min-h-0">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 shrink-0 pb-3">
            <Vote className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Ficha Eleitoral
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">

          {selectedConversa ? (
            <div className="space-y-3">
              {/* Card de Identificação */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-sm">
                <div className="text-xs font-bold text-slate-900 dark:text-white">{selectedConversa.nome}</div>

                <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">{selectedConversa.whatsapp}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-slate-600 dark:text-slate-300">{selectedConversa.bairro || 'Bairro não informado'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Vote className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-slate-600 dark:text-slate-300">Zona {selectedConversa.zona_eleitoral || '100'}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">Classificação:</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                    {selectedConversa.cargo || 'APOIADOR'}
                  </span>
                </div>
              </div>

              {/* Dicas de Atendimento */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 text-xs text-emerald-900 dark:text-emerald-200/90 space-y-2 shadow-sm">
                <div className="font-bold flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  Estratégia de Conversão:
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                  Responda de forma ágil e mencione o bairro <strong>{selectedConversa.bairro || 'da sua região'}</strong> para gerar proximidade e confiança!
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Selecione um contato para ver a inteligência eleitoral.</p>
          )}
          </div>
        </div>
      </div>

      {/* Modal de Nova Conversa Manual */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Iniciar Nova Conversa</h3>
                  <p className="text-[11px] text-slate-500">Envie mensagem para qualquer número de WhatsApp</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewChat} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Número de WhatsApp *
                </label>
                <input
                  type="text"
                  placeholder="Ex: (11) 98765-4321 ou 11987654321"
                  value={newChatPhone}
                  onChange={(e) => setNewChatPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-mono"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nome do Contato / Eleitor (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: João da Silva"
                  value={newChatName}
                  onChange={(e) => setNewChatName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewChatModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/60 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  Abrir Conversa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
