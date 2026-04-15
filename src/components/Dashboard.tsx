import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Baby, 
  HeartPulse, 
  Stethoscope, 
  Activity, 
  AlertCircle, 
  Calendar,
  ChevronRight,
  TrendingUp,
  Plus,
  Smile,
  Bed,
  Droplets,
  Heart
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getAgeInMonths, VACCINE_SCHEDULE } from '../lib/dateUtils';

export function Dashboard({ user }: { user: any }) {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalPatients: 0,
    gestantes: 0,
    criancas: 0,
    hipertensos: 0,
    diabeticos: 0,
    acamados: 0,
    idosos: 0,
    pendingVisits: 0,
    lateVaccines: 0,
    childVisitAlerts: 0
  });
  const [recentPatients, setRecentPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Admins and Gestors might not have a microarea, but they should see data
      if (!user.microarea && user.role !== 'Administrador' && user.role !== 'Gestor') return;
      
      try {
        let allPatients: any[] = [];
        let from = 0;
        let to = 999;
        let hasMore = true;

        while (hasMore && allPatients.length < 10000) {
          let query = supabase.from('patients').select('id, categories, clinical_data, last_visit_at, birth_date').range(from, to);
          
          if (user.role === 'Administrador') {
            // No filters for Admin
          } else if (user.role === 'Gestor') {
            query = query.eq('area_color', user.color);
          } else {
            query = query.eq('agent_id', user.id);
          }

          const { data, error } = await query;
          if (error) throw error;
          
          if (data && data.length > 0) {
            allPatients = [...allPatients, ...data];
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

        const patients = allPatients;
        const newStats = { totalPatients: patients?.length || 0, gestantes: 0, criancas: 0, acamados: 0, idosos: 0, hipertensos: 0, diabeticos: 0, pendingVisits: 0, lateVaccines: 0, childVisitAlerts: 0 };
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const now = new Date();

        patients?.forEach(p => {
          const clinical = p.clinical_data || {};
          const categories = p.categories || [];

          // Check for pending visit (more than 30 days or never)
          const lastVisit = p.last_visit_at ? new Date(p.last_visit_at) : null;
          if (!lastVisit || lastVisit < thirtyDaysAgo) {
            newStats.pendingVisits++;
          }

          if (categories.includes('Criança')) {
            newStats.criancas++;
            // Check for 6 month visit alert
            if (p.birth_date) {
              const birth = new Date(p.birth_date);
              const sixMonthsDate = new Date(birth);
              sixMonthsDate.setMonth(birth.getMonth() + 6);
              const diffDays = Math.ceil((sixMonthsDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              if (diffDays <= 15 && diffDays >= -15) {
                newStats.childVisitAlerts++;
              }
            }
            // Check for late vaccines based on age
            const ageInMonths = p.birth_date ? getAgeInMonths(p.birth_date) : 0;
            const vaccines = clinical.crianca?.vacinas || {};
            
            // Get vaccines that should have been taken by now
            const dueVaccines = VACCINE_SCHEDULE
              .filter(group => group.age <= ageInMonths)
              .flatMap(group => group.vaccines);
              
            const hasPendingVaccine = dueVaccines.some(v => vaccines[v.id] !== 'Sim');
            
            if (hasPendingVaccine) {
              newStats.lateVaccines++;
            }
          }
          const isDiabetico = clinical.chronic?.diabetes === 'Sim' || 
                              clinical.gestante?.diabetes === 'Sim' || 
                              clinical.acamadodomiciliado?.diabetes === 'Sim' || 
                              clinical.idoso?.diabetes === 'Sim' || 
                              clinical.adulto?.diabetes === 'Sim';
          
          const isHipertenso = clinical.chronic?.hipertensao === 'Sim' || 
                               clinical.gestante?.hipertensao === 'Sim' || 
                               clinical.gestante?.pressaoAlta === 'Sim' || 
                               clinical.acamadodomiciliado?.hipertensao === 'Sim' || 
                               clinical.acamadodomiciliado?.pressaoAlta === 'Sim' || 
                               clinical.idoso?.hipertensao === 'Sim' || 
                               clinical.idoso?.pressaoAlta === 'Sim' || 
                               clinical.adulto?.hipertensao === 'Sim' || 
                               clinical.adulto?.pressaoAlta === 'Sim';

          if (isDiabetico) newStats.diabeticos++;
          if (isHipertenso) newStats.hipertensos++;

          if (categories.includes('Gestante')) newStats.gestantes++;
          if (categories.includes('AcamadoDomiciliado')) newStats.acamados++;
          if (categories.includes('Idoso')) newStats.idosos++;
        });
        setStats(newStats);

        // Recent patients
        let recentQuery = supabase
          .from('patients')
          .select('*')
          .order('last_visit_at', { ascending: false })
          .limit(5);

        if (user.role === 'Administrador') {
          // No filters for Admin
        } else if (user.role === 'Gestor') {
          recentQuery = recentQuery.eq('area_color', user.color);
        } else {
          recentQuery = recentQuery.eq('agent_id', user.id);
        }

        const { data: recent, error: recentError } = await recentQuery;
        if (recentError) throw recentError;
        setRecentPatients(recent || []);
      } catch (error) {
        console.error("Dashboard data error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user.microarea, user.id, user.role, user.color]);

  const statCards = [
    { label: 'Gestantes', value: stats.gestantes, icon: Baby, color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' },
    { label: 'Crianças', value: stats.criancas, icon: Smile, color: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' },
    { label: 'Acamados', value: stats.acamados, icon: Bed, color: 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400' },
    { label: 'Idosos', value: stats.idosos, icon: HeartPulse, color: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' },
    { label: 'Hipertensos', value: stats.hipertensos, icon: Heart, color: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' },
    { label: 'Diabéticos', value: stats.diabeticos, icon: Droplets, color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' },
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
        <div>
          <h2 className="text-3xl font-extrabold text-primary tracking-tight font-headline">
            {(() => {
              const hour = new Date().getHours();
              if (hour < 12) return 'Bom dia';
              if (hour < 18) return 'Boa tarde';
              return 'Boa noite';
            })()}, {user.role === 'Administrador' ? 'Administrador' : user.role === 'Gestor' ? 'Gestor' : 'ACS'} {user.name ? user.name.split(' ')[0] : (user.email ? user.email.split('@')[0] : '')}!
          </h2>
          <p className="text-slate-500 mt-1 font-medium">Aqui está o resumo do seu território de atuação hoje.</p>
        </div>
      <section>
        <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
          {user.role === 'Administrador' ? (
            'Você tem acesso total a todos os dados do sistema.'
          ) : (
            <>
              Você está visualizando os dados da <span className="text-primary font-bold">Microárea {user.microarea}</span>
              {user.color && (
                <>
                  {' '}- Área <span className="font-bold" style={{ color: user.color }}>
                    {user.color === '#00488d' ? 'AZUL' : 
                     user.color === '#eab308' ? 'AMARELO' : 
                     user.color === '#64748b' ? 'CINZA' : 
                     user.color === '#db2777' ? 'ROSA' : 
                     user.color === '#713f12' ? 'MARROM' : ''}
                  </span>
                </>
              )}
            </>
          )}
        </p>
      </section>

      {/* Summary Stats */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="bg-white dark:bg-slate-900 px-6 py-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total de Pacientes</p>
              <p className="text-2xl font-black text-on-surface">{stats.totalPatients}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 lg:gap-6">
          {statCards.map((card, i) => (
            <Link 
              key={i} 
              to={`/pacientes?filter=${card.label.toLowerCase().replace(/ /g, '_')}`}
              className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all group cursor-pointer"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${card.color}`}>
                  <card.icon className="w-6 h-6" />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-on-surface">{card.value}</p>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-2">{card.label}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Alerts */}
        <section className="lg:col-span-1 space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-bold text-on-surface font-headline">Alertas Críticos</h4>
            <span className="px-2 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[10px] font-bold rounded uppercase">Prioritário</span>
          </div>
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border-l-4 border-red-500 flex items-start gap-4">
              <AlertCircle className="w-5 h-5 text-red-500 mt-1" />
              <div>
                <h5 className="text-sm font-bold text-on-surface">Vacinas Atrasadas</h5>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {stats.lateVaccines} {stats.lateVaccines === 1 ? 'criança com calendário incompleto' : 'crianças com calendário incompleto'} no setor.
                </p>
                <Link 
                  to="/pacientes?filter=vaccine"
                  className="mt-3 inline-block text-xs font-bold text-primary hover:underline"
                >
                  Ver Lista
                </Link>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border-l-4 border-primary flex items-start gap-4">
              <Calendar className="w-5 h-5 text-primary mt-1" />
              <div>
                <h5 className="text-sm font-bold text-on-surface">Visitas Pendentes</h5>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {stats.pendingVisits} {stats.pendingVisits === 1 ? 'cidadão aguardando' : 'cidadãos aguardando'} visita mensal.
                </p>
                <Link 
                  to="/pacientes?filter=pending"
                  className="mt-3 inline-block text-xs font-bold text-primary hover:underline"
                >
                  Agendar Agora
                </Link>
              </div>
            </div>
            {stats.childVisitAlerts > 0 && (
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border-l-4 border-orange-500 flex items-start gap-4 animate-pulse">
                <Baby className="w-5 h-5 text-orange-500 mt-1" />
                <div>
                  <h5 className="text-sm font-bold text-on-surface">Visitas de 6 Meses</h5>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {stats.childVisitAlerts} {stats.childVisitAlerts === 1 ? 'criança próxima' : 'crianças próximas'} da visita de 6 meses.
                  </p>
                  <Link 
                    to="/pacientes?filter=crianças"
                    className="mt-3 inline-block text-xs font-bold text-primary hover:underline"
                  >
                    Ver Lista
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Recent Patients */}
        <section className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-bold text-on-surface font-headline">Pacientes Visitados Recentemente</h4>
            <Link 
              to="/historico"
              className="text-xs font-bold text-primary uppercase tracking-widest hover:underline"
            >
              Ver Histórico
            </Link>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50">
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Paciente</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Condição</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {recentPatients.length > 0 ? recentPatients.map((p) => {
                    const lastVisit = p.last_visit_at ? new Date(p.last_visit_at) : null;
                    const daysAgo = lastVisit ? Math.floor((Date.now() - lastVisit.getTime()) / (1000 * 60 * 60 * 24)) : null;
                    const statusInfo = !lastVisit
                      ? { label: 'Nunca visitado', cls: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' }
                      : daysAgo! > 30
                      ? { label: `Atrasado ${daysAgo}d`, cls: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' }
                      : { label: 'Regular', cls: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' };
                    return (
                    <tr
                      key={p.id}
                      onClick={() => navigate(`/editar-paciente/${p.id}`)}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                            {p.name?.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-on-surface truncate">{p.name}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500">CNS: {p.cns}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {p.categories?.slice(0, 2).map((cat: string) => (
                            <span key={cat} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] rounded-full font-medium whitespace-nowrap">
                              {cat}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-[10px] font-bold rounded-full whitespace-nowrap ${statusInfo.cls}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-primary transition-colors" />
                      </td>
                    </tr>
                  );
                  }) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-slate-400 text-sm">
                        Nenhum paciente cadastrado na microárea {user.microarea}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {/* FAB */}
      <Link 
        to="/novo-cadastro"
        className="fixed bottom-8 right-8 w-16 h-16 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50"
      >
        <Plus className="w-8 h-8" />
      </Link>
    </div>
  );
}
