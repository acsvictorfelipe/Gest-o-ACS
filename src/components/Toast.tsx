import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  const success = useCallback((message: string, duration?: number) => toast(message, 'success', duration), [toast]);
  const error = useCallback((message: string, duration?: number) => toast(message, 'error', duration), [toast]);
  const warning = useCallback((message: string, duration?: number) => toast(message, 'warning', duration), [toast]);
  const info = useCallback((message: string, duration?: number) => toast(message, 'info', duration), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}
      <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((item) => {
            let icon = <Info className="w-5 h-5 text-blue-500 shrink-0" />;
            let bgClass = 'bg-white dark:bg-slate-900 border-l-4 border-blue-500 text-slate-800 dark:text-slate-100';
            
            if (item.type === 'success') {
              icon = <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
              bgClass = 'bg-white dark:bg-slate-900 border-l-4 border-emerald-500 text-slate-800 dark:text-slate-100';
            } else if (item.type === 'error') {
              icon = <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />;
              bgClass = 'bg-white dark:bg-slate-900 border-l-4 border-rose-500 text-slate-800 dark:text-slate-100';
            } else if (item.type === 'warning') {
              icon = <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />;
              bgClass = 'bg-white dark:bg-slate-900 border-l-4 border-amber-500 text-slate-800 dark:text-slate-100';
            }

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                transition={{ duration: 0.2 }}
                className={`flex items-start justify-between gap-3 p-4 rounded-lg shadow-lg border border-slate-200/50 dark:border-slate-800/50 pointer-events-auto ${bgClass}`}
              >
                <div className="flex gap-2.5 items-start">
                  {icon}
                  <p className="text-sm font-medium leading-5">{item.message}</p>
                </div>
                <button
                  onClick={() => removeToast(item.id)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
