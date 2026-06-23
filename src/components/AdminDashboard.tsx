import * as React from 'react';
import { supabase } from '../lib/supabase';
import {
  Users,
  MapPin,
  Calendar,
  ShieldCheck,
  Search,
  Activity,
  History,
  TrendingUp,
  UserCheck,
  ChevronRight,
  Filter,
  RefreshCw,
  Clock,
  ArrowUpRight,
  Sparkles,
  Database,
  Heart,
  Baby,
  Smile,
  Droplet,
  Bed,
  Home
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { formatDate, getAgeInMonths, calculateAge, getAgeNumber } from '../lib/dateUtils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { visitRequestService } from '../lib/visitRequests';
import { Bell, Send, ClipboardCheck, Mail } from 'lucide-react';

export function AdminDashboard({ user }: { user: any }) {
  const navigate = useNavigate();
  
  const [loading, setLoading] = React.useState(true);
  const [profiles, setProfiles] = React.useState<any[]>([]);
  const [patients, setPatients] = React.useState<any[]>([]);
  const [households, setHouseholds] = React.useState<any[]>([]);
  const [visits, setVisits] = React.useState<any[]>([]);
  const [systemLogs, setSystemLogs] = React.useState<any[]>([]);
  
  // Visit Request States
  const [visitRequests, setVisitRequests] = React.useState<any[]>([]);
  const [showNewRequestForm, setShowNewRequestForm] = React.useState(false);
  const [newRequestAgent, setNewRequestAgent] = React.useState('');
  const [newRequestPatient, setNewRequestPatient] = React.useState('');
  const [patientSearch, setPatientSearch] = React.useState('');
  const [showPatientDropdown, setShowPatientDropdown] = React.useState(false);
  const [newRequestPriority, setNewRequestPriority] = React.useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [newRequestReason, setNewRequestReason] = React.useState('');
  const [submittingRequest, setSubmittingRequest] = React.useState(false);

  // Search and Filter states
  const [agentSearch, setAgentSearch] = React.useState('');
  const [logSearch, setLogSearch] = React.useState('');
  const [selectedAgentFilter, setSelectedAgentFilter] = React.useState<string | null>(null);
  const [logTypeFilter, setLogTypeFilter] = React.useState<string>('all');
  
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  const [selectedIndicator, setSelectedIndicator] = React.useState<string>('gestantes');
  const [indicatorSearch, setIndicatorSearch] = React.useState('');

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // 1. Fetch profiles
      const { data: profs, error: profsErr } = await supabase
        .from('profiles')
        .select('*')
        .order('name');
      if (profsErr) throw profsErr;
      
      let loadedProfiles = profs || [];
      if (user?.role === 'Gestor') {
        loadedProfiles = loadedProfiles.filter(u => u.color === user.color || u.id === user.id);
      }
      setProfiles(loadedProfiles);

      // Helper function to paginate tables safely
      const fetchAllTableData = async (tableName: string) => {
        let allRows: any[] = [];
        let from = 0;
        let to = 999;
        let hasMore = true;
        
        while (hasMore) {
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .range(from, to);
          
          if (error) throw error;
          if (data && data.length > 0) {
            allRows = [...allRows, ...data];
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
        return allRows;
      };

      // 2. Fetch Patients, Households, and Visits
      const [allPats, allHouses, allVis] = await Promise.all([
        fetchAllTableData('patients'),
        fetchAllTableData('households'),
        fetchAllTableData('visits')
      ]);

      let filteredPats = allPats;
      let filteredHouses = allHouses;
      let filteredVis = allVis;

      if (user?.role === 'Gestor') {
        filteredPats = allPats.filter(p => p.area_color === user.color);
        filteredHouses = allHouses.filter(h => h.area_color === user.color);
        filteredVis = allVis.filter(v => v.area_color === user.color);
      }

      setPatients(filteredPats);
      setHouseholds(filteredHouses);
      setVisits(filteredVis);

      // 3. Fetch system logs
      try {
        const { data: logs, error: logsErr } = await supabase
          .from('system_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(150);
        if (!logsErr && logs) {
          let loadedLogs = logs;
          if (user?.role === 'Gestor') {
            const teamIds = new Set(loadedProfiles.map(u => u.id));
            loadedLogs = loadedLogs.filter(log => teamIds.has(log.user_id));
          }
          setSystemLogs(loadedLogs);
        }
      } catch (e) {
        console.warn("system_logs query failed, falling back to empty timeline.", e);
      }

      // 4. Fetch visit requests
      try {
        const reqs = await visitRequestService.fetchAll();
        let filteredReqs = reqs;
        if (user?.role === 'Gestor') {
          const teamIds = new Set(loadedProfiles.map(u => u.id));
          filteredReqs = reqs.filter(r => teamIds.has(r.agent_id) || r.request_by === user.id);
        }
        setVisitRequests(filteredReqs);
      } catch (reqsErr) {
        console.warn("Failed fetching visit requests:", reqsErr);
      }

    } catch (err) {
      console.error("Error loading administration data:", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchAdminData();
  }, [refreshTrigger]);

  const handleCreateVisitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequestAgent || !newRequestPatient || !newRequestReason.trim()) {
      alert('Por favor, preencha todos os campos.');
      return;
    }

    setSubmittingRequest(true);
    try {
      const selectedPatient = patients.find(p => p.id === newRequestPatient);
      const requestPayload = {
        agent_id: newRequestAgent,
        patient_id: newRequestPatient,
        patient_name: selectedPatient ? selectedPatient.name : 'Paciente',
        patient_address: selectedPatient ? selectedPatient.address : '',
        patient_cns: selectedPatient ? selectedPatient.cns : '',
        request_by: user.id,
        sender_name: user.name || user.email || 'Supervisor',
        priority: newRequestPriority,
        reason: newRequestReason.trim()
      };

      await visitRequestService.create(requestPayload);
      
      // Log event
      try {
        await supabase.from('system_logs').insert({
          user_id: user.id,
          action: 'solicitacao_visita_criada',
          details: `Solicitação de visita criada de ${user.name || user.email} para agente_id ${newRequestAgent} do paciente ${selectedPatient ? selectedPatient.name : ''}`,
          created_at: new Date().toISOString()
        });
      } catch (logErr) {
        console.warn("Log creation failed: ", logErr);
      }

      // Reset form
      setNewRequestAgent('');
      setNewRequestPatient('');
      setPatientSearch('');
      setNewRequestPriority('medium');
      setNewRequestReason('');
      setShowNewRequestForm(false);
      
      // Refresh
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error creating visit request:', error);
      alert('Erro ao criar solicitação de visita.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleCancelVisitRequest = async (requestId: string) => {
    if (!confirm('Deseja realmente cancelar esta solicitação de visita?')) return;
    try {
      await visitRequestService.updateStatus(requestId, 'dismissed');
      setRefreshTrigger(prev => prev + 1);
    } catch (e) {
      console.error('Error cancelling visit request:', e);
    }
  };

  // Profile lookup mapping
  const userMap = React.useMemo(() => {
    const map: Record<string, any> = {};
    profiles.forEach(p => {
      map[p.id] = p;
    });
    return map;
  }, [profiles]);

  // Compiled activity logs from actual database events
  // This merges system_logs with newly created Patients, Households, and Visits
  // ensuring the client always sees real-time, high-fidelity system audit updates!
  const compiledLogs = React.useMemo(() => {
    const list: any[] = [];

    // Add actual system_logs table rows
    systemLogs.forEach(log => {
      const actor = userMap[log.user_id] || { name: 'Sistema / Sync', role: 'Robô' };
      list.push({
        id: log.id || `sys-${log.created_at}-${Math.random()}`,
        timestamp: new Date(log.created_at),
        agentName: actor.name,
        agentId: log.user_id,
        role: actor.role,
        microarea: actor.microarea || '',
        color: actor.color || '#64748b',
        type: 'auth',
        action: log.action || 'Ação no Sistema',
        description: log.details || 'Interação autenticada identificada.',
      });
    });

    // Add actual visits as logs
    visits.forEach(v => {
      const actor = userMap[v.agent_id] || { name: 'Agente Desconhecido', role: 'Agente', microarea: v.microarea, color: v.area_color };
      const patient = patients.find(p => p.id === v.patient_id);
      list.push({
        id: `vis-${v.id}`,
        timestamp: new Date(v.created_at || v.date),
        agentName: actor.name,
        agentId: v.agent_id,
        role: actor.role || 'Agente',
        microarea: v.microarea || actor.microarea || '',
        color: v.area_color || actor.color || '#0d9488',
        type: 'visit',
        action: 'Visita Registrada',
        description: `ACS registrou visita de tipo "${v.type}" para o paciente "${patient?.name || 'Cidadão Registrado'}" ${v.summary ? `- Obs: ${v.summary}` : ''}`,
      });
    });

    // Add patient registrations to logs
    patients.forEach(p => {
      const actor = userMap[p.agent_id] || { name: 'Agente Desconhecido', role: 'Agente', microarea: p.microarea, color: p.area_color };
      list.push({
        id: `pat-${p.id}`,
        timestamp: new Date(p.created_at),
        agentName: actor.name,
        agentId: p.agent_id,
        role: actor.role || 'Agente',
        microarea: p.microarea || actor.microarea || '',
        color: p.area_color || actor.color || '#0d9488',
        type: 'cadastro_paciente',
        action: 'Cadastro de Cidadão',
        description: `Cadastrou o cidadão "${p.name}" com CNS ${p.cns || 'não informado'} na microárea ${p.microarea}`,
      });
    });

    // Add household registrations to logs
    households.forEach(h => {
      const actor = userMap[h.agent_id] || { name: 'Agente Desconhecido', role: 'Agente', microarea: h.microarea, color: h.area_color };
      list.push({
        id: `hse-${h.id}`,
        timestamp: new Date(h.created_at),
        agentName: actor.name,
        agentId: h.agent_id,
        role: actor.role || 'Agente',
        microarea: h.microarea || actor.microarea || '',
        color: h.area_color || actor.color || '#6366f1',
        type: 'cadastro_domicilio',
        action: 'Cadastro de Domicílio',
        description: `Cadastrou novo domicílio na rua "${h.address}, Nº ${h.number}" correspondente a ${h.responsible_name || 'Sem Responsável'}`,
      });
    });

    // Sort all combined logs by date descending
    return list.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [systemLogs, visits, patients, households, userMap]);

  // Compile individual stats per Agent Profile
  const agentsData = React.useMemo(() => {
    return profiles.map(profile => {
      const agentPatients = patients.filter(p => p.agent_id === profile.id);
      const agentHouseholds = households.filter(h => h.agent_id === profile.id);
      const agentVisits = visits.filter(v => v.agent_id === profile.id);
      
      // Get last active date
      const dates = [
        ...agentVisits.map(v => new Date(v.created_at || v.date).getTime()),
        ...agentPatients.map(p => new Date(p.created_at).getTime()),
        ...agentHouseholds.map(h => new Date(h.created_at).getTime())
      ];
      const lastActiveTime = dates.length > 0 ? Math.max(...dates) : null;

      return {
        ...profile,
        totalPatients: agentPatients.length,
        totalHouseholds: agentHouseholds.length,
        totalVisits: agentVisits.length,
        lastActive: lastActiveTime ? new Date(lastActiveTime) : null
      };
    });
  }, [profiles, patients, households, visits]);

  // Filters profiles based on agentSearch query
  const filteredAgents = React.useMemo(() => {
    return agentsData.filter(a => {
      const term = agentSearch.toLowerCase();
      return (
        (a.name || '').toLowerCase().includes(term) ||
        (a.email || '').toLowerCase().includes(term) ||
        (a.microarea || '').toLowerCase().includes(term) ||
        (a.role || '').toLowerCase().includes(term)
      );
    });
  }, [agentsData, agentSearch]);

  // Filters combined system logs
  const filteredLogs = React.useMemo(() => {
    return compiledLogs.filter(log => {
      // 1. Search text filter
      if (logSearch) {
        const term = logSearch.toLowerCase();
        const matchesText = (
          (log.agentName || '').toLowerCase().includes(term) ||
          (log.action || '').toLowerCase().includes(term) ||
          (log.description || '').toLowerCase().includes(term)
        );
        if (!matchesText) return false;
      }
      
      // 2. Selected Agent click filter
      if (selectedAgentFilter && log.agentId !== selectedAgentFilter) {
        return false;
      }

      // 3. Log Type filter
      if (logTypeFilter !== 'all') {
        if (logTypeFilter === 'visits' && log.type !== 'visit') return false;
        if (logTypeFilter === 'cadastros' && !['cadastro_paciente', 'cadastro_domicilio'].includes(log.type)) return false;
        if (logTypeFilter === 'auth' && log.type !== 'auth') return false;
      }

      return true;
    }).slice(0, 100); // limit to 100 entries for smooth rendering
  }, [compiledLogs, logSearch, selectedAgentFilter, logTypeFilter]);

  const isPatientSemDomicilio = React.useCallback((p: any) => {
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
  }, []);

  const indicatorsConfig = React.useMemo(() => [
    {
      id: 'gestantes',
      label: 'Gestantes',
      icon: Heart,
      color: '#ec4899',
      bgClass: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
      activeBgClass: 'bg-pink-600 dark:bg-pink-500 text-white border-pink-600',
      filterFn: (p: any) => p.categories?.includes('Gestante')
    },
    {
      id: 'criancas',
      label: 'Crianças (< 2 anos)',
      icon: Baby,
      color: '#3b82f6',
      bgClass: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      activeBgClass: 'bg-blue-600 dark:bg-blue-500 text-white border-blue-600',
      filterFn: (p: any) => p.categories?.includes('Criança') && (p.birth_date ? getAgeInMonths(p.birth_date) <= 24 : false)
    },
    {
      id: 'idosos',
      label: 'Idosos',
      icon: Smile,
      color: '#a855f7',
      bgClass: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      activeBgClass: 'bg-purple-600 dark:bg-purple-500 text-white border-purple-600',
      filterFn: (p: any) => p.categories?.includes('Idoso') || p.categories?.includes('Idosos')
    },
    {
      id: 'hipertensos',
      label: 'Hipertensos',
      icon: Activity,
      color: '#ef4444',
      bgClass: 'bg-red-500/10 text-red-500 border-red-500/20',
      activeBgClass: 'bg-red-600 dark:bg-red-500 text-white border-red-600',
      filterFn: (p: any) => p.categories?.includes('Hipertenso') || p.clinical_data?.chronic?.hipertensao === 'Sim'
    },
    {
      id: 'diabeticos',
      label: 'Diabéticos',
      icon: Droplet,
      color: '#f59e0b',
      bgClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      activeBgClass: 'bg-amber-600 dark:bg-amber-500 text-white border-amber-600',
      filterFn: (p: any) => p.categories?.includes('Diabetico') || p.categories?.includes('Diabético') || p.clinical_data?.chronic?.diabetes === 'Sim'
    },
    {
      id: 'acamados',
      label: 'Acamados',
      icon: Bed,
      color: '#06b6d4',
      bgClass: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
      activeBgClass: 'bg-cyan-600 dark:bg-cyan-500 text-white border-cyan-600',
      filterFn: (p: any) => p.categories?.includes('AcamadoDomiciliado')
    },
    {
      id: 'sem_domicilio',
      label: 'Sem Domicílio',
      icon: Home,
      color: '#64748b',
      bgClass: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
      activeBgClass: 'bg-slate-600 dark:bg-slate-500 text-white border-slate-600',
      filterFn: isPatientSemDomicilio
    }
  ], [isPatientSemDomicilio]);

  const microareaStats = React.useMemo(() => {
    const statsMap: Record<string, { count: number; microarea: string; agentName: string; agentColor: string }> = {};
    
    // Initialize for all active Agents of role === 'Agente'
    profiles.forEach(agent => {
      if (agent.role === 'Agente') {
        const key = `${agent.microarea || 'Sem Área'}-${agent.id}`;
        statsMap[key] = {
          count: 0,
          microarea: agent.microarea || 'Sem Área',
          agentName: agent.name,
          agentColor: agent.color || '#64748b'
        };
      }
    });

    const indicatorObj = indicatorsConfig.find(ind => ind.id === selectedIndicator);
    if (!indicatorObj) return [];
    
    const indicatorPatients = patients.filter(indicatorObj.filterFn);

    indicatorPatients.forEach(p => {
      // Find the patient's actual agent
      const pAgent = profiles.find(a => a.id === p.agent_id);
      
      const ma = p.microarea || pAgent?.microarea || 'Sem Área';
      const key = pAgent ? `${ma}-${pAgent.id}` : `${ma}-unknown`;

      if (!statsMap[key]) {
        statsMap[key] = {
          count: 0,
          microarea: ma,
          agentName: pAgent ? pAgent.name : 'Agente não designado',
          agentColor: pAgent?.color || '#cbd5e1'
        };
      }
      statsMap[key].count += 1;
    });

    return Object.entries(statsMap)
      .map(([key, data]) => ({
        key,
        microarea: data.microarea,
        count: data.count,
        agentName: data.agentName,
        agentColor: data.agentColor
      }))
      .filter(item => item.count > 0)
      .sort((a, b) => {
        const numA = parseInt(a.microarea.replace(/\D/g, ''), 10);
        const numB = parseInt(b.microarea.replace(/\D/g, ''), 10);
        if (!isNaN(numA) && !isNaN(numB)) {
          if (numA !== numB) return numA - numB;
        } else {
          const comp = a.microarea.localeCompare(b.microarea);
          if (comp !== 0) return comp;
        }
        return a.agentName.localeCompare(b.agentName);
      });
  }, [selectedIndicator, patients, profiles, indicatorsConfig]);

  const filteredIndicatorPatients = React.useMemo(() => {
    const indicatorObj = indicatorsConfig.find(ind => ind.id === selectedIndicator);
    if (!indicatorObj) return [];
    
    const list = patients.filter(indicatorObj.filterFn);
    if (!indicatorSearch) return list;
    
    const term = indicatorSearch.toLowerCase();
    return list.filter(p => 
      (p.name || '').toLowerCase().includes(term) ||
      (p.cns || '').toLowerCase().includes(term) ||
      (p.microarea || '').toLowerCase().includes(term)
    );
  }, [selectedIndicator, patients, indicatorSearch, indicatorsConfig]);

  // Calculate high level metrics
  const totalVisitsCount = visits.length;
  const activeAgentsCount = profiles.filter(p => p.role === 'Agente').length;
  const totalGestoresCount = profiles.filter(p => ['Gestor', 'Administrador', 'admin'].includes(p.role)).length;

  // Chart source data: visits per agent
  const chartVisitsPerAgent = React.useMemo(() => {
    return agentsData
      .filter(a => a.role === 'Agente')
      .map(a => ({
        name: a.name.split(' ')[0],
        'Visitas': a.totalVisits,
        'Cidadãos': a.totalPatients,
      }))
      .slice(0, 8);
  }, [agentsData]);

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
        <p className="text-sm font-semibold text-text-secondary uppercase tracking-wider animate-pulse">Carregando dados da Administração...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 relative pb-10">
      
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 dark:from-slate-950 dark:via-slate-900 dark:to-black rounded-[36px] p-8 text-white border border-slate-800/80 shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-500/20 text-teal-300 rounded-full text-[10px] font-black uppercase tracking-wider border border-teal-500/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              Portal do Administrador
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Supervisão do Sistema ACS</h1>
            <p className="text-slate-300 text-sm max-w-xl font-medium leading-relaxed">
              Monitore a cobertura de visitas, analise o desempenho diário dos agentes de saúde, gerencie áreas geográficas e acompanhe a auditoria de atividades em tempo real.
            </p>
          </div>
          
          <div className="flex gap-3 shrink-0">
            <button
              onClick={() => setRefreshTrigger(p => p + 1)}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800/50 hover:bg-slate-800 text-slate-200 border border-slate-700/60 rounded-2xl text-[12px] font-bold active:scale-98 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Sincronizar
            </button>
            <button
              onClick={() => navigate('/usuarios')}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-teal-500 hover:bg-teal-600 text-slate-950 rounded-2xl text-[12px] font-black shadow-lg shadow-teal-500/20 active:scale-98 transition-all"
            >
              <UserCheck className="w-4 h-4" />
              Gerenciar Equipe
            </button>
          </div>
        </div>
      </div>

      {/* Admin Highlight stats bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "Agentes Ativos",
            value: activeAgentsCount,
            subtech: `${totalGestoresCount} Gestores / Admins`,
            icon: Users,
            color: "border-emerald-500/20 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5"
          },
          {
            title: "Cidadãos Assistidos",
            value: patients.length,
            subtech: `Total na rede municipal`,
            icon: UserCheck,
            color: "border-sky-500/20 text-sky-600 dark:text-sky-400 bg-sky-500/5"
          },
          {
            title: "Domicílios Cadastrados",
            value: households.length,
            subtech: `Mapeados geograficamente`,
            icon: MapPin,
            color: "border-indigo-500/20 text-indigo-600 dark:text-indigo-400 bg-indigo-500/5"
          },
          {
            title: "Visitas no Sistema",
            value: totalVisitsCount,
            subtech: `${compiledLogs.filter(l => l.type === 'visit').length} este período`,
            icon: Calendar,
            color: "border-purple-500/20 text-purple-600 dark:text-purple-400 bg-purple-500/5"
          },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`p-6 rounded-[28px] bg-bg-secondary border shadow-sm flex items-center justify-between transition-all hover:shadow-md ${item.color.split(' ')[0]}`}
          >
            <div className="space-y-1">
              <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">{item.title}</span>
              <h4 className="text-[28px] font-black text-text-primary leading-none">{item.value}</h4>
              <p className="text-[11px] text-text-secondary font-semibold">{item.subtech}</p>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${item.color.split(' ')[2]}`}>
              <item.icon className="w-6 h-6" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Coordinated Visit Requests Section */}
      <div className="bg-bg-secondary rounded-[32px] p-6 border border-border shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-text-primary uppercase tracking-tight">Solicitações de Visita Coordenadas</h3>
              <p className="text-xs text-text-muted font-medium">Delegue e coordene visitas de rotina ou prioritárias diretamente para os Agentes (ACS)</p>
            </div>
          </div>

          <button
            onClick={() => {
              setShowNewRequestForm(!showNewRequestForm);
              if (!showNewRequestForm && profiles.filter(p => p.role === 'Agente').length > 0) {
                setNewRequestAgent(profiles.filter(p => p.role === 'Agente')[0].id);
              }
              if (!showNewRequestForm) {
                setNewRequestPatient('');
                setPatientSearch('');
              }
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[12px] font-bold shadow-md transition-all active:scale-98 ${
              showNewRequestForm 
                ? 'bg-slate-800 dark:bg-slate-700 text-white hover:bg-slate-900 border border-slate-700' 
                : 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/10'
            }`}
          >
            {showNewRequestForm ? 'Fechar Formulário' : '+ Criar Solicitação'}
          </button>
        </div>

        {showNewRequestForm && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl bg-bg-primary/45 border border-border/85"
          >
            <form onSubmit={handleCreateVisitRequest} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Agent Select */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-text-muted mb-1.5">Atribuir ao Agente (ACS)</label>
                  <select
                    value={newRequestAgent}
                    onChange={(e) => setNewRequestAgent(e.target.value)}
                    className="w-full bg-bg-secondary border border-border rounded-xl px-3.5 py-2.5 text-xs font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                  >
                    {profiles.filter(p => p.role === 'Agente').length === 0 ? (
                      <option value="">Nenhum agente disponível</option>
                    ) : (
                      profiles
                        .filter(p => p.role === 'Agente')
                        .map(p => (
                          <option key={p.id} value={p.id}>{p.name} (Micro {p.microarea || 'S/N'})</option>
                        ))
                    )}
                  </select>
                </div>

                {/* Patient Select */}
                <div className="relative">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-text-muted mb-1.5">Paciente Destino</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Pesquise pelo nome ou CNS..."
                      value={patientSearch}
                      onChange={(e) => {
                        setPatientSearch(e.target.value);
                        setShowPatientDropdown(true);
                        // If clearing, clear the target patient id
                        if (!e.target.value) {
                          setNewRequestPatient('');
                        }
                      }}
                      onFocus={() => setShowPatientDropdown(true)}
                      className="w-full bg-bg-secondary border border-border rounded-xl pl-3.5 pr-10 py-2.5 text-xs font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-teal-500/30 placeholder:text-text-muted/50"
                    />
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                      {newRequestPatient ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-500" title="Paciente selecionado" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" title="Selecione um paciente" />
                      )}
                      <Search className="w-3.5 h-3.5 text-text-muted/60" />
                    </div>
                  </div>

                  {/* Dropdown Menu */}
                  {showPatientDropdown && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setShowPatientDropdown(false)} 
                      />
                      <div className="absolute z-20 w-full mt-1.5 bg-bg-secondary border border-border rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-border/30">
                        {(() => {
                          const query = patientSearch.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                          const filtered = patients.filter(p => {
                            const nameNorm = p.name ? p.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : '';
                            const cnsNorm = p.cns ? p.cns.toLowerCase() : '';
                            return nameNorm.includes(query) || cnsNorm.includes(query);
                          });

                          if (filtered.length === 0) {
                            return (
                              <div className="px-4 py-3 text-xs text-text-muted text-center font-semibold">
                                Nenhum paciente encontrado
                              </div>
                            );
                          }

                          return filtered.map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setNewRequestPatient(p.id);
                                setPatientSearch(p.name);
                                setShowPatientDropdown(false);
                              }}
                              className={`w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-bg-primary/50 transition-colors flex flex-col gap-0.5 ${
                                newRequestPatient === p.id ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400' : 'text-text-primary'
                              }`}
                            >
                              <span className="font-extrabold">{p.name}</span>
                              <span className="text-[10px] text-text-muted font-medium">
                                CNS: {p.cns || 'S/N'} • Microárea: {p.microarea || 'S/N'}
                              </span>
                            </button>
                          ));
                        })()}
                      </div>
                    </>
                  )}
                </div>

                {/* Priority Select */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-text-muted mb-1.5">Prioridade</label>
                  <select
                    value={newRequestPriority}
                    onChange={(e) => setNewRequestPriority(e.target.value as any)}
                    className="w-full bg-bg-secondary border border-border rounded-xl px-3.5 py-2.5 text-xs font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente / Alerta Clínico</option>
                  </select>
                </div>
              </div>

              {/* Reason Description */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-text-muted mb-1.5">Motivo / Instruções de Campo</label>
                <textarea
                  value={newRequestReason}
                  onChange={(e) => setNewRequestReason(e.target.value)}
                  placeholder="Descreva detalhadamente o motivo da visita, ex: Gestante perdeu duas consultas de pré-natal seguidas; Realizar busca ativa e atualizar situação da vacinação infantil."
                  rows={3}
                  className="w-full bg-bg-secondary border border-border rounded-xl px-3.5 py-2.5 text-xs font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-teal-500/30 resize-none placeholder:text-text-muted/50"
                  required
                />
              </div>

              <div className="flex justify-end gap-3.5 pt-1.5 border-t border-border/30">
                <button
                  type="button"
                  onClick={() => setShowNewRequestForm(false)}
                  className="px-4 py-2 bg-transparent text-text-secondary hover:bg-bg-secondary/60 rounded-xl text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingRequest}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-teal-600/10 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {submittingRequest ? 'Enviando...' : 'Enviar Solicitação'}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {visitRequests.length === 0 ? (
            <div className="col-span-1 lg:col-span-2 py-8 text-center text-text-muted font-medium text-xs bg-bg-primary/25 border border-border/40 rounded-2xl flex flex-col items-center justify-center gap-2">
              <Mail className="w-5 h-5 text-text-muted/40" />
              Nenhuma solicitação de visita pendente ou coordenada registrada.
            </div>
          ) : (
            visitRequests.map((req) => {
              const responder = userMap[req.agent_id];
              const priorityColors = {
                low: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
                medium: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
                high: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
                urgent: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 animate-pulse'
              };
              const statusColors = {
                pending: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
                accepted: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
                done: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
                dismissed: 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20'
              };
              const statusLabels = {
                pending: 'Pendente',
                accepted: 'Em Progresso',
                done: 'Concluído',
                dismissed: 'Dispensada / Cancelada'
              };

              return (
                <div 
                  key={req.id} 
                  className="p-4 rounded-2xl border border-border/70 bg-bg-primary/30 flex flex-col justify-between space-y-3 hover:bg-bg-primary/60 transition-all group"
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <div>
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${priorityColors[req.priority] || priorityColors.medium}`}>
                        {req.priority === 'low' ? 'Baixa' : req.priority === 'medium' ? 'Média' : req.priority === 'high' ? 'Alta' : 'URGENTE'}
                      </span>
                      <h4 className="text-xs font-black uppercase text-text-primary tracking-tight mt-2 flex items-center gap-1.5">
                        {req.patient_name}
                      </h4>
                      {req.patient_address && (
                        <p className="text-[10px] text-text-muted font-bold uppercase mt-0.5 truncate max-w-[280px]" title={req.patient_address}>
                          {req.patient_address}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${statusColors[req.status] || statusColors.pending}`}>
                        {statusLabels[req.status] || req.status}
                      </span>
                      <span className="text-[9px] text-text-muted font-semibold">
                        {formatDate(req.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="bg-bg-secondary/40 border border-border/40 p-2.5 rounded-xl">
                    <p className="text-[11px] text-text-secondary leading-relaxed font-semibold">
                      {req.reason}
                    </p>
                    {req.notes && (
                      <div className="mt-2 pt-2 border-t border-border/20">
                        <p className="text-[10px] text-text-muted italic">
                          <strong className="text-text-secondary font-black uppercase text-[9px] non-italic tracking-wide block mb-0.5">Retorno do Agente:</strong>
                          "{req.notes}"
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-bold text-text-muted pt-2 border-t border-border/30">
                    <span className="flex items-center gap-1.5">
                      Agente: <strong className="text-text-primary uppercase">{responder?.name || 'Carregando...'}</strong>
                    </span>
                    {req.status === 'pending' && (
                      <button
                        onClick={() => handleCancelVisitRequest(req.id)}
                        className="text-[9px] text-red-500 hover:text-red-600 font-extrabold uppercase tracking-wider transition-colors"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Dynamic ACS Quick Monitoring & Dashboard Tracker */}
      <div className="bg-bg-secondary rounded-[32px] p-6 border border-border shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-text-primary uppercase tracking-tight">Atividade & Acesso Rápido dos ACS</h3>
              <p className="text-xs text-text-muted font-medium">Agentes de Saúde ativos com registros e contribuições de pacientes e domicílios no sistema</p>
            </div>
          </div>
          <span className="text-[10px] bg-teal-500/10 text-teal-600 dark:text-teal-400 px-3 py-1 rounded-full font-black uppercase tracking-wider border border-teal-500/20">
            Acompanhamento em Tempo Real
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {agentsData
            .filter(a => a.role === 'Agente' && (a.totalPatients > 0 || a.totalHouseholds > 0 || a.totalVisits > 0))
            .map((agent) => {
              const isSelected = selectedAgentFilter === agent.id;
              return (
                <div 
                  key={agent.id}
                  className={`p-4 rounded-2xl border transition-all relative flex flex-col justify-between space-y-3 bg-bg-primary/40 hover:bg-bg-primary/80 ${
                    isSelected ? 'ring-2 ring-teal-500 border-teal-500/40 bg-teal-500/5' : 'border-border/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div 
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white font-extrabold text-[13px] shadow-inner shrink-0"
                        style={{ backgroundColor: agent.color || '#64748b' }}
                      >
                        {agent.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-extrabold text-text-primary uppercase tracking-tight truncate" title={agent.name}>
                          {agent.name}
                        </h4>
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-text-muted mt-0.5 uppercase">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: agent.color || '#64748b' }} />
                          Micro {agent.microarea || 'S/N'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedAgentFilter(isSelected ? null : agent.id)}
                      className={`px-2 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider transition-all hover:scale-102 flex items-center gap-1 shrink-0 ${
                        isSelected 
                          ? 'bg-teal-600 border-teal-600 text-white shadow-sm'
                          : 'bg-bg-secondary text-text-secondary border-border hover:border-teal-500/40'
                      }`}
                    >
                      <Filter className="w-2.5 h-2.5" />
                      {isSelected ? 'Filtrado' : 'Logs'}
                    </button>
                  </div>

                  {/* Quick counts */}
                  <div className="grid grid-cols-2 gap-2 bg-bg-primary/65 dark:bg-slate-900/40 p-2.5 rounded-xl border border-border/40">
                    <div className="text-center">
                      <p className="text-[9px] text-text-muted font-black uppercase tracking-tight">Domicílios</p>
                      <p className="text-sm font-black text-text-primary mt-0.5">{agent.totalHouseholds}</p>
                    </div>
                    <div className="text-center border-l border-border/40">
                      <p className="text-[9px] text-text-muted font-black uppercase tracking-tight">Pacientes</p>
                      <p className="text-sm font-black text-text-primary mt-0.5">{agent.totalPatients}</p>
                    </div>
                  </div>

                  {/* Visitas & Última ação status */}
                  <div className="flex items-center justify-between text-[10px] font-extrabold text-text-muted pt-1.5 border-t border-border/20">
                    <span>Visitas: <strong className="text-teal-600 dark:text-teal-400 font-extrabold">{agent.totalVisits}</strong></span>
                    {agent.lastActive ? (
                      <span className="flex items-center gap-1 text-[9px] text-text-muted uppercase">
                        <Clock className="w-2.5 h-2.5 text-teal-600" />
                        {formatDate(agent.lastActive.toISOString()).split(' às ')[0]}
                      </span>
                    ) : (
                      <span className="text-[9px] text-text-muted/40 italic uppercase">Inativo</span>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Seção de Abas de Indicadores e Cobertura */}
      <div className="bg-bg-secondary rounded-[32px] p-6 border border-border shadow-sm space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-text-primary uppercase tracking-tight">Indicadores de Saúde Ativos</h3>
              <p className="text-xs text-text-muted font-medium">Selecione um indicador para visualizar a quantidade de cidadãos assistidos por área/microárea</p>
            </div>
          </div>
        </div>

        {/* Indicator Selection Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {indicatorsConfig.map(indicator => {
            const IconComponent = indicator.icon;
            const isSelected = selectedIndicator === indicator.id;
            const totalCount = patients.filter(indicator.filterFn).length;
            
            return (
              <button
                key={indicator.id}
                onClick={() => {
                  setSelectedIndicator(indicator.id);
                  setIndicatorSearch('');
                }}
                className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between h-32 active:scale-98 cursor-pointer ${
                  isSelected
                    ? indicator.activeBgClass + ' shadow-md scale-102 font-black ring-1 ring-teal-500/40'
                    : 'bg-bg-primary hover:bg-bg-primary/80 text-text-secondary border-border/80'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className={`p-2 rounded-xl ${isSelected ? 'bg-white/20 text-white' : indicator.bgClass.split(' ')[0] + ' ' + indicator.bgClass.split(' ')[1]}`}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-text-muted'
                  }`}>
                    Ativos
                  </span>
                </div>
                
                <div className="mt-2 space-y-1">
                  <span className={`text-2xl font-black block leading-none ${isSelected ? 'text-white' : 'text-text-primary'}`}>
                    {totalCount}
                  </span>
                  <span className={`text-[10.5px] font-extrabold uppercase tracking-tight block truncate ${isSelected ? 'text-white/90' : 'text-text-muted'}`}>
                    {indicator.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Indicator Breakdown Panel */}
        <div className="grid grid-cols-12 gap-6 pt-6 border-t border-border/60">
          
          {/* Microarea distribution (por área) */}
          <div className="col-span-12 lg:col-span-5 space-y-3">
            <div>
              <h4 className="text-xs font-black text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-teal-600" />
                Casos por Microárea (Área)
              </h4>
              <p className="text-[10px] text-text-muted font-medium">Distribuição geográfica do indicador selecionado</p>
            </div>

            <div className="bg-bg-primary/40 border border-border/55 rounded-2xl p-4 divide-y divide-border/30 max-h-[300px] overflow-y-auto custom-scrollbar">
              {microareaStats.map(stat => (
                <div key={stat.key} className="py-2.5 flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0"
                      style={{ backgroundColor: stat.agentColor }}
                    />
                    <div>
                      <p className="font-extrabold text-text-primary uppercase tracking-tight">
                        Microárea {stat.microarea}
                      </p>
                      <p className="text-[9px] text-text-muted font-semibold">
                        ACS: {stat.agentName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-text-secondary pr-1">
                      {patients.filter(indicatorsConfig.find(ind => ind.id === selectedIndicator)?.filterFn || (() => false)).length > 0
                        ? `${Math.round((stat.count / patients.filter(indicatorsConfig.find(ind => ind.id === selectedIndicator)?.filterFn || (() => false)).length) * 100)}%`
                        : '0%'
                      }
                    </span>
                    <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-text-primary border border-border/60 rounded-xl font-black">
                      {stat.count}
                    </span>
                  </div>
                </div>
              ))}
              {microareaStats.length === 0 && (
                <p className="text-center py-6 text-xs font-medium text-text-muted italic">Nenhuma microárea com casos ativos.</p>
              )}
            </div>
          </div>

          {/* Patient Details list details with direct search */}
          <div className="col-span-12 lg:col-span-7 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-black text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  Relação de Cidadãos ({filteredIndicatorPatients.length})
                </h4>
                <p className="text-[10px] text-text-muted font-medium">Identificação dos casos ativos neste indicador</p>
              </div>

              {/* Search bar specifically for tracking patients within this indicator */}
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                <input
                  type="text"
                  placeholder="Pesquisar nesta listagem..."
                  value={indicatorSearch}
                  onChange={(e) => setIndicatorSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-bg-primary border border-border rounded-xl text-[11px] font-semibold focus:outline-none focus:border-teal-500 transition-colors"
                />
              </div>
            </div>

            <div className="border border-border/60 rounded-2xl overflow-hidden bg-bg-primary/20 max-h-[300px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-bg-primary/60 border-b border-border/40 text-[9px] font-bold text-text-muted uppercase tracking-wider">
                    <th className="py-2.5 px-3">Nome do Cidadão</th>
                    <th className="py-2.5 px-3">CNS</th>
                    <th className="py-2.5 px-3 text-center">Idade</th>
                    <th className="py-2.5 px-3">Microárea</th>
                    <th className="py-2.5 px-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20 font-medium text-text-secondary">
                  {filteredIndicatorPatients.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-text-muted italic">
                        Nenhum cidadão correspondente aos termos de pesquisa.
                      </td>
                    </tr>
                  ) : (
                    filteredIndicatorPatients.map(p => {
                      const age = p.birth_date ? calculateAge(p.birth_date) : '--';
                      return (
                        <tr key={p.id} className="hover:bg-bg-primary/40 transition-colors">
                          <td className="py-3 px-3 uppercase tracking-tight font-extrabold text-xs text-text-primary">
                            {p.name}
                          </td>
                          <td className="py-3 px-3 font-mono text-[10px]">
                            {p.cns || 'NÃO INFORMADO'}
                          </td>
                          <td className="py-3 px-3 text-center font-bold">
                            {age}
                          </td>
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center gap-1.5 font-bold uppercase text-[10px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                              M-{p.microarea || 'S/A'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => navigate(`/pacientes?search=${encodeURIComponent(p.name)}`)}
                              className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-border/80 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors hover:text-teal-600 hover:border-teal-500/20 shadow-sm"
                            >
                              Ver Detalhes
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

      {/* Main Grid: Agents List & Coverage Chart */}
      <div className="grid grid-cols-12 gap-8">
        
        {/* Left Side: Interactive Agents List, and search filters */}
        <div className="col-span-12 xl:col-span-8 space-y-6">
          <div className="bg-bg-secondary rounded-[32px] p-6 border border-border shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-text-primary uppercase tracking-tight">Agentes de Campo & Microáreas</h3>
                <p className="text-xs text-text-muted font-medium">Lista de colaboradores e volumes de cobertura atuais</p>
              </div>
              
              {/* Search Bar */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  placeholder="Buscar agente ou microárea..."
                  value={agentSearch}
                  onChange={(e) => setAgentSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-bg-primary border border-border rounded-xl text-xs font-semibold focus:outline-none focus:border-teal-500 transition-colors placeholder:text-text-muted/60"
                />
              </div>
            </div>

            {/* Table / List representation */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/60 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                    <th className="py-4 px-3">Profissional</th>
                    <th className="py-4 px-3">Região / Área</th>
                    <th className="py-4 px-3 text-center">Domicílios</th>
                    <th className="py-4 px-3 text-center">Cidadãos</th>
                    <th className="py-4 px-3 text-center">Atendimentos</th>
                    <th className="py-4 px-3">Última Ação</th>
                    <th className="py-4 px-3 text-right">Auditar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-[13px] font-medium text-text-secondary">
                  {filteredAgents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-text-muted font-medium text-xs">
                        Nenhum agente encontrado correspondente aos filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredAgents.map((agent) => {
                      const isSelected = selectedAgentFilter === agent.id;
                      return (
                        <tr
                          key={agent.id}
                          className={`hover:bg-bg-primary/50 transition-colors ${
                            isSelected ? 'bg-teal-50/20 dark:bg-teal-950/20' : ''
                          }`}
                        >
                          {/* Col 1: Name & Role */}
                          <td className="py-4 px-3">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-inner"
                                style={{ backgroundColor: agent.color || '#64748b' }}
                              >
                                {agent.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-extrabold text-text-primary uppercase tracking-tight text-xs truncate">
                                  {agent.name}
                                </p>
                                <p className="text-[10px] text-text-muted truncate lowercase font-semibold mt-0.5">
                                  {agent.email}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Col 2: Microarea & Color Badge */}
                          <td className="py-4 px-3">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/20"
                                style={{ backgroundColor: agent.color || '#64748b' }}
                              />
                              <span className="text-[11px] font-black uppercase tracking-wider text-text-primary">
                                {agent.role === 'Agente' ? `Microárea ${agent.microarea || 'S/N'}` : agent.role}
                              </span>
                            </div>
                          </td>

                          {/* Col 3: Households Count */}
                          <td className="py-4 px-3 text-center font-bold text-text-primary text-xs">
                            {agent.role === 'Agente' ? agent.totalHouseholds : '--'}
                          </td>

                          {/* Col 4: Patients Count */}
                          <td className="py-4 px-3 text-center font-bold text-text-primary text-xs">
                            {agent.role === 'Agente' ? agent.totalPatients : '--'}
                          </td>

                          {/* Col 5: Visits Count */}
                          <td className="py-4 px-3 text-center">
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-text-primary border border-border/80">
                              {agent.role === 'Agente' ? agent.totalVisits : '--'}
                            </span>
                          </td>

                          {/* Col 6: Last Active */}
                          <td className="py-4 px-3 text-xs font-semibold text-text-muted">
                            {agent.lastActive ? (
                              <div className="flex items-center gap-1.5 uppercase text-[10px]">
                                <Clock className="w-3 h-3 text-teal-600" />
                                {formatDate(agent.lastActive.toISOString())}
                              </div>
                            ) : (
                              <span className="text-text-muted/45 italic uppercase text-[9px]">Inativo</span>
                            )}
                          </td>

                          {/* Col 7: Search filter by agent */}
                          <td className="py-4 px-3 text-right">
                            <button
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedAgentFilter(null);
                                } else {
                                  setSelectedAgentFilter(agent.id);
                                }
                              }}
                              className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all inline-flex items-center gap-1 hover:scale-102 ${
                                isSelected
                                  ? 'bg-teal-600 border-teal-600 text-white shadow-sm'
                                  : 'bg-bg-primary text-text-secondary border-border hover:border-teal-500/40 hover:text-teal-600'
                              }`}
                            >
                              <Filter className="w-3 h-3" />
                              {isSelected ? 'Filtro Ativo' : 'Ver Logs'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Visual chart bento block */}
          {chartVisitsPerAgent.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-bg-secondary rounded-[32px] p-6 border border-border shadow-sm space-y-4"
            >
              <div>
                <h3 className="text-sm font-black text-text-primary uppercase tracking-tight">Resumo de Atividade por Agente</h3>
                <p className="text-[11px] text-text-secondary font-medium">Relação entre visitas completadas e cidadãos cadastrados por equipe</p>
              </div>
              <div className="h-[230px] w-full text-[11px] font-semibold">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartVisitsPerAgent} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                    <RechartsTooltip contentStyle={{ borderRadius: '12px', fontSize: '11px', border: '1px solid #e2e8f0' }} />
                    <Bar dataKey="Visitas" fill="#0d9488" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Cidadãos" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

        </div>

        {/* Right Side: High Fidelity Audit Log Viewer */}
        <div className="col-span-12 xl:col-span-4 space-y-6">
          <div className="bg-bg-secondary rounded-[32px] p-6 border border-border shadow-sm flex flex-col h-full min-h-[600px]">
            
            {/* Header */}
            <div className="space-y-4 border-b border-border pb-4 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <History className="w-4 h-4 animate-spin-slow" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-text-primary uppercase tracking-tight">Log de Auditoria</h3>
                    <p className="text-[10px] text-text-secondary font-medium">Ações recentes registradas em tempo real</p>
                  </div>
                </div>
                {selectedAgentFilter && (
                  <button
                    onClick={() => setSelectedAgentFilter(null)}
                    className="text-[9px] font-black uppercase text-red-500 bg-red-100 hover:bg-red-200 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/30 px-2 py-1 rounded"
                  >
                    Limpar Filtro
                  </button>
                )}
              </div>

              {/* Log Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                <input
                  type="text"
                  placeholder="Pesquisar ação, paciente, agente..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-bg-primary border border-border rounded-xl text-xs font-semibold focus:outline-none focus:border-teal-500 transition-colors placeholder:text-text-muted/60"
                />
              </div>

              {/* Log Quick filter tabs */}
              <div className="flex flex-wrap gap-1.5 text-[9px] font-black uppercase tracking-wider">
                {[
                  { id: 'all', label: 'Tudo' },
                  { id: 'visits', label: 'Visitas' },
                  { id: 'cadastros', label: 'Cadastros' },
                  { id: 'auth', label: 'Acesso' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setLogTypeFilter(tab.id)}
                    className={`px-2.5 py-1 rounded-lg border transition-all ${
                      logTypeFilter === tab.id
                        ? 'bg-slate-800 border-slate-800 text-white dark:bg-slate-700 dark:border-slate-700'
                        : 'bg-bg-primary text-text-muted border-border hover:border-slate-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Timeline */}
            <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-4 custom-scrollbar max-h-[500px]">
              {filteredLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-2">
                  <Database className="w-10 h-10 text-text-muted/30" />
                  <p className="text-xs font-bold text-text-muted uppercase">Nenhuma atividade logada</p>
                  <p className="text-[10px] text-text-secondary max-w-[200px]">Altere os termos da busca ou limpe o filtro do agente selecionado.</p>
                </div>
              ) : (
                filteredLogs.map((log: any, i) => {
                  const isVisit = log.type === 'visit';
                  const isCadastro = ['cadastro_paciente', 'cadastro_domicilio'].includes(log.type);
                  
                  return (
                    <div key={log.id} className="relative pl-6 pb-2 border-l border-slate-100 dark:border-slate-800/80 group">
                      
                      {/* Timeline Dot Indicator */}
                      <span
                        className={`absolute -left-1.5 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-bg-secondary flex items-center justify-center shadow-sm ${
                          isVisit
                            ? 'bg-[#0d9488]'
                            : isCadastro
                              ? 'bg-[#6366f1]'
                              : 'bg-amber-500'
                        }`}
                      />

                      {/* Log Body */}
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5">
                            <span 
                              className="w-1.5 h-1.5 rounded-full" 
                              style={{ backgroundColor: log.color }} 
                            />
                            <span className="text-[11px] font-black text-text-primary uppercase tracking-tight">
                              {log.agentName}
                            </span>
                            <span className="text-[8px] font-extrabold bg-slate-100 dark:bg-slate-800 text-text-secondary px-1.5 py-0.5 rounded uppercase">
                              Micro {log.microarea || '00'}
                            </span>
                          </div>
                          <span className="text-[9px] text-text-muted font-bold whitespace-nowrap">
                            {log.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Title of action */}
                        <p className="text-[11px] font-extrabold uppercase text-slate-700 dark:text-slate-300 tracking-wide">
                          {log.action}
                        </p>

                        {/* Detailed Description */}
                        <p className="text-[11px] text-text-secondary leading-normal font-medium bg-bg-primary/40 p-2 border border-border/40 rounded-xl">
                          {log.description}
                        </p>

                        <div className="text-[9px] font-bold text-text-muted pt-0.5">
                          {log.timestamp.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
