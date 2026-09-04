'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Smartphone, 
  QrCode, 
  CheckCircle2, 
  RefreshCw, 
  LogOut, 
  Send, 
  Sparkles,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

interface ModalConectarWhatsAppProps {
  isOpen: boolean;
  onClose: () => void;
  apiBaseUrl?: string;
}

export const ModalConectarWhatsApp: React.FC<ModalConectarWhatsAppProps> = ({
  isOpen,
  onClose,
  apiBaseUrl = '',
}) => {
  const effectiveBaseUrl = !apiBaseUrl || apiBaseUrl.includes('localhost') ? '' : apiBaseUrl;
  const [status, setStatus] = useState<'CONNECTED' | 'DISCONNECTED' | 'QRCODE' | 'CONNECTING'>('CONNECTING');
  const [qrcodeBase64, setQrcodeBase64] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'qrcode' | 'simulador'>('qrcode');

  // Estado do Simulador
  const [simPhone, setSimPhone] = useState('5511999998888');
  const [simMessage, setSimMessage] = useState('Olá comitê, quero me cadastrar como líder');
  const [simResponse, setSimResponse] = useState<any | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Buscar status ao abrir
  const checkStatus = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${effectiveBaseUrl}/api/whatsapp/status`);
      if (res.ok) {
        const data = await res.json();
        if (data.connected) {
          setStatus('CONNECTED');
          setQrcodeBase64(null);
        } else if (data.qrcode) {
          setStatus('QRCODE');
          setQrcodeBase64(data.qrcode);
        } else {
          setStatus(data.status || 'DISCONNECTED');
        }
      } else {
        setStatus('DISCONNECTED');
      }
    } catch (err) {
      console.warn('Erro ao consultar status:', err);
      setStatus('DISCONNECTED');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${effectiveBaseUrl}/api/whatsapp/connect`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.connected) {
          setStatus('CONNECTED');
          setQrcodeBase64(null);
        } else if (data.qrcode) {
          setStatus('QRCODE');
          setQrcodeBase64(data.qrcode);
        } else {
          setStatus(data.status || 'QRCODE');
        }
      }
    } catch (err) {
      console.warn('Erro ao conectar WhatsApp:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await fetch(`${effectiveBaseUrl}/api/whatsapp/logout`, { method: 'POST' });
      setStatus('DISCONNECTED');
      setQrcodeBase64(null);
    } catch (err) {
      console.warn('Erro ao desconectar:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulate = async () => {
    if (!simMessage.trim()) return;
    setIsSimulating(true);
    setSimResponse(null);

    try {
      const res = await fetch(`${effectiveBaseUrl}/api/whatsapp/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsapp: simPhone,
          mensagem: simMessage,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSimResponse(data);
      }
    } catch (err) {
      setSimResponse({ erro: 'Falha na simulação de webhook' });
    } finally {
      setIsSimulating(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    checkStatus();

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${effectiveBaseUrl}/api/whatsapp/status`);
        if (res.ok) {
          const data = await res.json();
          if (data.connected) {
            setStatus('CONNECTED');
            setQrcodeBase64(null);
          } else if (data.qrcode) {
            setStatus('QRCODE');
            setQrcodeBase64(data.qrcode);
          } else {
            setStatus(data.status || 'DISCONNECTED');
          }
        }
      } catch (err) {
        // Silencioso no polling
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [isOpen, effectiveBaseUrl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl glass-dropdown rounded-2xl p-6 border border-slate-700 shadow-2xl space-y-5">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Conectar WhatsApp do Comitê
                {status === 'CONNECTED' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Online
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">Gerenciamento de Instância WhatsApp & Simulador de Mensagens</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas do Modal */}
        <div className="flex items-center gap-2 p-1 bg-slate-900 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('qrcode')}
            className={`flex-1 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
              activeTab === 'qrcode' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Conexão & QR Code
          </button>
          <button
            onClick={() => setActiveTab('simulador')}
            className={`flex-1 py-1.5 rounded-md font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'simulador' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            Simulador de Chat
          </button>
        </div>

        {/* Conteúdo: Conexão & QR Code */}
        {activeTab === 'qrcode' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col items-center justify-center text-center space-y-3">
              {status === 'CONNECTED' ? (
                <div className="space-y-2 py-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Instância WhatsApp Conectada e Operacional</h4>
                  <p className="text-xs text-slate-400 max-w-sm">
                    O robô de inteligência artificial está pronto para receber mensagens de texto e áudios, criar grupos de base e executar disparos.
                  </p>
                </div>
              ) : qrcodeBase64 ? (
                <div className="space-y-4 py-2 flex flex-col items-center">
                  <div className="p-3 bg-white rounded-2xl shadow-xl shadow-cyan-500/10 border-4 border-cyan-500/20 inline-block">
                    <img
                      src={qrcodeBase64.startsWith('data:') ? qrcodeBase64 : `data:image/png;base64,${qrcodeBase64}`}
                      alt="QR Code WhatsApp"
                      className="w-52 h-52 object-contain"
                    />
                  </div>
                  <div className="space-y-1 max-w-sm">
                    <p className="text-xs text-cyan-300 font-semibold">
                      Aponte a câmera do WhatsApp (Aparelhos Conectados &gt; Conectar um aparelho)
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Você também pode confirmar o pareamento ou testar as mensagens na aba Simulador.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <button
                      onClick={() => {
                        setStatus('CONNECTED');
                        setQrcodeBase64(null);
                      }}
                      className="px-3.5 py-1.5 text-xs font-bold text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 rounded-lg transition-all cursor-pointer"
                    >
                      ✓ Simular Pareamento Concluído
                    </button>
                    <button
                      onClick={() => setActiveTab('simulador')}
                      className="px-3.5 py-1.5 text-xs font-bold text-cyan-300 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 rounded-lg transition-all cursor-pointer"
                    >
                      ✨ Abrir Simulador de Chat
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 py-6">
                  <QrCode className="w-12 h-12 text-slate-500 mx-auto" />
                  <h4 className="text-xs font-bold text-slate-300">WhatsApp Desconectado</h4>
                  <p className="text-[11px] text-slate-500 max-w-xs">
                    Clique no botão verde abaixo para gerar o QR Code de autenticação.
                  </p>
                </div>
              )}
            </div>

            {/* Ações de Conexão */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={checkStatus}
                disabled={isLoading}
                className="px-3.5 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar Status
              </button>

              <div className="flex items-center gap-2">
                {status === 'CONNECTED' ? (
                  <button
                    onClick={handleLogout}
                    disabled={isLoading}
                    className="px-4 py-2 text-xs font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Desconectar
                  </button>
                ) : (
                  <button
                    onClick={handleConnect}
                    disabled={isLoading}
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <QrCode className="w-4 h-4" />
                    {isLoading ? 'Gerando QR Code...' : 'Gerar QR Code'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Conteúdo: Simulador de Mensagens */}
        {activeTab === 'simulador' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300 flex items-start gap-2">
              <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5 text-cyan-400" />
              <span>
                Use o simulador para testar a <strong>Máquina de Estados</strong> (Onboarding em 2 passos, escuta ativa e Groq AI) instantaneamente direto do navegador!
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">Telefone WhatsApp do Usuário</label>
                <input
                  type="text"
                  value={simPhone}
                  onChange={(e) => setSimPhone(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">Mensagem a Enviar para o Bot</label>
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setSimMessage('Olá comitê, quero me cadastrar como líder')}
                    className="px-2 py-0.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
                  >
                    + Novo Onboarding
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimMessage('Cadastra aí o Marcos Souza, zap 11 99999-8888, mora no Centro, zona 120 seção 45')}
                    className="px-2 py-0.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
                  >
                    + Enviar Apoiador
                  </button>
                </div>

                <textarea
                  rows={3}
                  value={simMessage}
                  onChange={(e) => setSimMessage(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button
                type="button"
                onClick={handleSimulate}
                disabled={isSimulating}
                className="w-full py-2 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold text-xs rounded-lg shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSimulating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Disparar Mensagem de Teste
              </button>

              {simResponse && (
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-emerald-400 max-h-32 overflow-y-auto">
                  <pre>{JSON.stringify(simResponse, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
