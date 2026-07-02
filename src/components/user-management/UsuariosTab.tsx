import React from 'react';
import { UserPlus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { UserProfile, AppUser } from '../../types';

interface UsuariosTabProps {
  currentUser: AppUser | null;
  users: UserProfile[];
  editingUser: UserProfile | null;
  setEditingUser: (u: UserProfile | null) => void;
  formData: any;
  setFormData: (fd: any) => void;
  editFormData: any;
  setEditFormData: (efd: any) => void;
  handleCreateUser: (e: React.FormEvent) => Promise<void>;
  handleUpdateUser: (e: React.FormEvent) => Promise<void>;
  handleDeleteUser: (id: string, name: string) => Promise<void>;
  handleEditUser: (u: UserProfile) => void;
  submitting: boolean;
}

export function UsuariosTab({
  currentUser,
  users,
  editingUser,
  setEditingUser,
  formData,
  setFormData,
  editFormData,
  setEditFormData,
  handleCreateUser,
  handleUpdateUser,
  handleDeleteUser,
  handleEditUser,
  submitting
}: UsuariosTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
      {/* Form Column */}
      <div className="lg:col-span-1">
        <div className="bg-bg-secondary rounded-[32px] p-6 border border-border shadow-sm flex flex-col h-full">
          <h3 className="text-sm font-black text-text-primary uppercase tracking-wider mb-5 flex items-center gap-2 shrink-0">
            <UserPlus className="w-4.5 h-4.5 text-teal-600" />
            {editingUser ? 'Editar Perfil' : 'Novo Agente/Gestor'}
          </h3>

          {editingUser ? (
            // EDIT MODE
            <form onSubmit={handleUpdateUser} className="space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-text-muted">Nome do Usuário</label>
                  <input 
                    required 
                    type="text" 
                    value={editFormData.name} 
                    onChange={e => setEditFormData({...editFormData, name: e.target.value})}
                    className="w-full bg-bg-primary dark:bg-slate-800 border-none rounded-xl py-2.5 px-3.5 text-xs font-semibold focus:ring-2 focus:ring-teal-600/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-text-muted">Função / Cargo</label>
                  <select 
                    value={editFormData.role}
                    onChange={e => setEditFormData({...editFormData, role: e.target.value})}
                    disabled={currentUser?.role === 'Gestor'}
                    className="w-full bg-bg-primary dark:bg-slate-800 border-none rounded-xl py-2.5 px-3.5 text-xs font-bold focus:ring-2 focus:ring-teal-600/20 disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    <option value="Agente">Agente Comunitário</option>
                    {currentUser?.role !== 'Gestor' && (
                      <>
                        <option value="Gestor">Gestor / Supervisor</option>
                        <option value="Administrador">Administrador Geral</option>
                      </>
                    )}
                  </select>
                </div>

                {editFormData.role !== 'Administrador' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-wider text-text-muted">Número da Microárea</label>
                      <input 
                        required 
                        type="text" 
                        value={editFormData.microarea} 
                        onChange={e => setEditFormData({...editFormData, microarea: e.target.value})}
                        className="w-full bg-bg-primary dark:bg-slate-800 border-none rounded-xl py-2.5 px-3.5 text-xs font-semibold focus:ring-2 focus:ring-teal-600/20"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-wider text-text-muted">Cor da Microárea (Identificação)</label>
                      <div className="flex items-center gap-3">
                        <input 
                          type="color" 
                          value={editFormData.color} 
                          onChange={e => setEditFormData({...editFormData, color: e.target.value})}
                          disabled={currentUser?.role === 'Gestor'}
                          className="w-10 h-10 border-0 rounded-xl overflow-hidden cursor-pointer p-0 bg-transparent shrink-0 disabled:cursor-not-allowed"
                        />
                        <span className="text-[11px] font-mono font-bold uppercase">{editFormData.color}</span>
                        {currentUser?.role === 'Gestor' && (
                          <span className="text-[9px] text-text-muted font-bold uppercase">(Fixo para sua Equipe)</span>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 mt-6">
                <button 
                  type="submit" 
                  disabled={submitting} 
                  className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm flex items-center justify-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Atualizar
                </button>
                <button 
                  type="button" 
                  onClick={() => setEditingUser(null)} 
                  className="px-4 py-3 bg-bg-primary hover:bg-bg-primary/80 border border-border text-text-secondary hover:text-text-primary rounded-xl text-xs font-black uppercase tracking-wider"
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            // CREATE MODE
            <form onSubmit={handleCreateUser} className="space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-text-muted">Nome do Agente/Gestor</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="Nome completo"
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-bg-primary dark:bg-slate-800 border-none rounded-xl py-2.5 px-3.5 text-xs font-semibold focus:ring-2 focus:ring-teal-600/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-text-muted">Email Profissional</label>
                  <input 
                    required 
                    type="email" 
                    placeholder="exemplo@unidade.com"
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-bg-primary dark:bg-slate-800 border-none rounded-xl py-2.5 px-3.5 text-xs font-semibold focus:ring-2 focus:ring-teal-600/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-text-muted">Senha Inicial</label>
                  <input 
                    required 
                    type="password" 
                    placeholder="Mínimo 6 caracteres"
                    value={formData.password} 
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full bg-bg-primary dark:bg-slate-800 border-none rounded-xl py-2.5 px-3.5 text-xs font-semibold focus:ring-2 focus:ring-teal-600/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-text-muted">Função / Cargo</label>
                  <select 
                    value={formData.role} 
                    onChange={e => setFormData({...formData, role: e.target.value})}
                    disabled={currentUser?.role === 'Gestor'}
                    className="w-full bg-bg-primary dark:bg-slate-800 border-none rounded-xl py-2.5 px-3.5 text-xs font-bold focus:ring-2 focus:ring-teal-600/20 disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    <option value="Agente">Agente Comunitário</option>
                    {currentUser?.role !== 'Gestor' && (
                      <>
                        <option value="Gestor">Gestor / Supervisor</option>
                        <option value="Administrador">Administrador Geral</option>
                      </>
                    )}
                  </select>
                </div>

                {formData.role !== 'Administrador' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-wider text-text-muted">Microárea</label>
                      <input 
                        required 
                        type="text" 
                        placeholder="Número da microárea"
                        value={formData.microarea} 
                        onChange={e => setFormData({...formData, microarea: e.target.value})}
                        className="w-full bg-bg-primary dark:bg-slate-800 border-none rounded-xl py-2.5 px-3.5 text-xs font-semibold focus:ring-2 focus:ring-teal-600/20"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-wider text-text-muted">Cor da Área</label>
                      <div className="flex items-center gap-3">
                        <input 
                          type="color" 
                          value={formData.color} 
                          onChange={e => setFormData({...formData, color: e.target.value})}
                          disabled={currentUser?.role === 'Gestor'}
                          className="w-10 h-10 border-0 rounded-xl overflow-hidden cursor-pointer p-0 bg-transparent shrink-0 disabled:cursor-not-allowed"
                        />
                        <span className="text-[11px] font-mono font-bold uppercase">{formData.color}</span>
                        {currentUser?.role === 'Gestor' && (
                          <span className="text-[9px] text-text-muted font-bold uppercase">(Fixo para sua Equipe)</span>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button 
                type="submit" 
                disabled={submitting} 
                className="w-full mt-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm flex items-center justify-center gap-1.5 shrink-0"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Cadastrar Usuário
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Users List Column */}
      <div className="lg:col-span-2">
        <div className="bg-bg-secondary rounded-[32px] p-6 border border-border shadow-sm h-full flex flex-col">
          <h3 className="text-sm font-black text-text-primary uppercase tracking-wider mb-5 shrink-0">Usuários Cadastrados ({users.length})</h3>
          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
            {users.map(u => {
              const isCurrentUser = u.id === currentUser?.id;
              const isSystemAdmin = u.role === 'Administrador';
              return (
                <div key={u.id} className="p-3.5 rounded-2xl border border-border/80 flex items-center justify-between gap-3 bg-bg-primary/20 hover:bg-bg-primary/40 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: u.color }} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-[13px] font-black text-text-primary uppercase truncate tracking-tight">{u.name}</h4>
                        <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded leading-none shrink-0 ${
                          isSystemAdmin 
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400' 
                            : u.role === 'Gestor' 
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' 
                              : 'bg-teal-100 text-teal-700 dark:bg-teal-950/30 dark:text-teal-400'
                        }`}>
                          {u.role}
                        </span>
                      </div>
                      <p className="text-[10px] text-text-muted font-semibold mt-1 truncate">
                        {u.email} {!isSystemAdmin && `• Microárea ${u.microarea || '--'}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button 
                      onClick={() => handleEditUser(u)} 
                      className="p-2 border border-border rounded-xl hover:bg-bg-primary text-text-secondary hover:text-text-primary transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {!isCurrentUser && (
                      <button 
                        onClick={() => handleDeleteUser(u.id, u.name || '')} 
                        className="p-2 border border-border rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 text-text-muted hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
