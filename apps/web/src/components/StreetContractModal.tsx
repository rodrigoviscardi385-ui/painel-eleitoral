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
} from 'lucide-react';
import { api } from '../api';

interface StreetContractModalProps {
  member: any;
  onClose: () => void;
  onSuccess?: () => void;
}

export const StreetContractModal: React.FC<StreetContractModalProps> = ({ member, onClose }) => {
  const [jornada, setJornada] = useState<'MEIO_PERIODO' | 'PERIODO_INTEGRAL'>(
    member.tipo_jornada === 'PERIODO_INTEGRAL' ? 'PERIODO_INTEGRAL' : 'MEIO_PERIODO'
  );
  const [contractData, setContractData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'preview' | 'text'>('preview');
  const [copied, setCopied] = useState(false);

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

  const handleCopyText = () => {
    if (!contractData?.plainText) return;
    navigator.clipboard.writeText(contractData.plainText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
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

  const handleOpenRawHtml = () => {
    const url = `/api/equipe-rua/${member.id}/contrato?tipo_jornada=${jornada}&format=html`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border-b border-emerald-800/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">Contrato Oficial TSE • Equipe de Rua</h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Lei 9.504/97 Art. 100
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {member.nome_completo} • CPF: {member.cpf} • {member.bairro}, {member.cidade || 'Santos'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Selectors */}
        <div className="px-6 py-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          {/* Seletor de Jornada: Meio Período vs Período Integral */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-emerald-400" /> Modalidade:
            </span>
            <div className="inline-flex rounded-xl bg-slate-800/90 p-1 border border-slate-700">
              <button
                type="button"
                onClick={() => setJornada('MEIO_PERIODO')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  jornada === 'MEIO_PERIODO'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Meio Período (4h / 20h sem.)
              </button>
              <button
                type="button"
                onClick={() => setJornada('PERIODO_INTEGRAL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  jornada === 'PERIODO_INTEGRAL'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-900/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                Período Integral (8h / 40h sem.)
              </button>
            </div>
          </div>

          {/* Ações: Imprimir, Copiar, Alternar modo */}
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
              <button
                onClick={() => setViewMode('preview')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'preview' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Visualizar A4
              </button>
              <button
                onClick={() => setViewMode('text')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'text' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Texto Minuta
              </button>
            </div>

            <button
              onClick={handleCopyText}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Copiar texto jurídico do contrato"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>

            <button
              onClick={handleOpenRawHtml}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Abrir página em tela cheia"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Aba Cheia
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-900/30 transition-all hover:scale-[1.02]"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir / PDF
            </button>
          </div>
        </div>

        {/* Banner de Aviso Jurídico Obrigatório */}
        <div className="px-6 py-2 bg-emerald-950/40 border-b border-emerald-900/40 flex items-center gap-3 text-xs text-emerald-300">
          <AlertTriangle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>
            <strong>Blindagem Jurídica:</strong> Conforme Art. 100 da Lei 9.504/97, a prestação de serviços eleitorais não gera vínculo empregatício.
            Pagamento via Conta Eleitoral de Campanha ({contractData?.candidate?.cnpj || 'CNPJ do Candidato'}).
          </span>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950">
          {loading ? (
            <div className="h-96 flex flex-col items-center justify-center text-slate-400">
              <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm font-medium">Acionando equipe jurídica e redigindo contrato TSE...</p>
              <p className="text-xs text-slate-500 mt-1">Conferindo dados civis, bancários e regras eleitorais</p>
            </div>
          ) : viewMode === 'preview' ? (
            <div className="flex justify-center">
              {/* Paper Sheet Preview */}
              <div className="w-full max-w-3xl bg-white text-slate-900 rounded-lg shadow-2xl p-8 sm:p-12 border border-slate-300 font-serif leading-relaxed text-sm transition-all select-text">
                <iframe
                  title="Contrato Eleitoral TSE"
                  srcDoc={contractData?.printableHtml}
                  className="w-full h-[650px] border-0 rounded bg-white"
                />
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed select-all">
              {contractData?.plainText}
            </div>
          )}
        </div>

        {/* Footer Summary */}
        <div className="px-6 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Contratado: <strong className="text-white">{member.nome_completo}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              Remuneração: <strong className="text-emerald-400">R$ {Number(contractData?.valorRemuneracao || 1500).toFixed(2)}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Vigência: <strong>{contractData?.dataInicio} a {contractData?.dataFim}</strong>
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
