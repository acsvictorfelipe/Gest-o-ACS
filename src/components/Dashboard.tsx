import * as React from 'react';
import { supabase } from '../lib/supabase';
import {
  Baby,
  Calendar as CalendarIcon,
  Bed,
  MapPin,
  ShieldAlert,
  Heart,
  Users,
  Megaphone,
  UserPlus,
  Home,
  UserCheck,
  HeartPulse,
  Droplet,
  Brain,
  Pill,
  Syringe,
  Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDate, calculateAge } from '../lib/dateUtils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PendingCalendar } from './PendingCalendar';
import { motion } from 'motion/react';
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
      .slice(0, 8);
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

  const categories = React.useMemo(() => [
    { id: 'gestantes', label: 'Gestantes', count: stats.gestantes, filter: 'gestantes', icon: Heart, color: 'text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/60' },
    { id: 'criancas', label: 'Crianças ≤ 2 anos', count: stats.criancas2y, filter: 'criancas', icon: Baby, color: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60' },
    { id: 'hipertensos', label: 'Hipertensos', count: stats.hipertensos, filter: 'hipertensos', icon: HeartPulse, color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60' },
    { id: 'diabeticos', label: 'Diabéticos', count: stats.diabeticos, filter: 'diabeticos', icon: Droplet, color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60' },
    { id: 'idosos', label: 'Idosos (60+)', count: stats.idosos, filter: 'idosos', icon: Users, color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60' },
    { id: 'acamados', label: 'Acamados / Domiciliados', count: stats.acamados, filter: 'acamados', icon: Bed, color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60' },
    { id: 'saudemental', label: 'Saúde Mental', count: stats.saudeMental || 0, filter: 'saudemental', icon: Brain, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60' },
    { id: 'sem_domicilio', label: 'Sem Domicílio Cadastrado', count: (stats as any).semDomicilioAlerts || 0, filter: 'sem_domicilio', icon: Home, color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/60' },
    { id: 'domicilios', label: 'Domicílios', count: stats.totalHouseholds, filter: 'households', icon: Home, color: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/60' },
    { id: 'cidadaos', label: 'Cidadãos (Total)', count: stats.totalPatients, filter: 'all', icon: Users, color: 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800' },
  ], [stats]);

  if (loading) return null;

  return (
    <div className="flex flex-col h-full gap-3 pb-2">
      {/* COMPACT SUBHEADER BAR */}
      <div className="shrink-0 bg-white/60 dark:bg-slate-900/40 border-b border-border/60 px-3 lg:px-4 py-2 flex flex-wrap items-center justify-between gap-2 rounded-2xl">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-base sm:text-lg font-bold tracking-tight text-text-primary">
              Painel do Agente
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 border border-teal-200/70 dark:border-teal-800/60">
              {user?.microarea ? `Microárea ${user.microarea}` : 'Microárea Geral'}
            </span>
          </div>
          <span className="hidden xl:inline text-border">|</span>
          <p className="hidden md:block text-xs text-text-muted">
            {greeting}, <strong className="font-semibold text-text-primary">{user?.name || 'Agente'}</strong>! Acompanhamento integrado da comunidade.
          </p>
        </div>

        {/* Inline KPI Pills + Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="hidden xl:flex items-center gap-1.5 mr-2 text-[11px]">
            <span className="px-2.5 py-1 rounded-lg bg-bg-secondary border border-border font-medium text-text-secondary">
              <strong className="text-text-primary font-bold">{stats.totalPatients}</strong> Cidadãos
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-bg-secondary border border-border font-medium text-text-secondary">
              <strong className="text-text-primary font-bold">{stats.totalHouseholds}</strong> Domicílios
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/50 font-medium text-rose-700 dark:text-rose-300">
              <strong className="font-bold">{totalPriorityAlerts}</strong> Alertas
            </span>
          </div>

          <button
            onClick={() => navigate('/pacientes?action=new')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 shadow-sm transition-all cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Novo Cidadão
          </button>
          <button
            onClick={() => navigate('/domicilios')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-primary bg-bg-secondary border border-border hover:bg-bg-primary shadow-xs transition-all cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            Buscar Domicílio
          </button>
        </div>
      </div>

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

      {/* MAIN ZERO-SCROLL COCKPIT VIEWPORT (4 EQUAL COLUMNS) */}
      <div className="flex-1 min-h-[500px] lg:min-h-0 lg:h-[calc(100vh-175px)] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3.5 overflow-y-auto lg:overflow-hidden">

        {/* COLUMN 1 (3 Cols): CATEGORIAS DA COMUNIDADE */}
        <section className="lg:col-span-3 h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-soft flex flex-col min-h-0 overflow-hidden">
          <div className="shrink-0 px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                <Users className="w-3.5 h-3.5" />
              </div>
              <div className="truncate">
                <h2 className="font-display font-bold text-xs uppercase tracking-wide text-slate-800 dark:text-white truncate">Categorias da Comunidade</h2>
                <p className="text-[10px] text-slate-400 truncate">Clique para filtrar pacientes</p>
              </div>
            </div>
            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/50">
              Filtro
            </span>
          </div>

          <div className="flex-1 min-h-0 p-2 flex flex-col gap-0.5 divide-y divide-slate-100/80 dark:divide-slate-800/60 overflow-y-auto custom-scrollbar">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => navigate(cat.id === 'domicilios' ? '/domicilios' : `/pacientes?filter=${cat.filter}`)}
                  className="w-full group py-1.5 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors flex items-center justify-between gap-2 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-6 h-6 rounded-md ${cat.color} flex items-center justify-center shrink-0`}>
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-200 group-hover:text-teal-600 dark:group-hover:text-teal-400 truncate">
                      {cat.label}
                    </span>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 rounded-md text-xs font-display font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* COLUMN 2 (3 Cols): ACOMPANHAMENTO PRIORITÁRIO */}
        <section className="lg:col-span-3 h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-soft flex flex-col min-h-0 overflow-hidden">
          <div className="shrink-0 px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-3.5 h-3.5" />
              </div>
              <div className="truncate">
                <h2 className="font-display font-bold text-xs uppercase tracking-wide text-slate-800 dark:text-white truncate">Acompanhamento Prioritário</h2>
                <p className="text-[10px] text-slate-400 truncate">Alertas clínicos ativos</p>
              </div>
            </div>
            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/50">
              {totalPriorityAlerts} alertas
            </span>
          </div>

          <div className="flex-1 min-h-0 p-2 flex flex-col gap-1.5 overflow-y-auto custom-scrollbar">
            {/* 1. Sem Domicílio Cadastrado */}
            <button
              onClick={() => navigate('/pacientes?filter=sem_domicilio')}
              className="w-full group text-left px-2.5 py-2 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-800 border-l-[3px] border-l-rose-500 transition-all flex items-center justify-between gap-2 cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <Home className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="font-display font-bold text-xs text-slate-900 dark:text-white truncate leading-tight">
                    {((stats as any).semDomicilioAlerts || 0)} Sem Domicílio
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5 leading-tight">
                    Gerar / vincular endereço residencial
                  </p>
                </div>
              </div>
              <span className="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold border bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-300 border-rose-200/70 dark:border-rose-800/60">
                Cadastrar
              </span>
            </button>

            {/* 2. Visitas em Atraso */}
            <button
              onClick={() => navigate('/pacientes?filter=visitas_atrasadas')}
              className="w-full group text-left px-2.5 py-2 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-800 border-l-[3px] border-l-amber-500 transition-all flex items-center justify-between gap-2 cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="font-display font-bold text-xs text-slate-900 dark:text-white truncate leading-tight">
                    {stats.pendingVisits || 0} Visitas em Atraso
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5 leading-tight">
                    Rotina mensal de campo pendente
                  </p>
                </div>
              </div>
              <span className="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold border bg-amber-500 text-white border-amber-500">
                {stats.pendingVisits || 0}
              </span>
            </button>

            {/* 3. Vacinas Atrasadas */}
            <button
              onClick={() => navigate('/pacientes?filter=vacinas_atrasadas')}
              className="w-full group text-left px-2.5 py-2 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-800 border-l-[3px] border-l-orange-500 transition-all flex items-center justify-between gap-2 cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-orange-50 dark:bg-orange-950/70 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                  <Syringe className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="font-display font-bold text-xs text-slate-900 dark:text-white truncate leading-tight">
                    {stats.lateVaccines || 0} Vacinas Atrasadas
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5 leading-tight">
                    Crianças menores de 2 anos
                  </p>
                </div>
              </div>
              <span className="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold border bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-300 border-orange-200/70 dark:border-orange-800/60">
                Atraso
              </span>
            </button>

            {/* 4. Receitas Vencendo */}
            <button
              onClick={() => navigate('/pacientes?filter=receitas_vencendo')}
              className="w-full group text-left px-2.5 py-2 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-800 border-l-[3px] border-l-violet-500 transition-all flex items-center justify-between gap-2 cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-violet-50 dark:bg-violet-950/70 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                  <Pill className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="font-display font-bold text-xs text-slate-900 dark:text-white truncate leading-tight">
                    {stats.receitasAVencer || 0} Receitas Vencendo
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5 leading-tight">
                    Medicamentos controlados
                  </p>
                </div>
              </div>
              <span className="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold border bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-300 border-violet-200/70 dark:border-violet-800/60">
                Atenção
              </span>
            </button>

            {/* 5. Gestações Pendentes */}
            <button
              onClick={() => navigate('/pacientes?filter=gestantes')}
              className="w-full group text-left px-2.5 py-2 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-800 border-l-[3px] border-l-pink-500 transition-all flex items-center justify-between gap-2 cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-pink-50 dark:bg-pink-950/70 text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0">
                  <Baby className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="font-display font-bold text-xs text-slate-900 dark:text-white truncate leading-tight">
                    {((stats as any).gestantesPendentes || 0)} Gestações Pendentes
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5 leading-tight">
                    Metas consultas (9) & ACS (3)
                  </p>
                </div>
              </div>
              <span className="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold border bg-pink-50 dark:bg-pink-950 text-pink-600 dark:text-pink-300 border-pink-200/70 dark:border-pink-800/60">
                Atenção
              </span>
            </button>

            {/* 6. Bebês até 6m */}
            <button
              onClick={() => navigate('/pacientes?filter=pending_6m')}
              className="w-full group text-left px-2.5 py-2 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-800 border-l-[3px] border-l-sky-500 transition-all flex items-center justify-between gap-2 cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                  <Baby className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="font-display font-bold text-xs text-slate-900 dark:text-white truncate leading-tight">
                    {stats.childVisitAlerts || 0} Visitas (Bebês)
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5 leading-tight">
                    Acompanhamento até 6 meses
                  </p>
                </div>
              </div>
              <span className="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold border bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-300 border-sky-200/70 dark:border-sky-800/60">
                Pendente
              </span>
            </button>
          </div>

          <div className="shrink-0 px-3.5 py-2 bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 dark:text-slate-400 truncate">Foco: <strong className="text-slate-700 dark:text-slate-200">Busca Ativa</strong></span>
            <button
              onClick={() => navigate('/pacientes?filter=sem_domicilio')}
              className="font-semibold text-teal-600 dark:text-teal-400 hover:underline shrink-0 cursor-pointer"
            >
              Ver Alertas →
            </button>
          </div>
        </section>

        {/* COLUMN 3 (3 Cols): ÚLTIMOS CADASTROS */}
        <section className="lg:col-span-3 h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-soft flex flex-col min-h-0 overflow-hidden">
          <div className="shrink-0 px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <UserCheck className="w-3.5 h-3.5" />
              </div>
              <div className="truncate">
                <h2 className="font-display font-bold text-xs uppercase tracking-wide text-slate-800 dark:text-white truncate">Últimos Cadastros</h2>
                <p className="text-[10px] text-slate-400 truncate">Cidadãos adicionados recentemente</p>
              </div>
            </div>
            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50">
              +{stats.newCidadaos} mês
            </span>
          </div>

          <div className="flex-1 min-h-0 p-2 flex flex-col gap-0.5 divide-y divide-slate-100 dark:divide-slate-800/70 overflow-y-auto custom-scrollbar">
            {lastRegisteredPatients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center p-4">
                <p className="text-xs text-text-muted">Nenhum cidadão cadastrado recentemente.</p>
              </div>
            ) : (
              lastRegisteredPatients.map((p, i) => (
                <div
                  key={i}
                  onClick={() => navigate(p.household_id ? `/domicilio/${p.household_id}` : '/pacientes')}
                  className="py-1.5 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center justify-between gap-2 cursor-pointer group"
                >
                  <div className="min-w-0 flex-1 pr-1">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 truncate leading-tight">
                      {p.name}
                    </p>
                    <p className="text-[10px] text-slate-400 leading-tight mt-0.5 truncate">
                      {p.birth_date ? calculateAge(p.birth_date) : 'Idade N/I'} • {p.created_at ? formatDate(p.created_at) : '--'}
                    </p>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50">
                    Novo
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="shrink-0 px-3.5 py-2 bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 dark:text-slate-400 capitalize">{format(new Date(), 'MMMM yyyy', { locale: ptBR })}</span>
            <button
              onClick={() => navigate('/pacientes')}
              className="font-semibold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
            >
              Ver todos ({stats.totalPatients}) →
            </button>
          </div>
        </section>

        {/* COLUMN 4 (3 Cols on Far Right): VISITAS REALIZADAS */}
        <section className="lg:col-span-3 h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-soft flex flex-col min-h-0 overflow-hidden">
          <PendingCalendar visits={visits} patients={allPatients} />
        </section>

      </div>
    </div>
  );
}
