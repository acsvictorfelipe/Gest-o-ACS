import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, fetchTableWithFilters } from '../lib/supabase';
import {
  Baby,
  Calendar as CalendarIcon,
  TrendingUp,
  TrendingDown,
  Bed,
  MapPin,
  Activity,
  ShieldAlert,
  Users
} from 'lucide-react';
import { getAgeInMonths, isChildAge, isPatientChild, isPatientDiabetic, VACCINE_SCHEDULE, getAgeNumber, getPatientLastVisitAt, isVisitLate } from '../lib/dateUtils';
import { generateUUID } from '../lib/utils';
import { UI_CONFIG } from '../constants';
import { useDashboardWeeklyChart } from './useDashboardWeeklyChart';
import { useDashboardRequests } from './useDashboardRequests';
import { isAdminRole, isGestorRole } from '../lib/roleUtils';

export interface SyncItem {
  id: string;
  name: string;
  done: boolean;
}

export function useDashboard(user: any) {
  const queryClient = useQueryClient();

  const { data: queryData, isLoading: loading } = useQuery({
    queryKey: ['dashboard', user?.id, user?.role, user?.color, user?.microarea],
    queryFn: async () => {
      if (!user) return { allPatients: [], hCount: 0, newHCount: 0 };
      if (!user.microarea && !isAdminRole(user.role) && !isGestorRole(user.role)) {
        return { allPatients: [], hCount: 0, newHCount: 0 };
      }

      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

      let householdQuery = supabase.from('households').select('*', { count: 'exact', head: true })
        .neq('responsible_name', 'Responsável não cadastrado');
      
      let newHouseholdQuery = supabase.from('households').select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString())
        .neq('responsible_name', 'Responsável não cadastrado');

      if (isGestorRole(user.role)) {
        householdQuery = householdQuery.eq('area_color', user.color);
        newHouseholdQuery = newHouseholdQuery.eq('area_color', user.color);
      } else if (!isAdminRole(user.role)) {
        householdQuery = householdQuery.eq('agent_id', user.id);
        newHouseholdQuery = newHouseholdQuery.eq('agent_id', user.id);
      }

      const [hRes, newHRes] = await Promise.all([householdQuery, newHouseholdQuery]);
      const hCount = hRes.count || 0;
      const newHCount = newHRes.count || 0;

      let patientsData: any[] = await fetchTableWithFilters<any>('patients', user);

      // Deduplicate patientsData by ID
      if (patientsData && patientsData.length > 0) {
        const uniquePatientsMap = new Map<string, any>();
        patientsData.forEach(p => {
          if (p.id) uniquePatientsMap.set(p.id, p);
        });
        patientsData = Array.from(uniquePatientsMap.values());
      }

      let allVisitsData: any[] | null = null;

      // HEALING LOGIC: SINCERELY UPDATE LATENCY AND RECENT VISITS
      try {
        let visitsDataQuery = supabase.from('visits').select('id, patient_id, date, type, summary');
        if (isGestorRole(user.role)) {
          visitsDataQuery = visitsDataQuery.eq('area_color', user.color);
        } else if (!isAdminRole(user.role)) {
          visitsDataQuery = visitsDataQuery.eq('agent_id', user.id);
        }
        
        const { data } = await visitsDataQuery;
        if (data) {
          const uniqueVisitsMap = new Map<string, any>();
          data.forEach((v: any) => {
            if (v.id) uniqueVisitsMap.set(v.id, v);
            else uniqueVisitsMap.set(`${v.patient_id}_${v.date}`, v);
          });
          allVisitsData = Array.from(uniqueVisitsMap.values());
        } else {
          allVisitsData = [];
        }
        
        const visitsMap: Record<string, string> = {};
        if (allVisitsData) {
          allVisitsData.forEach((v: any) => {
            if (v.patient_id && v.date) {
              const currentDate = visitsMap[v.patient_id];
              const cleanDate = v.date.split('T')[0];
              if (!currentDate || cleanDate > currentDate) {
                visitsMap[v.patient_id] = cleanDate;
              }
            }
          });
        }

        patientsData = patientsData.map(p => {
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

      return { allPatients: patientsData, hCount, newHCount, visits: allVisitsData || [] };
    },
    enabled: !!user && (!!user.microarea || isAdminRole(user.role) || isGestorRole(user.role)),
  });

  const allPatients = queryData?.allPatients || [];

  const setAllPatients = (updater: React.SetStateAction<any[]>) => {
    queryClient.setQueryData(['dashboard', user?.id, user?.role, user?.color, user?.microarea], (old: any) => {
      if (!old) return old;
      const nextPatients = typeof updater === 'function' ? updater(old.allPatients) : updater;
      return {
        ...old,
        allPatients: nextPatients
      };
    });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['patientList'] });
  };

  const visits = queryData?.visits || [];

  const { weeklyChartData, fetchWeeklyChart } = useDashboardWeeklyChart(user);

  const { visitRequests, handleUpdateVisitRequestStatus } = 
    useDashboardRequests(user, setAllPatients);

  const { stats, recentPatients } = React.useMemo(() => {
    const defaultStats = {
      totalPatients: 0,
      totalHouseholds: 0,
      gestantes: 0,
      gestantesPendentes: 0,
      criancas2y: 0,
      criancasTotal: 0,
      hipertensos: 0,
      diabeticos: 0,
      acamados: 0,
      idosos: 0,
      adultos: 0,
      saudeMental: 0,
      pendingVisits: 0,
      lateVaccines: 0,
      childVisitAlerts: 0,
      receitasAVencer: 0,
      newCidadaos: 0,
      newHouseholds: queryData?.newHCount || 0,
      newGestantes: 0,
      partosThisMonth: 0,
      newCriancas: 0,
      newIdosos: 0,
      newHipertensos: 0,
      newDiabeticos: 0,
      newAcamados: 0
    };

    if (!queryData) return { stats: defaultStats, recentPatients: [] };

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const activePatients = allPatients.filter(p => !p.clinical_data?.obito?.flg_obito);

    const newStats = {
      ...defaultStats,
      totalPatients: activePatients.length,
      totalHouseholds: queryData.hCount,
    };

    activePatients.forEach(p => {
      const clinical = p.clinical_data || {};
      const categories = Array.isArray(p.categories) ? p.categories : [];
      const isChild = isPatientChild(p);

      const realLastVisitStr = getPatientLastVisitAt(p);
      if (isVisitLate(realLastVisitStr, p)) {
        newStats.pendingVisits++;
      }

      const ageInMonths = p.birth_date ? getAgeInMonths(p.birth_date) : 999;
      const ageNum = p.birth_date ? getAgeNumber(p.birth_date) : 0;

      if (isChild) {
        newStats.criancasTotal++;
        newStats.criancas2y++;

        // Check for late vaccines for children 0-2 years
        const vacinas = clinical.crianca?.vacinas || {};
        const isLate = VACCINE_SCHEDULE.some(group => {
          if (group.age <= ageInMonths) {
            return group.vaccines.some(v => vacinas[v.id] !== 'Sim');
          }
          return false;
        });

        if (isLate) {
          newStats.lateVaccines++;
        }
      }

      if (p.birth_date && ageInMonths <= 6 && isChild) {
        // If visita6meses or visita6mesesNaoRealizada was recorded in clinical form, don't count as alert
        if (!clinical.crianca?.visita6meses && !clinical.crianca?.visita6mesesNaoRealizada) {
          const isAtrazo = isVisitLate(realLastVisitStr, p);
          if (isAtrazo) {
            newStats.childVisitAlerts++;
          }
        }
      }

      const isDiabetico = isPatientDiabetic(p);
      const isHipertenso = clinical.chronic?.hipertensao === 'Sim' || clinical.gestante?.hipertensao === 'Sim';

      if (isDiabetico) newStats.diabeticos++;
      if (isHipertenso) newStats.hipertensos++;

      if (categories.includes('Gestante')) {
        newStats.gestantes++;
        const gConsultas = clinical.gestante?.consultas?.filter((c: string) => c && c.trim() !== '').length || 0;
        const gVisitas = clinical.gestante?.visitasAcs?.filter((v: string) => v && v.trim() !== '').length || 0;
        if (gConsultas < 9 || gVisitas < 3) {
          newStats.gestantesPendentes++;
        }
      }
      if (categories.includes('AcamadoDomiciliado')) newStats.acamados++;
      if (categories.includes('Idoso') || categories.includes('Idosos') || (ageNum >= 60 && !isChild)) newStats.idosos++;
      if (categories.includes('Adulto') || (!isChild && ageNum < 60 && p.birth_date)) newStats.adultos++;
      if (categories.includes('SaudeMental') || categories.includes('Saúde Mental')) newStats.saudeMental++;

      const createdAt = p.created_at ? new Date(p.created_at) : null;
      const isNewThisMonth = createdAt && createdAt >= startOfMonth;
      
      if (isNewThisMonth) {
        newStats.newCidadaos++;
        if (categories.includes('Gestante')) newStats.newGestantes++;
        if (isChild) newStats.newCriancas++;
        if (categories.includes('Idoso') || categories.includes('Idosos') || (ageNum >= 60 && !isChild)) newStats.newIdosos++;
        if (categories.includes('AcamadoDomiciliado')) newStats.newAcamados++;
        if (isDiabetico) newStats.newDiabeticos++;
        if (isHipertenso) newStats.newHipertensos++;
      }

      if (clinical.gestante?.data_parto) {
        const dataParto = new Date(clinical.gestante.data_parto);
        if (dataParto >= startOfMonth && dataParto <= new Date()) {
          newStats.partosThisMonth++;
        }
      }
      
      const isMentalOrAcamado = categories.includes('SaudeMental') || categories.includes('AcamadoDomiciliado');
      const recipes = isMentalOrAcamado ? (clinical.receitas || []) : [];
      if (recipes.length > 0) {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        const isVencendoOuVencida = recipes.some((rec: any) => {
          if (!rec.dataVencimento) return false;
          const dateVencimento = new Date(rec.dataVencimento + 'T00:00:00');
          if (isNaN(dateVencimento.getTime())) return false;
          
          const alertDate = new Date(dateVencimento);
          alertDate.setDate(alertDate.getDate() - 15);
          return hoje >= alertDate;
        });
        if (isVencendoOuVencida) {
          newStats.receitasAVencer++;
        }
      }
    });

    const recentSorted = [...activePatients].sort((a, b) => {
      const aVisit = getPatientLastVisitAt(a);
      const bVisit = getPatientLastVisitAt(b);
      return new Date(bVisit || 0).getTime() - new Date(aVisit || 0).getTime();
    }).slice(0, 5);

    return { stats: newStats, recentPatients: recentSorted };
  }, [queryData, allPatients]);

  const getGestantesTrend = () => {
    const net = stats.newGestantes - stats.partosThisMonth;
    if (net > 0) return { direction: 'up' as const, value: `+${net} este mês` };
    if (net < 0) return { direction: 'down' as const, value: `${net} este mês` };
    return { direction: 'up' as const, value: `${stats.newGestantes} este mês` };
  };

  const statCards = [
    {
      id: 'cidadaos',
      icon: Users,
      value: stats.totalPatients,
      label: 'CIDADÃOS',
      sublabel: 'Total cadastrados',
      trend: { direction: 'up' as const, value: `+${stats.newCidadaos} este mês` },
      config: { primary: '#64748b', soft: 'rgba(100, 116, 139, 0.1)' },
      filter: 'all'
    },
    {
      id: 'domicilios',
      icon: MapPin,
      value: stats.totalHouseholds,
      label: 'DOMICÍLIOS',
      sublabel: 'Total residências',
      trend: { direction: 'up' as const, value: `+${stats.newHouseholds} este mês` },
      config: { primary: '#6366f1', soft: 'rgba(99, 102, 241, 0.1)' },
      filter: 'households'
    },
    {
      id: 'gestantes',
      icon: UI_CONFIG.categorias.gestantes.icon,
      value: stats.gestantes,
      label: 'GESTANTES',
      sublabel: 'Acompanhadas',
      trend: getGestantesTrend(),
      config: UI_CONFIG.categorias.gestantes,
      filter: 'gestantes'
    },
    {
      id: 'criancas',
      icon: UI_CONFIG.categorias.criancas.icon,
      value: stats.criancas2y,
      label: 'CRIANÇAS < 2',
      sublabel: 'Em acompanhamento',
      trend: { direction: 'up' as const, value: `+${stats.newCriancas} este mês` },
      config: UI_CONFIG.categorias.criancas,
      filter: 'criancas'
    },
    {
      id: 'idosos',
      icon: UI_CONFIG.categorias.idosos.icon,
      value: stats.idosos,
      label: 'IDOSOS',
      sublabel: 'Em acompanhamento',
      trend: { direction: 'up' as const, value: `+${stats.newIdosos} este mês` },
      config: UI_CONFIG.categorias.idosos,
      filter: 'idosos'
    },
    {
      id: 'hipertensos',
      icon: UI_CONFIG.categorias.hipertensos.icon,
      value: stats.hipertensos,
      label: 'HIPERTENSOS',
      sublabel: 'Em acompanhamento',
      trend: { direction: 'up' as const, value: `+${stats.newHipertensos} este mês` },
      config: UI_CONFIG.categorias.hipertensos,
      filter: 'hipertensos'
    },
    {
      id: 'diabeticos',
      icon: UI_CONFIG.categorias.diabeticos.icon,
      value: stats.diabeticos,
      label: 'DIABÉTICOS',
      sublabel: 'Em acompanhamento',
      trend: { direction: 'up' as const, value: `+${stats.newDiabeticos} este mês` },
      config: UI_CONFIG.categorias.diabeticos,
      filter: 'diabeticos'
    },
    {
      id: 'acamados',
      icon: Bed,
      value: stats.acamados,
      label: 'ACAMADOS',
      sublabel: 'Domiciliados',
      trend: { direction: 'up' as const, value: `+${stats.newAcamados} este mês` },
      config: UI_CONFIG.categorias.acamados,
      filter: 'acamados'
    }
  ];

  const distribuicaoData = [
    { name: 'Crianças', value: stats.criancasTotal, color: UI_CONFIG.categorias.criancas.primary },
    { name: 'Gestantes', value: stats.gestantes, color: UI_CONFIG.categorias.gestantes.primary },
    { name: 'Idosos', value: stats.idosos, color: UI_CONFIG.categorias.idosos.primary },
    { name: 'Hipertensos', value: stats.hipertensos, color: UI_CONFIG.categorias.hipertensos.primary },
    { name: 'Diabéticos', value: stats.diabeticos, color: UI_CONFIG.categorias.diabeticos.primary },
    { name: 'Adultos', value: stats.adultos, color: UI_CONFIG.categorias.adultos.primary },
    { name: 'Saúde Mental', value: stats.saudeMental, color: UI_CONFIG.categorias.saudeMental.primary },
    { name: 'Acamados', value: stats.acamados, color: UI_CONFIG.categorias.acamados.primary },
    { name: 'Outros', value: Math.max(0, stats.totalPatients - (stats.criancasTotal + stats.gestantes + stats.idosos + stats.hipertensos + stats.diabeticos + stats.adultos + stats.saudeMental + stats.acamados)), color: UI_CONFIG.categorias.outros.primary },
  ].filter(d => d.value > 0);

  const getCategoryStyle = (category: string) => {
    const cat = category === 'Diabetico' || category === 'Diabético' ? UI_CONFIG.categorias.diabeticos :
      category === 'Idoso' ? UI_CONFIG.categorias.idosos :
        category === 'Hipertenso' ? UI_CONFIG.categorias.hipertensos :
          category === 'Criança' ? UI_CONFIG.categorias.criancas :
            category === 'Gestante' ? UI_CONFIG.categorias.gestantes :
              category === 'Adulto' ? UI_CONFIG.categorias.adultos :
                category === 'Saúde Mental' ? UI_CONFIG.categorias.saudeMental :
                  category === 'AcamadoDomiciliado' || category === 'Acamado / Domiciliado' ? UI_CONFIG.categorias.acamados :
                    UI_CONFIG.categorias.outros;

    return { backgroundColor: cat.primary, color: '#fff', border: 'none' };
  };

  const getAvatarStyle = (category: string) => {
    const cat = category === 'Diabetico' || category === 'Diabético' ? UI_CONFIG.categorias.diabeticos :
      category === 'Idoso' ? UI_CONFIG.categorias.idosos :
        category === 'Hipertenso' ? UI_CONFIG.categorias.hipertensos :
          category === 'Criança' ? UI_CONFIG.categorias.criancas :
            category === 'Gestante' ? UI_CONFIG.categorias.gestantes :
              category === 'Adulto' ? UI_CONFIG.categorias.adultos :
                category === 'Saúde Mental' ? UI_CONFIG.categorias.saudeMental :
                  category === 'AcamadoDomiciliado' ? UI_CONFIG.categorias.acamados :
                    UI_CONFIG.categorias.outros;

    return { backgroundColor: cat.primary, color: '#fff' };
  };

  return {
    stats,
    allPatients,
    recentPatients,
    weeklyChartData,
    loading,
    visits,
    statCards,
    distribuicaoData,
    getCategoryStyle,
    getAvatarStyle,
    visitRequests,
    handleUpdateVisitRequestStatus
  };
}
