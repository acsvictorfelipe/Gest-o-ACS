import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { syncService } from '../../../lib/syncService';
import { generateUUID } from '../../../lib/utils';
import { validateCNS, getPatientLastVisitAt, getAgeNumber } from '../../../lib/dateUtils';
import { getRedirectFilter } from '../utils/getRedirectFilter';
import { queryClient } from '../../../lib/queryClient';

interface UsePatientFormSaveProps {
  user: any;
  id: string | undefined;
  confirm: any;
  success: (msg: string) => void;
  toastError: (msg: string) => void;
  originalLastVisitAt: string | null;
  setIsDirty: (dirty: boolean) => void;
  navigate: (path: string) => void;
}

export function usePatientFormSave({
  user,
  id,
  confirm,
  success,
  toastError,
  originalLastVisitAt,
  setIsDirty,
  navigate
}: UsePatientFormSaveProps) {
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data: any) => {
    const formData = { ...data };
    
    // Validação de CNS SUS do Paciente
    if (formData.cns) {
      const isCnsValid = validateCNS(formData.cns);
      if (!isCnsValid) {
        const confirmSave = await confirm({
          title: 'CNS Inválido',
          message: `Atenção: O Cartão SUS (CNS) "${formData.cns}" do paciente não atende aos critérios do algoritmo oficial de validação do SUS (com 15 dígitos válidos).\n\nDeseja prosseguir e salvar mesmo assim?`,
          variant: 'warning',
          confirmLabel: 'Prosseguir',
          cancelLabel: 'Cancelar'
        });
        if (!confirmSave) return;
      }
    }

    // Validação de CNS SUS do Responsável
    if (formData.responsibleCns && !formData.isFamilyResponsible) {
      const isRespCnsValid = validateCNS(formData.responsibleCns);
      if (!isRespCnsValid) {
        const confirmSave = await confirm({
          title: 'CNS do Responsável Inválido',
          message: `Atenção: O CNS do Responsável "${formData.responsibleCns}" não atende aos critérios do algoritmo oficial de validação do SUS.\n\nDeseja prosseguir e salvar mesmo assim?`,
          variant: 'warning',
          confirmLabel: 'Prosseguir',
          cancelLabel: 'Cancelar'
        });
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
        },
        notes: ''
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

        success('Dados salvos localmente. Serão sincronizados quando houver internet.');
        queryClient.invalidateQueries({ queryKey: ['patients'] });
        queryClient.invalidateQueries({ queryKey: ['patientList'] });
        queryClient.invalidateQueries({ queryKey: ['householdsList'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['visits'] });
        setTimeout(() => {
          navigate(`/pacientes?filter=${getRedirectFilter(finalCategories)}`);
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

      success('Paciente salvo com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patientList'] });
      queryClient.invalidateQueries({ queryKey: ['householdsList'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      setTimeout(() => {
        navigate(`/pacientes?filter=${getRedirectFilter(formData.categories)}`);
      }, 1500);
    } catch (error: any) {
      console.error("Error saving patient:", error);
      toastError(error.message || "Erro ao salvar paciente.");
    } finally {
      setLoading(false);
    }
  };

  return { onSubmit, loading };
}
