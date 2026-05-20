import * as React from 'react';
import { supabase } from '../lib/supabase';
import {
  Baby,
  Calendar as CalendarIcon,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Eye,
  Bed,
  MapPin,
  Activity,
  CheckSquare,
  Square,
  Trash2,
  Plus,
  Check,
  ShieldAlert,
  Heart,
  Stethoscope,
  Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAgeInMonths, VACCINE_SCHEDULE, formatDate, calculateAge, getAgeNumber } from '../lib/dateUtils';
import { Badge } from './Badge';
import { PendingCalendar } from './PendingCalendar';
import { motion } from 'motion/react';
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import { UI_CONFIG } from '../constants';

export function Dashboard({ user }: { user: any }) {
  const navigate = useNavigate();
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
    pendingVisits: 0,
    lateVaccines: 0,
    childVisitAlerts: 0
  });
  const [allPatients, setAllPatients] = React.useState<any[]>([]);
  const [recentPatients, setRecentPatients] = React.useState<any[]>([]);
  const [weeklyChartData, setWeeklyChartData] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  // Roteiro do Dia (Checklist de visitas planejadas para hoje)
  const [dailyAgenda, setDailyAgenda] = React.useState<{id: string, name: string, done: boolean}[]>(() => {
    const saved = localStorage.getItem('gestao_acs_daily_agenda');
    return saved ? JSON.parse(saved) : [];
  });

  const saveAgenda = (newAgenda: typeof dailyAgenda) => {
    setDailyAgenda(newAgenda);
    localStorage.setItem('gestao_acs_daily_agenda', JSON.stringify(newAgenda));
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
      if (!user.microarea && user.role !== 'Administrador' && user.role !== 'Gestor') return;

      try {
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
          acamados: 0,
          idosos: 0,
          adultos: 0,
          hipertensos: 0,
          diabeticos: 0,
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
          const patientAgeNum = p.birth_date ? getAgeNumber(p.birth_date) : 0;

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

        // Filtro por papel do usuário
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
          // Suporta tanto campo 'date' (YYYY-MM-DD) quanto 'created_at' (timestamp ISO)
          const rawDate = v.date || v.created_at;
          if (!rawDate) return;

          // Normaliza para YYYY-MM-DD
          const dateStr = String(rawDate).substring(0, 10);

          // Só conta se estiver nos últimos 7 dias
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
    if (net > 0) return { direction: 'up', value: `+${net} este mês` };
    if (net < 0) return { direction: 'down', value: `${net} este mês` };
    return { direction: 'up', value: `${stats.newGestantes} este mês` };
  };

  const statCards = [
    {
      id: 'cidadaos',
      icon: Users,
      value: stats.totalPatients,
      label: 'CIDADÃOS',
      sublabel: 'Total cadastrados',
      trend: { direction: 'up', value: `+${stats.newCidadaos} este mês` },
      config: { primary: '#64748b', soft: 'rgba(100, 116, 139, 0.1)' },
      filter: 'all'
    },
    {
      id: 'domicilios',
      icon: MapPin,
      value: stats.totalHouseholds,
      label: 'DOMICÍLIOS',
      sublabel: 'Total residências',
      trend: { direction: 'up', value: `+${stats.newHouseholds} este mês` },
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
      trend: { direction: 'up', value: `+${stats.newCriancas} este mês` },
      config: UI_CONFIG.categorias.criancas,
      filter: 'criancas'
    },
    {
      id: 'idosos',
      icon: UI_CONFIG.categorias.idosos.icon,
      value: stats.idosos,
      label: 'IDOSOS',
      sublabel: 'Em acompanhamento',
      trend: { direction: 'up', value: `+${stats.newIdosos} este mês` },
      config: UI_CONFIG.categorias.idosos,
      filter: 'idosos'
    },
    {
      id: 'hipertensos',
      icon: UI_CONFIG.categorias.hipertensos.icon,
      value: stats.hipertensos,
      label: 'HIPERTENSOS',
      sublabel: 'Em acompanhamento',
      trend: { direction: 'up', value: `+${stats.newHipertensos} este mês` },
      config: UI_CONFIG.categorias.hipertensos,
      filter: 'hipertensos'
    },
    {
      id: 'diabeticos',
      icon: UI_CONFIG.categorias.diabeticos.icon,
      value: stats.diabeticos,
      label: 'DIABÉTICOS',
      sublabel: 'Em acompanhamento',
      trend: { direction: 'up', value: `+${stats.newDiabeticos} este mês` },
      config: UI_CONFIG.categorias.diabeticos,
      filter: 'diabeticos'
    },
    {
      id: 'acamados',
      icon: Bed,
      value: stats.acamados,
      label: 'ACAMADOS',
      sublabel: 'Domiciliados',
      trend: { direction: 'up', value: `+${stats.newAcamados} este mês` },
      config: UI_CONFIG.categorias.acamados,
      filter: 'acamados'
    }
  ];

  const chartData = weeklyChartData;

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

  if (loading) return null;

  return (
    <div className="space-y-6 relative">
      {/* 1. Stat Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => navigate(stat.id === 'domicilios' ? '/domicilios' : `/pacientes?filter=${stat.filter}`)}
            className="bg-bg-secondary rounded-[24px] py-6 px-4 border border-border shadow-sm cursor-pointer group relative overflow-hidden flex flex-col transition-all hover:shadow-xl hover:-translate-y-1 h-full"
          >
            <div className="absolute top-0 left-0 w-[5px] h-full" style={{ backgroundColor: stat.config.primary }} />

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-lg transition-transform group-hover:scale-105" style={{ backgroundColor: stat.config.primary, color: '#fff' }}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className="flex flex-col min-w-0">
                <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider truncate leading-tight">{stat.label}</p>
                <h4 className="text-[24px] font-black text-text-primary leading-none mt-1">{stat.value}</h4>
              </div>
            </div>

            <div className="mt-auto space-y-1">
              <p className="text-[11px] text-text-secondary font-medium opacity-60 truncate">{stat.sublabel}</p>
              <div className={`flex items-center gap-1 text-[11px] font-bold ${stat.trend.direction === 'up' ? 'text-emerald-600' : 'text-red-500'}`}>
                {stat.trend.direction === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {stat.trend.value}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 2. Middle Row */}
      <div className="grid grid-cols-12 gap-6 items-stretch pb-6">
        {/* Acompanhamento Prioritário */}
        <div className="col-span-12 xl:col-span-3">
          <div className="bg-bg-secondary rounded-[32px] p-4 border border-border shadow-sm flex flex-col h-full">
            <h3 className="text-sm font-bold text-text-primary mb-3 uppercase tracking-tight">Acompanhamento Prioritário</h3>
            <div className="space-y-2 flex-1">
              <div onClick={() => navigate('/pacientes?filter=pending_6m')} className="p-2.5 rounded-[20px] border border-red-100 bg-red-50/20 flex items-center gap-3 relative overflow-hidden group hover:bg-red-50/40 transition-colors cursor-pointer transition-all">
                <div className="absolute top-0 left-0 w-[4px] h-full bg-red-500" />
                <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white shadow-sm shrink-0">
                  <Baby className="w-4 h-4" />
                </div>
                <div className="flex-1 flex items-center justify-between gap-2">
                  <h5 className="text-[12px] font-semibold text-text-primary leading-tight line-clamp-1">{stats.childVisitAlerts} visitas (até 6m)</h5>
                  <Badge variant="error" className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-md shrink-0">PENDENTE</Badge>
                </div>
              </div>

              <div onClick={() => navigate('/pacientes?filter=visitas_atrasadas')} className="p-2.5 rounded-[20px] border border-orange-100 bg-orange-50/20 flex items-center gap-3 relative overflow-hidden group hover:bg-orange-50/40 transition-colors cursor-pointer transition-all">
                <div className="absolute top-0 left-0 w-[4px] h-full bg-orange-500" />
                <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white shadow-sm shrink-0">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 flex items-center justify-between gap-2">
                  <h5 className="text-[12px] font-semibold text-text-primary leading-tight line-clamp-1">{stats.pendingVisits} visitas em atraso</h5>
                  <div className="px-2 py-0.5 rounded-md bg-orange-500 text-white text-[9px] font-bold shadow-sm shrink-0">{stats.pendingVisits}</div>
                </div>
              </div>

              <div onClick={() => navigate('/pacientes?filter=vacinas_atrasadas')} className="p-2.5 rounded-[20px] border border-emerald-100 bg-emerald-50/20 flex items-center gap-3 relative overflow-hidden group hover:bg-emerald-50/40 transition-colors cursor-pointer transition-all">
                <div className="absolute top-0 left-0 w-[4px] h-full bg-emerald-500" />
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-sm shrink-0">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div className="flex-1 flex items-center justify-between gap-2">
                  <h5 className="text-[12px] font-semibold text-text-primary leading-tight line-clamp-1">{stats.lateVaccines} vacinas atrasadas</h5>
                  <Badge variant="success" className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-md shrink-0">VACINAS</Badge>
                </div>
              </div>

              <div onClick={() => navigate('/pacientes?filter=receitas_vencendo')} className="p-2.5 rounded-[20px] border border-purple-100 bg-purple-50/20 flex items-center gap-3 relative overflow-hidden group hover:bg-purple-50/40 transition-colors cursor-pointer transition-all">
                <div className="absolute top-0 left-0 w-[4px] h-full bg-purple-500" />
                <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white shadow-sm shrink-0">
                  <Activity className="w-4 h-4" />
                </div>
                <div className="flex-1 flex items-center justify-between gap-2">
                  <h5 className="text-[12px] font-semibold text-text-primary leading-tight line-clamp-1">{stats.receitasAVencer} a vencer</h5>
                  <Badge variant="default" className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 shrink-0">RECEITAS</Badge>
                </div>
              </div>

            </div>
            <button onClick={() => navigate('/pacientes?filter=visitas_atrasadas')} className="w-full mt-4 py-2.5 border border-border rounded-xl text-teal-600 font-semibold text-[12px] flex items-center justify-center gap-2 hover:bg-bg-primary transition-colors">
              Ver todos os pendentes <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Últimos Pacientes Visitados */}
        <div className="col-span-12 xl:col-span-5">
          <div className="bg-bg-secondary rounded-[32px] border border-border shadow-sm flex flex-col h-full">
            <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-bg-secondary shrink-0 rounded-t-[32px]">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-tight">Últimos Pacientes Visitados</h3>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-bg-secondary shadow-sm">
                  <tr className="bg-bg-primary/50">
                    <th className="px-4 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest border-b border-border">Paciente</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest border-b border-border">Visita</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest border-b border-border">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentPatients.map((p, i) => {
                    const isAtrazo = !(p.last_visit_at && new Date(p.last_visit_at) > thirtyDaysAgo);
                    return (
                      <tr key={i} className="hover:bg-bg-primary/80 transition-colors group cursor-pointer" onClick={() => navigate(`/domicilio/${p.household_id || ''}`)}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] shadow-sm shrink-0" style={getAvatarStyle(p.categories?.[0] || 'Outros')}>
                              {p.name?.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[12px] font-bold text-text-primary truncate uppercase leading-tight">{p.name}</p>
                              <p className="text-[9px] text-text-muted font-bold mt-0.5 tracking-wider">{p.cns || 'S/ CNS'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[11px] font-bold text-slate-600">
                          {p.last_visit_at ? formatDate(p.last_visit_at) : '--'}
                        </td>
                        <td className="px-4 py-3">
                          <div className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[9px] font-bold uppercase ${!isAtrazo ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-orange-50 text-orange-600 border border-orange-100'}`}>
                            {!isAtrazo ? 'Em dia' : 'Atraso'}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-3 border-t border-slate-50 flex justify-center shrink-0">
              <button onClick={() => navigate('/pacientes')} className="flex items-center gap-1 text-[12px] font-bold text-teal-600 hover:text-teal-700 transition-colors">
                Ver todos os pacientes <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="col-span-12 xl:col-span-4">
          <div className="bg-bg-secondary rounded-[32px] border border-border shadow-sm flex flex-col h-full">
            <div className="p-4 border-b border-slate-50 bg-bg-secondary shrink-0 rounded-t-[32px]">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-tight">Calendário de Pendências</h3>
            </div>
            <div className="p-4 flex-1 flex flex-col items-center justify-center">
              <div className="w-full">
                <PendingCalendar patients={allPatients} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

