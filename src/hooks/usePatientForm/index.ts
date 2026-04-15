import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { syncService } from '../../lib/syncService';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { PatientFormData } from '../../types/patient';
import { initialState } from './initialState';
import { toast } from 'sonner';

export function usePatientForm(user: any) {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState<PatientFormData>(initialState);

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
          
          setFormData((prev: any) => ({
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
              ...prev.clinicalData,
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
                diabetesData: data.clinical_data?.chronic?.diabetesData || data.clinical_data?.adulto?.diabetesData || data.clinical_data?.idoso?.diabetesData || data.clinical_data?.gestante?.diabetesData || data.clinical_data?.acamadodomiciliado?.diabetesData || prev.clinicalData.chronic.diabetesData,
                hipertensao: data.clinical_data?.chronic?.hipertensao || data.clinical_data?.adulto?.hipertensao || data.clinical_data?.idoso?.hipertensao || data.clinical_data?.gestante?.hipertensao || data.clinical_data?.acamadodomiciliado?.hipertensao || data.clinical_data?.adulto?.pressaoAlta || data.clinical_data?.idoso?.pressaoAlta || data.clinical_data?.gestante?.pressaoAlta || data.clinical_data?.acamadodomiciliado?.pressaoAlta || 'Não',
                hipertensaoData: data.clinical_data?.chronic?.hipertensaoData || data.clinical_data?.adulto?.hipertensaoData || data.clinical_data?.idoso?.hipertensaoData || data.clinical_data?.gestante?.hipertensaoData || data.clinical_data?.acamadodomiciliado?.hipertensaoData || prev.clinicalData.chronic.hipertensaoData,
              },
              gestante: {
                ...prev.clinicalData.gestante,
                ...(data.clinical_data?.gestante || {}),
                consultas: data.clinical_data?.gestante?.consultas || [],
                visitasAcs: data.clinical_data?.gestante?.visitasAcs || [],
                visitasAcsDiabetes: data.clinical_data?.gestante?.visitasAcsDiabetes || [],
                diabetesData: {
                  ...prev.clinicalData.gestante.diabetesData,
                  ...(data.clinical_data?.gestante?.diabetesData || {})
                },
                hipertensaoData: {
                  ...prev.clinicalData.gestante.hipertensaoData,
                  ...(data.clinical_data?.gestante?.hipertensaoData || {})
                }
              },
              crianca: {
                ...prev.clinicalData.crianca,
                ...(data.clinical_data?.crianca || {}),
                consultas: data.clinical_data?.crianca?.consultas || [],
                vacinas: {
                  ...prev.clinicalData.crianca.vacinas,
                  ...(data.clinical_data?.crianca?.vacinas || {})
                }
              },
              acamadodomiciliado: {
                ...prev.clinicalData.acamadodomiciliado,
                ...(data.clinical_data?.acamadodomiciliado || {}),
                visitasAcsDiabetes: data.clinical_data?.acamadodomiciliado?.visitasAcsDiabetes || [],
                diabetesData: {
                  ...prev.clinicalData.acamadodomiciliado.diabetesData,
                  ...(data.clinical_data?.acamadodomiciliado?.diabetesData || {})
                },
                hipertensaoData: {
                  ...prev.clinicalData.acamadodomiciliado.hipertensaoData,
                  ...(data.clinical_data?.acamadodomiciliado?.hipertensaoData || {})
                }
              },
              adulto: {
                ...prev.clinicalData.adulto,
                ...(data.clinical_data?.adulto || {}),
                visitasAcsDiabetes: data.clinical_data?.adulto?.visitasAcsDiabetes || [],
                diabetesData: {
                  ...prev.clinicalData.adulto.diabetesData,
                  ...(data.clinical_data?.adulto?.diabetesData || {})
                },
                hipertensaoData: {
                  ...prev.clinicalData.adulto.hipertensaoData,
                  ...(data.clinical_data?.adulto?.hipertensaoData || {})
                }
              },
              idoso: {
                ...prev.clinicalData.idoso,
                ...(data.clinical_data?.idoso || {}),
                visitasAcsDiabetes: data.clinical_data?.idoso?.visitasAcsDiabetes || [],
                diabetesData: {
                  ...prev.clinicalData.idoso.diabetesData,
                  ...(data.clinical_data?.idoso?.diabetesData || {})
                },
                hipertensaoData: {
                  ...prev.clinicalData.idoso.hipertensaoData,
                  ...(data.clinical_data?.idoso?.hipertensaoData || {})
                }
              }
            }
          }));
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
      
      setTimeout(() => {
        const visitSection = document.getElementById('secao-visita');
        if (visitSection) {
          visitSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
    }
  }, [location.search]);

  useEffect(() => {
    if (formData.categories.includes('Criança') && formData.birthDate) {
      const birth = new Date(formData.birthDate);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - birth.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const ageInMonths = diffDays / 30.44;

      if (ageInMonths < 24) {
        const nextVisit = new Date(birth);
        nextVisit.setMonth(nextVisit.getMonth() + 6);
        
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
      const parts = dum.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const day = parseInt(parts[2]);
        
        const dumDate = new Date(year, month, day);
        if (!isNaN(dumDate.getTime())) {
          const dppDate = new Date(dumDate);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
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

        toast.success('Dados salvos localmente. Serão sincronizados quando houver internet.');
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
          householdId = householdData.id;
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
          if (formData.isFamilyResponsible) {
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
            householdId = null;
          }
        }
      } else {
        if (!householdId) {
          householdId = null;
        }
      }

      const patientData: any = {
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

      if (formData.visitDate) {
        patientData.last_visit_at = new Date().toISOString();
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
      toast.error(error.message || "Erro ao salvar paciente.");
    } finally {
      setLoading(false);
    }
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
        await syncService.addToQueue('visits', 'DELETE', { filter: { patient_id: id } });
        await syncService.addToQueue('patients', 'DELETE', { id });
        
        toast.success('Exclusão agendada para sincronização.');
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
      toast.error(error.message || "Erro ao excluir paciente.");
    } finally {
      setDeleting(false);
    }
  };

  return {
    id,
    formData,
    setFormData,
    loading,
    deleting,
    handleSubmit,
    handleDelete
  };
}
