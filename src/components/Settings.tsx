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
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-extrabold text-primary tracking-tight font-headline">Configurações do Perfil</h2>
        <p className="text-slate-500 mt-1 font-medium">Gerencie suas informações pessoais e credenciais de acesso.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 ${
          message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-900/30' 
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/30'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <p className="text-sm font-bold">{message.text}</p>
        </div>
      )}

      <form onSubmit={handleUpdateProfile} className="space-y-6">
        {/* Perfil Profissional */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <User className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold text-on-surface font-headline">Perfil Profissional</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Nome Completo</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input 
                  type="text" 
                  value={formData.name || ''}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
                  placeholder="Seu nome completo"
                />
              </div>
            </div>

            {user.role === 'Agente' && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Microárea de Atuação</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input 
                    type="text" 
                    value={formData.microarea || ''}
                    onChange={e => setFormData({...formData, microarea: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
                    placeholder="Ex: 001"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Função no Sistema</label>
              <select 
                value={formData.role}
                onChange={e => setFormData({...formData, role: e.target.value})}
                disabled={user.role !== 'Administrador'}
                className={`w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all text-on-surface ${user.role !== 'Administrador' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <option value="Agente">Agente Comunitário (ACS)</option>
                <option value="Gestor">Gestor de Área</option>
                <option value="Administrador">Administrador</option>
              </select>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 ml-1">
                {user.role !== 'Administrador' 
                  ? 'Apenas administradores podem alterar a função de um usuário.' 
                  : (formData.role === 'Agente' 
                    ? 'Você verá apenas os dados que você mesmo cadastrou.' 
                    : formData.role === 'Gestor'
                      ? 'Você verá todos os dados cadastrados na sua cor de área.'
                      : 'Você terá acesso total a todos os dados do sistema.')}
              </p>
            </div>

            {(user.role === 'Agente' || user.role === 'Gestor') && (
              <div className="md:col-span-2 space-y-4">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1 flex items-center gap-2">
                  <Palette className="w-3 h-3" />
                  Cor de Identificação {user.role === 'Gestor' && '(Apenas Visualização)'}
                </label>
                <div className="flex flex-wrap gap-3">
                  {colors.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      disabled={user.role === 'Gestor'}
                      onClick={() => setFormData({...formData, color: c.value})}
                      className={`group relative w-12 h-12 rounded-2xl transition-all ${
                        formData.color === c.value ? 'ring-4 ring-primary/20 scale-110 shadow-lg' : 'hover:scale-105'
                      } ${user.role === 'Gestor' ? 'cursor-default' : ''}`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    >
                      {formData.color === c.value && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5 text-white drop-shadow-md" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Segurança e Acesso */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-xl">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold text-on-surface font-headline">Segurança e Acesso</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Email de Acesso</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input 
                  type="email" 
                  value={formData.email || ''}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Nova Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input 
                  type="password" 
                  value={formData.newPassword || ''}
                  onChange={e => setFormData({...formData, newPassword: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
                  placeholder="Deixe em branco para manter"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Confirmar Nova Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input 
                  type="password" 
                  value={formData.confirmPassword || ''}
                  onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
                  placeholder="Repita a nova senha"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-10 py-4 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            Salvar Alterações
          </button>
        </div>
      </form>
    </div>
  );
}
