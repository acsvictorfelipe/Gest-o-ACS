import React, { useState } from 'react';
import { supabase, getSupabaseConfig, saveCustomSupabaseConfig } from '../lib/supabase';
import { Mail, Lock, LogIn, UserCircle, Loader2, Eye, EyeOff, Settings } from 'lucide-react';

export function Login() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Supabase Custom Config State
  const [showConfigModal, setShowConfigModal] = useState(false);
  const currentConfig = getSupabaseConfig();
  const [customUrl, setCustomUrl] = useState(currentConfig.url || '');
  const [customKey, setCustomKey] = useState(currentConfig.anonKey || '');

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl || !customKey) {
      alert('Por favor, informe a URL e a Anon Key do Supabase.');
      return;
    }
    saveCustomSupabaseConfig(customUrl, customKey);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword
      });

      if (authError) throw authError;
    } catch (err: any) {
      console.error("Login error:", err);
      const msg = err?.message || '';

      if (msg === 'Invalid login credentials') {
        setError('E-mail ou senha incorretos. Verifique se digitou o e-mail e a senha corretamente (atenção a maiúsculas e minúsculas).');
      } else if (msg.includes('Email not confirmed')) {
        setError('E-mail não confirmado no Supabase. Por favor, verifique a sua caixa de entrada para confirmar o e-mail ou confirme a conta pelo painel do Supabase.');
      } else if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        setError('Erro de conexão com o Supabase. Verifique sua conexão com a internet ou se as chaves do Supabase estão configuradas.');
      } else if (msg.includes('rate limit') || msg.includes('Too many requests')) {
        setError('Muitas tentativas malsucedidas. Aguarde alguns minutos antes de tentar novamente.');
      } else {
        setError(msg || 'Ocorreu um erro ao tentar entrar. Tente novamente.');
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
                    type={showPassword ? 'text' : 'password'} 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-bg-primary border border-border rounded-xl py-3.5 pl-11 pr-11 text-sm focus:ring-2 focus:ring-[#14B8A6]/20 text-text-primary placeholder:text-text-muted outline-none transition-all" 
                    placeholder="••••••••" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary focus:outline-none"
                    title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
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

            <div className="mt-8 pt-6 border-t border-border flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => setShowConfigModal(true)}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-text-muted hover:text-[#14B8A6] transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Configurar Servidor Supabase</span>
              </button>
              <p className="text-[10px] text-text-muted font-semibold uppercase tracking-widest">
                © 2024 Gestão ACS • PRONTUÁRIO DIGITAL
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Supabase Config Modal (for APK / Mobile setup) */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-bg-secondary border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#14B8A6]" />
                <h3 className="font-bold text-base text-text-primary">Conexão Supabase</h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-text-muted hover:text-text-primary text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-text-secondary mb-4 leading-relaxed">
              Altere os parâmetros de conexão caso esteja executando o aplicativo Android (APK) offline ou sem variáveis pré-compiladas.
            </p>
            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">
                  VITE_SUPABASE_URL
                </label>
                <input
                  type="text"
                  required
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://xxxx.supabase.co"
                  className="w-full bg-bg-primary border border-border rounded-xl p-3 text-xs text-text-primary focus:ring-2 focus:ring-[#14B8A6]/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">
                  VITE_SUPABASE_ANON_KEY
                </label>
                <textarea
                  required
                  rows={3}
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  placeholder="eyJh..."
                  className="w-full bg-bg-primary border border-border rounded-xl p-3 text-xs text-text-primary focus:ring-2 focus:ring-[#14B8A6]/20 outline-none resize-none font-mono"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-text-muted hover:text-text-primary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#14B8A6] text-white text-xs font-bold rounded-xl shadow-md hover:bg-[#10B981] transition-all"
                >
                  Salvar e Reiniciar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

