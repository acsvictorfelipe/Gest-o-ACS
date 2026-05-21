import * as React from 'react';
import { supabase } from '../lib/supabase';
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
import { getAgeInMonths, VACCINE_SCHEDULE, getAgeNumber } from '../lib/dateUtils';
import { UI_CONFIG } from '../constants';
import { encryptionService } from '../lib/encryption';

export interface SyncItem {
  id: string;
  name: string;
  done: boolean;
}

export function useDashboard(user: any) {
  const [stats, setStats] = React.useState({
    totalPatients: 0,
    totalHouseholds: 0,
    gestantes: 0,
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
    newHouseholds: 0,
    newGestantes: 0,
    partosThisMonth: 0,
    newCriancas: 0,
    newIdosos: 0,
    newHipertensos: 0,
    newDiabeticos: 0,
    newAcamados: 0
  });

  const [allPatients, setAllPatients] = React.useState<any[]>([]);
  const [recentPatients, setRecentPatients] = React.useState<any[]>([]);
  const [weeklyChartData, setWeeklyChartData] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Roteiro do Dia (Checklist de visitas planejadas para hoje)
  const [dailyAgenda, setDailyAgenda] = React.useState<SyncItem[]>(() => {
    const saved = localStorage.getItem('gestao_acs_daily_agenda');
    if (!saved) return [];
    const decrypted = encryptionService.decrypt(saved);
    try {
      return JSON.parse(decrypted || saved);
    } catch {
      return [];
    }
  });

  const saveAgenda = (newAgenda: SyncItem[]) => {
    setDailyAgenda(newAgenda);
    const serialized = JSON.stringify(newAgenda);
    const encrypted = encryptionService.encrypt(serialized);
    localStorage.setItem('gestao_acs_daily_agenda', encrypted);
  };

  const handleAddToAgenda = (patientId: string) => {
    const patient = allPatients.find(p => p.id === patientId);
    if (!patient) return;
    if (dailyAgenda.some(item => item.id === patientId)) return;
    saveAgenda([...dailyAgenda, { id: patient.id, name: patient.name, done: false }]);
  };

  const handleRemoveFromAgenda = (patientId: string) => {
    saveAgenda(dailyAgenda.filter(item => item.id !== patientId));
  };

  const handleToggleAgenda = (patientId: string) => {
    saveAgenda(dailyAgenda.map(item => item.id === patientId ? { ...item, done: !item.done } : item));
  };

  React.useEffect(() => {
    const fetchData = async () => {
      if (!user.microarea && user.role !== 'Administrador' && user.role !== 'Gestor') {
        setLoading(false);
        return;
      }

      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

        let householdQuery = supabase.from('households').select('*', { count: 'exact', head: true })
          .neq('responsible_name', 'Responsável não cadastrado');
        
        let newHouseholdQuery = supabase.from('households').select('*', { count: 'exact', head: true })
          .gte('created_at', startOfMonth.toISOString())
          .neq('responsible_name', 'Responsável não cadastrado');

        if (user.role === 'Gestor') {
          householdQuery = householdQuery.eq('area_color', user.color);
          newHouseholdQuery = newHouseholdQuery.eq('area_color', user.color);
        } else if (user.role !== 'Administrador') {
          householdQuery = householdQuery.eq('agent_id', user.id);
          newHouseholdQuery = newHouseholdQuery.eq('agent_id', user.id);
        }

        const { count: hCount } = await householdQuery;
        const { count: newHCount } = await newHouseholdQuery;

        let patientsData: any[] = [];
        let from = 0;
        let to = 999;
        let hasMore = true;

        while (hasMore && patientsData.length < 10000) {
          let query = supabase.from('patients').select('*').range(from, to);

          if (user.role === 'Administrador') {
            // No additional filter
          } else if (user.role === 'Gestor') {
            query = query.eq('area_color', user.color);
          } else {
            query = query.eq('agent_id', user.id);
          }

          const { data, error } = await query;
          if (error) throw error;

          if (data && data.length > 0) {
            patientsData = [...patientsData, ...data];
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

        setAllPatients(patientsData);

        const newStats = {
          totalPatients: patientsData.length,
          totalHouseholds: hCount || 0,
          gestantes: 0,
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
          newHouseholds: newHCount || 0,
          newGestantes: 0,
          partosThisMonth: 0,
          newCriancas: 0,
          newIdosos: 0,
          newHipertensos: 0,
          newDiabeticos: 0,
          newAcamados: 0
        };

        patientsData.forEach(p => {
          const clinical = p.clinical_data || {};
          const categories = p.categories || [];

          const lastVisit = p.last_visit_at ? new Date(p.last_visit_at) : null;
          if (!lastVisit || lastVisit < thirtyDaysAgo) {
            newStats.pendingVisits++;
          }

          const ageInMonths = p.birth_date ? getAgeInMonths(p.birth_date) : 999;

          if (categories.includes('Criança') && ageInMonths <= 24) {
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

          if (p.birth_date && ageInMonths <= 6 && categories.includes('Criança')) {
            const isAtrazo = !lastVisit || lastVisit < thirtyDaysAgo;
            if (isAtrazo) {
              newStats.childVisitAlerts++;
            }
          }

          const isDiabetico = clinical.chronic?.diabetes === 'Sim' || clinical.gestante?.diabetes === 'Sim';
          const isHipertenso = clinical.chronic?.hipertensao === 'Sim' || clinical.gestante?.hipertensao === 'Sim';

          if (isDiabetico) newStats.diabeticos++;
          if (isHipertenso) newStats.hipertensos++;

          if (categories.includes('Gestante')) newStats.gestantes++;
          if (categories.includes('AcamadoDomiciliado')) newStats.acamados++;
          if (categories.includes('Idoso') || categories.includes('Idosos')) newStats.idosos++;
          if (categories.includes('Adulto')) newStats.adultos++;
          if (categories.includes('SaudeMental') || categories.includes('Saúde Mental')) newStats.saudeMental++;

          const createdAt = p.created_at ? new Date(p.created_at) : null;
          const isNewThisMonth = createdAt && createdAt >= startOfMonth;
          
          if (isNewThisMonth) {
            newStats.newCidadaos++;
            if (categories.includes('Gestante')) newStats.newGestantes++;
            if (categories.includes('Criança') && ageInMonths <= 24) newStats.newCriancas++;
            if (categories.includes('Idoso') || categories.includes('Idosos')) newStats.newIdosos++;
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
          
          if (categories.includes('AcamadoDomiciliado') && clinical.acamadodomiciliado?.dataReceita && clinical.acamadodomiciliado?.validadeReceita) {
            const dataReceita = new Date(clinical.acamadodomiciliado.dataReceita);
            const validadeDias = parseInt(clinical.acamadodomiciliado.validadeReceita, 10);
            if (!isNaN(dataReceita.getTime()) && !isNaN(validadeDias)) {
              const dataVencimento = new Date(dataReceita);
              dataVencimento.setDate(dataVencimento.getDate() + validadeDias);
              
              const dataAlerta = new Date(dataVencimento);
              dataAlerta.setDate(dataAlerta.getDate() - 15);
              
              const hoje = new Date();
              
              if (hoje >= dataAlerta) {
                newStats.receitasAVencer++;
              }
            }
          }
        });

        setStats(newStats);
        setRecentPatients(patientsData.sort((a, b) => new Date(b.last_visit_at || 0).getTime() - new Date(a.last_visit_at || 0).getTime()).slice(0, 5));

        // Fetch real weekly visit data
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

        let visitQuery = supabase
          .from('visits')
          .select('date, created_at');

        if (user.role === 'Gestor') visitQuery = visitQuery.eq('area_color', user.color);
        else if (user.role !== 'Administrador') visitQuery = visitQuery.eq('agent_id', user.id);

        const { data: visitData, error: visitError } = await visitQuery;

        if (visitError) {
          console.error('Erro ao buscar visitas para o gráfico:', visitError);
        }

        // Build 7-day chart with real counts
        const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const chartDays: { name: string; visitas: number; date: Date }[] = [];
        for (let d = 6; d >= 0; d--) {
          const day = new Date();
          day.setDate(day.getDate() - d);
          day.setHours(0, 0, 0, 0);
          chartDays.push({ name: dayLabels[day.getDay()], visitas: 0, date: day });
        }

        (visitData || []).forEach((v: any) => {
          const rawDate = v.date || v.created_at;
          if (!rawDate) return;

          const dateStr = String(rawDate).substring(0, 10);

          if (dateStr < sevenDaysAgoStr) return;

          const vDate = new Date(dateStr + 'T00:00:00');
          const match = chartDays.find(cd =>
            cd.date.getFullYear() === vDate.getFullYear() &&
            cd.date.getMonth() === vDate.getMonth() &&
            cd.date.getDate() === vDate.getDate()
          );
          if (match) match.visitas++;
        });

        setWeeklyChartData(chartDays.map(d => ({ name: d.name, visitas: d.visitas })));

      } catch (error) {
        console.error("Dashboard error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

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
    { name: 'Outros', value: stats.totalPatients - (stats.criancasTotal + stats.gestantes + stats.idosos + stats.hipertensos + stats.diabeticos + stats.adultos + stats.saudeMental + stats.acamados), color: UI_CONFIG.categorias.outros.primary },
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
    dailyAgenda,
    handleAddToAgenda,
    handleRemoveFromAgenda,
    handleToggleAgenda,
    statCards,
    distribuicaoData,
    getCategoryStyle,
    getAvatarStyle
  };
}
