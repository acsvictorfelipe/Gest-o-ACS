import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { syncService } from '../lib/syncService';
import { generateUUID } from '../lib/utils';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useToast } from './Toast';
import { 
  X, 
  Download,
  Loader2,
  Home,
  CheckCircle2,
  AlertCircle,
  UserPlus
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { calculateAge, getAgeNumber, getAgeInMonths, vaccineLabels, formatDate, parseDate, validateCNS, getPatientLastVisitAt } from '../lib/dateUtils';
import { PersonalInfo } from './patient-form/PersonalInfo';
import { AddressInfo } from './patient-form/AddressInfo';
import { MedicalInfo } from './patient-form/MedicalInfo';
import { FormActions } from './patient-form/FormActions';



export function PatientForm({ user }: { user: any }) {
  const navigate = useNavigate();
  const { success, warning, error: toastError } = useToast();
  const { id } = useParams();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [originalLastVisitAt, setOriginalLastVisitAt] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // States for household side preview drawer
  const [showHouseholdDrawer, setShowHouseholdDrawer] = useState(false);
  const [householdData, setHouseholdData] = useState<any>(null);
  const [householdResidents, setHouseholdResidents] = useState<any[]>([]);
  const [householdVisits, setHouseholdVisits] = useState<any[]>([]);
  const [loadingHousehold, setLoadingHousehold] = useState(false);

  // Warn if the user tries to close the tab/refresh with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const isReadOnly = user.role === 'Gestor';

  const [formData, setFormData] = useState({
    name: '',
    cns: '',
    createdAt: '',
    responsibleCns: '',
    isFamilyResponsible: false,
    birthDate: '',
    gender: '',
    visitDate: '',
    visitType: 'Rotina',
    visitSummary: '',
    address: '',
    number: '',
    complement: '',
    contact: '',
    contact2: '',
    messageContact: '',
    householdId: '',
    categories: [] as string[],
    clinicalData: {
      historicoGestacoes: [] as any[],
      visitasGerais: [] as { date: string, summary: string }[],
      consultasGerais: [] as { date: string, summary: string }[],
      socialBenefits: [] as string[],
      receitas: [] as { dataEmissao: string, validade: string, dataVencimento: string }[],
      saudeMental: {
        notes: ''
      },
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
          consultas6Meses: 'Não',
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
          consultas6Meses: 'Não',
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
        planejamentoFamiliar: 'Não',
        diabetes: 'Não',
        diabetesData: {
          avaliacaoPes: 'Não',
          hemoglobinaGlicada: 'Não',
          visitaAcs1: '',
          visitaAcs2: ''
        },
        hipertensao: 'Não',
        hipertensaoData: {
          consultas6Meses: 'Não',
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
          consultas6Meses: 'Não',
          visitaAcs1: '',
          visitaAcs2: ''
        },
        notes: ''
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
          consultas6Meses: 'Não',
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
          setOriginalLastVisitAt(data.last_visit_at || null);
          const hData = data.households || {};
          
          setFormData({
            name: data.name || '',
            cns: data.cns || '',
            createdAt: data.created_at || '',
            responsibleCns: hData.responsible_cns || data.clinical_data?.responsible_cns || '',
            isFamilyResponsible: data.is_family_responsible || false,
            birthDate: data.birth_date || '',
            gender: data.gender || 'Feminino',
            visitDate: '',
            visitType: 'Rotina',
            visitSummary: '',
            address: hData.address || data.clinical_data?.address || '',
            number: hData.number || data.clinical_data?.address_number || '',
            complement: hData.complement || data.clinical_data?.address_complement || '',
            contact: data.clinical_data?.contact || '',
            contact2: data.clinical_data?.contact2 || '',
            messageContact: data.clinical_data?.message_contact || '',
            householdId: data.household_id || '',
            categories: data.categories || [],
            clinicalData: {
              ...formData.clinicalData,
              ...data.clinical_data,
              saudeMental: data.clinical_data?.saudeMental || { notes: '' },
              rastreamento: {
                exameCitopatologico: 'Não',
                saudeSexualReprodutiva: 'Não',
                mamografia: 'Não',
                vacinaHpv: 'Não',
                ...(data.clinical_data?.rastreamento || {})
              },
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
                planejamentoFamiliar: data.clinical_data?.gestante?.planejamentoFamiliar || 'Não',
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
        
        success('Exclusão agendada para sincronização.');
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
      toastError(error.message || "Erro ao excluir paciente.");
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
      ['Data de Nascimento', formData.birthDate ? formatDate(formData.birthDate) : 'N/A'],
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


  // Preencher endereço automaticamente ao digitar o CNS do responsável
  React.useEffect(() => {
    const cns = formData.responsibleCns?.replace(/\D/g, '');
    if (!cns || cns.length < 15 || formData.isFamilyResponsible) return;

    // Debounce: aguardar 600ms após parar de digitar
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('patients')
        .select('clinical_data, cns')
        .eq('cns', cns)
        .eq('agent_id', user.id)
        .maybeSingle();

      if (data?.clinical_data) {
          const cd = data.clinical_data;
          setFormData((prev: any) => ({
            ...prev,
            address: prev.address || cd.address || '',
            number: prev.number || cd.address_number || '',
            complement: prev.complement || cd.address_complement || '',
            contact: prev.contact || cd.contact || '',
            contact2: prev.contact2 || cd.contact2 || cd.message_contact || '',
            messageContact: prev.messageContact || cd.messageContact || cd.message_contact || '',
          }));
        }
    }, 600);

    return () => clearTimeout(timer);
  }, [formData.responsibleCns, formData.isFamilyResponsible]);

  // Automate category selection based on birth date

  React.useEffect(() => {
    if (!formData.birthDate) return;
    
    const ageNum = getAgeNumber(formData.birthDate);
    const ageInMonths = getAgeInMonths(formData.birthDate);
    
    setFormData(prev => {
      const currentCategories = [...prev.categories];
      let changed = false;

      // Rule for Idoso (60+ years)
      if (ageNum >= 60) {
        if (!currentCategories.includes('Idoso')) {
          currentCategories.push('Idoso');
          changed = true;
        }
      } else {
        if (currentCategories.includes('Idoso')) {
          const index = currentCategories.indexOf('Idoso');
          if (index > -1) {
            currentCategories.splice(index, 1);
            changed = true;
          }
        }
      }

      // Rule for Criança (0-24 months)
      if (ageInMonths <= 24) {
        if (!currentCategories.includes('Criança')) {
          currentCategories.push('Criança');
          changed = true;
        }
        if (currentCategories.includes('Adulto')) {
          currentCategories.splice(currentCategories.indexOf('Adulto'), 1);
          changed = true;
        }
      } 
      // Rule for Adulto (24 months to 60 years)
      else if (ageNum < 60) {
        if (!currentCategories.includes('Adulto')) {
          currentCategories.push('Adulto');
          changed = true;
        }
        if (currentCategories.includes('Criança')) {
          currentCategories.splice(currentCategories.indexOf('Criança'), 1);
          changed = true;
        }
      }

      if (changed) {
        return { ...prev, categories: currentCategories };
      }
      return prev;
    });
  }, [formData.birthDate]);

  const handleChange = (updater: any) => {
    setIsDirty(true);
    if (typeof updater === 'function') {
      setFormData(updater);
    } else {
      setFormData(updater);
    }
  };

  const downloadVCard = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const name = formData.name || 'Paciente';
    const contact = formData.contact || '';
    const address = formData.address || '';
    const number = formData.number || '';
    const complement = formData.complement || '';
    const fullAddress = address ? `${address}, ${number}${complement ? ` - ${complement}` : ''}`.trim() : '';

    const vcard = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN;CHARSET=UTF-8:${name}`,
      contact ? `TEL;TYPE=CELL,VOICE:${contact}` : '',
      address ? `ADR;TYPE=HOME;CHARSET=UTF-8:;;${address};;;;` : '',
      fullAddress ? `NOTE;CHARSET=UTF-8:Endereço: ${fullAddress}` : '',
      'END:VCARD'
    ].filter(Boolean).join('\r\n');

    const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    a.download = `contato_${safeName}.vcf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação de CNS SUS do Paciente
    if (formData.cns) {
      const isCnsValid = validateCNS(formData.cns);
      if (!isCnsValid) {
        const confirmSave = window.confirm(
          `Atenção: O Cartão SUS (CNS) "${formData.cns}" do paciente não atende aos critérios do algoritmo oficial de validação do SUS (com 15 dígitos válidos).\n\nDeseja prosseguir e salvar mesmo assim?`
        );
        if (!confirmSave) return;
      }
    }

    // Validação de CNS SUS do Responsável
    if (formData.responsibleCns && !formData.isFamilyResponsible) {
      const isRespCnsValid = validateCNS(formData.responsibleCns);
      if (!isRespCnsValid) {
        const confirmSave = window.confirm(
          `Atenção: O CNS do Responsável "${formData.responsibleCns}" não atende aos critérios do algoritmo oficial de validação do SUS.\n\nDeseja prosseguir e salvar mesmo assim?`
        );
        if (!confirmSave) return;
      }
    }

    setLoading(true);
    setIsDirty(false); // Reset dirty flag so navigation after save doesn't warn

    const cleanClinicalData = { ...formData.clinicalData };
    if (cleanClinicalData.visitasGerais) {
      cleanClinicalData.visitasGerais = cleanClinicalData.visitasGerais.filter((v: any) => v && v.date);
    }
    if (cleanClinicalData.consultasGerais) {
      cleanClinicalData.consultasGerais = cleanClinicalData.consultasGerais.filter((c: any) => c && c.date);
    }

    let isArchived = false;
    if (formData.categories?.includes('Gestante') && cleanClinicalData.gestante?.puerperioVisita) {
      const historicoGestacoes = Array.isArray(cleanClinicalData.historicoGestacoes) 
        ? [...cleanClinicalData.historicoGestacoes] 
        : [];
      
      const gestacaoParaArquivar = { 
        ...cleanClinicalData.gestante, 
        arquivadoEm: new Date().toISOString() 
      };
      
      historicoGestacoes.push(gestacaoParaArquivar);
      cleanClinicalData.historicoGestacoes = historicoGestacoes;

      // Reset active gestante data
      cleanClinicalData.gestante = {
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
        planejamentoFamiliar: 'Não',
        diabetes: 'Não',
        diabetesData: {
          avaliacaoPes: 'Não',
          hemoglobinaGlicada: 'Não',
          visitaAcs1: '',
          visitaAcs2: ''
        },
        hipertensao: 'Não',
        hipertensaoData: {
          consultas6Meses: 'Não',
          visitaAcs1: '',
          visitaAcs2: ''
        }
      };

      formData.categories = formData.categories.filter((cat: string) => cat !== 'Gestante');
      isArchived = true;
    }

    if (isArchived) {
      success("Visita de puerpério detectada: a gestação atual foi arquivada no histórico com sucesso, e a paciente foi removida da categoria Gestantes.");
    }
    
    try {
      // 1. Check if Household with this Responsible CNS already exists
      const targetCns = formData.isFamilyResponsible ? formData.cns : formData.responsibleCns;
      let householdId: string | null = formData.householdId || null;

      if (!navigator.onLine) {
        const existingHouseholdId = formData.householdId;
        // Only generate a new household ID if both CNS and Address are present
        if (targetCns && formData.address && !existingHouseholdId) {
          householdId = generateUUID();
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
        } else if (existingHouseholdId) {
          householdId = existingHouseholdId;
          if (formData.isFamilyResponsible) {
            await syncService.addToQueue('households', 'UPDATE', {
              id: householdId,
              responsible_name: formData.name,
              address: formData.address,
              number: formData.number,
              complement: formData.complement,
              microarea: user.microarea,
              area_color: user.color || '#00488d',
              agent_id: user.id
            });
          }
        }

        const patientAgeNum = getAgeNumber(formData.birthDate);
        
        let finalCategories = [...(formData.categories || [])];
        if (patientAgeNum >= 60 && !finalCategories.includes('Idoso')) {
          finalCategories.push('Idoso');
        }

        const patientData = {
          id: id || generateUUID(),
          name: formData.name,
          cns: formData.cns,
          is_family_responsible: formData.isFamilyResponsible,
          birth_date: formData.birthDate,
          gender: formData.gender,
          household_id: householdId,
          categories: finalCategories,
          microarea: user.microarea,
          area_color: user.color || '#00488d',
          agent_id: user.id,
          clinical_data: {
            ...cleanClinicalData,
            contact: formData.contact,
            contact2: formData.contact2,
            message_contact: formData.messageContact,
            responsible_cns: targetCns,
            address: formData.address,
            address_number: formData.number,
            address_complement: formData.complement
          },
          last_visit_at: originalLastVisitAt as any
        };

        // Determine latest visit across original state/form visit and clinical data
        let computedLastVisitAt = originalLastVisitAt;
        if (formData.visitDate) {
          const formVisitDate = new Date(formData.visitDate);
          if (!isNaN(formVisitDate.getTime())) {
            const isoVisitStr = new Date(formData.visitDate + 'T12:00:00').toISOString();
            if (!computedLastVisitAt || new Date(isoVisitStr) > new Date(computedLastVisitAt)) {
              computedLastVisitAt = isoVisitStr;
            }
          }
        }
        patientData.last_visit_at = computedLastVisitAt;

        const latestVisitDate = getPatientLastVisitAt(patientData);
        if (latestVisitDate) {
          patientData.last_visit_at = latestVisitDate;
        }

        await syncService.addToQueue('patients', id ? 'UPDATE' : 'INSERT', patientData);
        
        if (formData.visitDate) {
          await syncService.addToQueue('visits', 'INSERT', {
            id: generateUUID(),
            patient_id: patientData.id,
            agent_id: user.id,
            date: formData.visitDate,
            type: formData.visitType,
            summary: formData.visitSummary,
            microarea: user.microarea,
            area_color: user.color || '#00488d'
          });
        }

        const getRedirectFilter = (categories: string[]) => {
          if (categories.includes('Gestante')) return 'gestantes';
          if (categories.includes('Criança')) return 'criancas';
          if (categories.includes('Idoso')) return 'idosos';
          if (categories.includes('Adulto')) return 'adultos';
          if (categories.includes('Hipertenso')) return 'hipertensos';
          if (categories.includes('Diabético')) return 'diabéticos';
          if (categories.includes('AcamadoDomiciliado')) return 'acamados';
          return 'all';
        };

        success('Dados salvos localmente. Serão sincronizados quando houver internet.');
        setTimeout(() => {
          window.location.hash = `#/pacientes?filter=${getRedirectFilter(finalCategories)}`;
          window.location.reload();
        }, 1500);
        return;
      }

      if (targetCns) {
        const { data: householdData, error: hError } = await supabase
          .from('households')
          .select('id')
          .eq('responsible_cns', targetCns)
          .maybeSingle();

        if (hError) throw hError;

        if (householdData) {
          // Household exists, use it
          householdId = householdData.id;
          
          // If this patient is the responsible, update household info (and ensure it is in the current microarea)
          if (formData.isFamilyResponsible) {
            const { error: updateHError } = await supabase
              .from('households')
              .update({
                responsible_name: formData.name,
                address: formData.address,
                number: formData.number,
                complement: formData.complement,
                microarea: user.microarea,
                area_color: user.color || '#00488d',
                agent_id: user.id
              })
              .eq('id', householdId);
            if (updateHError) throw updateHError;
          }
        } else {
          // Create new Household only if they are the responsible AND have an address
          if (formData.isFamilyResponsible && formData.address) {
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
      } else {
        // No target CNS provided, patient will be registered without a household link
        // unless they already have one (e.g. editing)
        if (!householdId) {
          householdId = null;
        }
      }

      // 2. Create or Update Patient
      const patientData = {
        name: formData.name,
        cns: formData.cns,
        is_family_responsible: formData.isFamilyResponsible,
        birth_date: formData.birthDate,
        gender: formData.gender,
        household_id: householdId,
        categories: formData.categories,
        microarea: user.microarea,
        area_color: user.color || '#00488d',
        agent_id: user.id,
        clinical_data: {
          ...cleanClinicalData,
          contact: formData.contact,
          message_contact: formData.messageContact,
          responsible_cns: targetCns,
          address: formData.address,
          address_number: formData.number,
          address_complement: formData.complement
        },
        last_visit_at: originalLastVisitAt as any
      };

      // Determine latest visit across original state/form visit and clinical data
      let computedLastVisitAt = originalLastVisitAt;
      if (formData.visitDate) {
        const formVisitDate = new Date(formData.visitDate);
        if (!isNaN(formVisitDate.getTime())) {
          const isoVisitStr = new Date(formData.visitDate + 'T12:00:00').toISOString();
          if (!computedLastVisitAt || new Date(isoVisitStr) > new Date(computedLastVisitAt)) {
            computedLastVisitAt = isoVisitStr;
          }
        }
      }
      patientData.last_visit_at = computedLastVisitAt;

      const latestVisitDate = getPatientLastVisitAt(patientData);
      if (latestVisitDate) {
        patientData.last_visit_at = latestVisitDate;
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

      const getRedirectFilter = (categories: string[]) => {
        if (categories.includes('Gestante')) return 'gestantes';
        if (categories.includes('Criança')) return 'criancas';
        if (categories.includes('Idoso')) return 'idosos';
        if (categories.includes('Hipertenso')) return 'hipertensos';
        if (categories.includes('Diabético')) return 'diabéticos';
        if (categories.includes('AcamadoDomiciliado')) return 'acamados';
        return 'all';
      };

      success('Paciente salvo com sucesso!');
      setTimeout(() => {
        window.location.hash = `#/pacientes?filter=${getRedirectFilter(formData.categories)}`;
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      console.error("Error saving patient:", error);
      toastError(error.message || "Erro ao salvar paciente.");
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
        
        if (!formData.clinicalData?.crianca?.proximaVisitaSugerida) {
          setFormData((prev: any) => ({
            ...prev,
            clinicalData: {
              ...prev.clinicalData,
              crianca: {
                ...(prev.clinicalData?.crianca || {}),
                proximaVisitaSugerida: nextVisitStr
              }
            }
          }));
        }
      }
    }
  }, [formData.birthDate, formData.categories]);

  useEffect(() => {
    if (formData.categories.includes('Gestante') && formData.clinicalData?.gestante?.dum) {
      const dum = formData.clinicalData.gestante.dum;
      // Parse date manually to avoid timezone issues
      const parts = dum.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const day = parseInt(parts[2]);
        
        const dumDate = new Date(year, month, day);
        if (!isNaN(dumDate.getTime())) {
          const dppDate = new Date(dumDate);
          // Naegele's Rule: Add 7 days and 9 months
          dppDate.setDate(dppDate.getDate() + 7);
          dppDate.setMonth(dppDate.getMonth() + 9);
          
          const y = dppDate.getFullYear();
          const m = String(dppDate.getMonth() + 1).padStart(2, '0');
          const d = String(dppDate.getDate()).padStart(2, '0');
          const dppStr = `${y}-${m}-${d}`;
          
          if (formData.clinicalData.gestante.dpp !== dppStr) {
            setFormData((prev: any) => ({
              ...prev,
              clinicalData: {
                ...prev.clinicalData,
                gestante: {
                  ...(prev.clinicalData?.gestante || {}),
                  dpp: dppStr
                }
              }
            }));
          }
        }
      }
    }
  }, [formData.clinicalData?.gestante?.dum, formData.categories]);



  // Sync address and contact from CNS
  useEffect(() => {
    const syncDataFromCns = async () => {
      const targetCns = formData.isFamilyResponsible ? formData.cns : formData.responsibleCns;
      
      if (targetCns && targetCns.length === 15) {
        try {
          const { data: householdData } = await supabase
            .from('households')
            .select('address, number, complement')
            .eq('responsible_cns', targetCns)
            .maybeSingle();

          const { data: patientData } = await supabase
            .from('patients')
            .select('clinical_data')
            .eq('cns', targetCns)
            .maybeSingle();

          if (householdData || patientData) {
            setFormData(prev => ({
              ...prev,
              address: prev.address || householdData?.address || '',
              number: prev.number || householdData?.number || '',
              complement: prev.complement || householdData?.complement || '',
              contact: prev.contact || patientData?.clinical_data?.contact || ''
            }));
          }
        } catch (error) {
          console.error("Error syncing data from CNS:", error);
        }
      }
    };
    syncDataFromCns();
  }, [formData.cns, formData.responsibleCns, formData.isFamilyResponsible]);

  // Fetch household details for the slide-over preview drawer
  useEffect(() => {
    const fetchHouseholdDetails = async () => {
      if (!showHouseholdDrawer || !formData.householdId) return;
      setLoadingHousehold(true);
      try {
        // 1. Fetch household info
        const { data: hData, error: hError } = await supabase
          .from('households')
          .select('*')
          .eq('id', formData.householdId)
          .single();
        
        if (hError) throw hError;
        setHouseholdData(hData);

        // 2. Fetch residents
        const { data: rData, error: rError } = await supabase
          .from('patients')
          .select('*')
          .eq('household_id', formData.householdId);
        
        if (rError) throw rError;
        setHouseholdResidents(rData || []);

        // 3. Fetch recent visits of all residents combined
        if (rData && rData.length > 0) {
          const residentIds = rData.map(r => r.id);
          const { data: vData, error: vError } = await supabase
            .from('visits')
            .select('*')
            .in('patient_id', residentIds)
            .order('date', { ascending: false })
            .limit(5);
          
          if (vError) throw vError;
          setHouseholdVisits(vData || []);
        } else {
          setHouseholdVisits([]);
        }
      } catch (error) {
        console.error("Error fetching drawer household details:", error);
      } finally {
        setLoadingHousehold(false);
      }
    };

    fetchHouseholdDetails();
  }, [showHouseholdDrawer, formData.householdId]);

  const hasExpiredPrescription = () => {
    const isMentalOrAcamado = formData.categories?.includes('SaudeMental') || formData.categories?.includes('AcamadoDomiciliado');
    if (!isMentalOrAcamado) return false;

    const recipes = formData.clinicalData?.receitas || [];
    if (recipes.length === 0) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return recipes.some((rec: any) => {
      if (!rec.dataVencimento) return false;
      const expiry = new Date(rec.dataVencimento);
      return expiry < today;
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-2 duration-300">
      {hasExpiredPrescription() && (
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl p-4 text-red-700 dark:text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400 animate-pulse" />
          <div className="text-xs font-semibold uppercase tracking-wider">
            Atenção: Este paciente possui receita de medicamento vencida! Verifique e atualize os prazos na seção "Receitas".
          </div>
        </div>
      )}

      <div className="flex justify-between items-center bg-white dark:bg-slate-900 px-6 py-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <header className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white uppercase">{id ? 'Editar Cadastro' : 'Novo Cadastro'}</h2>
          <p className="text-xs text-slate-500 font-medium tracking-tight">Preencha as informações detalhadas do prontuário.</p>
        </header>
        <div className="flex items-center gap-2">
          {formData.householdId && (
            <button 
              type="button" 
              onClick={() => {
                if (isDirty && !window.confirm('Há alterações não salvas. Deseja sair sem salvar para acessar o cadastro do domicílio?')) return;
                navigate(`/domicilio/${formData.householdId}`);
              }}
              className="p-2 text-slate-500 hover:text-primary dark:hover:text-teal-400 transition-colors bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center gap-1.5 text-xs font-semibold"
              title="Acessar Cadastro do Domicílio"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Ver Domicílio</span>
            </button>
          )}
          {id && (
            <button 
              type="button" 
              onClick={() => downloadVCard()}
              className="p-2 text-slate-500 hover:text-primary dark:hover:text-teal-400 transition-colors bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center gap-1.5 text-xs font-semibold"
              title="Salvar nos contatos"
            >
              <UserPlus className="w-4 h-4 text-blue-500 shrink-0" />
              <span className="hidden sm:inline">Salvar Contato</span>
            </button>
          )}
          {id && (
            <button 
              type="button" 
              onClick={generatePatientPDF}
              className="p-2 text-slate-500 hover:text-primary transition-colors bg-slate-50 rounded-lg"
              title="Gerar Ficha PDF"
            >
              <Download className="w-5 h-5" />
            </button>
          )}
          <button 
            onClick={() => {
              if (isDirty && !window.confirm('Há alterações não salvas. Deseja sair sem salvar?')) return;
              navigate('/');
            }} 
            className="p-2 text-slate-500 hover:text-red-500 transition-colors bg-slate-50 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 pb-20">
        <fieldset disabled={isReadOnly} className="space-y-8 contents">
          <PersonalInfo formData={formData} setFormData={setFormData} />
          <AddressInfo formData={formData} setFormData={setFormData} streets={user.streets} />
          <MedicalInfo formData={formData} setFormData={setFormData} id={id} />
        </fieldset>

        <FormActions 
          id={id} 
          loading={loading} 
          deleting={deleting} 
          deleteConfirm={deleteConfirm} 
          setDeleteConfirm={setDeleteConfirm} 
          handleDelete={handleDelete} 
          onCancel={() => {
            if (isDirty && !window.confirm('Há alterações não salvas. Deseja sair sem salvar?')) return;
            navigate('/pacientes');
          }}
          isReadOnly={isReadOnly}
        />
      </form>

      {/* Floating Action Button (FAB) */}
      {formData.householdId && !showHouseholdDrawer && (
        <button
          type="button"
          onClick={() => setShowHouseholdDrawer(true)}
          className="fixed right-6 bottom-6 z-40 bg-primary hover:bg-primary-dark text-white rounded-full p-4 shadow-2xl hover:shadow-primary/30 active:scale-95 transition-all flex items-center gap-2 group md:px-5"
          title="Ver Domicílio na tela"
        >
          <Home className="w-5 h-5" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out font-bold text-xs uppercase tracking-wider hidden md:inline-block">
            Ver Domicílio
          </span>
        </button>
      )}

      {/* Slide-over Drawer Panel */}
      {showHouseholdDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
            onClick={() => setShowHouseholdDrawer(false)}
          />
          
          {/* Drawer Panel */}
          <div className="relative w-full max-w-lg md:max-w-xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col z-10 border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-300">
            
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2">
                <Home className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">Detalhes do Domicílio</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Consulta rápida da residência do cidadão</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowHouseholdDrawer(false)}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {loadingHousehold ? (
                <div className="flex flex-col items-center justify-center h-64 space-y-4">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Carregando informações...</p>
                </div>
              ) : householdData ? (
                <>
                  {/* Household Info Card */}
                  <div className="bg-gradient-to-br from-primary to-primary-dark dark:from-teal-800 dark:to-teal-950 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
                    <div className="absolute right-0 top-0 h-full w-1/3 bg-white/10 skew-x-12 translate-x-12"></div>
                    <div className="relative z-10">
                      <span className="text-[9px] font-bold uppercase tracking-widest opacity-75 block mb-1">Responsável Familiar</span>
                      <h4 className="text-xl font-bold font-headline mb-4">{householdData.responsible_name}</h4>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs bg-white/15 px-3 py-1.5 rounded-lg w-fit">
                          <span className="font-semibold opacity-85">SUS:</span>
                          <span>{householdData.responsible_cns}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs bg-white/15 px-3 py-1.5 rounded-lg">
                          <span className="font-semibold opacity-85">Endereço:</span>
                          <span>{householdData.address}, {householdData.number} {householdData.complement ? ` - ${householdData.complement}` : ''}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Residents List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Moradores ({householdResidents.length})</h4>
                    </div>
                    
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800/50 p-2 space-y-1">
                      {householdResidents.map(r => (
                        <div 
                          key={r.id} 
                          className="flex items-center justify-between p-3 rounded-xl hover:bg-white dark:hover:bg-slate-800/50 transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-850 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                              {r.name?.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{r.name}</p>
                              <p className="text-[9px] text-slate-500 dark:text-slate-400">CNS: {r.cns}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[8px] px-2 py-0.5 rounded font-bold uppercase ${
                              r.is_family_responsible 
                                ? 'bg-primary/10 text-primary dark:bg-teal-500/20 dark:text-teal-400' 
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                            }`}>
                              {r.is_family_responsible ? 'Responsável' : 'Dependente'}
                            </span>
                            {r.id !== id && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (isDirty && !window.confirm('Há alterações não salvas. Deseja sair do formulário atual para ver outro cidadão?')) return;
                                  setShowHouseholdDrawer(false);
                                  navigate(`/editar-paciente/${r.id}`);
                                }}
                                className="text-[10px] text-primary dark:text-teal-400 font-bold hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                Editar
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Visit History */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Últimas Visitas</h4>
                    {householdVisits.length > 0 ? (
                      <div className="space-y-4 bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/50 rounded-2xl p-4">
                        {householdVisits.map((v, i) => (
                          <div key={v.id} className="flex gap-3 relative">
                            {i !== householdVisits.length - 1 && <div className="absolute left-[9px] top-6 bottom-[-16px] w-[1px] bg-slate-200 dark:bg-slate-850"></div>}
                            <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400 z-10 shrink-0 mt-0.5">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </div>
                            <div className="text-xs">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-slate-800 dark:text-slate-200">{v.type}</span>
                                <span className="text-[9px] bg-slate-200 dark:bg-slate-850 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-medium">
                                  {formatDate(v.date)}
                                </span>
                              </div>
                              <p className="text-slate-500 dark:text-slate-400 leading-normal">{v.summary}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center p-4 bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/50 rounded-2xl text-xs text-slate-500 dark:text-slate-400">
                        Nenhuma visita registrada recentemente para este domicílio.
                      </div>
                    )}
                  </div>

                  {/* Bottom Actions */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (isDirty && !window.confirm('Há alterações não salvas. Deseja sair sem salvar para ver o domicílio completo?')) return;
                        setShowHouseholdDrawer(false);
                        navigate(`/domicilio/${householdData.id}`);
                      }}
                      className="w-full py-3 bg-primary text-white text-xs font-bold rounded-xl shadow-md hover:bg-primary-dark transition-all flex items-center justify-center gap-2"
                    >
                      Abrir Domicílio Completo
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center p-8 text-sm text-slate-500 dark:text-slate-400">
                  Erro ao carregar o domicílio. Verifique se ele foi criado corretamente.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
