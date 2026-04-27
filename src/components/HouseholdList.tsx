import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { syncService } from '../lib/syncService';
import { useNavigate } from 'react-router-dom';
import { 
  Home, 
  Search, 
  User, 
  ChevronRight, 
  MapPin, 
  Plus,
  Loader2,
  Trash2,
  AlertTriangle
} from 'lucide-react';

export function HouseholdList({ user }: { user: any }) {
  const navigate = useNavigate();
  const [households, setHouseholds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchHouseholds = async () => {
      if (!user.microarea && user.role !== 'Administrador' && user.role !== 'Gestor') return;
      setLoading(true);
      try {
        let allHouseholds: any[] = [];
        let from = 0;
        let to = 999;
        let hasMore = true;

        while (hasMore && allHouseholds.length < 5000) {
          let query = supabase
            .from('households')
            .select('*')
            .order('created_at', { ascending: false })
            .range(from, to);

          if (user.role === 'Administrador') {
            // No filters for Admin
          } else if (user.role === 'Gestor') {
            query = query.eq('area_color', user.color);
          } else {
            query = query.eq('agent_id', user.id);
          }

          const { data, error } = await query;
          if (error) throw error;
          
          if (data && data.length > 0) {
            allHouseholds = [...allHouseholds, ...data];
            if (data.length < 1000) {
              hasMore = false;
            } else {
              from += 1000;
              to += 1000;
            }
          } else {
            hasMore = false;
          }
        }
        
        setHouseholds(allHouseholds);
      } catch (error) {
        console.error("Error fetching households:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchHouseholds();
  }, [user.microarea, user.id, user.role, user.color]);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      if (!navigator.onLine) {
        // Queue deletions
        const patientsInH = households.find(h => h.id === deleteConfirm)?.patients || [];
        if (patientsInH.length > 0) {
          for (const r of patientsInH) {
            await syncService.addToQueue('visits', 'DELETE', { filter: { patient_id: r.id } });
            await syncService.addToQueue('patients', 'DELETE', { id: r.id });
          }
        }
        await syncService.addToQueue('households', 'DELETE', { id: deleteConfirm });
        
        setHouseholds(households.filter(h => h.id !== deleteConfirm));
        setDeleteConfirm(null);
        alert('Exclusão agendada para sincronização.');
        return;
      }

      // 1. Get all patients in this household
      const { data: patientsInH } = await supabase
        .from('patients')
        .select('id')
        .eq('household_id', deleteConfirm);

      if (patientsInH && patientsInH.length > 0) {
        const patientIds = patientsInH.map(p => p.id);
        
        // 2. Delete visits for these patients
        const { error: vError } = await supabase
          .from('visits')
          .delete()
          .in('patient_id', patientIds);
        if (vError) throw vError;

        // 3. Delete patients
        const { error: pError } = await supabase
          .from('patients')
          .delete()
          .eq('household_id', deleteConfirm);
        if (pError) throw pError;
      }

      // 4. Delete household
      const { error } = await supabase
        .from('households')
        .delete()
        .eq('id', deleteConfirm);

      if (error) throw error;

      setHouseholds(households.filter(h => h.id !== deleteConfirm));
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Error deleting household:", error);
    } finally {
      setDeleting(false);
    }
  };

  const filteredHouseholds = households.filter(h => {
    const matchesSearch = h.responsible_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.responsible_cns?.includes(searchTerm) ||
      h.address?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const isPlaceholder = h.responsible_name === 'Responsável Importado' || h.responsible_name === 'Responsável não cadastrado';
    
    return matchesSearch && !isPlaceholder;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <header className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Domicílios</h2>
          <p className="text-sm text-slate-500 font-medium tracking-tight">Gerencie as residências e famílias da sua microárea.</p>
        </header>
        <button 
          onClick={() => navigate('/novo-cadastro')}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-bold shadow-sm hover:opacity-90 transition-all"
        >
          <Plus className="w-4 h-4" />
          Novo Domicílio
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative group max-w-2xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
        <input 
          type="text" 
          placeholder="Pesquisar por endereço ou responsável..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg py-2.5 pl-11 pr-6 shadow-sm focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium text-slate-900 dark:text-white"
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary" />
          <p className="text-sm font-medium">Carregando dados...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredHouseholds.length > 0 ? (
            filteredHouseholds.map((h) => (
              <div 
                key={h.id}
                onClick={() => navigate(`/domicilio/${h.id}`)}
                className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-400 dark:text-slate-500 group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                      <Home className="w-5 h-5" />
                    </div>
                    {(user.role === 'Administrador' || (user.role === 'Agente' && h.agent_id === user.id)) && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm(h.id);
                        }}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        title="Excluir Domicílio"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1 leading-tight group-hover:text-primary transition-colors">{h.responsible_name}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Responsável</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-[11px] font-medium leading-relaxed truncate">
                        {h.address}, {h.number}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <User className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-[11px] font-medium truncate font-mono">CNS: {h.responsible_cns}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/40"></div>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Microárea {h.microarea}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-24 text-center bg-slate-50/50 dark:bg-slate-800/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              <div className="max-w-[240px] mx-auto space-y-2">
                <Home className="w-8 h-8 text-slate-200 dark:text-slate-700 mx-auto" />
                <p className="text-sm font-medium text-slate-400">Nenhum domicílio encontrado na busca.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-sm w-full shadow-xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Excluir Domicílio?</h3>
                <p className="text-sm text-slate-500 font-medium">
                  Todos os pacientes vinculados e seus históricos serão removidos permanentemente.
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button 
                  onClick={handleDelete}
                  disabled={deleting}
                  className="w-full py-2.5 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar Exclusão'}
                </button>
                <button 
                  onClick={() => setDeleteConfirm(null)}
                  disabled={deleting}
                  className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
