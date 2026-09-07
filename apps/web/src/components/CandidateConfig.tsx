import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Save,
  Sparkles,
  User,
  Palette,
  CheckCircle2,
  Image as ImageIcon,
  Share2,
  ExternalLink,
  Phone,
  MessageCircle,
  Eye,
  Upload,
  Link as LinkIcon,
  Camera,
  Trash2,
  Loader2,
} from 'lucide-react';
import { api } from '../api.ts';

interface CandidateConfigProps {
  config: any;
  onRefresh: () => void;
}

const PALETAS_CORES = [
  { nome: 'Verde Esperança', hex: '#10b981', desc: 'Sustentabilidade, Renovação e Saúde' },
  { nome: 'Azul Confiança', hex: '#2563eb', desc: 'Tradição, Segurança e Democracia' },
  { nome: 'Azul Marinho Real', hex: '#1d4ed8', desc: 'Institucional, Firmeza e Justiça' },
  { nome: 'Vermelho Popular', hex: '#dc2626', desc: 'Movimento Social, Trabalho e Povo' },
  { nome: 'Laranja Dinâmico', hex: '#ea580c', desc: 'Energia, Juventude e Ação' },
  { nome: 'Roxo Mandato', hex: '#7c3aed', desc: 'Inovação, Diversidade e Coletivo' },
  { nome: 'Amarelo Otimismo', hex: '#eab308', desc: 'Prosperidade, Educação e Brasil' },
  { nome: 'Cyan Modernidade', hex: '#06b6d4', desc: 'Futuro, Tecnologia e Transparência' },
];

