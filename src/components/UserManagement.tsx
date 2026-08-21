import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, fetchTableWithFilters } from '../lib/supabase';
import { useToast } from './Toast';
import { useConfirm } from './ui/ConfirmDialog';
import { logActivity } from '../lib/auditLogger';
import { AppUser, UserProfile, Patient, Household, Visit, Campaign, SystemLog } from '../types';
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
import { EquipeTab } from './user-management/EquipeTab';
import { PrevineTab } from './user-management/PrevineTab';
import { UsuariosTab } from './user-management/UsuariosTab';
import { RedistribuicaoTab } from './user-management/RedistribuicaoTab';
import { CampanhasTab } from './user-management/CampanhasTab';
import { AuditoriaTab } from './user-management/AuditoriaTab';

// Helper to determine indicator success color and tag
const getIndicatorStatus = (percentage: number, target: number) => {
  if (percentage >= target) return { label: 'Meta Atingida', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20', fill: '#10b981' };
  if (percentage >= target - 15) return { label: 'Próximo da Meta', color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20', fill: '#f59e0b' };
  return { label: 'Abaixo da Meta', color: 'text-red-500 dark:text-red-400 bg-red-500/10 border-red-500/20', fill: '#ef4444' };
};

export function UserManagement({ currentUser }: { currentUser: AppUser | null }) {
  const navigate = useNavigate();
  const { warning, error: toastError } = useToast();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState('equipe');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  
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
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
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
      // 1. Fetch profiles
      const { data: pData } = await supabase.from('profiles').select('*').order('name');
      let loadedUsers = pData || [];
      if (currentUser?.role === 'Gestor') {
        loadedUsers = loadedUsers.filter(u => u.color === currentUser.color || u.id === currentUser.id);
      }
      setUsers(loadedUsers);

      // 2. Fetch all patients
      const loadedPatients = await fetchTableWithFilters<Patient>('patients', currentUser);
      setPatients(loadedPatients);

      // 3. Fetch all households
      const loadedHouseholds = await fetchTableWithFilters<Household>('households', currentUser);
      setHouseholds(loadedHouseholds);

      // 4. Fetch all visits
      const loadedVisits = await fetchTableWithFilters<Visit>('visits', currentUser);
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

  if (!currentUser) return null;

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

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const contentType = response.headers.get('content-type') || '';
      let data: any = {};
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? 'Rota do servidor não encontrada (404). Verifique se as funções de API estão implantadas na hospedagem (Vercel).'
              : `Erro no servidor (${response.status}): ${text.slice(0, 120)}`
          );
        }
      }

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
        .eq('id', editingUser!.id);

      if (error) throw error;

      await logActivity(currentUser.id, 'Edição de Usuário', `Atualizou o perfil do usuário ${editingUser!.name}.`);

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
      warning("Você não pode excluir seu próprio usuário.");
      return;
    }

    const ok = await confirm({
      title: 'Excluir Usuário',
      message: `Tem certeza que deseja excluir o usuário "${userName}"? Isso removerá permanentemente o acesso e o perfil.`,
      variant: 'danger',
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar'
    });
    if (!ok) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/admin/delete-user/${userId}`, { 
        method: 'DELETE',
        headers
      });
      const contentType = response.headers.get('content-type') || '';
      let data: any = {};
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? 'Rota do servidor não encontrada (404).'
              : `Erro no servidor (${response.status}): ${text.slice(0, 120)}`
          );
        }
      }
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
      warning("Selecione os agentes de origem e destino.");
      return;
    }
    if (fromAgentId === toAgentId) {
      warning("O agente de origem e destino devem ser diferentes.");
      return;
    }

    const sourceAgent = users.find(u => u.id === fromAgentId);
    const targetAgent = users.find(u => u.id === toAgentId);

    if (!sourceAgent || !targetAgent) return;

    const ok = await confirm({
      title: 'Confirmar Transferência',
      message: `Confirma a transferência dos domicílios e pacientes do ACS ${sourceAgent.name} para o ACS ${targetAgent.name}?`,
      variant: 'warning',
      confirmLabel: 'Transferir',
      cancelLabel: 'Cancelar'
    });
    if (!ok) return;

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
        warning("Nenhum domicílio encontrado para os critérios de transferência selecionados.");
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

  // Mass rename/correct microareas (e.g., "3" -> "03")
  const handleRenameMicroarea = async (agentId: string, oldMa: string, newMa: string): Promise<boolean> => {
    if (!oldMa.trim() || !newMa.trim()) {
      warning("Por favor, preencha a microárea de origem e de destino.");
      return false;
    }
    if (oldMa.trim() === newMa.trim()) {
      warning("Os nomes de microárea de origem e destino devem ser diferentes.");
      return false;
    }

    const trimmedOld = oldMa.trim();
    const trimmedNew = newMa.trim();

    const selectedAgent = users.find(u => u.id === agentId);
    const confirmMsg = agentId === 'all'
      ? `Confirma a alteração em MASSA de todas as microáreas "${trimmedOld}" para "${trimmedNew}" em todo o sistema (afetará todos os agentes, domicílios, cidadãos e visitas)?`
      : `Confirma a alteração das microáreas "${trimmedOld}" para "${trimmedNew}" para o ACS "${selectedAgent?.name || agentId}"?`;

    const ok = await confirm({
      title: 'Confirmar Ação',
      message: confirmMsg,
      variant: 'warning',
      confirmLabel: 'Confirmar',
      cancelLabel: 'Cancelar'
    });
    if (!ok) {
      return false;
    }

    try {
      let countHouseholds = 0;
      let countPatients = 0;
      let countVisits = 0;
      let countProfiles = 0;

      // 1. Update households
      let queryHouseholds = supabase.from('households').update({ microarea: trimmedNew }).eq('microarea', trimmedOld);
      if (agentId !== 'all') {
        queryHouseholds = queryHouseholds.eq('agent_id', agentId);
      }
      const { data: hData, error: hError } = await queryHouseholds.select('id');
      if (hError) throw hError;
      countHouseholds = hData ? hData.length : 0;

      // 2. Update patients
      let queryPatients = supabase.from('patients').update({ microarea: trimmedNew }).eq('microarea', trimmedOld);
      if (agentId !== 'all') {
        queryPatients = queryPatients.eq('agent_id', agentId);
      }
      const { data: pData, error: pError } = await queryPatients.select('id');
      if (pError) throw pError;
      countPatients = pData ? pData.length : 0;

      // 3. Update visits
      let queryVisits = supabase.from('visits').update({ microarea: trimmedNew }).eq('microarea', trimmedOld);
      if (agentId !== 'all') {
        queryVisits = queryVisits.eq('agent_id', agentId);
      }
      const { data: vData, error: vError } = await queryVisits.select('id');
      if (vError) throw vError;
      countVisits = vData ? vData.length : 0;

      // 4. Update profiles (Agent profile)
      let queryProfiles = supabase.from('profiles').update({ microarea: trimmedNew });
      if (agentId !== 'all') {
        queryProfiles = queryProfiles.eq('id', agentId);
      } else {
        queryProfiles = queryProfiles.eq('microarea', trimmedOld).eq('role', 'Agente');
      }
      const { data: profData, error: profError } = await queryProfiles.select('id');
      if (profError) throw profError;
      countProfiles = profData ? profData.length : 0;

      // Log activity
      const agentLabel = agentId === 'all' ? 'Todos os Agentes' : (selectedAgent?.name || agentId);
      await logActivity(
        currentUser.id,
        'Renomeação de Microárea',
        `Renomeou microárea "${trimmedOld}" para "${trimmedNew}" (${agentLabel}). Afetados: ${countHouseholds} domicílios, ${countPatients} cidadãos, ${countVisits} visitas, ${countProfiles} perfis.`
      );

      setMessage({
        type: 'success',
        text: `Sucesso! Ajustados: ${countHouseholds} domicílios, ${countPatients} cidadãos, ${countVisits} visitas, ${countProfiles} perfis de microárea.`
      });

      fetchData();
      return true;
    } catch (err: any) {
      console.error("Error renaming microarea:", err);
      setMessage({ type: 'error', text: `Erro ao renomear microárea: ${err.message || err}` });
      return false;
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
      toastError("Erro ao publicar campanha. Verifique se a tabela 'campaigns' existe no Supabase.");
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
          <EquipeTab users={users} patients={patients} acsPerformance={acsPerformance} />
        )}

        {/* ABA 2: PREVINE BRASIL */}
        {activeTab === 'previne' && (
          <PrevineTab previneBrasilStats={previneBrasilStats} />
        )}

        {/* ABA 3: GERENCIAR USUÁRIOS */}
        {activeTab === 'usuarios' && (
          <UsuariosTab
            currentUser={currentUser}
            users={users}
            editingUser={editingUser}
            setEditingUser={setEditingUser}
            formData={formData}
            setFormData={setFormData}
            editFormData={editFormData}
            setEditFormData={setEditFormData}
            handleCreateUser={handleCreateUser}
            handleUpdateUser={handleUpdateUser}
            handleDeleteUser={handleDeleteUser}
            handleEditUser={handleEditUser}
            submitting={submitting}
          />
        )}

        {/* ABA 4: REDISTRIBUIÇÃO */}
        {activeTab === 'redistribuicao' && (
          <RedistribuicaoTab
            users={users}
            patients={patients}
            fromAgentId={fromAgentId}
            setFromAgentId={setFromAgentId}
            toAgentId={toAgentId}
            setToAgentId={setToAgentId}
            transferType={transferType}
            setTransferType={setTransferType}
            selectedMicroarea={selectedMicroarea}
            setSelectedMicroarea={setSelectedMicroarea}
            selectedHouseholds={selectedHouseholds}
            setSelectedHouseholds={setSelectedHouseholds}
            householdSearch={householdSearch}
            setHouseholdSearch={setHouseholdSearch}
            transferring={transferring}
            handleTransfer={handleTransfer}
            sourceAgentHouseholds={sourceAgentHouseholds}
            sourceAgentMicroareas={sourceAgentMicroareas}
            filteredHouseholds={filteredHouseholds}
            handleRenameMicroarea={handleRenameMicroarea}
          />
        )}

        {/* ABA 5: CAMPANHAS & DIRETRIZES */}
        {activeTab === 'campanhas' && (
          <CampanhasTab
            currentUser={currentUser}
            campaigns={campaigns}
            campaignForm={campaignForm}
            setCampaignForm={setCampaignForm}
            showNewCampaignModal={showNewCampaignModal}
            setShowNewCampaignModal={setShowNewCampaignModal}
            handleCreateCampaign={handleCreateCampaign}
            handleToggleCampaign={handleToggleCampaign}
          />
        )}

        {/* ABA 6: AUDIT LOGS */}
        {activeTab === 'auditoria' && (
          <AuditoriaTab
            systemLogs={systemLogs}
            logSearch={logSearch}
            setLogSearch={setLogSearch}
            filteredLogs={filteredLogs}
            users={users}
          />
        )}
      </div>
    </div>
  );
}
