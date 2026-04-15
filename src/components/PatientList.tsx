import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { syncService } from '../lib/syncService';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  User, 
  Search, 
  ChevronRight, 
  MapPin, 
  Plus,
  Loader2,
  Baby,
  Stethoscope,
  Activity,
  HeartPulse,
  Pencil,
  Copy,
  Check,
  Filter,
  X,
  Trash2,
  AlertTriangle,
  AlertCircle,
  Smile,
  Bed,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';

import { calculateAge, getAgeInMonths, VACCINE_SCHEDULE, formatDate, parseDate } from '../lib/dateUtils';

export function PatientList({ user }: { user: any }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState(searchParams.get('filter') || 'all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    const filter = searchParams.get('filter');
    const search = searchParams.get('search');
    if (filter) {
      setActiveFilter(filter);
    }
    if (search) {
      setSearchTerm(search);
    }
  }, [searchParams]);

  useEffect(() => {
    // Reset state when filters change
    setPatients([]);
    setPage(0);
    setHasMore(true);
  }, [searchTerm, activeFilter, user.microarea, user.id, user.role, user.color]);

  useEffect(() => {
    const fetchPatients = async () => {
      if (!user.microarea && user.role !== 'Administrador' && user.role !== 'Gestor') return;
      
      const isInitialFetch = page === 0;
      if (isInitialFetch) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        let query = supabase
          .from('patients')
          .select('*', { count: 'exact' })
          .order('name', { ascending: true });

        // Role-based filters
        if (user.role === 'Gestor') {
          query = query.eq('area_color', user.color);
        } else if (user.role !== 'Administrador') {
          query = query.eq('agent_id', user.id);
        }

        // Search filter
        if (searchTerm) {
          query = query.or(`name.ilike.%${searchTerm}%,cns.like.%${searchTerm}%`);
        }

        // Active status filters
        if (activeFilter === 'pending') {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          query = query.or(`last_visit_at.is.null,last_visit_at.lt.${thirtyDaysAgo.toISOString()}`);
        } else if (activeFilter === 'gestantes') {
          query = query.contains('categories', ['Gestante']);
        } else if (activeFilter === 'crianças') {
          query = query.contains('categories', ['Criança']);
        } else if (activeFilter === 'acamados') {
          query = query.contains('categories', ['AcamadoDomiciliado']);
        } else if (activeFilter === 'idosos') {
          query = query.contains('categories', ['Idoso']);
        } else if (activeFilter === 'hipertensos') {
          query = query.or('clinical_data->chronic->>hipertensao.eq.Sim,clinical_data->gestante->>hipertensao.eq.Sim,clinical_data->gestante->>pressaoAlta.eq.Sim,clinical_data->acamadodomiciliado->>hipertensao.eq.Sim,clinical_data->acamadodomiciliado->>pressaoAlta.eq.Sim,clinical_data->adulto->>hipertensao.eq.Sim,clinical_data->adulto->>pressaoAlta.eq.Sim,clinical_data->idoso->>hipertensao.eq.Sim,clinical_data->idoso->>pressaoAlta.eq.Sim');
        } else if (activeFilter === 'diabéticos') {
          query = query.or('clinical_data->chronic->>diabetes.eq.Sim,clinical_data->gestante->>diabetes.eq.Sim,clinical_data->acamadodomiciliado->>diabetes.eq.Sim,clinical_data->adulto->>diabetes.eq.Sim,clinical_data->idoso->>diabetes.eq.Sim');
        }

        // Pagination
        const from = page * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;
        query = query.range(from, to);

        const { data, error, count } = await query;
        if (error) throw error;
        
        if (data) {
          setPatients(prev => isInitialFetch ? data : [...prev, ...data]);
          setHasMore(count ? (page + 1) * ITEMS_PER_PAGE < count : data.length === ITEMS_PER_PAGE);
        }
      } catch (error) {
        console.error("Error fetching patients:", error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };
    fetchPatients();
  }, [page, searchTerm, activeFilter, user.microarea, user.id, user.role, user.color]);

  const filteredPatients = patients;
    
  // Use a simpler pass-through since server does most filtering
  // Except for 'vaccine' which we'll handle by fetching more if needed or just showing current matches
  const displayPatients = activeFilter === 'vaccine' 
    ? filteredPatients.filter(p => {
        const isChild = p.categories?.includes('Criança');
        if (!isChild) return false;
        const ageInMonths = p.birth_date ? getAgeInMonths(p.birth_date) : 0;
        const vaccines = p.clinical_data?.crianca?.vacinas || {};
        const dueVaccines = VACCINE_SCHEDULE.filter(group => group.age <= ageInMonths).flatMap(group => group.vaccines);
        return dueVaccines.some(v => vaccines[v.id] !== 'Sim');
      })
    : filteredPatients;

  const clearFilter = () => {
    setActiveFilter('all');
    setSearchParams({});
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      const patient = patients.find(p => p.id === deleteConfirm);
      
      if (!navigator.onLine) {
        if (patient?.is_family_responsible) {
          await syncService.addToQueue('households', 'UPDATE', {
            id: patient.household_id,
            responsible_name: 'Responsável não cadastrado',
            last_update_at: new Date().toISOString()
          });
        }
        // Queue visit deletion by patient_id
        await syncService.addToQueue('visits', 'DELETE', { filter: { patient_id: deleteConfirm } });
        // Queue patient deletion
        await syncService.addToQueue('patients', 'DELETE', { id: deleteConfirm });
        
        setPatients(patients.filter(p => p.id !== deleteConfirm));
        setDeleteConfirm(null);
        toast.success('Exclusão agendada para sincronização.');
        return;
      }

      // 1. If this patient is the responsible, update household
      if (patient?.is_family_responsible && patient.household_id) {
        const { error: hError } = await supabase
          .from('households')
          .update({ 
            responsible_name: 'Responsável não cadastrado',
            last_update_at: new Date().toISOString()
          })
          .eq('id', patient.household_id);
        if (hError) console.error("Error updating household during delete:", hError);
      }

      // 2. First delete visits related to this patient
      const { error: vError } = await supabase
        .from('visits')
        .delete()
        .eq('patient_id', deleteConfirm);
      
      if (vError) throw vError;

      // 3. Then delete the patient
      const { error: pError } = await supabase
        .from('patients')
        .delete()
        .eq('id', deleteConfirm);

      if (pError) throw pError;

      setPatients(patients.filter(p => p.id !== deleteConfirm));
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Error deleting patient:", error);
      toast.error("Erro ao excluir paciente.");
    } finally {
      setDeleting(false);
    }
  };

  const copyToClipboard = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    // Optional: show a temporary toast or change icon
  };

  const getCategoryIcon = (categories: string[]) => {
    if (categories?.includes('Gestante')) return <Baby className="w-4 h-4 text-blue-500" />;
    if (categories?.includes('Criança')) return <Smile className="w-4 h-4 text-green-500" />;
    if (categories?.includes('AcamadoDomiciliado')) return <Bed className="w-4 h-4 text-teal-500" />;
    if (categories?.includes('Idoso')) return <HeartPulse className="w-4 h-4 text-red-500" />;
    return <User className="w-4 h-4 text-slate-400" />;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-primary tracking-tight font-headline">Lista de Cidadãos</h2>
          <p className="text-slate-500 mt-1 font-medium">Gerencie todos os pacientes cadastrados na sua microárea.</p>
        </div>
        <button 
          onClick={() => navigate('/novo-cadastro')}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all"
        >
          <Plus className="w-5 h-5" />
          Novo Cadastro
        </button>
      </div>

      {/* Search Bar & Filters */}
      <div className="space-y-3">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Pesquisar por Nome ou CNS..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border-none rounded-xl py-3 pl-11 pr-6 shadow-sm focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium text-on-surface"
          />
        </div>

        {activeFilter !== 'all' && (
          <div className="flex items-center gap-3 animate-in slide-in-from-left-2">
            <button 
              onClick={clearFilter}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-xs font-bold transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              Voltar
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-bold">
              <Filter className="w-3 h-3" />
              {activeFilter === 'pending' ? 'Visitas Pendentes' : 
               activeFilter === 'vaccine' ? 'Vacinas Atrasadas' : 
               activeFilter === 'gestantes' ? 'Gestantes' :
               activeFilter === 'crianças' ? 'Crianças < 2a' :
               activeFilter === 'acamados' ? 'Acamados / Domiciliados' :
               activeFilter === 'idosos' ? 'Idosos' :
               activeFilter === 'hipertensos' ? 'Hipertensos' :
               activeFilter === 'diabéticos' ? 'Diabéticos' :
               activeFilter}
              <button 
                onClick={clearFilter}
                className="p-0.5 hover:bg-primary/20 rounded-full transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              {displayPatients.length} {displayPatients.length === 1 ? 'carregado' : 'carregados'}
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-10 h-10 animate-spin mb-4" />
          <p className="font-medium">Carregando cidadãos...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                    <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Cidadão</th>
                    <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">CNS</th>
                    <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Categorias</th>
                    <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Última Visita</th>
                    <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {displayPatients.length > 0 ? (
                    displayPatients.map((p) => (
                      <tr 
                        key={p.id} 
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                        onClick={() => p.household_id ? navigate(`/domicilio/${p.household_id}`) : navigate(`/editar-paciente/${p.id}`)}
                      >
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold text-sm group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                              {p.name?.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-on-surface">{p.name}</p>
                                <button 
                                  onClick={(e) => copyToClipboard(p.name, e)}
                                  className="p-1 text-slate-300 hover:text-primary transition-colors"
                                  title="Copiar Nome"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                              <div className="flex items-center gap-2">
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                  {p.gender}, {p.birth_date ? calculateAge(p.birth_date) : 'N/A'}
                                </p>
                                <button 
                                  onClick={(e) => copyToClipboard(p.birth_date, e)}
                                  className="p-1 text-slate-300 hover:text-primary transition-colors"
                                  title="Copiar Data de Nascimento"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                              {(p.contact || p.message_contact) && (
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                  {p.contact && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-[9px] font-bold text-primary uppercase">Tel:</span>
                                      <span className="text-[9px] text-slate-400">{p.contact}</span>
                                      <button 
                                        onClick={(e) => copyToClipboard(p.contact, e)}
                                        className="p-1 text-slate-300 hover:text-primary transition-colors"
                                        title="Copiar Contato"
                                      >
                                        <Copy className="w-2.5 h-2.5" />
                                      </button>
                                    </div>
                                  )}
                                  {p.message_contact && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-[9px] font-bold text-orange-500 uppercase">Recado:</span>
                                      <span className="text-[9px] text-slate-400">{p.message_contact}</span>
                                      <button 
                                        onClick={(e) => copyToClipboard(p.message_contact, e)}
                                        className="p-1 text-slate-300 hover:text-primary transition-colors"
                                        title="Copiar Contato de Recado"
                                      >
                                        <Copy className="w-2.5 h-2.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{p.cns}</span>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex flex-wrap gap-2">
                            {p.categories?.map((cat: string) => (
                              <div key={cat} className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg group-hover:bg-white dark:group-hover:bg-slate-700 transition-colors">
                                {getCategoryIcon([cat])}
                                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">{cat}</span>
                              </div>
                            ))}
                            {(!p.categories || p.categories.length === 0) && (
                              <span className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase">Sem Categoria</span>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              {p.last_visit_at ? new Date(p.last_visit_at).toLocaleDateString('pt-BR') : 'Nunca'}
                            </span>
                            {(() => {
                              const lastVisit = p.last_visit_at ? new Date(p.last_visit_at) : null;
                              const daysAgo = lastVisit ? Math.floor((Date.now() - lastVisit.getTime()) / (1000 * 60 * 60 * 24)) : null;
                              const statusInfo = !lastVisit
                                ? { label: 'Nunca visitado', cls: 'text-red-500' }
                                : daysAgo! > 30
                                ? { label: `Atrasado ${daysAgo}d`, cls: 'text-orange-500' }
                                : { label: 'Regular', cls: 'text-green-500' };
                              
                              return (
                                <div className={`flex items-center gap-1 mt-1 text-[9px] font-bold uppercase ${statusInfo.cls}`}>
                                  {statusInfo.label}
                                </div>
                              );
                            })()}
                            {p.categories?.includes('Criança') && (() => {
                              if (!p.birth_date) return null;
                              const birth = parseDate(p.birth_date);
                              if (!birth) return null;
                              
                              const sixMonthsDate = new Date(birth);
                              sixMonthsDate.setMonth(birth.getMonth() + 6);
                              const now = new Date();
                              const diffDays = Math.ceil((sixMonthsDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                              
                              if (diffDays <= 15 && diffDays >= -15) {
                                return (
                                  <div className="flex items-center gap-1 mt-1 text-red-500 animate-pulse">
                                    <AlertCircle className="w-3 h-3" />
                                    <span className="text-[9px] font-bold uppercase">Visita 6 Meses Próxima</span>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                            {p.categories?.includes('Criança') && (() => {
                              const ageInMonths = p.birth_date ? getAgeInMonths(p.birth_date) : 0;
                              const vaccines = p.clinical_data?.crianca?.vacinas || {};
                              const dueVaccines = VACCINE_SCHEDULE
                                .filter(group => group.age <= ageInMonths)
                                .flatMap(group => group.vaccines);
                              const hasPending = dueVaccines.some(v => vaccines[v.id] !== 'Sim');
                              
                              return hasPending ? (
                                <span className="text-[9px] font-bold text-orange-500 uppercase mt-1">Vacina Atrasada</span>
                              ) : null;
                            })()}
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2">
                            {(user.role === 'Administrador' || (user.role === 'Agente' && p.agent_id === user.id)) && (
                              <>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/editar-paciente/${p.id}`);
                                  }}
                                  className="p-2 text-slate-300 dark:text-slate-600 hover:text-primary transition-colors"
                                  title="Editar Paciente"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirm(p.id);
                                  }}
                                  className="p-2 text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors"
                                  title="Excluir Paciente"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            <button className="p-2 text-slate-300 dark:text-slate-600 group-hover:text-primary transition-colors">
                              <ChevronRight className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center text-slate-400 dark:text-slate-500 font-medium">
                        Nenhum cidadão encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden divide-y divide-slate-50 dark:divide-slate-800">
              {displayPatients.length > 0 ? (
                displayPatients.map((p) => (
                  <div 
                    key={p.id} 
                    className="p-6 space-y-4 active:bg-slate-50 dark:active:bg-slate-800/50 transition-colors"
                    onClick={() => p.household_id ? navigate(`/domicilio/${p.household_id}`) : navigate(`/editar-paciente/${p.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-primary/10`} style={{ backgroundColor: p.area_color || '#00488d' }}>
                          {p.name.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-base font-bold text-on-surface">{p.name}</span>
                          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                            {p.gender}, {p.birth_date ? calculateAge(p.birth_date) : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/editar-paciente/${p.id}`);
                          }}
                          className="p-2 text-slate-400"
                        >
                          <Pencil className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm(p.id);
                          }}
                          className="p-2 text-slate-400"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CNS</span>
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">{p.cns}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</span>
                        {(() => {
                            const lastVisit = p.last_visit_at ? new Date(p.last_visit_at) : null;
                            const daysAgo = lastVisit ? Math.floor((Date.now() - lastVisit.getTime()) / (1000 * 60 * 60 * 24)) : null;
                            const statusInfo = !lastVisit
                              ? { label: 'Nunca visitado', cls: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' }
                              : daysAgo! > 30
                              ? { label: `Atrasado ${daysAgo}d`, cls: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' }
                              : { label: 'Regular', cls: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' };
                            
                            return (
                              <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${statusInfo.cls}`}>
                                {statusInfo.label}
                              </div>
                            );
                          })()}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {p.categories?.map((cat: string) => (
                        <div key={cat} className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                          {getCategoryIcon([cat])}
                          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">{cat}</span>
                        </div>
                      ))}
                    </div>

                    {(p.contact || p.message_contact) && (
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl space-y-2">
                        {p.contact && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-primary uppercase">Contato:</span>
                              <span className="text-xs text-slate-600 dark:text-slate-400">{p.contact}</span>
                            </div>
                            <button onClick={(e) => copyToClipboard(p.contact, e)} className="p-1 text-slate-400">
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        {p.message_contact && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-orange-500 uppercase">Recado:</span>
                              <span className="text-xs text-slate-600 dark:text-slate-400">{p.message_contact}</span>
                            </div>
                            <button onClick={(e) => copyToClipboard(p.message_contact, e)} className="p-1 text-slate-400">
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="px-8 py-20 text-center text-slate-400">
                  Nenhum cidadão encontrado.
                </div>
              )}
            </div>
          </div>

          {/* Load More Button */}
          {hasMore && !loading && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => setPage(prev => prev + 1)}
                disabled={loadingMore}
                className="flex items-center gap-2 px-8 py-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl font-bold text-slate-600 dark:text-slate-300 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  'Carregar Mais'
                )}
              </button>
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
                <h3 className="text-2xl font-black text-on-surface font-headline">Excluir Cadastro?</h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium">
                  Esta ação é irreversível. Todos os dados do paciente e seu histórico de visitas serão removidos permanentemente.
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
                    'Sim, Excluir Permanentemente'
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
