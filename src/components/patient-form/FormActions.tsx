import React from 'react';
import { Save, Trash2, RefreshCw, AlertTriangle, Loader2, UserPlus } from 'lucide-react';

interface FormActionsProps {
  id: string | undefined;
  loading: boolean;
  deleting: boolean;
  deleteConfirm: boolean;
  setDeleteConfirm: React.Dispatch<React.SetStateAction<boolean>>;
  handleDelete: () => void;
  onCancel: () => void;
  isReadOnly?: boolean;
  showSaveAndAddAnother?: boolean;
  onSaveAndAddAnother?: () => void;
}

export function FormActions({ 
  id, 
  loading, 
  deleting, 
  deleteConfirm, 
  setDeleteConfirm, 
  handleDelete, 
  onCancel, 
  isReadOnly,
  showSaveAndAddAnother,
  onSaveAndAddAnother
}: FormActionsProps) {
  return (
    <>
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-6 border-t border-border dark:border-slate-800">
        {!isReadOnly && id && (
          <button 
            type="button"
            onClick={() => setDeleteConfirm(true)}
            className="sm:mr-auto flex items-center justify-center gap-2 py-2.5 px-4 text-red-500 font-bold hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl text-xs transition-all tracking-tight uppercase cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            Excluir Registro
          </button>
        )}
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button 
            type="button"
            onClick={onCancel}
            className="flex-1 sm:flex-none px-4 sm:px-5 py-3 sm:py-2.5 text-text-secondary dark:text-text-muted font-bold hover:text-text-primary dark:hover:text-white transition-colors text-xs uppercase tracking-wider rounded-xl bg-slate-100 dark:bg-slate-800 sm:bg-transparent"
          >
            {isReadOnly ? 'Voltar' : 'Cancelar'}
          </button>
          {!isReadOnly && showSaveAndAddAnother && onSaveAndAddAnother && (
            <button 
              type="button"
              disabled={loading}
              onClick={onSaveAndAddAnother}
              className="flex-1 sm:flex-none px-4 sm:px-5 py-3 sm:py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-xs uppercase tracking-wider active:scale-95 cursor-pointer"
              title="Salva este morador e prepara o formulário para o próximo da mesma família"
            >
              <UserPlus className="w-4 h-4 shrink-0" />
              <span className="truncate">Salvar e Próximo</span>
            </button>
          )}
          {!isReadOnly && (
            <button 
              type="submit"
              disabled={loading}
              className="flex-1 sm:flex-none px-6 sm:px-7 py-3 sm:py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 min-w-[140px] uppercase text-xs tracking-wider cursor-pointer active:scale-95"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 shrink-0" />
                  {id ? 'Salvar' : 'Concluir'}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-[2px] animate-in fade-in duration-200">
          <div className="bg-bg-primary dark:bg-slate-900 rounded-xl p-6 max-w-sm w-full shadow-2xl border border-border dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400">
                <AlertTriangle className="w-8 h-8" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-text-primary dark:text-white tracking-tight uppercase">Excluir Cadastro?</h3>
                <p className="text-xs text-text-secondary dark:text-text-muted font-medium leading-relaxed">
                  Esta ação é irreversível. Todos os dados e histórico de visitas serão removidos permanentemente.
                </p>
              </div>

              <div className="grid grid-cols-1 w-full gap-2 pt-2">
                <button 
                  onClick={handleDelete}
                  disabled={deleting}
                  className="w-full py-2.5 bg-red-600 text-white rounded-lg font-bold text-xs uppercase tracking-widest shadow-sm hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Removendo...
                    </>
                  ) : (
                    'Confirmar Exclusão'
                  )}
                </button>
                <button 
                  onClick={() => setDeleteConfirm(false)}
                  disabled={deleting}
                  className="w-full py-2.5 bg-bg-secondary dark:bg-slate-800 text-text-secondary dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-border dark:hover:bg-slate-700 transition-colors disabled:opacity-50 uppercase tracking-widest"
                >
                  Manter Cadastro
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

