import React from 'react';
import { Stethoscope } from 'lucide-react';
import { getAgeNumber } from '../../../lib/dateUtils';

interface RastreamentoSectionProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  isReadOnly?: boolean;
}

export function RastreamentoSection({ formData, setFormData, isReadOnly }: RastreamentoSectionProps) {
  const age = getAgeNumber(formData.birthDate);
  const isFemale = formData.gender === 'Feminino';

  const shouldShow = (isFemale && age >= 14 && age <= 69) || (age >= 9 && age <= 14);

  if (!shouldShow) return null;

  return (
    <section className="bg-bg-secondary dark:bg-slate-900 rounded-xl p-6 border border-border dark:border-slate-800 shadow-sm space-y-6">
      <div className="flex items-center gap-2 text-primary">
        <Stethoscope className="w-4 h-4" />
        <h3 className="text-sm font-bold uppercase tracking-tight">Rastreamento e Prevenção</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
        {/* Mulheres 25-64: Citopatológico */}
        {isFemale && age >= 25 && age <= 64 && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Exame Citopatológico</label>
            <select 
              value={formData.clinicalData.rastreamento?.exameCitopatologico || 'Não'}
              onChange={e => setFormData(prev => ({
                ...prev, 
                clinicalData: { 
                  ...prev.clinicalData, 
                  rastreamento: { ...(prev.clinicalData?.rastreamento || {}), exameCitopatologico: e.target.value } 
                }
              }))}
              className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-800 rounded-lg py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20"
            >
              <option>Não</option>
              <option>Sim</option>
            </select>
          </div>
        )}

        {/* Mulheres 14-69: Saúde Sexual Reprodutiva */}
        {isFemale && age >= 14 && age <= 69 && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Saúde Sexual Reprodutiva</label>
            <select 
              value={formData.clinicalData.rastreamento?.saudeSexualReprodutiva || 'Não'}
              onChange={e => setFormData(prev => ({
                ...prev, 
                clinicalData: { 
                  ...prev.clinicalData, 
                  rastreamento: { ...(prev.clinicalData?.rastreamento || {}), saudeSexualReprodutiva: e.target.value } 
                }
              }))}
              className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-800 rounded-lg py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20"
            >
              <option>Não</option>
              <option>Sim</option>
            </select>
          </div>
        )}

        {/* Mulheres 50-69: Mamografia */}
        {isFemale && age >= 50 && age <= 69 && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Mamografia</label>
            <select 
              value={formData.clinicalData.rastreamento?.mamografia || 'Não'}
              onChange={e => setFormData(prev => ({
                ...prev, 
                clinicalData: { 
                  ...prev.clinicalData, 
                  rastreamento: { ...(prev.clinicalData?.rastreamento || {}), mamografia: e.target.value } 
                }
              }))}
              className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-800 rounded-lg py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20"
            >
              <option>Não</option>
              <option>Sim</option>
            </select>
          </div>
        )}

        {/* Todos 9-14: Vacina HPV */}
        {age >= 9 && age <= 14 && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Vacina HPV</label>
            <select 
              value={formData.clinicalData.rastreamento?.vacinaHpv || 'Não'}
              onChange={e => setFormData(prev => ({
                ...prev, 
                clinicalData: { 
                  ...prev.clinicalData, 
                  rastreamento: { ...(prev.clinicalData?.rastreamento || {}), vacinaHpv: e.target.value } 
                }
              }))}
              className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-800 rounded-lg py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20"
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

