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
  Megaphone,
  Sparkles,
  UserPlus,
  ArrowUpRight,
  Home
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDate, calculateAge } from '../lib/dateUtils';
import { Badge } from './Badge';
import { PendingCalendar } from './PendingCalendar';
import { motion } from 'motion/react';
import {
  AreaChart, Area, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import { UI_CONFIG } from '../constants';

import { useDashboard } from '../hooks/useDashboard';
import { AppUser } from '../types';
import { isAdminRole, isGestorRole } from '../lib/roleUtils';

const AdminDashboard = React.lazy(() => import('./AdminDashboard').then(m => ({ default: m.AdminDashboard })));

export function Dashboard({ user }: { user: AppUser | null }) {
  const navigate = useNavigate();

  if (isAdminRole(user?.role) || isGestorRole(user?.role)) {
    return (
      <React.Suspense fallback={<div className="flex items-center justify-center p-12 text-slate-500">Carregando painel administrativo...</div>}>
        <AdminDashboard user={user} />
      </React.Suspense>
    );
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
    visits,
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

  const lastRegisteredPatients = React.useMemo(() => {
    const uniqueMap = new Map<string, any>();
    allPatients.forEach(p => {
      if (p.id) uniqueMap.set(p.id, p);
    });
    return Array.from(uniqueMap.values())
      .filter(p => p.created_at)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [allPatients]);

  const greeting = React.useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  const totalPriorityAlerts = (stats.childVisitAlerts || 0) + 
    (stats.pendingVisits || 0) + 
    (stats.lateVaccines || 0) + 
    (stats.receitasAVencer || 0) + 
    ((stats as any).gestantesPendentes || 0) +
    ((stats as any).semDomicilioAlerts || 0);

  if (loading) return null;

  return (
    <div className="space-y-6 relative pb-10">
      {/* 1. Hero Header Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-[32px] bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-800 p-6 md:p-8 text-white shadow-xl shadow-teal-900/10 border border-teal-500/30"
      >
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-48 h-48 bg-teal-300/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-teal-100 text-[11px] font-bold uppercase tracking-wider border border-white/20">
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                Painel do Agente Comunitário
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/20 text-teal-200 text-[10px] font-bold">
                <MapPin className="w-3 h-3 text-teal-300" />
                {user?.microarea ? `Microárea ${user.microarea}` : 'Microárea Geral'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              {greeting}, {user?.name || 'Agente'}! 👋
            </h1>

            <p className="text-xs sm:text-sm text-teal-100/90 font-medium leading-relaxed max-w-xl">
              Acompanhamento integrado da saúde da sua comunidade.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => navigate('/pacientes?action=new')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white text-teal-900 font-extrabold text-xs shadow-lg shadow-black/10 hover:bg-teal-50 active:scale-95 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-teal-700" />
              Novo Cidadão
            </button>
            <button
              onClick={() => navigate('/domicilios')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md text-white font-extrabold text-xs border border-white/20 active:scale-95 transition-all cursor-pointer"
            >
              <MapPin className="w-4 h-4 text-teal-200" />
              Buscar Domicílio
            </button>
          </div>
        </div>
      </motion.div>

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
      {visitRequests && visitRequests.filter(r => r.status === 'pending').length > 0 && (
        <div className="space-y-3">
          {visitRequests.filter(r => r.status === 'pending').map((req, i) => {
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
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${priorityColors[req.priority as 'low' | 'medium' | 'high' | 'urgent'] || priorityColors.medium}`}>
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
                  <button
                    onClick={() => {
                      const note = prompt('Relatório final / observações para o Gestor (opcional):');
                      handleUpdateVisitRequestStatus(req.id, 'done', note || '');
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-black shadow-md shadow-emerald-500/10 active:scale-98 transition-all"
                  >
                    ✓ Marcar Visita Concluída
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
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* 2. Categorias em Lista Compacta e Clicável */}
      <div className="bg-bg-secondary rounded-[24px] p-4 sm:p-5 border border-border shadow-sm">
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h3 className="text-sm font-extrabold text-text-primary tracking-tight">Categorias de Acompanhamento</h3>
            <p className="text-[11px] text-text-muted">Clique em qualquer categoria para listar e filtrar os pacientes instantaneamente</p>
          </div>
          <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 px-2.5 py-1 rounded-lg border border-teal-200 dark:border-teal-900/40 hidden sm:inline">
            Filtro Rápido
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {statCards.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => navigate(stat.id === 'domicilios' ? '/domicilios' : `/pacientes?filter=${stat.filter}`)}
                className="bg-bg-primary hover:bg-teal-50/40 dark:hover:bg-teal-950/20 rounded-2xl p-3 border border-border hover:border-teal-400/40 shadow-xs cursor-pointer group transition-all duration-200 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div 
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform" 
                    style={{ background: `linear-gradient(135deg, ${stat.config.primary}dd, ${stat.config.primary})`, color: '#fff' }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <ArrowUpRight className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                <div>
                  <h4 className="text-xl font-black text-text-primary leading-tight tabular-nums">{stat.value}</h4>
                  <p className="text-[10px] text-text-muted font-bold uppercase tracking-wide truncate mt-0.5">{stat.label}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* 3. Row 1: Planejamento e Acompanhamento (Calendário, Prioritários) */}
      <div className="grid grid-cols-12 gap-6 items-stretch">
        {/* Calendário de Visitas Realizadas */}
        <div className="col-span-12 lg:col-span-8 flex flex-col">
          <div className="bg-bg-secondary rounded-[32px] p-4 sm:p-5 border border-border shadow-sm flex flex-col h-full">
            <div className="flex-1 overflow-auto">
              <PendingCalendar visits={visits} patients={allPatients} />
            </div>
          </div>
        </div>

        {/* Acompanhamento Prioritário */}
        <div className="col-span-12 lg:col-span-4 flex flex-col">
          <div className="bg-bg-secondary rounded-[32px] p-5 border border-border shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white shadow-md shadow-red-500/25">
                  <ShieldAlert className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-text-primary tracking-tight">Acompanhamento Prioritário</h3>
                  <p className="text-[10px] text-text-muted font-semibold">Alertas clínicos ativos</p>
                </div>
              </div>
              {totalPriorityAlerts > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/40">
                  {totalPriorityAlerts}
                </span>
              )}
            </div>

            <div className="space-y-2.5 flex-1 overflow-y-auto pr-1 custom-scrollbar">
              {/* Alerta 1: Crianças / Bebês */}
              <div 
                onClick={() => navigate('/pacientes?filter=pending_6m')} 
                className={`p-3 rounded-[20px] border flex items-center gap-3 relative overflow-hidden group transition-all cursor-pointer ${
                  stats.childVisitAlerts > 0
                    ? 'border-red-100 dark:border-red-950/30 bg-red-50/10 hover:bg-red-50/20'
                    : 'border-emerald-100 dark:border-emerald-950/20 bg-emerald-500/5 hover:bg-emerald-500/10'
                }`}
              >
                <div className={`absolute top-0 left-0 w-[4px] h-full ${stats.childVisitAlerts > 0 ? 'bg-red-500' : 'bg-emerald-500'}`} />
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white shadow-sm shrink-0 ${stats.childVisitAlerts > 0 ? 'bg-red-500' : 'bg-emerald-500'}`}>
                  {stats.childVisitAlerts > 0 ? <Baby className="w-4.5 h-4.5" /> : <Check className="w-4.5 h-4.5 stroke-[3]" />}
                </div>
                <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                  <div className="min-w-0">
                    <h5 className="text-[12px] font-black text-text-primary leading-tight truncate uppercase tracking-tight">
                      {stats.childVisitAlerts > 0 ? `${stats.childVisitAlerts} visitas (bebês)` : 'Bebês c/ Visita'}
                    </h5>
                    <p className="text-[9px] text-text-muted font-bold mt-0.5 uppercase">Acompanhamento até 6m</p>
                  </div>
                  <Badge variant={stats.childVisitAlerts > 0 ? 'danger' : 'success'} className="text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-lg shrink-0">
                    {stats.childVisitAlerts > 0 ? 'PENDENTE' : 'EM DIA'}
                  </Badge>
                </div>
              </div>

              {/* Alerta 2: Visitas em Atraso */}
              <div 
                onClick={() => navigate('/pacientes?filter=visitas_atrasadas')} 
                className={`p-3 rounded-[20px] border flex items-center gap-3 relative overflow-hidden group transition-all cursor-pointer ${
                  stats.pendingVisits > 0
                    ? 'border-orange-100 dark:border-orange-950/30 bg-orange-50/10 hover:bg-orange-50/20'
                    : 'border-emerald-100 dark:border-emerald-950/20 bg-emerald-500/5 hover:bg-emerald-500/10'
                }`}
              >
                <div className={`absolute top-0 left-0 w-[4px] h-full ${stats.pendingVisits > 0 ? 'bg-orange-500' : 'bg-emerald-500'}`} />
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white shadow-sm shrink-0 ${stats.pendingVisits > 0 ? 'bg-orange-500' : 'bg-emerald-500'}`}>
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
                className={`p-3 rounded-[20px] border flex items-center gap-3 relative overflow-hidden group transition-all cursor-pointer ${
                  stats.lateVaccines > 0
                    ? 'border-red-100 dark:border-red-950/30 bg-red-50/10 hover:bg-red-50/20'
                    : 'border-emerald-100 dark:border-emerald-950/20 bg-emerald-500/5 hover:bg-emerald-500/10'
                }`}
              >
                <div className={`absolute top-0 left-0 w-[4px] h-full ${stats.lateVaccines > 0 ? 'bg-red-500' : 'bg-emerald-500'}`} />
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white shadow-sm shrink-0 ${stats.lateVaccines > 0 ? 'bg-red-500' : 'bg-emerald-500'}`}>
                  {stats.lateVaccines > 0 ? <ShieldAlert className="w-4.5 h-4.5" /> : <Check className="w-4.5 h-4.5 stroke-[3]" />}
                </div>
                <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                  <div className="min-w-0">
                    <h5 className="text-[12px] font-black text-text-primary leading-tight truncate uppercase tracking-tight">
                      {stats.lateVaccines > 0 ? `${stats.lateVaccines} vacinas atrasadas` : 'Vacinação de Crianças'}
                    </h5>
                    <p className="text-[9px] text-text-muted font-bold mt-0.5 uppercase">Crianças menores de 2 anos</p>
                  </div>
                  <Badge variant={stats.lateVaccines > 0 ? 'danger' : 'success'} className="text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-lg shrink-0">
                    {stats.lateVaccines > 0 ? 'ATRASO' : 'COMPLETO'}
                  </Badge>
                </div>
              </div>

              {/* Alerta 4: Receitas Vencendo */}
              <div 
                onClick={() => navigate('/pacientes?filter=receitas_vencendo')} 
                className={`p-3 rounded-[20px] border flex items-center gap-3 relative overflow-hidden group transition-all cursor-pointer ${
                  stats.receitasAVencer > 0
                    ? 'border-purple-100 dark:border-purple-950/30 bg-purple-50/10 hover:bg-purple-50/20'
                    : 'border-emerald-100 dark:border-emerald-950/20 bg-emerald-500/5 hover:bg-emerald-500/10'
                }`}
              >
                <div className={`absolute top-0 left-0 w-[4px] h-full ${stats.receitasAVencer > 0 ? 'bg-purple-500' : 'bg-emerald-500'}`} />
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white shadow-sm shrink-0 ${stats.receitasAVencer > 0 ? 'bg-purple-500' : 'bg-emerald-500'}`}>
                  {stats.receitasAVencer > 0 ? <Activity className="w-4.5 h-4.5" /> : <Check className="w-4.5 h-4.5 stroke-[3]" />}
                </div>
                <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                  <div className="min-w-0">
                    <h5 className="text-[12px] font-black text-text-primary leading-tight truncate uppercase tracking-tight">
                      {stats.receitasAVencer > 0 ? `${stats.receitasAVencer} receitas vencendo` : 'Receitas de Uso Contínuo'}
                    </h5>
                    <p className="text-[9px] text-text-muted font-bold mt-0.5 uppercase">Medicamentos controlados</p>
                  </div>
                  <Badge variant={stats.receitasAVencer > 0 ? 'default' : 'success'} className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-lg shrink-0 ${stats.receitasAVencer > 0 ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300' : ''}`}>
                    {stats.receitasAVencer > 0 ? 'ATENÇÃO' : 'VÁLIDAS'}
                  </Badge>
                </div>
              </div>

              {/* Alerta 5: Pré-Natal / Visitas Gestante Pendentes */}
              <div 
                onClick={() => navigate('/pacientes?filter=gestantes')} 
                className={`p-3 rounded-[20px] border flex items-center gap-3 relative overflow-hidden group transition-all cursor-pointer ${
                  (stats as any).gestantesPendentes > 0
                    ? 'border-pink-100 dark:border-pink-950/30 bg-pink-50/10 hover:bg-pink-50/20'
                    : 'border-emerald-100 dark:border-emerald-950/20 bg-emerald-500/5 hover:bg-emerald-500/10'
                }`}
              >
                <div className={`absolute top-0 left-0 w-[4px] h-full ${(stats as any).gestantesPendentes > 0 ? 'bg-pink-500' : 'bg-emerald-500'}`} />
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white shadow-sm shrink-0 ${(stats as any).gestantesPendentes > 0 ? 'bg-pink-500' : 'bg-emerald-500'}`}>
                  {(stats as any).gestantesPendentes > 0 ? <Baby className="w-4.5 h-4.5" /> : <Check className="w-4.5 h-4.5 stroke-[3]" />}
                </div>
                <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                  <div className="min-w-0">
                    <h5 className="text-[12px] font-black text-text-primary leading-tight truncate uppercase tracking-tight">
                      {(stats as any).gestantesPendentes > 0 ? `${(stats as any).gestantesPendentes} gestações pendentes` : 'Gestações em Dia'}
                    </h5>
                    <p className="text-[9px] text-text-muted font-bold mt-0.5 uppercase">Metas de Consultas (9) & ACS (3)</p>
                  </div>
                  <Badge variant={(stats as any).gestantesPendentes > 0 ? 'default' : 'success'} className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-lg shrink-0 ${(stats as any).gestantesPendentes > 0 ? 'bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300' : ''}`}>
                    {(stats as any).gestantesPendentes > 0 ? 'ATENÇÃO' : 'COMPLETO'}
                  </Badge>
                </div>
              </div>

              {/* Alerta 6: Pacientes Sem Domicílio Cadastrado */}
              <div 
                onClick={() => navigate('/pacientes?filter=sem_domicilio')} 
                className={`p-3 rounded-[20px] border flex items-center gap-3 relative overflow-hidden group transition-all cursor-pointer ${
                  ((stats as any).semDomicilioAlerts || 0) > 0
                    ? 'border-rose-100 dark:border-rose-950/30 bg-rose-50/10 hover:bg-rose-50/20'
                    : 'border-emerald-100 dark:border-emerald-950/20 bg-emerald-500/5 hover:bg-emerald-500/10'
                }`}
                title="Clique para filtrar cidadãos sem domicílio e vincular/criar endereço"
              >
                <div className={`absolute top-0 left-0 w-[4px] h-full ${((stats as any).semDomicilioAlerts || 0) > 0 ? 'bg-rose-600' : 'bg-emerald-500'}`} />
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white shadow-sm shrink-0 ${((stats as any).semDomicilioAlerts || 0) > 0 ? 'bg-rose-600' : 'bg-emerald-500'}`}>
                  {((stats as any).semDomicilioAlerts || 0) > 0 ? <Home className="w-4.5 h-4.5" /> : <Check className="w-4.5 h-4.5 stroke-[3]" />}
                </div>
                <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                  <div className="min-w-0">
                    <h5 className="text-[12px] font-black text-text-primary leading-tight truncate uppercase tracking-tight">
                      {((stats as any).semDomicilioAlerts || 0) > 0 
                        ? `${(stats as any).semDomicilioAlerts} sem domicílio` 
                        : 'Domicílios Vinculados'}
                    </h5>
                    <p className="text-[9px] text-text-muted font-bold mt-0.5 uppercase">Gerar / Vincular Endereço</p>
                  </div>
                  <Badge variant={((stats as any).semDomicilioAlerts || 0) > 0 ? 'danger' : 'success'} className="text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-lg shrink-0">
                    {((stats as any).semDomicilioAlerts || 0) > 0 ? 'CADASTRAR' : 'REGULAR'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Row 2: Histórico e Análises (Últimos Cadastros, Rosca Demográfica) */}
      <div className="grid grid-cols-12 gap-6 items-stretch">
        {/* Últimos Cadastros */}
        <div className="col-span-12 lg:col-span-6 flex flex-col">
          <div className="bg-bg-secondary rounded-[32px] p-5 border border-border shadow-sm flex flex-col h-full min-h-[320px]">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/25">
                  <Users className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-text-primary tracking-tight">Últimos Cadastros</h3>
                  <p className="text-[10px] text-text-muted font-semibold">Cidadãos adicionados recentemente</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[20px] font-black text-emerald-600 dark:text-emerald-400 leading-none">+{stats.newCidadaos}</p>
                <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Este Mês</p>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {lastRegisteredPatients.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <p className="text-xs text-text-muted">Nenhum cidadão cadastrado recentemente.</p>
                </div>
              ) : (
                lastRegisteredPatients.map((p, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-bg-primary/50 dark:bg-slate-800/20 hover:bg-bg-primary dark:hover:bg-slate-800/40 border border-border/50 transition-all duration-200 cursor-pointer group"
                    onClick={() => navigate(`/domicilio/${p.household_id || ''}`)}
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-xs shrink-0 shadow-sm bg-gradient-to-br from-teal-400 to-emerald-600">
                      {p.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-bold text-text-primary truncate leading-tight group-hover:text-teal-600 transition-colors">{p.name}</p>
                      <p className="text-[9px] text-text-muted mt-0.5 font-semibold truncate">
                        {p.birth_date ? calculateAge(p.birth_date) : 'Idade não informada'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[9px] font-semibold text-text-muted">{p.created_at ? formatDate(p.created_at) : '--'}</span>
                      <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wide bg-teal-100 text-teal-700 dark:bg-teal-950/30 dark:text-teal-400">✦ Novo</span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Distribuição por Categoria (Donut) */}
        <div className="col-span-12 lg:col-span-6 flex flex-col">
          <div className="bg-bg-secondary rounded-[32px] p-5 border border-border shadow-sm flex flex-col h-full min-h-[320px]">
            <div className="flex items-center gap-3 mb-4 shrink-0">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-violet-500/25">
                <Activity className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-text-primary tracking-tight">Perfil Clínico da Microárea</h3>
                <p className="text-[10px] text-text-muted font-semibold">Distribuição de comorbidades e faixas etárias</p>
              </div>
            </div>
            {distribuicaoData.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <p className="text-xs text-text-muted">Sem dados cadastrados.</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col sm:flex-row items-center justify-between gap-4 min-h-0">
                <div className="relative w-[140px] h-[140px] shrink-0 flex items-center justify-center">
                  <PieChart width={140} height={140}>
                    <Pie
                      data={distribuicaoData}
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={60}
                      paddingAngle={3}
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
                    <span className="text-[20px] font-black text-text-primary leading-none">{stats.totalPatients}</span>
                    <span className="text-[8px] text-text-muted font-black uppercase tracking-wider mt-0.5">Total</span>
                  </div>
                </div>
                <div className="flex-1 w-full grid grid-cols-2 gap-x-3 gap-y-2 max-h-[240px] overflow-y-auto pr-1 custom-scrollbar">
                  {distribuicaoData.map((d, index) => {
                    const pct = stats.totalPatients > 0 ? ((d.value / stats.totalPatients) * 100).toFixed(0) : '0';
                    return (
                      <div key={index} className="flex flex-col gap-1 p-2 rounded-xl bg-bg-primary/30 dark:bg-slate-800/10 hover:bg-bg-primary/60 transition-colors min-w-0">
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                            <span className="text-text-secondary truncate uppercase leading-none text-[9px] font-black">{d.name}</span>
                          </div>
                          <span className="text-text-primary font-black shrink-0 ml-1">{d.value}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: d.color }} />
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
