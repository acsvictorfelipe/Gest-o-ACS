import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { syncService } from '../lib/syncService';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { 
  X, 
  Download,
  Loader2
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { calculateAge, vaccineLabels, formatDate, parseDate } from '../lib/dateUtils';
import { PersonalInfo } from './patient-form/PersonalInfo';
import { AddressInfo } from './patient-form/AddressInfo';
import { MedicalInfo } from './patient-form/MedicalInfo';
import { FormActions } from './patient-form/FormActions';



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
      socialBenefits: [] as string[],
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
          const hData = data.households || {};
          
          setFormData({
            name: data.name || '',
            cns: data.cns || '',
            responsibleCns: hData.responsible_cns || data.clinical_data?.responsible_cns || '',
            isFamilyResponsible: data.is_family_responsible || false,
            birthDate: data.birth_date || '',
            gender: data.gender || 'Feminino',
            visitDate: '',
            visitType: 'Rotina',
            visitSummary: '',
            address: hData.address || '',
            number: hData.number || '',
            complement: hData.complement || '',
            contact: data.clinical_data?.contact || '',
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


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // 1. Check if Household with this Responsible CNS already exists
      const targetCns = formData.isFamilyResponsible ? formData.cns : formData.responsibleCns;
      let householdId: string | null = formData.householdId || null;

      if (!navigator.onLine) {
        const existingHouseholdId = formData.householdId;
        if (targetCns && !existingHouseholdId) {
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
        } else if (existingHouseholdId) {
          householdId = existingHouseholdId;
          if (formData.isFamilyResponsible) {
            await syncService.addToQueue('households', 'UPDATE', {
              id: householdId,
              responsible_name: formData.name,
              address: formData.address,
              number: formData.number,
              complement: formData.complement
            });
          }
        }

        const patientData = {
          id: id || crypto.randomUUID(),
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
            ...formData.clinicalData,
            contact: formData.contact,
            message_contact: formData.messageContact,
            responsible_cns: targetCns
          },
          last_visit_at: formData.visitDate ? new Date().toISOString() : undefined
        };

        await syncService.addToQueue('patients', id ? 'UPDATE' : 'INSERT', patientData);
        
        if (formData.visitDate) {
          await syncService.addToQueue('visits', 'INSERT', {
            id: crypto.randomUUID(),
            patient_id: patientData.id,
            agent_id: user.id,
            date: formData.visitDate,
            type: formData.visitType,
            summary: formData.visitSummary,
            microarea: user.microarea,
            area_color: user.color || '#00488d'
          });
        }

        alert('Dados salvos localmente. Serão sincronizados quando houver internet.');
        navigate('/');
        return;
      }

      if (targetCns) {
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
                complement: formData.complement
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
          ...formData.clinicalData,
          contact: formData.contact,
          message_contact: formData.messageContact,
          responsible_cns: targetCns
        }
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
        
        if (!formData.clinicalData?.crianca?.proximaVisitaSugerida) {
          setFormData(prev => ({
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
            setFormData(prev => ({
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


  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-2 duration-300">
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 px-6 py-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <header className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white uppercase">{id ? 'Editar Cadastro' : 'Novo Cadastro'}</h2>
          <p className="text-xs text-slate-500 font-medium tracking-tight">Preencha as informações detalhadas do prontuário.</p>
        </header>
        <div className="flex items-center gap-2">
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
          <button onClick={() => navigate('/')} className="p-2 text-slate-500 hover:text-red-500 transition-colors bg-slate-50 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 pb-20">
        <PersonalInfo formData={formData} setFormData={setFormData} />
        <AddressInfo formData={formData} setFormData={setFormData} />
        <MedicalInfo formData={formData} setFormData={setFormData} id={id} />
        <FormActions 
          id={id} 
          loading={loading} 
          deleting={deleting} 
          deleteConfirm={deleteConfirm} 
          setDeleteConfirm={setDeleteConfirm} 
          handleDelete={handleDelete} 
          onCancel={() => navigate('/pacientes')} 
        />
      </form>
    </div>
  );
}

