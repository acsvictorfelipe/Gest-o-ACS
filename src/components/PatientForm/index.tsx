import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Loader2, Home, X, CheckCircle2, MapPin, Users } from 'lucide-react';

import { supabase } from '../../lib/supabase';
import { syncService } from '../../lib/syncService';
import { useToast } from '../Toast';
import { useConfirm } from '../ui/ConfirmDialog';
import { patientFormSchema, initialDefaultValues } from '../patient-form/patientSchema';
import { calculateAge, getAgeNumber, vaccineLabels, formatDate } from '../../lib/dateUtils';
import { getTemplateForType, isDefaultVisitTemplate } from '../../constants/visitTemplates';

// Extracted Hooks
import { usePatientFormSave } from './hooks/usePatientFormSave';
import { usePatientCategories } from './hooks/usePatientCategories';

// Extracted Components
import { PatientFormHeader } from './PatientFormHeader';
import { HouseholdResidentsModal } from './HouseholdResidentsModal';
import { DadosPessoaisSection } from './PatientFormSections/DadosPessoaisSection';
import { EnderecoSection } from './PatientFormSections/EnderecoSection';
import { CategoriesSection } from './PatientFormSections/CategoriesSection';
import { VisitaSection } from './PatientFormSections/VisitaSection';
import { DadosClinicosTabs } from './PatientFormSections/DadosClinicosTabs';
import { FormActions } from '../patient-form/FormActions';

const safeMergeClinicalData = (dbClinical: any, defaultClinical: any): any => {
  if (dbClinical === null || dbClinical === undefined) {
    return JSON.parse(JSON.stringify(defaultClinical));
  }
  
  if (
    typeof defaultClinical === 'object' &&
    defaultClinical !== null &&
    !Array.isArray(defaultClinical) &&
    Object.keys(defaultClinical).length === 0 &&
    typeof dbClinical === 'object' &&
    dbClinical !== null &&
    !Array.isArray(dbClinical)
  ) {
    return { ...dbClinical };
  }

  const result = JSON.parse(JSON.stringify(defaultClinical));
  
  for (const key of Object.keys(result)) {
    const dbVal = dbClinical[key];
    if (dbVal === null || dbVal === undefined) {
      continue;
    }
    
    const defaultVal = result[key];
    
    if (Array.isArray(defaultVal)) {
      result[key] = Array.isArray(dbVal) ? dbVal : [];
    } else if (typeof defaultVal === 'object' && defaultVal !== null) {
      if (Object.keys(defaultVal).length === 0 && typeof dbVal === 'object' && dbVal !== null && !Array.isArray(dbVal)) {
        result[key] = { ...dbVal };
      } else {
        result[key] = safeMergeClinicalData(dbVal, defaultVal);
      }
    } else {
      if (typeof defaultVal === typeof dbVal) {
        result[key] = dbVal;
      } else {
        if (typeof defaultVal === 'string') {
          result[key] = dbVal !== null && dbVal !== undefined ? String(dbVal) : '';
        } else if (typeof defaultVal === 'boolean') {
          result[key] = Boolean(dbVal);
        } else {
          result[key] = dbVal;
        }
      }
    }
  }

  if (typeof dbClinical === 'object' && dbClinical !== null && !Array.isArray(dbClinical)) {
    for (const key of Object.keys(dbClinical)) {
      if (!(key in result) && dbClinical[key] !== undefined && dbClinical[key] !== null) {
        result[key] = dbClinical[key];
      }
    }
  }

  return result;
};

