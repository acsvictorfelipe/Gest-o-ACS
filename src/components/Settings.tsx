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
  Loader2,
  Plus,
  Trash2,
  Pencil,
  X
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
    confirmPassword: '',
    streets: user.streets || [] as string[]
  });

  const [newStreet, setNewStreet] = useState('');
  const [editingStreetIndex, setEditingStreetIndex] = useState<number | null>(null);
  const [editStreetValue, setEditStreetValue] = useState('');

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
          role: formData.role,
          streets: formData.streets
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

  const handleAddStreet = () => {
    if (!newStreet.trim()) return;
    const street = newStreet.trim();
    if (formData.streets.includes(street)) return;
    setFormData(prev => ({ ...prev, streets: [...prev.streets, street] }));
    setNewStreet('');
  };

  const handleRemoveStreet = (index: number) => {
    setFormData(prev => ({ ...prev, streets: prev.streets.filter((_, i) => i !== index) }));
  };

  const handleSaveStreetEdit = (index: number) => {
    if (!editStreetValue.trim()) return;
    const newStreets = [...formData.streets];
    newStreets[index] = editStreetValue.trim();
    setFormData(prev => ({ ...prev, streets: newStreets }));
    setEditingStreetIndex(null);
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
        <h2 className="text-2xl font-semibold tracking-tight text-text-primary dark:text-white">Configurações</h2>
        <p className="text-sm text-text-secondary font-medium tracking-tight">Gerencie suas informações de perfil e segurança.</p>
      </header>

      {message && (
        <div className={`p-3 rounded-lg flex items-center gap-2 animate-in slide-in-from-top-1 ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-100' 
            : 'bg-red-50 text-red-700 border border-red-100'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <p className="text-xs font-semibold uppercase tracking-tight">{message.text}</p>
        </div>
      )}

      <form onSubmit={handleUpdateProfile} className="space-y-6">
        {/* Perfil Profissional */}
        <section className="bg-bg-secondary dark:bg-slate-900 rounded-xl border border-border dark:border-slate-800 p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2 text-text-primary dark:text-white">
            <User className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold uppercase tracking-tight">Perfil Profissional</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Nome Completo</label>
              <input 
                type="text" 
                value={formData.name || ''}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-800 rounded-lg py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all text-text-primary dark:text-white"
                placeholder="Seu nome"
              />
            </div>

            {user.role === 'Agente' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Microárea</label>
                <input 
                  type="text" 
                  value={formData.microarea || ''}
                  onChange={e => setFormData({...formData, microarea: e.target.value})}
                  className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-800 rounded-lg py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all text-text-primary dark:text-white"
                  placeholder="Ex: 001"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Cargo / Função</label>
              <select 
                value={formData.role}
                onChange={e => setFormData({...formData, role: e.target.value})}
                disabled={user.role !== 'Administrador'}
                className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-800 rounded-lg py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all text-text-primary dark:text-white appearance-none disabled:opacity-50"
              >
                <option value="Agente">Agente Comunitário</option>
                <option value="Gestor">Gestor de Área</option>
                <option value="Administrador">Administrador</option>
              </select>
            </div>

            {(user.role === 'Agente' || user.role === 'Gestor') && (
              <div className="md:col-span-2 space-y-3">
                <label className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Cor de Identificação</label>
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

        {/* Gestão de Ruas */}
        {user.role === 'Agente' && (
          <section className="bg-bg-secondary dark:bg-slate-900 rounded-xl border border-border dark:border-slate-800 p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2 text-text-primary dark:text-white">
              <MapPin className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold uppercase tracking-tight">Gestão de Ruas</h3>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-text-muted font-medium">Cadastre as ruas da sua microárea para facilitar o preenchimento dos endereços.</p>
              
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newStreet}
                  onChange={e => setNewStreet(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleAddStreet())}
                  className="flex-1 bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-800 rounded-lg py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all text-text-primary dark:text-white"
                  placeholder="Nome da rua (Ex: Rua Principal)"
                />
                <button 
                  type="button"
                  onClick={handleAddStreet}
                  className="px-4 py-2 bg-primary/10 text-primary rounded-lg font-bold hover:bg-primary/20 transition-all flex items-center gap-2 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                {formData.streets.map((street: string, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-bg-primary dark:bg-slate-800 rounded-lg border border-border/50 group">
                    {editingStreetIndex === index ? (
                      <div className="flex-1 flex gap-2">
                        <input 
                          type="text"
                          autoFocus
                          value={editStreetValue}
                          onChange={e => setEditStreetValue(e.target.value)}
                          onKeyPress={e => e.key === 'Enter' && handleSaveStreetEdit(index)}
                          className="flex-1 bg-bg-secondary dark:bg-slate-900 border border-primary rounded px-2 py-1 text-sm outline-none"
                        />
                        <button type="button" onClick={() => handleSaveStreetEdit(index)} className="text-primary font-bold text-xs uppercase">Ok</button>
                        <button type="button" onClick={() => setEditingStreetIndex(null)} className="text-text-muted font-bold text-xs uppercase">Sair</button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm font-medium text-text-primary dark:text-white truncate pr-4">{street}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            type="button"
                            onClick={() => {
                              setEditingStreetIndex(index);
                              setEditStreetValue(street);
                            }}
                            className="p-1.5 text-text-muted hover:text-primary transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleRemoveStreet(index)}
                            className="p-1.5 text-text-muted hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {formData.streets.length === 0 && (
                  <div className="col-span-full py-8 text-center border-2 border-dashed border-border dark:border-slate-800 rounded-xl">
                    <p className="text-xs text-text-muted font-medium">Nenhuma rua cadastrada ainda.</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Segurança */}
        <section className="bg-bg-secondary dark:bg-slate-900 rounded-xl border border-border dark:border-slate-800 p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2 text-text-primary dark:text-white">
            <Lock className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-semibold uppercase tracking-tight">Segurança</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Email</label>
              <input 
                type="email" 
                value={formData.email || ''}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-800 rounded-lg py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all text-text-primary dark:text-white"
                placeholder="seu@email.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Nova Senha</label>
              <input 
                type="password" 
                value={formData.newPassword || ''}
                onChange={e => setFormData({...formData, newPassword: e.target.value})}
                className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-800 rounded-lg py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all text-text-primary dark:text-white"
                placeholder="Opcional"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Confirmar Senha</label>
              <input 
                type="password" 
                value={formData.confirmPassword || ''}
                onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-800 rounded-lg py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all text-text-primary dark:text-white"
              />
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-8 py-2.5 bg-primary text-white rounded-lg font-semibold shadow-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 text-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Alterações
          </button>
        </div>
      </form>
    </div>
  );
}

