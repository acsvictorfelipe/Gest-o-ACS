import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { logActivity } from '../lib/auditLogger';
import { 
  UserPlus, 
  Trash2, 
  Mail, 
  Lock, 
  User, 
  Shield, 
  Palette, 
  MapPin,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Pencil,
  X as CloseIcon,
  Activity,
  Users,
  ShieldCheck,
  Megaphone,
  History,
  TrendingUp,
  Award,
  ChevronRight,
  Plus,
  Check,
  Baby,
  Heart,
  Search,
  ArrowRight,
  Calendar
} from 'lucide-react';
import { getAgeInMonths, formatDate, calculateAge, getPatientLastVisitAt } from '../lib/dateUtils';
import { motion, AnimatePresence } from 'motion/react';

// Helper to determine indicator success color and tag
const getIndicatorStatus = (percentage: number, target: number) => {
  if (percentage >= target) return { label: 'Meta Atingida', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20', fill: '#10b981' };
  if (percentage >= target - 15) return { label: 'Próximo da Meta', color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20', fill: '#f59e0b' };
  return { label: 'Abaixo da Meta', color: 'text-red-500 dark:text-red-400 bg-red-500/10 border-red-500/20', fill: '#ef4444' };
};

export function UserManagement({ currentUser }: { currentUser: any }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('equipe');
  const [users, setUsers] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [households, setHouseholds] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Tab 3: Create User Form
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Agente',
    color: currentUser?.role === 'Gestor' ? currentUser.color : '#0d9488',
    microarea: ''
  });
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    role: '',
    microarea: '',
    color: ''
  });

  // Tab 4: Transfer Form
  const [fromAgentId, setFromAgentId] = useState('');
  const [toAgentId, setToAgentId] = useState('');
  const [transferType, setTransferType] = useState<'all' | 'microarea' | 'selected'>('all');
  const [selectedMicroarea, setSelectedMicroarea] = useState('');
  const [selectedHouseholds, setSelectedHouseholds] = useState<string[]>([]);
  const [transferring, setTransferring] = useState(false);
  const [householdSearch, setHouseholdSearch] = useState('');

  // Tab 5: Campaign Form
  const [campaignForm, setCampaignForm] = useState({
    title: '',
    content: '',
    target: 'Todos'
  });
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);

  // Tab 6: Audit Log Search
  const [logSearch, setLogSearch] = useState('');

  // Reroute non-admin/non-gestor users
  useEffect(() => {
    if (currentUser && currentUser.role !== 'Administrador' && currentUser.role !== 'Gestor') {
      navigate('/');
    }
  }, [currentUser, navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Helper function to fetch all rows paginated in chunks of 1000
      const fetchAllFromTable = async (
        tableName: string,
        orderCol?: string,
        ascending = false,
        areaColorFilter?: string
      ) => {
        let allData: any[] = [];
        let from = 0;
        let to = 999;
        let hasMore = true;
        while (hasMore) {
          let query = supabase.from(tableName).select('*').range(from, to);
          if (areaColorFilter) {
            query = query.eq('area_color', areaColorFilter);
          }
          if (orderCol) {
            query = query.order(orderCol, { ascending });
          }
          const { data, error } = await query;
          if (error) throw error;
          if (data && data.length > 0) {
            allData = [...allData, ...data];
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
        return allData;
      };

      // 1. Fetch profiles
      const { data: pData } = await supabase.from('profiles').select('*').order('name');
      let loadedUsers = pData || [];
      if (currentUser?.role === 'Gestor') {
        loadedUsers = loadedUsers.filter(u => u.color === currentUser.color || u.id === currentUser.id);
      }
      setUsers(loadedUsers);

      const areaColorFilter = currentUser?.role === 'Gestor' ? currentUser.color : undefined;

      // 2. Fetch all patients
      const loadedPatients = await fetchAllFromTable('patients', undefined, false, areaColorFilter);
      setPatients(loadedPatients);

      // 3. Fetch all households
      const loadedHouseholds = await fetchAllFromTable('households', undefined, false, areaColorFilter);
      setHouseholds(loadedHouseholds);

      // 4. Fetch all visits
      const loadedVisits = await fetchAllFromTable('visits', 'date', false, areaColorFilter);
      setVisits(loadedVisits);

      // 5. Fetch campaigns (try-catch in case table not yet created)
      try {
        const { data: campData } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false });
        setCampaigns(campData || []);
      } catch (e) {
        console.warn("Table 'campaigns' does not exist yet. Run migrations.");
      }

      // 6. Fetch logs (try-catch in case table not yet created)
      try {
        const { data: logData } = await supabase.from('system_logs').select('*').order('created_at', { ascending: false });
        let loadedLogs = logData || [];
        if (currentUser?.role === 'Gestor') {
          const teamUserIds = new Set(loadedUsers.map(u => u.id));
          loadedLogs = loadedLogs.filter(log => teamUserIds.has(log.user_id));
        }
        setSystemLogs(loadedLogs);
      } catch (e) {
        console.warn("Table 'system_logs' does not exist yet. Run migrations.");
      }

    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Tab 3: Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const payload = {
        ...formData,
        role: currentUser?.role === 'Gestor' ? 'Agente' : formData.role,
        color: currentUser?.role === 'Gestor' ? currentUser.color : formData.color
      };

      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao criar usuário');

      // Log activity
      await logActivity(currentUser.id, 'Cadastro de Usuário', `Cadastrou o usuário ${formData.name} (${formData.email}) como ${formData.role}.`);

      setMessage({ type: 'success', text: 'Usuário cadastrado com sucesso!' });
      setFormData({ name: '', email: '', password: '', role: 'Agente', color: '#0d9488', microarea: '' });
      fetchData();
    } catch (error: any) {
      console.error("Error creating user:", error);
      setMessage({ type: 'error', text: error.message || 'Erro ao criar usuário.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Tab 3: Update User
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const isSystemAdmin = editFormData.role === 'Administrador';
      const payload = {
        name: editFormData.name,
        role: currentUser?.role === 'Gestor' ? 'Agente' : editFormData.role,
        microarea: isSystemAdmin ? '' : editFormData.microarea,
        color: currentUser?.role === 'Gestor' ? currentUser.color : (isSystemAdmin ? '#64748b' : editFormData.color)
      };

      const { error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', editingUser.id);

      if (error) throw error;

      await logActivity(currentUser.id, 'Edição de Usuário', `Atualizou o perfil do usuário ${editingUser.name}.`);

      setMessage({ type: 'success', text: 'Usuário atualizado com sucesso.' });
      setEditingUser(null);
      fetchData();
    } catch (error) {
      console.error("Error updating user:", error);
      setMessage({ type: 'error', text: 'Erro ao atualizar usuário.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Tab 3: Edit User Handler
  const handleEditUser = (userToEdit: any) => {
    setEditingUser(userToEdit);
    setEditFormData({
      name: userToEdit.name || '',
      role: userToEdit.role || 'Agente',
      microarea: userToEdit.microarea || '',
      color: userToEdit.color || '#0d9488'
    });
  };

  // Tab 3: Delete User
  const handleDeleteUser = async (userId: string, userName: string) => {
    if (userId === currentUser.id) {
      alert("Você não pode excluir seu próprio usuário.");
      return;
    }

    if (!window.confirm(`Tem certeza que deseja excluir o usuário "${userName}"? Isso removerá permanentemente o acesso e o perfil.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/delete-user/${userId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao excluir usuário');

      await logActivity(currentUser.id, 'Exclusão de Usuário', `Excluiu o usuário ${userName} do sistema.`);

      setMessage({ type: 'success', text: 'Usuário excluído com sucesso.' });
      fetchData();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      setMessage({ type: 'error', text: error.message || 'Erro ao excluir usuário.' });
    }
  };

  // Tab 4: Mass Transfer of Households & Patients
  const handleTransfer = async () => {
    if (!fromAgentId || !toAgentId) {
      alert("Selecione os agentes de origem e destino.");
      return;
    }
    if (fromAgentId === toAgentId) {
      alert("O agente de origem e destino devem ser diferentes.");
      return;
    }

    const sourceAgent = users.find(u => u.id === fromAgentId);
    const targetAgent = users.find(u => u.id === toAgentId);

    if (!sourceAgent || !targetAgent) return;

    if (!window.confirm(`Confirma a transferência dos domicílios e pacientes do ACS ${sourceAgent.name} para o ACS ${targetAgent.name}?`)) {
      return;
    }

    setTransferring(true);
    try {
      // Find households to update
      let targetHouseholdIds: string[] = [];
      if (transferType === 'all') {
        targetHouseholdIds = households.filter(h => h.agent_id === fromAgentId).map(h => h.id);
      } else if (transferType === 'microarea') {
        targetHouseholdIds = households.filter(h => h.agent_id === fromAgentId && h.microarea === selectedMicroarea).map(h => h.id);
      } else {
        targetHouseholdIds = selectedHouseholds;
      }

      if (targetHouseholdIds.length === 0) {
        alert("Nenhum domicílio encontrado para os critérios de transferência selecionados.");
        setTransferring(false);
        return;
      }

      // Find patients under those households or directly assigned to the source agent
      let targetPatientIds: string[] = [];
      if (transferType === 'all') {
        targetPatientIds = patients.filter(p => p.agent_id === fromAgentId).map(p => p.id);
      } else if (transferType === 'microarea') {
        targetPatientIds = patients.filter(p => p.agent_id === fromAgentId && p.microarea === selectedMicroarea).map(p => p.id);
      } else {
        targetPatientIds = patients.filter(p => p.household_id && targetHouseholdIds.includes(p.household_id)).map(p => p.id);
      }

      // 1. Update households in Supabase (updating agent, color, and new microarea)
      const { error: hError } = await supabase
        .from('households')
        .update({ 
          agent_id: toAgentId, 
          area_color: targetAgent.color,
          microarea: targetAgent.microarea 
        })
        .in('id', targetHouseholdIds);

      if (hError) throw hError;

      // 2. Update patients in Supabase
      if (targetPatientIds.length > 0) {
        const { error: pError } = await supabase
          .from('patients')
          .update({ 
            agent_id: toAgentId, 
            area_color: targetAgent.color,
            microarea: targetAgent.microarea 
          })
          .in('id', targetPatientIds);

        if (pError) throw pError;

        // 3. Update visits under those patients to have the new area color and microarea
        await supabase
          .from('visits')
          .update({ 
            area_color: targetAgent.color,
            microarea: targetAgent.microarea 
          })
          .in('patient_id', targetPatientIds);
      }

      // Log this major activity
      await logActivity(
        currentUser.id, 
        'Redistribuição de Microárea', 
        `Transferiu ${targetHouseholdIds.length} domicílios e ${targetPatientIds.length} cidadãos do ACS ${sourceAgent.name} para o ACS ${targetAgent.name}.`
      );

      setMessage({ 
        type: 'success', 
        text: `Sucesso! ${targetHouseholdIds.length} domicílios e ${targetPatientIds.length} cidadãos transferidos para ${targetAgent.name}.` 
      });

      setFromAgentId('');
      setToAgentId('');
      setSelectedHouseholds([]);
      setHouseholdSearch('');
      fetchData();
    } catch (e: any) {
      console.error("Transfer error:", e);
      setMessage({ type: 'error', text: `Erro na transferência: ${e.message}` });
    } finally {
      setTransferring(false);
    }
  };

  // Tab 5: Create Campaign
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignForm.title || !campaignForm.content) return;

    try {
      const { error } = await supabase.from('campaigns').insert({
        title: campaignForm.title,
        content: campaignForm.content,
        created_by: currentUser.id,
        active: true
      });

      if (error) throw error;

      await logActivity(currentUser.id, 'Criação de Campanha', `Criou a campanha de saúde: "${campaignForm.title}".`);

      setMessage({ type: 'success', text: 'Campanha de saúde criada e publicada!' });
      setCampaignForm({ title: '', content: '', target: 'Todos' });
      setShowNewCampaignModal(false);
      fetchData();
    } catch (e: any) {
      console.error(e);
      alert("Erro ao publicar campanha. Verifique se a tabela 'campaigns' existe no Supabase.");
    }
  };

  // Tab 5: Archive Campaign
  const handleToggleCampaign = async (id: string, currentStatus: boolean, title: string) => {
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      await logActivity(
        currentUser.id, 
        'Alteração de Campanha', 
        `${!currentStatus ? 'Reativou' : 'Arquivou'} a campanha de saúde: "${title}".`
      );

      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  // ----------------------------------------------------
  // CALCULATIONS FOR TABS
  // ----------------------------------------------------

  // 1. ACS Performance metrics (Aba 1)
  const acsPerformance = useMemo(() => {
    const agents = users.filter(u => u.role === 'Agente');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return agents.map(agent => {
      const agentPatients = patients.filter(p => p.agent_id === agent.id);
      const agentHouseholds = households.filter(h => h.agent_id === agent.id);
      
      // Visits this month (registered in database)
      const thisMonthVisits = visits.filter(v => v.agent_id === agent.id && new Date(v.date).getMonth() === new Date().getMonth() && new Date(v.date).getFullYear() === new Date().getFullYear());

      // Late patients (last_visit_at is null or older than 30 days)
      const lateVisits = agentPatients.filter(p => {
        const realLastVisitStr = getPatientLastVisitAt(p);
        return !realLastVisitStr || new Date(realLastVisitStr) < thirtyDaysAgo;
      }).length;

      // Active alert count
      const activeAlerts = agentPatients.filter(p => {
        const ageMonths = p.birth_date ? getAgeInMonths(p.birth_date) : 999;
        const isBaby = p.categories?.includes('Criança') && ageMonths <= 6;
        const realLastVisitStr = getPatientLastVisitAt(p);
        const lastVisit = realLastVisitStr ? new Date(realLastVisitStr) : null;
        const isLate = !lastVisit || lastVisit < thirtyDaysAgo;
        return isBaby && isLate;
      }).length;

      const coverageRatio = agentPatients.length > 0 
        ? Math.round(((agentPatients.length - lateVisits) / agentPatients.length) * 100)
        : 100;

      return {
        ...agent,
        totalCidadaos: agentPatients.length,
        totalDomicilios: agentHouseholds.length,
        visitsThisMonth: thisMonthVisits.length,
        lateVisits,
        activeAlerts,
        coverageRatio
      };
    });
  }, [users, patients, households, visits]);

  // 2. Previne Brasil Dynamic Indicators (Aba 2)
  const previneBrasilStats = useMemo(() => {
    const stats = {
      bucal: { num: 0, den: 0, pct: 0, target: 60, label: 'Saúde Bucal na Gestação', desc: 'Proporção de gestantes com consulta odontológica realizada na Atenção Primária.' },
      vacina: { num: 0, den: 0, pct: 0, target: 95, label: 'Vacinação Infantil (VIP/Penta)', desc: 'Proporção de crianças de até 1 ano de idade com imunizações recomendadas completas.' },
      hipertensao: { num: 0, den: 0, pct: 0, target: 50, label: 'Acompanhamento de Hipertensos', desc: 'Proporção de pessoas hipertensas com consulta e pressão arterial aferida no semestre.' },
      diabetes: { num: 0, den: 0, pct: 0, target: 50, label: 'Acompanhamento de Diabéticos', desc: 'Proporção de pessoas com diabetes com solicitação de exame de Hemoglobina Glicada no semestre.' }
    };

    patients.forEach(p => {
      const clinical = p.clinical_data || {};
      const categories = p.categories || [];
      const ageMonths = p.birth_date ? getAgeInMonths(p.birth_date) : 999;

      // 1. Saúde Bucal
      if (categories.includes('Gestante')) {
        stats.bucal.den++;
        if (clinical.gestante?.consulta_odontologica === 'Sim') {
          stats.bucal.num++;
        }
      }

      // 2. Vacinação Infantil (VIP / Penta) para crianças menores de 12 meses
      if (categories.includes('Criança') && ageMonths < 12) {
        stats.vacina.den++;
        const vacinas = clinical.crianca?.vacinas || {};
        const pentaOk = vacinas['Penta'] === 'Sim' || vacinas['pentavalente'] === 'Sim';
        const vipOk = vacinas['VIP'] === 'Sim' || vacinas['vip'] === 'Sim';
        const generalOk = clinical.crianca?.vacina_1ano_completa === 'Sim';

        if (generalOk || (pentaOk && vipOk)) {
          stats.vacina.num++;
        }
      }

      // 3. Acompanhamento de Hipertensão
      const isHipertenso = clinical.chronic?.hipertensao === 'Sim' || categories.includes('Hipertenso');
      if (isHipertenso) {
        stats.hipertensao.den++;
        if (clinical.chronic?.pressao_aferida_semestre === 'Sim' || clinical.chronic?.afericao_recente === 'Sim') {
          stats.hipertensao.num++;
        }
      }

      // 4. Acompanhamento de Diabetes (HbA1c)
      const isDiabetico = clinical.chronic?.diabetes === 'Sim' || categories.includes('Diabético') || categories.includes('Diabetico');
      if (isDiabetico) {
        stats.diabetes.den++;
        if (clinical.chronic?.hba1c_semestre === 'Sim' || clinical.chronic?.exame_recente === 'Sim') {
          stats.diabetes.num++;
        }
      }
    });

    // Compute Pcts
    Object.keys(stats).forEach(key => {
      const item = (stats as any)[key];
      item.pct = item.den > 0 ? Math.round((item.num / item.den) * 100) : 0;
    });

    return stats;
  }, [patients]);

  // 3. Filtered Audit Logs (Aba 6)
  const filteredLogs = useMemo(() => {
    return systemLogs.filter(log => {
      const searchStr = logSearch.toLowerCase();
      const userProfile = users.find(u => u.id === log.user_id);
      const userName = userProfile?.name || 'Sistema';
      const userEmail = userProfile?.email || '';

      return (
        log.action?.toLowerCase().includes(searchStr) ||
        log.details?.toLowerCase().includes(searchStr) ||
        userName.toLowerCase().includes(searchStr) ||
        userEmail.toLowerCase().includes(searchStr)
      );
    });
  }, [systemLogs, logSearch, users]);

  // Microareas list of source agent (Tab 4)
  const sourceAgentMicroareas = useMemo(() => {
    if (!fromAgentId) return [];
    const sourceHouseholds = households.filter(h => h.agent_id === fromAgentId);
    return Array.from(new Set(sourceHouseholds.map(h => h.microarea))).sort();
  }, [fromAgentId, households]);

  const sourceAgentHouseholds = useMemo(() => {
    if (!fromAgentId) return [];
    return households.filter(h => h.agent_id === fromAgentId);
  }, [fromAgentId, households]);

  const filteredHouseholds = useMemo(() => {
    if (!householdSearch.trim()) return sourceAgentHouseholds;
    const query = householdSearch.toLowerCase();
    return sourceAgentHouseholds.filter(h => {
      const respName = (h.responsible_name || '').toLowerCase();
      const address = (h.address || '').toLowerCase();
      const num = (h.number || '').toLowerCase();
      const microarea = (h.microarea || '').toLowerCase();
      return (
        respName.includes(query) ||
        address.includes(query) ||
        num.includes(query) ||
        microarea.includes(query)
      );
    });
  }, [sourceAgentHouseholds, householdSearch]);

  // Tab definitions
  const tabs = [
    { id: 'equipe', label: 'ACS & Equipe', icon: Users },
    { id: 'previne', label: 'Previne Brasil', icon: Award },
    { id: 'usuarios', label: 'Gerenciar Usuários', icon: UserPlus },
    { id: 'redistribuicao', label: 'Redistribuição', icon: Activity },
    { id: 'campanhas', label: 'Campanhas', icon: Megaphone },
    { id: 'auditoria', label: 'Audit Log', icon: History }
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
        <p className="text-sm font-semibold text-text-secondary uppercase tracking-widest">Carregando Painel Administrativo...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative pb-10">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-text-primary uppercase tracking-tight">Painel Administrativo</h2>
        <p className="text-xs text-text-muted mt-0.5 font-bold uppercase">Suíte de Gerenciamento da UBS e Equipe de ACS</p>
      </div>

      {/* Tabs Menu */}
      <div className="flex flex-wrap gap-2 pb-2 border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setMessage({ type: '', text: '' });
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all duration-200 border ${
              activeTab === tab.id
                ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/10'
                : 'bg-bg-secondary hover:bg-bg-primary text-text-secondary hover:text-text-primary border-border/80'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Message feedback */}
      {message.text && (
        <div className={`p-4 rounded-2xl border text-xs font-black uppercase flex items-center gap-3 animate-in slide-in-from-top-3 ${
          message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-red-500/10 border-red-500/20 text-red-500'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          {message.text}
        </div>
      )}

      {/* TAB CONTENT RENDERING */}
      <div className="min-h-[400px]">
        {/* ABA 1: ACS & EQUIPE */}
        {activeTab === 'equipe' && (
          <div className="space-y-6">
            {/* Quick stats grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-bg-secondary border border-border p-4 rounded-3xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-[20px] font-black text-text-primary leading-none">{users.filter(u => u.role === 'Agente').length}</h4>
                  <p className="text-[9px] text-text-muted font-black uppercase mt-1 tracking-wider">Agentes Ativos</p>
                </div>
              </div>

              <div className="bg-bg-secondary border border-border p-4 rounded-3xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-[20px] font-black text-text-primary leading-none">{patients.length}</h4>
                  <p className="text-[9px] text-text-muted font-black uppercase mt-1 tracking-wider">Cidadãos Totais</p>
                </div>
              </div>

              <div className="bg-bg-secondary border border-border p-4 rounded-3xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-[20px] font-black text-text-primary leading-none">
                    {users.filter(u => u.role === 'Agente').length > 0 
                      ? Math.round(patients.length / users.filter(u => u.role === 'Agente').length)
                      : 0}
                  </h4>
                  <p className="text-[9px] text-text-muted font-black uppercase mt-1 tracking-wider">Pacientes / Agente</p>
                </div>
              </div>

              <div className="bg-bg-secondary border border-border p-4 rounded-3xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-[20px] font-black text-text-primary leading-none">
                    {patients.length > 0 
                      ? Math.round(((patients.length - patients.filter(p => {
                          const thirtyDaysAgo = new Date();
                          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                          const realLastVisitStr = getPatientLastVisitAt(p);
                          return !realLastVisitStr || new Date(realLastVisitStr) < thirtyDaysAgo;
                        }).length) / patients.length) * 100)
                      : 100}%
                  </h4>
                  <p className="text-[9px] text-text-muted font-black uppercase mt-1 tracking-wider">Eficiência de Cobertura</p>
                </div>
              </div>
            </div>

            {/* Performance Table */}
            <div className="bg-bg-secondary border border-border rounded-3xl p-5 shadow-sm">
              <h3 className="text-xs font-black text-text-primary uppercase tracking-wider mb-4">Relatório de Produtividade dos Agentes</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border/60 text-[9px] text-text-muted font-black uppercase tracking-wider">
                      <th className="pb-3 pl-2">Agente</th>
                      <th className="pb-3 text-center">Microárea</th>
                      <th className="pb-3 text-center">Domicílios</th>
                      <th className="pb-3 text-center">Cidadãos</th>
                      <th className="pb-3 text-center">Visitas (Mês)</th>
                      <th className="pb-3 text-center">Atrasados (+30d)</th>
                      <th className="pb-3 text-right pr-2">Cobertura Ativa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {acsPerformance.map((agent, i) => (
                      <tr key={agent.id} className="hover:bg-bg-primary/20 transition-colors text-[12px] font-semibold text-text-secondary">
                        <td className="py-3.5 pl-2 flex items-center gap-2.5">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: agent.color }} />
                          <span className="font-bold text-text-primary uppercase tracking-tight">{agent.name}</span>
                        </td>
                        <td className="py-3.5 text-center font-bold">{agent.microarea || '--'}</td>
                        <td className="py-3.5 text-center font-black text-text-primary">{agent.totalDomicilios}</td>
                        <td className="py-3.5 text-center font-black text-text-primary">{agent.totalCidadaos}</td>
                        <td className="py-3.5 text-center font-black text-teal-600 dark:text-teal-400">{agent.visitsThisMonth}</td>
                        <td className="py-3.5 text-center font-bold text-red-500">{agent.lateVisits}</td>
                        <td className="py-3.5 text-right pr-2">
                          <div className="flex items-center justify-end gap-2">
                            <span className={`text-[10px] font-extrabold ${agent.coverageRatio >= 80 ? 'text-emerald-600' : agent.coverageRatio >= 60 ? 'text-amber-500' : 'text-red-500'}`}>{agent.coverageRatio}%</span>
                            <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shrink-0">
                              <div className={`h-full rounded-full ${agent.coverageRatio >= 80 ? 'bg-emerald-500' : agent.coverageRatio >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${agent.coverageRatio}%` }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {acsPerformance.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-10 font-bold text-text-muted">Nenhum agente cadastrado no sistema.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ABA 2: PREVINE BRASIL */}
        {activeTab === 'previne' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-teal-500/10 to-indigo-500/10 p-5 rounded-3xl border border-teal-500/10 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-600 flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-text-primary uppercase tracking-tight">Monitor Previne Brasil</h3>
                  <p className="text-[10px] text-text-secondary font-medium">Indicadores calculados em tempo real de acordo com as fichas de atendimento.</p>
                </div>
              </div>
              <span className="text-[9px] font-extrabold bg-teal-600 text-white px-3 py-1 rounded-full uppercase tracking-wider">Metas do Quadrimestre</span>
            </div>

            {/* Indicators Ring Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.keys(previneBrasilStats).map((key) => {
                const item = (previneBrasilStats as any)[key];
                const status = getIndicatorStatus(item.pct, item.target);
                const strokeDash = 2 * Math.PI * 34; // Radius is 34
                const strokeOffset = strokeDash - (item.pct / 100) * strokeDash;

                return (
                  <div key={key} className="bg-bg-secondary border border-border rounded-3xl p-5 flex items-start gap-5 shadow-sm hover:shadow-md transition-shadow">
                    {/* Ring SVG container */}
                    <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="40" cy="40" r="34" className="stroke-slate-100 dark:stroke-slate-800" strokeWidth="6" fill="transparent" />
                        <circle 
                          cx="40" 
                          cy="40" 
                          r="34" 
                          stroke={status.fill} 
                          strokeWidth="6" 
                          fill="transparent" 
                          strokeDasharray={strokeDash}
                          strokeDashoffset={strokeOffset}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[14px] font-black text-text-primary">{item.pct}%</span>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h4 className="text-[13px] font-black text-text-primary uppercase tracking-tight truncate max-w-[200px]">{item.label}</h4>
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <p className="text-[9px] text-text-secondary leading-normal">{item.desc}</p>
                      
                      <div className="flex justify-between items-center text-[9px] font-extrabold uppercase mt-2 pt-2 border-t border-border/40">
                        <span className="text-text-muted">Amostra: {item.num}/{item.den}</span>
                        <span className="text-teal-600 dark:text-teal-400">Meta: &gt;={item.target}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ABA 3: GERENCIAR USUÁRIOS */}
        {activeTab === 'usuarios' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* Form Column */}
            <div className="lg:col-span-1">
              <div className="bg-bg-secondary rounded-[32px] p-6 border border-border shadow-sm flex flex-col h-full">
                <h3 className="text-sm font-black text-text-primary uppercase tracking-wider mb-5 flex items-center gap-2 shrink-0">
                  <UserPlus className="w-4.5 h-4.5 text-teal-600" />
                  {editingUser ? 'Editar Perfil' : 'Novo Agente/Gestor'}
                </h3>

                {editingUser ? (
                  // EDIT MODE
                  <form onSubmit={handleUpdateUser} className="space-y-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-wider text-text-muted">Nome do Usuário</label>
                        <input 
                          required 
                          type="text" 
                          value={editFormData.name} 
                          onChange={e => setEditFormData({...editFormData, name: e.target.value})}
                          className="w-full bg-bg-primary dark:bg-slate-800 border-none rounded-xl py-2.5 px-3.5 text-xs font-semibold focus:ring-2 focus:ring-teal-600/20"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-wider text-text-muted">Função / Cargo</label>
                        <select 
                          value={editFormData.role}
                          onChange={e => setEditFormData({...editFormData, role: e.target.value})}
                          disabled={currentUser?.role === 'Gestor'}
                          className="w-full bg-bg-primary dark:bg-slate-800 border-none rounded-xl py-2.5 px-3.5 text-xs font-bold focus:ring-2 focus:ring-teal-600/20 disabled:opacity-75 disabled:cursor-not-allowed"
                        >
                          <option value="Agente">Agente Comunitário</option>
                          {currentUser?.role !== 'Gestor' && (
                            <>
                              <option value="Gestor">Gestor / Supervisor</option>
                              <option value="Administrador">Administrador Geral</option>
                            </>
                          )}
                        </select>
                      </div>

                      {editFormData.role !== 'Administrador' && (
                        <>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-wider text-text-muted">Número da Microárea</label>
                            <input 
                              required 
                              type="text" 
                              value={editFormData.microarea} 
                              onChange={e => setEditFormData({...editFormData, microarea: e.target.value})}
                              className="w-full bg-bg-primary dark:bg-slate-800 border-none rounded-xl py-2.5 px-3.5 text-xs font-semibold focus:ring-2 focus:ring-teal-600/20"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-wider text-text-muted">Cor da Microárea (Identificação)</label>
                            <div className="flex items-center gap-3">
                              <input 
                                type="color" 
                                value={editFormData.color} 
                                onChange={e => setEditFormData({...editFormData, color: e.target.value})}
                                disabled={currentUser?.role === 'Gestor'}
                                className="w-10 h-10 border-0 rounded-xl overflow-hidden cursor-pointer p-0 bg-transparent shrink-0 disabled:cursor-not-allowed"
                              />
                              <span className="text-[11px] font-mono font-bold uppercase">{editFormData.color}</span>
                              {currentUser?.role === 'Gestor' && (
                                <span className="text-[9px] text-text-muted font-bold uppercase">(Fixo para sua Equipe)</span>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex gap-2.5 mt-6 pt-4 border-t border-border shrink-0">
                      <button 
                        type="button" 
                        onClick={() => setEditingUser(null)} 
                        className="flex-1 py-2.5 border border-border hover:bg-bg-primary rounded-xl text-xs font-black uppercase tracking-wider"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="submit" 
                        disabled={submitting} 
                        className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm flex items-center justify-center gap-1.5"
                      >
                        {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Salvar
                      </button>
                    </div>
                  </form>
                ) : (
                  // CREATE MODE
                  <form onSubmit={handleCreateUser} className="space-y-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-wider text-text-muted">Nome Completo</label>
                        <input 
                          required 
                          type="text" 
                          placeholder="Nome do Agente"
                          value={formData.name} 
                          onChange={e => setFormData({...formData, name: e.target.value})}
                          className="w-full bg-bg-primary dark:bg-slate-800 border-none rounded-xl py-2.5 px-3.5 text-xs font-semibold focus:ring-2 focus:ring-teal-600/20"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-wider text-text-muted">E-mail de Acesso</label>
                        <input 
                          required 
                          type="email" 
                          placeholder="exemplo@gmail.com"
                          value={formData.email} 
                          onChange={e => setFormData({...formData, email: e.target.value})}
                          className="w-full bg-bg-primary dark:bg-slate-800 border-none rounded-xl py-2.5 px-3.5 text-xs font-semibold focus:ring-2 focus:ring-teal-600/20"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-wider text-text-muted">Senha Inicial</label>
                        <input 
                          required 
                          type="password" 
                          placeholder="Mínimo 6 caracteres"
                          value={formData.password} 
                          onChange={e => setFormData({...formData, password: e.target.value})}
                          className="w-full bg-bg-primary dark:bg-slate-800 border-none rounded-xl py-2.5 px-3.5 text-xs font-semibold focus:ring-2 focus:ring-teal-600/20"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-wider text-text-muted">Função / Cargo</label>
                        <select 
                          value={formData.role} 
                          onChange={e => setFormData({...formData, role: e.target.value})}
                          disabled={currentUser?.role === 'Gestor'}
                          className="w-full bg-bg-primary dark:bg-slate-800 border-none rounded-xl py-2.5 px-3.5 text-xs font-bold focus:ring-2 focus:ring-teal-600/20 disabled:opacity-75 disabled:cursor-not-allowed"
                        >
                          <option value="Agente">Agente Comunitário</option>
                          {currentUser?.role !== 'Gestor' && (
                            <>
                              <option value="Gestor">Gestor / Supervisor</option>
                              <option value="Administrador">Administrador Geral</option>
                            </>
                          )}
                        </select>
                      </div>

                      {formData.role !== 'Administrador' && (
                        <>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-wider text-text-muted">Microárea</label>
                            <input 
                              required 
                              type="text" 
                              placeholder="Número da microárea"
                              value={formData.microarea} 
                              onChange={e => setFormData({...formData, microarea: e.target.value})}
                              className="w-full bg-bg-primary dark:bg-slate-800 border-none rounded-xl py-2.5 px-3.5 text-xs font-semibold focus:ring-2 focus:ring-teal-600/20"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-wider text-text-muted">Cor da Área</label>
                            <div className="flex items-center gap-3">
                              <input 
                                type="color" 
                                value={formData.color} 
                                onChange={e => setFormData({...formData, color: e.target.value})}
                                disabled={currentUser?.role === 'Gestor'}
                                className="w-10 h-10 border-0 rounded-xl overflow-hidden cursor-pointer p-0 bg-transparent shrink-0 disabled:cursor-not-allowed"
                              />
                              <span className="text-[11px] font-mono font-bold uppercase">{formData.color}</span>
                              {currentUser?.role === 'Gestor' && (
                                <span className="text-[9px] text-text-muted font-bold uppercase">(Fixo para sua Equipe)</span>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    <button 
                      type="submit" 
                      disabled={submitting} 
                      className="w-full mt-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm flex items-center justify-center gap-1.5 shrink-0"
                    >
                      {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Cadastrar Usuário
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Users List Column */}
            <div className="lg:col-span-2">
              <div className="bg-bg-secondary rounded-[32px] p-6 border border-border shadow-sm h-full flex flex-col">
                <h3 className="text-sm font-black text-text-primary uppercase tracking-wider mb-5 shrink-0">Usuários Cadastrados ({users.length})</h3>
                <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                  {users.map(u => {
                    const isCurrentUser = u.id === currentUser.id;
                    const isSystemAdmin = u.role === 'Administrador';
                    return (
                      <div key={u.id} className="p-3.5 rounded-2xl border border-border/80 flex items-center justify-between gap-3 bg-bg-primary/20 hover:bg-bg-primary/40 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: u.color }} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-[13px] font-black text-text-primary uppercase truncate tracking-tight">{u.name}</h4>
                              <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded leading-none shrink-0 ${
                                isSystemAdmin 
                                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400' 
                                  : u.role === 'Gestor' 
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' 
                                    : 'bg-teal-100 text-teal-700 dark:bg-teal-950/30 dark:text-teal-400'
                              }`}>
                                {u.role}
                              </span>
                            </div>
                            <p className="text-[10px] text-text-muted font-semibold mt-1 truncate">
                              {u.email} {!isSystemAdmin && `• Microárea ${u.microarea || '--'}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button 
                            onClick={() => handleEditUser(u)} 
                            className="p-2 border border-border rounded-xl hover:bg-bg-primary text-text-secondary hover:text-text-primary transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {!isCurrentUser && (
                            <button 
                              onClick={() => handleDeleteUser(u.id, u.name)} 
                              className="p-2 border border-border rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 text-text-muted hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA 4: REDISTRIBUIÇÃO */}
        {activeTab === 'redistribuicao' && (
          <div className="bg-bg-secondary rounded-[32px] p-6 border border-border shadow-sm max-w-4xl mx-auto space-y-6">
            <div>
              <h3 className="text-sm font-black text-text-primary uppercase tracking-tight flex items-center gap-2">
                <Activity className="w-5 h-5 text-teal-600" />
                Redistribuição de Microáreas
              </h3>
              <p className="text-[10px] text-text-secondary font-medium mt-1 leading-relaxed">
                Transfira domicílios e pacientes entre agentes de saúde comunitária de forma simples.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-border/60">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-text-muted">Agente de Origem (ACS)</label>
                <select 
                  value={fromAgentId} 
                  onChange={e => {
                    setFromAgentId(e.target.value);
                    setSelectedHouseholds([]);
                    setHouseholdSearch('');
                  }}
                  className="w-full bg-bg-primary dark:bg-slate-800 border-none rounded-xl py-3 px-3.5 text-xs font-bold focus:ring-2 focus:ring-teal-600/20"
                >
                  <option value="">Selecione o ACS de origem</option>
                  {users.filter(u => u.role === 'Agente').map(u => (
                    <option key={u.id} value={u.id}>ACS {u.name} (Microárea {u.microarea})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-text-muted">Agente de Destino (ACS)</label>
                <select 
                  value={toAgentId} 
                  onChange={e => setToAgentId(e.target.value)}
                  className="w-full bg-bg-primary dark:bg-slate-800 border-none rounded-xl py-3 px-3.5 text-xs font-bold focus:ring-2 focus:ring-teal-600/20"
                >
                  <option value="">Selecione o ACS de destino</option>
                  {users.filter(u => u.role === 'Agente' && u.id !== fromAgentId).map(u => (
                    <option key={u.id} value={u.id}>ACS {u.name} (Microárea {u.microarea})</option>
                  ))}
                </select>
              </div>
            </div>

            {fromAgentId && (
              <div className="space-y-5 animate-in fade-in duration-300">
                <div className="bg-bg-primary/20 p-4 border border-border/60 rounded-2xl flex flex-col sm:flex-row gap-4 items-center justify-between text-[11px] font-bold text-text-secondary">
                  <div>
                    Estatísticas do Agente de Origem:
                    <span className="text-text-primary font-black ml-1.5">{sourceAgentHouseholds.length} Domicílios</span> • 
                    <span className="text-text-primary font-black ml-1.5">{patients.filter(p => p.agent_id === fromAgentId).length} Pacientes</span>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => setTransferType('all')} 
                      className={`px-3 py-1.5 rounded-xl uppercase text-[9px] font-black border transition-all ${
                        transferType === 'all' ? 'bg-teal-600 text-white border-teal-600' : 'bg-bg-secondary border-border hover:bg-bg-primary'
                      }`}
                    >
                      Tudo
                    </button>
                    {sourceAgentMicroareas.length > 0 && (
                      <button 
                        onClick={() => {
                          setTransferType('microarea');
                          setSelectedMicroarea(sourceAgentMicroareas[0] as string);
                        }} 
                        className={`px-3 py-1.5 rounded-xl uppercase text-[9px] font-black border transition-all ${
                          transferType === 'microarea' ? 'bg-teal-600 text-white border-teal-600' : 'bg-bg-secondary border-border hover:bg-bg-primary'
                        }`}
                      >
                        Por Microárea
                      </button>
                    )}
                    <button 
                      onClick={() => setTransferType('selected')} 
                      className={`px-3 py-1.5 rounded-xl uppercase text-[9px] font-black border transition-all ${
                        transferType === 'selected' ? 'bg-teal-600 text-white border-teal-600' : 'bg-bg-secondary border-border hover:bg-bg-primary'
                      }`}
                    >
                      Selecionados
                    </button>
                  </div>
                </div>

                {/* TRANSFER TYPE OPTION PANEL */}
                {transferType === 'microarea' && (
                  <div className="bg-bg-secondary p-4 border border-border rounded-2xl flex items-center gap-3 space-y-1">
                    <label className="text-[10px] font-black uppercase text-text-muted shrink-0">Selecione a Microárea:</label>
                    <select 
                      value={selectedMicroarea} 
                      onChange={e => setSelectedMicroarea(e.target.value)}
                      className="bg-bg-primary dark:bg-slate-800 border-none rounded-xl py-2 px-3 text-xs font-bold focus:ring-2 focus:ring-teal-600/20 shrink-0"
                    >
                      {sourceAgentMicroareas.map((m: any) => (
                        <option key={m} value={m}>Microárea {m}</option>
                      ))}
                    </select>
                  </div>
                )}

                {transferType === 'selected' && (
                  <div className="bg-bg-secondary border border-border rounded-2xl overflow-hidden flex flex-col">
                    <div className="p-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-bg-primary/10">
                      <span className="text-[9px] font-black uppercase tracking-wider text-text-muted">
                        Selecione os Domicílios para Transferência ({selectedHouseholds.length} selecionados)
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const filteredIds = filteredHouseholds.map(h => h.id);
                            setSelectedHouseholds(prev => {
                              const newSelection = new Set([...prev, ...filteredIds]);
                              return Array.from(newSelection);
                            });
                          }}
                          className="px-2 py-1 bg-bg-secondary border border-border hover:bg-bg-primary text-[9px] font-black uppercase rounded-lg text-text-secondary hover:text-text-primary transition-all"
                        >
                          Selecionar Todos Filtrados
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedHouseholds([]);
                          }}
                          className="px-2 py-1 bg-bg-secondary border border-border hover:bg-red-50 dark:hover:bg-red-950/20 text-[9px] font-black uppercase rounded-lg text-text-muted hover:text-red-500 transition-all"
                        >
                          Limpar Seleção
                        </button>
                      </div>
                    </div>

                    {/* Campo de Pesquisa Rápida */}
                    <div className="p-3 border-b border-border bg-bg-primary/5 flex items-center gap-2">
                      <Search className="w-4 h-4 text-text-muted shrink-0" />
                      <input
                        type="text"
                        placeholder="Pesquisar por responsável, rua, número ou microárea..."
                        value={householdSearch}
                        onChange={e => setHouseholdSearch(e.target.value)}
                        className="w-full bg-transparent border-none p-0 text-xs font-semibold placeholder:text-text-muted/65 focus:ring-0"
                      />
                      {householdSearch && (
                        <button
                          type="button"
                          onClick={() => setHouseholdSearch('')}
                          className="text-[10px] text-text-muted hover:text-text-primary font-bold px-1.5 py-0.5 rounded hover:bg-bg-primary"
                        >
                          Limpar
                        </button>
                      )}
                    </div>

                    <div className="max-h-[260px] overflow-y-auto divide-y divide-border/60 custom-scrollbar">
                      {filteredHouseholds.map(h => {
                        const isChecked = selectedHouseholds.includes(h.id);
                        return (
                          <div 
                            key={h.id} 
                            onClick={() => {
                              setSelectedHouseholds(prev => 
                                prev.includes(h.id) ? prev.filter(id => id !== h.id) : [...prev, h.id]
                              );
                            }}
                            className="flex items-center gap-3 p-3 text-[12px] font-semibold text-text-secondary hover:bg-bg-primary/20 transition-colors cursor-pointer select-none"
                          >
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={() => {}} // Controlled by outer div click
                              className="w-4 h-4 rounded text-teal-600 border-slate-300 dark:border-slate-700 focus:ring-teal-500 shrink-0" 
                            />
                            <div className="min-w-0">
                              <span className="text-text-primary font-bold uppercase">{h.responsible_name || 'Responsável não cadastrado'}</span>
                              <span className="text-text-muted ml-2">{h.address}, {h.number} (Microárea {h.microarea})</span>
                            </div>
                          </div>
                        );
                      })}
                      {filteredHouseholds.length === 0 && (
                        <div className="p-6 text-center text-text-muted text-xs font-semibold uppercase">
                          Nenhum domicílio encontrado para a pesquisa.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TRANSFER ACTION BUTTON */}
                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleTransfer}
                    disabled={transferring || !toAgentId}
                    className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shadow-teal-600/10 flex items-center gap-2 active:scale-98 transition-all disabled:opacity-50"
                  >
                    {transferring ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    Realizar Transferência
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ABA 5: CAMPANHAS & DIRETRIZES */}
        {activeTab === 'campanhas' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-xs font-black text-text-primary uppercase tracking-wider">Diretrizes de Saúde Ativas</h3>
              {currentUser?.role === 'Administrador' && (
                <button 
                  onClick={() => {
                    setCampaignForm({ title: '', content: '', target: 'Todos' });
                    setShowNewCampaignModal(true);
                  }} 
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm active:scale-98 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Nova Diretriz
                </button>
              )}
            </div>

            {/* Campaign Modal overlay */}
            <AnimatePresence>
              {showNewCampaignModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-bg-secondary border border-border w-full max-w-lg rounded-3xl p-6 shadow-2xl relative"
                  >
                    <button 
                      onClick={() => setShowNewCampaignModal(false)}
                      className="absolute top-4 right-4 p-2 text-text-muted hover:text-text-primary rounded-full hover:bg-bg-primary transition-colors"
                    >
                      <CloseIcon className="w-4.5 h-4.5" />
                    </button>

                    <h4 className="text-sm font-black text-text-primary uppercase tracking-wider mb-5 flex items-center gap-2">
                      <Megaphone className="w-4.5 h-4.5 text-teal-600" />
                      Publicar Diretriz de Saúde
                    </h4>

                    <form onSubmit={handleCreateCampaign} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-wider text-text-muted">Título da Diretriz</label>
                        <input 
                          required 
                          type="text" 
                          placeholder="Ex: Campanha Contra a Influenza - Priorizar Idosos"
                          value={campaignForm.title} 
                          onChange={e => setCampaignForm({...campaignForm, title: e.target.value})}
                          className="w-full bg-bg-primary dark:bg-slate-800 border-none rounded-xl py-3 px-3.5 text-xs font-semibold focus:ring-2 focus:ring-teal-600/20"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-wider text-text-muted">Conteúdo / Orientações para o ACS</label>
                        <textarea 
                          required 
                          rows={4}
                          placeholder="Descreva as instruções detalhadas que os agentes de saúde comunitária devem priorizar em suas visitas de campo nesta semana..."
                          value={campaignForm.content} 
                          onChange={e => setCampaignForm({...campaignForm, content: e.target.value})}
                          className="w-full bg-bg-primary dark:bg-slate-800 border-none rounded-xl py-3 px-3.5 text-xs font-semibold focus:ring-2 focus:ring-teal-600/20 resize-none"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-teal-600/10 flex items-center justify-center gap-1.5 mt-4"
                      >
                        <Check className="w-4 h-4" />
                        Publicar para toda a Equipe
                      </button>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Campaign lists */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {campaigns.map(camp => (
                <div key={camp.id} className={`p-5 rounded-3xl border flex flex-col justify-between gap-3 shadow-sm bg-bg-secondary ${
                  camp.active ? 'border-teal-500/25 shadow-teal-500/5' : 'border-border/60 opacity-60'
                }`}>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded ${
                        camp.active ? 'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {camp.active ? 'Em Destaque' : 'Arquivado'}
                      </span>
                      <span className="text-[9px] font-bold text-text-muted">{formatDate(camp.created_at)}</span>
                    </div>
                    <h4 className="text-[13px] font-black text-text-primary uppercase tracking-tight leading-tight">{camp.title}</h4>
                    <p className="text-[11px] text-text-secondary leading-normal whitespace-pre-line">{camp.content}</p>
                  </div>

                  {currentUser?.role === 'Administrador' && (
                    <div className="flex justify-end pt-3 border-t border-border/40">
                      <button 
                        onClick={() => handleToggleCampaign(camp.id, camp.active, camp.title)}
                        className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border transition-all ${
                          camp.active 
                            ? 'border-border text-text-secondary hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/20' 
                            : 'border-teal-500/20 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/20'
                        }`}
                      >
                        {camp.active ? 'Arquivar' : 'Reativar'}
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {campaigns.length === 0 && (
                <div className="col-span-2 text-center py-12 border border-dashed border-border rounded-3xl bg-bg-secondary/40">
                  <Megaphone className="w-10 h-10 mx-auto text-text-muted opacity-30 mb-2.5" />
                  <p className="text-xs font-black text-text-primary uppercase tracking-wider">Nenhuma campanha publicada</p>
                  <p className="text-[10px] text-text-muted mt-1">Crie diretrizes para orientar os agentes comunitários nas visitas de campo.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA 6: AUDIT LOGS */}
        {activeTab === 'auditoria' && (
          <div className="bg-bg-secondary rounded-[32px] p-6 border border-border shadow-sm flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div>
                <h3 className="text-sm font-black text-text-primary uppercase tracking-tight flex items-center gap-2">
                  <History className="w-4.5 h-4.5 text-teal-600" />
                  Logs de Auditoria do Sistema
                </h3>
                <p className="text-[9px] text-text-secondary font-medium">Linha do tempo de conformidade e segurança clínica (LGPD)</p>
              </div>

              {/* Search bar */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input 
                  type="text" 
                  placeholder="Pesquisar logs..."
                  value={logSearch}
                  onChange={e => setLogSearch(e.target.value)}
                  className="w-full bg-bg-primary dark:bg-slate-800 border-none rounded-xl py-2 pl-9 pr-3.5 text-xs font-semibold focus:ring-2 focus:ring-teal-600/20"
                />
              </div>
            </div>

            {/* Logs timeline list */}
            <div className="flex-1 overflow-y-auto max-h-[450px] divide-y divide-border/60 custom-scrollbar pr-1">
              {filteredLogs.map(log => {
                const logUser = users.find(u => u.id === log.user_id);
                return (
                  <div key={log.id} className="py-3 flex items-start gap-4 text-[12px] font-semibold text-text-secondary group">
                    <div className="w-8 h-8 rounded-full bg-teal-50 dark:bg-slate-800 flex items-center justify-center shrink-0 text-teal-600">
                      <ShieldCheck className="w-4.5 h-4.5" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-black text-text-primary uppercase tracking-tight text-[11px]">{log.action}</span>
                        <span className="text-[9px] text-text-muted font-bold shrink-0">{formatDate(log.created_at)}</span>
                      </div>
                      <p className="text-[10px] text-text-secondary leading-normal">{log.details}</p>
                      <p className="text-[8px] text-text-muted uppercase font-bold tracking-wide mt-1">
                        Executado por: {logUser?.name || 'Sistema'} ({logUser?.email || 'sistema@gestaoacs.local'})
                      </p>
                    </div>
                  </div>
                );
              })}

              {filteredLogs.length === 0 && (
                <div className="text-center py-12 font-bold text-text-muted">Nenhum log encontrado.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
