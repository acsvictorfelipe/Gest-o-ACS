import React, { createContext, useContext, useState, useEffect } from 'react';
import { Lock, ShieldCheck, ShieldAlert, KeyRound } from 'lucide-react';

interface SecurityContextType {
  isLocked: boolean;
  unlock: (pin: string) => boolean;
  lock: () => void;
  hasPin: boolean;
  setPin: (newPin: string) => void;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export function SecurityProvider({ children }: { children: React.ReactNode }) {
  const [isLocked, setIsLocked] = useState(true);
  const [pin, setInternalPin] = useState<string | null>(localStorage.getItem('gestao_acs_pin'));

  const hasPin = !!pin;

  const unlock = (inputPin: string) => {
    if (inputPin === pin) {
      setIsLocked(false);
      return true;
    }
    return false;
  };

  const lock = () => setIsLocked(true);

  const setPin = (newPin: string) => {
    localStorage.setItem('gestao_acs_pin', newPin);
    setInternalPin(newPin);
    setIsLocked(false);
  };

  // Auto-lock on visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && hasPin) {
        // setIsLocked(true); // Optional: auto-lock when app goes to background
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [hasPin]);

  return (
    <SecurityContext.Provider value={{ isLocked, unlock, lock, hasPin, setPin }}>
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurity() {
  const context = useContext(SecurityContext);
  if (context === undefined) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
}

export function SecurityLock() {
  const { isLocked, unlock, hasPin, setPin } = useSecurity();
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const [step, setStep] = useState<'create' | 'confirm' | 'unlock'>(hasPin ? 'unlock' : 'create');
  const [tempPin, setTempPin] = useState('');

  if (!isLocked && hasPin) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 'unlock') {
      if (unlock(input)) {
        setInput('');
        setError(false);
      } else {
        setError(true);
        setInput('');
      }
    } else if (step === 'create') {
      setTempPin(input);
      setInput('');
      setStep('confirm');
    } else if (step === 'confirm') {
      if (input === tempPin) {
        setPin(input);
      } else {
        setError(true);
        setInput('');
        setStep('create');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-primary flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-2xl text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
          {step === 'unlock' ? <Lock className="w-10 h-10" /> : <ShieldCheck className="w-10 h-10" />}
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-primary font-headline">
            {step === 'unlock' ? 'Acesso Restrito' : step === 'create' ? 'Configurar PIN' : 'Confirmar PIN'}
          </h2>
          <p className="text-slate-500 text-sm font-medium">
            {step === 'unlock' 
              ? 'Insira seu código de acesso para visualizar os dados sensíveis.' 
              : 'Crie um código de 4 a 6 dígitos para proteger as informações dos pacientes.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center gap-3">
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className={`w-full text-center text-3xl tracking-[1em] font-bold bg-slate-50 border-2 ${error ? 'border-red-500' : 'border-slate-100'} rounded-2xl py-4 focus:ring-4 focus:ring-primary/10 transition-all outline-none`}
              placeholder="••••"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-red-500 text-xs font-bold animate-bounce">
              {step === 'confirm' ? 'Os PINs não coincidem. Tente novamente.' : 'PIN incorreto. Tente novamente.'}
            </p>
          )}

          <button
            type="submit"
            className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
          >
            {step === 'unlock' ? 'Desbloquear' : 'Continuar'}
          </button>
        </form>

        <div className="pt-4 flex items-center justify-center gap-2 text-slate-400">
          <KeyRound className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Segurança de Dados ACS</span>
        </div>
      </div>
    </div>
  );
}
