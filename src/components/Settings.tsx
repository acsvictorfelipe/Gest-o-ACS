import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Settings as SettingsIcon, 
  User, 
  Mail, 
  Lock, 
  Palette, 
  MapPin, 
  Save, 
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';

export function Settings({ user, onProfileUpdate }: { user: any, onProfileUpdate?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [formData, setFormData] = useState({
    name: user.name || '',
    microarea: user.microarea || '',
    color: user.color || '#00488d',
    role: user.role || 'Agente',
    email: user.email || '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const isSystemAdmin = formData.role === 'Administrador';
      // 1. Update Supabase Profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          microarea: isSystemAdmin ? '' : formData.microarea,
          color: isSystemAdmin ? '#64748b' : formData.color,
          role: formData.role
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // 2. Update Auth if changed
      const updateData: any = {};
      if (formData.email !== user.email) {
        updateData.email = formData.email;
      }
      if (formData.newPassword) {
        if (formData.newPassword !== formData.confirmPassword) {
          throw new Error("As senhas não coincidem.");
        }
        updateData.password = formData.newPassword;
      }

      if (Object.keys(updateData).length > 0) {
        const { error: authError } = await supabase.auth.updateUser(updateData);
        if (authError) throw authError;
      }

      setMessage({ type: 'success', text: 'Configurações atualizadas com sucesso! Algumas alterações podem exigir confirmação por e-mail.' });
      
      // Clear password fields
      setFormData(prev => ({ ...prev, newPassword: '', confirmPassword: '' }));
      
      // Refresh parent profile
      if (onProfileUpdate) onProfileUpdate();
      
    } catch (error: any) {
      console.error("Error updating settings:", error);
      setMessage({ type: 'error', text: error.message || "Erro ao atualizar configurações." });
    } finally {
      setLoading(false);
    }
  };

  const colors = [
    { name: 'AZUL', value: '#00488d' },
    { name: 'AMARELO', value: '#eab308' },
    { name: 'CINZA', value: '#64748b' },
    { name: 'ROSA', value: '#db2777' },
    { name: 'MARROM', value: '#713f12' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      <header className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Configurações</h2>
        <p className="text-sm text-slate-500 font-medium tracking-tight">Gerencie suas informações de perfil e segurança.</p>
      </header>

      {message && (
        <div className={`p-3 rounded-lg flex items-center gap-2 animate-in slide-in-from-top-1 ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-100' 
            : 'bg-red-50 text-red-700 border border-red-100'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <p className="text-xs font-bold uppercase tracking-tight">{message.text}</p>
        </div>
      )}

      <form onSubmit={handleUpdateProfile} className="space-y-6">
        {/* Perfil Profissional */}
        <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white">
            <User className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-tight">Perfil Profissional</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Nome Completo</label>
              <input 
                type="text" 
                value={formData.name || ''}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-lg py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all text-slate-900 dark:text-white"
                placeholder="Seu nome"
              />
            </div>

            {user.role === 'Agente' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Microárea</label>
                <input 
                  type="text" 
                  value={formData.microarea || ''}
                  onChange={e => setFormData({...formData, microarea: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-lg py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all text-slate-900 dark:text-white"
                  placeholder="Ex: 001"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Cargo / Função</label>
              <select 
                value={formData.role}
                onChange={e => setFormData({...formData, role: e.target.value})}
                disabled={user.role !== 'Administrador'}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-lg py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all text-slate-900 dark:text-white appearance-none disabled:opacity-50"
              >
                <option value="Agente">Agente Comunitário</option>
                <option value="Gestor">Gestor de Área</option>
                <option value="Administrador">Administrador</option>
              </select>
            </div>

            {(user.role === 'Agente' || user.role === 'Gestor') && (
              <div className="md:col-span-2 space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Cor de Identificação</label>
                <div className="flex flex-wrap gap-2">
                  {colors.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      disabled={user.role === 'Gestor'}
                      onClick={() => setFormData({...formData, color: c.value})}
                      className={`relative w-8 h-8 rounded-lg transition-all ${
                        formData.color === c.value ? 'ring-2 ring-primary ring-offset-2' : ''
                      }`}
                      style={{ backgroundColor: c.value }}
                    >
                      {formData.color === c.value && <CheckCircle2 className="w-4 h-4 text-white absolute -top-1 -right-1 bg-primary rounded-full" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Segurança */}
        <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white">
            <Lock className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-bold uppercase tracking-tight">Segurança</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Email</label>
              <input 
                type="email" 
                value={formData.email || ''}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-lg py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all text-slate-900 dark:text-white"
                placeholder="seu@email.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Nova Senha</label>
              <input 
                type="password" 
                value={formData.newPassword || ''}
                onChange={e => setFormData({...formData, newPassword: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-lg py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all text-slate-900 dark:text-white"
                placeholder="Opcional"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Confirmar Senha</label>
              <input 
                type="password" 
                value={formData.confirmPassword || ''}
                onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-lg py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-8 py-2.5 bg-primary text-white rounded-lg font-bold shadow-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 text-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Alterações
          </button>
        </div>
      </form>
    </div>
  );
}
