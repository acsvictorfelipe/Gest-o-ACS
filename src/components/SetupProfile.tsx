import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Palette, 
  MapPin, 
  Save, 
  CheckCircle2,
  Loader2,
  LogOut
} from 'lucide-react';

export function SetupProfile({ user, onComplete }: { user: any, onComplete: () => void }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    microarea: user.microarea || '',
    color: user.color || '#00488d'
  });

  const colors = [
    { name: 'AZUL', value: '#00488d' },
    { name: 'AMARELO', value: '#eab308' },
    { name: 'CINZA', value: '#64748b' },
    { name: 'ROSA', value: '#db2777' },
    { name: 'MARROM', value: '#713f12' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user.role === 'Agente' && !formData.microarea) {
      alert("Por favor, informe sua microárea.");
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          microarea: formData.microarea,
          color: formData.color
        })
        .eq('id', user.id);

      if (error) throw error;
      onComplete();
    } catch (error) {
      console.error("Error setting up profile:", error);
      alert("Erro ao salvar configurações iniciais.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-10 space-y-8">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Palette className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-extrabold text-primary font-headline">Configuração Inicial</h2>
            <p className="text-slate-500 text-sm">Olá, {user.name}! Antes de começar, precisamos configurar seu perfil de trabalho.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">
              {user.role === 'Agente' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Sua Microárea</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      required
                      type="text" 
                      value={formData.microarea}
                      onChange={e => setFormData({...formData, microarea: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all"
                      placeholder="Ex: 001"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 ml-1">Isso define quais pacientes você verá no sistema.</p>
                </div>
              )}

              <div className="space-y-4">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                  <Palette className="w-3 h-3" />
                  Cor da sua Área
                </label>
                <div className="flex flex-wrap justify-center gap-4">
                  {colors.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setFormData({...formData, color: c.value})}
                      className={`group relative w-14 h-14 rounded-2xl transition-all ${
                        formData.color === c.value ? 'ring-4 ring-primary/20 scale-110 shadow-lg' : 'hover:scale-105 opacity-60 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    >
                      {formData.color === c.value && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <CheckCircle2 className="w-6 h-6 text-white drop-shadow-md" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-center text-slate-400">
                  {user.role === 'Gestor' 
                    ? 'Como Gestor, você verá todos os dados desta cor.' 
                    : 'Escolha a cor que identifica sua microárea.'}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Concluir Configuração
              </button>
              
              <button
                type="button"
                onClick={() => supabase.auth.signOut()}
                className="w-full py-3 text-slate-400 hover:text-slate-600 text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sair do Sistema
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
