import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { syncService } from '../lib/syncService';
import { encryptionService } from '../lib/encryption';
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
  Phone,
  CheckSquare,
  Calendar
} from 'lucide-react';
import { UI_CONFIG } from '../constants';

import { format, isSameDay } from 'date-fns';
import { calculateAge, getAgeInMonths, getAgeNumber, VACCINE_SCHEDULE, formatDate, parseDate, getPatientLastVisitAt } from '../lib/dateUtils';

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
  const [dailyAgenda, setDailyAgenda] = useState<any[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('gestao_acs_daily_agenda');
    if (saved) {
      try {
        const decrypted = encryptionService.decrypt(saved);
        setDailyAgenda(JSON.parse(decrypted || saved));
      } catch {
        setDailyAgenda([]);
      }
    }
  }, []);

  const handleToggleAgenda = (patient: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const isSaved = dailyAgenda.some(item => item.id === patient.id);
    let newAgenda;
    if (isSaved) {
      newAgenda = dailyAgenda.filter(item => item.id !== patient.id);
    } else {
      newAgenda = [...dailyAgenda, { id: patient.id, name: patient.name, done: false }];
    }
    setDailyAgenda(newAgenda);
    const serialized = JSON.stringify(newAgenda);
    const encrypted = encryptionService.encrypt(serialized);
    localStorage.setItem('gestao_acs_daily_agenda', encrypted);
  };

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
        
        // HEALING LOGIC: SINCERELY UPDATE LATENCY AND RECENT VISITS
        try {
          let visitsDataQuery = supabase.from('visits').select('patient_id, date, type');
          if (user.role === 'Gestor') {
            visitsDataQuery = visitsDataQuery.eq('area_color', user.color);
          } else if (user.role !== 'Administrador') {
            visitsDataQuery = visitsDataQuery.eq('agent_id', user.id);
          }
          
          const { data: allVisitsData } = await visitsDataQuery;
          
          const visitsMap: Record<string, string> = {};
          if (allVisitsData) {
            allVisitsData.forEach((v: any) => {
              if (v.patient_id && v.date) {
                const currentDate = visitsMap[v.patient_id];
                const cleanDate = v.date.split('T')[0];
                if (!currentDate || cleanDate > currentDate) {
                  visitsMap[v.patient_id] = cleanDate;
                }
              }
            });
          }

          allData = allData.map(p => {
            const clinicalVisitMax = getPatientLastVisitAt({ ...p, last_visit_at: null });
            const dbVisitMax = visitsMap[p.id] || null;
            
            let trueAcsVisitDateStr = p.last_visit_at ? p.last_visit_at.split('T')[0] : null;
            
            if (clinicalVisitMax) {
              const cleanClinical = clinicalVisitMax.split('T')[0];
              if (!trueAcsVisitDateStr || cleanClinical > trueAcsVisitDateStr) {
                trueAcsVisitDateStr = cleanClinical;
              }
            }
            
            if (dbVisitMax) {
              if (!trueAcsVisitDateStr || dbVisitMax > trueAcsVisitDateStr) {
                trueAcsVisitDateStr = dbVisitMax;
              }
            }

            if (trueAcsVisitDateStr && trueAcsVisitDateStr !== (p.last_visit_at ? p.last_visit_at.split('T')[0] : null)) {
              supabase.from('patients')
                .update({ last_visit_at: trueAcsVisitDateStr })
                .eq('id', p.id)
                .then(({ error }) => {
                  if (error) console.error(`Error syncing last_visit_at for patient ${p.id}:`, error);
                });

              return {
                ...p,
                last_visit_at: trueAcsVisitDateStr
              };
            }
            return p;
          });
        } catch (syncErr) {
          console.error("Error healing patient visit dates:", syncErr);
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

  const isPatientSemDomicilio = (p: any) => {
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
  };

  const availableStreets = Array.from(new Set(patients.map(p => {
    const addr = getPatientAddress(p);
    return addr.address ? addr.address.trim().toUpperCase() : '';
  }).filter(Boolean))).sort();

  const sortPatientsByAddressNumber = (a: any, b: any) => {
    // When a specific street is selected, sort by house number within that street
    if (selectedStreet) {
      const addrA = getPatientAddress(a);
      const addrB = getPatientAddress(b);
      const numA = parseInt((addrA.number || '').replace(/\D/g, ''), 10) || 0;
      const numB = parseInt((addrB.number || '').replace(/\D/g, ''), 10) || 0;
      if (numA !== numB) return numA - numB;
      return (addrA.number || '').localeCompare(addrB.number || '');
    }
    // Default: sort alphabetically by name
    return (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' });
  };

  const filteredPatients = patients.filter(p => {
    const addr = getPatientAddress(p);
    const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.cns?.includes(searchTerm) ||
                         (addr.address && addr.address.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (selectedStreet) {
      if ((addr.address || '').trim().toUpperCase() !== selectedStreet) return false;
    }
    
    if (activeFilter === 'date' && searchParams.get('date')) {
      const targetDate = new Date(searchParams.get('date')!);
      const realLastVisitStr = getPatientLastVisitAt(p);
      const lastVisit = realLastVisitStr ? new Date(realLastVisitStr) : null;
      if (!lastVisit) return false;
      const dueDate = new Date(lastVisit);
      dueDate.setDate(dueDate.getDate() + 30);
      return matchesSearch && isSameDay(targetDate, dueDate);
    }

    // Visitas atrasadas — normalized: canonical key is 'visitas_atrasadas'
    if (activeFilter === 'visitas_atrasadas') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const realLastVisitStr = getPatientLastVisitAt(p);
      const lastVisit = realLastVisitStr ? new Date(realLastVisitStr) : null;
      return matchesSearch && (!lastVisit || lastVisit < thirtyDaysAgo);
    }

    // Bebês com Visita Atrasada (até 6 meses) — canonical key is 'pending_6m'
    if (activeFilter === 'pending_6m') {
      const isChild = p.categories?.includes('Criança');
      if (!isChild || !p.birth_date) return false;
      const ageInMonths = getAgeInMonths(p.birth_date);
      if (ageInMonths > 6) return false;
      // If the 6-month visit was already recorded in the clinical form, do not alert
      if (p.clinical_data?.crianca?.visita6meses) return false;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const realLastVisitStr = getPatientLastVisitAt(p);
      const lastVisit = realLastVisitStr ? new Date(realLastVisitStr) : null;
      return matchesSearch && (!lastVisit || lastVisit < thirtyDaysAgo);
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
      const status = getPrescriptionStatus(p);
      return matchesSearch && (status === 'vencida' || status === 'vencendo');
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

  const getPrescriptionStatus = (p: any): 'vencida' | 'vencendo' | 'ok' => {
    const isMentalOrAcamado = p.categories?.includes('SaudeMental') || p.categories?.includes('AcamadoDomiciliado');
    if (!isMentalOrAcamado) return 'ok';

    const recipes = p.clinical_data?.receitas || [];
    if (recipes.length === 0) return 'ok';
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let status: 'vencida' | 'vencendo' | 'ok' = 'ok';

    for (const rec of recipes) {
      if (!rec.dataVencimento) continue;
      const expiry = new Date(rec.dataVencimento + 'T00:00:00');
      if (isNaN(expiry.getTime())) continue;

      if (expiry < today) {
        status = 'vencida';
        break; // Vencida sempre tem prioridade de alerta máxima
      } else {
        const alertDate = new Date(expiry);
        alertDate.setDate(alertDate.getDate() - 15);
        if (today >= alertDate) {
          status = 'vencendo';
        }
      }
    }

    return status;
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
        <div className="space-y-4">
          {/* Dynamic Search/Filter Stats */}
          {(searchTerm || selectedStreet) && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-teal-50/45 dark:bg-emerald-950/10 border border-teal-100 dark:border-emerald-900/30 p-4 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2 text-teal-800 dark:text-teal-300">
                <Search className="w-4 h-4 text-teal-600 shrink-0" />
                <p className="text-xs font-semibold">
                  Filtrando por: <span className="font-bold text-teal-700 dark:text-teal-400">
                    {selectedStreet ? `Rua: ${selectedStreet}` : ''}
                    {selectedStreet && searchTerm ? ' + ' : ''}
                    {searchTerm ? `Termo: "${searchTerm}"` : ''}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-100 dark:border-slate-800">
                  Resultado: {filteredPatients.length} {filteredPatients.length === 1 ? 'paciente' : 'pacientes'}
                </span>
                {(() => {
                  const householdsCount = (() => {
                    if (selectedStreet) {
                      return Object.values(householdsMap).filter((h: any) => 
                        (h.address || '').trim().toUpperCase() === selectedStreet
                      ).length;
                    }
                    if (searchTerm) {
                      const term = searchTerm.toLowerCase();
                      return Object.values(householdsMap).filter((h: any) => 
                        (h.address || '').toLowerCase().includes(term)
                      ).length;
                    }
                    return 0;
                  })();
                  
                  if (householdsCount === 0 && !selectedStreet) return null;
                  
                  return (
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#0284c7] bg-sky-50 dark:bg-sky-950/20 dark:text-sky-400 border border-sky-100 dark:border-sky-900/30 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                      <Home className="w-3.5 h-3.5" />
                      Domicílios: {householdsCount}
                    </span>
                  );
                })()}
                {(() => {
                  const semDomicilioCount = filteredPatients.filter(isPatientSemDomicilio).length;
                  return (
                    <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                      semDomicilioCount > 0 
                        ? 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/35' 
                        : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                    }`}>
                      <AlertCircle className="w-3.5 h-3.5" />
                      Sem Domicílio: {semDomicilioCount} {semDomicilioCount === 1 ? 'pessoa' : 'pessoas'}
                    </span>
                  );
                })()}
              </div>
            </div>
          )}

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
                      const realVisitAt = getPatientLastVisitAt(p);
                      const isAtraso = !realVisitAt || new Date(realVisitAt) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                      return (
                        <tr 
                          key={p.id} 
                          className="hover:bg-slate-50 transition-all cursor-pointer group"
                          onClick={() => navigate(`/editar-paciente/${p.id}`)}
                        >
                          <td className={`px-8 py-5 border-l-[6px] ${isPatientSemDomicilio(p) ? 'border-l-red-500' : 'border-l-emerald-500'}`}>
                            <div>
                              <div>
                                 <div className="flex items-center gap-2 flex-wrap">
                                   <p className="text-[14px] font-semibold text-text-primary leading-tight group-hover:text-teal-600 transition-colors uppercase">{p.name}</p>
                                   {(() => {
                                     const status = getPrescriptionStatus(p);
                                     if (status === 'vencida') {
                                       return (
                                         <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/40 text-[9px] font-bold uppercase rounded-md animate-pulse shrink-0 tracking-wider">
                                           <AlertCircle className="w-3 h-3 text-red-600 dark:text-red-400" />
                                           Receita Vencida
                                         </span>
                                       );
                                     }
                                     if (status === 'vencendo') {
                                       return (
                                         <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40 text-[9px] font-bold uppercase rounded-md animate-pulse shrink-0 tracking-wider">
                                           <AlertCircle className="w-3 h-3 text-amber-605 dark:text-amber-400" />
                                           Receita Vencendo
                                         </span>
                                       );
                                     }
                                     return null;
                                   })()}
                                 </div>
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

                            {/* Indicador de Pré-Natal e Visita ACS para Gestantes */}
                            {(() => {
                              if (!p.categories?.includes('Gestante')) return null;
                              const g = p.clinical_data?.gestante || {};
                              const validConsultas = g.consultas?.filter((c: string) => c && c.trim() !== '').length || 0;
                              const validVisitas = g.visitasAcs?.filter((v: string) => v && v.trim() !== '').length || 0;
                              const pctCol = validConsultas >= 9 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-pink-50 text-pink-600 border-pink-100 dark:bg-pink-950/20 dark:text-pink-400 dark:border-pink-900/35';
                              const pctVis = validVisitas >= 3 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/35';
                              return (
                                <>
                                  <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight border ${pctCol}`}>
                                    Pré-Natal: {validConsultas}/9
                                  </span>
                                  <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight border ${pctVis}`}>
                                    Visitas ACS: {validVisitas}/3
                                  </span>
                                </>
                              );
                            })()}

                            {/* Indicador de Visita de 6 Meses para Bebês */}
                            {(() => {
                              if (!p.categories?.includes('Criança') || !p.birth_date) return null;
                              const ageInMonths = getAgeInMonths(p.birth_date);
                              if (ageInMonths > 6) return null;
                              const tem6m = !!p.clinical_data?.crianca?.visita6meses;
                              return (
                                <span
                                  className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight border ${
                                    tem6m
                                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                      : 'bg-amber-50 text-amber-600 border-amber-100 animate-pulse'
                                  }`}
                                >
                                  {tem6m ? '6m Realizada' : '6m Pendente'}
                                </span>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="px-8 py-5">
                           <span className="text-[12px] font-semibold text-slate-600">{p.birth_date ? `${calculateAge(p.birth_date)}` : 'N/A'}</span>
                        </td>
                        <td className="px-8 py-5 text-center">
                          {isAtraso ? (
                            <span 
                              className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white font-extrabold text-sm shadow-sm" 
                              title="Visita em Atraso"
                            >
                              !
                            </span>
                          ) : (
                            <span className="block w-6 h-6 mx-auto" aria-hidden="true" />
                          )}
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={(e) => handleToggleAgenda(p, e)}
                              className={`p-2 rounded-lg transition-all ${
                                dailyAgenda.some(item => item.id === p.id)
                                  ? 'text-teal-600 bg-teal-50 dark:bg-teal-950/30'
                                  : 'text-text-muted hover:text-teal-600 bg-slate-50 hover:bg-teal-50 dark:bg-slate-800/40 dark:hover:bg-slate-800'
                              }`}
                              title={dailyAgenda.some(item => item.id === p.id) ? "Remover do Roteiro do Dia" : "Adicionar ao Roteiro do Dia"}
                            >
                              <CheckSquare className="w-4.5 h-4.5" />
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
                  className={`p-4 space-y-3 border-l-[6px] active:bg-slate-50 transition-colors ${
                    isPatientSemDomicilio(p) ? 'border-l-red-500' : 'border-l-emerald-500'
                  }`}
                  onClick={() => navigate(`/editar-paciente/${p.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-text-primary dark:text-white leading-tight">{p.name}</h4>
                          {(() => {
                            const realVisitAtMobile = getPatientLastVisitAt(p);
                            const isAtrasoMobile = !realVisitAtMobile || new Date(realVisitAtMobile) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                            return isAtrasoMobile ? (
                              <span 
                                className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white font-black text-[10px] shadow-sm shrink-0" 
                                title="Visita em Atraso"
                              >
                                !
                              </span>
                            ) : null;
                          })()}
                        </div>
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
                        onClick={(e) => handleToggleAgenda(p, e)}
                        className={`p-2 rounded-lg transition-all ${
                          dailyAgenda.some(item => item.id === p.id)
                            ? 'text-teal-600 bg-teal-50 dark:bg-teal-950/30'
                            : 'text-text-muted hover:text-teal-600 bg-slate-50 dark:bg-slate-800/40 hover:bg-teal-50'
                        }`}
                        title={dailyAgenda.some(item => item.id === p.id) ? "Remover do Roteiro do Dia" : "Adicionar ao Roteiro do Dia"}
                      >
                        <CheckSquare className="w-4 h-4" />
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

                    {!getPatientLastVisitAt(p) && (
                      <span className="px-1.5 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded text-[9px] font-semibold uppercase whitespace-nowrap">Visita Pendente</span>
                    )}

                    {/* Indicador de Pré-Natal e Visita ACS para Gestantes (mobile) */}
                    {(() => {
                      if (!p.categories?.includes('Gestante')) return null;
                      const g = p.clinical_data?.gestante || {};
                      const validConsultas = g.consultas?.filter((c: string) => c && c.trim() !== '').length || 0;
                      const validVisitas = g.visitasAcs?.filter((v: string) => v && v.trim() !== '').length || 0;
                      const pctCol = validConsultas >= 9 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-pink-50 text-pink-600 border-pink-100 dark:bg-pink-950/20 dark:text-pink-400 dark:border-pink-900/35';
                      const pctVis = validVisitas >= 3 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/35';
                      return (
                        <>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase whitespace-nowrap border ${pctCol}`}>
                            Pré-Natal: {validConsultas}/9
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase whitespace-nowrap border ${pctVis}`}>
                            ACS: {validVisitas}/3
                          </span>
                        </>
                      );
                    })()}

                    {/* Indicador de Visita de 6 Meses para Bebês (mobile) */}
                    {(() => {
                      if (!p.categories?.includes('Criança') || !p.birth_date) return null;
                      const ageInMonths = getAgeInMonths(p.birth_date);
                      if (ageInMonths > 6) return null;
                      const tem6m = !!p.clinical_data?.crianca?.visita6meses;
                      return (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase whitespace-nowrap border ${
                            tem6m
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                              : 'bg-amber-50 text-amber-600 border-amber-100 animate-pulse'
                          }`}
                        >
                          {tem6m ? '6m ✓' : '6m Pendente'}
                        </span>
                      );
                    })()}
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

