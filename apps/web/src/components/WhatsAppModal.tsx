import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Send,
  ExternalLink,
  Globe,
  KeyRound,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { api } from '../api.ts';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  wppStatus: any;
  onRefresh: () => void;
}

type Step = 1 | 2 | 3;

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({ isOpen, onClose, onRefresh }) => {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [wabaId, setWabaId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [verifyToken] = useState('painel_eleitoral_meta_webhook_2026');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [displayPhone, setDisplayPhone] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadMetaConfig();
    }
  }, [isOpen]);

  const loadMetaConfig = async () => {
    try {
      setIsLoading(true);
      const res = await api.getMetaConfig();
      if (res) {
        if (res.phone_number_id) { setPhoneNumberId(res.phone_number_id); setCurrentStep(2); }
        if (res.waba_id) setWabaId(res.waba_id);
        if (res.access_token) setAccessToken(res.access_token);
        if (res.webhook_url) setWebhookUrl(res.webhook_url);
        if (res.display_phone_number) setDisplayPhone(res.display_phone_number);
        const configured = Boolean(res.phone_number_id && res.access_token);
        setIsConfigured(configured);
        if (configured) setCurrentStep(3);
      }
      if (!webhookUrl) {
        setWebhookUrl(`${window.location.protocol}//${window.location.hostname}/api/whatsapp/meta-webhook`);
      }
    } catch (e) {
      console.error('[Load Meta Config Error]', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumberId.trim() || !accessToken.trim()) {
      alert('Por favor, preencha o Phone Number ID e o Access Token da Meta.');
      return;
    }
    try {
      setIsLoading(true);
      await api.saveMetaConfig({
        phone_number_id: phoneNumberId.trim(),
        waba_id: wabaId.trim() || null,
        access_token: accessToken.trim(),
        display_phone_number: displayPhone.trim() || null,
        verify_token: verifyToken,
      });
      setIsConfigured(true);
      setSaveSuccess(true);
      setCurrentStep(3);
      setTimeout(() => setSaveSuccess(false), 4000);
      onRefresh();
    } catch (err: any) {
      alert(`Erro ao salvar: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestSend = async () => {
    if (!testPhone.trim()) { alert('Digite seu número de WhatsApp com DDD.'); return; }
    try {
      setIsTesting(true);
      setTestStatus('Enviando via Meta Cloud API...');
      const res = await api.testMetaMessage({
        to: testPhone.trim().replace(/\D/g, ''),
        text: '🏛️ *Painel Eleitoral 2026*\n\nConexão Oficial da WhatsApp Cloud API ativa! ✅\nSeu sistema está configurado e pronto para mobilização eleitoral com *zero risco de banimento*! 🚀',
      });
      setTestStatus(res.success ? '✅ Mensagem entregue com sucesso!' : `❌ Falha: ${res.error}`);
    } catch (err: any) {
      setTestStatus(`❌ Erro: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const copy = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  const steps = [
    { id: 1, label: 'Webhook', icon: '🌐' },
    { id: 2, label: 'Credenciais', icon: '🔑' },
    { id: 3, label: 'Testar', icon: '🚀' },
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: '0', maxWidth: '660px', maxHeight: '92vh', overflowY: 'auto', borderRadius: '20px' }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px 16px',
            background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(6,78,59,0.3) 100%)',
            borderBottom: '1px solid rgba(16,185,129,0.2)',
            borderRadius: '20px 20px 0 0',
            position: 'sticky',
            top: 0,
            zIndex: 10,
            backdropFilter: 'blur(12px)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.3)' }}>
                <ShieldCheck size={22} color="#10b981" />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', color: '#ffffff', margin: 0, fontWeight: 700 }}>
                  WhatsApp Cloud API Oficial
                </h3>
                <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 600, marginTop: '2px' }}>
                  🛡️ Conexão Corporativa • Zero Risco de Banimento
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', cursor: 'pointer', borderRadius: '8px', padding: '6px' }}>
              <X size={18} />
            </button>
          </div>

          {/* Steps indicator */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {steps.map((step) => (
              <button
                key={step.id}
                onClick={() => setCurrentStep(step.id as Step)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '7px 10px',
                  borderRadius: '8px',
                  border: currentStep === step.id ? '1px solid rgba(16,185,129,0.5)' : '1px solid transparent',
                  background: currentStep === step.id ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)',
                  color: currentStep === step.id ? '#10b981' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: currentStep === step.id ? 700 : 400,
                  transition: 'all 0.2s',
                }}
              >
                <span>{step.icon}</span>
                <span>{step.label}</span>
                {step.id < currentStep && <Check size={12} color="#10b981" />}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '20px 24px 24px' }}>
          {/* Status badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: '10px',
              marginBottom: '20px',
              background: isConfigured ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
              border: `1px solid ${isConfigured ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={`status-pulse ${isConfigured ? 'online' : 'offline'}`} />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
                {isConfigured ? '✅ CONECTADO VIA META CLOUD API' : '⚠️ AGUARDANDO CREDENCIAIS DA META'}
              </span>
            </div>
            {displayPhone && (
              <span style={{ fontSize: '13px', color: '#10b981', fontWeight: 700 }}>{displayPhone}</span>
            )}
          </div>

          {/* Step 1: Webhook Info */}
          {currentStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#38bdf8', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Globe size={15} /> Como configurar o Webhook no Meta Developers:
                </div>
                <ol style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, paddingLeft: '16px', lineHeight: '2' }}>
                  <li>Acesse <strong style={{ color: '#fff' }}>developers.facebook.com</strong></li>
                  <li>Selecione seu App → <strong style={{ color: '#fff' }}>WhatsApp</strong> → <strong style={{ color: '#fff' }}>Configuração</strong></li>
                  <li>Em <strong style={{ color: '#fff' }}>Webhooks</strong>, cole a URL abaixo</li>
                  <li>Cole o Token de Verificação</li>
                  <li>Clique em <strong style={{ color: '#fff' }}>Verificar e Salvar</strong></li>
                  <li>Assine o evento: <strong style={{ color: '#10b981' }}>messages</strong></li>
                </ol>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>URL do Webhook (Callback URL):</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input type="text" readOnly value={webhookUrl} className="input-field" style={{ fontSize: '12px', fontFamily: 'monospace' }} />
                  <button type="button" onClick={() => copy(webhookUrl, setCopiedWebhook)} className="btn btn-secondary" style={{ padding: '0 12px', minWidth: '40px' }}>
                    {copiedWebhook ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Token de Verificação:</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input type="text" readOnly value={verifyToken} className="input-field" style={{ fontSize: '12px', fontFamily: 'monospace' }} />
                  <button type="button" onClick={() => copy(verifyToken, setCopiedToken)} className="btn btn-secondary" style={{ padding: '0 12px', minWidth: '40px' }}>
                    {copiedToken ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <button className="btn btn-primary" onClick={() => setCurrentStep(2)} style={{ padding: '10px', marginTop: '4px', fontWeight: 700 }}>
                Webhook Configurado → Ir para Credenciais
              </button>

              <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', color: '#38bdf8', textDecoration: 'none' }}>
                <ExternalLink size={13} /> Abrir Meta for Developers
              </a>
            </div>
          )}

          {/* Step 2: Credentials */}
          {currentStep === 2 && (
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <KeyRound size={15} color="#10b981" /> Credenciais do App Meta:
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Phone Number ID *</label>
                <input type="text" className="input-field" placeholder="Ex: 569834729103482" value={phoneNumberId} onChange={(e) => setPhoneNumberId(e.target.value)} required />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Meta for Developers → seu App → WhatsApp → API Setup → Phone Number ID</span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Token de Acesso Permanente (Bearer Token) *</label>
                <input type="password" className="input-field" placeholder="EAAGm0PX4ZCS4BO..." value={accessToken} onChange={(e) => setAccessToken(e.target.value)} required />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Gerado em <strong>Usuários do Sistema</strong> (Business Suite) com permissão <code>whatsapp_business_messaging</code></span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>WABA ID (opcional)</label>
                  <input type="text" className="input-field" placeholder="104928374..." value={wabaId} onChange={(e) => setWabaId(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Número de Exibição</label>
                  <input type="text" className="input-field" placeholder="+55 13 99999-8888" value={displayPhone} onChange={(e) => setDisplayPhone(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={() => setCurrentStep(1)} className="btn btn-secondary" style={{ padding: '10px 16px', fontSize: '13px' }}>
                  ← Voltar
                </button>
                <button type="submit" disabled={isLoading} className="btn btn-primary" style={{ flex: 1, padding: '10px', fontSize: '13px' }}>
                  {isLoading ? 'Salvando...' : '✅ Salvar e Ativar Conexão Oficial'}
                </button>
              </div>

              {saveSuccess && (
                <div style={{ padding: '10px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', color: '#10b981', fontSize: '13px', textAlign: 'center' }}>
                  ✅ Credenciais salvas! Meta Cloud API ativa.
                </div>
              )}
            </form>
          )}

          {/* Step 3: Test */}
          {currentStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Zap size={15} color="#10b981" /> Confirme sua conexão — envie uma mensagem de teste:
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="tel"
                    className="input-field"
                    placeholder="5513999998888 (DDD + número sem +55)"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={handleTestSend}
                    disabled={isTesting || !testPhone.trim()}
                    className="btn btn-primary"
                    style={{ padding: '8px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Send size={14} />
                    {isTesting ? '...' : 'Testar'}
                  </button>
                </div>

                {testStatus && (
                  <div style={{ fontSize: '12px', color: testStatus.startsWith('✅') ? '#10b981' : '#ef4444', marginTop: '10px', background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: '8px' }}>
                    {testStatus}
                  </div>
                )}
              </div>

              <div style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '10px', padding: '14px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>✅ Configuração Ativa:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <div>📱 <strong style={{ color: '#fff' }}>Número:</strong> {displayPhone || phoneNumberId}</div>
                  <div>🔑 <strong style={{ color: '#fff' }}>Token:</strong> {accessToken}</div>
                  <div>🌐 <strong style={{ color: '#fff' }}>Webhook:</strong> {webhookUrl}</div>
                  <div>🔒 <strong style={{ color: '#fff' }}>HMAC:</strong> Assinatura verificada a cada mensagem</div>
                </div>
              </div>

              <button onClick={() => setCurrentStep(2)} className="btn btn-secondary" style={{ padding: '8px', fontSize: '12px' }}>
                ← Alterar Credenciais
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
