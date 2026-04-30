import React from 'react';
import { Smile, Plus, Trash2, CheckCircle2, Stethoscope, MapPin } from 'lucide-react';
import { calculateAge } from '../../../lib/dateUtils';

interface CriancaSectionProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  visibleSchedule: any[];
  addDateToList: (category: string, list: string) => void;
  removeDateFromList: (category: string, list: string, index: number) => void;
  updateDateInList: (category: string, list: string, index: number, value: any) => void;
  isReadOnly?: boolean;
}

export function CriancaSection({ 
  formData, 
  setFormData, 
  visibleSchedule, 
  addDateToList, 
  removeDateFromList, 
  updateDateInList,
  isReadOnly
}: CriancaSectionProps) {
  if (!formData.categories.includes('Criança')) return null;

  const data = formData.clinicalData?.crianca || {};

  return (
    <section className="bg-bg-secondary dark:bg-slate-900 rounded-2xl p-6 shadow-sm border-l-4 border-green-500 space-y-8 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-green-600 dark:text-green-400 font-headline flex items-center gap-2">
          <Smile className="w-5 h-5" />
          Acompanhamento da Criança
        </h3>
      </div>
      
      {/* 1. Monitoring Section (Top) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Puericultura */}
        <div className="bg-bg-primary dark:bg-slate-800/50 rounded-xl p-4 border border-border dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary">
              <Stethoscope className="w-4 h-4" />
              <label className="text-[10px] font-bold uppercase tracking-widest">Consultas de Puericultura</label>
            </div>
            {!isReadOnly && (
              <button 
                type="button"
                onClick={() => addDateToList('crianca', 'consultas')}
                className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {data.consultas?.map((date: string, index: number) => (
              <div key={index} className="group flex items-center gap-2 bg-white dark:bg-slate-900 px-2 py-1.5 rounded-lg border border-border dark:border-slate-700 shadow-sm transition-all hover:border-primary/30">
                <input 
                  type="date" 
                  disabled={isReadOnly}
                  value={date || ''}
                  onChange={e => updateDateInList('crianca', 'consultas', index, e.target.value)}
                  className="bg-transparent border-none text-[10px] font-bold text-text-primary dark:text-white w-full outline-none focus:ring-0 disabled:opacity-50" 
                />
                {!isReadOnly && (
                  <button 
                    type="button"
                    onClick={() => removeDateFromList('crianca', 'consultas', index)}
                    className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
            {(!data.consultas || data.consultas.length === 0) && (
              <p className="col-span-full text-[10px] text-text-muted italic py-2">Nenhuma consulta registrada.</p>
            )}
          </div>
        </div>

        {/* Visitas ACS */}
        <div className="bg-bg-primary dark:bg-slate-800/50 rounded-xl p-4 border border-border dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary">
              <MapPin className="w-4 h-4" />
              <label className="text-[10px] font-bold uppercase tracking-widest">Visitas ACS (Crescimento)</label>
            </div>
            {!isReadOnly && (
              <button 
                type="button"
                onClick={() => addDateToList('crianca', 'visitasAcs')}
                className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {data.visitasAcs?.map((date: string, index: number) => (
              <div key={index} className="group flex items-center gap-2 bg-white dark:bg-slate-900 px-2 py-1.5 rounded-lg border border-border dark:border-slate-700 shadow-sm transition-all hover:border-primary/30">
                <input 
                  type="date" 
                  disabled={isReadOnly}
                  value={date || ''}
                  onChange={e => updateDateInList('crianca', 'visitasAcs', index, e.target.value)}
                  className="bg-transparent border-none text-[10px] font-bold text-text-primary dark:text-white w-full outline-none focus:ring-0 disabled:opacity-50" 
                />
                {!isReadOnly && (
                  <button 
                    type="button"
                    onClick={() => removeDateFromList('crianca', 'visitasAcs', index)}
                    className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
            {(!data.visitasAcs || data.visitasAcs.length === 0) && (
              <p className="col-span-full text-[10px] text-text-muted italic py-2">Nenhuma visita registrada.</p>
            )}
          </div>
        </div>
      </div>

      {/* 2. Vaccine Section (Bottom) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 px-1">
          <CheckCircle2 className="w-4 h-4" />
          <h4 className="text-[11px] font-bold uppercase tracking-widest">Calendário Vacinal</h4>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          {visibleSchedule?.length > 0 ? (
            visibleSchedule.map((group, groupIdx) => (
              <div key={groupIdx} className="bg-bg-primary dark:bg-slate-800/40 rounded-xl border border-border dark:border-slate-800 overflow-hidden">
                <div className="bg-bg-secondary dark:bg-slate-800 px-4 py-2 border-b border-border dark:border-slate-700">
                  <span className="text-[10px] font-black uppercase text-primary tracking-widest">{group.label}</span>
                </div>
                <div className="p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2">
                  {group.vaccines.map((v: any) => (
                    <div key={v.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white dark:hover:bg-slate-900 transition-all group/v">
                      <input 
                        type="checkbox" 
                        disabled={isReadOnly}
                        checked={data.vacinas?.[v.id] === 'Sim'}
                        onChange={e => setFormData((prev: any) => ({
                          ...prev,
                          clinicalData: {
                            ...prev.clinicalData,
                            crianca: {
                              ...(prev.clinicalData?.crianca || {}),
                              vacinas: {
                                ...(prev.clinicalData?.crianca?.vacinas || {}),
                                [v.id]: e.target.checked ? 'Sim' : 'Não'
                              }
                            }
                          }
                        }))}
                        className="w-4.5 h-4.5 rounded border-slate-300 dark:border-slate-600 text-primary focus:ring-primary/20 transition-all cursor-pointer disabled:opacity-50"
                      />
                      <label className="text-[10px] font-bold text-text-secondary dark:text-slate-400 group-hover/v:text-primary transition-colors cursor-pointer flex-1 truncate uppercase">
                        {v.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-bg-primary dark:bg-slate-800/30 rounded-xl p-8 border border-dashed border-border dark:border-slate-800 text-center">
              <p className="text-[11px] text-text-muted font-medium italic">
                Nenhum grupo de vacinas pendente para esta idade ({formData.birthDate ? calculateAge(formData.birthDate) : 'N/A'}).
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

