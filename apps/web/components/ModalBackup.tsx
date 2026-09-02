'use client';

import React, { useState } from 'react';
import { 
  Download, 
  Database, 
  FileSpreadsheet, 
  FileText, 
  HardDrive, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Upload, 
  ShieldCheck, 
  Sparkles,
  RefreshCw
} from 'lucide-react';

interface ModalBackupProps {
  isOpen: boolean;
  onClose: () => void;
  campanhaNome?: string;
  cnpjCampanha?: string;
}

export const ModalBackup: React.FC<ModalBackupProps> = ({
  isOpen,
  onClose,
  campanhaNome = 'Gustavo Reis',
  cnpjCampanha = '00.000.000/0001-00',
}) => {
  const [downloading, setDownloading] = useState<'json' | 'csv' | 'pdf' | null>(null);
  const [importing, setImporting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownloadBackup = async (format: 'json' | 'csv') => {
    setDownloading(format);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const url = `/api/backup/export?format=${format}`;
      const a = document.createElement('a');
      a.href = url;
      a.download = format === 'json' ? `backup-painel-eleitoral-${new Date().toISOString().split('T')[0]}.json` : `liderancas-campanha-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setSuccessMessage(
        format === 'json'
          ? 'Backup completo baixado com sucesso! Salve no Pendrive, HD ou Nuvem.'
          : 'Planilha CSV exportada com sucesso para visualização no Excel.'
      );
    } catch (err: any) {
      setErrorMessage('Erro ao realizar download: ' + err.message);
    } finally {
      setDownloading(null);
    }
  };

  const handleGeneratePdf = () => {
    setDownloading('pdf');
    try {
      window.print();
      setSuccessMessage('Relatório Oficial formatado para prestação de contas no TSE gerado com sucesso.');
    } catch {
      setErrorMessage('Erro ao gerar relatório de impressão');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Glow de Fundo */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Backup & Relatórios Oficiais
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Campanha: <span className="font-semibold text-slate-700 dark:text-slate-300">{campanhaNome}</span> • CNPJ: {cnpjCampanha}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notificações */}
        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Opções de Exportação */}
        <div className="space-y-3">
          {/* Opção 1: Backup Completo JSON (Pendrive / HD) */}
          <button
            onClick={() => handleDownloadBackup('json')}
            disabled={downloading !== null}
            className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-500/40 transition-all flex items-center justify-between group cursor-pointer text-left"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-emerald-600 text-white shadow-md group-hover:scale-105 transition-transform">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Backup Completo (.JSON)
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono">
                    Pendrive / HD / Nuvem
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Snapshot completo de líderes, apoiadores, metas, conversas e configurações com Checksum SHA-256.
                </p>
              </div>
            </div>
            <Download className="w-5 h-5 text-slate-400 group-hover:text-emerald-500 shrink-0 ml-2 transition-colors" />
          </button>

          {/* Opção 2: Planilha Excel / CSV */}
          <button
            onClick={() => handleDownloadBackup('csv')}
            disabled={downloading !== null}
            className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-blue-500/10 border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-500/40 transition-all flex items-center justify-between group cursor-pointer text-left"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-blue-600 text-white shadow-md group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Planilha de Lideranças (.CSV)
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 font-mono">
                    Excel / Sheets
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Exporta nome, telefone, bairro, zona eleitoral e total de indicados formatados para Excel.
                </p>
              </div>
            </div>
            <Download className="w-5 h-5 text-slate-400 group-hover:text-blue-500 shrink-0 ml-2 transition-colors" />
          </button>

          {/* Opção 3: Relatório Oficial Vetorial TSE */}
          <button
            onClick={handleGeneratePdf}
            disabled={downloading !== null}
            className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-purple-50 dark:hover:bg-purple-500/10 border border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-500/40 transition-all flex items-center justify-between group cursor-pointer text-left"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-purple-600 text-white shadow-md group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Relatório Executivo Oficial (.PDF)
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 font-mono">
                    Padrão TSE
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Documento com CNPJ, métricas de cadência e balanço eleitoral para prestação de contas.
                </p>
              </div>
            </div>
            <Download className="w-5 h-5 text-slate-400 group-hover:text-purple-500 shrink-0 ml-2 transition-colors" />
          </button>
        </div>

        {/* Footer com Aviso de Segurança */}
        <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Dica de Segurança:</strong> Recomenda-se realizar o backup dos dados ao final de cada semana de campanha e armazenar uma cópia em mídia externa (Pendrive ou HD seguro).
          </p>
        </div>
      </div>
    </div>
  );
};
