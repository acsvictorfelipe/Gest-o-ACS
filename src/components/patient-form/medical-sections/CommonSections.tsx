import React from 'react';
import { User, HeartPulse } from 'lucide-react';

interface CommonSectionsProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  isReadOnly?: boolean;
}

export function CommonSections({ formData, setFormData, isReadOnly }: CommonSectionsProps) {
  const isAdulto = formData.categories.includes('Adulto');
  const isIdoso = formData.categories.includes('Idoso');

  if (!isAdulto && !isIdoso) return null;

  return (
    <>
      {isAdulto && (
        <section className="bg-bg-secondary dark:bg-slate-900 rounded-2xl p-8 shadow-sm border-l-4 border-slate-500 mb-8 animate-in fade-in slide-in-from-top-2">
          <h3 className="text-xl font-bold text-slate-600 dark:text-slate-400 mb-6 font-headline flex items-center gap-2">
            <User className="w-6 h-6" />
            Categoria: Adulto
          </h3>
          <div className="space-y-4">
            <label className="block text-[10px] font-bold uppercase text-text-muted">Anotações Gerais</label>
            <textarea 
              value={formData.clinicalData?.adulto?.notes || ''}
              onChange={e => setFormData((prev: any) => ({
                ...prev, 
                clinicalData: { 
                  ...prev.clinicalData, 
                  adulto: { ...(prev.clinicalData?.adulto || {}), notes: e.target.value } 
                }
              }))}
              className="w-full bg-bg-primary dark:bg-slate-800 border-none rounded-xl p-4 text-sm text-on-surface min-h-[100px]"
              placeholder="Descreva observações relevantes..."
            />
          </div>
        </section>
      )}

      {isIdoso && (
        <section className="bg-bg-secondary dark:bg-slate-900 rounded-2xl p-8 shadow-sm border-l-4 border-red-500 mb-8 animate-in fade-in slide-in-from-top-2">
          <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-8 font-headline flex items-center gap-2">
            <HeartPulse className="w-6 h-6" />
            Categoria: Idoso
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-bold uppercase text-text-muted mb-2">Vacina Influenza (Anual)</label>
              <select 
                value={formData.clinicalData?.idoso?.vacinaInfluenza || 'Não'}
                onChange={e => setFormData((prev: any) => ({
                  ...prev, 
                  clinicalData: { 
                    ...prev.clinicalData, 
                    idoso: { ...(prev.clinicalData?.idoso || {}), vacinaInfluenza: e.target.value } 
                  }
                }))}
                className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-700 rounded-xl p-3 text-sm"
              >
                <option>Não</option>
                <option>Sim</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-text-muted mb-2">Consulta Médica Anual</label>
              <input 
                type="date" 
                value={formData.clinicalData?.idoso?.consultaMedicaAnualData || ''}
                onChange={e => setFormData((prev: any) => ({
                  ...prev, 
                  clinicalData: { 
                    ...prev.clinicalData, 
                    idoso: { ...(prev.clinicalData?.idoso || {}), consultaMedicaAnualData: e.target.value } 
                  }
                }))}
                className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-700 rounded-xl p-3 text-sm"
              />
            </div>
          </div>
          <div className="space-y-4 mt-6">
            <label className="block text-[10px] font-bold uppercase text-text-muted">Anotações Gerais</label>
            <textarea 
              value={formData.clinicalData?.idoso?.notes || ''}
              onChange={e => setFormData((prev: any) => ({
                ...prev, 
                clinicalData: { 
                  ...prev.clinicalData, 
                  idoso: { ...(prev.clinicalData?.idoso || {}), notes: e.target.value } 
                }
              }))}
              className="w-full bg-bg-primary dark:bg-slate-800 border-none rounded-xl p-4 text-sm text-on-surface min-h-[100px]"
              placeholder="Descreva observações relevantes..."
            />
          </div>
        </section>
      )}
    </>
  );
}

