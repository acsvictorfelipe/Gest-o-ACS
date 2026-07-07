import React from 'react';
import { Smile, Plus, Trash2, CheckCircle2, Stethoscope, MapPin, Baby, Clock } from 'lucide-react';
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
      <div className="space-y-6">
        {/* Puericultura */}
        <div className="space-y-4">
          <div className="flex flex-col bg-bg-primary dark:bg-slate-800/40 p-4 rounded-xl border border-border dark:border-slate-800/80 gap-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Progresso de Puericultura</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-medium">Meta mínima recomendada: 9 consultas até completar 24 meses de idade</span>
              </div>
              <span className="text-sm font-black text-green-500 dark:text-green-400 bg-green-50 dark:bg-green-950/20 px-2.5 py-1 rounded-lg border border-green-100 dark:border-green-900/35">
                {Math.min(9, data.consultas?.filter((c: string) => c && c.trim() !== '').length || 0)} / 9
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-green-500 h-full rounded-full transition-all duration-350"
                style={{ width: `${Math.min(100, ((data.consultas?.filter((c: string) => c && c.trim() !== '').length || 0) / 9) * 100)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between mt-2">
            <label className="block text-[10px] font-semibold uppercase text-text-muted">Consultas de Puericultura</label>
            {!isReadOnly && (
              <button 
                type="button"
                onClick={() => addDateToList('crianca', 'consultas')}
                className="text-primary hover:text-primary/80 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {data.consultas?.map((date: string, index: number) => (
              <div key={index} className="flex items-center gap-2 bg-bg-primary dark:bg-slate-800 p-2 rounded-lg border border-border dark:border-slate-705">
                <input 
                  type="date" 
                  disabled={isReadOnly}
                  value={date || ''}
                  onChange={e => updateDateInList('crianca', 'consultas', index, e.target.value)}
                  className="bg-transparent border-none text-[10px] font-semibold text-text-primary dark:text-white w-full outline-none focus:ring-0" 
                />
                {!isReadOnly && (
                  <button 
                    type="button"
                    onClick={() => removeDateFromList('crianca', 'consultas', index)}
                    className="text-slate-300 hover:text-red-500 transition-colors"
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
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between mt-2">
            <label className="block text-[10px] font-semibold uppercase text-text-muted">Visitas ACS (Crescimento & Desenvolvimento)</label>
            {!isReadOnly && (
              <button 
                type="button"
                onClick={() => addDateToList('crianca', 'visitasAcs')}
                className="text-primary hover:text-primary/80 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {data.visitasAcs?.map((date: string, index: number) => (
              <div key={index} className="flex items-center gap-2 bg-bg-primary dark:bg-slate-800 p-2 rounded-lg border border-border dark:border-slate-705">
                <input 
                  type="date" 
                  disabled={isReadOnly}
                  value={date || ''}
                  onChange={e => updateDateInList('crianca', 'visitasAcs', index, e.target.value)}
                  className="bg-transparent border-none text-[10px] font-semibold text-text-primary dark:text-white w-full outline-none focus:ring-0" 
                />
                {!isReadOnly && (
                  <button 
                    type="button"
                    onClick={() => removeDateFromList('crianca', 'visitasAcs', index)}
                    className="text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
            {(!data.visitasAcs || data.visitasAcs.length === 0) && (
              <p className="col-span-full text-[10px] text-text-muted italic py-2">Nenhuma visita de crescimento registrada.</p>
            )}
          </div>
        </div>
      </div>

      {/* Visitas Especiais de Bebê (apenas para crianças de até 6 meses aproximadamente) */}
      <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl p-4 border border-amber-200 dark:border-amber-900/40 space-y-3">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <Baby className="w-4 h-4" />
          <h4 className="text-[10px] font-black uppercase tracking-widest">Visitas de Acompanhamento do Bebê</h4>
        </div>
        <p className="text-[10px] text-amber-600 dark:text-amber-500 font-medium">
          Registre as datas das visitas obrigatórias de acompanhamento nos primeiros 6 meses de vida.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Visita do 1º Mês */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              {data.visita30dias
                ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                : <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              }
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">
                Visita do 1º Mês (30 dias)
              </label>
            </div>
            <div className={`flex items-center gap-2 rounded-lg px-3 py-2 border ${
              data.visita30dias
                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40'
                : 'bg-white dark:bg-slate-800 border-amber-200 dark:border-amber-800'
            }`}>
              <input
                type="date"
                disabled={isReadOnly}
                value={data.visita30dias || ''}
                onChange={e => setFormData((prev: any) => ({
                  ...prev,
                  clinicalData: {
                    ...prev.clinicalData,
                    crianca: {
                      ...(prev.clinicalData?.crianca || {}),
                      visita30dias: e.target.value
                    }
                  }
                }))}
                className="bg-transparent border-none text-xs font-bold text-text-primary dark:text-white w-full outline-none focus:ring-0 disabled:opacity-50"
              />
              {data.visita30dias && !isReadOnly && (
                <button
                  type="button"
                  onClick={() => setFormData((prev: any) => ({
                    ...prev,
                    clinicalData: {
                      ...prev.clinicalData,
                      crianca: { ...(prev.clinicalData?.crianca || {}), visita30dias: '' }
                    }
                  }))}
                  className="text-slate-300 hover:text-red-500 transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Visita do 6º Mês */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              {data.visita6meses
                ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                : <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              }
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">
                Visita do 6º Mês
              </label>
            </div>
            <div className={`flex items-center gap-2 rounded-lg px-3 py-2 border ${
              data.visita6meses
                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40'
                : 'bg-white dark:bg-slate-800 border-amber-200 dark:border-amber-800'
            }`}>
              <input
                type="date"
                disabled={isReadOnly}
                value={data.visita6meses || ''}
                onChange={e => setFormData((prev: any) => ({
                  ...prev,
                  clinicalData: {
                    ...prev.clinicalData,
                    crianca: {
                      ...(prev.clinicalData?.crianca || {}),
                      visita6meses: e.target.value
                    }
                  }
                }))}
                className="bg-transparent border-none text-xs font-bold text-text-primary dark:text-white w-full outline-none focus:ring-0 disabled:opacity-50"
              />
              {data.visita6meses && !isReadOnly && (
                <button
                  type="button"
                  onClick={() => setFormData((prev: any) => ({
                    ...prev,
                    clinicalData: {
                      ...prev.clinicalData,
                      crianca: { ...(prev.clinicalData?.crianca || {}), visita6meses: '' }
                    }
                  }))}
                  className="text-slate-300 hover:text-red-500 transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
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

      <div className="space-y-4 pt-6 border-t border-border dark:border-slate-800">
        <label className="block text-[10px] font-bold uppercase text-text-muted">Anotações Gerais</label>
        <textarea 
          disabled={isReadOnly}
          value={data.notes || ''}
          onChange={e => setFormData((prev: any) => ({
            ...prev,
            clinicalData: {
              ...prev.clinicalData,
              crianca: { ...(prev.clinicalData?.crianca || {}), notes: e.target.value }
            }
          }))}
          className="w-full bg-bg-primary dark:bg-slate-800 border-none rounded-xl p-4 text-sm text-on-surface min-h-[100px] disabled:opacity-50"
          placeholder="Descreva observações relevantes..."
        />
      </div>
    </section>
  );
}

