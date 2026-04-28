import React from 'react';
import { Smile, Plus, Trash2, CheckCircle2 } from 'lucide-react';

interface CriancaSectionProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  visibleSchedule: any[];
  addDateToList: (category: string, list: string) => void;
  removeDateFromList: (category: string, list: string, index: number) => void;
  updateDateInList: (category: string, list: string, index: number, value: any) => void;
}

export function CriancaSection({ 
  formData, 
  setFormData, 
  visibleSchedule, 
  addDateToList, 
  removeDateFromList, 
  updateDateInList 
}: CriancaSectionProps) {
  if (!formData.categories.includes('Criança')) return null;

  const data = formData.clinicalData?.crianca || {};

  return (
    <section className="bg-bg-secondary dark:bg-slate-900 rounded-2xl p-8 shadow-sm border-l-4 border-green-500 mb-8 animate-in fade-in slide-in-from-top-2">
      <h3 className="text-xl font-semibold text-green-600 dark:text-green-400 mb-8 font-headline flex items-center gap-2">
        <Smile className="w-6 h-6" />
        Categoria: Criança
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-semibold uppercase text-text-muted">Consultas de Puericultura</label>
              <button 
                type="button"
                onClick={() => addDateToList('crianca', 'consultas')}
                className="text-primary hover:text-primary/80 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {data.consultas?.map((date: string, index: number) => (
                <div key={index} className="flex items-center gap-2 bg-bg-primary dark:bg-slate-800 p-2 rounded-lg border border-border dark:border-slate-700">
                  <input 
                    type="date" 
                    value={date || ''}
                    onChange={e => updateDateInList('crianca', 'consultas', index, e.target.value)}
                    className="bg-transparent border-none text-[10px] font-semibold text-text-primary dark:text-white w-full" 
                  />
                  <button 
                    type="button"
                    onClick={() => removeDateFromList('crianca', 'consultas', index)}
                    className="text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-semibold uppercase text-text-muted">Visitas ACS (Crescimento/Desenv.)</label>
              <button 
                type="button"
                onClick={() => addDateToList('crianca', 'visitasAcs')}
                className="text-primary hover:text-primary/80 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {data.visitasAcs?.map((date: string, index: number) => (
                <div key={index} className="flex items-center gap-2 bg-bg-primary dark:bg-slate-800 p-2 rounded-lg border border-border dark:border-slate-700">
                  <input 
                    type="date" 
                    value={date || ''}
                    onChange={e => updateDateInList('crianca', 'visitasAcs', index, e.target.value)}
                    className="bg-transparent border-none text-[10px] font-semibold text-text-primary dark:text-white w-full" 
                  />
                  <button 
                    type="button"
                    onClick={() => removeDateFromList('crianca', 'visitasAcs', index)}
                    className="text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h4 className="text-xs font-semibold uppercase text-text-muted flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            Calendário Vacinal
          </h4>
          <div className="bg-bg-primary dark:bg-slate-800 rounded-xl border border-border dark:border-slate-700 divide-y divide-border dark:divide-slate-700">
            {visibleSchedule?.map((group, groupIdx) => (
              <div key={groupIdx} className="p-4 space-y-3">
                <span className="text-[10px] font-semibold uppercase text-primary tracking-widest">{group.label}</span>
                <div className="grid grid-cols-1 gap-3">
                  {group.vaccines.map((v: any) => (
                    <div key={v.id} className="flex items-center justify-between gap-4">
                      <label className="text-[11px] font-medium text-text-secondary dark:text-slate-300">{v.label}</label>
                      <input 
                        type="date" 
                        value={data.vacinas?.[v.id] || ''}
                        onChange={e => setFormData((prev: any) => ({
                          ...prev,
                          clinicalData: {
                            ...prev.clinicalData,
                            crianca: {
                              ...(prev.clinicalData?.crianca || {}),
                              vacinas: {
                                ...(prev.clinicalData?.crianca?.vacinas || {}),
                                [v.id]: e.target.value
                              }
                            }
                          }
                        }))}
                        className="bg-bg-secondary dark:bg-slate-900 border-none rounded-lg py-1.5 px-3 text-[10px] font-semibold w-32 focus:ring-1 focus:ring-primary/30 transition-all"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
