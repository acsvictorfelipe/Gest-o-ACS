import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { syncService } from '../lib/syncService';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { 
  Save, 
  X, 
  Baby, 
  HeartPulse, 
  Activity, 
  Stethoscope,
  CheckCircle2,
  Calendar,
  User,
  Home,
  Plus,
  Trash2,
  RefreshCw,
  Copy,
  AlertTriangle,
  Loader2,
  FileText,
  Download,
  Smile,
  Bed
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { calculateAge, getAgeNumber, getAgeInMonths, VACCINE_SCHEDULE } from '../lib/dateUtils';

const vaccineLabels: Record<string, string> = {
  penta2m: 'Penta 2 Meses',
  penta4m: 'Penta 4 Meses',
  penta6m: 'Penta 6 Meses',
  dtp15m: 'DTP 15 meses',
  dtp4y: 'DTP 4 anos',
  hepB: 'Hepatite B',
  vip2m: 'VIP 2 meses',
  vip4m: 'VIP 4 meses',
  vip6m: 'VIP 6 meses',
  vop15m: 'VOP 15 meses',
  vop4y: 'VOP 4 anos',
  scr2m: 'SCR 2 meses',
  scr15m: 'SCR 15 meses',
  pneumo2m: 'Pneumo10 2 meses',
  pneumo4m: 'Pneumo10 4 meses',
  pneumo12m: 'Pneumo10 12 meses',
  visitaAcs1: '1ª Visita ACS',
  visitaAcs2: '2ª Visita ACS',
  consultaMedicaAnualData: 'Consulta Médica Anual',
  avaliacaoPes: 'Avaliação dos Pés',
  hemoglobinaGlicada: 'Hemoglobina Glicada',
  vacinaInfluenza: 'Vacina Influenza',
  exameCitopatologico: 'Exame Citopatológico',
  saudeSexualReprodutiva: 'Saúde Sexual Reprodutiva',
  mamografia: 'Mamografia',
  vacinaHpv: 'Vacina HPV'
};

export function PatientForm({ user }: { user: any }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    cns: '',
    responsibleCns: '',
    isFamilyResponsible: false,
    birthDate: '',
    gender: 'Feminino',
    visitDate: '',
    visitType: 'Rotina',
    visitSummary: '',
    address: '',
    number: '',
    complement: '',
    contact: '',
    messageContact: '',
    householdId: '',
    categories: [] as string[],
    clinicalData: {
      visitasGerais: [] as { date: string, summary: string }[],
      chronic: {
        diabetes: 'Não',
        diabetesData: {
          avaliacaoPes: 'Não',
          hemoglobinaGlicada: 'Não',
          visitaAcs1: '',
          visitaAcs2: ''
        },
        hipertensao: 'Não',
        hipertensaoData: {
          avaliacaoPes: 'Não',
          visitaAcs1: '',
          visitaAcs2: ''
        }
      },
      acamadodomiciliado: {
        dependencia: 'Total',
        curativos: 'Não',
        cuidador: 'Não',
        usoFralda: 'Não',
        tamanhoFralda: '',
        diabetes: 'Não',
        diabetesData: {
          avaliacaoPes: 'Não',
          hemoglobinaGlicada: 'Não',
          visitaAcs1: '',
          visitaAcs2: ''
        },
        visitasAcsDiabetes: [] as string[],
        hipertensao: 'Não',
        hipertensaoData: {
          avaliacaoPes: 'Não',
          visitaAcs1: '',
          visitaAcs2: ''
        },
        observacoes: ''
      },
      gestante: {
        dum: '',
        dpp: '',
        consultas: [] as string[],
        visitasAcs: [] as string[],
        visitasAcsDiabetes: [] as string[],
        dtpa: 'Não',
        sifilis: 'NÃO REALIZADO',
        hepatiteB: 'NÃO REALIZADO',
        hiv: 'NÃO REALIZADO',
        hepatiteC: 'NÃO REALIZADO',
        puerperioConsulta: '',
        puerperioVisita: '',
        saudeBucal: '',
        diabetes: 'Não',
        diabetesData: {
          avaliacaoPes: 'Não',
          hemoglobinaGlicada: 'Não',
          visitaAcs1: '',
          visitaAcs2: ''
        },
        hipertensao: 'Não',
        hipertensaoData: {
          avaliacaoPes: 'Não',
          visitaAcs1: '',
          visitaAcs2: ''
        }
      },
      crianca: {
        consultas: [] as string[],
        visitasAcs: [] as string[],
        visita30dias: '',
        visita6meses: '',
        proximaVisitaSugerida: '',
        vacinas: {
          bcg: '',
          hepB_nascer: '',
          penta1: '',
          penta2: '',
          penta3: '',
          vip1: '',
          vip2: '',
          vip3: '',
          vipR: '',
          pneumo10_1: '',
          pneumo10_2: '',
          pneumo10_3: '',
          rotavirus1: '',
          rotavirus2: '',
          menC1: '',
          menC2: '',
          menC3: '',
          fa: '',
          scr1: '',
          dtp: '',
          hepA: '',
          scrv: '',
          // Legacy keys
          penta2m: '',
          penta4m: '',
          penta6m: '',
          dtp15m: '',
          dtp4y: '',
          hepB: '',
          vip2m: '',
          vip4m: '',
          vip6m: '',
          vop15m: '',
          vop4y: '',
          scr2m: '',
          scr15m: '',
          pneumo2m: '',
          pneumo4m: '',
          pneumo12m: ''
        }
      },
      adulto: {
        diabetes: 'Não',
        diabetesData: {
          avaliacaoPes: 'Não',
          hemoglobinaGlicada: 'Não',
          visitaAcs1: '',
          visitaAcs2: ''
        },
        visitasAcsDiabetes: [] as string[],
        hipertensao: 'Não',
        hipertensaoData: {
          avaliacaoPes: 'Não',
          visitaAcs1: '',
          visitaAcs2: ''
        }
      },
      idoso: {
        diabetes: 'Não',
        diabetesData: {
          avaliacaoPes: 'Não',
          hemoglobinaGlicada: 'Não',
          visitaAcs1: '',
          visitaAcs2: ''
        },
        visitasAcsDiabetes: [] as string[],
        hipertensao: 'Não',
        hipertensaoData: {
          avaliacaoPes: 'Não',
          visitaAcs1: '',
          visitaAcs2: ''
        },
        vacinaInfluenza: 'Não',
        visitaAcs1: '',
        visitaAcs2: '',
        consultaMedicaAnualData: ''
      },
      rastreamento: {
        exameCitopatologico: 'Não',
        saudeSexualReprodutiva: 'Não',
        mamografia: 'Não',
        vacinaHpv: 'Não'
      }
    }
  });

  useEffect(() => {
    const fetchPatient = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('*, households(*)')
          .eq('id', id)
          .single();

        if (error) throw error;

        if (data) {
          const hData = data.households || {};
          
          setFormData({
            name: data.name || '',
            cns: data.cns || '',
            responsibleCns: data.responsible_cns || '',
            isFamilyResponsible: data.is_family_responsible || false,
            birthDate: data.birth_date || '',
            gender: data.gender || 'Feminino',
            visitDate: data.visit_date || '',
            visitType: 'Rotina',
            visitSummary: '',
            address: hData.address || '',
            number: hData.number || '',
            complement: hData.complement || '',
            contact: data.contact || '',
            messageContact: data.message_contact || '',
            householdId: data.household_id || '',
            categories: data.categories || [],
            clinicalData: {
              ...formData.clinicalData,
              ...data.clinical_data,
              chronic: data.clinical_data?.chronic || {
                diabetes: data.clinical_data?.chronic?.diabetes || data.clinical_data?.adulto?.diabetes || data.clinical_data?.idoso?.diabetes || data.clinical_data?.gestante?.diabetes || data.clinical_data?.acamadodomiciliado?.diabetes || 'Não',
                diabetesData: data.clinical_data?.chronic?.diabetesData || data.clinical_data?.adulto?.diabetesData || data.clinical_data?.idoso?.diabetesData || data.clinical_data?.gestante?.diabetesData || data.clinical_data?.acamadodomiciliado?.diabetesData || formData.clinicalData.chronic.diabetesData,
                hipertensao: data.clinical_data?.chronic?.hipertensao || data.clinical_data?.adulto?.hipertensao || data.clinical_data?.idoso?.hipertensao || data.clinical_data?.gestante?.hipertensao || data.clinical_data?.acamadodomiciliado?.hipertensao || data.clinical_data?.adulto?.pressaoAlta || data.clinical_data?.idoso?.pressaoAlta || data.clinical_data?.gestante?.pressaoAlta || data.clinical_data?.acamadodomiciliado?.pressaoAlta || 'Não',
                hipertensaoData: data.clinical_data?.chronic?.hipertensaoData || data.clinical_data?.adulto?.hipertensaoData || data.clinical_data?.idoso?.hipertensaoData || data.clinical_data?.gestante?.hipertensaoData || data.clinical_data?.acamadodomiciliado?.hipertensaoData || formData.clinicalData.chronic.hipertensaoData,
              },
              // Ensure nested arrays exist even if missing in DB
              gestante: {
                ...formData.clinicalData.gestante,
                ...(data.clinical_data?.gestante || {}),
                consultas: data.clinical_data?.gestante?.consultas || [],
                visitasAcs: data.clinical_data?.gestante?.visitasAcs || [],
                visitasAcsDiabetes: data.clinical_data?.gestante?.visitasAcsDiabetes || [],
                diabetesData: {
                  ...formData.clinicalData.gestante.diabetesData,
                  ...(data.clinical_data?.gestante?.diabetesData || {})
                },
                hipertensaoData: {
                  ...formData.clinicalData.gestante.hipertensaoData,
                  ...(data.clinical_data?.gestante?.hipertensaoData || {})
                }
              },
              crianca: {
                ...formData.clinicalData.crianca,
                ...(data.clinical_data?.crianca || {}),
                consultas: data.clinical_data?.crianca?.consultas || [],
                vacinas: {
                  ...formData.clinicalData.crianca.vacinas,
                  ...(data.clinical_data?.crianca?.vacinas || {})
                }
              },
              acamadodomiciliado: {
                ...formData.clinicalData.acamadodomiciliado,
                ...(data.clinical_data?.acamadodomiciliado || {}),
                visitasAcsDiabetes: data.clinical_data?.acamadodomiciliado?.visitasAcsDiabetes || [],
                diabetesData: {
                  ...formData.clinicalData.acamadodomiciliado.diabetesData,
                  ...(data.clinical_data?.acamadodomiciliado?.diabetesData || {})
                },
                hipertensaoData: {
                  ...formData.clinicalData.acamadodomiciliado.hipertensaoData,
                  ...(data.clinical_data?.acamadodomiciliado?.hipertensaoData || {})
                }
              },
              adulto: {
                ...formData.clinicalData.adulto,
                ...(data.clinical_data?.adulto || {}),
                visitasAcsDiabetes: data.clinical_data?.adulto?.visitasAcsDiabetes || [],
                diabetesData: {
                  ...formData.clinicalData.adulto.diabetesData,
                  ...(data.clinical_data?.adulto?.diabetesData || {})
                },
                hipertensaoData: {
                  ...formData.clinicalData.adulto.hipertensaoData,
                  ...(data.clinical_data?.adulto?.hipertensaoData || {})
                }
              },
              idoso: {
                ...formData.clinicalData.idoso,
                ...(data.clinical_data?.idoso || {}),
                visitasAcsDiabetes: data.clinical_data?.idoso?.visitasAcsDiabetes || [],
                diabetesData: {
                  ...formData.clinicalData.idoso.diabetesData,
                  ...(data.clinical_data?.idoso?.diabetesData || {})
                },
                hipertensaoData: {
                  ...formData.clinicalData.idoso.hipertensaoData,
                  ...(data.clinical_data?.idoso?.hipertensaoData || {})
                }
              },
              rastreamento: {
                ...formData.clinicalData.rastreamento,
                ...(data.clinical_data?.rastreamento || {})
              }
            }
          });
        }
      } catch (error) {
        console.error("Error fetching patient for edit:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPatient();
  }, [id]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('nova-visita') === 'true') {
      setFormData(prev => ({
        ...prev,
        visitDate: new Date().toISOString().split('T')[0],
        visitType: 'Rotina'
      }));
      
      // Scroll to visit section after a short delay to ensure rendering
      setTimeout(() => {
        const visitSection = document.getElementById('secao-visita');
        if (visitSection) {
          visitSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
    }
  }, [location.search]);

  const calculateNextVisit = (dateStr: string, days: number) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const year = date.getFullYear();
    date.setDate(date.getDate() + days);
    
    // Ensure it stays within the same year
    if (date.getFullYear() > year) {
      return `${year}-12-31`;
    }
    
    return date.toISOString().split('T')[0];
  };

  const getVisitAlert = (nextDateStr: string) => {
    if (!nextDateStr) return null;
    const nextDate = new Date(nextDateStr);
    const today = new Date();
    const diffTime = nextDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { type: 'error', message: `Atrasada há ${Math.abs(diffDays)} dias!` };
    if (diffDays <= 15) return { type: 'warning', message: `Próxima visita em ${diffDays} dias.` };
    return null;
  };

  const getConsultationAlert = (lastDateStr: string) => {
    if (!lastDateStr) return null;
    const lastDate = new Date(lastDateStr);
    const nextDate = new Date(lastDate);
    nextDate.setFullYear(nextDate.getFullYear() + 1);
    
    const today = new Date();
    const diffTime = nextDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { type: 'error', message: `Consulta anual atrasada há ${Math.abs(diffDays)} dias!` };
    if (diffDays <= 30) return { type: 'warning', message: `Próxima consulta anual em ${diffDays} dias.` };
    return null;
  };

  const renderAcsVisits = (subKey: 'diabetesData' | 'hipertensaoData') => {
    const data = formData.clinicalData.chronic[subKey];
    
    if (!data) return null;

    const nextVisit = calculateNextVisit(data.visitaAcs1, 180);
    const alert = getVisitAlert(nextVisit);

    const updateVisits = (v1: string, v2: string) => {
      setFormData({
        ...formData,
        clinicalData: {
          ...formData.clinicalData,
          chronic: {
            ...formData.clinicalData.chronic,
            [subKey]: { ...data, visitaAcs1: v1, visitaAcs2: v2 }
          }
        }
      });
    };

    return (
      <div className="col-span-full space-y-4 mt-2">
        <label className="block text-[10px] font-bold uppercase text-slate-400">Visita ACS (Mín. 2/ano)</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[8px] font-bold text-slate-500 uppercase mb-1">1ª Visita</label>
            <input 
              type="date" 
              value={data.visitaAcs1 || ''}
              onChange={e => {
                const v1 = e.target.value;
                const v2 = calculateNextVisit(v1, 180);
                updateVisits(v1, v2);
              }}
              className="w-full bg-white dark:bg-slate-800 border-none rounded-xl p-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-[8px] font-bold text-slate-500 uppercase mb-1">2ª Visita (Auto +180 dias)</label>
            <input 
              type="date" 
              value={data.visitaAcs2 || ''}
              onChange={e => updateVisits(data.visitaAcs1, e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border-none rounded-xl p-3 text-sm"
            />
          </div>
        </div>
        {alert && (
          <div className={`p-3 rounded-xl flex items-center gap-3 text-[10px] font-bold uppercase ${
            alert.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
          }`}>
            <Activity className="w-4 h-4" />
            {alert.message}
          </div>
        )}
      </div>
    );
  };

  const renderDiabetesFields = () => {
    const data = formData.clinicalData.chronic;
    if (data.diabetes !== 'Sim') return null;

    return (
      <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 animate-in fade-in slide-in-from-top-2">
        <h4 className="col-span-full text-xs font-bold uppercase text-blue-600 dark:text-blue-400 flex items-center gap-2">
          <Activity className="w-3 h-3" />
          Submenu: Diabetes
        </h4>
        <div>
          <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Avaliação dos Pés</label>
          <select 
            value={data.diabetesData?.avaliacaoPes || 'Não'}
            onChange={e => setFormData({
              ...formData, 
              clinicalData: { 
                ...formData.clinicalData, 
                chronic: { 
                  ...data, 
                  diabetesData: { ...data.diabetesData, avaliacaoPes: e.target.value } 
                } 
              }
            })}
            className="w-full bg-white dark:bg-slate-800 border-none rounded-xl p-3 text-sm"
          >
            <option>Não</option>
            <option>Sim</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Hemoglobina Glicada</label>
          <select 
            value={data.diabetesData?.hemoglobinaGlicada || 'Não'}
            onChange={e => setFormData({
              ...formData, 
              clinicalData: { 
                ...formData.clinicalData, 
                chronic: { 
                  ...data, 
                  diabetesData: { ...data.diabetesData, hemoglobinaGlicada: e.target.value } 
                } 
              }
            })}
            className="w-full bg-white dark:bg-slate-800 border-none rounded-xl p-3 text-sm"
          >
            <option>Não</option>
            <option>Sim</option>
          </select>
        </div>
        {renderAcsVisits('diabetesData')}
      </div>
    );
  };

  const renderHipertensaoFields = () => {
    const data = formData.clinicalData.chronic;
    if (data.hipertensao !== 'Sim') return null;

    return (
      <div className="col-span-full grid grid-cols-1 md:grid-cols-1 gap-4 mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800 animate-in fade-in slide-in-from-top-2">
        <h4 className="col-span-full text-xs font-bold uppercase text-red-600 dark:text-red-400 flex items-center gap-2">
          <HeartPulse className="w-3 h-3" />
          Submenu: Hipertensão
        </h4>
        <div>
          <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Avaliação dos Pés</label>
          <select 
            value={data.hipertensaoData?.avaliacaoPes || 'Não'}
            onChange={e => setFormData({
              ...formData, 
              clinicalData: { 
                ...formData.clinicalData, 
                chronic: { 
                  ...data, 
                  hipertensaoData: { ...data.hipertensaoData, avaliacaoPes: e.target.value } 
                } 
              }
            })}
            className="w-full bg-white dark:bg-slate-800 border-none rounded-xl p-3 text-sm"
          >
            <option>Não</option>
            <option>Sim</option>
          </select>
        </div>
        {renderAcsVisits('hipertensaoData')}
      </div>
    );
  };

  const categories = [
    { id: 'Gestante', icon: Baby, color: 'border-blue-500 text-blue-500' },
    { id: 'Criança', icon: Smile, color: 'border-green-500 text-green-500' },
    { id: 'AcamadoDomiciliado', icon: Bed, label: 'Acamado / Domiciliado', color: 'border-teal-500 text-teal-500' },
    { id: 'Adulto', icon: User, color: 'border-slate-500 text-slate-500' },
    { id: 'Idoso', icon: HeartPulse, color: 'border-red-500 text-red-500' },
  ];

  const toggleCategory = (cat: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(cat) 
        ? prev.categories.filter(c => c !== cat)
        : [...prev.categories, cat]
    }));
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      if (!navigator.onLine) {
        if (formData.isFamilyResponsible) {
          await syncService.addToQueue('households', 'UPDATE', {
            id: formData.householdId,
            responsible_name: 'Responsável não cadastrado',
            last_update_at: new Date().toISOString()
          });
        }
        // Queue visit deletion by patient_id
        await syncService.addToQueue('visits', 'DELETE', { filter: { patient_id: id } });
        // Queue patient deletion
        await syncService.addToQueue('patients', 'DELETE', { id });
        
        alert('Exclusão agendada para sincronização.');
        navigate('/pacientes');
        return;
      }

      // 1. If this patient is the responsible, update household
      if (formData.isFamilyResponsible && formData.householdId) {
        const { error: hError } = await supabase
          .from('households')
          .update({ 
            responsible_name: 'Responsável não cadastrado',
            last_update_at: new Date().toISOString()
          })
          .eq('id', formData.householdId);
        if (hError) console.error("Error updating household during delete:", hError);
      }

      // 2. Delete visits
      const { error: vError } = await supabase.from('visits').delete().eq('patient_id', id);
      if (vError) throw vError;
      
      // 3. Delete patient
      const { error: pError } = await supabase.from('patients').delete().eq('id', id);
      if (pError) throw pError;
      
      navigate('/pacientes');
    } catch (error: any) {
      console.error("Error deleting patient:", error);
      alert(error.message || "Erro ao excluir paciente.");
    } finally {
      setDeleting(false);
    }
  };

  const generatePatientPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(0, 72, 141);
    doc.text('Ficha Individual do Paciente', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth - 14, 28, { align: 'right' });
    
    // Personal Info
    doc.setFontSize(14);
    doc.setTextColor(0, 72, 141);
    doc.text('Informações Pessoais', 14, 40);
    
    const personalData = [
      ['Nome', formData.name || 'N/A'],
      ['CNS', formData.cns || 'N/A'],
      ['Data de Nascimento', formData.birthDate ? new Date(formData.birthDate).toLocaleDateString('pt-BR') : 'N/A'],
      ['Idade', formData.birthDate ? calculateAge(formData.birthDate) : 'N/A'],
      ['Gênero', formData.gender || 'N/A'],
      ['Contato', formData.contact || 'N/A'],
      ['Recado', formData.messageContact || 'N/A'],
      ['Endereço', `${formData.address}, ${formData.number}`],
      ['Categorias', formData.categories.join(', ') || 'N/A']
    ];

    autoTable(doc, {
      startY: 45,
      body: personalData,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 10;

    // Clinical Data
    formData.categories.forEach(cat => {
      const catId = cat.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const clinical = (formData.clinicalData as any)[catId];
      
      if (!clinical) return;

      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(0, 72, 141);
      doc.text(`Dados Clínicos: ${cat}`, 14, currentY);
      currentY += 5;

      const clinicalRows: string[][] = [];
      Object.entries(clinical).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          if (value.length > 0) {
            clinicalRows.push([key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()), value.join(', ')]);
          }
        } else if (typeof value === 'object' && value !== null) {
          // Handle nested objects like vacinas, diabetesData, hipertensaoData
          Object.entries(value).forEach(([subKey, subValue]) => {
            if (subValue) {
              const label = vaccineLabels[subKey] || subKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
              clinicalRows.push([label, String(subValue)]);
            }
          });
        } else if (value) {
          clinicalRows.push([key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()), String(value)]);
        }
      });

      if (clinicalRows.length > 0) {
        autoTable(doc, {
          startY: currentY,
          body: clinicalRows,
          theme: 'striped',
          styles: { fontSize: 9, cellPadding: 2 },
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }
        });
        currentY = (doc as any).lastAutoTable.finalY + 10;
      } else {
        currentY += 10;
      }
    });

    // Rastreamento Data
    if (formData.clinicalData.rastreamento) {
      const rastreamentoRows: string[][] = [];
      Object.entries(formData.clinicalData.rastreamento).forEach(([key, value]) => {
        if (value && value !== 'Não') {
          rastreamentoRows.push([key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()), String(value)]);
        }
      });

      if (rastreamentoRows.length > 0) {
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(0, 72, 141);
        doc.text('Rastreamento e Prevenção', 14, currentY);
        currentY += 5;

        autoTable(doc, {
          startY: currentY,
          body: rastreamentoRows,
          theme: 'striped',
          styles: { fontSize: 9, cellPadding: 2 },
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }
        });
        currentY = (doc as any).lastAutoTable.finalY + 10;
      }
    }

    doc.save(`Ficha_${formData.name.replace(/\s+/g, '_')}.pdf`);
  };

  const ageInMonths = getAgeInMonths(formData.birthDate);
  const isFiveYearsOrMore = ageInMonths >= 60;
  const visibleSchedule = VACCINE_SCHEDULE.filter(group => isFiveYearsOrMore || group.age <= ageInMonths);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // 1. Check if Household with this Responsible CNS already exists
      const targetCns = formData.isFamilyResponsible ? formData.cns : formData.responsibleCns;
      let householdId = '';

      if (!targetCns) {
        throw new Error("CNS do Responsável é obrigatório para vincular a família.");
      }

      if (!navigator.onLine) {
        // Offline mode: We can't easily handle the household/patient relationship without IDs
        // So we generate temporary UUIDs
        const existingHouseholdId = formData.householdId;
        if (!existingHouseholdId) {
          householdId = crypto.randomUUID();
          const householdData = {
            id: householdId,
            address: formData.address,
            number: formData.number,
            complement: formData.complement,
            microarea: user.microarea,
            area_color: user.color || '#00488d',
            agent_id: user.id,
            responsible_cns: targetCns,
            responsible_name: formData.isFamilyResponsible ? formData.name : 'Responsável não cadastrado'
          };
          await syncService.addToQueue('households', 'INSERT', householdData);
        } else {
          householdId = existingHouseholdId;
          if (formData.isFamilyResponsible) {
            await syncService.addToQueue('households', 'UPDATE', {
              id: householdId,
              responsible_name: formData.name,
              address: formData.address,
              number: formData.number,
              complement: formData.complement,
              last_update_at: new Date().toISOString()
            });
          }
        }

        const patientData = {
          id: id || crypto.randomUUID(),
          name: formData.name,
          cns: formData.cns,
          responsible_cns: targetCns,
          is_family_responsible: formData.isFamilyResponsible,
          birth_date: formData.birthDate,
          gender: formData.gender,
          visit_date: formData.visitDate || null,
          contact: formData.contact,
          message_contact: formData.messageContact,
          household_id: householdId,
          categories: formData.categories,
          microarea: user.microarea,
          area_color: user.color || '#00488d',
          agent_id: user.id,
          clinical_data: formData.clinicalData,
          last_visit_at: formData.visitDate ? new Date().toISOString() : undefined
        };

        await syncService.addToQueue('patients', id ? 'UPDATE' : 'INSERT', patientData);
        alert('Dados salvos localmente. Serão sincronizados quando houver internet.');
        navigate('/');
        return;
      }

      const { data: householdData, error: hError } = await supabase
        .from('households')
        .select('id')
        .eq('responsible_cns', targetCns)
        .eq('microarea', user.microarea)
        .maybeSingle();

      if (hError) throw hError;

      if (householdData) {
        // Household exists, use it
        householdId = householdData.id;
        
        // If this patient is the responsible, update household info
        if (formData.isFamilyResponsible) {
          const { error: updateHError } = await supabase
            .from('households')
            .update({
              responsible_name: formData.name,
              address: formData.address,
              number: formData.number,
              complement: formData.complement,
              last_update_at: new Date().toISOString()
            })
            .eq('id', householdId);
          if (updateHError) throw updateHError;
        }
      } else {
        // If not responsible and household doesn't exist, don't create it automatically
        // But allow the patient to be registered (householdId will be null)
        if (formData.isFamilyResponsible) {
          // Create new Household only if they are the responsible
          const { data: newH, error: createHError } = await supabase
            .from('households')
            .insert([{
              address: formData.address,
              number: formData.number,
              complement: formData.complement,
              microarea: user.microarea,
              area_color: user.color || '#00488d',
              agent_id: user.id,
              responsible_cns: targetCns,
              responsible_name: formData.name
            }])
            .select()
            .single();
          
          if (createHError) throw createHError;
          householdId = newH.id;
        } else {
          // Patient without household (responsible not found)
          householdId = null;
        }
      }

      // 2. Create or Update Patient
      const patientData = {
        name: formData.name,
        cns: formData.cns,
        responsible_cns: targetCns,
        is_family_responsible: formData.isFamilyResponsible,
        birth_date: formData.birthDate,
        gender: formData.gender,
        visit_date: formData.visitDate || null,
        contact: formData.contact,
        message_contact: formData.messageContact,
        household_id: householdId,
        categories: formData.categories,
        microarea: user.microarea,
        area_color: user.color || '#00488d',
        agent_id: user.id,
        clinical_data: formData.clinicalData
      };

      // Only update last_visit_at if a visit date was provided
      if (formData.visitDate) {
        (patientData as any).last_visit_at = new Date().toISOString();
      }

      let finalPatientId = id;

      if (id) {
        const { error: pError } = await supabase
          .from('patients')
          .update(patientData)
          .eq('id', id);
        if (pError) throw pError;
      } else {
        const { data: newP, error: pError } = await supabase
          .from('patients')
          .insert([patientData])
          .select()
          .single();
        if (pError) throw pError;
        finalPatientId = newP.id;
      }

      // 3. Record the visit if date is provided
      if (formData.visitDate) {
        const { error: vError } = await supabase
          .from('visits')
          .insert([{
            patient_id: finalPatientId,
            agent_id: user.id,
            date: formData.visitDate,
            type: formData.visitType,
            summary: formData.visitSummary,
            microarea: user.microarea,
            area_color: user.color || '#00488d'
          }]);
        if (vError) throw vError;
      }

      navigate('/');
    } catch (error: any) {
      console.error("Error saving patient:", error);
      alert(error.message || "Erro ao salvar paciente.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (formData.categories.includes('Criança') && formData.birthDate) {
      const birth = new Date(formData.birthDate);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - birth.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const ageInMonths = diffDays / 30.44;

      if (ageInMonths < 24) {
        // Calculate next visit: 6 months from birth if under 6 months, or 6 months from today
        const nextVisit = new Date(birth);
        nextVisit.setMonth(nextVisit.getMonth() + 6);
        
        // If 6 months from birth is already in the past, set it to 6 months from today
        if (nextVisit < today) {
          nextVisit.setTime(today.getTime() + (180 * 24 * 60 * 60 * 1000));
        }

        const nextVisitStr = nextVisit.toISOString().split('T')[0];
        
        if (!formData.clinicalData.crianca.proximaVisitaSugerida) {
          setFormData(prev => ({
            ...prev,
            clinicalData: {
              ...prev.clinicalData,
              crianca: {
                ...prev.clinicalData.crianca,
                proximaVisitaSugerida: nextVisitStr
              }
            }
          }));
        }
      }
    }
  }, [formData.birthDate, formData.categories]);

  const addDateToList = (category: string, list: string) => {
    setFormData(prev => {
      const newData = { ...prev.clinicalData };
      if (category === 'root') {
        const currentList = (newData as any)[list] || [];
        if (list === 'visitasGerais') {
          (newData as any)[list] = [...currentList, { date: '', summary: '' }];
        } else {
          (newData as any)[list] = [...currentList, ''];
        }
      } else {
        const currentList = ((newData as any)[category] as any)[list] || [];
        ((newData as any)[category] as any)[list] = [...currentList, ''];
      }
      return { ...prev, clinicalData: newData };
    });
  };

  const removeDateFromList = (category: string, list: string, index: number) => {
    setFormData(prev => {
      const newData = { ...prev.clinicalData };
      if (category === 'root') {
        const currentList = (newData as any)[list] || [];
        (newData as any)[list] = currentList.filter((_: any, i: number) => i !== index);
      } else {
        const currentList = ((newData as any)[category] as any)[list] || [];
        ((newData as any)[category] as any)[list] = currentList.filter((_: any, i: number) => i !== index);
      }
      return { ...prev, clinicalData: newData };
    });
  };

  const updateDateInList = (category: string, list: string, index: number, value: any) => {
    setFormData(prev => {
      const newData = { ...prev.clinicalData };
      if (category === 'root') {
        const currentList = [...((newData as any)[list] || [])];
        currentList[index] = value;
        (newData as any)[list] = currentList;
      } else {
        const currentList = [...(((newData as any)[category] as any)[list] || [])];
        currentList[index] = value;
        ((newData as any)[category] as any)[list] = currentList;
      }
      return { ...prev, clinicalData: newData };
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-extrabold text-primary tracking-tight font-headline">Novo Cadastro de Cidadão</h2>
          <p className="text-slate-500 mt-2 font-medium">Preencha as informações detalhadas para o prontuário eletrônico territorial.</p>
        </div>
        <button onClick={() => navigate('/')} className="p-2 text-slate-400 hover:text-error transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-12">
        {/* Identificação Geral */}
        <section className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-1.5 h-8 bg-primary rounded-full"></div>
            <h3 className="text-xl font-bold text-primary font-headline">Identificação Geral</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-4">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                {formData.isFamilyResponsible ? 'Seu CNS (Responsável)' : 'CNS do Responsável Familiar'}
              </label>
              <input 
                type="text" 
                value={(formData.isFamilyResponsible ? formData.cns : formData.responsibleCns) || ''}
                onChange={e => setFormData({...formData, responsibleCns: e.target.value})}
                disabled={formData.isFamilyResponsible}
                className={`w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20 ${formData.isFamilyResponsible ? 'opacity-50 cursor-not-allowed' : ''}`} 
                placeholder="000 0000 0000 0000" 
              />
              {!formData.isFamilyResponsible && (
                <p className="text-[9px] text-slate-400 mt-1 italic">Use o CNS para vincular este cidadão a uma família existente.</p>
              )}
              {!formData.isFamilyResponsible && !formData.responsibleCns && (
                <div className="mt-2 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                  <span className="text-[9px] font-bold text-amber-700 uppercase">Responsável Pendente: O domicílio não será gerado.</span>
                </div>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Resp. Familiar?</label>
              <select 
                value={formData.isFamilyResponsible ? 'Sim' : 'Não'}
                onChange={e => setFormData({...formData, isFamilyResponsible: e.target.value === 'Sim'})}
                className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20"
              >
                <option>Não</option>
                <option>Sim</option>
              </select>
            </div>
            <div className="md:col-span-6">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Nome Completo</label>
                <button 
                  type="button"
                  onClick={() => navigator.clipboard.writeText(formData.name)}
                  className="p-1 text-slate-300 hover:text-primary transition-colors"
                  title="Copiar Nome"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
              <input 
                type="text" 
                value={formData.name || ''}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20" 
                placeholder="Nome do paciente" 
              />
            </div>
            <div className="md:col-span-4">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">SUS do Cidadão</label>
              <input 
                type="text" 
                value={formData.cns || ''}
                onChange={e => setFormData({...formData, cns: e.target.value})}
                className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20" 
                placeholder="000 0000 0000 0000" 
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Gênero</label>
              <select 
                value={formData.gender || 'Feminino'}
                onChange={e => setFormData({...formData, gender: e.target.value})}
                className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20"
              >
                <option>Feminino</option>
                <option>Masculino</option>
                <option>Outro</option>
              </select>
            </div>
            <div className="md:col-span-3">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Data de Nascimento</label>
                <button 
                  type="button"
                  onClick={() => navigator.clipboard.writeText(formData.birthDate)}
                  className="p-1 text-slate-300 hover:text-primary transition-colors"
                  title="Copiar Data"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
              <input 
                type="date" 
                value={formData.birthDate || ''}
                onChange={e => setFormData({...formData, birthDate: e.target.value})}
                className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20" 
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Idade (Automática)</label>
              <input 
                disabled
                type="text" 
                value={calculateAge(formData.birthDate) || ''}
                className="w-full bg-slate-100 border-none rounded-xl p-3 text-sm text-slate-500" 
              />
            </div>
            <div id="secao-visita" className="md:col-span-4">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Data da Visita</label>
              <input 
                type="date" 
                value={formData.visitDate || ''}
                onChange={e => setFormData({...formData, visitDate: e.target.value})}
                className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20" 
              />
            </div>
            <div className="md:col-span-4">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Tipo de Visita</label>
              <select 
                value={formData.visitType}
                onChange={e => setFormData({...formData, visitType: e.target.value})}
                className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20"
              >
                <option>Rotina</option>
                <option>Acompanhamento</option>
                <option>Urgência</option>
                <option>Pós-Parto</option>
                <option>Recém-Nascido</option>
              </select>
            </div>
            <div className="md:col-span-5">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Endereço</label>
              <input 
                type="text" 
                value={formData.address || ''}
                onChange={e => setFormData({...formData, address: e.target.value})}
                className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20" 
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Nº</label>
              <input 
                type="text" 
                value={formData.number || ''}
                onChange={e => setFormData({...formData, number: e.target.value})}
                className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20" 
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Complemento</label>
              <input 
                type="text" 
                value={formData.complement || ''}
                onChange={e => setFormData({...formData, complement: e.target.value})}
                className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20" 
              />
            </div>
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Contato</label>
                {formData.contact && (
                  <button 
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(formData.contact);
                      alert('Contato copiado!');
                    }}
                    className="text-primary hover:text-primary/80 transition-colors"
                    title="Copiar Contato"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                )}
              </div>
              <input 
                type="text" 
                value={formData.contact || ''}
                onChange={e => setFormData({...formData, contact: e.target.value})}
                className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20" 
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Recado</label>
                {formData.messageContact && (
                  <button 
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(formData.messageContact);
                      alert('Contato de recado copiado!');
                    }}
                    className="text-primary hover:text-primary/80 transition-colors"
                    title="Copiar Contato de Recado"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                )}
              </div>
              <input 
                type="text" 
                value={formData.messageContact || ''}
                onChange={e => setFormData({...formData, messageContact: e.target.value})}
                className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20" 
              />
            </div>
          </div>
        </section>

        {/* Visitas Realizadas */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-primary font-headline flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Visitas Realizadas
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">Histórico de visitas e ocorrências registradas.</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                type="button"
                onClick={() => addDateToList('root', 'visitasGerais')}
                className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl text-xs font-bold hover:bg-primary/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                Adicionar Visita Antiga
              </button>
              {id && (
                <button 
                  type="button"
                  onClick={() => navigate('/historico', { state: { search: formData.cns } })}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  Ver Histórico Completo
                </button>
              )}
            </div>
          </div>

          {/* Resumo da Visita Atual (se data preenchida) */}
          {formData.visitDate && (
            <div className="mb-8 p-6 bg-primary/5 rounded-2xl border border-primary/10 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <h4 className="text-xs font-bold uppercase tracking-widest text-primary">Resumo da Visita Atual ({new Date(formData.visitDate).toLocaleDateString('pt-BR')})</h4>
              </div>
              <textarea 
                value={formData.visitSummary || ''}
                onChange={e => setFormData({...formData, visitSummary: e.target.value})}
                className="w-full bg-white dark:bg-slate-800 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 min-h-[100px]" 
                placeholder="Descreva o que ocorreu nesta visita..."
              />
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {formData.clinicalData.visitasGerais?.map((visit, index) => (
              <div key={index} className="relative p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 group">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <input 
                      type="date" 
                      value={visit.date || ''}
                      onChange={e => updateDateInList('root', 'visitasGerais', index, { ...visit, date: e.target.value })}
                      className="bg-transparent border-none p-0 text-sm font-bold text-on-surface focus:ring-0" 
                    />
                  </div>
                  <button 
                    type="button"
                    onClick={() => removeDateFromList('root', 'visitasGerais', index)}
                    className="text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <textarea 
                  value={visit.summary || ''}
                  onChange={e => updateDateInList('root', 'visitasGerais', index, { ...visit, summary: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 border-none rounded-xl p-3 text-xs focus:ring-2 focus:ring-primary/20 min-h-[80px]" 
                  placeholder="Ocorrência desta visita..."
                />
              </div>
            ))}
            {(!formData.clinicalData.visitasGerais || formData.clinicalData.visitasGerais.length === 0) && !formData.visitDate && (
              <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2rem]">
                <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-sm text-slate-400 font-medium italic">Nenhuma visita registrada ainda.</p>
              </div>
            )}
          </div>
        </section>

        {/* Rastreamento e Prevenção (Baseado em Idade/Gênero) */}
        {( (formData.gender === 'Feminino' && getAgeNumber(formData.birthDate) >= 14 && getAgeNumber(formData.birthDate) <= 69) || 
           (getAgeNumber(formData.birthDate) >= 9 && getAgeNumber(formData.birthDate) <= 14) ) && (
          <section className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-bold text-primary font-headline flex items-center gap-2 mb-6">
              <Stethoscope className="w-5 h-5" />
              Rastreamento e Prevenção
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Mulheres 25-64: Citopatológico */}
              {formData.gender === 'Feminino' && getAgeNumber(formData.birthDate) >= 25 && getAgeNumber(formData.birthDate) <= 64 && (
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Exame Citopatológico (Sim/Não)</label>
                  <select 
                    value={formData.clinicalData.rastreamento.exameCitopatologico || 'Não'}
                    onChange={e => setFormData({
                      ...formData, 
                      clinicalData: { 
                        ...formData.clinicalData, 
                        rastreamento: { ...formData.clinicalData.rastreamento, exameCitopatologico: e.target.value } 
                      }
                    })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm text-on-surface"
                  >
                    <option>Não</option>
                    <option>Sim</option>
                  </select>
                </div>
              )}

              {/* Mulheres 14-69: Saúde Sexual Reprodutiva */}
              {formData.gender === 'Feminino' && getAgeNumber(formData.birthDate) >= 14 && getAgeNumber(formData.birthDate) <= 69 && (
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Saúde Sexual Reprodutiva (Sim/Não)</label>
                  <select 
                    value={formData.clinicalData.rastreamento.saudeSexualReprodutiva || 'Não'}
                    onChange={e => setFormData({
                      ...formData, 
                      clinicalData: { 
                        ...formData.clinicalData, 
                        rastreamento: { ...formData.clinicalData.rastreamento, saudeSexualReprodutiva: e.target.value } 
                      }
                    })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm text-on-surface"
                  >
                    <option>Não</option>
                    <option>Sim</option>
                  </select>
                </div>
              )}

              {/* Mulheres 50-69: Mamografia */}
              {formData.gender === 'Feminino' && getAgeNumber(formData.birthDate) >= 50 && getAgeNumber(formData.birthDate) <= 69 && (
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Mamografia (Sim/Não)</label>
                  <select 
                    value={formData.clinicalData.rastreamento.mamografia || 'Não'}
                    onChange={e => setFormData({
                      ...formData, 
                      clinicalData: { 
                        ...formData.clinicalData, 
                        rastreamento: { ...formData.clinicalData.rastreamento, mamografia: e.target.value } 
                      }
                    })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm text-on-surface"
                  >
                    <option>Não</option>
                    <option>Sim</option>
                  </select>
                </div>
              )}

              {/* Todos 9-14: Vacina HPV */}
              {getAgeNumber(formData.birthDate) >= 9 && getAgeNumber(formData.birthDate) <= 14 && (
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Vacina HPV (Sim/Não)</label>
                  <select 
                    value={formData.clinicalData.rastreamento.vacinaHpv || 'Não'}
                    onChange={e => setFormData({
                      ...formData, 
                      clinicalData: { 
                        ...formData.clinicalData, 
                        rastreamento: { ...formData.clinicalData.rastreamento, vacinaHpv: e.target.value } 
                      }
                    })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm text-on-surface"
                  >
                    <option>Não</option>
                    <option>Sim</option>
                  </select>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Categorias de Acompanhamento */}
        <section className="bg-slate-50 rounded-2xl p-8 border border-slate-100">
          <h3 className="text-lg font-bold text-primary mb-6 font-headline">Categorias de Acompanhamento</h3>
          <div className="flex flex-wrap gap-4">
            {categories.map((cat) => {
              const isSelected = formData.categories.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className={`flex items-center gap-3 px-6 py-3 rounded-full border-2 transition-all ${
                    isSelected 
                      ? `${cat.color} bg-white shadow-md scale-105` 
                      : 'border-slate-200 bg-white/50 text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <cat.icon className="w-5 h-5" />
                  <span className="text-sm font-bold">{cat.label || cat.id}</span>
                  {isSelected && <CheckCircle2 className="w-4 h-4" />}
                </button>
              );
            })}
          </div>
        </section>

        {/* Condições Crônicas - Renderizado apenas uma vez se houver categorias relevantes */}
        {formData.categories.some(c => ['AcamadoDomiciliado', 'Gestante', 'Adulto', 'Idoso'].includes(c)) && (
          <section className="bg-white rounded-2xl p-8 shadow-sm border-l-4 border-indigo-500 mb-8 animate-in fade-in slide-in-from-top-2">
            <h3 className="text-xl font-bold text-indigo-600 mb-8 font-headline flex items-center gap-2">
              <Activity className="w-6 h-6" />
              Condições Crônicas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Diabetes?</label>
                <select 
                  value={formData.clinicalData.chronic.diabetes || 'Não'}
                  onChange={e => setFormData({
                    ...formData, 
                    clinicalData: { ...formData.clinicalData, chronic: { ...formData.clinicalData.chronic, diabetes: e.target.value } }
                  })}
                  className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm"
                >
                  <option>Não</option>
                  <option>Sim</option>
                </select>
              </div>
              {renderDiabetesFields()}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Hipertensão?</label>
                <select 
                  value={formData.clinicalData.chronic.hipertensao || 'Não'}
                  onChange={e => setFormData({
                    ...formData, 
                    clinicalData: { ...formData.clinicalData, chronic: { ...formData.clinicalData.chronic, hipertensao: e.target.value } }
                  })}
                  className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm"
                >
                  <option>Não</option>
                  <option>Sim</option>
                </select>
              </div>
              {renderHipertensaoFields()}
            </div>
          </section>
        )}

        {/* Category Specific Sections */}
        {formData.categories.map(catId => (
          <div key={catId} className="animate-in fade-in slide-in-from-top-2 duration-300">
            {catId === 'AcamadoDomiciliado' && (
              <section className="bg-white rounded-2xl p-8 shadow-sm border-l-4 border-teal-500">
                <h3 className="text-xl font-bold text-teal-600 mb-8 font-headline flex items-center gap-2">
                  <Activity className="w-6 h-6" />
                  Categoria: Acamado / Domiciliado
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Grau de Dependência</label>
                    <select 
                      value={formData.clinicalData.acamadodomiciliado.dependencia || 'Total'}
                      onChange={e => setFormData({
                        ...formData, 
                        clinicalData: { ...formData.clinicalData, acamadodomiciliado: { ...formData.clinicalData.acamadodomiciliado, dependencia: e.target.value } }
                      })}
                      className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm"
                    >
                      <option>Total</option>
                      <option>Parcial</option>
                      <option>Mínima</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Faz uso de curativos?</label>
                    <select 
                      value={formData.clinicalData.acamadodomiciliado.curativos || 'Não'}
                      onChange={e => setFormData({
                        ...formData, 
                        clinicalData: { ...formData.clinicalData, acamadodomiciliado: { ...formData.clinicalData.acamadodomiciliado, curativos: e.target.value } }
                      })}
                      className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm"
                    >
                      <option>Não</option>
                      <option>Sim</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Cuidador Presente</label>
                    <select 
                      value={formData.clinicalData.acamadodomiciliado.cuidador || 'Não'}
                      onChange={e => setFormData({
                        ...formData, 
                        clinicalData: { ...formData.clinicalData, acamadodomiciliado: { ...formData.clinicalData.acamadodomiciliado, cuidador: e.target.value } }
                      })}
                      className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm"
                    >
                      <option>Não</option>
                      <option>Sim</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Faz uso de fralda?</label>
                    <select 
                      value={formData.clinicalData.acamadodomiciliado.usoFralda || 'Não'}
                      onChange={e => setFormData({
                        ...formData, 
                        clinicalData: { ...formData.clinicalData, acamadodomiciliado: { ...formData.clinicalData.acamadodomiciliado, usoFralda: e.target.value } }
                      })}
                      className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm"
                    >
                      <option>Não</option>
                      <option>Sim</option>
                    </select>
                  </div>
                  {formData.clinicalData.acamadodomiciliado.usoFralda === 'Sim' && (
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Tamanho da Fralda</label>
                      <select 
                        value={formData.clinicalData.acamadodomiciliado.tamanhoFralda || ''}
                        onChange={e => setFormData({
                          ...formData, 
                          clinicalData: { ...formData.clinicalData, acamadodomiciliado: { ...formData.clinicalData.acamadodomiciliado, tamanhoFralda: e.target.value } }
                        })}
                        className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm"
                      >
                        <option value="">Selecione...</option>
                        <option>Infantil P</option>
                        <option>Infantil M</option>
                        <option>Infantil G</option>
                        <option>Infantil GG</option>
                        <option>Adulto P</option>
                        <option>Adulto M</option>
                        <option>Adulto G</option>
                        <option>Adulto GG</option>
                        <option>Adulto EXG</option>
                      </select>
                    </div>
                  )}
                  <div className="md:col-span-3">
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Observações</label>
                    <textarea 
                      value={formData.clinicalData.acamadodomiciliado.observacoes || ''}
                      onChange={e => setFormData({
                        ...formData, 
                        clinicalData: { ...formData.clinicalData, acamadodomiciliado: { ...formData.clinicalData.acamadodomiciliado, observacoes: e.target.value } }
                      })}
                      className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm min-h-[100px]"
                      placeholder="Descreva condições específicas..."
                    />
                  </div>
                </div>
              </section>
            )}

            {catId === 'Gestante' && (
              <section className="bg-white rounded-2xl p-8 shadow-sm border-l-4 border-blue-500">
                <h3 className="text-xl font-bold text-blue-600 mb-8 font-headline flex items-center gap-2">
                  <Baby className="w-6 h-6" />
                  Categoria: Gestante
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">DUM (Última Menstruação)</label>
                    <input 
                      type="date" 
                      value={formData.clinicalData.gestante.dum || ''}
                      onChange={e => setFormData({
                        ...formData, 
                        clinicalData: { ...formData.clinicalData, gestante: { ...formData.clinicalData.gestante, dum: e.target.value } }
                      })}
                      className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">DPP (Prev. Parto)</label>
                    <input 
                      type="date" 
                      value={formData.clinicalData.gestante.dpp || ''}
                      onChange={e => setFormData({
                        ...formData, 
                        clinicalData: { ...formData.clinicalData, gestante: { ...formData.clinicalData.gestante, dpp: e.target.value } }
                      })}
                      className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-bold uppercase text-slate-400">Consultas Médicas / Enfermagem (Mín. 7)</label>
                      <button 
                        type="button" 
                        onClick={() => addDateToList('gestante', 'consultas')}
                        className="text-xs font-bold text-primary flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Adicionar Data
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {formData.clinicalData.gestante.consultas?.map((date, idx) => (
                        <div key={idx} className="relative group">
                          <input 
                            type="date" 
                            value={date}
                            onChange={e => updateDateInList('gestante', 'consultas', idx, e.target.value)}
                            className="w-full bg-slate-50 border-none rounded-lg p-2 text-xs"
                          />
                          <button 
                            type="button"
                            onClick={() => removeDateFromList('gestante', 'consultas', idx)}
                            className="absolute -top-2 -right-2 bg-red-100 text-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-bold uppercase text-slate-400">Visitas Domiciliares ACS (Mín. 3)</label>
                      <button 
                        type="button" 
                        onClick={() => addDateToList('gestante', 'visitasAcs')}
                        className="text-xs font-bold text-primary flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Adicionar Data
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {formData.clinicalData.gestante.visitasAcs?.map((date, idx) => (
                        <div key={idx} className="relative group">
                          <input 
                            type="date" 
                            value={date}
                            onChange={e => updateDateInList('gestante', 'visitasAcs', idx, e.target.value)}
                            className="w-full bg-slate-50 border-none rounded-lg p-2 text-xs"
                          />
                          <button 
                            type="button"
                            onClick={() => removeDateFromList('gestante', 'visitasAcs', idx)}
                            className="absolute -top-2 -right-2 bg-red-100 text-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2 border-t border-slate-100 pt-6 mt-4">
                    <h4 className="text-xs font-bold uppercase text-slate-400 mb-4 flex items-center gap-2">
                      <Stethoscope className="w-4 h-4" />
                      Testes Rápidos
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-2">Sífilis</label>
                        <select 
                          value={formData.clinicalData.gestante.sifilis || 'NÃO REALIZADO'}
                          onChange={e => setFormData({
                            ...formData, 
                            clinicalData: { ...formData.clinicalData, gestante: { ...formData.clinicalData.gestante, sifilis: e.target.value } }
                          })}
                          className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm"
                        >
                          <option>NÃO REALIZADO</option>
                          <option>REALIZADO</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-2">HIV</label>
                        <select 
                          value={formData.clinicalData.gestante.hiv || 'NÃO REALIZADO'}
                          onChange={e => setFormData({
                            ...formData, 
                            clinicalData: { ...formData.clinicalData, gestante: { ...formData.clinicalData.gestante, hiv: e.target.value } }
                          })}
                          className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm"
                        >
                          <option>NÃO REALIZADO</option>
                          <option>REALIZADO</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-2">Hepatite B</label>
                        <select 
                          value={formData.clinicalData.gestante.hepatiteB || 'NÃO REALIZADO'}
                          onChange={e => setFormData({
                            ...formData, 
                            clinicalData: { ...formData.clinicalData, gestante: { ...formData.clinicalData.gestante, hepatiteB: e.target.value } }
                          })}
                          className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm"
                        >
                          <option>NÃO REALIZADO</option>
                          <option>REALIZADO</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-2">Hepatite C</label>
                        <select 
                          value={formData.clinicalData.gestante.hepatiteC || 'NÃO REALIZADO'}
                          onChange={e => setFormData({
                            ...formData, 
                            clinicalData: { ...formData.clinicalData, gestante: { ...formData.clinicalData.gestante, hepatiteC: e.target.value } }
                          })}
                          className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm"
                        >
                          <option>NÃO REALIZADO</option>
                          <option>REALIZADO</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 border-t border-slate-100 pt-6 mt-4">
                    <h4 className="text-xs font-bold uppercase text-slate-400 mb-4 flex items-center gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Vacinas
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-2">dTpa Aplicada?</label>
                        <select 
                          value={formData.clinicalData.gestante.dtpa || 'Não'}
                          onChange={e => setFormData({
                            ...formData, 
                            clinicalData: { ...formData.clinicalData, gestante: { ...formData.clinicalData.gestante, dtpa: e.target.value } }
                          })}
                          className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm"
                        >
                          <option>Não</option>
                          <option>Sim</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:col-span-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 mb-2">Consulta Puerpério</label>
                      <input 
                        type="date" 
                        value={formData.clinicalData.gestante.puerperioConsulta || ''}
                        onChange={e => setFormData({
                          ...formData, 
                          clinicalData: { ...formData.clinicalData, gestante: { ...formData.clinicalData.gestante, puerperioConsulta: e.target.value } }
                        })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm text-on-surface"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 mb-2">Visita ACS Puerpério</label>
                      <input 
                        type="date" 
                        value={formData.clinicalData.gestante.puerperioVisita || ''}
                        onChange={e => setFormData({
                          ...formData, 
                          clinicalData: { ...formData.clinicalData, gestante: { ...formData.clinicalData.gestante, puerperioVisita: e.target.value } }
                        })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm text-on-surface"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 mb-2">Saúde Bucal</label>
                      <input 
                        type="date" 
                        value={formData.clinicalData.gestante.saudeBucal || ''}
                        onChange={e => setFormData({
                          ...formData, 
                          clinicalData: { ...formData.clinicalData, gestante: { ...formData.clinicalData.gestante, saudeBucal: e.target.value } }
                        })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm text-on-surface"
                      />
                    </div>
                  </div>
                </div>
              </section>
            )}

            {catId === 'Criança' && (
              <section className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border-l-4 border-green-500">
                <h3 className="text-xl font-bold text-green-600 dark:text-green-400 mb-8 font-headline flex items-center gap-2">
                  <Stethoscope className="w-6 h-6" />
                  Categoria: Criança (0-2 anos)
                </h3>
                
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">Consultas (Mín. 9)</label>
                        <button 
                          type="button" 
                          onClick={() => addDateToList('crianca', 'consultas')}
                          className="text-xs font-bold text-primary flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Adicionar
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {formData.clinicalData.crianca.consultas?.map((date, idx) => (
                          <input 
                            key={idx}
                            type="date" 
                            value={date || ''}
                            onChange={e => updateDateInList('crianca', 'consultas', idx, e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg p-2 text-[10px] text-on-surface"
                          />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">Visitas ACS (30d e 6m)</label>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase">Até 30 dias</label>
                          <input 
                            type="date" 
                            value={formData.clinicalData.crianca.visita30dias || ''}
                            onChange={e => setFormData({
                              ...formData, 
                              clinicalData: { ...formData.clinicalData, crianca: { ...formData.clinicalData.crianca, visita30dias: e.target.value } }
                            })}
                            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-2 text-xs text-on-surface"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase">Até 6 meses</label>
                          <input 
                            type="date" 
                            value={formData.clinicalData.crianca.visita6meses || ''}
                            onChange={e => setFormData({
                              ...formData, 
                              clinicalData: { ...formData.clinicalData, crianca: { ...formData.clinicalData.crianca, visita6meses: e.target.value } }
                            })}
                            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-2 text-xs text-on-surface"
                          />
                        </div>
                      </div>
                      {formData.clinicalData.crianca.proximaVisitaSugerida && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 p-3 rounded-xl flex items-center gap-3">
                          <Activity className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                          <div>
                            <p className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase">Alerta: Criança menor de 2 anos</p>
                            <p className="text-[9px] text-amber-600 dark:text-amber-500">Próxima visita recomendada até: {new Date(formData.clinicalData.crianca.proximaVisitaSugerida).toLocaleDateString('pt-BR')}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">Calendário Vacinal</label>
                      <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded">
                        Idade: {ageInMonths} meses
                      </span>
                    </div>
                    
                    <div className="space-y-4">
                      {visibleSchedule.length > 0 ? (
                        visibleSchedule.map((group) => (
                          <div key={group.age} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                            <h4 className="text-[10px] font-bold text-primary mb-3 uppercase tracking-wider flex items-center gap-2">
                              <Calendar className="w-3 h-3" />
                              {group.label}
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {group.vaccines.map((v) => (
                                <label key={v.id} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 cursor-pointer hover:border-primary/30 transition-all group">
                                  <div className="relative flex items-center justify-center">
                                    <input 
                                      type="checkbox"
                                      checked={formData.clinicalData.crianca.vacinas[v.id] === 'Sim'}
                                      onChange={e => setFormData({
                                        ...formData,
                                        clinicalData: {
                                          ...formData.clinicalData,
                                          crianca: {
                                            ...formData.clinicalData.crianca,
                                            vacinas: {
                                              ...formData.clinicalData.crianca.vacinas,
                                              [v.id]: e.target.checked ? 'Sim' : 'Não'
                                            }
                                          }
                                        }
                                      })}
                                      className="w-5 h-5 rounded-md border-slate-300 text-primary focus:ring-primary/20 transition-colors cursor-pointer"
                                    />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors">
                                      {v.label}
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-medium">
                                      Recomendado: {group.label}
                                    </span>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                          <p className="text-xs text-slate-400 font-medium">
                            Informe a data de nascimento para visualizar o calendário vacinal.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {(catId === 'Adulto' || catId === 'Idoso') && (
              <section className={`bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border-l-4 ${catId === 'Adulto' ? 'border-slate-500' : 'border-red-500'}`}>
                <h3 className={`text-xl font-bold ${catId === 'Adulto' ? 'text-slate-600 dark:text-slate-400' : 'text-red-600 dark:text-red-400'} mb-8 font-headline flex items-center gap-2`}>
                  {catId === 'Adulto' ? <User className="w-6 h-6" /> : <HeartPulse className="w-6 h-6" />}
                  Categoria: {catId}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {catId === 'Idoso' && (
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                      <h4 className="col-span-full text-xs font-bold uppercase text-red-600 dark:text-red-400 flex items-center gap-2 mb-2">
                        <HeartPulse className="w-3 h-3" />
                        Acompanhamento Específico: Idoso
                      </h4>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Vacina Influenza</label>
                        <select 
                          value={formData.clinicalData.idoso.vacinaInfluenza || 'Não'}
                          onChange={e => setFormData({
                            ...formData, 
                            clinicalData: { 
                              ...formData.clinicalData, 
                              idoso: { ...formData.clinicalData.idoso, vacinaInfluenza: e.target.value } 
                            }
                          })}
                          className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm text-on-surface"
                        >
                          <option>Não</option>
                          <option>Sim</option>
                        </select>
                      </div>
                      {/* Visitas ACS para Idoso (Geral) */}
                      <div className="col-span-full space-y-4 mt-2">
                        <label className="block text-[10px] font-bold uppercase text-slate-400">Visita ACS (Mín. 2/ano)</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[8px] font-bold text-slate-500 uppercase mb-1">1ª Visita</label>
                            <input 
                              type="date" 
                              value={formData.clinicalData.idoso.visitaAcs1 || ''}
                              onChange={e => {
                                const v1 = e.target.value;
                                const v2 = calculateNextVisit(v1, 180);
                                setFormData({
                                  ...formData,
                                  clinicalData: {
                                    ...formData.clinicalData,
                                    idoso: { ...formData.clinicalData.idoso, visitaAcs1: v1, visitaAcs2: v2 }
                                  }
                                });
                              }}
                              className="w-full bg-white dark:bg-slate-800 border-none rounded-xl p-3 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] font-bold text-slate-500 uppercase mb-1">2ª Visita (Auto +180 dias)</label>
                            <input 
                              type="date" 
                              value={formData.clinicalData.idoso.visitaAcs2 || ''}
                              onChange={e => setFormData({
                                ...formData,
                                clinicalData: {
                                  ...formData.clinicalData,
                                  idoso: { ...formData.clinicalData.idoso, visitaAcs2: e.target.value }
                                }
                              })}
                              className="w-full bg-white dark:bg-slate-800 border-none rounded-xl p-3 text-sm"
                            />
                          </div>
                        </div>
                        {getVisitAlert(calculateNextVisit(formData.clinicalData.idoso.visitaAcs1, 180)) && (
                          <div className={`p-3 rounded-xl flex items-center gap-3 text-[10px] font-bold uppercase ${
                            getVisitAlert(calculateNextVisit(formData.clinicalData.idoso.visitaAcs1, 180))?.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            <Activity className="w-4 h-4" />
                            {getVisitAlert(calculateNextVisit(formData.clinicalData.idoso.visitaAcs1, 180))?.message}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Consulta Médica Anual</label>
                        <input 
                          type="date"
                          value={formData.clinicalData.idoso.consultaMedicaAnualData || ''}
                          onChange={e => setFormData({
                            ...formData, 
                            clinicalData: { 
                              ...formData.clinicalData, 
                              idoso: { ...formData.clinicalData.idoso, consultaMedicaAnualData: e.target.value } 
                            }
                          })}
                          className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm text-on-surface"
                        />
                        {getConsultationAlert(formData.clinicalData.idoso.consultaMedicaAnualData) && (
                          <div className={`mt-2 p-3 rounded-xl flex items-center gap-3 text-[10px] font-bold uppercase ${
                            getConsultationAlert(formData.clinicalData.idoso.consultaMedicaAnualData)?.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            <Activity className="w-4 h-4" />
                            {getConsultationAlert(formData.clinicalData.idoso.consultaMedicaAnualData)?.message}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        ))}

        <div className="flex items-center justify-end gap-4 pb-20">
          {id && (
            <button 
              type="button"
              onClick={generatePatientPDF}
              className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 rounded-2xl transition-all"
            >
              <FileText className="w-5 h-5" />
              Gerar PDF
            </button>
          )}
          {id && (
            <button 
              type="button"
              onClick={() => setDeleteConfirm(true)}
              className="mr-auto flex items-center gap-2 px-6 py-3 text-red-500 font-bold hover:bg-red-50 rounded-2xl transition-all"
            >
              <Trash2 className="w-5 h-5" />
              Excluir Cadastro
            </button>
          )}
          <button 
            type="button"
            onClick={() => navigate('/')}
            className="px-8 py-3 text-slate-500 dark:text-slate-400 font-bold hover:text-primary transition-colors"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            disabled={loading}
            className="px-10 py-4 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 min-w-[200px]"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin" />
                Salvando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="w-5 h-5" />
                {id ? 'Salvar Alterações' : 'Finalizar Cadastro'}
              </span>
            )}
          </button>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400">
                <AlertTriangle className="w-10 h-10" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-on-surface font-headline">Excluir Cadastro?</h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium">
                  Esta ação é irreversível. Todos os dados deste paciente e seu histórico de visitas serão removidos permanentemente.
                </p>
              </div>

              <div className="flex flex-col w-full gap-3">
                <button 
                  onClick={handleDelete}
                  disabled={deleting}
                  className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    'Sim, Excluir Permanentemente'
                  )}
                </button>
                <button 
                  onClick={() => setDeleteConfirm(false)}
                  disabled={deleting}
                  className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
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
