import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { syncService } from '../lib/syncService';
import { formatDate, isPatientBolsaFamilia, calculateAge } from '../lib/dateUtils';
import { useToast } from './Toast';
import { queryClient } from '../lib/queryClient';
import { PatientForm } from './PatientForm';
import { 
  Home, 
  Users, 
  History, 
  PlusCircle, 
  ChevronRight, 
  CheckCircle2,
  Stethoscope,
  MapPin,
  IdCard,
  Pencil,
  Trash2,
  AlertTriangle,
  Loader2,
  X,
  Eye,
  Plus,
  UserPlus,
  Search,
  Check,
  ArrowLeft
} from 'lucide-react';

export function HouseholdView({ user }: { user: any }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { info, error: toastError, success } = useToast();
  const [household, setHousehold] = useState<any>(null);
  const [residents, setResidents] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedPatientId) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectedPatientId]);

  const [editForm, setEditForm] = useState({
    address: '',
    number: '',
    complement: '',
    responsible_name: ''
  });

  const handleSearchPatients = async (query: string) => {
    setSearchQuery(query);
    const cleanQuery = query.trim();
    if (cleanQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      let q = supabase
        .from('patients')
        .select('*');

      if (user.role !== 'Gestor') {
        q = q.eq('agent_id', user.id);
      }

      q = q.or(`name.ilike.%${cleanQuery}%,cns.ilike.%${cleanQuery}%`).limit(15);

      const { data, error } = await q;
      if (error) throw error;

      const existingIds = new Set(residents.map(r => r.id));
      const filtered = (data || []).filter(p => !existingIds.has(p.id));
      setSearchResults(filtered);
    } catch (err) {
      console.error("Error searching patients to link:", err);
    } finally {
      setSearching(false);
    }
  };

  const handleLinkPatient = async (patient: any) => {
    if (!household || !id) return;
    setLinkingId(patient.id);

    try {
      const updatedClinicalData = {
        ...(patient.clinical_data || {}),
        address: household.address,
        address_number: household.number,
        address_complement: household.complement,
        responsible_cns: household.responsible_cns
      };

      const updatedPayload = {
        household_id: id,
        is_family_responsible: false,
        clinical_data: updatedClinicalData
      };

      if (!navigator.onLine) {
        await syncService.addToQueue('patients', 'UPDATE', {
          id: patient.id,
          ...updatedPayload
        });
        const updatedLocalPatient = { ...patient, ...updatedPayload };
        setResidents(prev => [...prev, updatedLocalPatient]);
        info('Morador vinculado localmente. Será sincronizado quando houver internet.');
        setShowLinkModal(false);
        setSearchQuery('');
        setSearchResults([]);
        return;
      }

      const { error } = await supabase
        .from('patients')
        .update(updatedPayload)
        .eq('id', patient.id);

      if (error) throw error;

      const updatedLocalPatient = { ...patient, ...updatedPayload };
      setResidents(prev => [...prev, updatedLocalPatient]);

      try {
        const { data: vData } = await supabase
          .from('visits')
          .select('*')
          .eq('patient_id', patient.id)
          .order('date', { ascending: false });
        if (vData && vData.length > 0) {
          setVisits(prev => [...vData, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        }
      } catch (vErr) {
        console.warn("Could not reload linked patient visits:", vErr);
      }

      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patientList'] });
      queryClient.invalidateQueries({ queryKey: ['householdsList'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      success(`"${patient.name}" vinculado a este domicílio com sucesso!`);
      setShowLinkModal(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (err: any) {
      console.error("Error linking patient to household:", err);
      toastError(err.message || "Erro ao vincular morador.");
    } finally {
      setLinkingId(null);
    }
  };

  const fetchHouseholdData = useCallback(async () => {
    if (!id) return;
    try {
      const { data: hData, error: hError } = await supabase
        .from('households')
        .select('*')
        .eq('id', id)
        .single();

      if (hError) throw hError;

      if (hData) {
        setHousehold(hData);
        
        // Fetch residents
        const { data: rData, error: rError } = await supabase
          .from('patients')
          .select('*')
          .eq('household_id', id);

        if (rError) throw rError;
        setResidents(rData || []);

        // Fetch visits for all residents
        if (rData && rData.length > 0) {
          const residentIds = rData.map(d => d.id);
          const { data: vData, error: vError } = await supabase
            .from('visits')
            .select('*')
            .in('patient_id', residentIds)
            .order('date', { ascending: false });

          if (vError) throw vError;
          setVisits(vData || []);
        } else {
          setVisits([]);
        }
      }
    } catch (error) {
      console.error("Household fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchHouseholdData();
  }, [fetchHouseholdData]);

  useEffect(() => {
    if (household) {
      setEditForm({
        address: household.address || '',
        number: household.number || '',
        complement: household.complement || '',
        responsible_name: household.responsible_name || ''
      });
    }
  }, [household]);

  const handleUpdateHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setLoading(true);
    try {
      if (!navigator.onLine) {
        await syncService.addToQueue('households', 'UPDATE', { id, ...editForm });
        setHousehold({ ...household, ...editForm });
        setIsEditing(false);
        info('Alterações salvas localmente.');
        navigate('/domicilios');
        return;
      }

      const { error } = await supabase
        .from('households')
        .update(editForm)
        .eq('id', id);
      
      if (error) throw error;
      setHousehold({ ...household, ...editForm });
      setIsEditing(false);
      navigate('/domicilios');
    } catch (error) {
      console.error("Error updating household:", error);
      toastError("Erro ao atualizar domicílio.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      if (!navigator.onLine) {
        // Queue deletions
        if (residents.length > 0) {
          for (const r of residents) {
            await syncService.addToQueue('visits', 'DELETE', { filter: { patient_id: r.id } });
            await syncService.addToQueue('patients', 'DELETE', { id: r.id });
          }
        }
        await syncService.addToQueue('households', 'DELETE', { id });
        info('Exclusão agendada para sincronização.');
        navigate('/domicilios');
        return;
      }

      // 1. Delete visits of all residents
      if (residents.length > 0) {
        const residentIds = residents.map(r => r.id);
        const { error: vError } = await supabase.from('visits').delete().in('patient_id', residentIds);
        if (vError) throw vError;
        
        // 2. Delete residents
        const { error: pError } = await supabase.from('patients').delete().eq('household_id', id);
        if (pError) throw pError;
      }
      // 3. Delete household
      const { error } = await supabase.from('households').delete().eq('id', id);
      if (error) throw error;
      navigate('/domicilios');
    } catch (error) {
      console.error("Error deleting household:", error);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-40 bg-bg-primary rounded-2xl"></div></div>;
  if (!household) return <div className="text-text-primary">Domicílio não encontrado.</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Card */}
      <section className={`bg-teal-600 dark:bg-teal-800 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl ${selectedPatientId ? 'hidden lg:block' : 'block'}`}>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-end md:items-center gap-6">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-90 mb-2 block">Responsável Familiar</span>
            <h2 className="text-3xl font-extrabold font-headline mb-3">{household.responsible_name}</h2>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 bg-black/15 px-4 py-1.5 rounded-full text-sm font-bold">
                <IdCard className="w-4 h-4 opacity-90" />
                <span>SUS: {household.responsible_cns}</span>
              </div>
              <div className="flex items-center gap-2 bg-black/15 px-4 py-1.5 rounded-full text-sm font-bold">
                <MapPin className="w-4 h-4 opacity-90" />
                <span>{household.address}, {household.number}</span>
              </div>
            </div>
          </div>
          {user.role !== 'Gestor' && (
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setDeleteConfirm(true)}
                className="p-3 text-white/60 hover:text-white hover:bg-bg-secondary/10 rounded-xl transition-all"
                title="Excluir Domicílio"
              >
                <Trash2 className="w-6 h-6" />
              </button>
              <button 
                onClick={() => setIsEditing(true)}
                className="bg-bg-secondary text-primary px-6 py-3 rounded-xl font-bold text-sm shadow-lg hover:bg-slate-50 transition-all active:scale-95 flex items-center gap-2"
              >
                Atualizar Domicílio
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Master-Detail Split Screen Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Master Column (Household Info, Residents List, History) */}
        <div className={`w-full transition-all duration-300 ${selectedPatientId ? 'hidden lg:block lg:w-[42%] shrink-0 space-y-6' : 'w-full'}`}>
          <div className={selectedPatientId ? 'space-y-6' : 'grid grid-cols-1 lg:grid-cols-12 gap-8'}>
            
            {/* Acompanhamento do Domicílio */}
            <div className={selectedPatientId ? 'w-full' : 'lg:col-span-5'}>
              <div className="bg-emerald-50 dark:bg-emerald-950/20 p-6 sm:p-7 rounded-[2rem] text-emerald-800 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-base sm:text-lg font-bold font-headline mb-1.5">Acompanhamento do Domicílio</h4>
                    <p className="text-xs sm:text-sm opacity-80 mb-5">O protocolo recomenda retorno periódico para acompanhamento de rotina de todos os moradores.</p>
                    {user.role !== 'Gestor' && (
                      <button 
                        onClick={() => {
                          if (residents.length === 1) {
                            setSelectedPatientId(residents[0].id);
                          } else {
                            setShowVisitModal(true);
                          }
                        }}
                        className="bg-teal-600 dark:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md hover:bg-teal-700 dark:hover:bg-teal-600 transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <PlusCircle className="w-4 h-4" />
                        Registrar Nova Visita
                      </button>
                    )}
                  </div>
                  <Home className="w-10 h-10 opacity-10 shrink-0" />
                </div>
              </div>
            </div>

            {/* Residents & History */}
            <div className={selectedPatientId ? 'w-full space-y-6' : 'lg:col-span-7 space-y-8'}>
              {/* Residents Card */}
              <div className="bg-bg-secondary dark:bg-slate-900 p-6 sm:p-8 rounded-[2rem] shadow-sm border border-border dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold font-headline text-text-primary">Moradores do Domicílio</h3>
                    <p className="text-xs text-text-muted mt-0.5">Clique em um morador para abrir a ficha de edição ao lado</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {user.role !== 'Gestor' && (
                      <>
                        <button 
                          onClick={() => navigate(`/novo-cadastro?household=${household.id}`)}
                          className="bg-primary hover:bg-primary/90 text-white text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                          title="Cadastrar novo morador neste domicílio"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Novo Morador
                        </button>
                        <button 
                          onClick={() => {
                            setShowLinkModal(true);
                            setSearchQuery('');
                            setSearchResults([]);
                          }}
                          className="bg-teal-50 hover:bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:hover:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800/80 text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
                          title="Vincular cidadão já cadastrado a esta residência"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          Vincular Existente
                        </button>
                      </>
                    )}
                    <span className="bg-primary/10 text-primary text-xs px-3 py-1.5 rounded-full font-bold">{residents.length} Residentes</span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {residents.length === 0 ? (
                    <div className="text-center py-8 text-text-muted text-sm">
                      Nenhum morador vinculado a este domicílio.
                    </div>
                  ) : (
                    residents.map(r => {
                      const isSelected = selectedPatientId === r.id;
                      return (
                        <div 
                          key={r.id} 
                          onClick={() => setSelectedPatientId(isSelected ? null : r.id)}
                          className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer group flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'border-teal-500 bg-teal-50/70 dark:bg-teal-950/40 ring-2 ring-teal-500/20 shadow-sm'
                              : 'border-border/60 hover:border-teal-300 dark:hover:border-teal-800 bg-bg-primary/50 dark:bg-slate-800/30 hover:bg-bg-primary dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`text-sm font-bold truncate leading-tight transition-colors ${
                                isSelected ? 'text-teal-700 dark:text-teal-300' : 'text-text-primary group-hover:text-teal-600'
                              }`}>
                                {r.name}
                              </p>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                r.is_family_responsible 
                                  ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300' 
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}>
                                {r.is_family_responsible ? 'Responsável' : 'Dependente'}
                              </span>
                              {isSelected && (
                                <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-teal-600 text-white shadow-xs">
                                  Editando
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[11px] text-text-muted">
                              <span>{r.birth_date ? calculateAge(r.birth_date) : 'Idade N/I'}</span>
                              <span>•</span>
                              <span className="font-mono">SUS: {r.cns || 'N/I'}</span>
                              {r.categories?.map((cat: string) => (
                                <span key={cat} className="text-[9px] px-1.5 py-0.5 bg-bg-primary dark:bg-slate-800 text-text-secondary dark:text-text-muted rounded-md font-bold uppercase border border-border/50">
                                  {cat}
                                </span>
                              ))}
                              {isPatientBolsaFamilia(r) && (
                                <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-md font-bold uppercase border border-emerald-300 dark:border-emerald-800">
                                  🎁 Bolsa Família
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPatientId(isSelected ? null : r.id);
                              }}
                              className={`p-2 rounded-xl transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-teal-600 text-white shadow-sm'
                                  : 'text-text-muted hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/50'
                              }`}
                              title={isSelected ? 'Fechar Edição' : 'Editar Morador'}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${
                              isSelected ? 'text-teal-600 rotate-90' : 'text-text-muted group-hover:text-teal-600'
                            }`} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* History */}
              <div className="bg-bg-secondary dark:bg-slate-900 p-6 sm:p-8 rounded-[2rem] shadow-sm border border-border dark:border-slate-800">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg sm:text-xl font-bold font-headline text-text-primary">Histórico de Visitas</h3>
                  <button 
                    onClick={() => navigate('/historico')}
                    className="text-primary text-xs sm:text-sm font-bold hover:underline cursor-pointer"
                  >
                    Ver tudo
                  </button>
                </div>
                <div className="space-y-6">
                  {visits.length > 0 ? visits.map((v, i) => (
                    <div key={v.id} className="flex gap-4 relative">
                      {i !== visits.length - 1 && <div className="absolute left-5 top-10 bottom-0 w-[2px] bg-bg-primary"></div>}
                      <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 z-10 shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div className="pb-4">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-sm font-bold text-text-primary">{v.type}</span>
                          <span className="text-[10px] font-bold bg-bg-primary px-2 py-0.5 rounded text-text-muted dark:text-text-secondary uppercase">
                            {formatDate(v.date)}
                          </span>
                        </div>
                        <p className="text-sm text-text-secondary dark:text-text-muted leading-relaxed">{v.summary}</p>
                      </div>
                    </div>
                  )) : (
                    <p className="text-center text-text-muted dark:text-text-secondary text-sm py-4">Nenhuma visita registrada recentemente.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Detail): Editable Patient Form */}
        {selectedPatientId && (
          <div className="w-full lg:w-[58%] bg-bg-secondary rounded-3xl border border-border p-4 sm:p-6 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Top return bar visible on tablet and mobile (< lg) */}
            <div className="lg:hidden mb-4 pb-3 border-b border-border flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedPatientId(null)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-bold text-xs hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors cursor-pointer shadow-xs border border-teal-200/50 dark:border-teal-800/50"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar para o Domicílio</span>
              </button>
              <span className="text-xs font-bold text-teal-600 dark:text-teal-400">Editando Morador</span>
            </div>

            <PatientForm 
              user={user} 
              patientId={selectedPatientId} 
              onClose={() => setSelectedPatientId(null)}
              onSaveSuccess={() => {
                fetchHouseholdData();
              }}
            />
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-bg-secondary dark:bg-slate-900 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-border dark:border-slate-800 animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400">
                <AlertTriangle className="w-10 h-10" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-text-primary font-headline">Excluir Domicílio?</h3>
                <p className="text-text-secondary dark:text-text-muted font-medium">
                  Esta ação excluirá permanentemente este domicílio, **todos os {residents.length} moradores vinculados** e seus históricos de visitas.
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
                  onClick={() => setDeleteConfirm(false)}
                  disabled={deleting}
                  className="w-full py-4 bg-bg-primary text-text-secondary rounded-2xl font-bold hover:bg-border transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Edit Household Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-bg-secondary dark:bg-slate-900 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-border dark:border-slate-800 animate-in zoom-in-95 duration-300">
            <form onSubmit={handleUpdateHousehold} className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                  <Home className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-black text-text-primary font-headline">Editar Domicílio</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2 ml-1">Endereço</label>
                  <input 
                    type="text"
                    value={editForm.address}
                    onChange={e => setEditForm({...editForm, address: e.target.value})}
                    className="w-full bg-bg-primary border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2 ml-1">Nº</label>
                    <input 
                      type="text"
                      value={editForm.number}
                      onChange={e => setEditForm({...editForm, number: e.target.value})}
                      className="w-full bg-bg-primary border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2 ml-1">Complemento</label>
                    <input 
                      type="text"
                      value={editForm.complement}
                      onChange={e => setEditForm({...editForm, complement: e.target.value})}
                      className="w-full bg-bg-primary border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2 ml-1">Nome do Responsável</label>
                  <input 
                    type="text"
                    value={editForm.responsible_name}
                    onChange={e => setEditForm({...editForm, responsible_name: e.target.value})}
                    className="w-full bg-bg-primary border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar Alterações'}
                </button>
                <button 
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="w-full py-4 bg-bg-primary text-text-secondary rounded-2xl font-bold hover:bg-border transition-all"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Visit Selection Modal */}
      {showVisitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-bg-secondary dark:bg-slate-900 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-border dark:border-slate-800 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-text-primary font-headline">Registrar Visita</h3>
              <button 
                onClick={() => setShowVisitModal(false)}
                className="p-2 hover:bg-bg-primary rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>
            
            <p className="text-sm text-text-secondary dark:text-text-muted mb-6">Selecione o morador que recebeu a visita:</p>
            
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 scrollbar-hide">
              {residents.map(r => (
                <button
                  key={r.id}
                  onClick={() => {
                    setShowVisitModal(false);
                    setSelectedPatientId(r.id);
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl hover:bg-bg-primary transition-all text-left group border border-border/50 hover:border-teal-500"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-text-primary group-hover:text-teal-600 transition-colors">{r.name}</p>
                    <p className="text-[10px] text-text-muted dark:text-text-secondary uppercase tracking-wider">
                      {r.birth_date ? calculateAge(r.birth_date) : 'Idade N/I'} • SUS: {r.cns || 'Não informado'}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-teal-600 transition-colors shrink-0" />
                </button>
              ))}
            </div>
            
            <button 
              onClick={() => setShowVisitModal(false)}
              className="w-full mt-6 py-4 bg-bg-primary text-text-secondary rounded-2xl font-bold hover:bg-border transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Link Existing Patient Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-bg-secondary dark:bg-slate-900 rounded-[2.5rem] p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-border dark:border-slate-800 animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-4 border-b border-border dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-text-primary font-headline">Vincular Cidadão à Residência</h3>
                  <p className="text-xs text-text-muted dark:text-text-secondary">Associe um paciente já cadastrado a este domicílio</p>
                </div>
              </div>
              <button 
                onClick={() => setShowLinkModal(false)}
                className="p-2 hover:bg-bg-primary rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>
            
            <div className="pt-4 pb-2">
              <div className="relative">
                <input 
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={e => handleSearchPatients(e.target.value)}
                  placeholder="Digite o Nome ou Cartão SUS (CNS)..."
                  className="w-full bg-bg-primary border border-border dark:border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 text-text-primary outline-none"
                />
                <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                {searching && (
                  <Loader2 className="w-4 h-4 text-primary animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-2 space-y-2 custom-scrollbar">
              {searchQuery.trim().length < 2 ? (
                <div className="py-12 text-center text-xs text-text-muted italic">
                  Digite pelo menos 2 caracteres do nome ou CNS para buscar.
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map(p => (
                  <div 
                    key={p.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-bg-primary/60 dark:bg-slate-800/40 border border-border/60 dark:border-slate-800 hover:bg-bg-primary dark:hover:bg-slate-800 transition-all gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-text-primary truncate">{p.name}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-text-muted font-medium">CNS: {p.cns || 'Sem CNS'}</span>
                        {p.birth_date && (
                          <span className="text-[9px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-bold">
                            {formatDate(p.birth_date)}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={linkingId === p.id}
                      onClick={() => handleLinkPatient(p)}
                      className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                    >
                      {linkingId === p.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      Vincular
                    </button>
                  </div>
                ))
              ) : (
                !searching && (
                  <div className="py-12 text-center text-xs text-text-muted">
                    Nenhum cidadão encontrado para "{searchQuery}".
                  </div>
                )
              )}
            </div>

            <div className="pt-4 border-t border-border dark:border-slate-800">
              <button 
                onClick={() => setShowLinkModal(false)}
                className="w-full py-3 bg-bg-primary text-text-secondary rounded-xl font-bold text-xs hover:bg-border transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
