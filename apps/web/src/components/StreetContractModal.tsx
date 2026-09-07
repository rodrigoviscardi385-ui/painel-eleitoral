import React, { useState, useEffect } from 'react';
import {
  FileText,
  Printer,
  Copy,
  Check,
  X,
  Clock,
  Briefcase,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  DollarSign,
  User,
  Calendar,
  Send,
  QrCode,
  Sparkles,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { api } from '../api.ts';

interface StreetContractModalProps {
  member: any;
  onClose: () => void;
  onSuccess?: () => void;
}

export const StreetContractModal: React.FC<StreetContractModalProps> = ({
  member,
  onClose,
  onSuccess,
}) => {
  const [jornada, setJornada] = useState<'MEIO_PERIODO' | 'PERIODO_INTEGRAL'>(
    member.tipo_jornada === 'PERIODO_INTEGRAL' ? 'PERIODO_INTEGRAL' : 'MEIO_PERIODO'
  );
  const [contractData, setContractData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'preview' | 'text'>('preview');
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Estados do Gov.br
  const [govBrLoading, setGovBrLoading] = useState(false);
  const [govBrLink, setGovBrLink] = useState<string | null>(member.link_gov_br || null);
  const [govBrStatus, setGovBrStatus] = useState<string>(member.status_contrato || 'MINUTA_GERADA');
  const [sha256Hash, setSha256Hash] = useState<string | null>(member.hash_sha256_original || null);
  const [showQrCode, setShowQrCode] = useState(false);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    fetchContract(jornada);
  }, [jornada, member.id]);

  const fetchContract = async (tipo: 'MEIO_PERIODO' | 'PERIODO_INTEGRAL') => {
    try {
      setLoading(true);
      const res = await api.getContratoEquipeRua(member.id, { tipo_jornada: tipo });
      setContractData(res);
    } catch (err: any) {
      console.error('Erro ao carregar contrato:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGerarGovBr = async () => {
    try {
      setGovBrLoading(true);
      const res = await api.gerarEEnviarContratoGovBr(member.id, { tipo_jornada: jornada });
      setGovBrLink(res.link_gov_br);
      setGovBrStatus('AGUARDANDO_ASSINATURA');
      setSha256Hash(res.hash_sha256_original);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      alert(`Falha ao registrar contrato no Gov.br: ${err.message}`);
    } finally {
      setGovBrLoading(false);
    }
  };

  const handleSimularAssinatura = async () => {
    try {
      setSimulating(true);
      const res = await api.simularAssinaturaGovBr(member.id);
      setGovBrStatus('ASSINADO');
      setSha256Hash(res.membro.hash_sha256_assinado || res.membro.hash_sha256_original);
      alert('Assinatura Gov.br (ITI Ouro) simulada e confirmada com sucesso!');
      if (onSuccess) onSuccess();
      fetchContract(jornada);
    } catch (err: any) {
      alert(`Erro na simulação: ${err.message}`);
    } finally {
      setSimulating(false);
    }
  };

  const handleCopyText = () => {
    if (!contractData?.plainText) return;
    navigator.clipboard.writeText(contractData.plainText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyLink = () => {
    if (!govBrLink) return;
    navigator.clipboard.writeText(govBrLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleEnviarWhatsApp = () => {
    if (!govBrLink) return;
    const msg = `Olá, ${member.nome_completo}! Aqui é da Coordenação Eleitoral 2026.\n\nSeu Contrato Oficial de Equipe de Rua (${jornada === 'MEIO_PERIODO' ? 'Meio Período' : 'Período Integral'}) está pronto para assinatura digital pelo GOV.BR.\n\nAssine com facilidade pelo seu celular:\n${govBrLink}\n\nDocumento protegido pela Lei 9.504/97 e Lei 14.063/2020.`;
    const cleanPhone = member.telefone_whatsapp.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handlePrint = () => {
    if (!contractData?.printableHtml) return;
    const printWindow = window.open('', '_blank', 'width=900,height=750');
    if (printWindow) {
      printWindow.document.write(contractData.printableHtml);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 350);
    }
  };

  const isAssinado = govBrStatus === 'ASSINADO';

  return (
    <div className="modal-overlay">
      <div className="modal-dialog-large" style={{ maxWidth: '960px' }}>
        {/* Header com Gradiente Temático */}
        <div className="modal-header-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
              }}
            >
              <FileText size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                  Contrato Oficial TSE • Equipe de Rua & Gov.br
                </h2>
                <span className="badge badge-verde" style={{ fontSize: '11px' }}>
                  <ShieldCheck size={12} /> Art. 100 Lei 9.504/97
                </span>
                <span className="govbr-pill">
                  Gov.br Lei 14.063/2020
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)', margin: '2px 0 0 0' }}>
                {member.nome_completo} • CPF: {member.cpf} • {member.bairro}, Santos/SP
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-secondary btn-icon"
            style={{ width: '32px', height: '32px', color: '#ffffff' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ─── BARRA DE FERRAMENTAS: SELETOR DE JORNADA + AÇÕES GOV.BR ───────── */}
        <div
          style={{
            padding: '12px 20px',
            background: 'var(--bg-input)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          {/* Seletor Dinâmico de Jornada (Meio Período vs Período Integral) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Modalidade:
            </span>
            <div style={{ display: 'inline-flex', padding: '3px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <button
                type="button"
                onClick={() => setJornada('MEIO_PERIODO')}
                className={`btn btn-sm ${jornada === 'MEIO_PERIODO' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '5px 12px', fontSize: '12px' }}
              >
                <Clock size={13} />
                <span>Meio Período (20h)</span>
              </button>
              <button
                type="button"
                onClick={() => setJornada('PERIODO_INTEGRAL')}
                className={`btn btn-sm ${jornada === 'PERIODO_INTEGRAL' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '5px 12px', fontSize: '12px', background: jornada === 'PERIODO_INTEGRAL' ? '#f59e0b' : undefined }}
              >
                <Briefcase size={13} />
                <span>Período Integral (40h)</span>
              </button>
            </div>
          </div>

          {/* Botões de Ação Visual & Impressão */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'inline-flex', padding: '2px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)' }}>
              <button
                onClick={() => setViewMode('preview')}
                className={`btn btn-sm ${viewMode === 'preview' ? 'btn-secondary' : 'btn-ghost'}`}
                style={{ padding: '4px 10px', fontSize: '11.5px' }}
              >
                Visualizar A4
              </button>
              <button
                onClick={() => setViewMode('text')}
                className={`btn btn-sm ${viewMode === 'text' ? 'btn-secondary' : 'btn-ghost'}`}
                style={{ padding: '4px 10px', fontSize: '11.5px' }}
              >
                Texto Puro
              </button>
            </div>

            <button
              onClick={handleCopyText}
              className="btn btn-secondary btn-sm"
              title="Copiar texto do contrato"
            >
              {copied ? <Check size={13} color="var(--primary)" /> : <Copy size={13} />}
              <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="btn btn-secondary btn-sm"
            >
              <Printer size={14} />
              <span>Imprimir / PDF</span>
            </button>
          </div>
        </div>

        {/* ─── PAINEL DE ASSINATURA DIGITAL GOV.BR ──────────────────────────── */}
        <div
          style={{
            padding: '14px 20px',
            background: isAssinado ? 'rgba(16, 185, 129, 0.08)' : 'rgba(59, 130, 246, 0.08)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: isAssinado ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isAssinado ? 'var(--primary)' : '#3b82f6',
              }}
            >
              {isAssinado ? <CheckCircle size={20} /> : <Lock size={20} />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {isAssinado
                    ? 'Contrato Assinado no Gov.br (ITI Ouro)'
                    : govBrLink
                    ? 'Aguardando Assinatura no Gov.br'
                    : 'Pronto para Envio à Assinatura Gov.br'}
                </span>
                <span className={`badge ${isAssinado ? 'badge-verde' : 'badge-amarelo'}`} style={{ fontSize: '10.5px' }}>
                  {isAssinado ? 'Homologado SPCE/TSE' : 'Sem Papel • Mobile First'}
                </span>
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {sha256Hash
                  ? `Hash SHA-256: ${sha256Hash.slice(0, 16)}...${sha256Hash.slice(-8)} (Integridade garantida)`
                  : 'Gera link instantâneo para o cabo eleitoral assinar pelo celular via Gov.br Prata/Ouro'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {!govBrLink && !isAssinado ? (
              <button
                onClick={handleGerarGovBr}
                disabled={govBrLoading}
                className="btn btn-primary btn-sm"
                style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', border: 'none', padding: '7px 14px' }}
              >
                <Sparkles size={14} />
                <span>{govBrLoading ? 'Registrando no ITI...' : 'Enviar para Assinatura no Gov.br'}</span>
              </button>
            ) : (
              <>
                <button
                  onClick={handleCopyLink}
                  className="btn btn-secondary btn-sm"
                  title="Copiar link governamental"
                >
                  {copiedLink ? <Check size={13} color="var(--primary)" /> : <Copy size={13} />}
                  <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link Gov.br'}</span>
                </button>

                <button
                  onClick={handleEnviarWhatsApp}
                  className="btn btn-primary btn-sm"
                  style={{ background: '#22c55e', border: 'none' }}
                  title="Enviar mensagem com o link no WhatsApp do contratado"
                >
                  <Send size={13} />
                  <span>WhatsApp do Ativista</span>
                </button>

                <button
                  onClick={() => setShowQrCode(!showQrCode)}
                  className="btn btn-secondary btn-sm"
                  title="Exibir QR Code para leitura presencial no comitê"
                >
                  <QrCode size={13} />
                  <span>{showQrCode ? 'Ocultar QR' : 'QR Code Comitê'}</span>
                </button>

                {!isAssinado && (
                  <button
                    onClick={handleSimularAssinatura}
                    disabled={simulating}
                    className="btn btn-secondary btn-sm"
                    style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
                    title="Simular assinatura Gov.br para testar a homologação"
                  >
                    <RefreshCw size={13} className={simulating ? 'animate-spin' : ''} />
                    <span>{simulating ? 'Validando...' : 'Simular Assinatura (Teste)'}</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Modalidade QR Code na tela para leitura no balcão do comitê */}
        {showQrCode && govBrLink && (
          <div
            style={{
              padding: '16px',
              background: 'var(--bg-surface-elevated)',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '24px',
            }}
          >
            <div
              style={{
                padding: '12px',
                background: '#ffffff',
                borderRadius: '12px',
                display: 'inline-block',
                boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
              }}
            >
              {/* Fallback de QR Code visual para o link oficial */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(govBrLink)}`}
                alt="QR Code Assinatura Gov.br"
                style={{ width: '130px', height: '130px', display: 'block' }}
              />
            </div>
            <div style={{ maxWidth: '340px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Assinatura no Balcão do Comitê
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 10px 0' }}>
                Peça para {member.nome_completo} apontar a câmera do celular para este QR Code. O portal Gov.br abrirá na hora para autenticação biométrica.
              </p>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                Link: {govBrLink}
              </div>
            </div>
          </div>
        )}

        {/* ─── CORPO DO DOCUMENTO (A4 PREVIEW OU TEXTO) ─────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: 'var(--bg-main)' }}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <RefreshCw size={26} className="animate-spin" style={{ margin: '0 auto 12px auto', color: 'var(--primary)' }} />
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Compilando minuta contratual oficial...</p>
            </div>
          ) : viewMode === 'preview' ? (
            <div
              style={{
                maxWidth: '820px',
                margin: '0 auto',
                background: '#ffffff',
                color: '#0f172a',
                padding: '36px 44px',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
                fontFamily: '"Times New Roman", Times, serif',
                fontSize: '11pt',
                lineHeight: 1.5,
              }}
            >
              {/* Cabeçalho A4 */}
              <div style={{ textAlign: 'center', borderBottom: '2px solid #047857', paddingBottom: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'inline-block', background: '#065f46', color: '#ffffff', fontSize: '9pt', fontWeight: 'bold', padding: '2px 10px', borderRadius: '4px', textTransform: 'uppercase', marginBottom: '6px', fontFamily: 'Arial, sans-serif' }}>
                  Justiça Eleitoral • Eleições Gerais 2026 • Santos/SP
                </div>
                <h1 style={{ fontSize: '13pt', fontWeight: 'bold', margin: '4px 0', textTransform: 'uppercase', color: '#0f172a', fontFamily: 'Arial, sans-serif' }}>
                  Contrato de Prestação de Serviços Temporários de Campanha
                </h1>
                <h2 style={{ fontSize: '10pt', fontWeight: 'normal', color: '#475569', margin: 0, fontFamily: 'Arial, sans-serif' }}>
                  Regido pelo Artigo 100 da Lei Federal nº 9.504/1997 e Resolução TSE nº 23.607/2019
                </h2>
                <div style={{ marginTop: '6px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      background: jornada === 'MEIO_PERIODO' ? '#dbeafe' : '#fef3c7',
                      color: jornada === 'MEIO_PERIODO' ? '#1e40af' : '#92400e',
                      border: `1px solid ${jornada === 'MEIO_PERIODO' ? '#93c5fd' : '#fcd34d'}`,
                      fontSize: '9pt',
                      fontWeight: 'bold',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontFamily: 'Arial, sans-serif',
                    }}
                  >
                    MODALIDADE: {jornada === 'MEIO_PERIODO' ? 'MEIO PERÍODO (20 HORAS SEMANAIS)' : 'PERÍODO INTEGRAL (40 HORAS SEMANAIS)'}
                  </span>
                </div>
              </div>

              {/* Qualificação */}
              <div style={{ fontSize: '10pt', fontWeight: 'bold', color: '#047857', borderBottom: '1px solid #e2e8f0', paddingBottom: '2px', marginTop: '12px', fontFamily: 'Arial, sans-serif' }}>
                1. Qualificação das Partes Contratantes
              </div>
              <div style={{ fontSize: '10pt', fontFamily: 'Arial, sans-serif', margin: '8px 0 16px 0', lineHeight: 1.6 }}>
                <div><strong>CONTRATANTE:</strong> CAMPANHA ELEITORAL 2026 - {contractData?.candidate?.nome?.toUpperCase() || 'GUSTAVO REIS'} | CNPJ: {contractData?.candidate?.cnpj || '55.955.000/0001-26'}</div>
                <div><strong>CONTRATADO(A):</strong> {member.nome_completo.toUpperCase()} | CPF: {member.cpf} | RG: {member.rg} ({member.rg_orgao_emissor || 'SSP/SP'})</div>
                <div><strong>LOCAL & CONTATO:</strong> Bairro {member.bairro}, Santos/SP • WhatsApp: {member.telefone_whatsapp} • Zona Eleitoral: {member.zona_eleitoral || '118ª'}</div>
                <div><strong>QUITAÇÃO EXCLUSIVA (TSE):</strong> Chave PIX: {member.chave_pix || member.cpf} (Vinculada ao CPF do titular)</div>
              </div>

              {/* Cláusulas Principais */}
              <div style={{ textAlign: 'justify', fontSize: '10.5pt', lineHeight: 1.55 }}>
                <p><strong>CLÁUSULA 1ª – DO OBJETO:</strong> O presente instrumento tem por objeto a prestação de serviços de apoio operacional, distribuição de material informativo de campanha e mobilização cívica de rua no município de Santos/SP.</p>

                <div style={{ borderLeft: '4px solid #047857', background: '#ecfdf5', padding: '10px 14px', margin: '12px 0', fontSize: '10pt', fontFamily: 'Arial, sans-serif' }}>
                  <strong>CLÁUSULA 2ª – DA TOTAL INEXISTÊNCIA DE VÍNCULO EMPREGATÍCIO (ART. 100 DA LEI Nº 9.504/1997):</strong><br/>
                  Conforme preceitua imperativamente o Art. 100 da Lei Federal nº 9.504/1997, este contrato <strong>NÃO GERA QUALQUER VÍNCULO EMPREGATÍCIO</strong> com o candidato ou partido contratante, tratando-se de relação civil e eleitoral sem direitos da CLT.
                </div>

                <p><strong>CLÁUSULA 3ª – DA JORNADA DE ATIVIDADES:</strong> {jornada === 'MEIO_PERIODO' ? 'A execução se dará em regime de MEIO PERÍODO (até 20 horas semanais, 4h diárias) em itinerários alinhados com a coordenação, sem exclusividade funcional.' : 'A execução se dará em regime de PERÍODO INTEGRAL (até 40 horas semanais, 8h diárias com intervalo para repouso) em conformidade com o cronograma eleitoral.'}</p>

                <p><strong>CLÁUSULA 4ª – DA REMUNERAÇÃO E PRESTAÇÃO DE CONTAS TSE:</strong> Pela prestação pontual, a CONTRATANTE pagará o valor líquido total de <strong>R$ {Number(member.remuneracao_pactuada || (jornada === 'MEIO_PERIODO' ? 1500 : 3000)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>, pago exclusivamente via Conta Bancária Eleitoral através de PIX para a chave do(a) CONTRATADO(A) (Resolução TSE 23.607/2019).</p>

                <p><strong>CLÁUSULA 5ª – DA VEDAÇÃO ABSOLUTA DE BOCA DE URNA:</strong> É expressamente proibida qualquer prática de boca de urna no dia da eleição (Art. 39, § 5º da Lei 9.504/97) ou agressões, sob pena de rescisão imediata e responsabilidade penal pessoal.</p>

                <div style={{ border: '1.5px solid #2563eb', background: '#eff6ff', borderRadius: '6px', padding: '10px 14px', margin: '12px 0', fontSize: '9.5pt', fontFamily: 'Arial, sans-serif' }}>
                  <strong>CLÁUSULA 6ª – DA ASSINATURA ELETRÔNICA AVANÇADA GOV.BR (LEI Nº 14.063/2020):</strong><br/>
                  As partes elegem a assinatura eletrônica avançada via Portal Gov.br (ITI), possuindo fé pública e pleno valor probatório perante a Justiça Eleitoral, dispensando firma em cartório.
                </div>

                <p><strong>CLÁUSULA 7ª – DO FORO:</strong> Eleito o Foro da Comarca de Santos/SP.</p>
              </div>

              {/* Bloco de Assinatura e Carimbo ITI */}
              <div style={{ marginTop: '28px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center', fontSize: '9.5pt', fontFamily: 'Arial, sans-serif' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ borderTop: '1px solid #334155', paddingTop: '4px', fontWeight: 'bold' }}>
                      CAMPANHA ELEITORAL 2026
                    </div>
                    <div style={{ fontSize: '8.5pt', color: '#475569' }}>CONTRATANTE</div>
                  </div>
                  <div style={{ width: '40px' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ borderTop: '1px solid #334155', paddingTop: '4px', fontWeight: 'bold' }}>
                      {member.nome_completo.toUpperCase()}
                    </div>
                    <div style={{ fontSize: '8.5pt', color: '#475569' }}>CONTRATADO(A) • CPF: {member.cpf}</div>
                  </div>
                </div>

                {/* Selo ITI Gov.br */}
                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                  <div
                    style={{
                      display: 'inline-block',
                      border: isAssinado ? '2px solid #059669' : '2px dashed #2563eb',
                      background: isAssinado ? '#ecfdf5' : '#f8fafc',
                      padding: '10px 18px',
                      borderRadius: '8px',
                      fontFamily: 'Arial, sans-serif',
                      fontSize: '8.5pt',
                      color: isAssinado ? '#065f46' : '#1e3a8a',
                    }}
                  >
                    <strong>
                      {isAssinado ? '✅ DOCUMENTO ASSINADO DIGITALMENTE NO PORTAL GOV.BR' : '🔒 DOCUMENTO PREPARADO PARA ASSINATURA ELETRÔNICA GOV.BR'}
                    </strong>
                    <br />
                    Signatário: {member.nome_completo.toUpperCase()} • CPF: {member.cpf}
                    <br />
                    Certificado ICP-Brasil / ITI • Autenticado sob os termos da Lei Federal nº 14.063/2020
                    <br />
                    {sha256Hash && <span style={{ fontFamily: 'monospace', fontSize: '7.5pt' }}>SHA-256: {sha256Hash}</span>}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                maxWidth: '820px',
                margin: '0 auto',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: '24px',
              }}
            >
              <pre
                style={{
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  color: 'var(--text-primary)',
                  lineHeight: 1.6,
                }}
              >
                {contractData?.plainText}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
