import React, { useState } from 'react';
import { api } from '../api.ts';

interface Material {
  id: string;
  titulo: string;
  tipo: 'SANTINHO' | 'PDF' | 'VIDEO' | 'IMAGEM' | 'LINK';
  url: string;
  descricao?: string;
  tamanho_bytes?: number;
  created_at: string;
}

interface MateriaisOnlineProps {
  materiais: Material[];
  onRefresh: () => void;
}

export const MateriaisOnline: React.FC<MateriaisOnlineProps> = ({ materiais, onRefresh }) => {
  const [selectedType, setSelectedType] = useState<string>('TODOS');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState<'SANTINHO' | 'PDF' | 'VIDEO' | 'IMAGEM' | 'LINK'>('SANTINHO');
  const [url, setUrl] = useState('');
  const [descricao, setDescricao] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filtered = materiais.filter((m) => {
    const matchType = selectedType === 'TODOS' || m.tipo === selectedType;
    const matchSearch =
      m.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.descricao && m.descricao.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchType && matchSearch;
  });

  const handleCopyLink = (m: Material) => {
    navigator.clipboard.writeText(m.url);
    setCopiedId(m.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo || !url) return;

    try {
      setIsSubmitting(true);
      await api.createMaterial({ titulo, tipo, url, descricao });
      setTitulo('');
      setUrl('');
      setDescricao('');
      setIsNewModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao cadastrar material');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente remover este material?')) return;
    try {
      await api.deleteMaterial(id);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao remover material');
    }
  };

  const getTypeIcon = (t: string) => {
    switch (t) {
      case 'SANTINHO':
        return '🪪';
      case 'PDF':
        return '📄';
      case 'VIDEO':
        return '🎥';
      case 'IMAGEM':
        return '🖼️';
      case 'LINK':
        return '🔗';
      default:
        return '📁';
    }
  };

  const getTypeColor = (t: string) => {
    switch (t) {
      case 'SANTINHO':
        return '#8b5cf6';
      case 'PDF':
        return '#ef4444';
      case 'VIDEO':
        return '#f59e0b';
      case 'IMAGEM':
        return '#3b82f6';
      case 'LINK':
        return '#10b981';
      default:
        return '#64748b';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header com Filtros e Ações */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>📁 Acervo Digital de Campanha</h2>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: '0.875rem' }}>
            Santinhos virtuais, planos de governo, vídeos e cartilhas para envio rápido e mobilização.
          </p>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          style={{
            background: 'var(--primary)',
            color: '#fff',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          ➕ Novo Material
        </button>
      </div>

      {/* Filtros e Busca */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'center',
          background: 'var(--card-bg)',
          padding: '12px',
          borderRadius: '12px',
          border: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
          {['TODOS', 'SANTINHO', 'PDF', 'VIDEO', 'IMAGEM', 'LINK'].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              style={{
                background: selectedType === t ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                color: selectedType === t ? '#fff' : 'var(--text-muted)',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Buscar por título ou descrição..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            background: 'rgba(0,0,0,0.2)',
            border: '1px solid var(--border)',
            padding: '8px 14px',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '0.875rem',
            width: '260px',
          }}
        />
      </div>

      {/* Grid de Materiais */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '20px',
        }}
      >
        {filtered.length === 0 ? (
          <div
            style={{
              gridColumn: '1 / -1',
              padding: '48px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              background: 'var(--card-bg)',
              borderRadius: '12px',
              border: '1px dashed var(--border)',
            }}
          >
            Nenhum material encontrado com os filtros selecionados.
          </div>
        ) : (
          filtered.map((m) => (
            <div
              key={m.id}
              style={{
                background: 'var(--card-bg)',
                borderRadius: '14px',
                border: '1px solid var(--border)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span
                  style={{
                    background: `${getTypeColor(m.tipo)}22`,
                    color: getTypeColor(m.tipo),
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {getTypeIcon(m.tipo)} {m.tipo}
                </span>

                <button
                  onClick={() => handleDelete(m.id)}
                  title="Excluir Material"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontSize: '1rem',
                  }}
                >
                  🗑️
                </button>
              </div>

              <div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.125rem', fontWeight: 600 }}>{m.titulo}</h3>
                {m.descricao && (
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: '1.4' }}>
                    {m.descricao}
                  </p>
                )}
              </div>

              <div
                style={{
                  marginTop: 'auto',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border)',
                  display: 'flex',
                  gap: '8px',
                }}
              >
                <a
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    background: 'rgba(255,255,255,0.06)',
                    color: '#fff',
                    padding: '8px',
                    borderRadius: '6px',
                    fontSize: '0.8125rem',
                    textDecoration: 'none',
                    fontWeight: 600,
                  }}
                >
                  Visualizar / Abrir ↗
                </a>

                <button
                  onClick={() => handleCopyLink(m)}
                  style={{
                    background: copiedId === m.id ? '#10b981' : 'rgba(255,255,255,0.06)',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {copiedId === m.id ? '✓ Copiado!' : 'Copiar Link'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de Cadastro de Material */}
      {isNewModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#18181b',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '480px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Cadastrar Novo Material</h3>
              <button
                onClick={() => setIsNewModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Título do Material *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Santinho Oficial 55955"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Tipo de Material
                </label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as any)}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                >
                  <option value="SANTINHO">🪪 Santinho Digital</option>
                  <option value="PDF">📄 Caderno / Proposta PDF</option>
                  <option value="VIDEO">🎥 Vídeo Manifesto / Redes</option>
                  <option value="IMAGEM">🖼️ Imagem / Cartaz</option>
                  <option value="LINK">🔗 Link Externo / Formulário</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  URL do Arquivo ou Link *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Descrição / Instrução de Envio
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex: Enviar para eleitores indecisos que perguntarem sobre propostas de saúde."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    color: '#fff',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.08)',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'var(--primary)',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
