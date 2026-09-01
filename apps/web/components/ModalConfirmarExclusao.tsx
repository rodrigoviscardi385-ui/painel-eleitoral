'use client';

import React, { useState } from 'react';
import { X, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { TreeNode } from './ArvoreLideranca';

interface ModalConfirmarExclusaoProps {
  isOpen: boolean;
  onClose: () => void;
  node: TreeNode | null;
  apiBaseUrl?: string;
  onSuccess: () => void;
}

export const ModalConfirmarExclusao: React.FC<ModalConfirmarExclusaoProps> = ({
  isOpen,
  onClose,
  node,
  apiBaseUrl = 'http://localhost:3001',
  onSuccess,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !node) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setErrorMsg('');

    try {
      const res = await fetch(`${apiBaseUrl}/api/liderancas/${node.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (res.ok && data.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMsg(data.error || 'Erro ao excluir cadastro.');
      }
    } catch (err) {
      console.error('Erro ao excluir:', err);
      setErrorMsg('Falha de conexão com o servidor Fastify.');
    } finally {
      setIsDeleting(false);
    }
  };

  const isLider = node.cargo === 'LIDER' || node.cargo === 'ADMIN' || node.cargo === 'GESTOR';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="glass-panel w-full max-w-md rounded-2xl border border-rose-500/30 shadow-2xl overflow-hidden animate-scaleUp">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-rose-950/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Confirmar Exclusão</h3>
              <p className="text-xs text-rose-300">Ação permanente e irreversível</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {errorMsg}
            </div>
          )}

          <p className="text-xs text-slate-300 leading-relaxed">
            Tem certeza de que deseja excluir o cadastro de{' '}
            <strong className="text-white font-bold">{node.nome}</strong> ({node.cargo})?
          </p>

          {isLider && (
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5 text-xs text-slate-400">
              <div className="flex items-center justify-between">
                <span>Diretos vinculados:</span>
                <strong className="text-cyan-400 font-bold">{node.total_indicados_diretos}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Rede total:</span>
                <strong className="text-emerald-400 font-bold">{node.total_indicados_rede}</strong>
              </div>
              <p className="text-[11px] text-amber-400/90 pt-1 border-t border-slate-800">
                ⚠️ Os apoiadores subordinados a este líder serão preservados e vinculados ao nível superior na rede.
              </p>
            </div>
          )}

          {/* Botões */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-lg shadow-rose-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Excluindo...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Confirmar Exclusão</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
