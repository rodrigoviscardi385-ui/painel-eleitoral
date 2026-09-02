'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText, Link2, Image, Video, Plus, Trash2, Edit3,
  Check, X, ToggleLeft, ToggleRight, ExternalLink, BookOpen, Upload
} from 'lucide-react';

interface Material {
  id: string;
  titulo: string;
  descricao?: string | null;
  tipo: 'PDF' | 'LINK' | 'IMAGEM' | 'VIDEO';
  url: string;
  tags: string;
  ativo: string;
  ordem: number;
  created_at: string;
}

interface MateriaisOnlineProps {
  apiBaseUrl?: string;
}

const tipoIcons = {
  PDF: FileText,
  LINK: Link2,
  IMAGEM: Image,
  VIDEO: Video,
};

const tipoColors = {
  PDF: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30',
  LINK: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30',
  IMAGEM: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/30',
  VIDEO: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/30',
};

const emptyForm = { titulo: '', descricao: '', tipo: 'LINK' as Material['tipo'], url: '', tags: '', ativo: 'SIM', ordem: 0 };

export function MateriaisOnline({ apiBaseUrl = '' }: MateriaisOnlineProps) {
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchMateriais = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/materiais`);
      if (res.ok) {
        const data = await res.json();
        setMateriais(data.materiais || []);
      }
    } catch {
      setError('Erro ao carregar materiais');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMateriais(); }, []);

  const handleSave = async () => {
    if (!form.titulo.trim() || !form.url.trim()) {
      setError('Título e URL são obrigatórios');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const tagsArray = form.tags.split(',').map(t => t.trim()).filter(Boolean);
      const payload = { ...form, tags: tagsArray, ordem: Number(form.ordem) };

      const url = editingId
        ? `${apiBaseUrl}/api/materiais/${editingId}`
        : `${apiBaseUrl}/api/materiais`;
      const method = editingId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao salvar');
      }

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      await fetchMateriais();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar material');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (m: Material) => {
    try {
      await fetch(`${apiBaseUrl}/api/materiais/${m.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: m.ativo === 'SIM' ? 'NAO' : 'SIM' }),
      });
      await fetchMateriais();
    } catch { }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este material?')) return;
    try {
      await fetch(`${apiBaseUrl}/api/materiais/${id}`, { method: 'DELETE' });
      await fetchMateriais();
    } catch { }
  };

  const startEdit = (m: Material) => {
    let tags: string[] = [];
    try { tags = JSON.parse(m.tags); } catch { }
    setForm({ titulo: m.titulo, descricao: m.descricao || '', tipo: m.tipo, url: m.url, tags: tags.join(', '), ativo: m.ativo, ordem: m.ordem });
    setEditingId(m.id);
    setShowForm(true);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-sm dark:shadow-none">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <span className="font-bold text-sm text-slate-900 dark:text-white">Biblioteca de Materiais</span>
          <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">{materiais.length} itens</span>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Novo Material
        </button>
      </div>

      {/* Info Banner */}
      <div className="mx-4 mt-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2 shadow-sm">
        <Upload className="w-4 h-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
        <span>O bot envia automaticamente um material desta biblioteca quando o eleitor digitar <strong>2</strong> no menu. Ative/desative materiais para controlar o que é enviado.</span>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mx-4 mt-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-3 shadow-sm">
          <div className="text-sm font-bold text-slate-900 dark:text-white">{editingId ? 'Editar Material' : 'Novo Material'}</div>
          {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Box de Upload de Arquivo no Servidor */}
            <div className="sm:col-span-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500/60 transition-all text-center">
              <input
                type="file"
                id="file-upload-input"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.mp4,.mov,.avi"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploading(true);
                  setUploadProgress(`Enviando ${file.name}...`);
                  setError('');
                  try {
                    const formData = new FormData();
                    formData.append('file', file);
                    const res = await fetch(`${apiBaseUrl}/api/materiais/upload`, {
                      method: 'POST',
                      body: formData,
                    });
                    const data = await res.json();
                    if (res.ok && data.url) {
                      setForm((prev) => ({
                        ...prev,
                        url: data.url,
                        tipo: data.tipo || 'PDF',
                        titulo: prev.titulo || file.name.replace(/\.[^/.]+$/, ''),
                      }));
                      setUploadProgress(`✓ Arquivo salvo no servidor: ${data.filename}`);
                    } else {
                      setError(data.error || 'Erro ao enviar arquivo para o servidor');
                    }
                  } catch (err: any) {
                    setError('Falha de rede ao fazer upload: ' + (err.message || ''));
                  } finally {
                    setUploading(false);
                  }
                }}
              />
              <label
                htmlFor="file-upload-input"
                className="cursor-pointer flex flex-col items-center justify-center gap-1.5 py-2"
              >
                <Upload className={`w-6 h-6 text-emerald-600 dark:text-emerald-400 ${uploading ? 'animate-bounce' : ''}`} />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {uploading ? uploadProgress : 'Clique para selecionar arquivo do seu computador'}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  Suporta PDF (Santinho/Proposta), Imagens (PNG/JPG) e Vídeos (MP4) • Fica armazenado no servidor oficial da campanha
                </span>
              </label>
              {uploadProgress && (
                <div className="mt-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                  {uploadProgress}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Título *</label>
              <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                placeholder="Ex: Programa de Governo 2026" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Tipo *</label>
              <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as Material['tipo'] }))}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500">
                <option value="LINK">🔗 Link</option>
                <option value="PDF">📄 PDF</option>
                <option value="IMAGEM">🖼️ Imagem</option>
                <option value="VIDEO">🎥 Vídeo</option>
              </select>
            </div>
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">URL / Caminho do Arquivo *</label>
              <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                placeholder="https://... ou /uploads/materiais/..." />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Descrição (opcional)</label>
              <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 resize-none"
                placeholder="Breve descrição do material..." />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Tags (separadas por vírgula)</label>
              <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                placeholder="saúde, educação, proposta" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Ordem de exibição</label>
              <input type="number" value={form.ordem} onChange={e => setForm(f => ({ ...f, ordem: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500" />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer">
              <Check className="w-3.5 h-3.5" />
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button onClick={() => { setShowForm(false); setEditingId(null); setError(''); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-white text-xs font-semibold rounded-xl transition-all border border-slate-200 dark:border-transparent cursor-pointer">
              <X className="w-3.5 h-3.5" />
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="text-center text-slate-500 py-8 text-sm">Carregando materiais...</div>
        ) : materiais.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <BookOpen className="w-10 h-10 text-slate-700 mx-auto" />
            <p className="text-slate-400 text-sm font-medium">Nenhum material cadastrado</p>
            <p className="text-slate-500 text-xs">Adicione PDFs, links e imagens para o bot enviar automaticamente</p>
          </div>
        ) : (
          materiais.map(m => {
            const Icon = tipoIcons[m.tipo] || Link2;
            const colorClass = tipoColors[m.tipo] || tipoColors.LINK;
            let tags: string[] = [];
            try { tags = JSON.parse(m.tags); } catch { }

            return (
              <div key={m.id} className={`p-3 rounded-2xl border transition-all ${m.ativo === 'SIM' ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm' : 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'}`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl border ${colorClass} shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900 dark:text-white truncate">{m.titulo}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${colorClass}`}>{m.tipo}</span>
                      {m.ativo === 'NAO' && <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">INATIVO</span>}
                    </div>
                    {m.descricao && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{m.descricao}</p>}
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 truncate font-medium">{m.url}</p>
                    {tags.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {tags.map((t, i) => (
                          <span key={i} className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 font-medium">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <a href={m.url} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all" title="Abrir link">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button onClick={() => handleToggle(m)}
                      className={`p-1.5 rounded-lg transition-all cursor-pointer ${m.ativo === 'SIM' ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`} title="Alternar status">
                      {m.ativo === 'SIM' ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>
                    <button onClick={() => startEdit(m)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-all cursor-pointer" title="Editar">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(m.id)}
                      className="p-1.5 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all cursor-pointer" title="Excluir">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
