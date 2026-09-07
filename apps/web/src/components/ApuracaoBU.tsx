import React, { useState, useEffect, useRef } from 'react';
import {
  Vote,
  QrCode,
  School,
  MapPin,
  TrendingUp,
  Award,
  CheckCircle2,
  Upload,
  AlertCircle,
  RefreshCw,
  Search,
  ImagePlus,
  X,
  Camera,
} from 'lucide-react';
import { api } from '../api.ts';

export const ApuracaoBU: React.FC = () => {
  const [apuracao, setApuracao] = useState<any>(null);
  const [busLista, setBusLista] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showModalEnvio, setShowModalEnvio] = useState(false);
  const [textoBU, setTextoBU] = useState('');
  const [remetenteNome, setRemetenteNome] = useState('');
  const [remetenteWhats, setRemetenteWhats] = useState('');
  const [msgSucesso, setMsgSucesso] = useState('');
  const [msgErro, setMsgErro] = useState('');
  const [filtroBairro, setFiltroBairro] = useState('');
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [isUploadingFoto, setIsUploadingFoto] = useState(false);
  const [fotoUploadedUrl, setFotoUploadedUrl] = useState<string | null>(null);
  const [fotoExpanded, setFotoExpanded] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    carregarDados();
    const interval = setInterval(carregarDados, 15000);
    return () => clearInterval(interval);
  }, []);

  const carregarDados = async () => {
    try {
      const [dataApuracao, dataLista] = await Promise.all([
        api.getApuracaoBU(),
        api.getBUsLista(),
      ]);
      setApuracao(dataApuracao);
      setBusLista(dataLista);
    } catch (err: any) {
      console.error('Erro ao carregar apuração:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFotoChange = async (file: File) => {
    setFotoFile(file);
    setFotoUploadedUrl(null);

    // Gera preview local
    const reader = new FileReader();
    reader.onload = (e) => setFotoPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    // Faz upload imediatamente após seleção
    try {
      setIsUploadingFoto(true);
      const base64Reader = new FileReader();
      base64Reader.onload = async (ev) => {
        const base64 = (ev.target?.result as string).split(',')[1];
        const res = await api.uploadFile(base64, file.name, 'bu_foto');
        if (res?.url) setFotoUploadedUrl(res.url);
      };
      base64Reader.readAsDataURL(file);
    } catch {
      // upload falhou, continua sem URL mas preview funciona
    } finally {
      setIsUploadingFoto(false);
    }
  };

  const handleRemoverFoto = () => {
    setFotoFile(null);
    setFotoPreview(null);
    setFotoUploadedUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleProcessarBU = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textoBU.trim()) return;

    try {
      setIsProcessing(true);
      setMsgErro('');
      setMsgSucesso('');

      const res = await api.processarBU({
        rawText: textoBU,
        fotoUrl: fotoUploadedUrl || undefined,
        remetenteNome: remetenteNome || 'Coordenação Geral',
        remetenteWhatsapp: remetenteWhats || 'CENTRAL',
      });

      setMsgSucesso(res.message || 'Boletim de Urna validado com sucesso!');
      setTextoBU('');
      handleRemoverFoto();
      await carregarDados();
      setTimeout(() => {
        setShowModalEnvio(false);
        setMsgSucesso('');
      }, 2500);
    } catch (err: any) {
      setMsgErro(err.message || 'Erro ao processar Boletim de Urna.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading && !apuracao) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Carregando apuração prévia e boletins de urna...
      </div>
    );
  }

  const busFiltrados = filtroBairro
    ? busLista.filter(
        (b) =>
          b.bairro?.toLowerCase().includes(filtroBairro.toLowerCase()) ||
          b.local_votacao_nome?.toLowerCase().includes(filtroBairro.toLowerCase()) ||
          String(b.secao).includes(filtroBairro)
      )
    : busLista;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header com Ações */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Vote size={26} color="var(--primary)" />
            <span>Apuração Prévia de Urna (QR-BU) • Santos / SP</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0', fontSize: '0.875rem' }}>
            Consolidação em tempo real dos Boletins de Urna oficiais enviados por fiscais e apoiadores via WhatsApp e Central.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={carregarDados}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={15} />
            <span>Atualizar</span>
          </button>

          <button
            onClick={() => setShowModalEnvio(true)}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <QrCode size={18} />
            <span>📥 Validar Novo BU</span>
          </button>
        </div>
      </div>

      {/* Cards de Destaque da Apuração */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Total de Votos */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
            <span>VOTOS APURADOS</span>
            <Award size={18} color="var(--primary)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', margin: '8px 0 4px 0' }}>
            {Number(apuracao?.totalVotosCandidato || 0).toLocaleString('pt-BR')}
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--primary)', fontWeight: 600 }}>
            {apuracao?.candidato?.nome} ({apuracao?.candidato?.numero})
          </div>
        </div>

        {/* Urnas Apuradas */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
            <span>URNAS APURADAS</span>
            <CheckCircle2 size={18} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', margin: '8px 0 4px 0' }}>
            {apuracao?.totalSecoesApuradas} / {apuracao?.totalSecoesCidade}
          </div>
          <div style={{ width: '100%', background: 'rgba(255,255,255,0.1)', height: '6px', borderRadius: '4px', overflow: 'hidden', marginTop: '6px' }}>
            <div
              style={{
                width: `${Math.min(apuracao?.percentualApurado || 0, 100)}%`,
                background: 'var(--primary)',
                height: '100%',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {apuracao?.percentualApurado}% das seções de Santos
          </div>
        </div>

        {/* Média por Seção */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
            <span>MÉDIA POR SEÇÃO</span>
            <TrendingUp size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', margin: '8px 0 4px 0' }}>
            {apuracao?.mediaPorSecao}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Votos por urna na amostragem
          </div>
        </div>

        {/* Projeção Final Santos */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
            <span>PROJEÇÃO TOTAL SANTOS</span>
            <Vote size={18} color="#ec4899" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', margin: '8px 0 4px 0' }}>
            {Number(apuracao?.projecaoTotalVotos || 0).toLocaleString('pt-BR')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Projeção estatística para 100%
          </div>
        </div>
      </div>

      {/* Grid: Zonas Eleitorais & Ranking por Bairro */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
        {/* Comparativo Zonas 118 e 272 */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <School size={18} color="var(--primary)" />
            <span>Desempenho por Zona Eleitoral</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* 118ª Zona */}
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontWeight: 600 }}>118ª Zona Eleitoral (Santos)</span>
                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>
                  {apuracao?.porZona?.['118']?.totalVotos || 0} votos
                </span>
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                {apuracao?.porZona?.['118']?.secoesApuradas || 0} seções apuradas • Orla / Gonzaga / Ponta da Praia
              </div>
            </div>

            {/* 272ª Zona */}
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontWeight: 600 }}>272ª Zona Eleitoral (Santos)</span>
                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>
                  {apuracao?.porZona?.['272']?.totalVotos || 0} votos
                </span>
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                {apuracao?.porZona?.['272']?.secoesApuradas || 0} seções apuradas • Centro / Zona Noroeste / Morros
              </div>
            </div>
          </div>
        </div>

        {/* Ranking de Bairros com Maior Votação */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={18} color="var(--primary)" />
            <span>Bairros com Maior Votação</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '220px', overflowY: 'auto' }}>
            {(!apuracao?.rankingBairros || apuracao.rankingBairros.length === 0) ? (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', padding: '20px' }}>
                Nenhum Boletim de Urna recebido até o momento.
              </div>
            ) : (
              apuracao.rankingBairros.slice(0, 6).map((r: any, idx: number) => (
                <div
                  key={r.bairro}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: idx === 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.02)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, color: idx === 0 ? 'var(--primary)' : 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      #{idx + 1}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{r.bairro}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{r.votos} votos</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{r.secoes} seção(ões)</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Tabela de Boletins de Urna Recebidos */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Vote size={18} color="var(--primary)" />
            <span>Boletins de Urna Cadastrados ({busFiltrados.length})</span>
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <Search size={14} color="var(--text-secondary)" />
            <input
              type="text"
              placeholder="Filtrar por escola, bairro ou seção..."
              value={filtroBairro}
              onChange={(e) => setFiltroBairro(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.8125rem', outline: 'none', width: '220px' }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                <th style={{ padding: '10px' }}>Zona / Seção</th>
                <th style={{ padding: '10px' }}>Local de Votação (Escola)</th>
                <th style={{ padding: '10px' }}>Bairro</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>Votos Candidato</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>Comparecimento</th>
                <th style={{ padding: '10px' }}>Fiscal / Remetente</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>Foto</th>
                <th style={{ padding: '10px' }}>Horário</th>
              </tr>
            </thead>
            <tbody>
              {busFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                    Nenhum Boletim de Urna encontrado. Envie o QR-Code do BU pelo WhatsApp da campanha ou clique em "Validar Novo BU".
                  </td>
                </tr>
              ) : (
                busFiltrados.map((b) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px 10px', fontWeight: 600 }}>
                      <span style={{ color: 'var(--primary)' }}>Z-{b.zona}</span> / Sec {b.secao}
                    </td>
                    <td style={{ padding: '12px 10px' }}>{b.local_votacao_nome || 'Local Oficial'}</td>
                    <td style={{ padding: '12px 10px' }}>{b.bairro || 'Santos'}</td>
                    <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>
                      {b.votos_candidato} votos
                    </td>
                    <td style={{ padding: '12px 10px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {b.total_comparecimento} / {b.total_aptos}
                    </td>
                    <td style={{ padding: '12px 10px', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                      {b.remetente_nome || 'Central'}
                    </td>
                    <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                      {b.foto_comprovante_url ? (
                        <button
                          onClick={() => setFotoExpanded(b.foto_comprovante_url)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          title="Ver foto comprovante"
                        >
                          <img
                            src={b.foto_comprovante_url}
                            alt="Comprovante BU"
                            style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                          />
                        </button>
                      ) : (
                        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 10px', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                      {new Date(b.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lightbox de foto expandida */}
      {fotoExpanded && (
        <div
          className="modal-backdrop"
          onClick={() => setFotoExpanded(null)}
          style={{ zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <button
              onClick={() => setFotoExpanded(null)}
              style={{
                position: 'absolute', top: '-14px', right: '-14px',
                background: 'rgba(0,0,0,0.8)', border: '1px solid var(--border-color)',
                borderRadius: '50%', color: '#fff', cursor: 'pointer',
                width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X size={16} />
            </button>
            <img
              src={fotoExpanded}
              alt="Foto comprovante BU"
              style={{ maxWidth: '80vw', maxHeight: '80vh', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}
            />
          </div>
        </div>
      )}

      {/* Modal para Validação Manual de BU */}
      {showModalEnvio && (
        <div className="modal-backdrop" onClick={() => setShowModalEnvio(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px', padding: '24px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <QrCode size={20} color="var(--primary)" />
              <span>Validar Boletim de Urna (QR-BU)</span>
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '18px' }}>
              Cole o texto bruto lido pelo scanner de QR Code da urna, ou digite as informações de Zona, Seção e Votos.
            </p>

            {msgSucesso && (
              <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--primary)', padding: '10px 14px', borderRadius: '8px', color: '#10b981', fontSize: '0.875rem', marginBottom: '14px' }}>
                {msgSucesso}
              </div>
            )}

            {msgErro && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', padding: '10px 14px', borderRadius: '8px', color: '#f87171', fontSize: '0.875rem', marginBottom: '14px' }}>
                {msgErro}
              </div>
            )}

            <form onSubmit={handleProcessarBU} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Conteúdo do QR-BU ou Texto do Boletim:
                </label>
                <textarea
                  rows={6}
                  required
                  placeholder="Cole o código do QR do BU (ex: QRBU:1:8.26:ELEICAO2026:DT=20261004 MUN=70750 ZON=118 SEC=45 APT=350 COM=295 VOT=55955:164...)"
                  value={textoBU}
                  onChange={(e) => setTextoBU(e.target.value)}
                  style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px', color: '#fff', fontSize: '0.8125rem', fontFamily: 'monospace' }}
                />
              </div>

              {/* Upload de Foto Comprovante */}
              <div>
                <label style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Camera size={14} />
                  Foto Comprovante do BU (opcional):
                </label>

                {fotoPreview ? (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img
                      src={fotoPreview}
                      alt="Preview"
                      style={{
                        width: '100%', maxHeight: '180px', objectFit: 'contain',
                        borderRadius: '8px', border: '1px solid var(--border-color)',
                        background: 'rgba(0,0,0,0.3)',
                      }}
                    />
                    {isUploadingFoto && (
                      <div style={{
                        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
                        borderRadius: '8px', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', color: '#fff', fontSize: '0.8125rem', gap: '8px',
                      }}>
                        <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                        Enviando foto...
                      </div>
                    )}
                    {fotoUploadedUrl && !isUploadingFoto && (
                      <div style={{
                        position: 'absolute', top: '8px', left: '8px',
                        background: 'rgba(16,185,129,0.9)', borderRadius: '6px',
                        padding: '3px 8px', fontSize: '0.75rem', color: '#fff',
                        display: 'flex', alignItems: 'center', gap: '4px',
                      }}>
                        <CheckCircle2 size={12} /> Foto enviada
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleRemoverFoto}
                      style={{
                        position: 'absolute', top: '8px', right: '8px',
                        background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff',
                        borderRadius: '50%', width: '26px', height: '26px',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files[0];
                      if (file && file.type.startsWith('image/')) handleFotoChange(file);
                    }}
                    style={{
                      border: '2px dashed var(--border-color)',
                      borderRadius: '10px',
                      padding: '24px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: 'rgba(255,255,255,0.02)',
                      transition: 'border-color 0.2s, background 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)';
                      (e.currentTarget as HTMLElement).style.background = 'rgba(16,185,129,0.05)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-color)';
                      (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)';
                    }}
                  >
                    <ImagePlus size={28} color="var(--text-secondary)" style={{ marginBottom: '8px' }} />
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      Clique ou arraste uma foto do BU aqui
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
                      JPG, PNG, WEBP • Máx. 10 MB
                    </div>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFotoChange(file);
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Fiscal / Responsável:
                  </label>
                  <input
                    type="text"
                    placeholder="Nome do fiscal"
                    value={remetenteNome}
                    onChange={(e) => setRemetenteNome(e.target.value)}
                    style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 10px', color: '#fff', fontSize: '0.875rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    WhatsApp do Fiscal:
                  </label>
                  <input
                    type="text"
                    placeholder="13999998888"
                    value={remetenteWhats}
                    onChange={(e) => setRemetenteWhats(e.target.value)}
                    style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 10px', color: '#fff', fontSize: '0.875rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => { setShowModalEnvio(false); handleRemoverFoto(); }}
                  className="btn-secondary"
                  disabled={isProcessing}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isProcessing || isUploadingFoto}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {isUploadingFoto ? 'Enviando foto...' : isProcessing ? 'Validando...' : 'Validar e Contabilizar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
