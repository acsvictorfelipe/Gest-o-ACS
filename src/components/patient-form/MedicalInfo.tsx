import React, { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Baby, Smile, Bed, User, HeartPulse, Activity } from 'lucide-react';
import { VACCINE_SCHEDULE } from '../../lib/dateUtils';

import { VisitasHistoricoSection } from './medical-sections/VisitasHistoricoSection';
import { ReceitasSection } from './medical-sections/ReceitasSection';
import { RastreamentoSection } from './medical-sections/RastreamentoSection';
import { SaudeMentalSection } from './medical-sections/SaudeMentalSection';
import { ChronicSection } from './medical-sections/ChronicSection';
import { AcamadoSection } from './medical-sections/AcamadoSection';
import { GestanteSection } from './medical-sections/GestanteSection';
import { CriancaSection } from './medical-sections/CriancaSection';
import { CommonSections } from './medical-sections/CommonSections';

interface MedicalInfoProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  id: string | undefined;
  isReadOnly?: boolean;
}

export function MedicalInfo({ formData, setFormData, id, isReadOnly }: MedicalInfoProps) {
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
              crianca: { ...(prev.clinicalData?.crianca || {}), proximaVisitaSugerida: nextVisitStr }
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
        const dumDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
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
                gestante: { ...(prev.clinicalData?.gestante || {}), dpp: dppStr }
              }
            }));
          }
        }
      }
    }
  }, [formData.clinicalData?.gestante?.dum, formData.categories]);

  const ageInMonths = formData.birthDate
    ? (() => {
        const birth = new Date(formData.birthDate);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - birth.getTime());
        return Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30.44));
      })()
    : 0;

  const visibleSchedule = VACCINE_SCHEDULE
    ? VACCINE_SCHEDULE.filter(group => {
        // Show all groups up to the current age in months
        // This allows checking vaccines from birth up to the present stage
        return group.age <= ageInMonths;
      })
    : [];

  const addDateToList = (category: string, list: string) => {
    setFormData((prev: any) => {
      const newData = { ...prev.clinicalData };
      if (category === 'root') {
        const currentList = (newData as any)[list] || [];
        (newData as any)[list] = (list === 'visitasGerais')
          ? [...currentList, { date: '', summary: '', type: 'Rotina' }]
          : (list === 'consultasGerais')
            ? [...currentList, { date: '', summary: '' }]
            : (list === 'receitas')
              ? [...currentList, { dataEmissao: '', validade: '30', dataVencimento: '' }]
              : [...currentList, ''];
      } else {
        const currentCategory = { ...(newData as any)[category] };
        const currentList = currentCategory[list] || [];
        currentCategory[list] = [...currentList, ''];
        (newData as any)[category] = currentCategory;
      }
      return { ...prev, clinicalData: newData };
    });
  };

  const removeDateFromList = (category: string, list: string, index: number) => {
    setFormData((prev: any) => {
      const newData = { ...prev.clinicalData };
      if (category === 'root') {
        const currentList = (newData as any)[list] || [];
        (newData as any)[list] = currentList.filter((_: any, i: number) => i !== index);
      } else {
        const currentCategory = { ...(newData as any)[category] };
        const currentList = currentCategory[list] || [];
        currentCategory[list] = currentList.filter((_: any, i: number) => i !== index);
        (newData as any)[category] = currentCategory;
      }
      return { ...prev, clinicalData: newData };
    });
  };

  const updateDateInList = (category: string, list: string, index: number, value: any) => {
    setFormData((prev: any) => {
      const newData = { ...prev.clinicalData };
      if (category === 'root') {
        const currentList = [...((newData as any)[list] || [])];
        currentList[index] = value;
        (newData as any)[list] = currentList;
      } else {
        const currentCategory = { ...(newData as any)[category] };
        const currentList = [...(currentCategory[list] || [])];
        currentList[index] = value;
        currentCategory[list] = currentList;
        (newData as any)[category] = currentCategory;
      }
      return { ...prev, clinicalData: newData };
    });
  };

  const categoriesList = [
    { id: 'Gestante', icon: Baby, color: 'border-blue-500 text-blue-500' },
    { id: 'Criança', icon: Smile, color: 'border-green-500 text-green-500' },
    { id: 'AcamadoDomiciliado', icon: Bed, label: 'Acamado / Domiciliado', color: 'border-teal-500 text-teal-500' },
    { id: 'Adulto', icon: User, color: 'border-slate-500 text-slate-500' },
    { id: 'Idoso', icon: HeartPulse, color: 'border-red-500 text-red-500' },
    { id: 'SaudeMental', icon: Activity, label: 'Saúde Mental', color: 'border-purple-500 text-purple-500' },
  ];

  const toggleCategory = (cat: string) => {
    setFormData((prev: any) => ({
      ...prev,
      categories: prev.categories.includes(cat) 
        ? prev.categories.filter((c: string) => c !== cat)
        : [...prev.categories, cat]
    }));
  };

  return (
    <div className="space-y-6">
      <VisitasHistoricoSection 
        formData={formData} 
        setFormData={setFormData} 
        id={id} 
        addDateToList={addDateToList} 
        removeDateFromList={removeDateFromList} 
        updateDateInList={updateDateInList} 
        isReadOnly={isReadOnly}
      />

      {!isReadOnly && (
        <ReceitasSection
          formData={formData}
          setFormData={setFormData}
          addDateToList={addDateToList}
          removeDateFromList={removeDateFromList}
          updateDateInList={updateDateInList}
        />
      )}

      <RastreamentoSection formData={formData} setFormData={setFormData} isReadOnly={isReadOnly} />

      <section className="bg-bg-primary dark:bg-slate-800/50 rounded-xl p-6 border border-border dark:border-slate-800 space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <CheckCircle2 className="w-4 h-4" />
          <h3 className="text-xs font-semibold uppercase tracking-widest">Acompanhamentos Específicos</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {categoriesList.map((cat) => {
            const isSelected = formData.categories.includes(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                disabled={isReadOnly}
                onClick={() => toggleCategory(cat.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                  isSelected 
                    ? `${cat.color} bg-bg-secondary dark:bg-slate-900 shadow-sm font-semibold border-current scale-[1.02]` 
                    : 'border-border dark:border-slate-700 bg-bg-secondary dark:bg-slate-800 text-text-muted hover:border-slate-300'
                } ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <cat.icon className="w-4 h-4" />
                <span className="text-[11px] font-semibold uppercase tracking-tight">{cat.label || cat.id}</span>
              </button>
            );
          })}
        </div>
      </section>

      <SaudeMentalSection formData={formData} setFormData={setFormData} isReadOnly={isReadOnly} />
      
      <ChronicSection formData={formData} setFormData={setFormData} isReadOnly={isReadOnly} />

      <AcamadoSection formData={formData} setFormData={setFormData} isReadOnly={isReadOnly} />

      <GestanteSection 
        formData={formData} 
        setFormData={setFormData} 
        addDateToList={addDateToList} 
        removeDateFromList={removeDateFromList} 
        updateDateInList={updateDateInList} 
        isReadOnly={isReadOnly}
      />

      <CriancaSection 
        formData={formData} 
        setFormData={setFormData} 
        visibleSchedule={visibleSchedule} 
        addDateToList={addDateToList} 
        removeDateFromList={removeDateFromList} 
        updateDateInList={updateDateInList} 
        isReadOnly={isReadOnly}
      />

      <CommonSections formData={formData} setFormData={setFormData} isReadOnly={isReadOnly} />
    </div>
  );
}

