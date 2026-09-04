'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  DollarSign,
  Receipt,
  Camera,
  Plus,
  Search,
  Filter,
  FileDown,
  Trash2,
  Edit3,
  CheckCircle2,
  Clock,
  XCircle,
  UploadCloud,
  Sparkles,
  ExternalLink,
  Eye,
  AlertTriangle,
  Fuel,
  Utensils,
  Printer,
  Megaphone,
  Users,
  Briefcase,
  Truck,
  HelpCircle,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  X,
  CreditCard,
  QrCode,
} from 'lucide-react';

interface GastoItem {
  id: string;
  descricao: string;
  categoria: string;
  valor: string | number;
  data_gasto: string;
  forma_pagamento: string;
  fornecedor_nome?: string | null;
  fornecedor_documento?: string | null;
  numero_documento?: string | null;
  comprovante_url?: string | null;
  responsavel_nome?: string | null;
  status_auditoria: 'APROVADO' | 'PENDENTE' | 'REJEITADO';
  observacoes?: string | null;
  created_at: string;
}

interface KPIs {
  totalGasto: number;
  totalAprovado: number;
  totalPendente: number;
  totalRejeitado: number;
  totalRegistros: number;
  countPendentes: number;
  tetoLegalTSE: number;
}

interface CategoriaStats {
  categoria: string;
  total: number;
  quantidade: number;
}

