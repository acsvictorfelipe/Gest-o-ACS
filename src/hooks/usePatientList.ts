import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, fetchTableWithFilters } from '../lib/supabase';
import { syncService } from '../lib/syncService';
import { encryptionService } from '../lib/encryption';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { safeStorage } from '../lib/safeStorage';
import { isSameDay } from 'date-fns';
import { getAgeInMonths, VACCINE_SCHEDULE, getPatientLastVisitAt } from '../lib/dateUtils';
import { AppUser, Patient, Household } from '../types';
import { isAdminRole, isGestorRole } from '../lib/roleUtils';

export interface DailyAgendaItem {
  id: string;
  name: string;
  done: boolean;
}

export function usePatientList(user: AppUser | null | undefined) {
  const { info, error: toastError } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState(searchParams.get('filter') || 'all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedStreet, setSelectedStreet] = useState('');
  const [dailyAgenda, setDailyAgenda] = useState<DailyAgendaItem[]>([]);

  const { data: queryData, isLoading: loading } = useQuery({
    queryKey: ['patientList', user?.id, user?.role, user?.color, user?.microarea],
    queryFn: async () => {
      if (!user) return { patients: [], householdsMap: {} };
      if (!user.microarea && !isAdminRole(user.role) && !isGestorRole(user.role)) {
        return { patients: [], householdsMap: {} };
      }

      // Fetch Households first for address mapping
      const { data: hData } = await supabase
        .from('households')
        .select('id, address, number, complement');
      
      const map: Record<string, { address: string; number: string; complement: string }> = {};
      if (hData) {
        hData.forEach(h => {
          map[h.id] = {
            address: h.address || '',
            number: h.number || '',
            complement: h.complement || ''
          };
        });
      }

      let allData: Patient[] = await fetchTableWithFilters<Patient>('patients', user);
      
      // HEALING LOGIC: SINCERELY UPDATE LATENCY AND RECENT VISITS
      try {
        let visitsDataQuery = supabase.from('visits').select('patient_id, date, type');
        if (isGestorRole(user.role)) {
          visitsDataQuery = visitsDataQuery.eq('area_color', user.color);
        } else if (!isAdminRole(user.role)) {
          visitsDataQuery = visitsDataQuery.eq('agent_id', user.id);
        }
        
        const { data: allVisitsData } = await visitsDataQuery;
        
        const visitsMap: Record<string, string> = {};
        if (allVisitsData) {
          allVisitsData.forEach((v: { patient_id: string; date: string; type?: string }) => {
            if (v.patient_id && v.date) {
              const currentDate = visitsMap[v.patient_id];
              const cleanDate = v.date.split('T')[0];
              if (!currentDate || cleanDate > currentDate) {
                visitsMap[v.patient_id] = cleanDate;
              }
            }
          });
        }

        allData = allData.map(p => {
          const clinicalVisitMax = getPatientLastVisitAt({ ...p, last_visit_at: null });
          const dbVisitMax = visitsMap[p.id] || null;
          
          let trueAcsVisitDateStr = p.last_visit_at ? p.last_visit_at.split('T')[0] : null;
          
          if (clinicalVisitMax) {
            const cleanClinical = clinicalVisitMax.split('T')[0];
            if (!trueAcsVisitDateStr || cleanClinical > trueAcsVisitDateStr) {
              trueAcsVisitDateStr = cleanClinical;
            }
          }
          
          if (dbVisitMax) {
            if (!trueAcsVisitDateStr || dbVisitMax > trueAcsVisitDateStr) {
              trueAcsVisitDateStr = dbVisitMax;
            }
          }

          if (trueAcsVisitDateStr && trueAcsVisitDateStr !== (p.last_visit_at ? p.last_visit_at.split('T')[0] : null)) {
            // In-memory calculation for accurate rendering without firing side-effect writes during reads
            return {
              ...p,
              last_visit_at: trueAcsVisitDateStr
            };
          }
          return p;
        });
      } catch (syncErr) {
        console.error("Error healing patient visit dates:", syncErr);
      }

      return { patients: allData, householdsMap: map };
    },
    enabled: !!user && (!!user.microarea || user.role === 'Administrador' || user.role === 'Gestor'),
  });

  const patients = queryData?.patients || [];
  const householdsMap = queryData?.householdsMap || {};

  useEffect(() => {
    const saved = safeStorage.getItem('gestao_acs_daily_agenda');
    if (saved) {
      try {
        const decrypted = encryptionService.decrypt(saved);
        setDailyAgenda(JSON.parse(decrypted || saved));
      } catch {
        setDailyAgenda([]);
      }
    }
  }, []);

  const handleToggleAgenda = (patient: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const isSaved = dailyAgenda.some(item => item.id === patient.id);
    let newAgenda;
    if (isSaved) {
      newAgenda = dailyAgenda.filter(item => item.id !== patient.id);
    } else {
      newAgenda = [...dailyAgenda, { id: patient.id, name: patient.name, done: false }];
    }
    setDailyAgenda(newAgenda);
    const serialized = JSON.stringify(newAgenda);
    const encrypted = encryptionService.encrypt(serialized);
    safeStorage.setItem('gestao_acs_daily_agenda', encrypted);
  };

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

  const getPatientAddress = (p: any) => {
    if (p.household_id && householdsMap[p.household_id]) {
      return householdsMap[p.household_id];
    }
    const clinical = p.clinical_data || {};
    return {
      address: clinical.address || '',
      number: clinical.number || '',
      complement: clinical.complement || ''
    };
  };

  const isPatientSemDomicilio = (p: any) => {
    if (!p.household_id) return true;
    
    const isResp = p.is_family_responsible;
    const hasRespCns = p.clinical_data?.responsible_cns && p.clinical_data.responsible_cns.trim();
    
    if (!isResp && !hasRespCns) {
      return true;
    }
    
    if (p.cns && p.cns === p.clinical_data?.responsible_cns && !isResp) {
      return true;
    }
    
    return false;
  };

  const availableStreets = Array.from(new Set(patients.map(p => {
    const addr = getPatientAddress(p);
    return addr.address ? addr.address.trim().toUpperCase() : '';
  }).filter(Boolean))).sort();

  const sortPatientsByAddressNumber = (a: any, b: any) => {
    if (selectedStreet) {
      const addrA = getPatientAddress(a);
      const addrB = getPatientAddress(b);
      const numA = parseInt((addrA.number || '').replace(/\D/g, ''), 10) || 0;
      const numB = parseInt((addrB.number || '').replace(/\D/g, ''), 10) || 0;
      if (numA !== numB) return numA - numB;
      return (addrA.number || '').localeCompare(addrB.number || '');
    }
    return (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' });
  };

  const getPrescriptionStatus = (p: any): 'vencida' | 'vencendo' | 'ok' => {
    const isMentalOrAcamado = p.categories?.includes('SaudeMental') || p.categories?.includes('AcamadoDomiciliado');
    if (!isMentalOrAcamado) return 'ok';

    const recipes = p.clinical_data?.receitas || [];
    if (recipes.length === 0) return 'ok';
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let status: 'vencida' | 'vencendo' | 'ok' = 'ok';

    for (const rec of recipes) {
      if (!rec.dataVencimento) continue;
      const expiry = new Date(rec.dataVencimento + 'T00:00:00');
      if (isNaN(expiry.getTime())) continue;

      if (expiry < today) {
        status = 'vencida';
        break; // Vencida sempre tem prioridade de alerta máxima
      } else {
        const alertDate = new Date(expiry);
        alertDate.setDate(alertDate.getDate() - 15);
        if (today >= alertDate) {
          status = 'vencendo';
        }
      }
    }

    return status;
  };

  const filteredPatients = patients.filter(p => {
    const addr = getPatientAddress(p);
    const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.cns?.includes(searchTerm) ||
                         (addr.address && addr.address.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const isDeceased = p.clinical_data?.obito?.flg_obito || false;

    if (activeFilter === 'falecidos') {
      return matchesSearch && isDeceased;
    }

    if (isDeceased) {
      return false;
    }
    
    if (selectedStreet) {
      if ((addr.address || '').trim().toUpperCase() !== selectedStreet) return false;
    }
    
    if (activeFilter === 'date' && searchParams.get('date')) {
      const targetDate = new Date(searchParams.get('date')!);
      const realLastVisitStr = getPatientLastVisitAt(p);
      const lastVisit = realLastVisitStr ? new Date(realLastVisitStr) : null;
      if (!lastVisit) return false;
      const dueDate = new Date(lastVisit);
      dueDate.setDate(dueDate.getDate() + 30);
      return matchesSearch && isSameDay(targetDate, dueDate);
    }

    if (activeFilter === 'visitas_atrasadas') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const realLastVisitStr = getPatientLastVisitAt(p);
      const lastVisit = realLastVisitStr ? new Date(realLastVisitStr) : null;
      return matchesSearch && (!lastVisit || lastVisit < thirtyDaysAgo);
    }

    if (activeFilter === 'pending_6m') {
      const isChild = p.categories?.includes('Criança');
      if (!isChild || !p.birth_date) return false;
      const ageInMonths = getAgeInMonths(p.birth_date);
      if (ageInMonths > 6) return false;
      if (p.clinical_data?.crianca?.visita6meses) return false;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const realLastVisitStr = getPatientLastVisitAt(p);
      const lastVisit = realLastVisitStr ? new Date(realLastVisitStr) : null;
      return matchesSearch && (!lastVisit || lastVisit < thirtyDaysAgo);
    }

    if (activeFilter === 'vacinas_atrasadas') {
      const isChild = p.categories?.includes('Criança');
      if (!isChild) return false;
      const ageInMonths = p.birth_date ? getAgeInMonths(p.birth_date) : 0;
      if (ageInMonths > 24) return false;
      const vaccines = p.clinical_data?.crianca?.vacinas || {};
      const hasPendingVaccine = VACCINE_SCHEDULE.some(group => {
        if (group.age <= ageInMonths) {
          return group.vaccines.some(v => vaccines[v.id] !== 'Sim');
        }
        return false;
      });
      return matchesSearch && hasPendingVaccine;
    }

    if (activeFilter === 'criancas') {
      const isChild = p.categories?.includes('Criança');
      if (!isChild) return false;
      const ageInMonths = p.birth_date ? getAgeInMonths(p.birth_date) : 0;
      return matchesSearch && ageInMonths < 144;
    }

    if (activeFilter === 'gestantes') return matchesSearch && p.categories?.includes('Gestante');
    if (activeFilter === 'acamados') return matchesSearch && p.categories?.includes('AcamadoDomiciliado');

    if (activeFilter === 'idosos') {
      return matchesSearch && (p.categories?.includes('Idoso') || p.categories?.includes('Idosos'));
    }

    if (activeFilter === 'adultos') return matchesSearch && p.categories?.includes('Adulto');
    if (activeFilter === 'saudemental') return matchesSearch && p.categories?.includes('SaudeMental');

    if (activeFilter === 'hipertensos') {
      const clinical = p.clinical_data || {};
      return matchesSearch && (
        clinical.chronic?.hipertensao === 'Sim' ||
        clinical.gestante?.hipertensao === 'Sim' ||
        clinical.gestante?.pressaoAlta === 'Sim' || 
        clinical.acamadodomiciliado?.hipertensao === 'Sim' ||
        clinical.acamadodomiciliado?.pressaoAlta === 'Sim' || 
        clinical.adulto?.hipertensao === 'Sim' ||
        clinical.adulto?.pressaoAlta === 'Sim' || 
        clinical.idoso?.hipertensao === 'Sim' ||
        clinical.idoso?.pressaoAlta === 'Sim'
      );
    }

    if (activeFilter === 'diabeticos' || activeFilter === 'diabéticos') {
      const clinical = p.clinical_data || {};
      return matchesSearch && (
        clinical.chronic?.diabetes === 'Sim' ||
        clinical.gestante?.diabetes === 'Sim' || 
        clinical.acamadodomiciliado?.diabetes === 'Sim' || 
        clinical.adulto?.diabetes === 'Sim' || 
        clinical.idoso?.diabetes === 'Sim'
      );
    }

    if (activeFilter === 'receitas_vencendo') {
      const status = getPrescriptionStatus(p);
      return matchesSearch && (status === 'vencida' || status === 'vencendo');
    }

    if (activeFilter === 'sus_atualizado') {
      return matchesSearch && p.clinical_data?.sus_atualizado === 'Sim';
    }

    return matchesSearch;
  });

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
            responsible_name: 'Responsável não cadastrado'
          });
        }
        await syncService.addToQueue('visits', 'DELETE', { filter: { patient_id: deleteConfirm } });
        await syncService.addToQueue('patients', 'DELETE', { id: deleteConfirm });
        
        queryClient.setQueryData(['patientList', user?.id, user?.role, user?.color, user?.microarea], (old: any) => {
          if (!old) return old;
          return {
            ...old,
            patients: old.patients.filter((p: any) => p.id !== deleteConfirm)
          };
        });
        setDeleteConfirm(null);
        info('Exclusão agendada para sincronização.');
        return;
      }

      if (patient?.is_family_responsible && patient.household_id) {
        const { error: hError } = await supabase
          .from('households')
          .update({ 
            responsible_name: 'Responsável não cadastrado'
          })
          .eq('id', patient.household_id);
        if (hError) console.error("Error updating household during delete:", hError);
      }

      const { error: vError } = await supabase
        .from('visits')
        .delete()
        .eq('patient_id', deleteConfirm);
      
      if (vError) throw vError;

      const { error: pError } = await supabase
        .from('patients')
        .delete()
        .eq('id', deleteConfirm);

      if (pError) throw pError;

      queryClient.setQueryData(['patientList', user?.id, user?.role, user?.color, user?.microarea], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          patients: old.patients.filter((p: any) => p.id !== deleteConfirm)
        };
      });
      queryClient.invalidateQueries({ queryKey: ['patientList'] });
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Error deleting patient:", error);
      toastError("Erro ao excluir paciente.");
    } finally {
      setDeleting(false);
    }
  };

  const copyToClipboard = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
  };

  const handleWhatsApp = (e: React.MouseEvent, phone: string) => {
    e.stopPropagation();
    if (!phone) return;
    const cleanNumber = phone.replace(/\D/g, '');
    if (cleanNumber.length < 10) return;
    const finalNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;
    window.open(`https://wa.me/${finalNumber}`, '_blank');
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Reset page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeFilter, selectedStreet]);

  const totalCount = filteredPatients.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // Ensure page is adjusted if items were deleted and page is now out of bounds
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedPatients = filteredPatients.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return {
    patients,
    loading,
    searchTerm,
    setSearchTerm,
    activeFilter,
    setActiveFilter,
    deleteConfirm,
    setDeleteConfirm,
    deleting,
    householdsMap,
    selectedStreet,
    setSelectedStreet,
    dailyAgenda,
    handleToggleAgenda,
    getPatientAddress,
    isPatientSemDomicilio,
    availableStreets,
    sortPatientsByAddressNumber,
    filteredPatients: paginatedPatients,
    unpaginatedFilteredPatients: filteredPatients,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalCount,
    totalPages,
    clearFilter,
    handleDelete,
    copyToClipboard,
    handleWhatsApp,
    getPrescriptionStatus
  };

}
