import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  Users,
  UserPlus,
  X,
  ExternalLink,
  ChevronRight,
  MapPin,
  Calendar,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { calculateAge, formatDate, getPatientLastVisitAt, isVisitLate } from '../../lib/dateUtils';
import { UI_CONFIG } from '../../constants';

interface HouseholdResidentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  householdId: string | undefined;
  currentPatientId?: string;
  isDirty?: boolean;
  confirm?: any;
}

export function HouseholdResidentsModal({
  isOpen,
  onClose,
  householdId,
  currentPatientId,
  isDirty,
  confirm,
}: HouseholdResidentsModalProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [household, setHousehold] = useState<any>(null);
  const [residents, setResidents] = useState<any[]>([]);

  useEffect(() => {
    if (!isOpen || !householdId) return;

    let isMounted = true;
    const fetchHouseholdAndResidents = async () => {
      setLoading(true);
      try {
        const [hRes, rRes] = await Promise.all([
          supabase.from('households').select('*').eq('id', householdId).maybeSingle(),
          supabase.from('patients').select('*').eq('household_id', householdId).order('name')
        ]);

        if (isMounted) {
          if (hRes.data) setHousehold(hRes.data);
          if (rRes.data) setResidents(rRes.data);
        }
      } catch (err) {
        console.error('Error fetching household modal data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchHouseholdAndResidents();
    return () => { isMounted = false; };
  }, [isOpen, householdId]);

  if (!isOpen) return null;

  const handleSelectResident = async (residentId: string) => {
    if (residentId === currentPatientId) {
      onClose();
      return;
    }

    if (isDirty && confirm) {
      const ok = await confirm({
        title: 'Alterações não salvas',
        message: 'Há alterações não salvas no cadastro atual. Deseja trocar de morador sem salvar?',
        variant: 'warning',
        confirmLabel: 'Trocar sem salvar',
        cancelLabel: 'Continuar editando',
      });
      if (!ok) return;
    }

    onClose();
    navigate(`/editar-paciente/${residentId}`);
  };

  const handleAddNewResident = async () => {
    if (isDirty && confirm) {
      const ok = await confirm({
        title: 'Alterações não salvas',
        message: 'Há alterações não salvas. Deseja sair para cadastrar outro morador?',
        variant: 'warning',
        confirmLabel: 'Cadastrar novo',
        cancelLabel: 'Ficar',
      });
      if (!ok) return;
    }

    onClose();
    navigate(`/novo-cadastro?household=${householdId}`);
  };

  const handleViewHouseholdPage = async () => {
    if (isDirty && confirm) {
      const ok = await confirm({
        title: 'Alterações não salvas',
        message: 'Há alterações não salvas. Deseja abrir a página do domicílio?',
        variant: 'warning',
        confirmLabel: 'Abrir domicílio',
        cancelLabel: 'Ficar',
      });
      if (!ok) return;
    }

    onClose();
    navigate(`/domicilio/${householdId}`);
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Gestante': return 'bg-pink-100 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-900/50';
      case 'Criança': return 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-900/50';
      case 'Idoso':
      case 'Idosos': return 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/50';
      case 'Hipertenso': return 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900/50';
      case 'Diabético':
      case 'Diabetico': return 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/50';
      case 'AcamadoDomiciliado': return 'bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900/50';
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[65] bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Lateral Drawer */}
      <div className="fixed top-0 right-0 z-[66] h-full w-full max-w-lg bg-bg-secondary dark:bg-slate-900 shadow-2xl border-l border-border dark:border-slate-800 animate-in slide-in-from-right duration-300 flex flex-col">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-teal-600 to-emerald-700 text-white shrink-0 shadow-md">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-sm">
                <Home className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-widest text-teal-100 block">
                  Moradores do Domicílio
                </span>
                <h3 className="text-base sm:text-lg font-black tracking-tight truncate font-headline">
                  {household?.address || 'Carregando endereço...'}, {household?.number || ''}
                  {household?.complement ? ` • ${household.complement}` : ''}
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
              title="Fechar painel lateral"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Info Bar */}
          <div className="mt-4 pt-3 border-t border-white/20 flex flex-wrap items-center justify-between gap-2 text-xs text-teal-50">
            <div className="truncate max-w-[280px]">
              <span className="opacity-75 font-medium">Responsável: </span>
              <strong className="font-extrabold">{household?.responsible_name || 'Não informado'}</strong>
            </div>
            <div className="inline-flex items-center gap-1.5 bg-black/20 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0">
              <Users className="w-3.5 h-3.5 text-teal-200" />
              {residents.length} morador{residents.length !== 1 ? 'es' : ''}
            </div>
          </div>
        </div>

        {/* Resident List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-5 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3 text-text-muted">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-xs font-bold uppercase tracking-wider">Carregando moradores...</p>
            </div>
          ) : residents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-text-muted space-y-2">
              <Users className="w-12 h-12 stroke-[1.5] text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-bold text-text-primary">Nenhum morador vinculado</p>
              <p className="text-xs max-w-xs">Este domicílio ainda não possui cidadãos cadastrados na família.</p>
            </div>
          ) : (
            residents.map((resident) => {
              const isCurrent = resident.id === currentPatientId;
              const lastVisit = getPatientLastVisitAt(resident);
              const isLate = isVisitLate(lastVisit, resident);
              const age = calculateAge(resident.birth_date);
              const categories: string[] = resident.categories || [];

              return (
                <div
                  key={resident.id}
                  onClick={() => handleSelectResident(resident.id)}
                  className={`group relative p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2.5 ${
                    isCurrent
                      ? 'bg-teal-50/80 dark:bg-teal-950/30 border-teal-300 dark:border-teal-800 shadow-sm ring-2 ring-teal-500/20'
                      : 'bg-bg-primary dark:bg-slate-800/80 border-border dark:border-slate-700/80 hover:border-teal-500/50 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-black shrink-0 ${
                        isCurrent
                          ? 'bg-teal-600 text-white shadow-md'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                      }`}>
                        {resident.name?.charAt(0).toUpperCase() || 'P'}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-sm font-black text-text-primary tracking-tight truncate">
                            {resident.name}
                          </h4>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-md bg-teal-600 text-white text-[8px] font-black uppercase tracking-wider shadow-xs">
                              Editando agora
                            </span>
                          )}
                          {resident.is_family_responsible && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[8px] font-black uppercase tracking-wider">
                              Resp. Familiar
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-xs text-text-muted font-medium">
                          {age && <span>{age}</span>}
                          {resident.gender && <span>• {resident.gender}</span>}
                          {resident.cns && (
                            <span className="font-mono text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                              • CNS: {resident.cns}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-1.5 rounded-xl bg-bg-secondary dark:bg-slate-700/50 text-text-muted group-hover:text-primary group-hover:bg-primary/10 transition-all shrink-0">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Categories Badges */}
                  {categories.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {categories.map((cat, idx) => (
                        <span
                          key={idx}
                          className={`text-[8.5px] font-bold px-2 py-0.5 rounded-md border ${getCategoryColor(cat)}`}
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Visit Status Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[10px]">
                    <span className="text-text-muted font-semibold uppercase">Última Visita</span>
                    {lastVisit ? (
                      <span className={`font-bold flex items-center gap-1 ${
                        isLate ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {isLate ? <Clock className="w-3 h-3 shrink-0" /> : <CheckCircle2 className="w-3 h-3 shrink-0" />}
                        {formatDate(lastVisit)}
                      </span>
                    ) : (
                      <span className="font-bold text-slate-400">Não registrada</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-bg-primary dark:bg-slate-900 border-t border-border dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleViewHouseholdPage}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-border dark:border-slate-700 hover:bg-bg-secondary text-text-primary text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <ExternalLink className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            Página do Domicílio
          </button>

          <button
            type="button"
            onClick={handleAddNewResident}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-extrabold shadow-md shadow-teal-700/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            Adicionar Novo Morador
          </button>
        </div>
      </div>
    </>
  );
}
