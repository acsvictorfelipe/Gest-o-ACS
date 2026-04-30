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
  MapPin
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAgeInMonths, VACCINE_SCHEDULE, formatDate, calculateAge } from '../lib/dateUtils';
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
  const [loading, setLoading] = React.useState(true);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  React.useEffect(() => {
    const fetchData = async () => {
      if (!user.microarea && user.role !== 'Administrador' && user.role !== 'Gestor') return;
      
      try {
        // Fetch Households Count
        let householdQuery = supabase.from('households').select('*', { count: 'exact', head: true });
        if (user.role === 'Gestor') {
          householdQuery = householdQuery.eq('area_color', user.color);
        } else if (user.role !== 'Administrador') {
          householdQuery = householdQuery.eq('agent_id', user.id);
        }
        const { count: hCount } = await householdQuery;

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
          childVisitAlerts: 0 
        };
        
        patientsData.forEach(p => {
          const clinical = p.clinical_data || {};
          const categories = p.categories || [];

          const lastVisit = p.last_visit_at ? new Date(p.last_visit_at) : null;
          if (!lastVisit || lastVisit < thirtyDaysAgo) {
            newStats.pendingVisits++;
          }

          if (categories.includes('Criança') && !categories.includes('Adulto') && !categories.includes('Idoso')) {
            newStats.criancasTotal++;
            const ageInMonths = p.birth_date ? getAgeInMonths(p.birth_date) : 999;
            
            // Focus on children under 2 years (24 months)
            if (ageInMonths <= 24) {
              newStats.criancas2y++;
              
              // Check for late vaccines for children 0-2 years
              const vacinas = clinical.crianca?.vacinas || {};
              const isLate = VACCINE_SCHEDULE.some(group => {
                // If the child is older than or equal to the vaccine group age, they should have taken it
                if (group.age <= ageInMonths) {
                  return group.vaccines.some(v => vacinas[v.id] !== 'Sim');
                }
                return false;
              });
              
              if (isLate) {
                newStats.lateVaccines++;
              }
            }
            
            if (p.birth_date && ageInMonths === 6) {
              const visited6m = clinical.crianca?.visita6meses === 'Sim';
              if (!visited6m) {
                newStats.childVisitAlerts++;
              }
            }
          }

          const isDiabetico = clinical.chronic?.diabetes === 'Sim' || clinical.gestante?.diabetes === 'Sim';
          const isHipertenso = clinical.chronic?.hipertensao === 'Sim' || clinical.gestante?.hipertensao === 'Sim';

          if (isDiabetico) newStats.diabeticos++;
          if (isHipertenso) newStats.hipertensos++;

          if (categories.includes('Gestante')) newStats.gestantes++;
          if (categories.includes('AcamadoDomiciliado')) newStats.acamados++;
          if (categories.includes('Idoso')) newStats.idosos++;
          if (categories.includes('Adulto')) newStats.adultos++;
          if (categories.includes('SaudeMental') || categories.includes('Saúde Mental')) newStats.saudeMental++;
        });

        setStats(newStats);
        setRecentPatients(patientsData.sort((a,b) => new Date(b.last_visit_at || 0).getTime() - new Date(a.last_visit_at || 0).getTime()).slice(0, 5));

      } catch (error) {
        console.error("Dashboard error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const statCards = [
    {
      id: 'cidadaos',
      icon: UI_CONFIG.categorias.outros.icon,
      value: stats.totalPatients,
      label: 'Cidadãos',
      sublabel: 'Total pacientes',
      config: UI_CONFIG.categorias.outros,
      filter: 'all'
    },
    {
      id: 'domicilios',
      icon: MapPin,
      value: stats.totalHouseholds,
      label: 'Domicílios',
      sublabel: 'Total residências',
      config: { primary: '#6366f1', soft: 'rgba(99, 102, 241, 0.1)' },
      filter: 'households' // Note: This filter might need handling in navigation
    },
    {
      id: 'gestantes',
      icon: UI_CONFIG.categorias.gestantes.icon,
      value: stats.gestantes,
      label: 'GESTANTES',
      sublabel: 'Acompanhadas',
      config: UI_CONFIG.categorias.gestantes,
      filter: 'gestantes'
    },
    {
      id: 'criancas',
      icon: UI_CONFIG.categorias.criancas.icon,
      value: stats.criancas2y,
      label: 'CRIANÇAS < 2',
      sublabel: 'Em acompanhamento',
      config: UI_CONFIG.categorias.criancas,
      filter: 'criancas'
    },
    {
      id: 'idosos',
      icon: UI_CONFIG.categorias.idosos.icon,
      value: stats.idosos,
      label: 'IDOSOS',
      sublabel: 'Acompanhados',
      config: UI_CONFIG.categorias.idosos,
      filter: 'idosos'
    },
    {
      id: 'hipertensos',
      icon: UI_CONFIG.categorias.hipertensos.icon,
      value: stats.hipertensos,
      label: 'HIPERTENSOS',
      sublabel: 'Acompanhados',
      config: UI_CONFIG.categorias.hipertensos,
      filter: 'hipertensos'
    },
    {
      id: 'diabeticos',
      icon: UI_CONFIG.categorias.diabeticos.icon,
      value: stats.diabeticos,
      label: 'DIABÉTICOS',
      sublabel: 'Acompanhados',
      config: UI_CONFIG.categorias.diabeticos,
      filter: 'diabeticos'
    },
    {
      id: 'acamados',
      icon: Bed,
      value: stats.acamados,
      label: 'ACAMADOS',
      sublabel: 'Domiciliados',
      config: UI_CONFIG.categorias.acamados,
      filter: 'acamados'
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 min-[1400px]:grid-cols-8 gap-3">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => navigate(stat.id === 'domicilios' ? '/domicilios' : `/pacientes?filter=${stat.filter}`)}
            className="bg-bg-secondary rounded-2xl p-4 border border-border shadow-sm cursor-pointer group relative overflow-hidden flex flex-col transition-all hover:shadow-md h-full"
          >
            <div className="absolute top-0 left-0 w-[3px] h-full" style={{ backgroundColor: stat.config.primary }} />
            
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: stat.config.soft, color: stat.config.primary }}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="min-h-[16px] flex items-end">
                  <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest leading-tight truncate">{stat.label}</p>
                </div>
                <h4 className="text-[26px] font-black text-text-primary leading-none mt-1">{stat.value}</h4>
              </div>
            </div>
            
            <div className="mt-auto">
              <p className="text-[10px] text-text-secondary font-semibold">{stat.sublabel}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 2. Middle Row */}
      <div className="grid grid-cols-12 gap-6">
        {/* Acompanhamento Prioritário */}
        <div className="col-span-12 xl:col-span-3">
           <div className="bg-bg-secondary rounded-[32px] p-6 border border-border shadow-sm h-full flex flex-col">
             <h3 className="text-base font-bold text-text-primary mb-5 uppercase tracking-tight">Acompanhamento Prioritário</h3>
             <div className="space-y-4 flex-1">
                <div onClick={() => navigate('/pacientes?filter=pending_6m')} className="p-4 rounded-[24px] border border-red-100 bg-red-50/20 flex items-center gap-4 relative overflow-hidden group hover:bg-red-50/40 transition-colors cursor-pointer transition-all">
                  <div className="absolute top-0 left-0 w-[4px] h-full bg-red-500" />
                  <div className="w-11 h-11 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/20 shrink-0">
                    <Baby className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h5 className="text-[14px] font-semibold text-text-primary leading-none">{stats.childVisitAlerts} {stats.childVisitAlerts === 1 ? 'bebê aguardando visita' : 'bebês aguardando visita'}</h5>
                      <Badge variant="error" className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full">6 MESES</Badge>
                    </div>
                    <p className="text-[12px] text-text-secondary font-medium">Visita de 6 meses pendente</p>
                  </div>
                </div>

                <div onClick={() => navigate('/pacientes?filter=visitas_atrasadas')} className="p-4 rounded-[24px] border border-orange-100 bg-orange-50/20 flex items-center gap-4 relative overflow-hidden group hover:bg-orange-50/40 transition-colors cursor-pointer transition-all">
                  <div className="absolute top-0 left-0 w-[4px] h-full bg-orange-500" />
                  <div className="w-11 h-11 rounded-full bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 shrink-0">
                    <CalendarIcon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h5 className="text-[14px] font-semibold text-text-primary leading-none">{stats.pendingVisits} visitas em atraso</h5>
                      <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center text-white text-[11px] font-bold shadow-sm">{stats.pendingVisits}</div>
                    </div>
                    <p className="text-[12px] text-text-secondary font-medium">Pacientes sem registro nos últimos 30 dias</p>
                  </div>
                </div>

                <div onClick={() => navigate('/pacientes?filter=vacinas_atrasadas')} className="p-4 rounded-[24px] border border-emerald-100 bg-emerald-50/20 flex items-center gap-4 relative overflow-hidden group hover:bg-emerald-50/40 transition-colors cursor-pointer transition-all">
                  <div className="absolute top-0 left-0 w-[4px] h-full bg-emerald-500" />
                  <div className="w-11 h-11 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 shrink-0">
                    <Baby className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h5 className="text-[14px] font-semibold text-text-primary leading-none">{stats.lateVaccines} vacinas atrasadas</h5>
                      <Badge variant="success" className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full">0-2 ANOS</Badge>
                    </div>
                    <p className="text-[12px] text-text-secondary font-medium">Crianças com pendência vacinal</p>
                  </div>
                </div>
             </div>
             <button onClick={() => navigate('/pacientes?filter=visitas_atrasadas')} className="w-full mt-6 py-3 border border-border rounded-2xl text-teal-600 font-semibold text-[13px] flex items-center justify-center gap-2 hover:bg-bg-primary transition-colors">
               Ver todos os pendentes <ChevronRight className="w-4 h-4" />
             </button>
           </div>
        </div>

        {/* Visitas Semanais */}
        <div className="col-span-12 xl:col-span-5">
           <div className="bg-bg-secondary rounded-[32px] p-6 border border-border shadow-sm h-full flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-bold text-text-primary uppercase tracking-tight">Visitas por Semana</h3>
                <select className="bg-bg-primary border border-border rounded-xl px-4 py-2 text-[12px] font-semibold text-text-secondary outline-none">
                  <option>Últimos 7 dias</option>
                </select>
              </div>
              <div className="flex-1 min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 11, fontWeight: 'bold' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
                    <RechartsTooltip contentStyle={{ borderRadius: '16px', backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    <Line type="monotone" dataKey="visitas" stroke="#10b981" strokeWidth={4} dot={{ r: 6, fill: '#10b981', strokeWidth: 3, stroke: '#fff' }} />
                    <Line type="monotone" dataKey="metas" stroke="#ef4444" strokeWidth={4} dot={{ r: 6, fill: '#ef4444', strokeWidth: 3, stroke: '#fff' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
           </div>
        </div>

        {/* Distribuição */}
        <div className="col-span-12 xl:col-span-4">
           <div className="bg-bg-secondary rounded-[32px] p-6 border border-border shadow-sm h-full flex flex-col">
             <h3 className="text-base font-bold text-text-primary mb-6 uppercase tracking-tight">Distribuição por Categoria</h3>
             <div className="flex-1 flex flex-col lg:flex-row items-center gap-8">
                <div className="relative w-44 h-44 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={distribuicaoData} innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value" stroke="none">
                        {distribuicaoData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <h2 className="text-2xl font-bold text-text-primary leading-none">{stats.totalPatients}</h2>
                    <p className="text-[10px] font-semibold text-text-muted uppercase tracking-widest mt-1">Total</p>
                  </div>
                </div>
                <div className="flex-1 space-y-1.5 w-full">
                  {distribuicaoData.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px] font-semibold">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-600 truncate">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-text-primary">{item.value}</span>
                        <span className="text-text-muted font-medium">({stats.totalPatients > 0 ? Math.round((item.value / stats.totalPatients) * 100) : 0}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
           </div>
        </div>
      </div>

      {/* 3. Table and Calendar */}
      <div className="grid grid-cols-12 gap-6 pb-6">
        {/* Table */}
        <div className="col-span-12 xl:col-span-8">
           <div className="bg-bg-secondary rounded-[32px] border border-border shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-bg-secondary sticky top-0 z-10">
                <h3 className="text-base font-bold text-text-primary tracking-tight">Últimos Pacientes Visitados</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-bg-primary/50">
                      <th className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-widest border-b border-border">Paciente</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-widest border-b border-border">Categoria</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-widest border-b border-border">Idade</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-widest border-b border-border">Última Visita</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-widest border-b border-border">Situação</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-widest border-b border-border text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {recentPatients.map((p, i) => {
                      const isAtrazo = !(p.last_visit_at && new Date(p.last_visit_at) > thirtyDaysAgo);
                      return (
                        <tr key={i} className="hover:bg-bg-primary/80 transition-colors group">
                          <td className="px-6 py-2">
                            <div className="flex items-center gap-4">
                              <div 
                                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-[12px] shadow-md"
                                style={getAvatarStyle(p.categories?.[0] || 'Outros')}
                              >
                                {p.name?.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                 <p className="text-[13px] font-semibold text-text-primary truncate uppercase leading-tight">{p.name}</p>
                                 <p className="text-[10px] text-text-muted font-semibold mt-0.5 uppercase tracking-wider">{p.cns || '000 0000 0000 0000'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-2">
                             <div className="flex flex-wrap gap-1.5">
                               {p.categories?.slice(0, 2).map((c: string) => (
                                 <span 
                                   key={c} 
                                   className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-lg shadow-sm"
                                   style={getCategoryStyle(c)}
                                 >
                                   {c}
                                 </span>
                               ))}
                             </div>
                          </td>
                          <td className="px-6 py-2 text-[12px] font-semibold text-slate-600">
                             {p.birth_date ? calculateAge(p.birth_date) : '--'}
                          </td>
                          <td className="px-6 py-2 text-[12px] font-semibold text-slate-600">
                             {p.last_visit_at ? formatDate(p.last_visit_at) : '--'}
                          </td>
                          <td className="px-6 py-2">
                            <div className={`inline-flex items-center gap-2 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${
                              !isAtrazo ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-orange-50 text-orange-600 border border-orange-100'
                            }`}>
                              {!isAtrazo ? 'Em dia' : 'Atraso'}
                            </div>
                          </td>
                          <td className="px-6 py-2 text-center">
                            <button onClick={() => navigate(`/domicilio/${p.household_id || ''}`)} className="p-1.5 rounded-full border border-border text-text-muted hover:bg-bg-primary hover:text-text-primary transition-all">
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-slate-50 flex justify-center">
                <button 
                  onClick={() => navigate('/pacientes')} 
                  className="flex items-center gap-2 text-[14px] font-semibold text-teal-600 hover:text-teal-700 transition-colors"
                >
                  Ver todos os pacientes <ChevronRight className="w-4 h-4" />
                </button>
              </div>
           </div>
        </div>

        {/* Calendar */}
        <div className="col-span-12 xl:col-span-4">
           <div className="bg-bg-secondary rounded-[32px] border border-border shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-50 bg-bg-secondary sticky top-0 z-10">
                 <h3 className="text-base font-bold text-text-primary tracking-tight">Calendário de Pendências</h3>
              </div>
              <div className="p-4 flex items-center justify-center">
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

