import React from 'react';
import { Baby, Plus, Trash2 } from 'lucide-react';

interface GestanteSectionProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  addDateToList: (category: string, list: string) => void;
  removeDateFromList: (category: string, list: string, index: number) => void;
  updateDateInList: (category: string, list: string, index: number, value: any) => void;
}

export function GestanteSection({ 
  formData, 
  setFormData, 
  addDateToList, 
  removeDateFromList, 
  updateDateInList 
}: GestanteSectionProps) {
  if (!formData.categories.includes('Gestante')) return null;

  const data = formData.clinicalData?.gestante || {};

  return (
    <section className="bg-bg-secondary dark:bg-slate-900 rounded-2xl p-8 shadow-sm border-l-4 border-blue-500 mb-8 animate-in fade-in slide-in-from-top-2">
      <h3 className="text-xl font-semibold text-blue-600 dark:text-blue-400 mb-8 font-headline flex items-center gap-2">
        <Baby className="w-6 h-6" />
        Categoria: Gestante
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-[10px] font-semibold uppercase text-text-muted mb-2">DUM (Última Menstruação)</label>
          <input 
            type="date" 
            value={data.dum || ''}
            onChange={e => setFormData((prev: any) => ({
              ...prev, 
              clinicalData: { 
                ...prev.clinicalData, 
                gestante: { ...(prev.clinicalData?.gestante || {}), dum: e.target.value } 
              }
            }))}
            className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-700 rounded-xl p-3 text-sm"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase text-text-muted mb-2">DPP (Prev. Parto)</label>
          <input 
            type="date" 
            value={data.dpp || ''}
            onChange={e => setFormData((prev: any) => ({
              ...prev, 
              clinicalData: { 
                ...prev.clinicalData, 
                gestante: { ...(prev.clinicalData?.gestante || {}), dpp: e.target.value } 
              }
            }))}
            className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-700 rounded-xl p-3 text-sm"
          />
        </div>

        <div className="col-span-full space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-[10px] font-semibold uppercase text-text-muted">Consultas de Pré-Natal</label>
            <button 
              type="button"
              onClick={() => addDateToList('gestante', 'consultas')}
              className="text-primary hover:text-primary/80 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {data.consultas?.map((date: string, index: number) => (
              <div key={index} className="flex items-center gap-2 bg-bg-primary dark:bg-slate-800 p-2 rounded-lg border border-border dark:border-slate-700">
                <input 
                  type="date" 
                  value={date || ''}
                  onChange={e => updateDateInList('gestante', 'consultas', index, e.target.value)}
                  className="bg-transparent border-none text-[10px] font-semibold text-text-primary dark:text-white w-full" 
                />
                <button 
                  type="button"
                  onClick={() => removeDateFromList('gestante', 'consultas', index)}
                  className="text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-full space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-[10px] font-semibold uppercase text-text-muted">Visitas ACS na Gestação</label>
            <button 
              type="button"
              onClick={() => addDateToList('gestante', 'visitasAcs')}
              className="text-primary hover:text-primary/80 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {data.visitasAcs?.map((date: string, index: number) => (
              <div key={index} className="flex items-center gap-2 bg-bg-primary dark:bg-slate-800 p-2 rounded-lg border border-border dark:border-slate-700">
                <input 
                  type="date" 
                  value={date || ''}
                  onChange={e => updateDateInList('gestante', 'visitasAcs', index, e.target.value)}
                  className="bg-transparent border-none text-[10px] font-semibold text-text-primary dark:text-white w-full" 
                />
                <button 
                  type="button"
                  onClick={() => removeDateFromList('gestante', 'visitasAcs', index)}
                  className="text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-full grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-[10px] font-semibold uppercase text-text-muted mb-2">Vacina dTpa?</label>
            <select 
              value={data.dtpa || 'Não'}
              onChange={e => setFormData((prev: any) => ({
                ...prev, 
                clinicalData: { 
                  ...prev.clinicalData, 
                  gestante: { ...(prev.clinicalData?.gestante || {}), dtpa: e.target.value } 
                }
              }))}
              className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-700 rounded-xl p-3 text-sm"
            >
              <option>Não</option>
              <option>Sim</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase text-text-muted mb-2">Exame Sífilis</label>
            <select 
              value={data.sifilis || 'NÃO REALIZADO'}
              onChange={e => setFormData((prev: any) => ({
                ...prev, 
                clinicalData: { 
                  ...prev.clinicalData, 
                  gestante: { ...(prev.clinicalData?.gestante || {}), sifilis: e.target.value } 
                }
              }))}
              className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-700 rounded-xl p-3 text-sm"
            >
              <option>NÃO REALIZADO</option>
              <option>REAGENTE</option>
              <option>NÃO REAGENTE</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase text-text-muted mb-2">Exame HIV</label>
            <select 
              value={data.hiv || 'NÃO REALIZADO'}
              onChange={e => setFormData((prev: any) => ({
                ...prev, 
                clinicalData: { 
                  ...prev.clinicalData, 
                  gestante: { ...(prev.clinicalData?.gestante || {}), hiv: e.target.value } 
                }
              }))}
              className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-700 rounded-xl p-3 text-sm"
            >
              <option>NÃO REALIZADO</option>
              <option>REAGENTE</option>
              <option>NÃO REAGENTE</option>
            </select>
          </div>
        </div>

        <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border dark:border-slate-800">
          <div>
            <label className="block text-[10px] font-semibold uppercase text-text-muted mb-2">Consulta de Puerpério (até 42 dias)</label>
            <input 
              type="date" 
              value={data.puerperioConsulta || ''}
              onChange={e => setFormData((prev: any) => ({
                ...prev, 
                clinicalData: { 
                  ...prev.clinicalData, 
                  gestante: { ...(prev.clinicalData?.gestante || {}), puerperioConsulta: e.target.value } 
                }
              }))}
              className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-700 rounded-xl p-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase text-text-muted mb-2">Visita de Puerpério (até 7 dias)</label>
            <input 
              type="date" 
              value={data.puerperioVisita || ''}
              onChange={e => setFormData((prev: any) => ({
                ...prev, 
                clinicalData: { 
                  ...prev.clinicalData, 
                  gestante: { ...(prev.clinicalData?.gestante || {}), puerperioVisita: e.target.value } 
                }
              }))}
              className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-700 rounded-xl p-3 text-sm"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
