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
  Users,
  Megaphone
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAgeInMonths, VACCINE_SCHEDULE, formatDate, calculateAge, getAgeNumber, getPatientLastVisitAt } from '../lib/dateUtils';
import { Badge } from './Badge';
import { PendingCalendar } from './PendingCalendar';
import { motion } from 'motion/react';
import {
  AreaChart, Area, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import { UI_CONFIG } from '../constants';

import { useDashboard } from '../hooks/useDashboard';
import { AdminDashboard } from './AdminDashboard';

export function Dashboard({ user }: { user: any }) {
  const navigate = useNavigate();

  if (user?.role === 'Administrador' || user?.role === 'Gestor') {
    return <AdminDashboard user={user} />;
  }

  const {
    stats,
    allPatients,
    recentPatients,
    weeklyChartData,
    loading,
    statCards,
    distribuicaoData,
    getAvatarStyle,
    dailyAgenda,
    handleRemoveFromAgenda,
    handleToggleAgenda,
    visitRequests,
    handleUpdateVisitRequestStatus
  } = useDashboard(user);

  const [activeCampaigns, setActiveCampaigns] = React.useState<any[]>([]);

  React.useEffect(() => {
    async function fetchCampaigns() {
      try {
        const { data, error } = await supabase
          .from('campaigns')
          .select('*')
          .eq('active', true)
          .order('created_at', { ascending: false });
        if (!error && data) {
          setActiveCampaigns(data);
        }
      } catch (err) {
        console.error('Erro ao buscar campanhas:', err);
      }
    }
    fetchCampaigns();
  }, []);

  const thirtyDaysAgo = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  }, []);

  const lastRegisteredPatients = React.useMemo(() => {
    return [...allPatients]
      .filter(p => p.created_at)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 4);
  }, [allPatients]);

  const chartData = weeklyChartData;

  if (loading) return null;

  return (
    <div className="space-y-6 relative pb-8">
      {/* Active Campaigns Banner */}
      {activeCampaigns.length > 0 && (
        <div className="space-y-3">
          {activeCampaigns.map((campaign, i) => (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="backdrop-blur-md bg-gradient-to-r from-teal-500/15 via-indigo-500/10 to-teal-500/5 border border-teal-500/20 rounded-[28px] p-5 shadow-lg relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-teal-500/20 transition-all duration-700" />
              <div className="flex gap-4 items-start relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 shadow-inner">
                  <Megaphone className="w-5 h-5 animate-bounce" />
                </div>
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black bg-teal-600/15 text-teal-700 dark:text-teal-400 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      Campanha de Saúde
                    </span>
                    <span className="text-[9px] text-text-muted font-bold">
                      {formatDate(campaign.created_at)}
                    </span>
                  </div>
                  <h3 className="text-sm font-extrabold text-text-primary uppercase tracking-tight leading-snug">
                    {campaign.title}
                  </h3>
                  <p className="text-[12px] text-text-secondary leading-relaxed font-medium">
                    {campaign.content}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Coordinated Visit Requests Alerts for Agents */}
      {visitRequests && visitRequests.filter(r => r.status === 'pending' || r.status === 'accepted').length > 0 && (
        <div className="space-y-3">
          {visitRequests.filter(r => r.status === 'pending' || r.status === 'accepted').map((req, i) => {
            const isPending = req.status === 'pending';
            const priorityColors = {
              low: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
              medium: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
              high: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20',
              urgent: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20 animate-pulse'
            };

            return (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`backdrop-blur-md border rounded-[28px] p-5 shadow-lg relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                  req.priority === 'urgent' 
                    ? 'bg-gradient-to-r from-red-500/15 via-pink-500/5 to-red-500/5 border-red-500/30'
                    : req.priority === 'high' 
                      ? 'bg-gradient-to-r from-orange-500/15 via-yellow-500/5 to-orange-500/5 border-orange-500/30'
                      : 'bg-bg-secondary border-border'
                }`}
              >
                <div className="flex gap-4 items-start flex-1 min-w-0">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
                    req.priority === 'urgent' 
                      ? 'bg-red-500/15 text-red-600 dark:text-red-400' 
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  }`}>
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black bg-teal-600/15 text-teal-700 dark:text-teal-400 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Solicitação de Visita
                      </span>
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${priorityColors[req.priority] || priorityColors.medium}`}>
                        Prioridade: {req.priority === 'low' ? 'Baixa' : req.priority === 'medium' ? 'Média' : req.priority === 'high' ? 'Alta' : 'URGENTE'}
                      </span>
                      <span className="text-[9px] text-text-muted font-bold">
                        Enviado por {req.sender_name}
                      </span>
                    </div>

                    <h3 className="text-sm font-black text-text-primary uppercase tracking-tight leading-snug">
                      Paciente: {req.patient_name}
                    </h3>
                    
                    <div className="p-3 bg-bg-secondary/45 border border-border/40 rounded-xl max-w-2xl">
                      <p className="text-[12px] text-text-secondary leading-relaxed font-semibold">
                        "{req.reason}"
                      </p>
                    </div>

                    {req.patient_address && (
                      <p className="text-[10px] text-text-muted font-bold uppercase truncate max-w-xl">
                        Endereço: {req.patient_address}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0 w-full sm:w-auto md:w-56 items-stretch md:items-end pt-2 md:pt-0">
                  {isPending ? (
                    <>
                      <button
                        onClick={() => handleUpdateVisitRequestStatus(req.id, 'accepted')}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-[11px] font-black shadow-md shadow-teal-600/10 active:scale-98 transition-all"
                      >
                        ✓ Aceitar & Incluir no Roteiro
                      </button>
                      <button
                        onClick={() => {
                          const note = prompt('Motivo da recusa/dispensa (opcional):');
                          handleUpdateVisitRequestStatus(req.id, 'dismissed', note || '');
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-transparent hover:bg-slate-500/10 text-text-secondary hover:text-text-primary rounded-xl text-[11px] font-black border border-border/80 transition-all"
                      >
                        Dispensar Alerta
                      </button>
                    </>
                  ) : (
                    <div className="space-y-2 w-full flex flex-col">
                      <div className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 text-[10px] font-black uppercase tracking-wider text-center py-1.5 rounded-xl">
                        ✓ Roteiro de Hoje Ativo
                      </div>
                      <button
                        onClick={() => {
                          const note = prompt('Relatório final / observações para o Gestor (opcional):');
                          handleUpdateVisitRequestStatus(req.id, 'done', note || '');
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-black shadow-md shadow-emerald-500/10 active:scale-98 transition-all"
                      >
                        ✓ Marcar Visita Concluída
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* 1. Quick Actions Bar */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="backdrop-blur-md bg-bg-secondary/80 border border-border rounded-[28px] p-5 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text-primary leading-tight">Painel do Agente de Saúde</h2>
            <p className="text-[11px] text-text-secondary font-medium mt-0.5">Acesso rápido para ações diárias de campo</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto justify-end">
          <button
            onClick={() => navigate('/novo-cadastro')}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-[12px] font-bold shadow-md shadow-teal-600/10 active:scale-98 transition-all w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            Novo Cidadão
          </button>
          
          <button
            onClick={() => navigate('/pacientes')}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white rounded-2xl text-[12px] font-bold shadow-sm active:scale-98 transition-all w-full sm:w-auto"
          >
            <CalendarIcon className="w-4 h-4" />
            Registrar Visita
          </button>
        </div>
      </motion.div>

      {/* 2. Stat Cards Grid */}
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

      {/* 3. Row 1: Planejamento e Acompanhamento (Calendário, Roteiro, Prioritários) */}
      <div className="grid grid-cols-12 gap-6 items-stretch">
        {/* Calendário de Pendências */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-bg-secondary rounded-[32px] p-3 border border-border shadow-sm flex flex-col min-h-[300px] h-full">
            <div className="flex-1 overflow-auto">
              <PendingCalendar patients={allPatients} />
            </div>
          </div>
        </div>

        {/* Roteiro de Hoje (Checklist) */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-bg-secondary rounded-[32px] p-4 border border-border shadow-sm flex flex-col min-h-[300px] h-full">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-text-primary uppercase tracking-tight">Roteiro de Hoje</h3>
                  <p className="text-[10px] text-text-secondary font-medium">Lista de visitas do dia</p>
                </div>
              </div>
              <span className="text-[10px] font-bold bg-teal-50 text-teal-600 dark:bg-teal-950/30 dark:text-teal-400 px-2.5 py-0.5 rounded-full border border-teal-100 dark:border-teal-900/30 shrink-0">
                {dailyAgenda.filter(i => i.done).length}/{dailyAgenda.length}
              </span>
            </div>

            {/* Progress bar */}
            {dailyAgenda.length > 0 && (
              <div className="mb-3 shrink-0 bg-bg-primary/50 dark:bg-slate-800/10 p-2 rounded-xl border border-border/60">
                <div className="flex justify-between items-center text-[10px] font-bold text-text-secondary mb-1">
                  <span className="uppercase tracking-wider">Progresso das Visitas</span>
                  <span className="text-teal-600 dark:text-teal-400">{Math.round((dailyAgenda.filter(i => i.done).length / dailyAgenda.length) * 100)}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-teal-500 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.round((dailyAgenda.filter(i => i.done).length / dailyAgenda.length) * 100)}%` }} 
                  />
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {dailyAgenda.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <div className="w-12 h-12 rounded-full bg-teal-50 dark:bg-teal-950/20 flex items-center justify-center text-teal-600 dark:text-teal-400 mb-3 shrink-0">
                    <MapPin className="w-6 h-6 animate-pulse" />
                  </div>
                  <p className="text-[12px] font-black text-text-primary uppercase tracking-tight">Roteiro de Campo Vazio</p>
                  <p className="text-[10px] text-text-muted mt-1 max-w-[200px] leading-relaxed">
                    Adicione visitas ao seu roteiro através da lista de cidadãos para começar o dia!
                  </p>
                  <button 
                    onClick={() => navigate('/pacientes')} 
                    className="mt-4 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-[11px] font-bold shadow-md shadow-teal-600/10 active:scale-98 transition-all shrink-0"
                  >
                    Buscar Cidadãos
                  </button>
                </div>
              ) : (
                dailyAgenda.map((item) => {
                  const patient = allPatients.find(p => p.id === item.id);
                  const primaryCategory = patient?.categories?.[0] || 'Outros';
                  const address = patient?.address;
                  
                  const categoryKey = primaryCategory.toLowerCase().includes('criança') ? 'criancas' :
                                     primaryCategory.toLowerCase().includes('gestante') ? 'gestantes' :
                                     primaryCategory.toLowerCase().includes('idoso') ? 'idosos' :
                                     primaryCategory.toLowerCase().includes('hipertenso') ? 'hipertensos' :
                                     primaryCategory.toLowerCase().includes('diabético') || primaryCategory.toLowerCase().includes('diabetico') ? 'diabeticos' :
                                     'outros';
                  const categoryConfig = (UI_CONFIG.categorias as any)[categoryKey] || UI_CONFIG.categorias.outros;

                  return (
                    <motion.div 
                      layout
                      key={item.id}
                      className="flex flex-col gap-1 p-2.5 bg-bg-primary/40 dark:bg-slate-800/10 hover:bg-bg-primary dark:hover:bg-slate-800/30 rounded-2xl border border-border/60 transition-all group"
                    >
                      <div className="flex items-center justify-between min-w-0">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            onClick={() => handleToggleAgenda(item.id)}
                            className={`w-4 h-4 rounded-lg flex items-center justify-center border transition-all shrink-0 ${
                              item.done 
                                ? 'bg-teal-500 border-teal-500 text-white' 
                                : 'border-slate-300 dark:border-slate-700 hover:border-teal-500'
                            }`}
                          >
                            {item.done && <Check className="w-3 h-3 stroke-[3]" />}
                          </button>
                          <span className={`text-[12px] font-black truncate uppercase tracking-tight ${
                            item.done 
                              ? 'line-through text-text-muted dark:text-text-secondary/40 font-bold' 
                              : 'text-text-primary'
                          }`}>
                            {item.name}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveFromAgenda(item.id)}
                          className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-500 text-text-muted transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between pl-6.5">
                        <span className="text-[8px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: categoryConfig.primary, color: '#fff' }}>
                          {primaryCategory}
                        </span>
                        {address && (
                          <span className="text-[9px] font-bold text-text-muted truncate max-w-[150px] uppercase text-right ml-2">
                            {address}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Acompanhamento Prioritário */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-bg-secondary rounded-[32px] p-4 border border-border shadow-sm flex flex-col min-h-[300px] h-full">
            <div className="flex items-center gap-2.5 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-600 dark:text-red-400">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-text-primary uppercase tracking-tight">Acompanhamento Prioritário</h3>
                <p className="text-[10px] text-text-secondary font-medium">Alertas de saúde ativos</p>
              </div>
            </div>
            <div className="space-y-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
              {/* Alerta 1: Crianças / Bebês */}
              <div 
                onClick={() => navigate('/pacientes?filter=pending_6m')} 
                className={`p-2.5 rounded-[20px] border flex items-center gap-3 relative overflow-hidden group transition-all cursor-pointer ${
                  stats.childVisitAlerts > 0
                    ? 'border-red-100 dark:border-red-950/30 bg-red-50/10 hover:bg-red-50/20'
                    : 'border-emerald-100 dark:border-emerald-950/20 bg-emerald-500/5 hover:bg-emerald-500/10'
                }`}
              >
                <div className={`absolute top-0 left-0 w-[4px] h-full ${stats.childVisitAlerts > 0 ? 'bg-red-500' : 'bg-emerald-500'}`} />
                <div className={`w-8.5 h-8.5 rounded-full flex items-center justify-center text-white shadow-sm shrink-0 ${stats.childVisitAlerts > 0 ? 'bg-red-500' : 'bg-emerald-500'}`}>
                  {stats.childVisitAlerts > 0 ? <Baby className="w-4.5 h-4.5" /> : <Check className="w-4.5 h-4.5 stroke-[3]" />}
                </div>
                <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                  <div className="min-w-0">
                    <h5 className="text-[12px] font-black text-text-primary leading-tight truncate uppercase tracking-tight">
                      {stats.childVisitAlerts > 0 ? `${stats.childVisitAlerts} visitas (bebês)` : 'Bebês c/ Visita'}
                    </h5>
                    <p className="text-[9px] text-text-muted font-bold mt-0.5 uppercase">Acompanhamento até 6m</p>
                  </div>
                  <Badge variant={stats.childVisitAlerts > 0 ? 'error' : 'success'} className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded shrink-0">
                    {stats.childVisitAlerts > 0 ? 'PENDENTE' : 'EM DIA'}
                  </Badge>
                </div>
              </div>

              {/* Alerta 2: Visitas em Atraso */}
              <div 
                onClick={() => navigate('/pacientes?filter=visitas_atrasadas')} 
                className={`p-2.5 rounded-[20px] border flex items-center gap-3 relative overflow-hidden group transition-all cursor-pointer ${
                  stats.pendingVisits > 0
                    ? 'border-orange-100 dark:border-orange-950/30 bg-orange-50/10 hover:bg-orange-50/20'
                    : 'border-emerald-100 dark:border-emerald-950/20 bg-emerald-500/5 hover:bg-emerald-500/10'
                }`}
              >
                <div className={`absolute top-0 left-0 w-[4px] h-full ${stats.pendingVisits > 0 ? 'bg-orange-500' : 'bg-emerald-500'}`} />
                <div className={`w-8.5 h-8.5 rounded-full flex items-center justify-center text-white shadow-sm shrink-0 ${stats.pendingVisits > 0 ? 'bg-orange-500' : 'bg-emerald-500'}`}>
                  {stats.pendingVisits > 0 ? <CalendarIcon className="w-4.5 h-4.5" /> : <Check className="w-4.5 h-4.5 stroke-[3]" />}
                </div>
                <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                  <div className="min-w-0">
                    <h5 className="text-[12px] font-black text-text-primary leading-tight truncate uppercase tracking-tight">
                      {stats.pendingVisits > 0 ? `${stats.pendingVisits} visitas em atraso` : 'Visitas da Microárea'}
                    </h5>
                    <p className="text-[9px] text-text-muted font-bold mt-0.5 uppercase">Rotina mensal de campo</p>
                  </div>
                  <div className={`px-2 py-0.5 rounded-lg text-[9px] font-black shadow-sm shrink-0 ${stats.pendingVisits > 0 ? 'bg-orange-500 text-white' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'}`}>
                    {stats.pendingVisits > 0 ? stats.pendingVisits : 'OK'}
                  </div>
                </div>
              </div>

              {/* Alerta 3: Vacinas Atrasadas */}
              <div 
                onClick={() => navigate('/pacientes?filter=vacinas_atrasadas')} 
                className={`p-2.5 rounded-[20px] border flex items-center gap-3 relative overflow-hidden group transition-all cursor-pointer ${
                  stats.lateVaccines > 0
                    ? 'border-red-100 dark:border-red-950/30 bg-red-50/10 hover:bg-red-50/20'
                    : 'border-emerald-100 dark:border-emerald-950/20 bg-emerald-500/5 hover:bg-emerald-500/10'
                }`}
              >
                <div className={`absolute top-0 left-0 w-[4px] h-full ${stats.lateVaccines > 0 ? 'bg-red-500' : 'bg-emerald-500'}`} />
                <div className={`w-8.5 h-8.5 rounded-full flex items-center justify-center text-white shadow-sm shrink-0 ${stats.lateVaccines > 0 ? 'bg-red-500' : 'bg-emerald-500'}`}>
                  {stats.lateVaccines > 0 ? <ShieldAlert className="w-4.5 h-4.5" /> : <Check className="w-4.5 h-4.5 stroke-[3]" />}
                </div>
                <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                  <div className="min-w-0">
                    <h5 className="text-[12px] font-black text-text-primary leading-tight truncate uppercase tracking-tight">
                      {stats.lateVaccines > 0 ? `${stats.lateVaccines} vacinas atrasadas` : 'Vacinação de Crianças'}
                    </h5>
                    <p className="text-[9px] text-text-muted font-bold mt-0.5 uppercase">Crianças menores de 2 anos</p>
                  </div>
                  <Badge variant={stats.lateVaccines > 0 ? 'error' : 'success'} className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded shrink-0">
                    {stats.lateVaccines > 0 ? 'ATRASO' : 'COMPLETO'}
                  </Badge>
                </div>
              </div>

              {/* Alerta 4: Receitas Vencendo */}
              <div 
                onClick={() => navigate('/pacientes?filter=receitas_vencendo')} 
                className={`p-2.5 rounded-[20px] border flex items-center gap-3 relative overflow-hidden group transition-all cursor-pointer ${
                  stats.receitasAVencer > 0
                    ? 'border-purple-100 dark:border-purple-950/30 bg-purple-50/10 hover:bg-purple-50/20'
                    : 'border-emerald-100 dark:border-emerald-950/20 bg-emerald-500/5 hover:bg-emerald-500/10'
                }`}
              >
                <div className={`absolute top-0 left-0 w-[4px] h-full ${stats.receitasAVencer > 0 ? 'bg-purple-500' : 'bg-emerald-500'}`} />
                <div className={`w-8.5 h-8.5 rounded-full flex items-center justify-center text-white shadow-sm shrink-0 ${stats.receitasAVencer > 0 ? 'bg-purple-500' : 'bg-emerald-500'}`}>
                  {stats.receitasAVencer > 0 ? <Activity className="w-4.5 h-4.5" /> : <Check className="w-4.5 h-4.5 stroke-[3]" />}
                </div>
                <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                  <div className="min-w-0">
                    <h5 className="text-[12px] font-black text-text-primary leading-tight truncate uppercase tracking-tight">
                      {stats.receitasAVencer > 0 ? `${stats.receitasAVencer} receitas vencendo` : 'Receitas de Uso Contínuo'}
                    </h5>
                    <p className="text-[9px] text-text-muted font-bold mt-0.5 uppercase">Medicamentos controlados</p>
                  </div>
                  <Badge variant={stats.receitasAVencer > 0 ? 'default' : 'success'} className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded shrink-0 ${stats.receitasAVencer > 0 ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300' : ''}`}>
                    {stats.receitasAVencer > 0 ? 'ATENÇÃO' : 'VÁLIDAS'}
                  </Badge>
                </div>
              </div>

              {/* Alerta 5: Pré-Natal / Visitas Gestante Pendentes */}
              <div 
                onClick={() => navigate('/pacientes?filter=gestantes')} 
                className={`p-2.5 rounded-[20px] border flex items-center gap-3 relative overflow-hidden group transition-all cursor-pointer ${
                  (stats as any).gestantesPendentes > 0
                    ? 'border-pink-100 dark:border-pink-950/30 bg-pink-50/10 hover:bg-pink-50/20'
                    : 'border-emerald-100 dark:border-emerald-950/20 bg-emerald-500/5 hover:bg-emerald-500/10'
                }`}
              >
                <div className={`absolute top-0 left-0 w-[4px] h-full ${(stats as any).gestantesPendentes > 0 ? 'bg-pink-500' : 'bg-emerald-500'}`} />
                <div className={`w-8.5 h-8.5 rounded-full flex items-center justify-center text-white shadow-sm shrink-0 ${(stats as any).gestantesPendentes > 0 ? 'bg-pink-500' : 'bg-emerald-500'}`}>
                  {(stats as any).gestantesPendentes > 0 ? <Baby className="w-4.5 h-4.5" /> : <Check className="w-4.5 h-4.5 stroke-[3]" />}
                </div>
                <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                  <div className="min-w-0">
                    <h5 className="text-[12px] font-black text-text-primary leading-tight truncate uppercase tracking-tight">
                      {(stats as any).gestantesPendentes > 0 ? `${(stats as any).gestantesPendentes} gestações pendentes` : 'Gestações em Dia'}
                    </h5>
                    <p className="text-[9px] text-text-muted font-bold mt-0.5 uppercase">Metas de Consultas (9) & ACS (3)</p>
                  </div>
                  <Badge variant={(stats as any).gestantesPendentes > 0 ? 'default' : 'success'} className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded shrink-0 ${(stats as any).gestantesPendentes > 0 ? 'bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300' : ''}`}>
                    {(stats as any).gestantesPendentes > 0 ? 'ATENÇÃO' : 'COMPLETO'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Row 2: Histórico e Análises (Últimos Visitados, Gráfico de Linha, Rosca Demográfica) */}
      <div className="grid grid-cols-12 gap-6 items-stretch">
        {/* Últimos Pacientes Visitados */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-bg-secondary rounded-[32px] p-4 border border-border shadow-sm flex flex-col min-h-[300px] h-full">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-text-primary uppercase tracking-tight">Últimos Visitados</h3>
                <p className="text-[10px] text-text-secondary font-medium">Histórico recente de campo</p>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {recentPatients.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <p className="text-xs text-text-muted">Nenhum paciente visitado recentemente.</p>
                </div>
              ) : (
                recentPatients.slice(0, 4).map((p, i) => {
                  const realVisitAt = getPatientLastVisitAt(p);
                  const isAtrazo = !(realVisitAt && new Date(realVisitAt) > thirtyDaysAgo);
                  return (
                    <div 
                      key={i} 
                      className="flex items-center justify-between p-2.5 rounded-2xl bg-bg-primary/40 dark:bg-slate-800/10 hover:bg-bg-primary dark:hover:bg-slate-800/30 border border-border/60 transition-colors cursor-pointer group" 
                      onClick={() => navigate(`/domicilio/${p.household_id || ''}`)}
                    >
                      <div className="min-w-0">
                        <p className="text-[12px] font-black text-text-primary truncate uppercase leading-none tracking-tight">{p.name}</p>
                        <p className="text-[9px] text-text-muted mt-1 font-bold truncate">
                          CNS {p.cns || 'S/ CNS'} {p.birth_date && ` • ${calculateAge(p.birth_date)} anos`}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                        <span className="text-[9px] font-bold text-text-secondary">{realVisitAt ? formatDate(realVisitAt) : '--'}</span>
                        <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wide border ${!isAtrazo ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30' : 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/30'}`}>
                          {!isAtrazo ? 'Em dia' : 'Atraso'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            

          </div>
        </div>

        {/* Últimos Cadastros */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-bg-secondary rounded-[32px] p-4 border border-border shadow-sm flex flex-col min-h-[300px] h-full">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div>
                <h3 className="text-sm font-black text-text-primary uppercase tracking-tight">Últimos Cadastros</h3>
                <p className="text-[10px] text-text-secondary font-medium">Cidadãos adicionados recentemente</p>
              </div>
              <div className="text-right">
                <p className="text-[16px] font-black text-emerald-600 dark:text-emerald-400 leading-none">+{stats.newCidadaos}</p>
                <p className="text-[8px] text-text-muted font-black uppercase tracking-wider mt-0.5">Este Mês</p>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {lastRegisteredPatients.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <p className="text-xs text-text-muted">Nenhum cidadão cadastrado recentemente.</p>
                </div>
              ) : (
                lastRegisteredPatients.map((p, i) => (
                  <div 
                    key={i} 
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-bg-primary/40 dark:bg-slate-800/10 hover:bg-bg-primary dark:hover:bg-slate-800/30 border border-border/60 transition-colors cursor-pointer group" 
                    onClick={() => navigate(`/domicilio/${p.household_id || ''}`)}
                  >
                    <div className="min-w-0">
                      <p className="text-[12px] font-black text-text-primary truncate uppercase leading-none tracking-tight">{p.name}</p>
                      <p className="text-[9px] text-text-muted mt-1 font-bold truncate">
                        CNS {p.cns || 'S/ CNS'} {p.birth_date && ` • ${calculateAge(p.birth_date)} anos`}
                      </p>
                    </div>
                    <div className="flex flex-col items-end shrink-0 ml-2">
                      <span className="text-[9px] font-bold text-text-secondary">{p.created_at ? formatDate(p.created_at) : '--'}</span>
                      <span className="text-[8px] text-teal-600 dark:text-teal-400 font-extrabold uppercase mt-0.5 tracking-wide">Novo</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Distribuição por Categoria (Donut) */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-bg-secondary rounded-[32px] p-4 border border-border shadow-sm flex flex-col min-h-[300px] h-full">
            <div className="shrink-0 mb-3 pb-1">
              <h3 className="text-sm font-black text-text-primary uppercase tracking-tight">Cidadãos por Categoria</h3>
              <p className="text-[10px] text-text-secondary font-medium">Perfil clínico da microárea</p>
            </div>
            {distribuicaoData.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <p className="text-xs text-text-muted">Sem dados cadastrados.</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-row items-center justify-between gap-3 min-h-0">
                <div className="relative w-[130px] h-[130px] shrink-0 flex items-center justify-center">
                  <PieChart width={130} height={130}>
                    <Pie
                      data={distribuicaoData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={56}
                      paddingAngle={2.5}
                      dataKey="value"
                    >
                      {distribuicaoData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.96)', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '14px',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}
                    />
                  </PieChart>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                    <span className="text-[18px] font-black text-text-primary leading-none">{stats.totalPatients}</span>
                    <span className="text-[8px] text-text-muted font-black uppercase tracking-wider mt-0.5">Total</span>
                  </div>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-x-2.5 gap-y-1.5 max-h-[230px] overflow-y-auto pr-1 custom-scrollbar">
                  {distribuicaoData.map((d, index) => {
                    const pct = stats.totalPatients > 0 ? ((d.value / stats.totalPatients) * 100).toFixed(0) : '0';
                    return (
                      <div key={index} className="flex flex-col gap-0.5 p-1.5 rounded-xl hover:bg-bg-primary/50 dark:hover:bg-slate-800/10 transition-colors min-w-0">
                        <div className="flex items-center justify-between text-[9px] font-bold">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                            <span className="text-text-secondary truncate uppercase leading-none">{d.name}</span>
                          </div>
                          <span className="text-text-primary font-black shrink-0 ml-1">{d.value}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="flex-1 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: d.color }} />
                          </div>
                          <span className="text-[8px] text-text-muted font-extrabold leading-none shrink-0">{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

