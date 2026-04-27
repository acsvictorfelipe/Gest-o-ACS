import * as React from 'react';
import { supabase } from '../lib/supabase';
import { 
  Baby, 
  Heart, 
  AlertCircle, 
  Calendar as CalendarIcon,
  RefreshCw,
  LogOut,
  CalendarDays,
  ChevronRight,
  Smile,
  Users,
  Clock,
  Droplets,
  Search,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  Eye,
  UserCheck,
  UserCog,
  BarChart3,
  Syringe,
  CheckCircle,
  HeartPulse
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { getAgeInMonths, VACCINE_SCHEDULE } from '../lib/dateUtils';
import { Badge } from './Badge';
import { Card } from './Card';
import { PendingCalendar } from './PendingCalendar';
import { motion, AnimatePresence } from 'motion/react';
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { UI_CONFIG } from '../constants';

export function Dashboard({ user }: { user: any }) {
  const navigate = useNavigate();
  const [stats, setStats] = React.useState({
    totalPatients: 0,
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
  const [pendingChildList, setPendingChildList] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  React.useEffect(() => {
    const fetchData = async () => {
      if (!user.microarea && user.role !== 'Administrador' && user.role !== 'Gestor') return;
      
      try {
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
          gestantes: 0, 
          criancas2y: 0, 
          criancasTotal: 0, 
          acamados: 0, 
          idosos: 0, 
          adultos: 0,
          hipertensos: 0, 
          diabeticos: 0, 
          pendingVisits: 0, 
          lateVaccines: 0, 
          childVisitAlerts: 0 
        };
        
        const pendingChildren: any[] = [];
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        patientsData.forEach(p => {
          const clinical = p.clinical_data || {};
          const categories = p.categories || [];

          const lastVisit = p.last_visit_at ? new Date(p.last_visit_at) : null;
          if (!lastVisit || lastVisit < thirtyDaysAgo) {
            newStats.pendingVisits++;
          }

          if (categories.includes('Criança') && !categories.includes('Adulto') && !categories.includes('Idoso')) {
            newStats.criancasTotal++;
            const ageInMonths = p.birth_date ? getAgeInMonths(p.birth_date) : 99;
            if (ageInMonths < 144) {
              newStats.criancas2y++;
            }
            
            if (p.birth_date && ageInMonths <= 6) {
              const visited6m = clinical.crianca?.visita6meses === 'Sim';
              const lastVisitAt = p.last_visit_at ? new Date(p.last_visit_at) : null;
              const hasNoRecentVisit = !lastVisitAt || lastVisitAt < thirtyDaysAgo;

              if (hasNoRecentVisit || !visited6m) {
                newStats.childVisitAlerts++;
                pendingChildren.push({
                  id: p.id,
                  name: p.name,
                  age: ageInMonths,
                  last_visit: p.last_visit_at
                });
              }
            }
            
            const vaccines = clinical.crianca?.vacinas || {};
            const dueVaccines = VACCINE_SCHEDULE
              .filter(group => group.age <= ageInMonths)
              .flatMap(group => group.vaccines);
              
            const hasPendingVaccine = dueVaccines.some(v => vaccines[v.id] !== 'Sim');
            if (hasPendingVaccine) newStats.lateVaccines++;
          }

          const isDiabetico = clinical.chronic?.diabetes === 'Sim' || clinical.gestante?.diabetes === 'Sim';
          const isHipertenso = clinical.chronic?.hipertensao === 'Sim' || clinical.gestante?.hipertensao === 'Sim';

          if (isDiabetico) newStats.diabeticos++;
          if (isHipertenso) newStats.hipertensos++;

          if (categories.includes('Gestante')) newStats.gestantes++;
          if (categories.includes('AcamadoDomiciliado')) newStats.acamados++;
          if (categories.includes('Idoso')) newStats.idosos++;
          if (categories.includes('Adulto')) newStats.adultos++;
        });

        setStats(newStats);
        setPendingChildList(pendingChildren);
        setRecentPatients(patientsData.sort((a,b) => new Date(b.last_visit_at || 0).getTime() - new Date(a.last_visit_at || 0).getTime()).slice(0, 7));

      } catch (error) {
        console.error("Dashboard data error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user.microarea, user.id, user.role, user.color]);

  const statCards = [
    {
      id: 'cidadaos',
      icon: UI_CONFIG.categorias.outros.icon,
      value: stats.totalPatients,
      label: 'Cidadãos',
      sublabel: 'Total cadastrados',
      trend: { direction: 'up', value: '8% este mês' },
      color: UI_CONFIG.categorias.outros.color,
      filter: 'all'
    },
    {
      id: 'gestantes',
      icon: UI_CONFIG.categorias.gestantes.icon,
      value: stats.gestantes,
      label: 'GESTANTES',
      sublabel: 'Acompanhadas',
      trend: { direction: 'up', value: '2 este mês' },
      color: UI_CONFIG.categorias.gestantes.color,
      filter: 'gestantes'
    },
    {
      id: 'criancas',
      icon: UI_CONFIG.categorias.criancas.icon,
      value: stats.criancas2y,
      label: 'CRIANÇAS < 2 ANOS',
      sublabel: 'Em acompanhamento',
      trend: { direction: 'up', value: '12 este mês' },
      color: UI_CONFIG.categorias.criancas.color,
      filter: 'criancas'
    },
    {
      id: 'idosos',
      icon: UI_CONFIG.categorias.idosos.icon,
      value: stats.idosos,
      label: 'IDOSOS',
      sublabel: 'Em acompanhamento',
      trend: { direction: 'up', value: '12 este mês' },
      color: UI_CONFIG.categorias.idosos.color,
      filter: 'idosos'
    },
    {
      id: 'hipertensos',
      icon: UI_CONFIG.categorias.hipertensos.icon,
      value: stats.hipertensos,
      label: 'HIPERTENSOS',
      sublabel: 'Em acompanhamento',
      trend: { direction: 'up', value: '16 este mês' },
      color: UI_CONFIG.categorias.hipertensos.color,
      filter: 'hipertensos'
    },
    {
      id: 'diabeticos',
      icon: UI_CONFIG.categorias.diabeticos.icon,
      value: stats.diabeticos,
      label: 'DIABÉTICOS',
      sublabel: 'Em acompanhamento',
      trend: { direction: 'up', value: '7 este mês' },
      color: UI_CONFIG.categorias.diabeticos.color,
      filter: 'diabeticos'
    },
    {
      id: 'vacinas',
      icon: UI_CONFIG.status.alerta.icon,
      value: stats.lateVaccines,
      label: 'VACINAS ATRASADAS',
      sublabel: 'Crianças',
      trend: { direction: 'down', value: '5 este mês' },
      color: UI_CONFIG.status.alerta.color,
      filter: 'vaccine'
    }
  ];

  const chartData = [
    { name: 'Seg', visitas: 12, metas: 10 },
    { name: 'Ter', visitas: 19, metas: 15 },
    { name: 'Qua', visitas: 15, metas: 15 },
    { name: 'Qui', visitas: 22, metas: 18 },
    { name: 'Sex', visitas: 30, metas: 20 },
    { name: 'Sáb', visitas: 10, metas: 5 },
    { name: 'Dom', visitas: 5, metas: 5 },
  ];

  const distribuicaoData = [
    { name: 'Crianças', value: stats.criancasTotal, color: UI_CONFIG.categorias.criancas.color },
    { name: 'Gestantes', value: stats.gestantes, color: UI_CONFIG.categorias.gestantes.color },
    { name: 'Idosos', value: stats.idosos, color: UI_CONFIG.categorias.idosos.color },
    { name: 'Hipertensos', value: stats.hipertensos, color: UI_CONFIG.categorias.hipertensos.color },
    { name: 'Diabéticos', value: stats.diabeticos, color: UI_CONFIG.categorias.diabeticos.color },
    { name: 'Outros', value: stats.totalPatients - (stats.criancasTotal + stats.gestantes + stats.idosos + stats.hipertensos + stats.diabeticos), color: UI_CONFIG.categorias.outros.color },
  ].filter(d => d.value >= 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-6">
          <div className="w-12 h-12 border-4 border-[#14B8A6]/20 border-t-[#14B8A6] rounded-full animate-spin" />
          <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-xs">Carregando Inteligência...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-10 relative">
      {/* 1. Header Info */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Painel de Controle</h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[11px] mt-1.5 opacity-60">Status Geral da Microárea {user.microarea}</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="success" className="px-4 py-2 text-[10px] font-black rounded-xl border border-[#10B981]/20">SISTEMA ONLINE</Badge>
        </div>
      </motion.div>

      {/* 2. Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => navigate(`/pacientes?filter=${stat.filter}`)}
            className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm shadow-slate-100/50 cursor-pointer group relative overflow-hidden flex flex-col"
          >
            <div className="absolute top-0 left-0 w-full h-[3px]" style={{ backgroundColor: stat.color }} />
            
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: stat.color }}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{stat.label}</p>
                <h4 className="text-2xl font-black text-slate-900 leading-none mt-1">{stat.value.toLocaleString()}</h4>
              </div>
            </div>
            
            <div className="mt-auto">
              <p className="text-[11px] text-slate-500 font-medium mb-1.5">{stat.sublabel}</p>
              <div className={`flex items-center gap-1 text-[11px] font-bold ${
                stat.trend.direction === 'up' ? 'text-teal-600' : 'text-red-500'
              }`}>
                {stat.trend.direction === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {stat.trend.value}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 3. Main Content Grid */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* Left: Summary Grid */}
        <div className="col-span-12 xl:col-span-3 space-y-4">
           <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
             <h3 className="text-base font-headline font-black text-slate-900 mb-4">Acompanhamento Prioritário</h3>
             
             <div className="space-y-3">
               <div className="p-3.5 rounded-2xl border border-red-100 bg-red-50/30 flex items-center gap-3 relative overflow-hidden group">
                 <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
                 <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white shadow-md shadow-red-500/20">
                   <Baby className="w-5.5 h-5.5" />
                 </div>
                 <div className="flex-1">
                   <div className="flex items-center justify-between">
                     <h5 className="text-[13px] font-bold text-slate-900">1 bebê aguardando visita</h5>
                     <Badge variant="error" className="text-[9px] font-black uppercase">6 MESES</Badge>
                   </div>
                   <p className="text-[11px] text-slate-500 mt-0.5">Visita de 6 meses pendente</p>
                 </div>
               </div>

               <div className="p-3.5 rounded-2xl border border-orange-100 bg-orange-50/30 flex items-center gap-3 relative overflow-hidden group">
                 <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
                 <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
                   <CalendarIcon className="w-5.5 h-5.5" />
                 </div>
                 <div className="flex-1">
                   <div className="flex items-center justify-between">
                     <h5 className="text-[13px] font-bold text-slate-900">{stats.pendingVisits} visitas em atraso</h5>
                     <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center text-white text-[10px] font-black">{stats.pendingVisits}</div>
                   </div>
                   <p className="text-[11px] text-slate-500 mt-0.5">Pacientes sem registro nos últimos 30 dias</p>
                 </div>
               </div>
             </div>

             <button 
               onClick={() => navigate('/pacientes?filter=visitas_atrasadas')}
               className="w-full mt-4 py-2.5 border border-slate-100 rounded-xl text-teal-600 font-bold text-[12px] flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
             >
               Ver todos os pendentes
               <ChevronRight className="w-4 h-4" />
             </button>
           </div>
        </div>

        {/* Middle: Week Stats */}
        <div className="col-span-12 xl:col-span-5">
           <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-headline font-black text-slate-900">Visitas por Semana</h3>
                </div>
                <select className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] font-bold text-slate-600">
                  <option>Últimos 7 dias</option>
                </select>
              </div>

              <div className="flex-1 min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }} 
                      dy={10}
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      labelStyle={{ fontWeight: 'black', color: '#1e293b', marginBottom: '4px' }}
                    />
                    <Line type="monotone" dataKey="visitas" name="Realizadas" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="metas" name="Pendentes" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="flex justify-center gap-6 mt-6">
                 <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                    <span className="text-[11px] font-bold text-slate-500">Realizadas</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span className="text-[11px] font-bold text-slate-500">Pendentes</span>
                 </div>
              </div>

              <button className="w-full mt-4 py-2.5 border border-slate-100 rounded-xl text-teal-600 font-bold text-[12px] flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors">
                Ver relatório completo
                <ChevronRight className="w-4 h-4" />
              </button>
           </div>
        </div>

        {/* Right: Pie Chart */}
        <div className="col-span-12 xl:col-span-4">
           <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm h-full flex flex-col">
             <h3 className="text-base font-headline font-black text-slate-900 mb-4">Distribuição por Categoria</h3>
             
             <div className="flex-1 flex flex-col lg:flex-row items-center gap-6">
                <div className="relative w-48 h-48 sm:w-56 sm:h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={distribuicaoData}
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {distribuicaoData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{stats.totalPatients.toLocaleString()}</h2>
                    <p className="text-[10px] font-bold text-slate-400">Total</p>
                  </div>
                </div>

                <div className="flex-1 space-y-3 w-full">
                  {distribuicaoData.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px] font-bold">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-600">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-900">{item.value}</span>
                        <span className="text-slate-400">({Math.round((item.value / stats.totalPatients) * 100)}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
             </div>

             <button className="w-full mt-4 py-2.5 border border-slate-100 rounded-xl text-teal-600 font-bold text-[12px] flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors">
                Ver indicadores
                <ChevronRight className="w-4 h-4" />
              </button>
           </div>
        </div>
      </div>

      {/* 4. Table and Calendar Grid */}
      <div className="grid grid-cols-12 gap-4 pb-6">
        {/* Table */}
        <div className="col-span-12 xl:col-span-8">
           <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full">
              <div className="p-5 border-b border-slate-50">
                <h3 className="text-base font-headline font-black text-slate-900">Últimos Pacientes Visitados</h3>
              </div>
              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Paciente</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Categoria</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Idade</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Última Visita</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Situação</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {recentPatients.map((p, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-all group cursor-pointer" onClick={() => navigate(`/domicilio/${p.household_id || ''}`)}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-[11px] shadow-sm`} style={{ backgroundColor: distribuicaoData.find(d => p.categories?.includes(d.name.slice(0, -1)))?.color || '#94A3B8' }}>
                              {p.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-[13px] font-bold text-slate-900 leading-tight group-hover:text-teal-600 transition-colors uppercase">{p.name}</p>
                              <p className="text-[11px] text-slate-400 font-medium tracking-tight mt-0.5">{p.cns ? p.cns.replace(/(\d{3})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4') : 'Sem CNS'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex flex-wrap gap-1.5">
                             {p.categories?.slice(0, 2).map((c: string) => (
                               <span key={c} className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md" style={{ backgroundColor: distribuicaoData.find(d => c.includes(d.name.slice(0, -1)))?.color || '#94A3B8', color: '#fff' }}>
                                 {c}
                               </span>
                             ))}
                           </div>
                        </td>
                        <td className="px-6 py-4 text-[12px] font-bold text-slate-600">
                          {p.birth_date ? `${Math.floor(getAgeInMonths(p.birth_date)/12)} anos` : '--'}
                        </td>
                        <td className="px-6 py-4 text-[12px] font-bold text-slate-600">
                          {p.last_visit_at ? new Date(p.last_visit_at).toLocaleDateString('pt-BR') : '--'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                            p.last_visit_at && new Date(p.last_visit_at) > thirtyDaysAgo 
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                              : 'bg-orange-50 text-orange-600 border-orange-100'
                          }`}>
                            {p.last_visit_at && new Date(p.last_visit_at) > thirtyDaysAgo ? 'Em dia' : 'Atraso'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button className="p-2 text-slate-400 hover:text-teal-600 transition-colors">
                            <Eye className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 bg-slate-50/30 flex justify-center border-t border-slate-50">
                 <button onClick={() => navigate('/pacientes')} className="text-[12px] font-bold text-teal-600 flex items-center gap-2 hover:underline">
                   Ver todos os pacientes <ChevronRight className="w-4 h-4" />
                 </button>
              </div>
           </div>
        </div>

        {/* Calendar */}
        <div className="col-span-12 xl:col-span-4">
           <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full">
              <div className="p-5 border-b border-slate-50">
                 <h3 className="text-base font-headline font-black text-slate-900">Calendário de Pendências</h3>
              </div>
              <div className="flex-1 p-4 bg-slate-50/20">
                 <PendingCalendar patients={allPatients} />
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
