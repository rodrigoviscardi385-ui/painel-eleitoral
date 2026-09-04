'use client';

import React, { useState, useEffect } from 'react';
import { X, User, Phone, MapPin, Vote, Users, Shield, Link, Loader2, Save, AlertCircle } from 'lucide-react';
import { TreeNode } from './ArvoreLideranca';

interface ModalEditarLiderancaProps {
  isOpen: boolean;
  onClose: () => void;
  node: TreeNode | null;
  apiBaseUrl?: string;
  onSuccess: () => void;
}

export const ModalEditarLideranca: React.FC<ModalEditarLiderancaProps> = ({
  isOpen,
  onClose,
  node,
  apiBaseUrl = '',
  onSuccess,
}) => {
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [cargo, setCargo] = useState<'ADMIN' | 'GESTOR' | 'LIDER' | 'APOIADOR' | 'VOLUNTARIO'>('APOIADOR');
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
    if (!nome.trim()) {
      setErrorMsg('O nome é obrigatório.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');

    try {
      const payload = {
        nome: nome.trim(),
        whatsapp: whatsapp.trim(),
        cargo,
        bairro: bairro.trim(),
        zona_eleitoral: zona.trim(),
        secao_eleitoral: secao.trim(),
        grupo_link_convite: grupoLink.trim() || null,
      };

      // Tenta rota interna do Next.js primeiro (acesso direto e rápido ao Postgres)
      let res = await fetch(`/api/liderancas/${node.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Fallback para apiBaseUrl se fornecida e caso a rota interna falhe
      if (!res.ok && apiBaseUrl && apiBaseUrl !== 'http://localhost:3001') {
        try {
          res = await fetch(`${apiBaseUrl}/api/liderancas/${node.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        } catch (_) {}
      }

      const data = await res.json();

      if (res.ok && data.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMsg(data.error || 'Erro ao salvar alterações.');
      }
    } catch (err) {
      console.error('Erro ao atualizar cadastro:', err);
      setErrorMsg('Falha ao salvar alterações. Verifique sua conexão.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="glass-panel w-full max-w-lg rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden animate-scaleUp">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Editar Cadastro</h3>
              <p className="text-xs text-slate-400">
                Altere dados de {node.cargo === 'LIDER' ? 'Liderança' : node.cargo === 'APOIADOR' ? 'Apoiador' : 'Membro da Equipe'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Nome e Cargo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Nome Completo</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome do integrante"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Cargo / Função</label>
              <select
                value={cargo}
                onChange={(e) => setCargo(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500 transition-colors cursor-pointer"
              >
                <option value="LIDER">🚀 Líder (Cria Grupos de Base)</option>
                <option value="GESTOR">👑 Gestor (ADM de Todos os Grupos)</option>
                <option value="VOLUNTARIO">🌟 Voluntário</option>
                <option value="APOIADOR">🤝 Apoiador</option>
                <option value="ADMIN">🛡️ Admin Geral</option>
              </select>
            </div>
          </div>

          {/* Destaque das Regras de Negócio e Permissões do Cargo */}
          <div className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
            cargo === 'GESTOR'
              ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
              : cargo === 'LIDER'
              ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
              : cargo === 'VOLUNTARIO'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : cargo === 'ADMIN'
              ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}>
            <Shield className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              {cargo === 'GESTOR' && (
                <span>
                  <strong>Regra de Gestor:</strong> Ao salvar como Gestor, este contato será automaticamente adicionado e promovido a <strong>Administrador (ADM) de TODOS os grupos oficiais de WhatsApp</strong> da campanha.
                </span>
              )}
              {cargo === 'LIDER' && (
                <span>
                  <strong>Regra de Líder:</strong> Como Líder, terá o direito exclusivo de <strong>criar e liderar o Grupo Oficial de WhatsApp</strong> da sua própria base eleitoral.
                </span>
              )}
              {cargo === 'VOLUNTARIO' && (
                <span>
                  <strong>Regra de Voluntário:</strong> Integrante ativo no trabalho de campo, mobilização comunitária e eventos da campanha.
                </span>
              )}
              {cargo === 'APOIADOR' && (
                <span>
                  <strong>Regra de Apoiador:</strong> Eleitor cadastrado na base comunitária que apoia as propostas do candidato.
                </span>
              )}
              {cargo === 'ADMIN' && (
                <span>
                  <strong>Regra de Administrador:</strong> Acesso total a relatórios, configurações globais e gestão de todos os grupos.
                </span>
              )}
            </div>
          </div>

          {/* WhatsApp e Bairro */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">WhatsApp / Telefone</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="Ex: 5511999998888"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Bairro / Região</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  placeholder="Ex: Centro, Gonzaga..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Zona e Seção */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Zona Eleitoral</label>
              <div className="relative">
                <Vote className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={zona}
                  onChange={(e) => setZona(e.target.value)}
                  placeholder="Ex: 120"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Seção Eleitoral</label>
              <input
                type="text"
                value={secao}
                onChange={(e) => setSecao(e.target.value)}
                placeholder="Ex: 45"
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          {/* Link do Grupo de WhatsApp (se aplicável) */}
          {(cargo === 'LIDER' || cargo === 'ADMIN' || cargo === 'GESTOR') && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Link do Grupo de Base (WhatsApp)</label>
              <div className="relative">
                <Link className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={grupoLink}
                  onChange={(e) => setGrupoLink(e.target.value)}
                  placeholder="https://chat.whatsapp.com/..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Rodapé e Botões */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg shadow-lg shadow-cyan-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
