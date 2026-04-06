import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  UserPlus, 
  Trash2, 
  Mail, 
  Lock, 
  User, 
  Shield, 
  Palette, 
  MapPin,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Pencil,
  X as CloseIcon
} from 'lucide-react';

export function UserManagement({ currentUser }: { currentUser: any }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Agente',
    color: '#00488d',
    microarea: ''
  });

  const [editingUser, setEditingUser] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    role: '',
    microarea: '',
    color: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      // 1. Create Auth Record
      const isSystemAdmin = formData.role === 'Administrador';
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            role: formData.role,
            color: isSystemAdmin ? null : formData.color,
            microarea: isSystemAdmin ? '' : formData.microarea
          }
        }
      });

      if (authError) throw authError;

      // Note: The trigger in Supabase will handle profile creation
      // But we might need to update it if the trigger doesn't use metadata
      // For now, let's manually update the profile to be sure
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            name: formData.name,
            role: formData.role,
            color: isSystemAdmin ? '#64748b' : formData.color, // Use a neutral color for admins if needed
            microarea: isSystemAdmin ? '' : formData.microarea
          })
          .eq('id', authData.user.id);
        
        if (profileError) console.error("Profile update error:", profileError);
      }

      setMessage({ type: 'success', text: 'Usuário criado com sucesso! Verifique o e-mail para confirmação.' });
      setFormData({ name: '', email: '', password: '', role: 'Agente', color: '#00488d', microarea: '' });
      fetchUsers();
    } catch (error: any) {
      console.error("Error creating user:", error);
      setMessage({ type: 'error', text: error.message || 'Erro ao criar usuário.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUser.id) {
      alert("Você não pode excluir seu próprio usuário.");
      return;
    }

    if (!window.confirm("Tem certeza que deseja excluir este usuário? O perfil será removido.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Perfil de usuário removido com sucesso.' });
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user profile:", error);
      setMessage({ type: 'error', text: 'Erro ao remover perfil.' });
    }
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setEditFormData({
      name: user.name || '',
      role: user.role || 'Agente',
      microarea: user.microarea || '',
      color: user.color || '#00488d'
    });
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const isSystemAdmin = editFormData.role === 'Administrador';
      const { error } = await supabase
        .from('profiles')
        .update({
          name: editFormData.name,
          role: editFormData.role,
          microarea: isSystemAdmin ? '' : editFormData.microarea,
          color: isSystemAdmin ? '#64748b' : editFormData.color
        })
        .eq('id', editingUser.id);

      if (error) throw error;
      
      setMessage({ type: 'success', text: 'Usuário atualizado com sucesso.' });
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      setMessage({ type: 'error', text: 'Erro ao atualizar usuário.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (currentUser.role !== 'Administrador') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Shield className="w-16 h-16 mb-4 opacity-20" />
        <h2 className="text-xl font-bold text-slate-600">Acesso Restrito</h2>
        <p>Apenas administradores podem gerenciar usuários.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-extrabold text-primary tracking-tight font-headline">Gerenciamento de Usuários</h2>
        <p className="text-slate-500 mt-1 font-medium">Crie e gerencie as credenciais de acesso dos Agentes Comunitários.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Form Section */}
        <div className="lg:col-span-1">
          <form onSubmit={handleCreateUser} className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800 space-y-6">
            <h3 className="text-lg font-bold text-primary font-headline flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Novo Usuário
            </h3>

            {message.text && (
              <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 ${
                message.type === 'success' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'
              }`}>
                {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {message.text}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    required
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 pl-10 text-sm focus:ring-2 focus:ring-primary/20"
                    placeholder="Nome do Agente"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">E-mail de Acesso</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    required
                    type="email" 
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 pl-10 text-sm focus:ring-2 focus:ring-primary/20"
                    placeholder="agente@gestaoacs.com"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Senha Provisória</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    required
                    type="password" 
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 pl-10 text-sm focus:ring-2 focus:ring-primary/20"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Função</label>
                <select 
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 px-3 text-sm focus:ring-2 focus:ring-primary/20"
                >
                  <option value="Agente">Agente (ACS)</option>
                  <option value="Gestor">Gestor de Área</option>
                  <option value="Administrador">Administrador</option>
                </select>
              </div>
            </div>

            <button 
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Criar Usuário'}
            </button>
          </form>
        </div>

        {/* List Section */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="p-8 border-b border-slate-50 dark:border-slate-800">
              <h3 className="text-lg font-bold text-primary font-headline">Usuários Cadastrados</h3>
            </div>
            
            {loading ? (
              <div className="p-20 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-10 h-10 animate-spin mb-4" />
                <p>Carregando usuários...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Usuário</th>
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Função / Área</th>
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-bold text-sm">
                              {u.name?.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-on-surface">{u.name}</p>
                              <p className="text-[10px] text-slate-400">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tighter">
                              {u.role} • {u.microarea ? `MA ${u.microarea}` : 'Sem MA'}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: u.color }}></div>
                              <span className="text-[10px] font-bold uppercase" style={{ color: u.color }}>
                                {u.color === '#00488d' ? 'Azul' : 
                                 u.color === '#eab308' ? 'Amarelo' : 
                                 u.color === '#64748b' ? 'Cinza' : 
                                 u.color === '#db2777' ? 'Rosa' : 'Marrom'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleEditUser(u)}
                              className="p-2 text-slate-300 hover:text-primary transition-colors"
                              title="Editar Perfil"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                              title="Excluir Perfil"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-primary font-headline">Editar Usuário</h3>
              <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <CloseIcon className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleUpdateUser} className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Nome Completo</label>
                  <input 
                    required
                    type="text" 
                    value={editFormData.name}
                    onChange={e => setEditFormData({...editFormData, name: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Função</label>
                    <select 
                      value={editFormData.role}
                      onChange={e => setEditFormData({...editFormData, role: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 px-3 text-sm focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="Agente">Agente (ACS)</option>
                      <option value="Gestor">Gestor de Área</option>
                      <option value="Administrador">Administrador</option>
                    </select>
                  </div>
                  {editFormData.role !== 'Administrador' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Microárea</label>
                      <input 
                        type="text" 
                        value={editFormData.microarea}
                        onChange={e => setEditFormData({...editFormData, microarea: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary/20"
                        placeholder="Ex: 001"
                      />
                    </div>
                  )}
                </div>

                {editFormData.role !== 'Administrador' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Cor da Área</label>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { color: '#00488d', label: 'Azul' },
                        { color: '#eab308', label: 'Amarelo' },
                        { color: '#64748b', label: 'Cinza' },
                        { color: '#db2777', label: 'Rosa' },
                        { color: '#78350f', label: 'Marrom' }
                      ].map((c) => (
                        <button
                          key={c.color}
                          type="button"
                          onClick={() => setEditFormData({...editFormData, color: c.color})}
                          className={`w-8 h-8 rounded-full transition-all ${editFormData.color === c.color ? 'ring-4 ring-primary/20 scale-110' : 'opacity-50 hover:opacity-100'}`}
                          style={{ backgroundColor: c.color }}
                          title={c.label}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button 
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar Alterações'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
