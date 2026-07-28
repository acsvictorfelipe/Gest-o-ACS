import React, { useState, useEffect } from 'react';
import { FileText, ClipboardList, ShieldAlert, Heart, Calendar } from 'lucide-react';
import { VACCINE_SCHEDULE } from '../../../lib/dateUtils';

import { VisitasHistoricoSection } from '../../patient-form/medical-sections/VisitasHistoricoSection';
import { ReceitasSection } from '../../patient-form/medical-sections/ReceitasSection';
import { RastreamentoSection } from '../../patient-form/medical-sections/RastreamentoSection';
import { SaudeMentalSection } from '../../patient-form/medical-sections/SaudeMentalSection';
import { ChronicSection } from '../../patient-form/medical-sections/ChronicSection';
import { AcamadoSection } from '../../patient-form/medical-sections/AcamadoSection';
import { GestanteSection } from '../../patient-form/medical-sections/GestanteSection';
import { CriancaSection } from '../../patient-form/medical-sections/CriancaSection';
import { CommonSections } from '../../patient-form/medical-sections/CommonSections';

interface DadosClinicosTabsProps {
  formData: any;
  setFormData: (updater: any) => void;
  id: string | undefined;
  isReadOnly?: boolean;
}

export function DadosClinicosTabs({ formData, setFormData, id, isReadOnly }: DadosClinicosTabsProps) {
  const [activeTab, setActiveTab] = useState<'visitas' | 'geral' | 'preve' | 'acomp'>('visitas');

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
    ? VACCINE_SCHEDULE.filter(group => group.age <= ageInMonths)
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

  // Check which tracking categories are selected to show on the Acompanhamentos header badge
  const activeTrackingCount = formData.categories.filter((cat: string) => 
    ['Gestante', 'Criança', 'AcamadoDomiciliado', 'SaudeMental', 'Adulto', 'Idoso'].includes(cat)
  ).length;

  return (
    <div className="space-y-8 pt-2">
      {/* 1. Visitas e Receitas */}
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
      </div>

      {/* 2. Hábitos e Ficha Comum */}
      <div className="space-y-4">
        <CommonSections formData={formData} setFormData={setFormData} isReadOnly={isReadOnly} />
      </div>

      {/* 3. Rastreamento e Prevenção */}
      <div className="space-y-4">
        <RastreamentoSection formData={formData} setFormData={setFormData} isReadOnly={isReadOnly} />
      </div>

      {/* 4. Acompanhamentos Específicos */}
      <div className="space-y-4">
        {activeTrackingCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50/80 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6">
            <ShieldAlert className="w-7 h-7 text-slate-400 mb-2" />
            <h5 className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">Nenhum Acompanhamento Específico Selecionado</h5>
            <p className="text-[11px] text-slate-500 mt-1 max-w-md">
              Para habilitar fichas clínicas especializadas (ex: Gestante, Criança, Hipertensão, Diabetes, Saúde Mental ou Acamado), selecione as categorias correspondentes na seção "Condições & Acompanhamentos Específicos" acima.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
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
          </div>
        )}
      </div>
    </div>
  );
}
