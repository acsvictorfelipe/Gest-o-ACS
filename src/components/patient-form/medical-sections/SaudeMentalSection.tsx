import React from 'react';
import { Activity } from 'lucide-react';

interface SaudeMentalSectionProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  isReadOnly?: boolean;
}

export function SaudeMentalSection({ formData, setFormData, isReadOnly }: SaudeMentalSectionProps) {
  if (!formData.categories.includes('SaudeMental')) return null;

  return (
    <section className="bg-bg-secondary dark:bg-slate-900 rounded-2xl p-8 shadow-sm border-l-4 border-purple-500 mb-8 animate-in fade-in slide-in-from-top-2">
      <h3 className="text-xl font-bold text-purple-600 dark:text-purple-400 mb-6 font-headline flex items-center gap-2">
        <Activity className="w-6 h-6" />
        Saúde Mental
      </h3>
      <div className="space-y-4">
        <label className="block text-[10px] font-bold uppercase text-text-muted">Anotações de Saúde Mental</label>
        <textarea 
          value={formData.clinicalData?.saudeMental?.notes || ''}
          onChange={e => setFormData((prev: any) => ({
            ...prev, 
            clinicalData: { 
              ...prev.clinicalData, 
              saudeMental: { ...(prev.clinicalData?.saudeMental || {}), notes: e.target.value } 
            }
          }))}
          className="w-full bg-bg-primary dark:bg-slate-800 border-none rounded-xl p-4 text-sm text-on-surface min-h-[100px]"
          placeholder="Descreva observações relevantes sobre a saúde mental do paciente..."
        />
      </div>
    </section>
  );
}
