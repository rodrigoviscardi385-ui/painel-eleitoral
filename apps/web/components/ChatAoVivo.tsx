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
  apiBaseUrl = 'http://localhost:3001',
  currentUser = { nome: 'Operador', role: 'ADMIN' },
}: ChatAoVivoProps) {
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [selectedConversa, setSelectedConversa] = useState<Conversa | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'NAO_LIDOS' | 'LIDERES' | 'APOIADORES'>('TODOS');
  const [loadingConversas, setLoadingConversas] = useState(false);
  const [loadingMensagens, setLoadingMensagens] = useState(false);
  const [sending, setSending] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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

  // 4. Envio de mensagem
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !selectedConversa || sending) return;

    const texto = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const res = await fetch(`${apiBaseUrl}/api/chat/enviar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          para_whatsapp: selectedConversa.whatsapp,
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
      }
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
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
    if (filtroTipo === 'APOIADORES') return c.cargo === 'APOIADOR';
    return true;
  });

  return (
    <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-2xl rounded-3xl shadow-2xl overflow-hidden h-[780px] flex flex-col">
      {/* Top Header do Módulo */}
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Chat ao Vivo & Atendimento Multi-Canal
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Tempo Real
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Receba e responda mensagens do WhatsApp diretamente pelo comitê eleitoral
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchConversas}
            disabled={loadingConversas}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl transition-all"
            title="Atualizar Conversas"
          >
            <RefreshCw className={`w-4 h-4 ${loadingConversas ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Grid Principal: 3 Colunas */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* ========================================================================= */}
        {/* COLUNA 1: LISTA DE CONVERSAS (4 Colunas) */}
        {/* ========================================================================= */}
        <div className="col-span-4 border-r border-slate-800 flex flex-col bg-slate-950/40">
          {/* Busca & Filtros */}
          <div className="p-3 border-b border-slate-800/80 space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar eleitor, líder ou bairro..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            {/* Pills de Filtro */}
            <div className="flex items-center gap-1.5 text-[11px] overflow-x-auto pb-1 scrollbar-none">
              {(['TODOS', 'NAO_LIDOS', 'LIDERES', 'APOIADORES'] as const).map((tipo) => (
                <button
                  key={tipo}
                  onClick={() => setFiltroTipo(tipo)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all shrink-0 cursor-pointer ${
                    filtroTipo === tipo
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800/60'
                  }`}
                >
                  {tipo === 'TODOS'
                    ? 'Todos'
                    : tipo === 'NAO_LIDOS'
                    ? 'Não Lidos'
                    : tipo === 'LIDERES'
                    ? 'Líderes'
                    : 'Apoiadores'}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de Contatos com Scroll */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
            {filteredConversas.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <Users className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-60" />
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
                        ? 'bg-emerald-950/40 border-l-4 border-emerald-500'
                        : 'hover:bg-slate-900/60'
                    }`}
                  >
                    {/* Avatar com Iniciais */}
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-700 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow">
                      {c.nome ? c.nome.substring(0, 2).toUpperCase() : 'WA'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-xs font-bold text-white truncate">{c.nome}</h4>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {c.updated_at
                            ? new Date(c.updated_at).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 truncate mb-1.5">
                        {c.ultima_mensagem || 'Clique para abrir conversa'}
                      </p>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {c.cargo && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              c.cargo === 'ADMIN'
                                ? 'bg-purple-950/60 text-purple-400 border border-purple-800/40'
                                : c.cargo === 'LIDER'
                                ? 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                                : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                            }`}
                          >
                            {c.cargo}
                          </span>
                        )}

                        {c.bairro && (
                          <span className="text-[9px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                            {c.bairro}
                          </span>
                        )}

                        {(c.nao_lidas || 0) > 0 && (
                          <span className="ml-auto text-[10px] font-bold bg-emerald-500 text-slate-950 px-1.5 py-0.2 rounded-full">
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

        {/* ========================================================================= */}
        {/* COLUNA 2: ÁREA DE CHAT & MENSAGENS (5 Colunas) */}
        {/* ========================================================================= */}
        <div className="col-span-5 border-r border-slate-800 flex flex-col bg-slate-950/20">
          {selectedConversa ? (
            <>
              {/* Header do Chat Ativo */}
              <div className="p-3.5 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 text-xs">
                    {selectedConversa.nome.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">{selectedConversa.nome}</h3>
                    <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                      <span>{selectedConversa.whatsapp}</span>
                      {selectedConversa.bairro && <span>• {selectedConversa.bairro}</span>}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <a
                    href={`https://wa.me/${selectedConversa.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-xs text-emerald-400 bg-emerald-950/50 hover:bg-emerald-900/50 border border-emerald-800/40 rounded-lg transition-all flex items-center gap-1"
                    title="Abrir no WhatsApp Web Oficial"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Feed de Mensagens com Scroll */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
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
                          className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-md backdrop-blur-md ${
                            isOutgoing
                              ? 'bg-gradient-to-tr from-emerald-600 to-teal-600 text-white rounded-tr-none'
                              : 'bg-slate-800/90 text-slate-100 border border-slate-700/60 rounded-tl-none'
                          }`}
                        >
                          {/* Nome do Remetente */}
                          {!isOutgoing && msg.remetente_nome && (
                            <div className="text-[10px] font-bold text-emerald-400 mb-0.5">
                              {msg.remetente_nome}
                            </div>
                          )}

                          {/* Tipo Áudio */}
                          {msg.tipo === 'AUDIO' && (
                            <div className="flex items-center gap-2 py-1 text-emerald-300 font-semibold">
                              <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                              <span>[Mensagem de Áudio Transcrita]</span>
                            </div>
                          )}

                          {/* Conteúdo da Mensagem */}
                          <p className="whitespace-pre-wrap">{msg.conteudo}</p>

                          {/* Rodapé do Balão: Hora e Status de Envio */}
                          <div
                            className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${
                              isOutgoing ? 'text-emerald-200/80' : 'text-slate-400'
                            }`}
                          >
                            <span>
                              {new Date(msg.created_at).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {isOutgoing && (
                              <span>
                                {msg.status === 'ENVIADO' ? (
                                  <Check className="w-3 h-3" />
                                ) : (
                                  <CheckCheck className="w-3 h-3 text-cyan-300" />
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
              <div className="px-3 pt-2 pb-1 border-t border-slate-800 bg-slate-950/60 space-y-2">
                <div className="flex items-center justify-between gap-1.5 overflow-x-auto scrollbar-none text-[10px]">
                  {/* Botão Copilot Groq AI */}
                  <button
                    type="button"
                    onClick={handleGenerateAiResponse}
                    disabled={generatingAi}
                    className="px-2.5 py-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-lg shadow transition-all flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
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
                      className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg transition-all shrink-0 cursor-pointer"
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
                    className="flex-1 px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || sending}
                    className="p-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-950/50 transition-all flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
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
        {/* COLUNA 3: INTELIGÊNCIA DO ELEITOR / PERFIL POLÍTICO (3 Colunas) */}
        {/* ========================================================================= */}
        <div className="col-span-3 p-4 overflow-y-auto bg-slate-950/60 space-y-4">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Vote className="w-3.5 h-3.5 text-emerald-400" />
            Ficha Eleitoral
          </div>

          {selectedConversa ? (
            <div className="space-y-3">
              {/* Card de Identificação */}
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
                <div className="text-xs font-bold text-white">{selectedConversa.nome}</div>

                <div className="space-y-1.5 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="font-mono text-[11px] text-slate-300">{selectedConversa.whatsapp}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{selectedConversa.bairro || 'Bairro não informado'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Vote className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>Zona {selectedConversa.zona_eleitoral || '100'}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">Classificação:</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {selectedConversa.cargo || 'APOIADOR'}
                  </span>
                </div>
              </div>

              {/* Dicas de Atendimento */}
              <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-800/30 text-xs text-emerald-200/90 space-y-2">
                <div className="font-bold flex items-center gap-1 text-emerald-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  Estratégia de Conversão:
                </div>
                <p className="text-[11px] leading-relaxed text-slate-300">
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
  );
}
