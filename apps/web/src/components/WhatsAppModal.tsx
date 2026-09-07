import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  QrCode,
  Smartphone,
  Flame,
  Bot,
  RefreshCw,
  LogOut,
  AlertTriangle,
  Send,
  ExternalLink,
} from 'lucide-react';
import { api } from '../api.ts';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  wppStatus: any;
  onRefresh: () => void;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  wppStatus,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'baileys' | 'meta'>('baileys');
  const [statusData, setStatusData] = useState<any>(wppStatus || null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Estados Meta Cloud API
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [wabaId, setWabaId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [displayPhone, setDisplayPhone] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadStatus();
      loadMetaConfig();
      // Polling a cada 3 segundos enquanto aberto para atualizar o QR Code ou conexão
      const timer = setInterval(() => {
        loadStatus();
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [isOpen]);

  const loadStatus = async () => {
    try {
      const data = await api.getWhatsAppStatus();
      setStatusData(data);
    } catch (err) {
      console.error('[Load Status Error]', err);
    }
  };

  const loadMetaConfig = async () => {
    try {
      const res = await api.getMetaConfig();
      if (res) {
        if (res.phone_number_id) setPhoneNumberId(res.phone_number_id);
        if (res.waba_id) setWabaId(res.waba_id);
        if (res.access_token) setAccessToken(res.access_token);
        if (res.display_phone_number) setDisplayPhone(res.display_phone_number);
      }
    } catch (e) {
      console.error('[Load Meta Config Error]', e);
    }
  };

  const handleStartConnect = async () => {
    try {
      setIsLoading(true);
      await api.connectWhatsApp();
      await loadStatus();
    } catch (e: any) {
      alert(`Erro ao iniciar pareamento: ${e?.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Deseja realmente desconectar este WhatsApp e limpar a sessão local?')) return;
    try {
      setIsLoading(true);
      await api.disconnectWhatsApp();
      await loadStatus();
      onRefresh();
    } catch (e: any) {
      alert(`Erro ao desconectar: ${e?.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyInboundLink = () => {
    const phone = statusData?.phoneConnected || '5513999999999';
    const text = encodeURIComponent('Olá Gustavo Reis, sou de Santos e quero conhecer suas propostas!');
    const link = `https://wa.me/${phone.replace(/\D/g, '')}?text=${text}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSaveMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumberId.trim() || !accessToken.trim()) {
      alert('Preencha o Phone Number ID e o Access Token da Meta.');
      return;
    }
    try {
      setIsLoading(true);
      await api.saveMetaConfig({
        phone_number_id: phoneNumberId.trim(),
        waba_id: wabaId.trim() || null,
        access_token: accessToken.trim(),
        display_phone_number: displayPhone.trim() || null,
        verify_token: 'painel_eleitoral_meta_webhook_2026',
      });
      alert('Configurações da Meta salvas com sucesso!');
      onRefresh();
    } catch (err: any) {
      alert(`Erro ao salvar: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestMeta = async () => {
    if (!testPhone.trim()) {
      alert('Digite o número para teste com DDD.');
      return;
    }
    try {
      setIsTesting(true);
      setTestStatus('Enviando via Meta Cloud API...');
      const res = await api.testMetaMessage({
        to: testPhone.trim().replace(/\D/g, ''),
        text: '🏛️ Painel Eleitoral 2026: Conexão Oficial Meta ativa! ✅',
      });
      setTestStatus(res.success ? '✅ Entregue com sucesso!' : `❌ Falha: ${res.error}`);
    } catch (err: any) {
      setTestStatus(`❌ Erro: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  if (!isOpen) return null;

  const isConnected = statusData?.status === 'CONNECTED';
  const isQrReady = statusData?.status === 'QR_READY' && statusData?.qrCodeBase64;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          padding: '0',
          maxWidth: '720px',
          maxHeight: '94vh',
          overflowY: 'auto',
          borderRadius: '24px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
        }}
      >
        {/* Cabeçalho */}
        <div
          style={{
            padding: '20px 24px',
            background: 'linear-gradient(135deg, rgba(16,185,129,0.18) 0%, rgba(6,78,59,0.35) 100%)',
            borderBottom: '1px solid rgba(16,185,129,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 14px rgba(16,185,129,0.4)',
              }}
            >
              <Smartphone size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Conectar WhatsApp do Candidato
              </h2>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Ativação Imediata de Chip Novo com <strong style={{ color: '#10b981' }}>Risco Zero de Ban</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              borderRadius: '10px',
              padding: '8px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Abas Superiores */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-color)',
            background: 'rgba(15,23,42,0.4)',
            padding: '0 24px',
          }}
        >
          <button
            onClick={() => setActiveTab('baileys')}
            style={{
              padding: '12px 18px',
              border: 'none',
              background: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              color: activeTab === 'baileys' ? '#10b981' : 'var(--text-muted)',
              borderBottom: activeTab === 'baileys' ? '2.5px solid #10b981' : '2.5px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <QrCode size={16} />
            <span>Conexão Direta QR Code (Chip Novo)</span>
            <span
              style={{
                fontSize: '10px',
                background: '#10b981',
                color: '#ffffff',
                padding: '2px 6px',
                borderRadius: '6px',
                fontWeight: 700,
              }}
            >
              0% BAN
            </span>
          </button>

          <button
            onClick={() => setActiveTab('meta')}
            style={{
              padding: '12px 18px',
              border: 'none',
              background: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              color: activeTab === 'meta' ? '#3b82f6' : 'var(--text-muted)',
              borderBottom: activeTab === 'meta' ? '2.5px solid #3b82f6' : '2.5px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>Meta Cloud API Oficial (Avançado)</span>
          </button>
        </div>

        {/* Conteúdo Aba 1: Baileys Anti-Ban */}
        {activeTab === 'baileys' && (
          <div style={{ padding: '24px' }}>
            {isConnected ? (
              /* CARD DE SUCESSO - CONECTADO */
              <div
                style={{
                  background: 'rgba(16,185,129,0.08)',
                  border: '1.5px solid #10b981',
                  borderRadius: '16px',
                  padding: '24px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    margin: '0 auto 16px',
                    boxShadow: '0 0 24px rgba(16,185,129,0.5)',
                  }}
                >
                  <CheckCircle2 size={34} />
                </div>

                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 6px', color: 'var(--text-primary)' }}>
                  WhatsApp Conectado e Operando!
                </h3>
                <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', margin: '0 0 16px' }}>
                  Número Ativo: <strong style={{ color: '#10b981', fontSize: '15px' }}>{statusData.phoneConnected}</strong>
                  {statusData.nameConnected && ` (${statusData.nameConnected})`}
                </p>

                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'rgba(16,185,129,0.15)',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: '#10b981',
                    fontWeight: 600,
                    marginBottom: '20px',
                  }}
                >
                  <ShieldCheck size={16} />
                  <span>Modo Fortaleza Anti-Ban Ativo (Inbound + Biomecânica Groq 24/7)</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleCopyInboundLink}
                    className="btn btn-primary"
                    style={{ gap: '8px', padding: '10px 18px', fontSize: '13px' }}
                  >
                    {copiedLink ? <Check size={16} /> : <Copy size={16} />}
                    <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link de Atendimento (wa.me)'}</span>
                  </button>

                  <button
                    onClick={handleDisconnect}
                    className="btn btn-danger"
                    disabled={isLoading}
                    style={{ gap: '6px', padding: '10px 18px', fontSize: '13px' }}
                  >
                    <LogOut size={16} />
                    <span>Desconectar / Trocar Chip</span>
                  </button>
                </div>
              </div>
            ) : (
              /* CARD DE QR CODE PARA PAREAMENTO */
              <div style={{ display: 'grid', gridTemplateColumns: isQrReady ? '1fr 1fr' : '1fr', gap: '24px', alignItems: 'center' }}>
                {isQrReady ? (
                  <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '18px', border: '1px solid var(--border-color)' }}>
                    <div style={{ marginBottom: '12px' }}>
                      <span style={{ fontSize: '11px', background: 'rgba(16,185,129,0.2)', color: '#10b981', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                        📲 ESCANEIE COM O WHATSAPP
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'inline-block',
                        padding: '12px',
                        background: '#ffffff',
                        borderRadius: '16px',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                      }}
                    >
                      <img
                        src={statusData.qrCodeBase64}
                        alt="QR Code WhatsApp"
                        style={{ width: '220px', height: '220px', display: 'block' }}
                      />
                    </div>

                    <div style={{ marginTop: '14px' }}>
                      <button
                        onClick={handleStartConnect}
                        disabled={isLoading}
                        className="btn btn-secondary btn-sm"
                        style={{ gap: '6px', fontSize: '12px' }}
                      >
                        <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
                        <span>Atualizar QR Code</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '30px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '18px', border: '1px dashed var(--border-color)' }}>
                    <QrCode size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
                    <h4 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 6px', color: 'var(--text-primary)' }}>
                      Nenhuma Sessão Ativa
                    </h4>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '0 0 16px', maxWidth: '380px', marginInline: 'auto' }}>
                      Clique no botão abaixo para gerar o QR Code de pareamento do seu chip novo emulando Chrome Desktop.
                    </p>
                    <button
                      onClick={handleStartConnect}
                      disabled={isLoading}
                      className="btn btn-primary"
                      style={{ gap: '8px', padding: '10px 20px' }}
                    >
                      <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
                      <span>{isLoading ? 'Gerando QR Code...' : 'Gerar QR Code Agora'}</span>
                    </button>
                  </div>
                )}

                {/* Bloco de Instruções Anti-Ban */}
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 12px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={18} color="#10b981" />
                    <span>Passo a Passo Oficial para Zero Risco de Ban</span>
                  </h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px', color: 'var(--text-primary)' }}>
                    <div style={{ display: 'flex', gap: '10px', background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '10px' }}>
                      <span style={{ fontWeight: 800, color: '#10b981', fontSize: '13px' }}>1.</span>
                      <div>
                        <strong>Conecte o Aparelho:</strong> No celular do chip novo, abra o WhatsApp ➔ Configurações / 3 pontinhos ➔ <em>Aparelhos Conectados</em> ➔ <em>Conectar um aparelho</em> e aponte para o QR Code.
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '10px' }}>
                      <span style={{ fontWeight: 800, color: '#f59e0b', fontSize: '13px' }}>2.</span>
                      <div>
                        <strong>Aquecimento P2P (Primeiras 2h):</strong> Peça para 10 a 20 membros da equipe mandarem mensagem para este número para construir reputação imediata perante a Meta.
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '10px' }}>
                      <span style={{ fontWeight: 800, color: '#3b82f6', fontSize: '13px' }}>3.</span>
                      <div>
                        <strong>Inversão de Vetor (100% Inbound):</strong> Divulgue o link <code>wa.me</code> nos santinhos e Instagram. Quando o eleitor chama primeiro, a Meta autoriza o chat e o risco de denúncia é <strong>zero</strong>.
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '10px' }}>
                      <span style={{ fontWeight: 800, color: '#8b5cf6', fontSize: '13px' }}>4.</span>
                      <div>
                        <strong>Atendimento com IA:</strong> A IA Groq responde automaticamente simulando digitação humana ('digitando...') e cadastra o eleitor no banco.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Conteúdo Aba 2: Meta Cloud API (Avançado) */}
        {activeTab === 'meta' && (
          <div style={{ padding: '24px' }}>
            <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '12px', padding: '12px 16px', marginBottom: '18px', fontSize: '12px', color: 'var(--text-primary)' }}>
              <strong>Nota Técnica:</strong> Use esta aba apenas se você já possui uma conta Business verificada no Facebook Developers com CNPJ aprovado e token permanente gerado.
            </div>

            <form onSubmit={handleSaveMeta} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                  Phone Number ID
                </label>
                <input
                  type="text"
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  placeholder="Ex: 104829102938472"
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                  Permanent Access Token (Bearer)
                </label>
                <input
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="EAA..."
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                  WABA ID (WhatsApp Business Account ID)
                </label>
                <input
                  type="text"
                  value={wabaId}
                  onChange={(e) => setWabaId(e.target.value)}
                  placeholder="Ex: 928374829102"
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="submit" disabled={isLoading} className="btn btn-primary">
                  <span>Salvar Credenciais Meta</span>
                </button>
              </div>
            </form>

            <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '20px', paddingTop: '16px' }}>
              <h5 style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 10px', color: 'var(--text-primary)' }}>
                Testar Envio Meta Cloud API
              </h5>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="DDD + Número (Ex: 13999998888)"
                  className="input"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={handleTestMeta}
                  disabled={isTesting}
                  className="btn btn-secondary"
                  style={{ gap: '6px' }}
                >
                  <Send size={14} />
                  <span>Enviar Teste</span>
                </button>
              </div>
              {testStatus && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: testStatus.includes('✅') ? '#10b981' : '#ef4444' }}>
                  {testStatus}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
