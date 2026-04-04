import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useParams } from 'react-router-dom';
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
  Loader2
} from 'lucide-react';

export function PatientForm({ user }: { user: any }) {
  const navigate = useNavigate();
  const { id } = useParams();
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
    categories: [] as string[],
    clinicalData: {
      visitasGerais: [] as string[],
      acamadodomiciliado: {
        dependencia: 'Total',
        curativos: 'Não',
        cuidador: 'Não',
        usoFralda: 'Não',
        tamanhoFralda: '',
        diabetes: 'Não',
        visitasAcsDiabetes: [] as string[],
        pressaoAlta: 'Não',
        observacoes: ''
      },
      gestante: {
        dum: '',
        dpp: '',
        consultas: [] as string[],
        visitasAcs: [] as string[],
        visitasAcsDiabetes: [] as string[],
        dtpa: 'Não',
        sifilis: 'Não',
        hepatiteB: 'Não',
        hiv: 'Não',
        hepatiteC: 'Não',
        puerperioConsulta: '',
        puerperioVisita: '',
        saudeBucal: '',
        diabetes: 'Não',
        pressaoAlta: 'Não'
      },
      crianca: {
        consultas: [] as string[],
        visitasAcs: [] as string[],
        visita30dias: '',
        visita6meses: '',
        proximaVisitaSugerida: '',
        vacinas: {
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
        visitasAcsDiabetes: [] as string[],
        pressaoAlta: 'Não'
      },
      idoso: {
        diabetes: 'Não',
        visitasAcsDiabetes: [] as string[],
        pressaoAlta: 'Não'
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
            categories: data.categories || [],
            clinicalData: {
              ...formData.clinicalData,
              ...data.clinical_data
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

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return '';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 0 ? `${age} anos` : '';
  };

  const categories = [
    { id: 'Gestante', icon: Baby, color: 'border-blue-500 text-blue-500' },
    { id: 'Criança', icon: Stethoscope, color: 'border-green-500 text-green-500' },
    { id: 'AcamadoDomiciliado', icon: Activity, label: 'Acamado / Domiciliado', color: 'border-teal-500 text-teal-500' },
    { id: 'Adulto', icon: User, color: 'border-slate-500 text-slate-500' },
    { id: 'Idoso', icon: HeartPulse, color: 'border-red-500 text-red-500' },
  ];

  const toggleCategory = (cat: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(cat) 
        ? [] 
        : [cat]
    }));
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      // Delete visits
      await supabase.from('visits').delete().eq('patient_id', id);
      // Delete patient
      const { error } = await supabase.from('patients').delete().eq('id', id);
      if (error) throw error;
      navigate('/pacientes');
    } catch (error) {
      console.error("Error deleting patient:", error);
    } finally {
      setDeleting(false);
    }
  };

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
        // Create new Household
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
            responsible_name: formData.isFamilyResponsible ? formData.name : 'Responsável não cadastrado'
          }])
          .select()
          .single();
        
        if (createHError) throw createHError;
        householdId = newH.id;
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
        (newData as any)[list] = [...currentList, ''];
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

  const updateDateInList = (category: string, list: string, index: number, value: string) => {
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
                required={!formData.isFamilyResponsible}
                type="text" 
                value={formData.isFamilyResponsible ? formData.cns : formData.responsibleCns}
                onChange={e => setFormData({...formData, responsibleCns: e.target.value})}
                disabled={formData.isFamilyResponsible}
                className={`w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20 ${formData.isFamilyResponsible ? 'opacity-50 cursor-not-allowed' : ''}`} 
                placeholder="000 0000 0000 0000" 
              />
              {!formData.isFamilyResponsible && (
                <p className="text-[9px] text-slate-400 mt-1 italic">Use o CNS para vincular este cidadão a uma família existente.</p>
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
                required
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20" 
                placeholder="Nome do paciente" 
              />
            </div>
            <div className="md:col-span-4">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">SUS do Cidadão</label>
              <input 
                required
                type="text" 
                value={formData.cns}
                onChange={e => setFormData({...formData, cns: e.target.value})}
                className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20" 
                placeholder="000 0000 0000 0000" 
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Gênero</label>
              <select 
                value={formData.gender}
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
                required
                type="date" 
                value={formData.birthDate}
                onChange={e => setFormData({...formData, birthDate: e.target.value})}
                className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20" 
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Idade (Automática)</label>
              <input 
                disabled
                type="text" 
                value={calculateAge(formData.birthDate)}
                className="w-full bg-slate-100 border-none rounded-xl p-3 text-sm text-slate-500" 
              />
            </div>
            <div className="md:col-span-4">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Data da Visita</label>
              <input 
                type="date" 
                value={formData.visitDate}
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
            <div className="md:col-span-8">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Resumo da Visita</label>
              <input 
                type="text" 
                value={formData.visitSummary}
                onChange={e => setFormData({...formData, visitSummary: e.target.value})}
                className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20" 
                placeholder="Ex: Paciente estável, orientações sobre medicação..."
              />
            </div>
            <div className="md:col-span-5">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Endereço</label>
              <input 
                required
                type="text" 
                value={formData.address}
                onChange={e => setFormData({...formData, address: e.target.value})}
                className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20" 
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Nº</label>
              <input 
                required
                type="text" 
                value={formData.number}
                onChange={e => setFormData({...formData, number: e.target.value})}
                className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20" 
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Complemento</label>
              <input 
                type="text" 
                value={formData.complement}
                onChange={e => setFormData({...formData, complement: e.target.value})}
                className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20" 
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Contato</label>
              <input 
                type="text" 
                value={formData.contact}
                onChange={e => setFormData({...formData, contact: e.target.value})}
                className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20" 
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Recado</label>
              <input 
                type="text" 
                value={formData.messageContact}
                onChange={e => setFormData({...formData, messageContact: e.target.value})}
                className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20" 
              />
            </div>
          </div>
        </section>

        {/* Visitas Realizadas */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-primary font-headline flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Visitas Realizadas
            </h3>
            <button 
              type="button"
              onClick={() => addDateToList('root', 'visitasGerais')}
              className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl text-xs font-bold hover:bg-primary/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              Adicionar Visita
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {formData.clinicalData.visitasGerais?.map((date, index) => (
              <div key={index} className="relative group">
                <input 
                  type="date" 
                  value={date}
                  onChange={e => updateDateInList('root', 'visitasGerais', index, e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20" 
                />
                <button 
                  type="button"
                  onClick={() => removeDateFromList('root', 'visitasGerais', index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {(!formData.clinicalData.visitasGerais || formData.clinicalData.visitasGerais.length === 0) && (
              <div className="col-span-full py-8 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                <p className="text-sm text-slate-400 font-medium italic">Nenhuma visita registrada ainda.</p>
              </div>
            )}
          </div>
        </section>

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
                      value={formData.clinicalData.acamadodomiciliado.dependencia}
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
                      value={formData.clinicalData.acamadodomiciliado.curativos}
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
                      value={formData.clinicalData.acamadodomiciliado.cuidador}
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
                      value={formData.clinicalData.acamadodomiciliado.usoFralda}
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
                        value={formData.clinicalData.acamadodomiciliado.tamanhoFralda}
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
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Diabetes?</label>
                    <select 
                      value={formData.clinicalData.acamadodomiciliado.diabetes}
                      onChange={e => setFormData({
                        ...formData, 
                        clinicalData: { ...formData.clinicalData, acamadodomiciliado: { ...formData.clinicalData.acamadodomiciliado, diabetes: e.target.value } }
                      })}
                      className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm"
                    >
                      <option>Não</option>
                      <option>Sim</option>
                    </select>
                  </div>
                  {formData.clinicalData.acamadodomiciliado.diabetes === 'Sim' && (
                    <div className="md:col-span-3 space-y-4 mt-4">
                      <div className="flex items-center justify-between">
                        <label className="block text-[10px] font-bold uppercase text-slate-400">Visitas ACS Diabetes (Mín. 2/ano)</label>
                        <button 
                          type="button" 
                          onClick={() => addDateToList('acamadodomiciliado', 'visitasAcsDiabetes')}
                          className="text-xs font-bold text-primary flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Adicionar
                        </button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {formData.clinicalData.acamadodomiciliado.visitasAcsDiabetes?.map((date: string, idx: number) => (
                          <div key={idx} className="relative group">
                            <input 
                              type="date" 
                              value={date}
                              onChange={e => updateDateInList('acamadodomiciliado', 'visitasAcsDiabetes', idx, e.target.value)}
                              className="w-full bg-slate-50 border-none rounded-lg p-2 text-[10px]"
                            />
                            <button 
                              type="button"
                              onClick={() => removeDateFromList('acamadodomiciliado', 'visitasAcsDiabetes', idx)}
                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-2 h-2" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Pressão Alta?</label>
                    <select 
                      value={formData.clinicalData.acamadodomiciliado.pressaoAlta}
                      onChange={e => setFormData({
                        ...formData, 
                        clinicalData: { ...formData.clinicalData, acamadodomiciliado: { ...formData.clinicalData.acamadodomiciliado, pressaoAlta: e.target.value } }
                      })}
                      className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm"
                    >
                      <option>Não</option>
                      <option>Sim</option>
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Observações</label>
                    <textarea 
                      value={formData.clinicalData.acamadodomiciliado.observacoes}
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
                      value={formData.clinicalData.gestante.dum}
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
                      value={formData.clinicalData.gestante.dpp}
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
                      {formData.clinicalData.gestante.consultas.map((date, idx) => (
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
                      {formData.clinicalData.gestante.visitasAcs.map((date, idx) => (
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

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:col-span-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">dTpa Aplicada?</label>
                      <select 
                        value={formData.clinicalData.gestante.dtpa}
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
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Sífilis?</label>
                      <select 
                        value={formData.clinicalData.gestante.sifilis}
                        onChange={e => setFormData({
                          ...formData, 
                          clinicalData: { ...formData.clinicalData, gestante: { ...formData.clinicalData.gestante, sifilis: e.target.value } }
                        })}
                        className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm"
                      >
                        <option>Não</option>
                        <option>Sim</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 mb-2">Hepatite B?</label>
                      <select 
                        value={formData.clinicalData.gestante.hepatiteB}
                        onChange={e => setFormData({
                          ...formData, 
                          clinicalData: { ...formData.clinicalData, gestante: { ...formData.clinicalData.gestante, hepatiteB: e.target.value } }
                        })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm text-on-surface"
                      >
                        <option>Não</option>
                        <option>Sim</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 mb-2">HIV?</label>
                      <select 
                        value={formData.clinicalData.gestante.hiv}
                        onChange={e => setFormData({
                          ...formData, 
                          clinicalData: { ...formData.clinicalData, gestante: { ...formData.clinicalData.gestante, hiv: e.target.value } }
                        })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm text-on-surface"
                      >
                        <option>Não</option>
                        <option>Sim</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:col-span-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 mb-2">Diabetes?</label>
                      <select 
                        value={formData.clinicalData.gestante.diabetes}
                        onChange={e => setFormData({
                          ...formData, 
                          clinicalData: { ...formData.clinicalData, gestante: { ...formData.clinicalData.gestante, diabetes: e.target.value } }
                        })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm text-on-surface"
                      >
                        <option>Não</option>
                        <option>Sim</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 mb-2">Pressão Alta?</label>
                      <select 
                        value={formData.clinicalData.gestante.pressaoAlta}
                        onChange={e => setFormData({
                          ...formData, 
                          clinicalData: { ...formData.clinicalData, gestante: { ...formData.clinicalData.gestante, pressaoAlta: e.target.value } }
                        })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm text-on-surface"
                      >
                        <option>Não</option>
                        <option>Sim</option>
                      </select>
                    </div>
                    {formData.clinicalData.gestante.diabetes === 'Sim' && (
                      <div className="md:col-span-2 space-y-4 mt-4">
                        <div className="flex items-center justify-between">
                          <label className="block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">Visitas ACS Diabetes (Mín. 2/ano)</label>
                          <button 
                            type="button" 
                            onClick={() => addDateToList('gestante', 'visitasAcsDiabetes')}
                            className="text-xs font-bold text-primary flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Adicionar
                          </button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {formData.clinicalData.gestante.visitasAcsDiabetes?.map((date: string, idx: number) => (
                            <div key={idx} className="relative group">
                              <input 
                                type="date" 
                                value={date}
                                onChange={e => updateDateInList('gestante', 'visitasAcsDiabetes', idx, e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg p-2 text-[10px] text-on-surface"
                              />
                              <button 
                                type="button"
                                onClick={() => removeDateFromList('gestante', 'visitasAcsDiabetes', idx)}
                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-2 h-2" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:col-span-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 mb-2">Consulta Puerpério</label>
                      <input 
                        type="date" 
                        value={formData.clinicalData.gestante.puerperioConsulta}
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
                        value={formData.clinicalData.gestante.puerperioVisita}
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
                        value={formData.clinicalData.gestante.saudeBucal}
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
                        {formData.clinicalData.crianca.consultas.map((date, idx) => (
                          <input 
                            key={idx}
                            type="date" 
                            value={date}
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
                            value={formData.clinicalData.crianca.visita30dias}
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
                            value={formData.clinicalData.crianca.visita6meses}
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
                    <label className="block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">Calendário Vacinal</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(formData.clinicalData.crianca.vacinas).map(([key, value]) => (
                        <div key={key}>
                          <label className="block text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </label>
                          <input 
                            type="date" 
                            value={value}
                            onChange={e => setFormData({
                              ...formData, 
                              clinicalData: { 
                                ...formData.clinicalData, 
                                crianca: { 
                                  ...formData.clinicalData.crianca, 
                                  vacinas: { ...formData.clinicalData.crianca.vacinas, [key]: e.target.value } 
                                } 
                              }
                            })}
                            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg p-2 text-[10px] text-on-surface"
                          />
                        </div>
                      ))}
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
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 mb-2">Diabetes?</label>
                    <select 
                      value={(formData.clinicalData as any)[catId.toLowerCase()].diabetes}
                      onChange={e => setFormData({
                        ...formData, 
                        clinicalData: { 
                          ...formData.clinicalData, 
                          [catId.toLowerCase()]: { ...(formData.clinicalData as any)[catId.toLowerCase()], diabetes: e.target.value } 
                        }
                      })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm text-on-surface"
                    >
                      <option>Não</option>
                      <option>Sim</option>
                    </select>
                  </div>
                  {(formData.clinicalData as any)[catId.toLowerCase()].diabetes === 'Sim' && (
                    <div className="md:col-span-2 space-y-4 mt-4">
                      <div className="flex items-center justify-between">
                        <label className="block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">Visitas ACS Diabetes (Mín. 2/ano)</label>
                        <button 
                          type="button" 
                          onClick={() => addDateToList(catId.toLowerCase(), 'visitasAcsDiabetes')}
                          className="text-xs font-bold text-primary flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Adicionar
                        </button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {(formData.clinicalData as any)[catId.toLowerCase()].visitasAcsDiabetes?.map((date: string, idx: number) => (
                          <div key={idx} className="relative group">
                            <input 
                              type="date" 
                              value={date}
                              onChange={e => updateDateInList(catId.toLowerCase(), 'visitasAcsDiabetes', idx, e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg p-2 text-[10px] text-on-surface"
                            />
                            <button 
                              type="button"
                              onClick={() => removeDateFromList(catId.toLowerCase(), 'visitasAcsDiabetes', idx)}
                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-2 h-2" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 mb-2">Pressão Alta?</label>
                    <select 
                      value={(formData.clinicalData as any)[catId.toLowerCase()].pressaoAlta}
                      onChange={e => setFormData({
                        ...formData, 
                        clinicalData: { 
                          ...formData.clinicalData, 
                          [catId.toLowerCase()]: { ...(formData.clinicalData as any)[catId.toLowerCase()], pressaoAlta: e.target.value } 
                        }
                      })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm text-on-surface"
                    >
                      <option>Não</option>
                      <option>Sim</option>
                    </select>
                  </div>
                </div>
              </section>
            )}
          </div>
        ))}

        <div className="flex items-center justify-end gap-4 pb-20">
          {id && (
            <button 
              type="button"
              onClick={() => setDeleteConfirm(true)}
              className="mr-auto flex items-center gap-2 px-6 py-3 text-red-500 font-bold hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all"
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
