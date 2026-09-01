'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  QrCode,
  Download,
  Printer,
  Copy,
  Check,
  Smartphone,
  ExternalLink,
  Users,
  Sparkles,
} from 'lucide-react';

interface ModalQRCodeComiteProps {
  isOpen: boolean;
  onClose: () => void;
  apiBaseUrl: string;
}

export function ModalQRCodeComite({ isOpen, onClose, apiBaseUrl }: ModalQRCodeComiteProps) {
  const [whatsappNumber, setWhatsappNumber] = useState('5511999998888');
  const [tipoConvite, setTipoConvite] = useState<'lider' | 'apoiador' | 'voluntario'>('lider');
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Mensagens pré-configuradas para o Onboarding
  const mensagens = {
    lider: '🗳️ Olá Comitê Eleitoral 2026! Gostaria de me credenciar como Líder Comunitário.',
    apoiador: '🤝 Olá! Quero apoiar a Campanha 2026 e acompanhar as propostas.',
    voluntario: '⭐ Olá! Quero me cadastrar como Voluntário de Campanha no meu bairro.',
  };

  const selectedMessage = mensagens[tipoConvite];
  const cleanPhone = whatsappNumber.replace(/\D/g, '');
  const encodedText = encodeURIComponent(selectedMessage);
  const fullWhatsAppLink = `https://wa.me/${cleanPhone}?text=${encodedText}`;

  // Buscar número do WhatsApp conectado na API
  useEffect(() => {
    if (!isOpen) return;
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/whatsapp/status`);
        if (res.ok) {
          const data = await res.json();
          if (data.phone) {
            setWhatsappNumber(data.phone);
          }
        }
      } catch (e) {
        // Ignora
      }
    };
    fetchStatus();
  }, [isOpen, apiBaseUrl]);

  // Gerar QR Code via Google Charts API / QuickChart SVG para alta resolução
  useEffect(() => {
    if (!fullWhatsAppLink) return;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(
      fullWhatsAppLink
    )}&margin=10&color=0F172A&bgcolor=FFFFFF`;
    setQrDataUrl(qrUrl);
  }, [fullWhatsAppLink]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullWhatsAppLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cartaz de Credenciamento - Campanha 2026</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 40px;
              box-sizing: border-box;
              text-align: center;
              background: #fff;
              color: #0f172a;
            }
            .card {
              border: 3px solid #0284c7;
              border-radius: 24px;
              padding: 48px;
              max-width: 500px;
              box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
            }
            h1 { font-size: 28px; margin: 0 0 12px 0; color: #0284c7; }
            h2 { font-size: 18px; margin: 0 0 24px 0; color: #475569; font-weight: 500; }
            img { width: 280px; height: 280px; border-radius: 12px; margin: 16px 0; }
            .instructions { font-size: 15px; line-height: 1.5; color: #334155; margin-top: 20px; }
            .badge { display: inline-block; background: #e0f2fe; color: #0369a1; padding: 6px 16px; border-radius: 9999px; font-weight: bold; font-size: 13px; margin-bottom: 16px; }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge">COMITÊ ELEITORAL OFICIAL 2026</span>
            <h1>CREDENCIAMENTO DE LIDERANÇAS</h1>
            <h2>Aponte a câmera do seu celular para iniciar pelo WhatsApp</h2>
            <img src="${qrDataUrl}" alt="QR Code Onboarding" />
            <div class="instructions">
              <strong>1.</strong> Abra a câmera do seu celular ou o WhatsApp.<br/>
              <strong>2.</strong> Aponte para este QR Code.<br/>
              <strong>3.</strong> Envie a mensagem automática para cadastrar sua base territorial.
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadImage = async () => {
    if (!qrDataUrl) return;
    try {
      const response = await fetch(qrDataUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `QRCode_Comite_Eleitoral_2026_${tipoConvite}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      window.open(qrDataUrl, '_blank');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl glass-dropdown rounded-2xl p-6 border border-slate-700 shadow-2xl space-y-5">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                QR Code de Credenciamento do Comitê
              </h3>
              <p className="text-xs text-slate-400">
                Gere cartazes, totens e links para novos líderes e apoiadores se cadastrarem pelo WhatsApp
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Seleção do Tipo de Credenciamento */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300">Tipo de Credenciamento:</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setTipoConvite('lider')}
              className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                tipoConvite === 'lider'
                  ? 'bg-cyan-600/20 text-cyan-300 border-cyan-500/50 shadow-md shadow-cyan-600/10'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              <Users className="w-4 h-4" />
              Líder de Bairro
            </button>

            <button
              onClick={() => setTipoConvite('apoiador')}
              className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                tipoConvite === 'apoiador'
                  ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/50 shadow-md shadow-emerald-600/10'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              Apoiador Geral
            </button>

            <button
              onClick={() => setTipoConvite('voluntario')}
              className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                tipoConvite === 'voluntario'
                  ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50 shadow-md shadow-indigo-600/10'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Voluntário
            </button>
          </div>
        </div>

        {/* Configuração do Número WhatsApp do Comitê */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-300">Número do WhatsApp que Receberá as Mensagens:</label>
          <input
            type="text"
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            placeholder="Ex: 5511999998888"
            className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Visualização do QR Code em Alta Resolução */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col items-center justify-center text-center space-y-3">
          {qrDataUrl ? (
            <div className="p-3 bg-white rounded-2xl shadow-xl inline-block">
              <img src={qrDataUrl} alt="QR Code do Comitê" className="w-48 h-48 object-contain" />
            </div>
          ) : (
            <div className="w-48 h-48 flex items-center justify-center bg-slate-800 rounded-2xl animate-pulse">
              <QrCode className="w-12 h-12 text-slate-600" />
            </div>
          )}

          <div className="space-y-1 max-w-sm">
            <p className="text-xs text-slate-300 font-semibold">
              Ao escanear, o WhatsApp abre automaticamente com a mensagem:
            </p>
            <p className="text-[11px] text-cyan-300 bg-cyan-950/60 p-2 rounded-lg border border-cyan-500/30 italic">
              "{selectedMessage}"
            </p>
          </div>
        </div>

        {/* Link Direto */}
        <div className="flex items-center gap-2 p-2 bg-slate-900 border border-slate-800 rounded-lg">
          <input
            type="text"
            readOnly
            value={fullWhatsAppLink}
            className="flex-1 text-[11px] bg-transparent text-slate-300 focus:outline-none truncate"
          />
          <button
            onClick={handleCopyLink}
            className="px-3 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            onClick={handlePrint}
            className="px-4 py-2 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
            Imprimir Cartaz A4
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadImage}
              className="px-4 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg shadow-lg shadow-cyan-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Baixar Imagem PNG
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
