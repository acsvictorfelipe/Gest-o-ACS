import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { syncService } from '../lib/syncService';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  User, 
  Search, 
  ChevronRight, 
  ChevronDown,
  MapPin, 
  Plus,
  Loader2,
  Baby,
  Stethoscope,
  Activity,
  HeartPulse,
  Pencil,
  Copy,
  Check,
  Filter,
  X,
  Trash2,
  AlertTriangle,
  AlertCircle,
  Smile,
  Bed,
  ArrowLeft,
  CheckCircle,
  ShieldAlert,
  Heart,
  Home,
  MessageCircle,
  Phone
} from 'lucide-react';
import { UI_CONFIG } from '../constants';

import { format, isSameDay } from 'date-fns';
import { calculateAge, getAgeInMonths, getAgeNumber, VACCINE_SCHEDULE, formatDate, parseDate } from '../lib/dateUtils';

export function PatientList({ user }: { user: any }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState(searchParams.get('filter') || 'all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [householdsMap, setHouseholdsMap] = useState<Record<string, { address: string; number: string; complement: string }>>({});
  const [selectedStreet, setSelectedStreet] = useState('');

  useEffect(() => {
    const filter = searchParams.get('filter');
    const search = searchParams.get('search');
    if (filter) {
      setActiveFilter(filter);
    }
    if (search) {
      setSearchTerm(search);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchPatients = async () => {
      if (!user.microarea && user.role !== 'Administrador' && user.role !== 'Gestor') return;
      setLoading(true);
      try {
        // Fetch Households first for address mapping
        const { data: hData } = await supabase
          .from('households')
          .select('id, address, number, complement');
        
        if (hData) {
          const map: Record<string, any> = {};
          hData.forEach(h => {
            map[h.id] = {
              address: h.address || '',
              number: h.number || '',
              complement: h.complement || ''
            };
          });
          setHouseholdsMap(map);
        }

        let allData: any[] = [];
        let from = 0;
        let to = 999;
        let hasMore = true;

        while (hasMore && allData.length < 10000) {
          let query = supabase
            .from('patients')
            .select('*')
            .order('name', { ascending: true })
            .range(from, to);

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
        
        setPatients(allData);
      } catch (error) {
        console.error("Error fetching patients:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, [user.microarea, user.id, user.role, user.color]);

  const getPatientAddress = (p: any) => {
    if (p.household_id && householdsMap[p.household_id]) {
      return householdsMap[p.household_id];
    }
    const clinical = p.clinical_data || {};
    return {
      address: clinical.address || '',
      number: clinical.number || '',
      complement: clinical.complement || ''
    };
  };

  const availableStreets = Array.from(new Set(patients.map(p => {
    const addr = getPatientAddress(p);
    return addr.address ? addr.address.trim() : '';
  }).filter(Boolean))).sort();

  const sortPatientsByAddressNumber = (a: any, b: any) => {
    const addrA = getPatientAddress(a);
    const addrB = getPatientAddress(b);
    
    if (!selectedStreet) {
      const streetComp = (addrA.address || '').localeCompare(addrB.address || '');
      if (streetComp !== 0) return streetComp;
    }
    
    const numA = parseInt((addrA.number || '').replace(/\D/g, ''), 10) || 0;
    const numB = parseInt((addrB.number || '').replace(/\D/g, ''), 10) || 0;
    
    if (numA !== numB) return numA - numB;
    return (addrA.number || '').localeCompare(addrB.number || '');
  };

  const filteredPatients = patients.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.cns?.includes(searchTerm);
    
    if (selectedStreet) {
      const addr = getPatientAddress(p);
      if (addr.address !== selectedStreet) return false;
    }
    
    if (activeFilter === 'date' && searchParams.get('date')) {
      const targetDate = new Date(searchParams.get('date')!);
      const lastVisit = p.last_visit_at ? new Date(p.last_visit_at) : null;
      if (!lastVisit) return false;
      const dueDate = new Date(lastVisit);
      dueDate.setDate(dueDate.getDate() + 30);
      return matchesSearch && isSameDay(targetDate, dueDate);
    }

    // Visitas atrasadas — normalized: canonical key is 'visitas_atrasadas'
    if (activeFilter === 'visitas_atrasadas') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const lastVisit = p.last_visit_at ? new Date(p.last_visit_at) : null;
      return matchesSearch && (!lastVisit || lastVisit < thirtyDaysAgo);
    }

    // Visita de 6 meses pendente — canonical key is 'pending_6m'
    if (activeFilter === 'pending_6m') {
      const isChild = p.categories?.includes('Criança');
      if (!isChild || !p.birth_date) return false;
      const ageInMonths = getAgeInMonths(p.birth_date);
      const alreadyVisited = p.clinical_data?.crianca?.visita6meses === 'Sim';
      return matchesSearch && ageInMonths <= 6 && !alreadyVisited;
    }

    // Vacinas atrasadas — canonical key is 'vacinas_atrasadas'
    if (activeFilter === 'vacinas_atrasadas') {
      const isChild = p.categories?.includes('Criança');
      if (!isChild) return false;
      const ageInMonths = p.birth_date ? getAgeInMonths(p.birth_date) : 0;
      if (ageInMonths > 24) return false;
      const vaccines = p.clinical_data?.crianca?.vacinas || {};
      const hasPendingVaccine = VACCINE_SCHEDULE.some(group => {
        if (group.age <= ageInMonths) {
          return group.vaccines.some(v => vaccines[v.id] !== 'Sim');
        }
        return false;
      });
      return matchesSearch && hasPendingVaccine;
    }

    // Crianças — canonical key is 'criancas'
    if (activeFilter === 'criancas') {
      const isChild = p.categories?.includes('Criança');
      if (!isChild) return false;
      const ageInMonths = p.birth_date ? getAgeInMonths(p.birth_date) : 0;
      return matchesSearch && ageInMonths < 144; // up to 12 years
    }

    if (activeFilter === 'gestantes') return matchesSearch && p.categories?.includes('Gestante');
    if (activeFilter === 'acamados') return matchesSearch && p.categories?.includes('AcamadoDomiciliado');

    // Idosos — canonical key is 'idosos'
    if (activeFilter === 'idosos') {
      return matchesSearch && (p.categories?.includes('Idoso') || p.categories?.includes('Idosos'));
    }

    if (activeFilter === 'adultos') return matchesSearch && p.categories?.includes('Adulto');
    if (activeFilter === 'saudemental') return matchesSearch && p.categories?.includes('SaudeMental');

    if (activeFilter === 'hipertensos') {
      const clinical = p.clinical_data || {};
      return matchesSearch && (
        clinical.chronic?.hipertensao === 'Sim' ||
        clinical.gestante?.hipertensao === 'Sim' ||
        clinical.gestante?.pressaoAlta === 'Sim' || 
        clinical.acamadodomiciliado?.hipertensao === 'Sim' ||
        clinical.acamadodomiciliado?.pressaoAlta === 'Sim' || 
        clinical.adulto?.hipertensao === 'Sim' ||
        clinical.adulto?.pressaoAlta === 'Sim' || 
        clinical.idoso?.hipertensao === 'Sim' ||
        clinical.idoso?.pressaoAlta === 'Sim'
      );
    }

    if (activeFilter === 'diabeticos') {
      const clinical = p.clinical_data || {};
      return matchesSearch && (
        clinical.chronic?.diabetes === 'Sim' ||
        clinical.gestante?.diabetes === 'Sim' || 
        clinical.acamadodomiciliado?.diabetes === 'Sim' || 
        clinical.adulto?.diabetes === 'Sim' || 
        clinical.idoso?.diabetes === 'Sim'
      );
    }

    if (activeFilter === 'receitas_vencendo') {
      if (!p.categories?.includes('AcamadoDomiciliado')) return false;
      const clinical = p.clinical_data || {};
      if (clinical.acamadodomiciliado?.dataReceita && clinical.acamadodomiciliado?.validadeReceita) {
        const dataReceita = new Date(clinical.acamadodomiciliado.dataReceita);
        const validadeDias = parseInt(clinical.acamadodomiciliado.validadeReceita, 10);
        if (!isNaN(dataReceita.getTime()) && !isNaN(validadeDias)) {
          const dataVencimento = new Date(dataReceita);
          dataVencimento.setDate(dataVencimento.getDate() + validadeDias);
          
          const dataAlerta = new Date(dataVencimento);
          dataAlerta.setDate(dataAlerta.getDate() - 15);
          
          const hoje = new Date();
          return matchesSearch && hoje >= dataAlerta;
        }
      }
      return false;
    }

    return matchesSearch;
  });

  const clearFilter = () => {
    setActiveFilter('all');
    setSearchParams({});
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      const patient = patients.find(p => p.id === deleteConfirm);
      
      if (!navigator.onLine) {
        if (patient?.is_family_responsible) {
          await syncService.addToQueue('households', 'UPDATE', {
            id: patient.household_id,
            responsible_name: 'Responsável não cadastrado'
          });
        }
        // Queue visit deletion by patient_id
        await syncService.addToQueue('visits', 'DELETE', { filter: { patient_id: deleteConfirm } });
        // Queue patient deletion
        await syncService.addToQueue('patients', 'DELETE', { id: deleteConfirm });
        
        setPatients(patients.filter(p => p.id !== deleteConfirm));
        setDeleteConfirm(null);
        alert('Exclusão agendada para sincronização.');
        return;
      }

      // 1. If this patient is the responsible, update household
      if (patient?.is_family_responsible && patient.household_id) {
        const { error: hError } = await supabase
          .from('households')
          .update({ 
            responsible_name: 'Responsável não cadastrado'
          })
          .eq('id', patient.household_id);
        if (hError) console.error("Error updating household during delete:", hError);
      }

      // 2. First delete visits related to this patient
      const { error: vError } = await supabase
        .from('visits')
        .delete()
        .eq('patient_id', deleteConfirm);
      
      if (vError) throw vError;

      // 3. Then delete the patient
      const { error: pError } = await supabase
        .from('patients')
        .delete()
        .eq('id', deleteConfirm);

      if (pError) throw pError;

      setPatients(patients.filter(p => p.id !== deleteConfirm));
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Error deleting patient:", error);
      alert("Erro ao excluir paciente.");
    } finally {
      setDeleting(false);
    }
  };

  const copyToClipboard = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    // Optional: show a temporary toast or change icon
  };

  const handleWhatsApp = (e: React.MouseEvent, phone: string) => {
    e.stopPropagation();
    if (!phone) return;
    const cleanNumber = phone.replace(/\D/g, '');
    if (cleanNumber.length < 10) return;
    const finalNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;
    window.open(`https://wa.me/${finalNumber}`, '_blank');
  };

  const getCategoryIcon = (categories: string[]) => {
    if (categories?.includes('Gestante')) return <UI_CONFIG.categorias.gestantes.icon className="w-4 h-4" style={{ color: UI_CONFIG.categorias.gestantes.primary }} />;
    if (categories?.includes('Criança')) return <UI_CONFIG.categorias.criancas.icon className="w-4 h-4" style={{ color: UI_CONFIG.categorias.criancas.primary }} />;
    if (categories?.includes('Idoso')) return <UI_CONFIG.categorias.idosos.icon className="w-4 h-4" style={{ color: UI_CONFIG.categorias.idosos.primary }} />;
    if (categories?.includes('Hipertensos')) return <UI_CONFIG.categorias.hipertensos.icon className="w-4 h-4" style={{ color: UI_CONFIG.categorias.hipertensos.primary }} />;
    if (categories?.includes('Diabéticos')) return <UI_CONFIG.categorias.diabeticos.icon className="w-4 h-4" style={{ color: UI_CONFIG.categorias.diabeticos.primary }} />;
    return <UI_CONFIG.categorias.outros.icon className="w-4 h-4" style={{ color: UI_CONFIG.categorias.outros.primary }} />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <header className="flex flex-col gap-1">
          <h2 className="text-2xl font-headline font-bold tracking-tight text-text-primary leading-none">
            {activeFilter === 'gestantes' ? 'Gestantes' :
             activeFilter === 'criancas' || activeFilter === 'crianças' ? 'Crianças' :
             activeFilter === 'idosos' ? 'Idosos' :
             activeFilter === 'acamados' ? 'Acamados / Domiciliados' :
             activeFilter === 'hipertensos' ? 'Hipertensos' :
             activeFilter === 'diabeticos' || activeFilter === 'diabéticos' ? 'Diabéticos' :
             activeFilter === 'adultos' ? 'Adultos' :
             activeFilter === 'saudemental' || activeFilter === 'saude-mental' ? 'Saúde Mental' :
             activeFilter === 'bebes-pendentes' ? 'Bebês com Visitas Pendentes' :
             activeFilter === 'visitas-atraso' ? 'Visitas em Atraso' :
             activeFilter === 'receitas_vencendo' ? 'Receitas a Vencer' :
             'Pacientes'}
          </h2>
          <p className="text-[12px] text-slate-500 font-medium mt-1">Gerencie os atendimentos e registros da sua microárea.</p>
        </header>
        <button 
          onClick={() => navigate('/novo-cadastro')}
          className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white rounded-xl font-semibold shadow-md shadow-teal-600/20 hover:bg-teal-700 transition-all text-sm"
        >
          <Plus className="w-5 h-5" />
          Novo Cadastro
        </button>
      </div>

      {/* Search Bar & Filters */}
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row gap-3 flex-1 max-w-2xl">
            <div className="relative group flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-teal-600 transition-colors" />
              <input 
                type="text" 
                placeholder="Pesquisar por nome ou CNS..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-bg-secondary border border-border rounded-xl py-3 pl-11 pr-6 shadow-sm focus:ring-2 focus:ring-teal-600/10 focus:border-teal-600/30 transition-all text-[13px] font-medium text-slate-900 dark:text-white"
              />
            </div>

            {/* Roteiro por Rua Dropdown Select */}
            <div className="relative min-w-[220px]">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-600 shrink-0" />
              <select
                value={selectedStreet}
                onChange={(e) => setSelectedStreet(e.target.value)}
                className="w-full bg-bg-secondary border border-border rounded-xl py-3 pl-11 pr-10 shadow-sm focus:ring-2 focus:ring-teal-600/10 focus:border-teal-600/30 transition-all text-[13px] font-bold text-slate-800 dark:text-white appearance-none cursor-pointer"
              >
                <option value="">🗺️ Roteiro por Rua (Todos)</option>
                {availableStreets.map(street => (
                  <option key={street} value={street}>{street}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

           <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1">
             {[
               { id: 'all', label: 'Todos' },
               { id: 'gestantes', label: 'Gestantes' },
               { id: 'criancas', label: 'Crianças' },
               { id: 'idosos', label: 'Idosos' },
               { id: 'hipertensos', label: 'Hipertensos' },
               { id: 'diabéticos', label: 'Diabéticos' },
               { id: 'acamados', label: 'Acamados' },
               { id: 'receitas_vencendo', label: 'Receitas a Vencer' },
             ].map((f) => (
               <button
                 key={f.id}
                 onClick={() => setActiveFilter(f.id)}
                 className={`px-4 py-2 rounded-xl text-[12px] font-semibold whitespace-nowrap transition-all ${
                   activeFilter === f.id 
                     ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20' 
                     : 'bg-white text-slate-500 border border-border hover:border-slate-200'
                 }`}
               >
                 {f.label}
               </button>
             ))}
           </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-3 text-[#14B8A6]" />
          <p className="text-sm font-medium">Carregando dados...</p>
        </div>
      ) : (
        <div className="bg-bg-secondary rounded-3xl border border-border overflow-hidden shadow-sm shadow-slate-100">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-bg-primary/50">
                  <th className="px-8 py-5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Paciente</th>
                  <th className="px-8 py-5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Monitoramento</th>
                  <th className="px-8 py-5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Idade</th>
                  <th className="px-8 py-5 text-[10px] font-semibold uppercase tracking-wider text-text-muted text-center">Situação</th>
                  <th className="px-8 py-5 text-[10px] font-semibold uppercase tracking-wider text-text-muted text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredPatients.length > 0 ? (
                  [...filteredPatients]
                    .sort(sortPatientsByAddressNumber)
                    .map((p) => {
                      const isAtraso = !p.last_visit_at || new Date(p.last_visit_at) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                      return (
                        <tr 
                          key={p.id} 
                          className="hover:bg-slate-50 transition-all cursor-pointer group"
                          onClick={() => navigate(`/editar-paciente/${p.id}`)}
                        >
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs group-hover:bg-teal-600 group-hover:text-white transition-all uppercase shadow-sm">
                                {p.name?.substring(0, 2)}
                              </div>
                              <div>
                                 <p className="text-[14px] font-semibold text-text-primary leading-tight group-hover:text-teal-600 transition-colors uppercase">{p.name}</p>
                                 <div className="flex items-center gap-3 mt-1">
                                   <p className="text-[11px] text-text-muted font-medium">{p.cns ? p.cns.replace(/(\d{3})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4') : 'Sem CNS'}</p>
                                   {p.clinical_data?.contact && (
                                     <button 
                                       onClick={(e) => handleWhatsApp(e, p.clinical_data.contact)}
                                       className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors border border-emerald-100"
                                     >
                                       <MessageCircle className="w-3 h-3" />
                                       <span className="text-[9px] font-bold uppercase">WhatsApp</span>
                                     </button>
                                   )}
                                 </div>
                                 <p className="text-[11px] text-teal-600 dark:text-teal-400 font-bold mt-1.5 uppercase flex items-center gap-1 bg-teal-50/50 dark:bg-teal-950/20 px-2 py-0.5 rounded-md w-fit border border-teal-100/50 dark:border-teal-900/30">
                                   <MapPin className="w-3.5 h-3.5 shrink-0 text-teal-500" />
                                   {(() => {
                                     const addr = getPatientAddress(p);
                                     return addr.address ? `${addr.address}, ${addr.number}${addr.complement ? ` - ${addr.complement}` : ''}` : 'Sem endereço';
                                   })()}
                                 </p>
                              </div>
                            </div>
                          </td>
                        <td className="px-8 py-5">
                          <div className="flex flex-wrap gap-1.5">
                            {(() => {
                              const age = p.birth_date ? calculateAge(p.birth_date) : 0;
                              const ageNum = typeof age === 'number' ? age : parseInt(String(age));
                              const ageInMonths = p.birth_date ? getAgeInMonths(p.birth_date) : 0;
                              const displayCategories = [...(p.categories || [])];
                              
                              if (ageNum >= 60 && !displayCategories.includes('Idoso')) {
                                displayCategories.push('Idoso');
                              }
                              if (ageInMonths > 24 && ageNum < 60 && !displayCategories.includes('Adulto')) {
                                displayCategories.push('Adulto');
                              }
                              if (ageInMonths <= 24 && !displayCategories.includes('Criança')) {
                                displayCategories.push('Criança');
                              }

                              return displayCategories.slice(0, 4).map((cat: string) => {
                                const catMap: Record<string, { primary: string; label: string }> = {
                                  'Gestante':            { primary: '#EC4899', label: 'Gestante' },
                                  'Criança':             { primary: '#3B82F6', label: 'Criança' },
                                  'Idoso':               { primary: '#F97316', label: 'Idoso' },
                                  'Adulto':              { primary: '#10B981', label: 'Adulto' },
                                  'AcamadoDomiciliado':  { primary: '#64748B', label: 'Acamado' },
                                  'SaudeMental':         { primary: '#6366F1', label: 'S. Mental' },
                                };
                                const matched = catMap[cat];
                                if (!matched) return null;
                                return (
                                  <span 
                                    key={cat} 
                                    className="px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight text-white" 
                                    style={{ backgroundColor: matched.primary }}
                                  >
                                    {matched.label}
                                  </span>
                                );
                              });
                            })()}
                            
                            {/* Clinical Indicators */}
                            {(p.clinical_data?.chronic?.hipertensao === 'Sim' || p.clinical_data?.adulto?.hipertensao === 'Sim' || p.clinical_data?.idoso?.hipertensao === 'Sim') && (
                              <span 
                                className="px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight text-white" 
                                style={{ backgroundColor: '#EF4444' }}
                              >
                                Hipertenso
                              </span>
                            )}
                            {(p.clinical_data?.chronic?.diabetes === 'Sim' || p.clinical_data?.adulto?.diabetes === 'Sim' || p.clinical_data?.idoso?.diabetes === 'Sim') && (
                              <span 
                                className="px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight text-white" 
                                style={{ backgroundColor: '#8B5CF6' }}
                              >
                                Diabético
                              </span>
                            )}
                            {p.categories?.includes('SaudeMental') && (
                              <span 
                                className="px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight text-white" 
                                style={{ backgroundColor: '#6366F1' }}
                              >
                                S. Mental
                              </span>
                            )}
                            {(() => {
                              if (!p.categories?.includes('AcamadoDomiciliado')) return null;
                              const clinical = p.clinical_data || {};
                              if (clinical.acamadodomiciliado?.dataReceita && clinical.acamadodomiciliado?.validadeReceita) {
                                const dataReceita = new Date(clinical.acamadodomiciliado.dataReceita);
                                const validadeDias = parseInt(clinical.acamadodomiciliado.validadeReceita, 10);
                                if (!isNaN(dataReceita.getTime()) && !isNaN(validadeDias)) {
                                  const dataVencimento = new Date(dataReceita);
                                  dataVencimento.setDate(dataVencimento.getDate() + validadeDias);
                                  
                                  const dataAlerta = new Date(dataVencimento);
                                  dataAlerta.setDate(dataAlerta.getDate() - 15);
                                  
                                  const hoje = new Date();
                                  if (hoje >= dataAlerta) {
                                    return (
                                      <span 
                                        className="px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight text-white animate-pulse shadow-sm" 
                                        style={{ backgroundColor: '#A855F7' }}
                                      >
                                        Receita Vencendo
                                      </span>
                                    );
                                  }
                                }
                              }
                              return null;
                            })()}
                          </div>
                        </td>
                        <td className="px-8 py-5">
                           <span className="text-[12px] font-semibold text-slate-600">{p.birth_date ? `${calculateAge(p.birth_date)}` : 'N/A'}</span>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-md border ${
                            !isAtraso 
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                              : 'bg-orange-50 text-orange-600 border-orange-100'
                          }`}>
                            {!isAtraso ? 'Em dia' : 'Atraso'}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                             <button 
                               onClick={(e) => {
                                 e.stopPropagation();
                                 if (p.household_id) {
                                   navigate(`/domicilio/${p.household_id}`);
                                 }
                               }}
                               className={`p-2 rounded-lg transition-all ${
                                 !p.household_id || (p.cns === p.clinical_data?.responsible_cns && !p.is_family_responsible)
                                   ? 'text-red-600 bg-red-50 hover:bg-red-100 ring-2 ring-red-600/30' 
                                   : p.is_family_responsible
                                     ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 ring-2 ring-emerald-600/30'
                                     : 'text-text-muted hover:text-teal-600 bg-slate-50 hover:bg-teal-50'
                               }`}
                               title={!p.household_id ? "Sem Domicílio" : p.is_family_responsible ? "Responsável Familiar" : "Membro da Família"}
                             >
                               <Home className={`w-4.5 h-4.5 ${(!p.household_id || (p.cns === p.clinical_data?.responsible_cns && !p.is_family_responsible)) ? 'animate-pulse' : ''}`} />
                             </button>
                             <div className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 group-hover:text-teal-600 transition-colors">
                               <ChevronRight className="w-5 h-5 translate-x-0 group-hover:translate-x-1 transition-transform" />
                             </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-8 py-24 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <User className="w-10 h-10 text-slate-200" />
                        <p className="text-sm font-semibold text-text-muted">Nenhum cidadão encontrado.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {filteredPatients.length > 0 ? (
              [...filteredPatients]
                .sort(sortPatientsByAddressNumber)
                .map((p) => (
                <div 
                  key={p.id} 
                  className="p-4 space-y-3 active:bg-slate-50 transition-colors"
                  onClick={() => navigate(`/editar-paciente/${p.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-semibold text-sm uppercase">
                        {p.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-text-primary dark:text-white leading-tight">{p.name}</h4>
                        <div className="flex flex-col gap-1 mt-1">
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] text-text-muted font-medium uppercase tracking-tight">CNS: {p.cns}</p>
                            {p.cns && (
                              <button 
                                onClick={(e) => copyToClipboard(p.cns, e)}
                                className="p-1 rounded"
                              >
                                <Copy className="w-3 h-3 text-text-muted" />
                              </button>
                            )}
                          </div>
                          {p.birth_date && (
                            <div className="flex items-center gap-2">
                              <p className="text-[10px] text-text-muted font-medium uppercase tracking-tight">Nasc: {formatDate(p.birth_date)}</p>
                              <button 
                                onClick={(e) => copyToClipboard(formatDate(p.birth_date), e)}
                                className="p-1 rounded"
                              >
                                <Copy className="w-3 h-3 text-text-muted" />
                              </button>
                            </div>
                          )}
                          <p className="text-[10px] text-teal-600 dark:text-teal-400 font-bold mt-1.5 uppercase flex items-center gap-1 bg-teal-50/50 dark:bg-teal-950/20 px-2 py-0.5 rounded-md w-fit border border-teal-100/50 dark:border-teal-900/30">
                            <MapPin className="w-3.5 h-3.5 shrink-0 text-teal-500" />
                            {(() => {
                              const addr = getPatientAddress(p);
                              return addr.address ? `${addr.address}, ${addr.number}${addr.complement ? ` - ${addr.complement}` : ''}` : 'Sem endereço';
                            })()}
                          </p>
                          </div>
                          {p.clinical_data?.contact && (
                            <button 
                              onClick={(e) => handleWhatsApp(e, p.clinical_data.contact)}
                              className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500 text-white shadow-sm shadow-emerald-500/20 active:scale-95 transition-all w-fit"
                            >
                              <MessageCircle className="w-4 h-4" />
                              <span className="text-[11px] font-bold uppercase">WhatsApp</span>
                            </button>
                          )}
                        </div>
                      </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (p.household_id) {
                            navigate(`/domicilio/${p.household_id}`);
                          }
                        }}
                        className={`p-2 rounded-lg transition-all ${
                          !p.household_id || (p.cns === p.clinical_data?.responsible_cns && !p.is_family_responsible)
                            ? 'text-red-600 bg-red-50 ring-2 ring-red-500/30' 
                            : p.is_family_responsible
                              ? 'text-emerald-600 bg-emerald-50 ring-2 ring-emerald-500/30'
                              : 'text-teal-600 bg-teal-50'
                        }`}
                        title={!p.household_id ? "Sem Domicílio" : p.is_family_responsible ? "Responsável" : "Membro"}
                      >
                        <Home className={`w-4 h-4 ${(!p.household_id || (p.cns === p.clinical_data?.responsible_cns && !p.is_family_responsible)) ? 'animate-pulse' : ''}`} />
                      </button>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {(() => {
                      const age = p.birth_date ? calculateAge(p.birth_date) : 0;
                      const ageNum = typeof age === 'number' ? age : parseInt(String(age));
                      const ageInMonths = p.birth_date ? getAgeInMonths(p.birth_date) : 0;
                      const displayCategories = [...(p.categories || [])];
                      
                      if (ageNum >= 60 && !displayCategories.includes('Idoso')) {
                        displayCategories.push('Idoso');
                      }
                      if (ageInMonths > 24 && ageNum < 60 && !displayCategories.includes('Adulto')) {
                        displayCategories.push('Adulto');
                      }
                      if (ageInMonths <= 24 && !displayCategories.includes('Criança')) {
                        displayCategories.push('Criança');
                      }

                      return displayCategories.map((cat: string) => {
                        const catMap: Record<string, { primary: string; label: string }> = {
                          'Gestante':            { primary: '#EC4899', label: 'Gestante' },
                          'Criança':             { primary: '#3B82F6', label: 'Criança' },
                          'Idoso':               { primary: '#F97316', label: 'Idoso' },
                          'Adulto':              { primary: '#10B981', label: 'Adulto' },
                          'AcamadoDomiciliado':  { primary: '#64748B', label: 'Acamado' },
                          'SaudeMental':         { primary: '#6366F1', label: 'S. Mental' },
                        };
                        const matched = catMap[cat];
                        if (!matched) return null;
                        return (
                          <span key={cat}
                            className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase whitespace-nowrap text-white"
                            style={{ backgroundColor: matched.primary }}
                          >
                            {matched.label}
                          </span>
                        );
                      });
                    })()}
                    
                    {/* clinical indicators */}
                    {(p.clinical_data?.chronic?.hipertensao === 'Sim' || p.clinical_data?.adulto?.hipertensao === 'Sim' || p.clinical_data?.idoso?.hipertensao === 'Sim') && (
                      <span 
                        className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase whitespace-nowrap text-white"
                        style={{ backgroundColor: '#EF4444' }}
                      >
                        Hipertenso
                      </span>
                    )}
                    {(p.clinical_data?.chronic?.diabetes === 'Sim' || p.clinical_data?.adulto?.diabetes === 'Sim' || p.clinical_data?.idoso?.diabetes === 'Sim') && (
                      <span 
                        className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase whitespace-nowrap text-white"
                        style={{ backgroundColor: '#8B5CF6' }}
                      >
                        Diabético
                      </span>
                    )}
                    {p.categories?.includes('SaudeMental') && (
                      <span 
                        className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase whitespace-nowrap italic border"
                        style={{ 
                          backgroundColor: `color-mix(in srgb, #A855F7, transparent 90%)`, 
                          color: '#A855F7', 
                          borderColor: `color-mix(in srgb, #A855F7, transparent 70%)` 
                        }}
                      >
                        S.M
                      </span>
                    )}

                    {!p.last_visit_at && (
                      <span className="px-1.5 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded text-[9px] font-semibold uppercase whitespace-nowrap">Visita Pendente</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="px-8 py-12 text-center text-slate-400 text-sm font-medium">
                Nenhum cidadão encontrado.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-bg-secondary dark:bg-slate-900 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-border dark:border-slate-800 animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400">
                <AlertTriangle className="w-8 h-8" />
              </div>
              
              <div className="space-y-1">
                <h3 className="text-xl font-semibold text-on-surface font-headline">Excluir Cadastro?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Esta ação é irreversível. Todos os dados do paciente e seu histórico de visitas serão removidos permanentemente.
                </p>
              </div>

              <div className="flex flex-col w-full gap-2">
                <button 
                  onClick={handleDelete}
                  disabled={deleting}
                  className="w-full py-3 bg-red-600 text-white rounded-xl font-semibold shadow-sm hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    'Sim, Excluir Cadastro'
                  )}
                </button>
                <button 
                  onClick={() => setDeleteConfirm(null)}
                  disabled={deleting}
                  className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

