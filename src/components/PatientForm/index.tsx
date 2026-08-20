import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Loader2, Home, X, CheckCircle2, MapPin } from 'lucide-react';

import { supabase } from '../../lib/supabase';
import { syncService } from '../../lib/syncService';
import { useToast } from '../Toast';
import { useConfirm } from '../ui/ConfirmDialog';
import { patientFormSchema, initialDefaultValues } from '../patient-form/patientSchema';
import { calculateAge, getAgeNumber, vaccineLabels, formatDate } from '../../lib/dateUtils';

// Extracted Hooks
import { usePatientFormSave } from './hooks/usePatientFormSave';
import { usePatientCategories } from './hooks/usePatientCategories';

// Extracted Components
import { PatientFormHeader } from './PatientFormHeader';
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
  return result;
};

export function PatientForm({ user }: { user: any }) {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const confirm = useConfirm();
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
            categories: data.categories || [],
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
              chronic: cleanClinical.chronic || {
                diabetes: cleanClinical.chronic?.diabetes || cleanClinical.adulto?.diabetes || cleanClinical.idoso?.diabetes || cleanClinical.gestante?.diabetes || cleanClinical.acamadodomiciliado?.diabetes || 'Não',
                diabetesData: cleanClinical.chronic?.diabetesData || cleanClinical.adulto?.diabetesData || cleanClinical.idoso?.diabetesData || cleanClinical.gestante?.diabetesData || cleanClinical.acamadodomiciliado?.diabetesData || initialDefaultValues.clinicalData.chronic.diabetesData,
                hipertensao: cleanClinical.chronic?.hipertensao || cleanClinical.adulto?.hipertensao || cleanClinical.idoso?.hipertensao || cleanClinical.gestante?.hipertensao || cleanClinical.acamadodomiciliado?.hipertensao || cleanClinical.adulto?.pressaoAlta || cleanClinical.idoso?.pressaoAlta || cleanClinical.gestante?.pressaoAlta || cleanClinical.acamadodomiciliado?.pressaoAlta || 'Não',
                hipertensaoData: cleanClinical.chronic?.hipertensaoData || cleanClinical.adulto?.hipertensaoData || cleanClinical.idoso?.hipertensaoData || cleanClinical.gestante?.hipertensaoData || cleanClinical.acamadodomiciliado?.hipertensaoData || initialDefaultValues.clinicalData.chronic.hipertensaoData,
              },
              gestante: {
                ...initialDefaultValues.clinicalData.gestante,
                ...(cleanClinical.gestante || {}),
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

  // 5. Fetch Household Drawer Details
  useEffect(() => {
    const fetchHouseholdDetails = async () => {
      if (!showHouseholdDrawer || !formData.householdId) return;
      setLoadingHousehold(true);
      try {
        const { data: hData, error: hError } = await supabase
          .from('households')
          .select('*')
          .eq('id', formData.householdId)
          .single();
        
        if (hError) throw hError;
        setHouseholdData(hData);

        const { data: rData, error: rError } = await supabase
          .from('patients')
          .select('*')
          .eq('household_id', formData.householdId);
        
        if (rError) throw rError;
        setHouseholdResidents(rData || []);

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
    fromHouseholdId
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

    formData.categories?.forEach((cat: string) => {
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

  const handleQuickVisit = (type: 'geral' | 'gestante' | 'cronicos') => {
    const todayStr = new Date().toISOString().split('T')[0];

    setFormData((prev: any) => {
      const nextClinical = { ...(prev.clinicalData || {}) };
      let summaryText = 'Visita de Rotina do ACS realizada hoje.';

      // 1. Caso Gestante: adicione na lista de visitasAcs da gestante
      if (type === 'gestante' || (type === 'geral' && prev.categories?.includes('Gestante'))) {
        summaryText = 'Visita de Acompanhamento de Gestante (Pré-Natal)';
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
        if (summaryText === 'Visita de Rotina do ACS realizada hoje.') {
          summaryText = 'Visita de Acompanhamento de Condição Crônica';
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

      return {
        ...prev,
        visitDate: todayStr,
        visitType: type === 'gestante' ? 'Acompanhamento' : type === 'cronicos' ? 'Acompanhamento' : 'Rotina',
        visitSummary: prev.visitSummary || summaryText,
        clinicalData: nextClinical
      };
    });

    setIsDirty(true);
    success(
      type === 'gestante'
        ? 'Visita de Gestante adicionada! A data de hoje foi somada nas visitas de pré-natal. Clique em "Salvar" para confirmar.'
        : type === 'cronicos'
        ? 'Visita de Comorbidades registrada! As datas em Hipertensão/Diabetes foram atualizadas. Clique em "Salvar" para confirmar.'
        : 'Visita ACS registrada com a data de hoje! Clique em "Salvar" para confirmar.'
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
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold px-3 py-1 bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 rounded-lg border border-teal-200 dark:border-teal-800/80 shadow-xs">
                CNS Resp: {parentHousehold.responsible_cns || 'N/A'}
              </span>
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

      <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6">
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
            if (fromHouseholdId) {
              navigate(`/domicilio/${fromHouseholdId}`);
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
                  <div className="bg-teal-600 dark:bg-teal-800 rounded-2xl p-6 text-white shadow-md">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-100 block mb-1">Responsável Familiar</span>
                      <h4 className="text-xl font-extrabold font-headline mb-4">{householdData.responsible_name}</h4>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs bg-black/20 px-3 py-1.5 rounded-lg w-fit font-bold">
                          <span className="text-teal-100">SUS:</span>
                          <span className="text-white">{householdData.responsible_cns}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs bg-black/20 px-3 py-1.5 rounded-lg font-bold">
                          <span className="text-teal-100">Endereço:</span>
                          <span className="text-white">{householdData.address}, {householdData.number} {householdData.complement ? ` - ${householdData.complement}` : ''}</span>
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
                                onClick={async () => {
                                  if (isDirty) {
                                    const ok = await confirm({
                                      title: 'Alterações não salvas',
                                      message: 'Há alterações não salvas. Deseja sair do formulário atual para ver outro cidadão?',
                                      variant: 'warning',
                                      confirmLabel: 'Sair sem salvar',
                                      cancelLabel: 'Ficar'
                                    });
                                    if (!ok) return;
                                  }
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
                      onClick={async () => {
                        if (isDirty) {
                          const ok = await confirm({
                            title: 'Alterações não salvas',
                            message: 'Há alterações não salvas. Deseja sair sem salvar para ver o domicílio completo?',
                            variant: 'warning',
                            confirmLabel: 'Sair sem salvar',
                            cancelLabel: 'Ficar'
                          });
                          if (!ok) return;
                        }
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
