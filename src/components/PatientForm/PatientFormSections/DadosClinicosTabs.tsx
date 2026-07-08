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

  // Check which tracking categories are selected to show on the Acompanhamentos tab badge
  const activeTrackingCount = formData.categories.filter((cat: string) => 
    ['Gestante', 'Criança', 'AcamadoDomiciliado', 'SaudeMental', 'Adulto', 'Idoso'].includes(cat)
  ).length;

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('visitas')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'visitas'
              ? 'border-primary text-primary dark:text-teal-400 font-bold'
              : 'border-transparent text-text-muted hover:text-slate-700'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Histórico e Receitas
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('geral')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'geral'
              ? 'border-primary text-primary dark:text-teal-400 font-bold'
              : 'border-transparent text-text-muted hover:text-slate-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          Hábitos e Ficha Comum
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('preve')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'preve'
              ? 'border-primary text-primary dark:text-teal-400 font-bold'
              : 'border-transparent text-text-muted hover:text-slate-700'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          Rastreamento e Prevenção
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('acomp')}
          className={`flex items-center justify-between gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'acomp'
              ? 'border-primary text-primary dark:text-teal-400 font-bold'
              : 'border-transparent text-text-muted hover:text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4" />
            <span>Acompanhamentos Ativos</span>
          </div>
          {activeTrackingCount > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-extrabold bg-primary/15 text-primary rounded-full">
              {activeTrackingCount}
            </span>
          )}
        </button>
      </div>

      {/* Tab Contents */}
      <div className="space-y-6">
        {activeTab === 'visitas' && (
          <div className="space-y-6 animate-in fade-in duration-200">
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
        )}

        {activeTab === 'geral' && (
          <div className="animate-in fade-in duration-200">
            <CommonSections formData={formData} setFormData={setFormData} isReadOnly={isReadOnly} />
          </div>
        )}

        {activeTab === 'preve' && (
          <div className="animate-in fade-in duration-200">
            <RastreamentoSection formData={formData} setFormData={setFormData} isReadOnly={isReadOnly} />
          </div>
        )}

        {activeTab === 'acomp' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {activeTrackingCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6">
                <ShieldAlert className="w-8 h-8 text-slate-400 mb-3" />
                <h5 className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">Nenhum Acompanhamento Selecionado</h5>
                <p className="text-[11px] text-slate-500 mt-1 max-w-sm">
                  Ative um ou mais "Acompanhamentos Específicos" acima para habilitar o preenchimento de fichas clínicas especializadas (ex: Gestante, Criança, Hipertensão, Diabetes, Saúde Mental ou Acamado).
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
        )}
      </div>
    </div>
  );
}
