import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, AlertCircle, HelpCircle } from 'lucide-react';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
}

type ConfirmResolver = (value: boolean) => void;

interface ConfirmContextType {
  confirm: (options: string | ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmDialogProvider');
  }
  return context.confirm;
}

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({ message: '' });
  const resolverRef = useRef<ConfirmResolver | null>(null);

  const confirm = useCallback((opt: string | ConfirmOptions) => {
    const parsedOptions: ConfirmOptions = typeof opt === 'string' ? { message: opt } : opt;
    setOptions(parsedOptions);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const handleCancel = () => {
    setIsOpen(false);
    if (resolverRef.current) {
      resolverRef.current(false);
    }
  };

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolverRef.current) {
      resolverRef.current(true);
    }
  };

  const {
    title = 'Confirmar Ação',
    message,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    variant = 'primary',
  } = options;

  let icon = <HelpCircle className="w-6 h-6 text-primary shrink-0" />;
  let confirmBtnClass = 'bg-primary hover:bg-primary-dark text-white focus:ring-primary/20';
  
  if (variant === 'danger') {
    icon = <AlertCircle className="w-6 h-6 text-red-500 shrink-0 animate-pulse" />;
    confirmBtnClass = 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-200';
  } else if (variant === 'warning') {
    icon = <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />;
    confirmBtnClass = 'bg-amber-500 hover:bg-amber-600 text-white focus:ring-amber-200';
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCancel}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                    {icon}
                  </div>
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-slate-950 dark:text-slate-100 uppercase tracking-widest">
                      {title}
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                      {message}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-800 transition-colors"
                  >
                    {cancelLabel}
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border border-transparent shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${confirmBtnClass}`}
                  >
                    {confirmLabel}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}
