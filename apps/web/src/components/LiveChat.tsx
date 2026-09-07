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
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [mobileActiveView, setMobileActiveView] = useState<'list' | 'chat'>('list');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
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
      className="glass-panel"
      style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '360px 1fr',
        height: '100%',
        maxHeight: 'calc(100vh - 110px)',
        minHeight: '560px',
        overflow: 'hidden',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
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
          background: 'rgba(11, 15, 23, 0.55)',
          overflow: 'hidden',
        }}
      >
        {/* Header fixo da lista */}
        <div style={{ flexShrink: 0, padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '15px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={18} color="var(--primary)" />
              <span>Conversas ao Vivo</span>
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
        <div style={{ flexShrink: 0, padding: '10px 16px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={15}
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
              }}
            />
          </div>
        </div>

        {/* Área rolável independente da lista de contatos */}
        <div
          className="chat-scroll-container"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            padding: '8px',
          }}
        >
          {filteredConversas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)', fontSize: '13px' }}>
              {searchTerm ? 'Nenhum contato encontrado na busca.' : 'Nenhuma mensagem recebida ainda.'}
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
                    padding: '12px 14px',
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
            background: 'rgba(11, 15, 23, 0.3)',
          }}
        >
          {/* Header do Contato */}
          <div
            style={{
              flexShrink: 0,
              padding: '14px 20px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(15, 23, 42, 0.65)',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {isMobile && (
                <button
                  type="button"
                  onClick={() => setMobileActiveView('list')}
                  className="btn btn-secondary"
                  style={{ padding: '6px 8px', height: '34px' }}
                  title="Voltar para a lista de contatos"
                >
                  <ArrowLeft size={16} />
                </button>
              )}
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '15px',
                  flexShrink: 0,
                }}
              >
                {conversaData.usuario?.nome?.charAt(0) || 'E'}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '15px' }}>
                    {conversaData.usuario?.nome}
                  </span>
                  <span className="badge badge-blue" style={{ fontSize: '11px' }}>
                    {conversaData.usuario?.cargo || 'APOIADOR'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Phone size={12} />
                    {conversaData.usuario?.whatsapp}
                  </span>
                  {conversaData.usuario?.bairro && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={12} />
                      {conversaData.usuario?.bairro}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Toggle Modo: BOT vs HUMANO */}
            <button
              onClick={handleToggleMode}
              className={`btn ${conversaData.modo === 'HUMANO' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '12px', padding: '8px 14px' }}
            >
              {conversaData.modo === 'HUMANO' ? (
                <>
                  <UserCheck size={16} />
                  <span>Atendimento Humano Ativo (Devolver para IA)</span>
                </>
              ) : (
                <>
                  <Bot size={16} />
                  <span>Modo Robô IA Ativo (Assumir Atendimento)</span>
                </>
              )}
            </button>
          </div>

          {/* Mensagens do Chat (Rolagem 100% Independente) */}
          <div
            className="chat-scroll-container"
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              padding: '20px',
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
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-md)',
                  color: '#fca5a5',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <ShieldAlert size={18} />
                <span>Este eleitor solicitou Opt-out LGPD (parou de receber mensagens automáticas).</span>
              </div>
            )}

            {conversaData.mensagens?.map((msg: any) => {
              const isOut = msg.direcao === 'SAIDA';
              const isAudio = msg.tipo === 'AUDIO' || msg.conteudo.startsWith('[Áudio Transcrito]');

              return (
                <div
                  key={msg.id}
                  style={{
                    alignSelf: isOut ? 'flex-end' : 'flex-start',
                    maxWidth: '75%',
                    background: isOut
                      ? 'linear-gradient(135deg, #059669, #10b981)'
                      : 'var(--bg-card-hover)',
                    color: isOut ? '#ffffff' : 'var(--text-primary)',
                    padding: '12px 16px',
                    borderRadius: isOut ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    border: isOut ? 'none' : '1px solid var(--border-color)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
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
                      <Mic size={14} />
                      <span>Transcrito por Groq Whisper-Large-v3</span>
                    </div>
                  )}

                  <div style={{ fontSize: '14px', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                    {msg.conteudo}
                  </div>

                  <div
                    style={{
                      fontSize: '10px',
                      color: isOut ? 'rgba(255, 255, 255, 0.75)' : 'var(--text-muted)',
                      textAlign: 'right',
                      marginTop: '6px',
                    }}
                  >
                    {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Campo de Envio de Mensagem (Fixo na Base) */}
          <form
            onSubmit={handleSendMessage}
            style={{
              flexShrink: 0,
              padding: '14px 20px',
              borderTop: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
            }}
          >
            <input
              type="text"
              placeholder="Digite uma mensagem para responder pelo WhatsApp oficial..."
              className="input-field"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isSending}
              style={{ flex: 1 }}
            />
            <button
              type="submit"
              disabled={isSending || !inputText.trim()}
              className="btn btn-primary"
              style={{ padding: '10px 20px' }}
            >
              <Send size={16} />
              <span>{isSending ? 'Enviando...' : 'Enviar'}</span>
            </button>
          </form>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
          Selecione uma conversa à esquerda para visualizar e interagir.
        </div>
      )}
    </div>
  );
};
