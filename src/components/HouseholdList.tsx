import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, fetchTableWithFilters } from '../lib/supabase';
import { syncService } from '../lib/syncService';
import { useNavigate } from 'react-router-dom';
import { useToast } from './Toast';
import { 
  Home, 
  Search, 
  User, 
  ChevronRight, 
  MapPin, 
  Plus,
  Loader2,
  Trash2,
  AlertTriangle,
  UserPlus,
  Hash
} from 'lucide-react';

export function HouseholdList({ user }: { user: any }) {
  const navigate = useNavigate();
  const { info } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [numberSearch, setNumberSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedStreet, setSelectedStreet] = useState<string | null>(null);

  const { data: households = [], isLoading: loading } = useQuery({
    queryKey: ['householdsList', user?.id, user?.role, user?.color, user?.microarea],
    queryFn: async () => {
      if (!user) return [];
      if (!user.microarea && user.role !== 'Administrador' && user.role !== 'Gestor') return [];
      return await fetchTableWithFilters<any>('households', user, { select: '*, patients(id)' });
    },
    enabled: !!user && (!!user.microarea || user.role === 'Administrador' || user.role === 'Gestor'),
  });

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
        
        queryClient.setQueryData(['householdsList', user?.id, user?.role, user?.color, user?.microarea], (old: any) => {
          if (!old) return old;
          return old.filter((h: any) => h.id !== deleteConfirm);
        });
        setDeleteConfirm(null);
        info('Exclusão agendada para sincronização.');
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

      queryClient.setQueryData(['householdsList', user?.id, user?.role, user?.color, user?.microarea], (old: any) => {
        if (!old) return old;
        return old.filter((h: any) => h.id !== deleteConfirm);
      });
      queryClient.invalidateQueries({ queryKey: ['householdsList'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['patientList'] });
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Error deleting household:", error);
    } finally {
      setDeleting(false);
    }
  };

  const streetStats = React.useMemo(() => {
    const configStreets = (user?.streets || []).slice().sort((a: string, b: string) => a.localeCompare(b));
    
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
  }, [households, user?.streets]);

  const filteredHouseholds = households.filter(h => {
    const matchesSearch = !searchTerm ||
      h.responsible_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.responsible_cns?.includes(searchTerm) ||
      h.address?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesNumber = !numberSearch.trim() ||
      String(h.number || '').toLowerCase().includes(numberSearch.trim().toLowerCase());
    
    const isPlaceholder = h.responsible_name === 'Responsável Importado' || h.responsible_name === 'Responsável não cadastrado';
    
    // Normalize household address
    const hStreet = h.address?.trim().toUpperCase();
    
    // Check if the street is in the configuration list
    const configStreets = (user?.streets || []).map((s: string) => s.trim().toUpperCase());
    const isInConfig = configStreets.includes(hStreet || '');
    
    const matchesStreet = !selectedStreet || hStreet === selectedStreet.trim().toUpperCase();
    
    return matchesSearch && matchesNumber && !isPlaceholder && matchesStreet && isInConfig;
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, numberSearch, selectedStreet]);

  const totalCount = filteredHouseholds.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedHouseholds = filteredHouseholds.slice((page - 1) * pageSize, page * pageSize);

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

      {/* Search Bar & Number Filter */}
      <div className="flex flex-col sm:flex-row items-center gap-3 max-w-3xl">
        <div className="relative group flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Pesquisar por endereço ou responsável..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-bg-secondary dark:bg-slate-900 border border-border dark:border-slate-800 rounded-lg py-2.5 pl-11 pr-6 shadow-sm focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium text-text-primary dark:text-white"
          />
        </div>

        <div className="relative group w-full sm:w-48 shrink-0">
          <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Nº da residência..."
            value={numberSearch}
            onChange={(e) => setNumberSearch(e.target.value)}
            className="w-full bg-bg-secondary dark:bg-slate-900 border border-border dark:border-slate-800 rounded-lg py-2.5 pl-11 pr-4 shadow-sm focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium text-text-primary dark:text-white"
          />
        </div>
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

          {/* Household Cards rendered as a polished list */}
          <div className="flex-1">
            {filteredHouseholds.length > 0 ? (
              <div className="bg-bg-secondary dark:bg-slate-900 border border-border dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                {/* Header or column titles for desktop */}
                <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3.5 bg-bg-primary/50 dark:bg-slate-800/30 text-[10px] font-bold uppercase tracking-wider text-text-muted border-b border-border dark:border-slate-800">
                  <div className="col-span-4">Endereço</div>
                  <div className="col-span-3">Responsável Familiar</div>
                  <div className="col-span-2">CNS</div>
                  <div className="col-span-1 text-center">Cidadãos</div>
                  <div className="col-span-2 text-right">Ações</div>
                </div>

                <div className="divide-y divide-border dark:divide-slate-800">
                  {paginatedHouseholds.map((h) => {
                    const patientCount = h.patients?.length || 0;
                    return (
                      <div 
                        key={h.id}
                        onClick={() => navigate(`/domicilio/${h.id}`)}
                        className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-center px-6 py-4 hover:bg-slate-100/40 dark:hover:bg-slate-800/20 transition-all cursor-pointer group"
                      >
                        {/* Address */}
                        <div className="col-span-1 md:col-span-4 flex items-center gap-3">
                          <div className="p-2.5 bg-primary/10 dark:bg-slate-800 rounded-xl text-primary text-sm font-bold shrink-0">
                            <Home className="w-5 h-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-text-primary dark:text-white group-hover:text-primary transition-colors leading-tight truncate uppercase">
                              {h.address}, {h.number}
                            </p>
                            {h.complement && (
                              <p className="text-[11px] text-text-muted font-medium truncate mt-0.5">
                                {h.complement}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Responsible */}
                        <div className="col-span-1 md:col-span-3 flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-text-muted md:hidden shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                              {h.responsible_name || 'Não cadastrado'}
                            </p>
                            {h.reference && (
                              <p className="text-[10px] text-text-muted font-medium truncate mt-0.5">
                                Ref: {h.reference}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* CNS */}
                        <div className="col-span-1 md:col-span-2 text-xs font-medium text-text-muted font-mono leading-none">
                          <span className="md:hidden font-bold pr-1 font-sans">CNS:</span>
                          {h.responsible_cns || 'N/A'}
                        </div>

                        {/* Patient Count */}
                        <div className="col-span-1 md:col-span-1 md:text-center">
                          <span className={`${
                            patientCount > 0 
                              ? 'bg-teal-50 text-teal-600 dark:bg-teal-950/20 dark:text-teal-400 border border-teal-100/50' 
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                          } px-2.5 py-0.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1`}>
                            <span className="hidden md:inline">👥</span>
                            <span className="md:hidden font-semibold pr-1">Cadastrados:</span>
                            {patientCount}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="col-span-1 md:col-span-2 flex items-center justify-between md:justify-end gap-2 mt-2 md:mt-0">
                          <span className="text-[10px] text-text-muted font-medium md:hidden">Toque para ver detalhes</span>
                          <div className="flex items-center gap-1">
                            {user.role !== 'Gestor' && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/novo-cadastro?household=${h.id}`);
                                }}
                                className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/20 dark:hover:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold shadow-sm"
                                title="Adicionar Novo Membro da Família"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span className="text-[10.5px] tracking-tight uppercase">Membro</span>
                              </button>
                            )}
                            {(user.role === 'Administrador' || (user.role === 'Agente' && h.agent_id === user.id)) && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirm(h.id);
                                }}
                                className="p-2 text-text-muted hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                                title="Excluir Domicílio"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                            <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all hidden md:block" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Controls */}
                {totalCount > 0 && (
                  <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/60 border-t border-border dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-text-muted">
                    <div className="flex items-center gap-2">
                      <span>Exibindo página <strong>{page}</strong> de <strong>{totalPages}</strong> ({totalCount} domicílios)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <span>Por página:</span>
                        <select
                          value={pageSize}
                          onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setPage(1);
                          }}
                          className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
                        >
                          <option value={15}>15</option>
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
                        >
                          Anterior
                        </button>
                        <button
                          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                          disabled={page >= totalPages}
                          className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
                        >
                          Próxima
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-16 text-center bg-bg-primary/50 dark:bg-slate-800/20 rounded-xl border border-dashed border-border dark:border-slate-800">
                <div className="max-w-[240px] mx-auto space-y-2">
                  <Home className="w-6 h-6 text-text-muted dark:text-slate-700 mx-auto" />
                  <p className="text-xs font-medium text-text-muted">Nenhum domicílio encontrado.</p>
                </div>
              </div>
            )}
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
