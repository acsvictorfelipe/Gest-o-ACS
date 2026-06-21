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

import type { UserProfile, Household } from '../types';

export function HouseholdList({ user }: { user: UserProfile }) {
  const navigate = useNavigate();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedStreet, setSelectedStreet] = useState<string | null>(null);

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

  const streetStats = React.useMemo(() => {
    const configStreets = (user.streets || []).slice().sort((a: string, b: string) => a.localeCompare(b));
    
    const stats: Record<string, number> = {};
    // Initialize stats with config streets
    configStreets.forEach((street: string) => {
      stats[street] = 0;
    });

    households.forEach(h => {
      const isPlaceholder = h.responsible_name === 'Responsável Importado' || h.responsible_name === 'Responsável não cadastrado';
      if (h.responsible_cns && !isPlaceholder && h.address) {
        const hStreetNormalized = h.address.trim().toUpperCase();
        // Find matching street from config (using normalized comparison)
        const matchedConfigStreet = configStreets.find((s: string) => s.trim().toUpperCase() === hStreetNormalized);
        if (matchedConfigStreet) {
          stats[matchedConfigStreet] += 1;
        }
      }
    });
    
    return Object.entries(stats);
  }, [households, user.streets]);

  const filteredHouseholds = households.filter(h => {
    const matchesSearch = h.responsible_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.responsible_cns?.includes(searchTerm) ||
      h.address?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const isPlaceholder = h.responsible_name === 'Responsável Importado' || h.responsible_name === 'Responsável não cadastrado';
    
    // Normalize household address
    const hStreet = h.address?.trim().toUpperCase();
    
    // Check if the street is in the configuration list
    const configStreets = (user.streets || []).map((s: string) => s.trim().toUpperCase());
    const isInConfig = configStreets.includes(hStreet || '');
    
    const matchesStreet = !selectedStreet || hStreet === selectedStreet.trim().toUpperCase();
    
    return matchesSearch && !isPlaceholder && matchesStreet && isInConfig;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <header className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold tracking-tight text-text-primary dark:text-white">Domicílios</h2>
          <p className="text-sm text-text-secondary font-medium tracking-tight">Gerencie as residências e famílias da sua microárea.</p>
        </header>
        {user.role !== 'Gestor' && (
          <button 
            onClick={() => navigate('/novo-cadastro')}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-bold shadow-sm hover:opacity-90 transition-all"
          >
            <Plus className="w-4 h-4" />
            Novo Domicílio
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative group max-w-2xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-primary transition-colors" />
        <input 
          type="text" 
          placeholder="Pesquisar por endereço ou responsável..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-bg-secondary dark:bg-slate-900 border border-border dark:border-slate-800 rounded-lg py-2.5 pl-11 pr-6 shadow-sm focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium text-text-primary dark:text-white"
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-text-muted">
          <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary" />
          <p className="text-sm font-medium">Carregando dados...</p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Street Filter Sidebar */}
          <aside className="w-full lg:w-64 shrink-0 space-y-4">
            <div className="bg-bg-secondary dark:bg-slate-900 rounded-xl border border-border dark:border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-border dark:border-slate-800 bg-bg-primary/50">
                <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
                  <MapPin className="w-3 h-3" />
                  Ruas ({streetStats.length})
                </h3>
              </div>
              <div className="max-h-[300px] lg:max-h-[600px] overflow-y-auto custom-scrollbar">
                <button
                  onClick={() => setSelectedStreet(null)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-xs font-semibold transition-colors border-b border-border/50 last:border-0 ${
                    !selectedStreet ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-bg-primary'
                  }`}
                >
                  <span>Todas as Ruas</span>
                  <span className="bg-bg-primary dark:bg-slate-800 px-2 py-0.5 rounded-full text-[10px] text-text-muted">{households.length}</span>
                </button>
                {streetStats.map(([street, count]) => (
                  <button
                    key={street}
                    onClick={() => setSelectedStreet(street === selectedStreet ? null : street)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-xs font-semibold transition-colors border-b border-border/50 last:border-0 text-left ${
                      selectedStreet === street ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-bg-primary'
                    }`}
                  >
                    <span className="truncate pr-2">
                      {street}
                    </span>
                    <span className="bg-bg-primary dark:bg-slate-800 px-2 py-0.5 rounded-full text-[10px] text-text-muted">{count}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Household Cards */}
          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredHouseholds.length > 0 ? (
                filteredHouseholds.map((h) => (
                  <div 
                    key={h.id}
                    onClick={() => navigate(`/domicilio/${h.id}`)}
                    className="bg-bg-secondary dark:bg-slate-900 p-4 rounded-xl border border-border dark:border-slate-800 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between min-h-[160px]"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="p-2 bg-bg-primary dark:bg-slate-800 rounded-lg text-text-muted dark:text-text-secondary group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                          <Home className="w-4 h-4" />
                        </div>
                        {(user.role === 'Administrador' || (user.role === 'Agente' && h.agent_id === user.id)) && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm(h.id);
                            }}
                            className="p-1.5 text-text-muted hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                            title="Excluir Domicílio"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-text-primary dark:text-white line-clamp-1 leading-tight group-hover:text-primary transition-colors">{h.responsible_name}</h4>
                        <div className="flex items-center gap-1.5 mt-1">
                          <MapPin className="w-3 h-3 text-text-muted" />
                          <span className="text-[10px] text-text-muted font-medium truncate">
                            {h.address}, {h.number}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border dark:border-slate-800 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-text-muted font-bold uppercase tracking-tight truncate max-w-[120px]">CNS: {h.responsible_cns}</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-16 text-center bg-bg-primary/50 dark:bg-slate-800/20 rounded-xl border border-dashed border-border dark:border-slate-800">
                  <div className="max-w-[240px] mx-auto space-y-2">
                    <Home className="w-6 h-6 text-text-muted dark:text-slate-700 mx-auto" />
                    <p className="text-xs font-medium text-text-muted">Nenhum domicílio encontrado.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-[2px] animate-in fade-in duration-200">
          <div className="bg-bg-secondary dark:bg-slate-900 rounded-xl p-6 max-w-sm w-full shadow-xl border border-border dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-text-primary dark:text-white leading-tight">Excluir Domicílio?</h3>
                <p className="text-sm text-text-secondary font-medium">
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
                  className="w-full py-2.5 bg-bg-primary text-text-secondary rounded-lg font-bold hover:bg-border transition-colors text-sm"
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
