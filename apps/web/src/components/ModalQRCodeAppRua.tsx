import React, { useState } from 'react';
import {
  X,
  QrCode,
  Smartphone,
  Copy,
  Check,
  Share2,
  Printer,
  Sparkles,
  ShieldCheck,
  WifiOff,
  Sun,
  Zap,
  ExternalLink
} from 'lucide-react';

interface ModalQRCodeAppRuaProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModalQRCodeAppRua: React.FC<ModalQRCodeAppRuaProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://191.252.201.102';
  const appRuaUrl = `${currentOrigin}/?app=rua`;
  const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=12&data=${encodeURIComponent(appRuaUrl)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(appRuaUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleShareWhatsapp = () => {
    const msg = encodeURIComponent(
      `🏛️ *SANTOS EM CAMPO 2026 - APP DA EQUIPE DE RUA*\n\n` +
      `Olá colaborador! Instale agora o aplicativo oficial de campo da nossa campanha:\n\n` +
      `👉 ${appRuaUrl}\n\n` +
      `✅ Cadastro rápido em 2 toques\n` +
      `✅ Funciona 100% sem internet nos morros e periferia\n` +
      `✅ Modo Solar de alto contraste sob o sol forte\n` +
      `✅ Monitoramento de passos e metas de rua ao vivo!`
    );
    window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#0f172a',
          border: '2px solid #10b981',
          borderRadius: '20px',
          maxWidth: '520px',
          width: '100%',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(16, 185, 129, 0.25)',
          color: '#ffffff'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER DO MODAL */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#090d16',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#10b981',
                padding: '4px 10px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 800
              }}
            >
              <Smartphone size={15} /> INSTALAÇÃO DO APP DO COLABORADOR
            </span>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* CORPO DO MODAL */}
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 900, margin: '0 0 6px 0', color: '#ffffff' }}>
            Aponte a Câmera para Baixar o App no Celular
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 16px 0' }}>
            PWA leve (sem passar por lojas). Roda direto na tela inicial do Android e iPhone.
          </p>

          {/* MOLDURA DO QR CODE EM DESTAQUE */}
          <div
            style={{
              display: 'inline-block',
              padding: '16px',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
              marginBottom: '16px',
              position: 'relative'
            }}
          >
            <img
              src={qrCodeApiUrl}
              alt="QR Code Santos em Campo"
              style={{ width: '220px', height: '220px', display: 'block' }}
            />
            <div
              style={{
                marginTop: '8px',
                color: '#000000',
                fontSize: '11px',
                fontWeight: 900,
                letterSpacing: '0.5px'
              }}
            >
              SANTOS EM CAMPO 2026
            </div>
          </div>

          {/* LINK CURTO COPIÁVEL */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid #334155',
              padding: '10px 14px',
              borderRadius: '10px',
              marginBottom: '16px',
              fontSize: '13px'
            }}
          >
            <span style={{ color: '#60a5fa', fontWeight: 700, wordBreak: 'break-all' }}>
              {appRuaUrl}
            </span>
            <button
              onClick={handleCopyLink}
              style={{
                background: copied ? '#10b981' : '#3b82f6',
                color: copied ? '#000' : '#fff',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                flexShrink: 0,
                marginLeft: '8px'
              }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>

          {/* BOTÕES DE AÇÃO: WHATSAPP & IMPRIMIR CARTAZ */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
            <button
              onClick={handleShareWhatsapp}
              style={{
                background: '#10b981',
                color: '#000000',
                border: 'none',
                padding: '12px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Share2 size={15} /> Enviar no WhatsApp
            </button>

            <button
              onClick={handlePrint}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                padding: '12px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Printer size={15} /> Imprimir Cartaz
            </button>
          </div>

          {/* GUIA PASSO A PASSO PARA ANDROID E IPHONE */}
          <div
            style={{
              textAlign: 'left',
              background: 'rgba(30, 41, 59, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '12px',
              fontSize: '11px',
              color: '#94a3b8'
            }}
          >
            <div style={{ fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
              📲 Como fixar na tela inicial em 5 segundos:
            </div>
            <div style={{ marginBottom: '4px' }}>
              • <strong>No Android (Chrome):</strong> Abra a câmera ou link ➔ Toque nos <strong>3 pontinhos (⋮)</strong> no topo ➔ Selecione <strong>"Instalar Aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
            </div>
            <div>
              • <strong>No iPhone (Safari):</strong> Abra a câmera ou link ➔ Toque no botão de <strong>Compartilhar (⎋)</strong> ➔ Escolha <strong>"Adicionar à Tela de Início"</strong>.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
