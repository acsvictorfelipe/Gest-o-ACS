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
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute inset-0 bg-[url('https://lh3.googleusercontent.com/aida-public/AB6AXuBw_Qxmslfjk2WkWp0HorXpufsyWlW3eoAqqjCe4Q6SIMTPTcc7u4KcnA6WRkvcPG-IpH-_rcqmC1XdxjRap3MyyhMOAQSDms15KBV2FVUhrzb5dy5si5dgJx3mWC2QYu7u3SDFuT1km9mX3IrJlN-NMiudSwcjeAGylppq9wuY3EjH1qooxSTTOk8bGH98idSkEsBuTHmXAddPMBtiI7GBOJHPvodGRsMNo7jeY0Bq1ti_-auc0WYr5bVkiK9WYWTQezpFKkxqqOE')] opacity-5 pointer-events-none bg-cover bg-center"></div>
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-secondary/5 pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-800 overflow-hidden">
          <div className="p-8 md:p-10">
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <UserCircle className="w-8 h-8 text-primary" />
              </div>
              <h1 className="font-headline font-extrabold text-2xl text-on-surface tracking-tight mb-2">Gestão ACS</h1>
              <p className="font-label text-sm font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500">Portal do Agente Comunitário</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-xs font-bold border border-red-100 dark:border-red-900/30 animate-in fade-in zoom-in duration-300">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 pl-10 text-sm focus:ring-2 focus:ring-primary/20 text-on-surface" 
                    placeholder="seu@email.com" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 pl-10 text-sm focus:ring-2 focus:ring-primary/20 text-on-surface" 
                    placeholder="••••••••" 
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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

            <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 text-center">
              <p className="text-xs text-slate-400">
                © 2024 Gestão ACS • <a href="#" className="hover:text-primary underline">Suporte</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
