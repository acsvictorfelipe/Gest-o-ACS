import React from 'react';
import { Stethoscope, Activity } from 'lucide-react';
import { PatientFormData } from '../../types/patient';
import { getAgeNumber } from '../../lib/dateUtils';

interface Props {
  formData: PatientFormData;
  setFormData: React.Dispatch<React.SetStateAction<PatientFormData>>;
}

export function RastreamentoSection({ formData, setFormData }: Props) {
  const age = getAgeNumber(formData.birthDate);
  const showRastreamento = (formData.gender === 'Feminino' && age >= 14 && age <= 69) || (age >= 9 && age <= 14);

  if (!showRastreamento) return null;

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-slate-800">
      <h3 className="text-lg font-bold text-primary font-headline flex items-center gap-2 mb-6">
        <Stethoscope className="w-5 h-5" />
        Rastreamento e Prevenção
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {formData.gender === 'Feminino' && age >= 25 && age <= 64 && (
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Exame Citopatológico (Sim/Não)</label>
            <select 
              value={formData.clinicalData.rastreamento?.exameCitopatologico || 'Não'}
              onChange={e => setFormData(prev => ({
                ...prev, 
                clinicalData: { 
                  ...prev.clinicalData, 
                  rastreamento: { ...(prev.clinicalData?.rastreamento || {}), exameCitopatologico: e.target.value } 
                }
              }))}
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm text-on-surface"
            >
              <option>Não</option>
              <option>Sim</option>
            </select>
          </div>
        )}

        {formData.gender === 'Feminino' && age >= 14 && age <= 69 && (
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Saúde Sexual Reprodutiva (Sim/Não)</label>
            <select 
              value={formData.clinicalData.rastreamento?.saudeSexualReprodutiva || 'Não'}
              onChange={e => setFormData(prev => ({
                ...prev, 
                clinicalData: { 
                  ...prev.clinicalData, 
                  rastreamento: { ...(prev.clinicalData?.rastreamento || {}), saudeSexualReprodutiva: e.target.value } 
                }
              }))}
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm text-on-surface"
            >
              <option>Não</option>
              <option>Sim</option>
            </select>
          </div>
        )}

        {formData.gender === 'Feminino' && age >= 50 && age <= 69 && (
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Mamografia (Sim/Não)</label>
            <select 
              value={formData.clinicalData.rastreamento?.mamografia || 'Não'}
              onChange={e => setFormData(prev => ({
                ...prev, 
                clinicalData: { 
                  ...prev.clinicalData, 
                  rastreamento: { ...(prev.clinicalData?.rastreamento || {}), mamografia: e.target.value } 
                }
              }))}
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm text-on-surface"
            >
              <option>Não</option>
              <option>Sim</option>
            </select>
          </div>
        )}

        {age >= 9 && age <= 14 && (
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Vacina HPV (Sim/Não)</label>
            <select 
              value={formData.clinicalData.rastreamento?.vacinaHpv || 'Não'}
              onChange={e => setFormData(prev => ({
                ...prev, 
                clinicalData: { 
                  ...prev.clinicalData, 
                  rastreamento: { ...(prev.clinicalData?.rastreamento || {}), vacinaHpv: e.target.value } 
                }
              }))}
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm text-on-surface"
            >
              <option>Não</option>
              <option>Sim</option>
            </select>
          </div>
        )}
      </div>
    </section>
  );
}

export function SaudeMentalSection({ formData, setFormData }: Props) {
  if (!formData.categories.includes('SaudeMental')) return null;

  return (
    <section className="bg-white rounded-2xl p-8 shadow-sm border-l-4 border-purple-500 mb-8 animate-in fade-in slide-in-from-top-2">
      <h3 className="text-xl font-bold text-purple-600 mb-6 font-headline flex items-center gap-2">
        <Activity className="w-6 h-6" />
        Saúde Mental
      </h3>
      <div className="space-y-4">
        <label className="block text-[10px] font-bold uppercase text-slate-400">Anotações de Saúde Mental</label>
        <textarea 
          value={formData.clinicalData?.saudeMental?.notes || ''}
          onChange={e => setFormData(prev => ({
            ...prev, 
            clinicalData: { 
              ...prev.clinicalData, 
              saudeMental: { ...(prev.clinicalData?.saudeMental || {}), notes: e.target.value } 
            }
          }))}
          className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 text-sm text-on-surface min-h-[100px]"
          placeholder="Descreva observações relevantes sobre a saúde mental do paciente..."
        />
      </div>
    </section>
  );
}
