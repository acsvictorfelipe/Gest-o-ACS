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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-primary tracking-tight font-headline">Gestão de Domicílios</h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-slate-500 font-medium">Visualize e gerencie as unidades familiares da sua microárea.</p>
            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold rounded-full border border-slate-200 dark:border-slate-700">
              {filteredHouseholds.length} Total
            </span>
          </div>
        </div>
        <button 
          onClick={() => navigate('/novo-cadastro')}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all"
        >
          <Plus className="w-5 h-5" />
          Novo Domicílio
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
        <input 
          type="text" 
          placeholder="Pesquisar por Nome do Responsável, CNS ou Endereço..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white dark:bg-slate-900 border-none rounded-2xl py-4 pl-12 pr-6 shadow-sm focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium text-on-surface"
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-10 h-10 animate-spin mb-4" />
          <p className="font-medium">Carregando domicílios...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHouseholds.length > 0 ? (
            filteredHouseholds.map((h) => (
              <div 
                key={h.id}
                onClick={() => navigate(`/domicilio/${h.id}`)}
                className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md hover:border-primary/20 transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 dark:text-slate-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <Home className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-2">
                    {(user.role === 'Administrador' || (user.role === 'Agente' && h.agent_id === user.id)) && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm(h.id);
                        }}
                        className="p-2 text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors"
                        title="Excluir Domicílio"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-primary transition-colors" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-lg font-bold text-on-surface font-headline line-clamp-1">{h.responsible_name}</h4>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-1">Responsável Familiar</p>
                  </div>

                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <User className="w-4 h-4" />
                    <span className="text-xs font-medium">CNS: {h.responsible_cns}</span>
                  </div>

                  <div className="flex items-start gap-2 text-slate-500 dark:text-slate-400">
                    <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                    <span className="text-xs font-medium leading-relaxed">
                      {h.address}, {h.number}
                      {h.complement && ` - ${h.complement}`}
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Microárea {h.microarea}</span>
                  <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-1 rounded">Ver Detalhes</span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-800">
              <Home className="w-12 h-12 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
              <p className="text-slate-500 dark:text-slate-400 font-medium">Nenhum domicílio encontrado.</p>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400">
                <AlertTriangle className="w-10 h-10" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-on-surface font-headline">Excluir Domicílio?</h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium">
                  Esta ação excluirá permanentemente este domicílio, **todos os pacientes vinculados a ele** e seus históricos de visitas.
                </p>
              </div>

              <div className="flex flex-col w-full gap-3">
                <button 
                  onClick={handleDelete}
                  disabled={deleting}
                  className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    'Sim, Excluir Tudo Permanentemente'
                  )}
                </button>
                <button 
                  onClick={() => setDeleteConfirm(null)}
                  disabled={deleting}
                  className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
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
