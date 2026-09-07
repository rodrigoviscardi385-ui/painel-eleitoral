import React, { useState, useEffect } from 'react';
import {
  X,
  UserPlus,
  Target,
  PlusCircle,
  Pencil,
  Trash2,
  AlertTriangle,
  Download,
  Database,
  FileSpreadsheet,
  FileText,
  Upload,
  ShieldCheck,
  CheckCircle2,
  Shield,
  Phone,
  MapPin,
  Vote,
  Link,
  RefreshCw,
  AlertCircle,
  Package,
  Calendar,
  Clock,
  Plus,
  Camera,
  Search,
  School,
  Building2,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';
import { api } from '../api.ts';

import { buscarLocaisSantos, LOCAIS_SANTOS_BASE } from '../data/locaisVotacaoSantos.ts';

// ─── Componente Seletor de Escolas e Locais de Votação de Santos ─────────────
export const SeletorLocalVotacaoSantos: React.FC<{
  onSelectLocal: (local: { nome_escola: string; bairro: string; zona_eleitoral: string; secoes: number[]; endereco: string }) => void;
  selectedEscola?: string;
}> = ({ onSelectLocal, selectedEscola }) => {
  const [busca, setBusca] = useState(selectedEscola || '');
  const [locais, setLocais] = useState<any[]>(LOCAIS_SANTOS_BASE);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Busca instantânea local (com tolerância a acentos) + chamada à API assíncrona
  useEffect(() => {
    const termo = busca.trim();
    if (!termo) {
      setLocais(LOCAIS_SANTOS_BASE);
      return;
    }

    // 1. Resolução instantânea local (0ms de latência, sem acentos)
    const matchesLocais = buscarLocaisSantos(termo);
    setLocais(matchesLocais);

    // 2. Consulta complementar à API caso conectado
    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.getLocaisVotacao({ busca: termo });
        if (res && res.length > 0) {
          setLocais(res);
        }
      } catch (_) {
        // Mantém os matches locais instantâneos
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [busca]);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', marginBottom: '6px' }}>
      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: '#10b981', fontWeight: 600, marginBottom: '4px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <School size={14} /> Buscar Colégio / Local de Votação (Santos - Zonas 118ª, 272ª e 273ª)
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {locais.length} disponíveis
        </span>
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          className="input-field"
          placeholder="Digite o nome da escola, colégio ou bairro (ex: Martim Afonso, Barnabé, SESI, Stella Maris...)"
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          style={{ paddingRight: '36px', borderColor: 'rgba(16, 185, 129, 0.4)' }}
        />
        {isLoading ? (
          <span style={{ position: 'absolute', right: '12px', top: '10px', fontSize: '11px', color: '#10b981' }}>
            ...
          </span>
        ) : (
          <Search size={15} style={{ position: 'absolute', right: '12px', top: '11px', color: 'var(--text-secondary)' }} />
        )}
      </div>

      {isOpen && (
        <div
          className="chat-scroll-container"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            maxHeight: '260px',
            overflowY: 'auto',
            zIndex: 9999,
            boxShadow: 'var(--shadow-dropdown)',
          }}
        >
          {locais.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
              Nenhum colégio ou local de votação encontrado para "<strong>{busca}</strong>".
              <br />
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Tente buscar pelo bairro (ex: Gonzaga, Vila Belmiro, Ponta da Praia) ou número da Zona.
              </span>
            </div>
          ) : (
            locais.map((loc) => (
              <div
                key={loc.id}
                onClick={() => {
                  onSelectLocal(loc);
                  setBusca(`${loc.nome_escola} (${loc.bairro})`);
                  setIsOpen(false);
                }}
                style={{
                  padding: '10px 14px',
                  borderBottom: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(16, 185, 129, 0.12)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {loc.nome_escola}
                  </span>
                  <span
                    className="badge badge-verde"
                    style={{ fontSize: '10px', padding: '1px 6px' }}
                  >
                    {loc.zona_eleitoral}ª ZE
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', gap: '8px', marginTop: '3px' }}>
                  <span style={{ color: '#10b981', fontWeight: 600 }}>{loc.bairro}</span>
                  <span>•</span>
                  <span>{loc.secoes?.length || 0} seções eleitorais</span>
                </div>
                {loc.endereco && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {loc.endereco}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};



// ─── Modal de Nova Liderança / Apoiador ─────────────────────────────────────
export const NewLeaderModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  leadersList: any[];
  onSuccess: () => void;
  initialParentId?: string;
}> = ({ isOpen, onClose, leadersList, onSuccess, initialParentId }) => {
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [cargo, setCargo] = useState('APOIADOR');
  const [bairro, setBairro] = useState('');
  const [zona, setZona] = useState('');
  const [secao, setSecao] = useState('');
  const [escolaSelecionada, setEscolaSelecionada] = useState('');
  const [secoesDisponiveis, setSecoesDisponiveis] = useState<number[]>([]);
  const [liderAcimaId, setLiderAcimaId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialParentId) {
      setLiderAcimaId(initialParentId);
    } else {
      setLiderAcimaId('');
    }
  }, [initialParentId, isOpen]);

  if (!isOpen) return null;

  const handleSalvar = async (chamarWhats: boolean = false) => {
    if (!nome.trim() || !whatsapp.trim()) return;

    try {
      setIsSubmitting(true);
      await api.createLideranca({
        nome: nome.trim(),
        whatsapp: whatsapp.trim(),
        cargo,
        bairro: bairro.trim() || null,
        zona_eleitoral: zona.trim() || null,
        secao_eleitoral: secao.trim() || null,
        lider_acima_id: liderAcimaId || null,
      });

      if (chamarWhats) {
        const cleanPhone = whatsapp.replace(/\D/g, '');
        window.open(`https://wa.me/55${cleanPhone}`, '_blank');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      alert(`Erro ao cadastrar: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSalvar(false);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '28px', maxWidth: '560px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '8px', borderRadius: '10px' }}>
              <UserPlus size={20} color="#10b981" />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', color: '#ffffff', margin: 0 }}>Cadastrar Liderança ou Apoiador</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                Vincule eleitores aos locais de votação de Santos (118ª e 272ª Zonas).
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Nome Completo *</label>
            <input type="text" className="input-field" placeholder="Ex: Roberto Alencar" value={nome} onChange={(e) => setNome(e.target.value)} required />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>WhatsApp (com DDD) *</label>
            <input type="tel" className="input-field" placeholder="Ex: 13997123456" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Cargo na Campanha</label>
              <select className="input-field" value={cargo} onChange={(e) => setCargo(e.target.value)}>
                <option value="LIDER">Líder Regional</option>
                <option value="GESTOR">Coordenador / Gestor</option>
                <option value="APOIADOR">Apoiador de Base</option>
                <option value="VOLUNTARIO">Voluntário</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Líder Acima (Hierarquia)</label>
              <select className="input-field" value={liderAcimaId} onChange={(e) => setLiderAcimaId(e.target.value)}>
                <option value="">Nenhum (Raiz / Coordenação)</option>
                {leadersList.map((l) => (
                  <option key={l.id} value={l.id}>{l.nome} ({l.cargo})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Autocomplete de Escola / Local de Votação de Santos */}
          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <SeletorLocalVotacaoSantos
              selectedEscola={escolaSelecionada}
              onSelectLocal={(loc) => {
                setEscolaSelecionada(loc.nome_escola);
                setBairro(loc.bairro);
                setZona(loc.zona_eleitoral);
                setSecoesDisponiveis(loc.secoes || []);
                if (loc.secoes && loc.secoes.length > 0) {
                  setSecao(String(loc.secoes[0]));
                }
              }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '10px', marginTop: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>Bairro</label>
                <input type="text" className="input-field" placeholder="Ex: Gonzaga" value={bairro} onChange={(e) => setBairro(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>Zona Eleitoral</label>
                <input type="text" className="input-field" placeholder="Ex: 118" value={zona} onChange={(e) => setZona(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>Seção Eleitoral</label>
                {secoesDisponiveis.length > 0 ? (
                  <select className="input-field" value={secao} onChange={(e) => setSecao(e.target.value)}>
                    <option value="">Selecione a Seção</option>
                    {secoesDisponiveis.map((s) => (
                      <option key={s} value={String(s)}>Seção {s}</option>
                    ))}
                  </select>
                ) : (
                  <input type="text" className="input-field" placeholder="Ex: 01" value={secao} onChange={(e) => setSecao(e.target.value)} />
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ flex: 1, padding: '10px' }}>
              {isSubmitting ? 'Cadastrando...' : 'Salvar no Banco'}
            </button>
            <button
              type="button"
              disabled={isSubmitting || !whatsapp.trim()}
              onClick={() => handleSalvar(true)}
              className="btn btn-secondary"
              style={{
                padding: '10px 14px',
                background: 'rgba(16, 185, 129, 0.15)',
                borderColor: 'rgba(16, 185, 129, 0.4)',
                color: '#10b981',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
              title="Salva o cadastro e já abre o WhatsApp do eleitor"
            >
              <MessageSquare size={16} />
              <span>Salvar e Chamar WhatsApp</span>
            </button>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ padding: '10px 16px' }}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Modal de Nova Meta ─────────────────────────────────────────────────────
export const NewMetaModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ isOpen, onClose, onSuccess }) => {
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState('GLOBAL');
  const [alvo, setAlvo] = useState('');
  const [metaQtd, setMetaQtd] = useState(1000);
  const [dataFim, setDataFim] = useState('2026-10-04');
  const [cadencia, setCadencia] = useState(20);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await api.createMeta({
        titulo,
        tipo,
        alvo_referencia: alvo || null,
        quantidade_meta: Number(metaQtd),
        data_fim: dataFim,
        meta_diaria_cadencia: Number(cadencia),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '8px', borderRadius: '10px' }}>
              <Target size={20} color="#3b82f6" />
            </div>
            <h3 style={{ fontSize: '18px', color: '#ffffff' }}>Definir Meta de Cadência</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Título da Meta *</label>
            <input type="text" className="input-field" placeholder="Ex: Meta Zona Sul - Apoiadores Ativos" value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Tipo</label>
              <select className="input-field" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="GLOBAL">Meta Geral de Campanha</option>
                <option value="ZONA">Zona Eleitoral</option>
                <option value="BAIRRO">Bairro Específico</option>
                <option value="LIDER">Meta por Liderança</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Alvo de Referência</label>
              <input type="text" className="input-field" placeholder="Ex: Zona 118 ou Centro" value={alvo} onChange={(e) => setAlvo(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Quantidade Alvo (Votos/Contatos)</label>
              <input type="number" className="input-field" value={metaQtd} onChange={(e) => setMetaQtd(Number(e.target.value))} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Meta Diária (Cadência)</label>
              <input type="number" className="input-field" value={cadencia} onChange={(e) => setCadencia(Number(e.target.value))} required />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Data Limite</label>
            <input type="date" className="input-field" value={dataFim} onChange={(e) => setDataFim(e.target.value)} required />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ flex: 1, padding: '10px' }}>
              {isSubmitting ? 'Salvando...' : 'Criar Meta'}
            </button>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ padding: '10px 20px' }}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Modal de Nova Despesa TSE ──────────────────────────────────────────────
export const NewExpenseModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ isOpen, onClose, onSuccess }) => {
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState('COMBUSTIVEL');
  const [formaPagamento, setFormaPagamento] = useState('PIX');
  const [fornecedor, setFornecedor] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [comprovanteUrl, setComprovanteUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFotoCupom = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    setOcrStatus('Lendo e analisando cupom fiscal com IA...');

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setComprovanteUrl(base64);

      try {
        const res = await api.ocrGasto({ imagemBase64: base64 });
        if (res.success && res.dados) {
          if (res.dados.descricao) setDescricao(res.dados.descricao);
          if (res.dados.valor) setValor(String(res.dados.valor));
          if (res.dados.categoria) setCategoria(res.dados.categoria);
          if (res.dados.fornecedor_nome) setFornecedor(res.dados.fornecedor_nome);
          if (res.dados.forma_pagamento) setFormaPagamento(res.dados.forma_pagamento);
          setOcrStatus(`✅ Cupom identificado! Valor detectado: R$ ${Number(res.dados.valor || 0).toFixed(2)}`);
        }
      } catch (err: any) {
        setOcrStatus(`⚠️ Atenção: ${err.message || 'Foto processada. Revise os campos antes de salvar.'}`);
      } finally {
        setOcrLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao.trim() || !valor) return;

    try {
      setIsSubmitting(true);
      await api.createGasto({
        descricao: descricao.trim(),
        valor: Number(valor),
        categoria,
        forma_pagamento: formaPagamento,
        fornecedor_nome: fornecedor.trim() || null,
        responsavel_nome: responsavel.trim() || null,
        comprovante_url: comprovanteUrl || null,
        status_auditoria: 'PENDENTE',
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '28px', maxWidth: '580px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '8px', borderRadius: '10px' }}>
              <PlusCircle size={20} color="#f59e0b" />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', color: '#ffffff', margin: 0 }}>Lançar Despesa de Campanha (TSE)</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                Tire foto do cupom fiscal para reconhecimento automático por IA.
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Box de Upload / Foto do Cupom com OCR */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px dashed rgba(245, 158, 11, 0.4)',
            borderRadius: '10px',
            padding: '14px',
            marginBottom: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Camera size={18} color="#f59e0b" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>
                Reconhecer Cupom / Comprovante por Foto
              </span>
            </div>
            <label
              className="btn btn-secondary"
              style={{
                cursor: 'pointer',
                padding: '6px 12px',
                fontSize: '12px',
                background: 'rgba(245, 158, 11, 0.15)',
                borderColor: 'rgba(245, 158, 11, 0.4)',
                color: '#f59e0b',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Upload size={14} />
              <span>{ocrLoading ? 'Processando IA...' : 'Tirar Foto ou Escolher'}</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFotoCupom}
                disabled={ocrLoading}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          {ocrStatus && (
            <div
              style={{
                fontSize: '12px',
                color: ocrStatus.startsWith('✅') ? '#10b981' : '#f59e0b',
                background: 'rgba(0,0,0,0.3)',
                padding: '6px 10px',
                borderRadius: '6px',
              }}
            >
              {ocrStatus}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Descrição da Despesa *</label>
            <input type="text" className="input-field" placeholder="Ex: Abastecimento frota de carreatas" value={descricao} onChange={(e) => setDescricao(e.target.value)} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Valor (R$) *</label>
              <input type="number" step="0.01" className="input-field" placeholder="Ex: 250.00" value={valor} onChange={(e) => setValor(e.target.value)} required />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Categoria TSE</label>
              <select className="input-field" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                <option value="COMBUSTIVEL">Combustível</option>
                <option value="ALIMENTACAO">Alimentação</option>
                <option value="MATERIAL_GRAFICO">Material Gráfico</option>
                <option value="EVENTOS">Eventos e Comício</option>
                <option value="IMPULSIONAMENTO">Impulsionamento / Redes</option>
                <option value="PESSOAL">Equipe e Pessoal</option>
                <option value="JURIDICO_CONTABIL">Jurídico / Contábil</option>
                <option value="TRANSPORTE">Transporte / Locação</option>
                <option value="OUTROS">Outros</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Forma de Pagamento</label>
              <select className="input-field" value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)}>
                <option value="PIX">PIX da Conta de Campanha</option>
                <option value="CARTAO">Cartão de Débito</option>
                <option value="TRANSFERENCIA">Transferência Bancária</option>
                <option value="BOLETO">Boleto Bancário</option>
                <option value="DINHEIRO">Fundo de Caixa (Espécie)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Fornecedor ou Posto</label>
              <input type="text" className="input-field" placeholder="Ex: Auto Posto Ipiranga" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Nome do Responsável / Liderança</label>
            <input type="text" className="input-field" placeholder="Ex: Coordenação de Rua" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ flex: 1, padding: '10px' }}>
              {isSubmitting ? 'Registrando...' : 'Registrar Despesa'}
            </button>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ padding: '10px 20px' }}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Modal Cartaz de Comitê com QR Code Oficial ─────────────────────────────
export const ModalQRCodeComite: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  candidate: any;
}> = ({ isOpen, onClose, candidate }) => {
  if (!isOpen) return null;

  const phone = (candidate?.whatsapp_comite || '5513999998888').replace(/\D/g, '');
  const deepLink = `https://wa.me/${phone}?text=${encodeURIComponent('Olá! Quero apoiar a campanha.')}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(deepLink)}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: '32px', maxWidth: '520px', textAlign: 'center' }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Cartaz A4 Formatado */}
        <div
          id="cartaz-comite"
          style={{
            background: '#ffffff',
            color: '#18181b',
            borderRadius: '16px',
            padding: '28px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1.5px', color: '#10b981', textTransform: 'uppercase' }}>
            Canal Oficial do Comitê Eleitoral 2026
          </div>

          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 900, color: '#09090b' }}>
            {candidate?.nome_urna || 'Gustavo Reis'}
          </h2>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ background: '#10b981', color: '#fff', padding: '3px 12px', borderRadius: '20px', fontWeight: 800, fontSize: '16px' }}>
              {candidate?.numero_candidato || '55955'}
            </span>
            <span style={{ fontWeight: 700, color: '#52525b', fontSize: '14px' }}>
              {candidate?.cargo || 'Deputado Federal'} • {candidate?.partido || 'PSD'}
            </span>
          </div>

          <div style={{ fontStyle: 'italic', fontSize: '12px', color: '#71717a' }}>
            "{candidate?.slogan || 'Trabalho, honestidade e compromisso com você'}"
          </div>

          {/* Imagem do QR Code */}
          <div style={{ padding: '16px', background: '#f4f4f5', borderRadius: '12px', margin: '8px 0' }}>
            <img src={qrUrl} alt="QR Code Oficial" style={{ width: '200px', height: '200px', display: 'block' }} />
          </div>

          <div style={{ fontSize: '13px', fontWeight: 700, color: '#18181b' }}>
            Aponte a câmera do seu celular para conectar pelo WhatsApp
          </div>

          <div style={{ fontSize: '11px', color: '#71717a' }}>
            Deep Link: {deepLink}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
          <button onClick={handlePrint} className="btn btn-primary" style={{ flex: 1, padding: '12px' }}>
            🖨️ Imprimir Cartaz de Comitê
          </button>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '12px 20px' }}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Modal de Criação de Grupo de Base WhatsApp ─────────────────────────────
export const ModalCriarGrupo: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  leadersList: any[];
  onSuccess: () => void;
  initialLeaderId?: string;
}> = ({ isOpen, onClose, leadersList, onSuccess, initialLeaderId }) => {
  const [liderId, setLiderId] = useState('');
  const [nomeGrupo, setNomeGrupo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdResult, setCreatedResult] = useState<any>(null);

  useEffect(() => {
    if (initialLeaderId) {
      setLiderId(initialLeaderId);
      const selected = leadersList.find((l) => l.id === initialLeaderId);
      if (selected) {
        setNomeGrupo(`Base • ${selected.nome.split(' ')[0]} (${selected.bairro || 'Regional'})`);
      }
    } else {
      setLiderId('');
      setNomeGrupo('');
    }
  }, [initialLeaderId, isOpen]);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liderId) return;

    try {
      setIsSubmitting(true);
      const res = await api.criarGrupoBase(liderId, nomeGrupo || undefined);
      setCreatedResult(res);
      onSuccess();
    } catch (err: any) {
      alert(`Erro ao criar grupo: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', color: '#ffffff', margin: 0 }}>👥 Criar Grupo de Base no WhatsApp</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {createdResult ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: '40px' }}>🎉</div>
            <h4 style={{ margin: 0, color: '#10b981', fontSize: '18px' }}>Grupo Criado com Sucesso!</h4>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
              O grupo foi criado no WhatsApp oficial com os coordenadores como administradores.
            </p>

            {createdResult.invite_link && (
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', wordBreak: 'break-all', fontSize: '13px' }}>
                <strong>Link de Convite:</strong><br />
                <a href={createdResult.invite_link} target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>
                  {createdResult.invite_link}
                </a>
              </div>
            )}

            <button
              onClick={() => {
                setCreatedResult(null);
                onClose();
              }}
              className="btn btn-primary"
              style={{ padding: '10px' }}
            >
              Concluir
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Líder Responsável *
              </label>
              <select
                className="input-field"
                value={liderId}
                onChange={(e) => {
                  setLiderId(e.target.value);
                  const selected = leadersList.find((l) => l.id === e.target.value);
                  if (selected) {
                    setNomeGrupo(`Base • ${selected.nome.split(' ')[0]} (${selected.bairro || 'Regional'})`);
                  }
                }}
                required
              >
                <option value="">Selecione a liderança...</option>
                {leadersList.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nome} ({l.bairro || 'Geral'} - {l.whatsapp})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Nome do Grupo de WhatsApp
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Ex: Base Gustavo Reis • Gonzaga"
                value={nomeGrupo}
                onChange={(e) => setNomeGrupo(e.target.value)}
              />
            </div>

            <div style={{ background: 'rgba(59, 130, 246, 0.08)', padding: '12px', borderRadius: '8px', fontSize: '12px', color: '#93c5fd' }}>
              ℹ️ Todos os coordenadores gerais da campanha cadastrados serão incluídos automaticamente como administradores do grupo.
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button type="submit" disabled={isSubmitting || !liderId} className="btn btn-primary" style={{ flex: 1, padding: '10px' }}>
                {isSubmitting ? 'Criando no WhatsApp...' : 'Criar Grupo Oficial'}
              </button>
              <button type="button" onClick={onClose} className="btn btn-secondary" style={{ padding: '10px 20px' }}>
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// ─── Modal de Gestores e Coordenadores de Grupos ────────────────────────────
export const ModalGestores: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const [gestores, setGestores] = useState<any[]>([]);
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [cargo, setCargo] = useState('COORDENADOR GERAL');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (isOpen) loadGestores();
  }, [isOpen]);

  const loadGestores = async () => {
    try {
      const data = await api.getGestores();
      setGestores(data || []);
    } catch (_) {}
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !whatsapp) return;

    try {
      setIsSubmitting(true);
      await api.createGestor({ nome, whatsapp, cargo });
      setNome('');
      setWhatsapp('');
      loadGestores();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja remover este coordenador?')) return;
    try {
      await api.deleteGestor(id);
      loadGestores();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '28px', maxWidth: '600px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', color: '#ffffff', margin: 0 }}>👔 Gestores & Coordenadores de Grupos</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px 0' }}>
          Estes números são promovidos automaticamente a administradores em todos os novos grupos de base criados.
        </p>

        {/* Formulário */}
        <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', marginBottom: '20px' }}>
          <input
            type="text"
            className="input-field"
            placeholder="Nome do Coordenador"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />
          <input
            type="tel"
            className="input-field"
            placeholder="WhatsApp (com DDD)"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            required
          />
          <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ padding: '8px 16px' }}>
            Adicionar
          </button>
        </form>

        {/* Lista */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
          {gestores.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-secondary)', fontSize: '13px' }}>
              Nenhum coordenador cadastrado.
            </div>
          ) : (
            gestores.map((g) => (
              <div
                key={g.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.04)',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: '#fff' }}>{g.nome}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    📱 +{g.whatsapp} • {g.cargo}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(g.id)}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Modal de Gestão de Usuários RBAC ───────────────────────────────────────
export const ModalUsuariosAuth: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [role, setRole] = useState('OPERADOR');
  const [permissoes, setPermissoes] = useState<string[]>(['CHAT', 'ARVORE']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availablePermissions = [
    'COCKPIT',
    'ARVORE',
    'DISPAROS',
    'CHAT',
    'MATERIAIS',
    'GASTOS',
    'BOT',
    'CAMPANHA',
    'LGPD',
  ];

  React.useEffect(() => {
    if (isOpen) loadUsers();
  }, [isOpen]);

  const loadUsers = async () => {
    try {
      const data = await api.getUsuariosAuth();
      setUsuarios(data || []);
    } catch (_) {}
  };

  const handleTogglePerm = (p: string) => {
    setPermissoes((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !email || !senha) return;

    try {
      setIsSubmitting(true);
      await api.createUsuarioAuth({ nome, email, senha, role, permissoes });
      setNome('');
      setEmail('');
      setSenha('');
      loadUsers();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este usuário do sistema?')) return;
    try {
      await api.deleteUsuarioAuth(id);
      loadUsers();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '28px', maxWidth: '700px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', color: '#ffffff', margin: 0 }}>🔐 Controle de Acesso e Usuários (RBAC)</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Cadastro de Novo Usuário */}
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Nome *"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
            <input
              type="email"
              className="input-field"
              placeholder="E-mail *"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              className="input-field"
              placeholder="Senha *"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Papel:</span>
            {['ADMIN', 'COORDENADOR', 'OPERADOR', 'LIDER'].map((r) => (
              <label key={r} style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} />
                {r}
              </label>
            ))}
          </div>

          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Permissões de Módulo:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {availablePermissions.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleTogglePerm(p)}
                  style={{
                    background: permissoes.includes(p) ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
                    color: permissoes.includes(p) ? '#fff' : 'var(--text-secondary)',
                    border: 'none',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ padding: '8px 16px', alignSelf: 'flex-start' }}>
            Criar Usuário de Acesso
          </button>
        </form>

        {/* Lista de Usuários */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
          {usuarios.map((u) => (
            <div
              key={u.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(255,255,255,0.03)',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: '#fff' }}>
                  {u.nome} <span style={{ fontSize: '11px', color: '#38bdf8' }}>({u.role})</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{u.email}</div>
              </div>
              <button
                onClick={() => handleDelete(u.id)}
                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Modal de Auditoria e Desmascaramento LGPD ──────────────────────────────
export const ModalLGPD: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (justificativa: string) => void;
}> = ({ isOpen, onClose, onConfirm }) => {
  const [justificativa, setJustificativa] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (justificativa.trim().length < 5) {
      alert('Por favor, informe uma justificativa válida com pelo menos 5 caracteres.');
      return;
    }
    onConfirm(justificativa.trim());
    setJustificativa('');
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '28px', maxWidth: '480px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', color: '#ffffff', margin: 0 }}>🛡️ Conformidade e Auditoria LGPD</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px 0', lineHeight: '1.5' }}>
          Conforme a Lei Geral de Proteção de Dados (Art. 6º, III) e as normas do TSE, o desmascaramento de números de telefone e dados de eleitores é restrito e auditado de forma imutável no banco de dados.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Justificativa Operacional do Acesso *
            </label>
            <textarea
              rows={3}
              className="input-field"
              placeholder="Ex: Validação de cadastro de apoiador para coordenação regional da Zona 118"
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '10px' }}>
              Autorizar e Gravar Auditoria
            </button>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ padding: '10px 20px' }}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Modal de Edição de Liderança / Apoiador ─────────────────────────────────
export const ModalEditarLideranca: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  node: any | null;
  onSuccess: () => void;
}> = ({ isOpen, onClose, node, onSuccess }) => {
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [cargo, setCargo] = useState('APOIADOR');
  const [bairro, setBairro] = useState('');
  const [zona, setZona] = useState('');
  const [secao, setSecao] = useState('');
  const [grupoLink, setGrupoLink] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (node) {
      setNome(node.nome || '');
      setWhatsapp(node.whatsapp || '');
      setCargo(node.cargo || 'APOIADOR');
      setBairro(node.bairro || '');
      setZona(node.zona_eleitoral || '');
      setSecao(node.secao_eleitoral || '');
      setGrupoLink(node.grupo_link_convite || '');
      setErrorMsg('');
    }
  }, [node]);

  if (!isOpen || !node) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;

    try {
      setIsSaving(true);
      setErrorMsg('');
      await api.updateLideranca(node.id, {
        nome: nome.trim(),
        whatsapp: whatsapp.trim(),
        cargo,
        bairro: bairro.trim() || null,
        zona_eleitoral: zona.trim() || null,
        secao_eleitoral: secao.trim() || null,
        grupo_link_convite: grupoLink.trim() || null,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao atualizar dados.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '28px', maxWidth: '540px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '8px', borderRadius: '10px' }}>
              <Pencil size={20} color="#3b82f6" />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', color: '#ffffff', margin: 0 }}>Editar Cadastro de Liderança</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                Atualize dados e papel estratégico na hierarquia eleitoral.
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {errorMsg && (
          <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#ef4444', fontSize: '12px', marginBottom: '14px' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Nome Completo *</label>
              <input type="text" className="input-field" value={nome} onChange={(e) => setNome(e.target.value)} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Cargo / Papel *</label>
              <select className="input-field" value={cargo} onChange={(e) => setCargo(e.target.value)}>
                <option value="LIDER">⭐ Líder</option>
                <option value="GESTOR">👔 Gestor</option>
                <option value="VOLUNTARIO">🙋 Voluntário</option>
                <option value="APOIADOR">🤝 Apoiador</option>
                <option value="ADMIN">🛡️ Admin Geral</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>WhatsApp / Telefone</label>
            <input type="text" className="input-field" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="Ex: 5513999998888" />
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <SeletorLocalVotacaoSantos
              onSelectLocal={(loc) => {
                setBairro(loc.bairro);
                setZona(loc.zona_eleitoral);
                if (loc.secoes && loc.secoes.length > 0) {
                  setSecao(String(loc.secoes[0]));
                }
              }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '10px', marginTop: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>Bairro / Região</label>
                <input type="text" className="input-field" value={bairro} onChange={(e) => setBairro(e.target.value)} placeholder="Ex: Gonzaga, Marapé" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>Zona Eleitoral</label>
                <input type="text" className="input-field" value={zona} onChange={(e) => setZona(e.target.value)} placeholder="Ex: 118" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>Seção Eleitoral</label>
                <input type="text" className="input-field" value={secao} onChange={(e) => setSecao(e.target.value)} placeholder="Ex: 01" />
              </div>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Link do Grupo de WhatsApp (opcional)</label>
            <input type="text" className="input-field" value={grupoLink} onChange={(e) => setGrupoLink(e.target.value)} placeholder="https://chat.whatsapp.com/..." />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
            <div>
              {whatsapp && (
                <a
                  href={`https://wa.me/55${whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary"
                  style={{
                    padding: '8px 14px',
                    fontSize: '12px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    borderColor: 'rgba(16, 185, 129, 0.4)',
                    color: '#10b981',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    textDecoration: 'none',
                  }}
                  title="Abrir WhatsApp desta liderança"
                >
                  <MessageSquare size={14} />
                  <span>Chamar no WhatsApp</span>
                </a>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={onClose} className="btn btn-secondary" style={{ padding: '8px 18px', fontSize: '13px' }}>Cancelar</button>
              <button type="submit" disabled={isSaving} className="btn btn-primary" style={{ padding: '8px 22px', fontSize: '13px' }}>
                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Modal de Confirmação de Exclusão de Liderança ──────────────────────────
export const ModalConfirmarExclusao: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  node: any | null;
  onSuccess: () => void;
}> = ({ isOpen, onClose, node, onSuccess }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !node) return null;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setErrorMsg('');
      await api.deleteLideranca(node.id);
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao excluir registro.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '26px', maxWidth: '440px', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '8px', borderRadius: '10px' }}>
              <AlertTriangle size={22} color="#ef4444" />
            </div>
            <div>
              <h3 style={{ fontSize: '17px', color: '#ffffff', margin: 0 }}>Confirmar Exclusão</h3>
              <p style={{ fontSize: '12px', color: '#ef4444', margin: '2px 0 0 0' }}>Ação permanente e irreversível</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {errorMsg && (
          <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#ef4444', fontSize: '12px', marginBottom: '14px' }}>
            {errorMsg}
          </div>
        )}

        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0 0 16px 0' }}>
          Tem certeza de que deseja excluir o cadastro de <strong style={{ color: '#ffffff' }}>{node.nome}</strong> ({node.cargo})?
        </p>

        <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', fontSize: '12px', marginBottom: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Indicados diretos:</span>
            <strong style={{ color: '#38bdf8' }}>{node.total_indicados_diretos || 0}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Rede hierárquica total:</span>
            <strong style={{ color: 'var(--primary)' }}>{node.total_indicados_rede || 0}</strong>
          </div>
          <p style={{ fontSize: '11px', color: '#f59e0b', margin: '6px 0 0 0', borderTop: '1px solid var(--border-color)', paddingTop: '6px' }}>
            ℹ️ Apoiadores vinculados a este líder serão preservados e reconectados à liderança superior na árvore.
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button type="button" onClick={onClose} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>Cancelar</button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            style={{
              background: '#ef4444',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '8px 18px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Trash2 size={16} />
            <span>{isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Modal de Backup, Exportação e Relatórios TSE ───────────────────────────
export const ModalBackup: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  campanhaNome?: string;
  cnpjCampanha?: string;
  onSuccess?: () => void;
}> = ({ isOpen, onClose, campanhaNome = 'Gustavo Reis', cnpjCampanha = '00.000.000/0001-00', onSuccess }) => {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleDownloadJson = async () => {
    try {
      setDownloading('json');
      setMsg(null);
      const data = await api.exportBackupJson();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `painel_eleitoral_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMsg({ type: 'success', text: 'Backup JSON baixado com sucesso!' });
    } catch (err: any) {
      setMsg({ type: 'error', text: `Erro ao baixar JSON: ${err.message}` });
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadCsv = () => {
    setMsg(null);
    window.open(api.getBackupCsvUrl(), '_blank');
    setMsg({ type: 'success', text: 'Download da planilha CSV iniciado!' });
  };

  const handleDownloadPdf = () => {
    setMsg(null);
    window.open(api.getRelatorioPdfUrl(), '_blank');
    setMsg({ type: 'success', text: 'Relatório Executivo PDF TSE gerado em nova aba!' });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      setMsg(null);
      const text = await file.text();
      const json = JSON.parse(text);

      const result = await api.importBackup(json);
      setMsg({ type: 'success', text: result.message || 'Backup restaurado com sucesso!' });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setMsg({ type: 'error', text: `Erro na restauração: ${err.message}` });
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '28px', maxWidth: '580px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '8px', borderRadius: '10px' }}>
              <Database size={22} color="#10b981" />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', color: '#ffffff', margin: 0 }}>Backup & Relatórios Oficiais TSE</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                Campanha: {campanhaNome} • CNPJ: {cnpjCampanha}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {msg && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              marginBottom: '16px',
              background: msg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${msg.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              color: msg.type === 'success' ? '#10b981' : '#ef4444',
            }}
          >
            {msg.text}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          {/* Opção 1: JSON */}
          <div
            onClick={handleDownloadJson}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              background: 'rgba(30, 41, 59, 0.6)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#10b981', padding: '10px', borderRadius: '8px', color: '#ffffff' }}>
                <Database size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '13px' }}>
                  Backup Completo (.JSON) <span className="badge badge-verde" style={{ fontSize: '10px', marginLeft: '6px' }}>Pendrive / HD</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Snapshot completo de líderes, apoiadores, metas, gastos e configurações com checksum SHA-256.
                </div>
              </div>
            </div>
            <Download size={18} color="var(--text-secondary)" />
          </div>

          {/* Opção 2: CSV */}
          <div
            onClick={handleDownloadCsv}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              background: 'rgba(30, 41, 59, 0.6)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#3b82f6', padding: '10px', borderRadius: '8px', color: '#ffffff' }}>
                <FileSpreadsheet size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '13px' }}>
                  Planilha de Lideranças (.CSV) <span className="badge badge-azul" style={{ fontSize: '10px', marginLeft: '6px' }}>Excel / Sheets</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Exporta nome, telefone, bairro, zona eleitoral e total de indicados formatados para Excel.
                </div>
              </div>
            </div>
            <Download size={18} color="var(--text-secondary)" />
          </div>

          {/* Opção 3: PDF */}
          <div
            onClick={handleDownloadPdf}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              background: 'rgba(30, 41, 59, 0.6)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#8b5cf6', padding: '10px', borderRadius: '8px', color: '#ffffff' }}>
                <FileText size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '13px' }}>
                  Relatório Executivo Oficial (.PDF) <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#c084fc', fontSize: '10px', marginLeft: '6px' }}>Padrão TSE</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Documento com CNPJ, métricas de cadência e balanço eleitoral para prestação de contas.
                </div>
              </div>
            </div>
            <Download size={18} color="var(--text-secondary)" />
          </div>
        </div>

        {/* Restaurar Backup */}
        <div style={{ padding: '14px 18px', background: 'rgba(15, 23, 42, 0.7)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Upload size={18} color="var(--primary)" />
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff' }}>Restaurar Backup (.JSON)</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Faça upload de um arquivo de backup para restaurar os dados</div>
              </div>
            </div>
            <label className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '11px', cursor: 'pointer' }}>
              <input type="file" accept=".json" onChange={handleFileUpload} style={{ display: 'none' }} disabled={importing} />
              <span>{importing ? 'Importando...' : 'Selecionar Arquivo'}</span>
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} className="btn btn-secondary" style={{ padding: '8px 20px', fontSize: '13px' }}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Modal de Retirada de Materiais Físicos ─────────────────────────────────
export const ModalRetiradaMaterial: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  leader: any;
}> = ({ isOpen, onClose, leader }) => {
  const [retiradas, setRetiradas] = useState<any[]>([]);
  const [totaisPorMaterial, setTotaisPorMaterial] = useState<Record<string, number>>({});
  const [totalGeralItens, setTotalGeralItens] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [responsavelEntrega, setResponsavelEntrega] = useState('Secretaria / Comitê Central');
  const [activeSubTab, setActiveSubTab] = useState<'nova' | 'historico'>('nova');

  const [itens, setItens] = useState<Array<{
    material_nome: string;
    quantidade: number;
    data_retirada: string;
    observacoes: string;
  }>>([]);

  const getCurrentDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const loadRetiradas = async () => {
    if (!leader?.id) return;
    try {
      setIsLoading(true);
      const res = await api.getRetiradasLideranca(leader.id);
      setRetiradas(res.retiradas || []);
      setTotaisPorMaterial(res.totais_por_material || {});
      setTotalGeralItens(res.total_geral_itens || 0);
    } catch (err) {
      console.error('Erro ao carregar retiradas:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && leader?.id) {
      loadRetiradas();
      setItens([
        {
          material_nome: 'Santinho 10x15 (Oficial)',
          quantidade: 1000,
          data_retirada: getCurrentDateTime(),
          observacoes: '',
        },
      ]);
      setActiveSubTab('nova');
    }
  }, [isOpen, leader?.id]);

  if (!isOpen || !leader) return null;

  const handleAddItem = () => {
    setItens((prev) => [
      ...prev,
      {
        material_nome: 'Adesivo de Carro Para-choque',
        quantidade: 50,
        data_retirada: getCurrentDateTime(),
        observacoes: '',
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (itens.length <= 1) return;
    setItens((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setItens((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (itens.length === 0) return;

    try {
      setIsSubmitting(true);
      await api.createRetiradaMaterial(leader.id, {
        itens,
        responsavel_entrega: responsavelEntrega,
      });
      await loadRetiradas();
      setActiveSubTab('historico');
      alert(`Retirada registrada com sucesso para ${leader.nome}!`);
    } catch (err: any) {
      alert(`Erro ao registrar retirada: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este registro de retirada?')) return;
    try {
      await api.deleteRetiradaMaterial(id);
      await loadRetiradas();
    } catch (err: any) {
      alert(`Erro ao excluir: ${err.message}`);
    }
  };

  const PRESET_MATERIAIS = [
    'Santinho 10x15 (Oficial)',
    'Adesivo de Carro Para-choque',
    'Adesivo Perfurado Vidro Traseiro',
    'Adesivo Praguinha 5cm (Lapela)',
    'Bandeira com Haste (Cavalete)',
    'Placa Residencial / Comitê',
    'Camiseta Oficial da Campanha',
    'Cartazete A3 Comitê',
    'Jornal Informativo de Propostas',
    'Faixa de Rua',
    'Outro (Especificar)',
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '780px', width: '95%', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Cabeçalho */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '10px', borderRadius: '12px', color: '#10b981' }}>
              <Package size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '18px', color: '#ffffff', margin: 0, fontWeight: 800 }}>
                  Retirada de Materiais Físicos
                </h3>
                <span className="badge badge-verde" style={{ fontSize: '11px' }}>
                  {leader.cargo || 'LIDER'}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {leader.nome} • {leader.bairro || 'Bairro Geral'} {leader.zona_eleitoral ? `(Zona ${leader.zona_eleitoral})` : ''}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Resumo de Totais Acumulados */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '10px',
            marginBottom: '16px',
          }}
        >
          <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Acumulado</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
              {totalGeralItens.toLocaleString('pt-BR')} <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-secondary)' }}>itens</span>
            </div>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Entregas Registradas</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>
              {retiradas.length} <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-secondary)' }}>remessas</span>
            </div>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Variedade Entregue</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#f59e0b', marginTop: '2px' }}>
              {Object.keys(totaisPorMaterial).length} <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-secondary)' }}>tipos</span>
            </div>
          </div>
        </div>

        {/* Abas Internas: Nova Retirada vs Histórico */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', marginBottom: '16px', paddingBottom: '8px' }}>
          <button
            type="button"
            onClick={() => setActiveSubTab('nova')}
            className={`btn ${activeSubTab === 'nova' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 14px', fontSize: '12px' }}
          >
            <Plus size={14} />
            <span>Nova Retirada de Material</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('historico')}
            className={`btn ${activeSubTab === 'historico' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 14px', fontSize: '12px' }}
          >
            <Clock size={14} />
            <span>Histórico de Retiradas ({retiradas.length})</span>
          </button>
        </div>

        {/* Conteúdo Aba: Nova Retirada */}
        {activeSubTab === 'nova' && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Responsável da Entrega */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Responsável pela Liberação no Comitê
              </label>
              <input
                type="text"
                className="input-field"
                value={responsavelEntrega}
                onChange={(e) => setResponsavelEntrega(e.target.value)}
                placeholder="Ex: Coordenador João / Balcão Central"
                required
              />
            </div>

            {/* Lista Dinâmica de Materiais */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
                  Itens da Remessa (Adicione quantos materiais desejar)
                </span>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="btn btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '11px' }}
                >
                  <Plus size={13} />
                  <span>+ Adicionar Mais Um Material</span>
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {itens.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'rgba(30, 41, 59, 0.5)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '12px',
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr 1.5fr auto',
                      gap: '10px',
                      alignItems: 'end',
                    }}
                  >
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                        Material #{idx + 1} *
                      </label>
                      <input
                        type="text"
                        list={`materiais-datalist-${idx}`}
                        className="input-field"
                        value={item.material_nome}
                        onChange={(e) => handleItemChange(idx, 'material_nome', e.target.value)}
                        placeholder="Selecione ou digite o material"
                        required
                      />
                      <datalist id={`materiais-datalist-${idx}`}>
                        {PRESET_MATERIAIS.map((p, pIdx) => (
                          <option key={pIdx} value={p} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                        Quantidade *
                      </label>
                      <input
                        type="number"
                        min="1"
                        className="input-field"
                        value={item.quantidade}
                        onChange={(e) => handleItemChange(idx, 'quantidade', parseInt(e.target.value, 10) || 0)}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                        Dia e Hora *
                      </label>
                      <input
                        type="datetime-local"
                        className="input-field"
                        value={item.data_retirada}
                        onChange={(e) => handleItemChange(idx, 'data_retirada', e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={itens.length <= 1}
                        className="btn btn-secondary"
                        style={{ padding: '8px', color: itens.length <= 1 ? '#64748b' : '#ef4444', height: '38px' }}
                        title="Remover este item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rodapé de Ações */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button type="button" onClick={onClose} className="btn btn-secondary" style={{ padding: '10px 18px' }}>
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
                style={{ padding: '10px 24px', fontWeight: 700 }}
              >
                {isSubmitting ? 'Registrando...' : `Confirmar Entrega (${itens.reduce((acc, i) => acc + (i.quantidade || 0), 0)} itens)`}
              </button>
            </div>
          </form>
        )}

        {/* Conteúdo Aba: Histórico */}
        {activeSubTab === 'historico' && (
          <div>
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>Carregando histórico...</div>
            ) : retiradas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                Nenhuma retirada de material registrada para esta liderança até o momento.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {retiradas.map((r) => {
                  const d = new Date(r.data_retirada);
                  const dataFormatada = d.toLocaleDateString('pt-BR');
                  const horaFormatada = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div
                      key={r.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'rgba(30, 41, 59, 0.4)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '12px 16px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ background: '#10b981', color: '#ffffff', padding: '8px', borderRadius: '8px' }}>
                          <Package size={16} />
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
                            {r.material_nome}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', gap: '8px', marginTop: '2px' }}>
                            <span>📅 {dataFormatada} às {horaFormatada}</span>
                            {r.responsavel_entrega && <span>• Entregue por: {r.responsavel_entrega}</span>}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <span className="badge badge-verde" style={{ fontSize: '13px', padding: '4px 10px', fontWeight: 700 }}>
                          +{r.quantidade} un
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDelete(r.id)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                          title="Excluir este registro"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