const CATEGORIAS_INFO: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string }
> = {
  COMBUSTIVEL: { label: 'Combustível', icon: Fuel, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
  ALIMENTACAO: { label: 'Alimentação', icon: Utensils, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' },
  MATERIAL_GRAFICO: { label: 'Material Gráfico', icon: Printer, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/30' },
  EVENTOS: { label: 'Eventos / Comício', icon: Megaphone, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' },
  IMPULSIONAMENTO: { label: 'Tráfego Pago / Redes', icon: Sparkles, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
  PESSOAL: { label: 'Pessoal & Cabos', icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  JURIDICO_CONTABIL: { label: 'Jurídico & Contábil', icon: Briefcase, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/30' },
  TRANSPORTE: { label: 'Transporte & Locação', icon: Truck, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30' },
  OUTROS: { label: 'Outras Despesas', icon: HelpCircle, color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/30' },
};

export function ControleGastos() {
  const [gastos, setGastos] = useState<GastoItem[]>([]);
  const [kpis, setKpis] = useState<KPIs>({
    totalGasto: 0,
    totalAprovado: 0,
    totalPendente: 0,
    totalRejeitado: 0,
    totalRegistros: 0,
    countPendentes: 0,
    tetoLegalTSE: 350000.0,
  });
  const [distribuicao, setDistribuicao] = useState<CategoriaStats[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('TODAS');
  const [statusFiltro, setStatusFiltro] = useState('TODOS');
  const [formaFiltro, setFormaFiltro] = useState('TODAS');

  // Modais
  const [modalFormAberto, setModalFormAberto] = useState(false);
  const [modalOcrAberto, setModalOcrAberto] = useState(false);
  const [fotoZoomUrl, setFotoZoomUrl] = useState<string | null>(null);
  const [gastoEmEdicao, setGastoEmEdicao] = useState<GastoItem | null>(null);

  // Estado do Formulário
  const [formData, setFormData] = useState({
    descricao: '',
    categoria: 'COMBUSTIVEL',
    valor: '',
    data_gasto: new Date().toISOString().split('T')[0],
    forma_pagamento: 'PIX',
    fornecedor_nome: '',
    fornecedor_documento: '',
    numero_documento: '',
    comprovante_url: '',
    responsavel_nome: 'Comitê Financeiro',
    status_auditoria: 'APROVADO' as 'APROVADO' | 'PENDENTE' | 'REJEITADO',
    observacoes: '',
  });

  // Estado do OCR / IA
  const [ocrArquivo, setOcrArquivo] = useState<File | null>(null);
  const [ocrPreview, setOcrPreview] = useState<string | null>(null);
  const [ocrProcessando, setOcrProcessando] = useState(false);
  const [ocrFeedback, setOcrFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchGastos = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (categoriaFiltro !== 'TODAS') queryParams.append('categoria', categoriaFiltro);
      if (statusFiltro !== 'TODOS') queryParams.append('status', statusFiltro);
      if (formaFiltro !== 'TODAS') queryParams.append('forma_pagamento', formaFiltro);
      if (search.trim()) queryParams.append('search', search.trim());

      const res = await fetch(`/api/gastos?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setGastos(data.data || []);
        if (data.kpis) setKpis(data.kpis);
        if (data.distribuicaoCategorias) setDistribuicao(data.distribuicaoCategorias);
      }
    } catch (err) {
      console.error('Erro ao carregar despesas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGastos();
  }, [categoriaFiltro, statusFiltro, formaFiltro]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchGastos();
  };

  const formatBRL = (val: number | string) => {
    const num = typeof val === 'number' ? val : parseFloat(String(val)) || 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
  };

  const handleSalvarGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.descricao || !formData.valor) {
        alert('Informe ao menos a descrição e o valor da despesa.');
        return;
      }

      if (gastoEmEdicao) {
        // Atualizar
        const res = await fetch(`/api/gastos/${gastoEmEdicao.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || 'Erro ao atualizar');
      } else {
        // Criar
        const res = await fetch('/api/gastos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || 'Erro ao cadastrar');
      }

      setModalFormAberto(false);
      setGastoEmEdicao(null);
      resetForm();
      fetchGastos();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar gasto');
    }
  };

  const handleExcluirGasto = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta despesa do controle de gastos?')) return;
    try {
      const res = await fetch(`/api/gastos/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchGastos();
      } else {
        alert('Não foi possível excluir o gasto.');
      }
    } catch (err) {
      console.error('Erro ao excluir:', err);
    }
  };

  const handleAlterarStatus = async (item: GastoItem, novoStatus: 'APROVADO' | 'PENDENTE' | 'REJEITADO') => {
    try {
      await fetch(`/api/gastos/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status_auditoria: novoStatus }),
      });
      fetchGastos();
    } catch (err) {
      console.error('Erro ao mudar status:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      descricao: '',
      categoria: 'COMBUSTIVEL',
      valor: '',
      data_gasto: new Date().toISOString().split('T')[0],
      forma_pagamento: 'PIX',
      fornecedor_nome: '',
      fornecedor_documento: '',
      numero_documento: '',
      comprovante_url: '',
      responsavel_nome: 'Comitê Financeiro',
      status_auditoria: 'APROVADO',
      observacoes: '',
    });
  };

  const handleAbrirEdicao = (item: GastoItem) => {
    setGastoEmEdicao(item);
    setFormData({
      descricao: item.descricao,
      categoria: item.categoria,
      valor: String(item.valor),
      data_gasto: item.data_gasto ? new Date(item.data_gasto).toISOString().split('T')[0] : '',
      forma_pagamento: item.forma_pagamento,
      fornecedor_nome: item.fornecedor_nome || '',
      fornecedor_documento: item.fornecedor_documento || '',
      numero_documento: item.numero_documento || '',
      comprovante_url: item.comprovante_url || '',
      responsavel_nome: item.responsavel_nome || 'Comitê Financeiro',
      status_auditoria: item.status_auditoria,
      observacoes: item.observacoes || '',
    });
    setModalFormAberto(true);
  };

  // Processamento de Foto com IA
  const handleSelecionarArquivoOcr = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setOcrArquivo(file);
      const previewUrl = URL.createObjectURL(file);
      setOcrPreview(previewUrl);
      setOcrFeedback(null);
    }
  };

  const handleExecutarOcrIA = async () => {
    if (!ocrArquivo) return;
    try {
      setOcrProcessando(true);
      setOcrFeedback('1/2 Fazendo upload seguro do comprovante...');

      // 1. Upload do arquivo
      const uploadFormData = new FormData();
      uploadFormData.append('file', ocrArquivo);

      const uploadRes = await fetch('/api/gastos/upload', {
        method: 'POST',
        body: uploadFormData,
      });
      const uploadData = await uploadRes.json();

      if (!uploadRes.ok || !uploadData.url) {
        throw new Error(uploadData.error || 'Falha no upload do arquivo');
      }

      setOcrFeedback('2/2 Inteligência Artificial analisando itens, valores e CNPJ...');

      // 2. Extração via IA Groq
      const ocrRes = await fetch('/api/gastos/ocr-ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: uploadData.url,
          filename: ocrArquivo.name,
        }),
      });

      const ocrResult = await ocrRes.json();
      const extracted = ocrResult.data || {};

      // Pré-preenche o formulário com os dados identificados pela IA!
      setFormData({
        descricao: extracted.descricao || 'Despesa identificada em comprovante',
        categoria: extracted.categoria || 'OUTROS',
        valor: String(extracted.valor || ''),
        data_gasto: extracted.data_gasto || new Date().toISOString().split('T')[0],
        forma_pagamento: extracted.forma_pagamento || 'PIX',
        fornecedor_nome: extracted.fornecedor_nome || '',
        fornecedor_documento: extracted.fornecedor_documento || '',
        numero_documento: extracted.numero_documento || '',
        comprovante_url: uploadData.url,
        responsavel_nome: 'Comitê Financeiro',
        status_auditoria: 'APROVADO',
        observacoes: extracted.observacoes || 'Extraído automaticamente por leitura de imagem IA.',
      });

      setOcrProcessando(false);
      setModalOcrAberto(false);
      setOcrArquivo(null);
      setOcrPreview(null);
      // Abre o modal de revisão para confirmação pelo usuário!
      setModalFormAberto(true);
    } catch (err: any) {
      console.error('Erro no OCR:', err);
      setOcrProcessando(false);
      setOcrFeedback(`Falha no processamento da imagem: ${err.message || String(err)}`);
    }
  };

  // Exportação CSV para contabilidade eleitoral
  const handleExportarCSV = () => {
    if (gastos.length === 0) {
      alert('Não há despesas cadastradas para exportação.');
      return;
    }

    const headers = [
      'Data',
      'Descricao',
      'Categoria',
      'Valor_R$',
      'Forma_Pagamento',
      'Fornecedor',
      'CNPJ_CPF',
      'Numero_Documento',
      'Status_Auditoria',
      'Responsavel',
      'Comprovante_URL',
    ];

    const rows = gastos.map((g) => [
      new Date(g.data_gasto).toLocaleDateString('pt-BR'),
      `"${g.descricao.replace(/"/g, '""')}"`,
      `"${CATEGORIAS_INFO[g.categoria]?.label || g.categoria}"`,
      typeof g.valor === 'number' ? g.valor.toFixed(2) : g.valor,
      g.forma_pagamento,
      `"${(g.fornecedor_nome || '').replace(/"/g, '""')}"`,
      `"${g.fornecedor_documento || ''}"`,
      `"${g.numero_documento || ''}"`,
      g.status_auditoria,
      `"${(g.responsavel_nome || '').replace(/"/g, '""')}"`,
      `"${g.comprovante_url || ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `prestacao_contas_gastos_campanha_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const porcentagemTeto = Math.min(100, Math.round((kpis.totalGasto / (kpis.tetoLegalTSE || 1)) * 100));

  return (
    <div className="space-y-6 pb-12">
      {/* ── Topo: Cabeçalho da Aba e Ações de Entrada ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                Controle de Gastos & Prestação de Contas
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Conformidade TSE
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Gestão fiscal auditável de despesas com inserção manual e reconhecimento inteligente de recibos por foto
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Botão Escanear Foto com IA */}
          <button
            onClick={() => {
              setOcrArquivo(null);
              setOcrPreview(null);
              setOcrFeedback(null);
              setModalOcrAberto(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer transform active:scale-95"
          >
            <Camera className="w-4 h-4 text-amber-100" />
            <span>Escanear Comprovante com IA</span>
          </button>

          {/* Botão Inserir Manual */}
          <button
            onClick={() => {
              setGastoEmEdicao(null);
              resetForm();
              setModalFormAberto(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-600/20 transition-all cursor-pointer transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Inserir Gasto Manual</span>
          </button>

          {/* Exportar CSV */}
          <button
            onClick={handleExportarCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold rounded-xl text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
            title="Exportar planilha para o contador"
          >
            <FileDown className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>

          <button
            onClick={fetchGastos}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-all cursor-pointer"
            title="Recarregar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Cards de KPIs Financeiros ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Acumulado */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Acumulado</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white tracking-tight">{formatBRL(kpis.totalGasto)}</div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
              <span>{kpis.totalRegistros} lançamentos efetuados</span>
            </div>
          </div>
        </div>

        {/* Teto Legal TSE */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Teto Legal TSE</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-white tracking-tight">{porcentagemTeto}%</span>
              <span className="text-xs text-slate-400 font-mono">de {formatBRL(kpis.tetoLegalTSE)}</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  porcentagemTeto > 90
                    ? 'bg-rose-500'
                    : porcentagemTeto > 75
                    ? 'bg-amber-500'
                    : 'bg-gradient-to-r from-emerald-500 to-cyan-500'
                }`}
                style={{ width: `${porcentagemTeto}%` }}
              />
            </div>
          </div>
        </div>

        {/* Pendentes de Auditoria */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Auditoria Pendente</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-400 tracking-tight">{formatBRL(kpis.totalPendente)}</div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
              <span className="font-bold text-amber-400">{kpis.countPendentes}</span> comprovantes aguardando validação
            </div>
          </div>
        </div>

        {/* Aprovados e Homologados */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gastos Homologados</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-cyan-400 tracking-tight">{formatBRL(kpis.totalAprovado)}</div>
            <div className="text-[11px] text-slate-500 mt-1">100% com documento fiscal anexado</div>
          </div>
        </div>
      </div>

      {/* ── Distribuição por Categorias (Barras Horizontais) ── */}
      {distribuicao.length > 0 && (
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span>Distribuição de Despesas por Categoria</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {distribuicao.map((item) => {
              const catConfig = CATEGORIAS_INFO[item.categoria] || CATEGORIAS_INFO.OUTROS;
              const Icon = catConfig.icon;
              const pct = kpis.totalGasto > 0 ? Math.round((item.total / kpis.totalGasto) * 100) : 0;

              return (
                <div key={item.categoria} className="p-3 rounded-xl bg-slate-800/50 border border-slate-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${catConfig.bg}`}>
                        <Icon className={`w-3.5 h-3.5 ${catConfig.color}`} />
                      </div>
                      <span className="text-xs font-bold text-slate-200">{catConfig.label}</span>
                    </div>
                    <span className="text-xs font-black text-white">{formatBRL(item.total)}</span>
                  </div>
                  <div className="mt-2.5">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span>{item.quantidade} lançamento(s)</span>
                      <span>{pct}% do total</span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Barra de Filtros & Busca ── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por descrição, fornecedor, CNPJ ou Nº da nota..."
            className="w-full bg-slate-800 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {/* Categoria */}
          <select
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
            className="bg-slate-800 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="TODAS">Todas Categorias</option>
            {Object.entries(CATEGORIAS_INFO).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>

          {/* Status */}
          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
            className="bg-slate-800 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="TODOS">Todos Status</option>
            <option value="APROVADO">Aprovados</option>
            <option value="PENDENTE">Pendentes</option>
            <option value="REJEITADO">Rejeitados</option>
          </select>

          {/* Forma de Pagamento */}
          <select
            value={formaFiltro}
            onChange={(e) => setFormaFiltro(e.target.value)}
            className="bg-slate-800 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="TODAS">Forma: Todas</option>
            <option value="PIX">PIX</option>
            <option value="CARTAO">Cartão</option>
            <option value="TRANSFERENCIA">Transferência</option>
            <option value="DINHEIRO">Dinheiro</option>
            <option value="BOLETO">Boleto</option>
          </select>
        </div>
      </div>

      {/* ── Tabela Principal de Despesas ── */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/40 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-4">Descrição & Categoria</th>
                <th className="py-3 px-4">Fornecedor / Doc</th>
                <th className="py-3 px-4">Pagamento</th>
                <th className="py-3 px-4 text-right">Valor</th>
                <th className="py-3 px-4 text-center">Comprovante</th>
                <th className="py-3 px-4 text-center">Auditoria</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {gastos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Receipt className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                    <p className="text-sm font-semibold text-slate-400">Nenhum gasto encontrado.</p>
                    <p className="text-xs text-slate-600 mt-1">
                      Clique em "Inserir Gasto Manual" ou "Escanear Comprovante com IA" para registrar uma despesa.
                    </p>
                  </td>
                </tr>
              ) : (
                gastos.map((item) => {
                  const catConfig = CATEGORIAS_INFO[item.categoria] || CATEGORIAS_INFO.OUTROS;
                  const CatIcon = catConfig.icon;

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                      {/* Data */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        {new Date(item.data_gasto).toLocaleDateString('pt-BR')}
                      </td>

                      {/* Descrição & Categoria */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-xs leading-snug">{item.descricao}</div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${catConfig.bg} ${catConfig.color}`}>
                            <CatIcon className="w-3 h-3" />
                            {catConfig.label}
                          </span>
                          {item.responsavel_nome && (
                            <span className="text-[10px] text-slate-500">por {item.responsavel_nome}</span>
                          )}
                        </div>
                      </td>

                      {/* Fornecedor */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-200 font-medium">{item.fornecedor_nome || '—'}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {item.fornecedor_documento && <span>CNPJ: {item.fornecedor_documento}</span>}
                          {item.numero_documento && <span> • NF: {item.numero_documento}</span>}
                        </div>
                      </td>

                      {/* Forma de Pagamento */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-300">
                          <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                          {item.forma_pagamento}
                        </span>
                      </td>

                      {/* Valor */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className="font-mono font-bold text-emerald-400 text-sm">{formatBRL(item.valor)}</span>
                      </td>

                      {/* Foto Comprovante */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {item.comprovante_url ? (
                          <button
                            onClick={() => setFotoZoomUrl(item.comprovante_url!)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 transition-all cursor-pointer text-[11px]"
                            title="Ver foto do comprovante fiscal"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver Foto</span>
                          </button>
                        ) : (
                          <span className="text-slate-600 text-[11px]">Sem foto</span>
                        )}
                      </td>

                      {/* Status de Auditoria */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {item.status_auditoria === 'APROVADO' && (
                          <button
                            onClick={() => handleAlterarStatus(item, 'PENDENTE')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 cursor-pointer hover:bg-emerald-500/20"
                            title="Clique para marcar como Pendente"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Aprovado
                          </button>
                        )}
                        {item.status_auditoria === 'PENDENTE' && (
                          <button
                            onClick={() => handleAlterarStatus(item, 'APROVADO')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 cursor-pointer hover:bg-amber-500/20 animate-pulse"
                            title="Clique para Aprovar"
                          >
                            <Clock className="w-3 h-3" />
                            Pendente
                          </button>
                        )}
                        {item.status_auditoria === 'REJEITADO' && (
                          <button
                            onClick={() => handleAlterarStatus(item, 'PENDENTE')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 cursor-pointer hover:bg-rose-500/20"
                            title="Clique para reavaliar"
                          >
                            <XCircle className="w-3 h-3" />
                            Rejeitado
                          </button>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleAbrirEdicao(item)}
                            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Editar Despesa"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleExcluirGasto(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal: Escanear Foto com IA (OCR) ── */}
      {modalOcrAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => {
                setModalOcrAberto(false);
                setOcrArquivo(null);
                setOcrPreview(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/20">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Escanear Comprovante com IA
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </h3>
                <p className="text-xs text-slate-400">
                  Tire uma foto ou envie a imagem da nota fiscal, cupom ou comprovante PIX
                </p>
              </div>
            </div>

            {/* Dropzone / Upload */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-amber-500/70 rounded-2xl p-6 text-center cursor-pointer transition-all bg-slate-800/40 hover:bg-slate-800/80"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleSelecionarArquivoOcr}
                className="hidden"
              />

              {ocrPreview ? (
                <div className="space-y-3">
                  <img
                    src={ocrPreview}
                    alt="Preview do comprovante"
                    className="max-h-56 mx-auto rounded-xl object-contain border border-slate-700 shadow-md"
                  />
                  <p className="text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Imagem carregada: {ocrArquivo?.name}
                  </p>
                  <p className="text-[11px] text-slate-500">Clique para trocar de foto</p>
                </div>
              ) : (
                <div className="space-y-3 py-4">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 mx-auto flex items-center justify-center border border-amber-500/20">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Toque aqui para tirar foto ou selecionar imagem</p>
                    <p className="text-[11px] text-slate-400 mt-1">Suporta JPG, PNG, WEBP de notas, recibos e telas de PIX</p>
                  </div>
                </div>
              )}
            </div>

            {/* Status / Feedback da IA */}
            {ocrFeedback && (
              <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-spin text-amber-400 flex-shrink-0" />
                <span>{ocrFeedback}</span>
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalOcrAberto(false)}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!ocrArquivo || ocrProcessando}
                onClick={handleExecutarOcrIA}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 rounded-xl shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {ocrProcessando ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processando via IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-100" />
                    <span>Analisar e Preencher</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Inserção / Edição de Gasto Manual ── */}
      {modalFormAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative my-8">
            <button
              onClick={() => setModalFormAberto(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {gastoEmEdicao ? 'Editar Lançamento de Despesa' : 'Novo Lançamento de Despesa'}
                </h3>
                <p className="text-xs text-slate-400">
                  Preencha os dados contábeis e anexe comprovante fiscal para a prestação de contas
                </p>
              </div>
            </div>

            <form onSubmit={handleSalvarGasto} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Descrição */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Descrição da Despesa *</label>
                  <input
                    type="text"
                    required
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Ex: Abastecimento de Gasolina Van Campanha 01"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Valor */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Valor (R$) *</label>
                  <input
                    type="text"
                    required
                    value={formData.valor}
                    onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                    placeholder="Ex: 250,00"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Categoria */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Categoria do Gasto</label>
                  <select
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {Object.entries(CATEGORIAS_INFO).map(([key, item]) => (
                      <option key={key} value={key}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Data */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Data da Despesa</label>
                  <input
                    type="date"
                    required
                    value={formData.data_gasto}
                    onChange={(e) => setFormData({ ...formData, data_gasto: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Forma de Pagamento */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Forma de Pagamento</label>
                  <select
                    value={formData.forma_pagamento}
                    onChange={(e) => setFormData({ ...formData, forma_pagamento: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="PIX">PIX (Conta Oficial de Campanha)</option>
                    <option value="CARTAO">Cartão de Débito / Crédito</option>
                    <option value="TRANSFERENCIA">Transferência / TED</option>
                    <option value="DINHEIRO">Espécie (Fundo de Caixa)</option>
                    <option value="BOLETO">Boleto Bancário</option>
                  </select>
                </div>

                {/* Fornecedor */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Fornecedor / Razão Social</label>
                  <input
                    type="text"
                    value={formData.fornecedor_nome}
                    onChange={(e) => setFormData({ ...formData, fornecedor_nome: e.target.value })}
                    placeholder="Ex: Auto Posto Estrela Ltda"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* CNPJ / CPF do Fornecedor */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">CNPJ ou CPF do Fornecedor</label>
                  <input
                    type="text"
                    value={formData.fornecedor_documento}
                    onChange={(e) => setFormData({ ...formData, fornecedor_documento: e.target.value })}
                    placeholder="Ex: 12.345.678/0001-90"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Nº do Documento Fiscal */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Nº da Nota / Cupom Fiscal</label>
                  <input
                    type="text"
                    value={formData.numero_documento}
                    onChange={(e) => setFormData({ ...formData, numero_documento: e.target.value })}
                    placeholder="Ex: NF-e 004812"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Status de Auditoria */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Status de Auditoria</label>
                  <select
                    value={formData.status_auditoria}
                    onChange={(e) => setFormData({ ...formData, status_auditoria: e.target.value as any })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="APROVADO">Aprovado (Validado com Recibo)</option>
                    <option value="PENDENTE">Pendente de Comprovação</option>
                    <option value="REJEITADO">Rejeitado</option>
                  </select>
                </div>

                {/* Foto / Link do Comprovante */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    URL da Foto do Comprovante (opcional)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={formData.comprovante_url}
                      onChange={(e) => setFormData({ ...formData, comprovante_url: e.target.value })}
                      placeholder="Ex: /uploads/gastos/recibo_01.jpg"
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                    {formData.comprovante_url && (
                      <button
                        type="button"
                        onClick={() => setFotoZoomUrl(formData.comprovante_url)}
                        className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 text-xs font-bold flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Ver
                      </button>
                    )}
                  </div>
                </div>

                {/* Observações */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Observações Fiscais</label>
                  <textarea
                    rows={2}
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    placeholder="Informações adicionais relevantes para o fechamento contábil..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalFormAberto(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-600/20 transition-all cursor-pointer font-sans"
                >
                  {gastoEmEdicao ? 'Atualizar Despesa' : 'Salvar no Controle de Gastos'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Lightbox: Visualizar Foto do Comprovante ── */}
      {fotoZoomUrl && (
        <div
          onClick={() => setFotoZoomUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200 cursor-zoom-out"
        >
          <div className="relative max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-400" />
                Comprovante Fiscal Digitalizado
              </span>
              <button
                onClick={() => setFotoZoomUrl(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center">
              <img
                src={fotoZoomUrl}
                alt="Comprovante de Despesa"
                className="max-h-[75vh] w-auto rounded-xl object-contain shadow-md"
              />
            </div>
            <div className="p-3 border-t border-slate-800 text-right">
              <a
                href={fotoZoomUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:underline font-bold"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Abrir Imagem em Nova Aba
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