export function PatientForm({ 
  user, 
  patientId: propPatientId, 
  onClose, 
  onSaveSuccess 
}: { 
  user: any; 
  patientId?: string; 
  onClose?: () => void; 
  onSaveSuccess?: () => void; 
}) {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const confirm = useConfirm();
  const { id: paramId } = useParams();
  const id = propPatientId || paramId;
  const location = useLocation();

  const [loading, setLoading] = useState(false);
  const [originalLastVisitAt, setOriginalLastVisitAt] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // State for household residents pop-up modal
  const [showHouseholdDrawer, setShowHouseholdDrawer] = useState(false);
  const [parentHousehold, setParentHousehold] = useState<any>(null);

  const isReadOnly = user.role === 'Gestor';

  const methods = useForm<any>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: initialDefaultValues,
  });

  const formData = methods.watch();

  const setFormData = useCallback((updater: any) => {
    setIsDirty(true);
    if (typeof updater === 'function') {
      const currentValues = methods.getValues();
      const nextValues = updater(currentValues);
      methods.reset(nextValues);
    } else {
      methods.reset(updater);
    }
  }, [methods]);

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

  // 1. Fetch Patient Details on Mount / Edit Mode
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
          
          const cleanClinical = {
            ...(data.clinical_data || {}),
            ...safeMergeClinicalData(data.clinical_data || {}, initialDefaultValues.clinicalData)
          };
          
          setFormData({
            name: data.name || '',
            cns: data.cns || '',
            createdAt: data.created_at || '',
            responsibleCns: hData.responsible_cns || cleanClinical.responsible_cns || '',
            isFamilyResponsible: data.is_family_responsible || false,
            birthDate: data.birth_date || '',
            gender: data.gender || 'Feminino',
            visitDate: '',
            visitType: 'Rotina',
            visitSummary: '',
            address: hData.address || cleanClinical.address || '',
            number: hData.number || cleanClinical.address_number || '',
            complement: hData.complement || cleanClinical.address_complement || '',
            contact: cleanClinical.contact || '',
            contact2: cleanClinical.contact2 || '',
            messageContact: cleanClinical.message_contact || '',
            householdId: data.household_id || '',
            categories: (() => {
              const rawCats: string[] = Array.isArray(data.categories) ? [...data.categories] : [];
              if (!rawCats.includes('AcamadoDomiciliado')) return rawCats;
              const cond = cleanClinical.acamadodomiciliado?.condicao;
              const filtered = rawCats.filter(c => c !== 'AcamadoDomiciliado');
              if (cond === 'Domiciliado') {
                if (!filtered.includes('Domiciliado')) filtered.push('Domiciliado');
              } else if (cond === 'Acamado e Domiciliado') {
                if (!filtered.includes('Acamado')) filtered.push('Acamado');
                if (!filtered.includes('Domiciliado')) filtered.push('Domiciliado');
              } else {
                if (!filtered.includes('Acamado')) filtered.push('Acamado');
              }
              return filtered;
            })(),
            clinicalData: {
              ...initialDefaultValues.clinicalData,
              ...cleanClinical,
              saudeMental: cleanClinical.saudeMental || { notes: '' },
              rastreamento: {
                exameCitopatologico: 'Não',
                saudeSexualReprodutiva: 'Não',
                mamografia: 'Não',
                vacinaHpv: 'Não',
                ...(cleanClinical.rastreamento || {})
              },
              chronic: (() => {
                const c = cleanClinical.chronic || {};
                const sections = [c, cleanClinical.adulto, cleanClinical.idoso, cleanClinical.gestante, cleanClinical.acamadodomiciliado];
                const diabSection = sections.find(s => s?.diabetes === 'Sim');
                const hipSection = sections.find(s => s?.hipertensao === 'Sim' || s?.pressaoAlta === 'Sim');
                return {
                  ...initialDefaultValues.clinicalData.chronic,
                  ...c,
                  diabetes: diabSection ? 'Sim' : (c.diabetes || 'Não'),
                  diabetesData: {
                    ...initialDefaultValues.clinicalData.chronic.diabetesData,
                    ...(diabSection?.diabetesData || c.diabetesData || {}),
                    usoInsulina: Boolean(
                      c.diabetesData?.usoInsulina ||
                      c.usoInsulina ||
                      c.toma_insulina ||
                      diabSection?.diabetesData?.usoInsulina
                    )
                  },
                  hipertensao: hipSection ? 'Sim' : (c.hipertensao || 'Não'),
                  hipertensaoData: {
                    ...initialDefaultValues.clinicalData.chronic.hipertensaoData,
                    ...(hipSection?.hipertensaoData || c.hipertensaoData || {})
                  }
                };
              })(),
              gestante: {
                ...initialDefaultValues.clinicalData.gestante,
                ...(cleanClinical.gestante || {}),
                avaliacaoBucal:
                  cleanClinical.gestante?.avaliacaoBucal ||
                  (cleanClinical.gestante?.saudeBucal && cleanClinical.gestante.saudeBucal !== 'Não' ? 'Sim' : '') ||
                  (cleanClinical.gestante?.consulta_odontologica === 'Sim' ? 'Sim' : '') ||
                  'Não',
                consultas: cleanClinical.gestante?.consultas || [],
                visitasAcs: cleanClinical.gestante?.visitasAcs || [],
                visitasAcsDiabetes: cleanClinical.gestante?.visitasAcsDiabetes || [],
                planejamentoFamiliar: cleanClinical.gestante?.planejamentoFamiliar || 'Não',
                diabetesData: {
                  ...initialDefaultValues.clinicalData.gestante.diabetesData,
                  ...(cleanClinical.gestante?.diabetesData || {})
                },
                hipertensaoData: {
                  ...initialDefaultValues.clinicalData.gestante.hipertensaoData,
                  ...(cleanClinical.gestante?.hipertensaoData || {})
                }
              },
              crianca: {
                ...initialDefaultValues.clinicalData.crianca,
                ...(cleanClinical.crianca || {}),
                consultas: cleanClinical.crianca?.consultas || [],
                visita30diasNaoRealizada: Boolean(cleanClinical.crianca?.visita30diasNaoRealizada),
                visita6mesesNaoRealizada: Boolean(cleanClinical.crianca?.visita6mesesNaoRealizada),
                vacinas: {
                  ...initialDefaultValues.clinicalData.crianca.vacinas,
                  ...(cleanClinical.crianca?.vacinas || {})
                }
              },
              acamadodomiciliado: {
                ...initialDefaultValues.clinicalData.acamadodomiciliado,
                ...(cleanClinical.acamadodomiciliado || {}),
                visitasAcsDiabetes: cleanClinical.acamadodomiciliado?.visitasAcsDiabetes || [],
                diabetesData: {
                  ...initialDefaultValues.clinicalData.acamadodomiciliado.diabetesData,
                  ...(cleanClinical.acamadodomiciliado?.diabetesData || {})
                },
                hipertensaoData: {
                  ...initialDefaultValues.clinicalData.acamadodomiciliado.hipertensaoData,
                  ...(cleanClinical.acamadodomiciliado?.hipertensaoData || {})
                }
              },
              adulto: {
                ...initialDefaultValues.clinicalData.adulto,
                ...(cleanClinical.adulto || {}),
                visitasAcsDiabetes: cleanClinical.adulto?.visitasAcsDiabetes || [],
                diabetesData: {
                  ...initialDefaultValues.clinicalData.adulto.diabetesData,
                  ...(cleanClinical.adulto?.diabetesData || {})
                },
                hipertensaoData: {
                  ...initialDefaultValues.clinicalData.adulto.hipertensaoData,
                  ...(cleanClinical.adulto?.hipertensaoData || {})
                }
              },
              idoso: {
                ...initialDefaultValues.clinicalData.idoso,
                ...(cleanClinical.idoso || {}),
                visitasAcsDiabetes: cleanClinical.idoso?.visitasAcsDiabetes || [],
                diabetesData: {
                  ...initialDefaultValues.clinicalData.idoso.diabetesData,
                  ...(cleanClinical.idoso?.diabetesData || {})
                },
                hipertensaoData: {
                  ...initialDefaultValues.clinicalData.idoso.hipertensaoData,
                  ...(cleanClinical.idoso?.hipertensaoData || {})
                }
              }
            }
          });
          // Avoid warning right after load
          setTimeout(() => setIsDirty(false), 100);
        }
      } catch (error) {
        console.error("Error fetching patient for edit:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPatient();
  }, [id]);

  // 2. Pre-fill if creating patient from household context
  useEffect(() => {
    if (id) return;
    const queryParams = new URLSearchParams(location.search);
    const fromHouseholdId = queryParams.get('household');
    
    if (fromHouseholdId) {
      const fetchHouseholdDefaults = async () => {
        try {
          const { data, error } = await supabase
            .from('households')
            .select('*')
            .eq('id', fromHouseholdId)
            .single();

          if (error) throw error;
          if (data) {
            setParentHousehold(data);
            setFormData({
              ...initialDefaultValues,
              householdId: data.id,
              address: data.address || '',
              number: data.number || '',
              complement: data.complement || '',
              responsibleCns: data.responsible_cns || '',
            });
            setTimeout(() => setIsDirty(false), 100);
          }
        } catch (error) {
          console.error("Error fetching household defaults:", error);
        }
      };
      fetchHouseholdDefaults();
    }
  }, [location.search, id]);

  // 3. Auto-populate address when entering responsible CNS
  useEffect(() => {
    const cns = formData.responsibleCns?.replace(/\D/g, '');
    if (!cns || cns.length < 15 || formData.isFamilyResponsible) return;

    const timer = setTimeout(async () => {
      try {
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
      } catch (error) {
        console.error("Error fetching patient details from CNS:", error);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [formData.responsibleCns, formData.isFamilyResponsible, user.id]);

  // 4. Sync address & contacts when toggling Family Responsible / CNS Match
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
            setFormData((prev: any) => ({
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

  // Hook for category automation by age
  usePatientCategories(formData.birthDate, setFormData, !!id);

  const queryParams = new URLSearchParams(location.search);
  const fromHouseholdId = queryParams.get('household');

  // Hook for form submit & save
  const { onSubmit, loading: saveLoading } = usePatientFormSave({
    user,
    id,
    confirm,
    success,
    toastError,
    originalLastVisitAt,
    setIsDirty,
    navigate,
    fromHouseholdId: fromHouseholdId || formData.householdId || parentHousehold?.id,
    onSaveSuccess
  });

  const handleSaveAndAddAnother = () => {
    methods.handleSubmit((data) => {
      return onSubmit(data, {
        andAddAnother: true,
        resetForNextResident: () => {
          const hId = parentHousehold?.id || fromHouseholdId || '';
          const hAddr = parentHousehold?.address || formData.address || '';
          const hNum = parentHousehold?.number || formData.number || '';
          const hComp = parentHousehold?.complement || formData.complement || '';
          const hRespCns = parentHousehold?.responsible_cns || formData.responsibleCns || '';

          methods.reset({
            ...initialDefaultValues,
            householdId: hId,
            address: hAddr,
            number: hNum,
            complement: hComp,
            responsibleCns: hRespCns,
            isFamilyResponsible: false
          });
          setIsDirty(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    })();
  };

  // Action: Delete Patient
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
        await syncService.addToQueue('visits', 'DELETE', { filter: { patient_id: id } });
        await syncService.addToQueue('patients', 'DELETE', { id });
        
        success('Exclusão agendada para sincronização.');
        navigate('/pacientes');
        return;
      }

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

      const { error: vError } = await supabase.from('visits').delete().eq('patient_id', id);
      if (vError) throw vError;
      
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

  // Action: Export vCard Contact
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

  // Action: Generate PDF Report
  const generatePatientPDF = async () => {
    const { default: jsPDFModule } = await import('jspdf');
    const { default: autoTableModule } = await import('jspdf-autotable');
    const doc = new jsPDFModule();
    const autoTable = autoTableModule;
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(20);
    doc.setTextColor(0, 72, 141);
    doc.text('Ficha Individual do Paciente', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth - 14, 28, { align: 'right' });
    
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
      ['Categorias', formData.categories?.join(', ') || 'N/A']
    ];

    autoTable(doc, {
      startY: 45,
      body: personalData,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 10;

    let acamadoClinicalExported = false;
    formData.categories?.forEach((cat: string) => {
      let catId = cat.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (cat === 'Acamado' || cat === 'Domiciliado' || cat === 'AcamadoDomiciliado') {
        if (acamadoClinicalExported) return;
        catId = 'acamadodomiciliado';
        acamadoClinicalExported = true;
      }
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

    if (formData.clinicalData?.rastreamento) {
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

    doc.save(`Ficha_${formData.name?.replace(/\s+/g, '_') || 'Paciente'}.pdf`);
  };

  const hasExpiredPrescription = () => {
    const isMentalOrAcamado =
      formData.categories?.includes('SaudeMental') ||
      formData.categories?.includes('Acamado') ||
      formData.categories?.includes('Domiciliado') ||
      formData.categories?.includes('AcamadoDomiciliado');
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

  const handleQuickVisit = (type: 'geral' | 'gestante' | 'cronicos', customDate?: string) => {
    const todayStr = customDate || new Date().toISOString().split('T')[0];

    setFormData((prev: any) => {
      const nextClinical = { ...(prev.clinicalData || {}) };
      let resolvedVisitType = 'Rotina';
      let summaryText = getTemplateForType('Rotina')?.defaultText || 'Visita de Rotina do ACS realizada hoje.';

      // 1. Caso Gestante: adicione na lista de visitasAcs da gestante
      if (type === 'gestante' || (type === 'geral' && prev.categories?.includes('Gestante'))) {
        resolvedVisitType = 'Visita Gestante';
        summaryText = getTemplateForType('Visita Gestante')?.defaultText || 'Visita de Acompanhamento de Gestante (Pré-Natal)';
        const gestanteObj = { ...(nextClinical.gestante || {}) };
        const currentVisitas = Array.isArray(gestanteObj.visitasAcs) ? [...gestanteObj.visitasAcs] : [];
        if (!currentVisitas.includes(todayStr)) {
          currentVisitas.push(todayStr);
        }
        gestanteObj.visitasAcs = currentVisitas;
        nextClinical.gestante = gestanteObj;
      }

      // 2. Caso Comorbidades (Hipertensão / Diabetes)
      const hasDiabetes = prev.categories?.includes('Diabético') || nextClinical.chronic?.diabetes === 'Sim';
      const hasHipertensao = prev.categories?.includes('Hipertenso') || nextClinical.chronic?.hipertensao === 'Sim';

      if (type === 'cronicos' || (type === 'geral' && (hasDiabetes || hasHipertensao))) {
        if (resolvedVisitType === 'Rotina') {
          resolvedVisitType = 'Acompanhamento';
          summaryText = getTemplateForType('Acompanhamento')?.defaultText || 'Visita de Acompanhamento de Condição Crônica';
        }
        const chronicObj = { ...(nextClinical.chronic || {}) };

        if (hasDiabetes) {
          const diabetesData = { ...(chronicObj.diabetesData || {}) };
          if (!diabetesData.visitaAcs1) {
            diabetesData.visitaAcs1 = todayStr;
            const d180 = new Date(todayStr + 'T12:00:00');
            d180.setDate(d180.getDate() + 180);
            diabetesData.visitaAcs2 = d180.toISOString().split('T')[0];
          } else {
            diabetesData.visitaAcs2 = todayStr;
          }
          chronicObj.diabetesData = diabetesData;
        }

        if (hasHipertensao) {
          const hipertensaoData = { ...(chronicObj.hipertensaoData || {}) };
          if (!hipertensaoData.visitaAcs1) {
            hipertensaoData.visitaAcs1 = todayStr;
            const d180 = new Date(todayStr + 'T12:00:00');
            d180.setDate(d180.getDate() + 180);
            hipertensaoData.visitaAcs2 = d180.toISOString().split('T')[0];
          } else {
            hipertensaoData.visitaAcs2 = todayStr;
          }
          chronicObj.hipertensaoData = hipertensaoData;
        }

        nextClinical.chronic = chronicObj;
      }

      const currentSummary = prev.visitSummary || '';
      const shouldUpdateSummary = !currentSummary.trim() || isDefaultVisitTemplate(currentSummary);

      return {
        ...prev,
        visitDate: todayStr,
        visitType: resolvedVisitType,
        visitSummary: shouldUpdateSummary ? summaryText : currentSummary,
        clinicalData: nextClinical
      };
    });

    setIsDirty(true);
    success(
      type === 'gestante'
        ? `Visita de Gestante (${formatDate(todayStr)}) adicionada! Clique em "Salvar" para confirmar.`
        : type === 'cronicos'
        ? `Visita de Comorbidades (${formatDate(todayStr)}) registrada! Clique em "Salvar" para confirmar.`
        : `Visita ACS (${formatDate(todayStr)}) registrada! Clique em "Salvar" para confirmar.`
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm text-text-secondary font-medium uppercase tracking-wider">Buscando Prontuário do Cidadão...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <PatientFormHeader
        id={id}
        isDirty={isDirty}
        isReadOnly={isReadOnly}
        formData={formData}
        setFormData={setFormData}
        setIsDirty={setIsDirty}
        downloadVCard={downloadVCard}
        generatePatientPDF={generatePatientPDF}
        confirm={confirm}
        hasExpiredPrescription={hasExpiredPrescription()}
        errors={methods.formState.errors}
        onQuickVisit={handleQuickVisit}
        onOpenHouseholdModal={() => setShowHouseholdDrawer(true)}
        onClose={onClose}
      />

      {parentHousehold && (
        <div className="bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-teal-500/10 dark:from-teal-950/30 dark:via-emerald-950/30 dark:to-teal-950/30 border-2 border-teal-500/30 dark:border-teal-700/50 rounded-2xl p-5 shadow-sm space-y-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-600 dark:bg-teal-700 text-white flex items-center justify-center shrink-0 shadow-md">
                <Home className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-teal-700 dark:text-teal-400 block">
                  Novo Morador do Domicílio
                </span>
                <h4 className="text-base font-extrabold text-slate-800 dark:text-slate-100 font-headline">
                  Família de {parentHousehold.responsible_name || 'Responsável não identificado'}
                </h4>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold px-3 py-1 bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 rounded-lg border border-teal-200 dark:border-teal-800/80 shadow-xs">
                CNS Resp: {parentHousehold.responsible_cns || 'N/A'}
              </span>
              <button
                type="button"
                onClick={() => setShowHouseholdDrawer(true)}
                className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Users className="w-3.5 h-3.5" />
                Ver Moradores
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300 font-medium pt-2 border-t border-teal-200/60 dark:border-teal-800/40">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
              <span>{parentHousehold.address}, {parentHousehold.number}{parentHousehold.complement ? ` - ${parentHousehold.complement}` : ''}</span>
            </div>
            <span className="text-[11px] text-teal-700 dark:text-teal-400 font-bold">
              • Endereço e responsável vinculados automaticamente
            </span>
          </div>
        </div>
      )}

      <form onSubmit={methods.handleSubmit((data) => onSubmit(data))} className="space-y-6">
        <fieldset disabled={isReadOnly} className="space-y-8 contents">
          <DadosPessoaisSection
            formData={formData}
            setFormData={setFormData}
            isReadOnly={isReadOnly}
            parentHousehold={parentHousehold}
          />
          <EnderecoSection
            formData={formData}
            setFormData={setFormData}
            streets={user.streets}
            isReadOnly={isReadOnly}
            onOpenHouseholdModal={() => setShowHouseholdDrawer(true)}
          />
          <CategoriesSection
            formData={formData}
            setFormData={setFormData}
            isReadOnly={isReadOnly}
          />
          <VisitaSection
            formData={formData}
            setFormData={setFormData}
            isReadOnly={isReadOnly}
          />
          <DadosClinicosTabs
            formData={formData}
            setFormData={setFormData}
            id={id}
            isReadOnly={isReadOnly}
          />
        </fieldset>

        <FormActions 
          id={id} 
          loading={saveLoading} 
          deleting={deleting} 
          deleteConfirm={deleteConfirm} 
          setDeleteConfirm={setDeleteConfirm} 
          handleDelete={handleDelete} 
          onCancel={async () => {
            if (isDirty) {
              const ok = await confirm({
                title: 'Alterações não salvas',
                message: 'Há alterações não salvas. Deseja sair sem salvar?',
                variant: 'warning',
                confirmLabel: 'Sair sem salvar',
                cancelLabel: 'Ficar'
              });
              if (!ok) return;
            }
            if (onClose) {
              onClose();
              return;
            }
            const targetH = fromHouseholdId || formData.householdId || parentHousehold?.id;
            if (targetH) {
              navigate(`/domicilio/${targetH}`);
            } else {
              navigate('/pacientes');
            }
          }}
          isReadOnly={isReadOnly}
          showSaveAndAddAnother={!id && Boolean(fromHouseholdId || parentHousehold)}
          onSaveAndAddAnother={handleSaveAndAddAnother}
        />
      </form>

      {/* Floating Action Button (FAB) */}
      {formData.householdId && (
        <button
          type="button"
          onClick={() => setShowHouseholdDrawer(true)}
          className="fixed right-4 sm:right-6 bottom-20 sm:bottom-6 z-40 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl sm:rounded-full p-3.5 sm:p-4 shadow-2xl hover:shadow-teal-600/30 active:scale-95 transition-all flex items-center gap-2 group cursor-pointer border border-white/20 dark:border-slate-800"
          title="Ver Moradores do Domicílio"
        >
          <Home className="w-5 h-5" />
          <span className="font-extrabold text-xs uppercase tracking-wider hidden sm:inline-block">
            Moradores do Domicílio
          </span>
        </button>
      )}

      {/* Pop-up Modal dos Moradores do Domicílio */}
      <HouseholdResidentsModal
        isOpen={showHouseholdDrawer}
        onClose={() => setShowHouseholdDrawer(false)}
        householdId={formData.householdId || parentHousehold?.id}
        currentPatientId={id}
        isDirty={isDirty}
        confirm={confirm}
      />
    </div>
  );
}
