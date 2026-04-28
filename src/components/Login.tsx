import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, LogIn, UserCircle, Loader2 } from 'lucide-react';

export function Login() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) throw authError;
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.message === 'Invalid login credentials') {
        setError('E-mail ou senha incorretos.');
      } else {
        setError(err.message || 'Ocorreu um erro ao tentar entrar.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#14B8A6]/5 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#3B82F6]/5 blur-[120px] rounded-full"></div>

      <div className="relative z-10 w-full max-w-sm px-6">
        <div className="bg-bg-secondary rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-border overflow-hidden">
          <div className="p-10">
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#14B8A6]/10 mb-6 border border-[#14B8A6]/20">
                <UserCircle className="w-8 h-8 text-[#14B8A6]" />
              </div>
              <h1 className="text-2xl font-bold text-text-primary tracking-tight leading-none">Gestão ACS</h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted mt-3">Portal do Agente Comunitário</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="bg-red-50 text-red-500 p-4 rounded-xl text-[11px] font-semibold border border-red-100 animate-in fade-in zoom-in duration-300">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-bg-primary border border-border rounded-xl py-3.5 pl-11 pr-4 text-sm focus:ring-2 focus:ring-[#14B8A6]/20 text-text-primary placeholder:text-text-muted outline-none transition-all" 
                    placeholder="seu@exemplo.com" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-bg-primary border border-border rounded-xl py-3.5 pl-11 pr-4 text-sm focus:ring-2 focus:ring-[#14B8A6]/20 text-text-primary placeholder:text-text-muted outline-none transition-all" 
                    placeholder="••••••••" 
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 bg-[#14B8A6] text-white font-bold rounded-xl shadow-lg shadow-[#14B8A6]/20 hover:bg-[#10B981] transition-all flex items-center justify-center gap-2 disabled:opacity-50 uppercase text-xs tracking-widest"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Entrar no Sistema
                    <LogIn className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-10 pt-8 border-t border-border text-center">
              <p className="text-[10px] text-text-muted font-semibold uppercase tracking-widest">
                © 2024 Gestão ACS • PRONTUÁRIO DIGITAL
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
