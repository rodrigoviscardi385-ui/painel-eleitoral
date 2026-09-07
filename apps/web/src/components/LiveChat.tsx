import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Bot,
  UserCheck,
  Send,
  Phone,
  MapPin,
  Mic,
  Clock,
  ShieldAlert,
  Search,
  ArrowLeft,
  ChevronDown,
  Users,
} from 'lucide-react';
import { api } from '../api.ts';

interface LiveChatProps {
  conversas: any[];
  onRefreshConversas: () => void;
}

export const LiveChat: React.FC<LiveChatProps> = ({ conversas, onRefreshConversas }) => {
  const [selectedPhone, setSelectedPhone] = useState<string | null>(
    conversas.length > 0 ? conversas[0].whatsapp : null
  );
  const [conversaData, setConversaData] = useState<any | null>(null);
  const [inputText, setInputText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 960 : false);
  const [mobileActiveView, setMobileActiveView] = useState<'list' | 'chat'>('list');
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 960;
      setIsMobile(mobile);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (selectedPhone) {
      loadSelectedChat(selectedPhone);
    }
  }, [selectedPhone]);

  const loadSelectedChat = async (phone: string) => {
    try {
      const data = await api.getConversa(phone);
      setConversaData(data);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      console.error('Erro ao carregar conversa:', err);
    }
  };

  const handleMessagesScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    setShowScrollBottom(distanceFromBottom > 120);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedPhone || !inputText.trim() || isSending) return;

    try {
      setIsSending(true);
      const text = inputText.trim();
      setInputText('');

      await api.enviarMensagemChat(selectedPhone, text, 'Coordenador');
      await loadSelectedChat(selectedPhone);
      onRefreshConversas();
    } catch (err: any) {
      alert(`Falha ao enviar mensagem: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleMode = async () => {
    if (!selectedPhone || !conversaData) return;
    const newMode = conversaData.modo === 'HUMANO' ? 'BOT' : 'HUMANO';

    try {
      await api.alternarModoChat(selectedPhone, newMode);
      setConversaData((prev: any) => ({ ...prev, modo: newMode }));
      onRefreshConversas();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  const filteredConversas = conversas.filter((c) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.nome?.toLowerCase().includes(term) ||
      c.whatsapp?.includes(term) ||
      c.bairro?.toLowerCase().includes(term) ||
      c.ultima_mensagem?.toLowerCase().includes(term)
    );
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxHeight: '100%',
        minHeight: 0,
        overflow: 'hidden',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-card)',
      }}
      className="glass-panel"
    >
      {/* Barra de alternância rápida para Mobile/Tablet (< 960px) */}
      {isMobile && (
        <div
          style={{
            display: 'flex',
            padding: '8px 12px',
            background: 'var(--bg-surface-elevated)',
            borderBottom: '1px solid var(--border-color)',
            gap: '8px',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={() => setMobileActiveView('list')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              border: mobileActiveView === 'list' ? '1px solid var(--primary)' : '1px solid var(--border-color)',
              background: mobileActiveView === 'list' ? 'var(--primary-light)' : 'transparent',
              color: mobileActiveView === 'list' ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: mobileActiveView === 'list' ? 700 : 500,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Users size={15} />
            <span>Contatos ({filteredConversas.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileActiveView('chat')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              border: mobileActiveView === 'chat' ? '1px solid var(--primary)' : '1px solid var(--border-color)',
              background: mobileActiveView === 'chat' ? 'var(--primary-light)' : 'transparent',
              color: mobileActiveView === 'chat' ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: mobileActiveView === 'chat' ? 700 : 500,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <MessageSquare size={15} />
            <span>
              {conversaData?.usuario?.nome
                ? `Chat: ${conversaData.usuario.nome.split(' ')[0]}`
                : 'Conversa Ativa'}
            </span>
          </button>
        </div>
      )}

      {/* Grid Principal (Desktop: 340px 1fr | Mobile: 1fr controlado por aba ativa) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '340px 1fr',
          flex: 1,
          minHeight: 0,
          maxHeight: '100%',
          overflow: 'hidden',
        }}
      >
        {/* Coluna Esquerda: Lista de Conversas (Rolagem 100% Independente) */}
        <div
          style={{
            borderRight: isMobile ? 'none' : '1px solid var(--border-color)',
            display: !isMobile || mobileActiveView === 'list' ? 'flex' : 'none',
            flexDirection: 'column',
            height: '100%',
            maxHeight: '100%',
            minHeight: 0,
            background: 'var(--bg-card)',
            overflow: 'hidden',
          }}
        >
          {/* Header fixo da lista de contatos */}
          <div style={{ flexShrink: 0, padding: '14px 18px', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <MessageSquare size={17} color="var(--primary)" />
                <span>Conversas do WhatsApp</span>
              </h3>
              <span
                className="badge"
                style={{
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  fontSize: '11px',
                  padding: '2px 8px',
                  fontWeight: 600,
                }}
              >
                {conversas.length} contatos
              </span>
            </div>
          </div>

          {/* Busca rápida fixa */}
          <div style={{ flexShrink: 0, padding: '10px 14px', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ position: 'relative' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                placeholder="Buscar por nome, telefone ou bairro..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 12px 7px 32px',
                  borderRadius: '8px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Área rolável independente da lista de contatos com Scroll Visível */}
          <div
            className="chat-scroll-container"
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              overscrollBehavior: 'contain',
              padding: '8px',
            }}
          >
            {filteredConversas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)', fontSize: '13px' }}>
                {searchTerm ? 'Nenhum contato encontrado com este filtro.' : 'Nenhuma mensagem recebida ainda.'}
              </div>
            ) : (
              filteredConversas.map((c) => {
                const isSelected = selectedPhone === c.whatsapp;
                const isBot = c.modo === 'BOT';

                return (
                  <div
                    key={c.whatsapp}
                    onClick={() => {
                      setSelectedPhone(c.whatsapp);
                      if (isMobile) setMobileActiveView('chat');
                    }}
                    style={{
                      padding: '11px 13px',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: '6px',
                      cursor: 'pointer',
                      background: isSelected ? 'var(--bg-card-active)' : 'transparent',
                      border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                      boxShadow: isSelected ? '0 2px 8px var(--primary-light)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>
                        {c.nome}
                      </span>
                      <span
                        className="badge"
                        style={{
                          background: isBot ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                          color: isBot ? '#34d399' : '#60a5fa',
                          fontSize: '10px',
                          padding: '2px 6px',
                        }}
                      >
                        {isBot ? 'Bot IA' : 'Humano'}
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.ultima_mensagem || 'Sem mensagens'}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <span>{c.bairro || c.whatsapp}</span>
                      {c.opt_out && (
                        <span style={{ color: '#ef4444', fontWeight: 600 }}>Opt-out</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Coluna Direita: Janela da Conversa Ativa (Rolagem 100% Independente) */}
        {conversaData ? (
          <div
            style={{
              display: !isMobile || mobileActiveView === 'chat' ? 'flex' : 'none',
              flexDirection: 'column',
              height: '100%',
              maxHeight: '100%',
              minHeight: 0,
              overflow: 'hidden',
              background: 'var(--bg-input)',
              position: 'relative',
            }}
          >
            {/* Header do Contato Ativo */}
            <div
              style={{
                flexShrink: 0,
                padding: '12px 18px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--bg-card)',
                gap: '10px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                {isMobile && (
                  <button
                    type="button"
                    onClick={() => setMobileActiveView('list')}
                    className="btn btn-secondary"
                    style={{ padding: '6px 8px', height: '34px', flexShrink: 0 }}
                    title="Voltar para a lista de contatos"
                  >
                    <ArrowLeft size={16} />
                  </button>
                )}
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '14px',
                    flexShrink: 0,
                  }}
                >
                  {conversaData.usuario?.nome?.charAt(0) || 'E'}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {conversaData.usuario?.nome}
                    </span>
                    <span className="badge badge-blue" style={{ fontSize: '10px' }}>
                      {conversaData.usuario?.cargo || 'APOIADOR'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={11} />
                      {conversaData.usuario?.whatsapp}
                    </span>
                    {conversaData.usuario?.bairro && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={11} />
                        {conversaData.usuario?.bairro}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Toggle Modo: BOT vs HUMANO (Compacto no mobile) */}
              <button
                type="button"
                onClick={handleToggleMode}
                className={`btn ${conversaData.modo === 'HUMANO' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '12px', padding: '6px 12px', flexShrink: 0 }}
              >
                {conversaData.modo === 'HUMANO' ? (
                  <>
                    <UserCheck size={15} />
                    <span>{isMobile ? 'Devolver IA' : 'Atendimento Humano (Devolver para IA)'}</span>
                  </>
                ) : (
                  <>
                    <Bot size={15} />
                    <span>{isMobile ? 'Assumir' : 'Robô IA Ativo (Assumir Atendimento)'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Mensagens do Chat com Rolagem Fluida e Scrollbar Visível */}
            <div
              ref={messagesContainerRef}
              onScroll={handleMessagesScroll}
              className="chat-scroll-container"
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                overflowX: 'hidden',
                overscrollBehavior: 'contain',
                padding: isMobile ? '14px 10px' : '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {conversaData.usuario?.opt_out && (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    color: '#fca5a5',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <ShieldAlert size={16} />
                  <span>Este eleitor solicitou Opt-out LGPD (mensagens automáticas desativadas).</span>
                </div>
              )}

              {conversaData.mensagens?.map((msg: any) => {
                const isOut = msg.direcao === 'SAIDA';
                const isAudio = msg.tipo === 'AUDIO' || msg.conteudo?.startsWith('[Áudio Transcrito]');

                return (
                  <div
                    key={msg.id}
                    style={{
                      alignSelf: isOut ? 'flex-end' : 'flex-start',
                      maxWidth: isMobile ? '86%' : '75%',
                      background: isOut
                        ? 'linear-gradient(135deg, #059669, #10b981)'
                        : 'var(--bg-card-hover)',
                      color: isOut ? '#ffffff' : 'var(--text-primary)',
                      padding: '10px 14px',
                      borderRadius: isOut ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      border: isOut ? 'none' : '1px solid var(--border-color)',
                      boxShadow: '0 3px 10px rgba(0, 0, 0, 0.12)',
                    }}
                  >
                    {isAudio && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'rgba(0, 0, 0, 0.25)',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          marginBottom: '6px',
                          fontSize: '11px',
                          color: '#a7f3d0',
                          fontWeight: 600,
                        }}
                      >
                        <Mic size={13} />
                        <span>Transcrito por Groq Whisper</span>
                      </div>
                    )}

                    <div style={{ fontSize: '13px', lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {msg.conteudo}
                    </div>

                    <div
                      style={{
                        fontSize: '10px',
                        color: isOut ? 'rgba(255, 255, 255, 0.75)' : 'var(--text-muted)',
                        textAlign: 'right',
                        marginTop: '5px',
                      }}
                    >
                      {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Botão Flutuante: Rolar para o Fim (aparece quando o usuário rola para cima) */}
            {showScrollBottom && (
              <button
                type="button"
                onClick={scrollToBottom}
                style={{
                  position: 'absolute',
                  bottom: '68px',
                  right: '18px',
                  borderRadius: '20px',
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: 'var(--primary)',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
                  zIndex: 10,
                  transition: 'all 0.15s ease',
                }}
              >
                <ChevronDown size={14} />
                <span>Mais recentes</span>
              </button>
            )}

            {/* Campo de Envio de Mensagem (Fixo na Base, sem risco de ser cortado) */}
            <form
              onSubmit={handleSendMessage}
              style={{
                flexShrink: 0,
                padding: isMobile ? '10px 12px' : '12px 18px',
                borderTop: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
              }}
            >
              <input
                type="text"
                placeholder="Responder pelo WhatsApp oficial..."
                className="input-field"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isSending}
                style={{ flex: 1, minWidth: 0, fontSize: '13px', padding: '9px 12px' }}
              />
              <button
                type="submit"
                disabled={isSending || !inputText.trim()}
                className="btn btn-primary"
                style={{ padding: '9px 16px', flexShrink: 0, fontSize: '13px' }}
              >
                <Send size={15} />
                <span>{isSending ? '...' : (isMobile ? 'Enviar' : 'Enviar')}</span>
              </button>
            </form>
          </div>
        ) : (
          <div
            style={{
              display: !isMobile || mobileActiveView === 'chat' ? 'flex' : 'none',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--text-secondary)',
              gap: '12px',
              padding: '24px',
              textAlign: 'center',
            }}
          >
            <MessageSquare size={36} color="var(--primary)" style={{ opacity: 0.6 }} />
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Nenhuma conversa selecionada
              </div>
              <div style={{ fontSize: '13px' }}>
                {isMobile ? (
                  <button
                    type="button"
                    onClick={() => setMobileActiveView('list')}
                    className="btn btn-primary"
                    style={{ marginTop: '12px', fontSize: '12px' }}
                  >
                    Ver lista de contatos
                  </button>
                ) : (
                  'Selecione uma conversa à esquerda para visualizar as mensagens.'
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
