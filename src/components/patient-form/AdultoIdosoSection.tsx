import React from 'react';
import { User, HeartPulse, Activity } from 'lucide-react';
import { PatientFormData } from '../../types/patient';
import { getVisitAlert, calculateNextVisit, getConsultationAlert } from '../../lib/dateUtils';

interface Props {
  catId: string;
  formData: PatientFormData;
  setFormData: React.Dispatch<React.SetStateAction<PatientFormData>>;
}

export function AdultoIdosoSection({ catId, formData, setFormData }: Props) {
  if (catId !== 'Adulto' && catId !== 'Idoso') return null;
  if (!formData.categories.includes(catId)) return null;

  return (
    <section className={`bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border-l-4 ${catId === 'Adulto' ? 'border-slate-500' : 'border-red-500'}`}>
      <h3 className={`text-xl font-bold ${catId === 'Adulto' ? 'text-slate-600 dark:text-slate-400' : 'text-red-600 dark:text-red-400'} mb-8 font-headline flex items-center gap-2`}>
        {catId === 'Adulto' ? <User className="w-6 h-6" /> : <HeartPulse className="w-6 h-6" />}
        Categoria: {catId}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {catId === 'Adulto' && (
          <div className="md:col-span-2 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Observações / Informações Adicionais</label>
            <textarea 
              value={formData.clinicalData.adulto.notes || ''}
              onChange={e => setFormData({
                ...formData, 
                clinicalData: { 
                  ...formData.clinicalData, 
                  adulto: { ...formData.clinicalData.adulto, notes: e.target.value } 
                }
              })}
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm text-on-surface"
              placeholder="Anote aqui informações relevantes sobre o acompanhamento deste adulto..."
            />
          </div>
        )}
        {catId === 'Idoso' && (
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
            <h4 className="col-span-full text-xs font-bold uppercase text-red-600 dark:text-red-400 flex items-center gap-2 mb-2">
              <HeartPulse className="w-3 h-3" />
              Acompanhamento Específico: Idoso
            </h4>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Vacina Influenza</label>
              <select 
                value={formData.clinicalData.idoso.vacinaInfluenza || 'Não'}
                onChange={e => setFormData({
                  ...formData, 
                  clinicalData: { 
                    ...formData.clinicalData, 
                    idoso: { ...formData.clinicalData.idoso, vacinaInfluenza: e.target.value } 
                  }
                })}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm text-on-surface"
              >
                <option>Não</option>
                <option>Sim</option>
              </select>
            </div>
            {/* Visitas ACS para Idoso (Geral) */}
            <div className="col-span-full space-y-4 mt-2">
              <label className="block text-[10px] font-bold uppercase text-slate-400">Visita ACS (Mín. 2/ano)</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[8px] font-bold text-slate-500 uppercase mb-1">1ª Visita</label>
                  <input 
                    type="date" 
                    value={formData.clinicalData.idoso.visitaAcs1 || ''}
                    onChange={e => {
                      const v1 = e.target.value;
                      const v2 = calculateNextVisit(v1, 180);
                      setFormData({
                        ...formData,
                        clinicalData: {
                          ...formData.clinicalData,
                          idoso: { ...formData.clinicalData.idoso, visitaAcs1: v1, visitaAcs2: v2 }
                        }
                      });
                    }}
                    className="w-full bg-white dark:bg-slate-800 border-none rounded-xl p-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-bold text-slate-500 uppercase mb-1">2ª Visita (Auto +180 dias)</label>
                  <input 
                    type="date" 
                    value={formData.clinicalData.idoso.visitaAcs2 || ''}
                    onChange={e => setFormData({
                      ...formData,
                      clinicalData: {
                        ...formData.clinicalData,
                        idoso: { ...formData.clinicalData.idoso, visitaAcs2: e.target.value }
                      }
                    })}
                    className="w-full bg-white dark:bg-slate-800 border-none rounded-xl p-3 text-sm"
                  />
                </div>
              </div>
              {getVisitAlert(calculateNextVisit(formData.clinicalData.idoso.visitaAcs1, 180)) && (
                <div className={`p-3 rounded-xl flex items-center gap-3 text-[10px] font-bold uppercase ${
                  getVisitAlert(calculateNextVisit(formData.clinicalData.idoso.visitaAcs1, 180))?.type === 'error' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'
                }`}>
                  <Activity className="w-4 h-4" />
                  {getVisitAlert(calculateNextVisit(formData.clinicalData.idoso.visitaAcs1, 180))?.message}
                </div>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Consulta Médica Anual</label>
              <input 
                type="date"
                value={formData.clinicalData.idoso.consultaMedicaAnualData || ''}
                onChange={e => setFormData({
                  ...formData, 
                  clinicalData: { 
                    ...formData.clinicalData, 
                    idoso: { ...formData.clinicalData.idoso, consultaMedicaAnualData: e.target.value } 
                  }
                })}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm text-on-surface"
              />
              {getConsultationAlert(formData.clinicalData.idoso.consultaMedicaAnualData) && (
                <div className={`mt-2 p-3 rounded-xl flex items-center gap-3 text-[10px] font-bold uppercase ${
                  getConsultationAlert(formData.clinicalData.idoso.consultaMedicaAnualData)?.type === 'error' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'
                }`}>
                  <Activity className="w-4 h-4" />
                  {getConsultationAlert(formData.clinicalData.idoso.consultaMedicaAnualData)?.message}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