export const CandidateConfig: React.FC<CandidateConfigProps> = ({ config, onRefresh }) => {
  const [formData, setFormData] = useState<any>({
    nome_urna: '',
    nome_completo: '',
    numero_candidato: '',
    cargo: '',
    partido: '',
    coligacao: '',
    slogan: '',
    cor_primaria: '#10b981',
    foto_url: '',
    logo_url: '',
    cidade: 'Santos',
    estado: 'SP',
    biografia_ia: '',
    propostas_ia: '',
    tom_voz_ia: 'POPULAR',
    whatsapp_comite: '',
    link_grupo_geral: '',
    ...config,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Estados para Upload de Arquivo / Foto
  const [fotoMode, setFotoMode] = useState<'upload' | 'url'>('upload');
  const [logoMode, setLogoMode] = useState<'upload' | 'url'>('upload');
  const [isUploadingFoto, setIsUploadingFoto] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [uploadErrorFoto, setUploadErrorFoto] = useState<string | null>(null);
  const [uploadErrorLogo, setUploadErrorLogo] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, tipo: 'foto' | 'logo') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      alert('Arquivo muito grande. Por favor selecione uma imagem de até 25MB.');
      return;
    }

    const isFoto = tipo === 'foto';
    if (isFoto) {
      setIsUploadingFoto(true);
      setUploadErrorFoto(null);
    } else {
      setIsUploadingLogo(true);
      setUploadErrorLogo(null);
    }

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          const res = await api.uploadFile(base64, file.name, tipo);
          if (res.url) {
            setFormData((prev: any) => ({
              ...prev,
              [isFoto ? 'foto_url' : 'logo_url']: res.url,
            }));
          }
        } catch (err: any) {
          const msg = err.message || 'Erro ao enviar imagem.';
          if (isFoto) setUploadErrorFoto(msg);
          else setUploadErrorLogo(msg);
        } finally {
          if (isFoto) setIsUploadingFoto(false);
          else setIsUploadingLogo(false);
        }
      };
      reader.onerror = () => {
        if (isFoto) {
          setUploadErrorFoto('Erro ao processar imagem.');
          setIsUploadingFoto(false);
        } else {
          setUploadErrorLogo('Erro ao processar imagem.');
          setIsUploadingLogo(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      if (isFoto) {
        setUploadErrorFoto(err.message);
        setIsUploadingFoto(false);
      } else {
        setUploadErrorLogo(err.message);
        setIsUploadingLogo(false);
      }
    }
  };

  useEffect(() => {
    if (config) {
      setFormData((prev: any) => ({ ...prev, ...config }));
      if (config.cor_primaria) {
        applyPrimaryColor(config.cor_primaria);
      }
    }
  }, [config]);

  const applyPrimaryColor = (hex: string) => {
    if (!hex) return;
    document.documentElement.style.setProperty('--primary', hex);
    document.documentElement.style.setProperty('--border-focus', hex);
    // Gerar tons de hover e glow
    document.documentElement.style.setProperty('--primary-hover', hex);
    document.documentElement.style.setProperty('--primary-glow', `${hex}55`);
    document.documentElement.style.setProperty('--primary-light', `${hex}22`);
  };

  const handleColorSelect = (hex: string) => {
    setFormData((prev: any) => ({ ...prev, cor_primaria: hex }));
    applyPrimaryColor(hex);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await api.updateCampanhaConfig(formData);
      applyPrimaryColor(formData.cor_primaria);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
      onRefresh();
    } catch (err: any) {
      alert(`Erro ao salvar configurações: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header com Ação de Salvar */}
      <div
        className="glass-panel"
        style={{
          padding: '24px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              className="badge"
              style={{
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                border: '1px solid var(--primary)',
                fontWeight: 700,
              }}
            >
              Personalização Total • White-Label Oficial
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Eleições 2026</span>
          </div>
          <h2 style={{ fontSize: '24px', margin: 0 }}>Identidade Visual do Candidato & Cérebro da IA</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '720px', marginTop: '6px' }}>
            Altere as cores, fotos, dados de urna e instrua a Inteligência Artificial que conversa oficialmente com seus eleitores pelo WhatsApp.
          </p>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="btn btn-primary"
          style={{ padding: '12px 24px', fontSize: '14px' }}
        >
          {savedSuccess ? <CheckCircle2 size={18} /> : <Save size={18} />}
          <span>{isSaving ? 'Salvando...' : savedSuccess ? 'Salvo com Sucesso!' : 'Salvar Personalização'}</span>
        </button>
      </div>

      {/* Grid Principal: Identidade Visual + Preview do Santinho */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
        {/* Bloco 1: Paleta de Cores e Identidade Visual */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '17px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Palette size={20} color="var(--primary)" />
            <span>Cores da Campanha & Tema</span>
          </h3>

          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
              Cor Oficial da Campanha (Recolore todo o sistema)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '14px' }}>
              {PALETAS_CORES.map((p) => {
                const isSelected = formData.cor_primaria?.toLowerCase() === p.hex.toLowerCase();
                return (
                  <button
                    key={p.hex}
                    type="button"
                    onClick={() => handleColorSelect(p.hex)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '8px 4px',
                      borderRadius: '10px',
                      border: isSelected ? `2px solid ${p.hex}` : '1px solid var(--border-color)',
                      background: isSelected ? `${p.hex}22` : 'rgba(15, 23, 42, 0.4)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    title={p.desc}
                  >
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: p.hex,
                        boxShadow: isSelected ? `0 0 10px ${p.hex}` : 'none',
                      }}
                    />
                    <span style={{ fontSize: '10px', color: 'var(--text-primary)', textAlign: 'center', fontWeight: isSelected ? 700 : 500 }}>
                      {p.nome.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom Hex Picker */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(15, 23, 42, 0.4)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <input
                type="color"
                value={formData.cor_primaria || '#10b981'}
                onChange={(e) => handleColorSelect(e.target.value)}
                style={{ width: '38px', height: '38px', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }}
              />
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Código Hex Customizado:</span>
                <input
                  type="text"
                  className="input-field"
                  value={formData.cor_primaria || '#10b981'}
                  onChange={(e) => handleColorSelect(e.target.value)}
                  style={{ padding: '4px 8px', fontSize: '13px', marginTop: '2px', height: '32px' }}
                />
              </div>
            </div>
          </div>

          {/* Configuração de Imagens (Foto e Logo) com Suporte a Arquivo/Câmera ou URL */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Foto Oficial do Candidato */}
            <div style={{ background: 'rgba(15, 23, 42, 0.4)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                  <User size={16} color="var(--primary)" />
                  Foto Oficial do Candidato (Urna / Avatar)
                </label>

                {/* Abas: Arquivo vs URL */}
                <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.25)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <button
                    type="button"
                    onClick={() => setFotoMode('upload')}
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      borderRadius: '6px',
                      border: 'none',
                      background: fotoMode === 'upload' ? 'var(--primary)' : 'transparent',
                      color: fotoMode === 'upload' ? '#ffffff' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: fotoMode === 'upload' ? 700 : 500,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Upload size={12} /> Subir Arquivo / Foto
                  </button>
                  <button
                    type="button"
                    onClick={() => setFotoMode('url')}
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      borderRadius: '6px',
                      border: 'none',
                      background: fotoMode === 'url' ? 'var(--primary)' : 'transparent',
                      color: fotoMode === 'url' ? '#ffffff' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: fotoMode === 'url' ? 700 : 500,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <LinkIcon size={12} /> Inserir URL
                  </button>
                </div>
              </div>

              {fotoMode === 'upload' ? (
                <div>
                  {formData.foto_url ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'rgba(15, 23, 42, 0.5)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                      <img
                        src={formData.foto_url}
                        alt="Foto do Candidato"
                        style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)', flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          Foto Pronta para Campanha
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {formData.foto_url}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        <label
                          htmlFor="upload-foto-input"
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Camera size={14} /> Trocar Foto
                        </label>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, foto_url: '' })}
                          className="btn btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '12px', color: '#ef4444' }}
                          title="Remover Foto"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <input
                        id="upload-foto-input"
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => handleFileUpload(e, 'foto')}
                      />
                    </div>
                  ) : (
                    <label
                      htmlFor="upload-foto-input"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '24px 16px',
                        borderRadius: '10px',
                        border: '2px dashed var(--border-color)',
                        background: 'rgba(15, 23, 42, 0.25)',
                        cursor: isUploadingFoto ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        textAlign: 'center',
                      }}
                    >
                      <input
                        id="upload-foto-input"
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        disabled={isUploadingFoto}
                        onChange={(e) => handleFileUpload(e, 'foto')}
                      />
                      {isUploadingFoto ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <Loader2 size={26} className="animate-spin" color="var(--primary)" />
                          <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>
                            Enviando imagem do candidato...
                          </span>
                        </div>
                      ) : (
                        <>
                          <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px', color: 'var(--primary)' }}>
                            <Camera size={22} />
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            Toque para escolher foto do celular ou computador
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Aceita foto da galeria ou câmera (JPG, PNG, WEBP de alta qualidade)
                          </span>
                        </>
                      )}
                    </label>
                  )}
                  {uploadErrorFoto && (
                    <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px', display: 'block' }}>
                      {uploadErrorFoto}
                    </span>
                  )}
                </div>
              ) : (
                <div>
                  <input
                    type="url"
                    className="input-field"
                    placeholder="https://exemplo.com/foto-candidato.jpg"
                    value={formData.foto_url || ''}
                    onChange={(e) => setFormData({ ...formData, foto_url: e.target.value })}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    Cole a URL direta da foto na web (.jpg, .png ou .webp)
                  </span>
                </div>
              )}
            </div>

            {/* Logotipo da Campanha ou Partido */}
            <div style={{ background: 'rgba(15, 23, 42, 0.4)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                  <ImageIcon size={16} color="var(--primary)" />
                  Logotipo da Campanha ou Partido
                </label>

                {/* Abas: Arquivo vs URL */}
                <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.25)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <button
                    type="button"
                    onClick={() => setLogoMode('upload')}
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      borderRadius: '6px',
                      border: 'none',
                      background: logoMode === 'upload' ? 'var(--primary)' : 'transparent',
                      color: logoMode === 'upload' ? '#ffffff' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: logoMode === 'upload' ? 700 : 500,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Upload size={12} /> Subir Arquivo / Logo
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogoMode('url')}
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      borderRadius: '6px',
                      border: 'none',
                      background: logoMode === 'url' ? 'var(--primary)' : 'transparent',
                      color: logoMode === 'url' ? '#ffffff' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: logoMode === 'url' ? 700 : 500,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <LinkIcon size={12} /> Inserir URL
                  </button>
                </div>
              </div>

              {logoMode === 'upload' ? (
                <div>
                  {formData.logo_url ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'rgba(15, 23, 42, 0.5)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                      <img
                        src={formData.logo_url}
                        alt="Logotipo"
                        style={{ width: '56px', height: '56px', borderRadius: '8px', objectFit: 'contain', background: '#ffffff', padding: '4px', border: '1px solid var(--border-color)', flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          Logotipo Carregado
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {formData.logo_url}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        <label
                          htmlFor="upload-logo-input"
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Upload size={14} /> Trocar Logo
                        </label>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, logo_url: '' })}
                          className="btn btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '12px', color: '#ef4444' }}
                          title="Remover Logo"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <input
                        id="upload-logo-input"
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => handleFileUpload(e, 'logo')}
                      />
                    </div>
                  ) : (
                    <label
                      htmlFor="upload-logo-input"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '24px 16px',
                        borderRadius: '10px',
                        border: '2px dashed var(--border-color)',
                        background: 'rgba(15, 23, 42, 0.25)',
                        cursor: isUploadingLogo ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        textAlign: 'center',
                      }}
                    >
                      <input
                        id="upload-logo-input"
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        disabled={isUploadingLogo}
                        onChange={(e) => handleFileUpload(e, 'logo')}
                      />
                      {isUploadingLogo ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <Loader2 size={26} className="animate-spin" color="var(--primary)" />
                          <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>
                            Enviando logotipo...
                          </span>
                        </div>
                      ) : (
                        <>
                          <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px', color: 'var(--primary)' }}>
                            <ImageIcon size={22} />
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            Toque para subir o logo do partido ou campanha
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Formatos PNG transparente, SVG, JPG ou WEBP
                          </span>
                        </>
                      )}
                    </label>
                  )}
                  {uploadErrorLogo && (
                    <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px', display: 'block' }}>
                      {uploadErrorLogo}
                    </span>
                  )}
                </div>
              ) : (
                <div>
                  <input
                    type="url"
                    className="input-field"
                    placeholder="https://exemplo.com/logo-partido.png"
                    value={formData.logo_url || ''}
                    onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    Cole a URL direta da imagem ou logo na web (.png, .svg ou .jpg)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bloco 2: Preview Interativo do Santinho Digital */}
        <div
          className="glass-panel"
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.7), rgba(11, 15, 23, 0.9))',
            border: `1px solid ${formData.cor_primaria || 'var(--primary)'}44`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Luz de fundo na cor da campanha */}
          <div
            style={{
              position: 'absolute',
              top: '-40px',
              right: '-40px',
              width: '180px',
              height: '180px',
              borderRadius: '50%',
              background: formData.cor_primaria || 'var(--primary)',
              filter: 'blur(70px)',
              opacity: 0.25,
              pointerEvents: 'none',
            }}
          />

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span className="badge" style={{ background: `${formData.cor_primaria}22`, color: formData.cor_primaria, border: `1px solid ${formData.cor_primaria}` }}>
                Pré-visualização do Santinho Digital
              </span>
              <Eye size={16} color="var(--text-muted)" />
            </div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '18px' }}>
              {formData.foto_url ? (
                <img
                  src={formData.foto_url}
                  alt={formData.nome_urna}
                  style={{
                    width: '74px',
                    height: '74px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: `3px solid ${formData.cor_primaria}`,
                    boxShadow: `0 4px 16px ${formData.cor_primaria}44`,
                  }}
                  onError={(e) => {
                    // Fallback se imagem quebrar
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '74px',
                    height: '74px',
                    borderRadius: '50%',
                    background: `${formData.cor_primaria}22`,
                    color: formData.cor_primaria,
                    border: `3px solid ${formData.cor_primaria}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '26px',
                    fontWeight: 800,
                  }}
                >
                  {formData.nome_urna?.charAt(0) || 'C'}
                </div>
              )}

              <div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
                  {formData.nome_urna || 'Nome na Urna'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                  <span
                    style={{
                      fontSize: '15px',
                      fontWeight: 900,
                      color: formData.cor_primaria,
                    }}
                  >
                    {formData.numero_candidato || '00000'}
                  </span>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>• {formData.partido || 'PARTIDO'}</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {formData.cargo || 'Cargo Concorrido'} • {formData.cidade || 'Santos'} / {formData.estado || 'SP'}
                </div>
              </div>
            </div>

            <div
              style={{
                background: 'rgba(0, 0, 0, 0.25)',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                marginBottom: '16px',
              }}
            >
              <div style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                "{formData.slogan || 'Trabalho, dedicação e compromisso com o cidadão.'}"
              </div>
              {formData.coligacao && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  {formData.coligacao}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            {formData.whatsapp_comite && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Phone size={13} color={formData.cor_primaria} />
                {formData.whatsapp_comite}
              </span>
            )}
            {formData.link_grupo_geral && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MessageCircle size={13} color={formData.cor_primaria} />
                Comunidade WhatsApp
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Grid Secundário: Dados Oficiais de Urna + Canais de Comunicação */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* Dados de Urna & Cargo */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '17px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={18} color="var(--primary)" />
            <span>Registro Oficial Eleitoral (TSE)</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Nome na Urna (Principal)</label>
              <input
                type="text"
                className="input-field"
                value={formData.nome_urna || ''}
                onChange={(e) => setFormData({ ...formData, nome_urna: e.target.value })}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Nome Completo do Candidato</label>
              <input
                type="text"
                className="input-field"
                value={formData.nome_completo || ''}
                onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Número de Urna</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.numero_candidato || ''}
                  onChange={(e) => setFormData({ ...formData, numero_candidato: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Sigla do Partido</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.partido || ''}
                  onChange={(e) => setFormData({ ...formData, partido: e.target.value })}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Cargo Concorrido</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.cargo || ''}
                  onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Município / UF</label>
                <input
                  type="text"
                  className="input-field"
                  value={`${formData.cidade || 'Santos'} - ${formData.estado || 'SP'}`}
                  onChange={(e) => {
                    const [cidade, estado] = e.target.value.split('-');
                    setFormData({ ...formData, cidade: cidade?.trim(), estado: estado?.trim() || 'SP' });
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Slogan Oficial</label>
              <input
                type="text"
                className="input-field"
                value={formData.slogan || ''}
                onChange={(e) => setFormData({ ...formData, slogan: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Canais de Atendimento & Mobilização */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '17px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Share2 size={18} color="var(--primary)" />
            <span>Canais Oficiais de Mobilização</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                WhatsApp do Comitê Central
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="13999998888"
                value={formData.whatsapp_comite || ''}
                onChange={(e) => setFormData({ ...formData, whatsapp_comite: e.target.value })}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Link do Grupo Geral de Mobilização (Convite Aberto)
              </label>
              <input
                type="url"
                className="input-field"
                placeholder="https://chat.whatsapp.com/..."
                value={formData.link_grupo_geral || ''}
                onChange={(e) => setFormData({ ...formData, link_grupo_geral: e.target.value })}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Coligação Partidária Registrada
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Coligação Santos Para Todos (PSD / MDB / União)"
                value={formData.coligacao || ''}
                onChange={(e) => setFormData({ ...formData, coligacao: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Cérebro da Inteligência Artificial (Groq Llama 3) */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={20} color="var(--primary)" />
          <span>Cérebro da IA de Atendimento (Groq Llama-3.3-70b)</span>
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Tom de Voz do Atendente Robô
            </label>
            <select
              className="input-field"
              value={formData.tom_voz_ia || 'POPULAR'}
              onChange={(e) => setFormData({ ...formData, tom_voz_ia: e.target.value })}
            >
              <option value="POPULAR">Popular & Acolhedor (Linguagem simples, direta e empática)</option>
              <option value="FORMAL">Formal & Institucional (Linguagem sóbria e técnica)</option>
              <option value="DESCONTRAIDO">Jovem & Descontraído (Ideal para mobilização universitária)</option>
            </select>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Biografia Oficial e Histórico do Candidato (Contexto da IA)
            </label>
            <textarea
              className="input-field"
              rows={3}
              value={formData.biografia_ia || ''}
              onChange={(e) => setFormData({ ...formData, biografia_ia: e.target.value })}
              placeholder="Histórico do candidato, mandatos anteriores, serviços prestados para a cidade, trajetória profissional..."
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Principais Propostas e Eixos de Campanha (Instrução Central da IA)
            </label>
            <textarea
              className="input-field"
              rows={5}
              value={formData.propostas_ia || ''}
              onChange={(e) => setFormData({ ...formData, propostas_ia: e.target.value })}
              placeholder="SAÚDE: ampliação do horário das UBSs, mutirão de exames...\nEDUCAÇÃO: escolas de período integral...\nSEGURANÇA: iluminação e totens de monitoramento..."
            />
          </div>
        </div>
      </div>
    </form>
  );
};
