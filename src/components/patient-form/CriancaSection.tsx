import React from 'react';
import { Stethoscope, Calendar, Plus, Activity } from 'lucide-react';
import { PatientFormData } from '../../types/patient';
import { getAgeInMonths, formatDate, VACCINE_SCHEDULE } from '../../lib/dateUtils';

interface Props {
  formData: PatientFormData;
  setFormData: React.Dispatch<React.SetStateAction<PatientFormData>>;
  updateDateInList: (category: string, list: string, index: number, value: any) => void;
  addDateToList: (category: string, list: string) => void;
}

export function CriancaSection({ formData, setFormData, updateDateInList, addDateToList }: Props) {
  if (!formData.categories.includes('Criança')) return null;

  const ageInMonths = getAgeInMonths(formData.birthDate);
  const isFiveYearsOrMore = ageInMonths >= 60;
  const visibleSchedule = VACCINE_SCHEDULE.filter(group => isFiveYearsOrMore || group.age <= ageInMonths);

  return (
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
              {formData.clinicalData.crianca.consultas?.map((date, idx) => (
                <input 
                  key={idx}
                  type="date" 
                  value={date || ''}
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
                  value={formData.clinicalData?.crianca?.visita30dias || ''}
                  onChange={e => setFormData(prev => ({
                    ...prev, 
                    clinicalData: { 
                      ...prev.clinicalData, 
                      crianca: { ...(prev.clinicalData?.crianca || {}), visita30dias: e.target.value } 
                    }
                  }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-2 text-xs text-on-surface"
                />
              </div>
              <div>
                <label className="block text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase">Até 6 meses</label>
                <input 
                  type="date" 
                  value={formData.clinicalData?.crianca?.visita6meses || ''}
                  onChange={e => setFormData(prev => ({
                    ...prev, 
                    clinicalData: { 
                      ...prev.clinicalData, 
                      crianca: { ...(prev.clinicalData?.crianca || {}), visita6meses: e.target.value } 
                    }
                  }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-2 text-xs text-on-surface"
                />
              </div>
            </div>
            {formData.clinicalData.crianca.proximaVisitaSugerida && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 p-3 rounded-xl flex items-center gap-3">
                <Activity className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <div>
                  <p className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase">Alerta: Criança menor de 2 anos</p>
                  <p className="text-[9px] text-amber-600 dark:text-amber-500">Próxima visita recomendada até: {formatDate(formData.clinicalData.crianca.proximaVisitaSugerida)}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">Calendário Vacinal</label>
            <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded">
              Idade: {ageInMonths} meses
            </span>
          </div>
          
          <div className="space-y-4">
            {visibleSchedule.length > 0 ? (
              visibleSchedule.map((group) => (
                <div key={group.age} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <h4 className="text-[10px] font-bold text-primary mb-3 uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    {group.label}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {group.vaccines.map((v) => (
                      <label key={v.id} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 cursor-pointer hover:border-primary/30 transition-all group">
                        <div className="relative flex items-center justify-center">
                          <input 
                            type="checkbox"
                            checked={formData.clinicalData.crianca.vacinas[v.id] === 'Sim'}
                            onChange={e => setFormData({
                              ...formData,
                              clinicalData: {
                                ...formData.clinicalData,
                                crianca: {
                                  ...formData.clinicalData.crianca,
                                  vacinas: {
                                    ...formData.clinicalData.crianca.vacinas,
                                    [v.id]: e.target.checked ? 'Sim' : 'Não'
                                  }
                                }
                              }
                            })}
                            className="w-5 h-5 rounded-md border-slate-300 text-primary focus:ring-primary/20 transition-colors cursor-pointer"
                          />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors">
                            {v.label}
                          </span>
                          <span className="text-[9px] text-slate-400 font-medium">
                            Recomendado: {group.label}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-400 font-medium">
                  Informe a data de nascimento para visualizar o calendário vacinal.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
