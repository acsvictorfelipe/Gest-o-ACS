import React from 'react';
import { Baby, Plus, Trash2, Stethoscope, RefreshCw } from 'lucide-react';
import { PatientFormData } from '../../types/patient';

interface Props {
  formData: PatientFormData;
  setFormData: React.Dispatch<React.SetStateAction<PatientFormData>>;
  addDateToList: (category: string, list: string) => void;
  updateDateInList: (category: string, list: string, index: number, value: any) => void;
  removeDateFromList: (category: string, list: string, index: number) => void;
}

export function GestanteSection({
  formData,
  setFormData,
  addDateToList,
  updateDateInList,
  removeDateFromList
}: Props) {
  if (!formData.categories.includes('Gestante')) return null;

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border-l-4 border-blue-500">
      <h3 className="text-xl font-bold text-blue-600 mb-8 font-headline flex items-center gap-2">
        <Baby className="w-6 h-6" />
        Categoria: Gestante
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">DUM (Última Menstruação)</label>
          <input 
            type="date" 
            value={formData.clinicalData?.gestante?.dum || ''}
            onChange={e => setFormData(prev => ({
              ...prev, 
              clinicalData: { 
                ...prev.clinicalData, 
                gestante: { ...(prev.clinicalData?.gestante || {}), dum: e.target.value } 
              }
            }))}
            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">DPP (Prev. Parto)</label>
          <input 
            type="date" 
            value={formData.clinicalData?.gestante?.dpp || ''}
            onChange={e => setFormData(prev => ({
              ...prev, 
              clinicalData: { 
                ...prev.clinicalData, 
                gestante: { ...(prev.clinicalData?.gestante || {}), dpp: e.target.value } 
              }
            }))}
            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm"
          />
        </div>

        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-[10px] font-bold uppercase text-slate-400">Consultas Médicas / Enfermagem (Mín. 7)</label>
            <button 
              type="button" 
              onClick={() => addDateToList('gestante', 'consultas')}
              className="text-xs font-bold text-primary flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Adicionar Data
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {formData.clinicalData?.gestante?.consultas?.map((date, idx) => (
              <div key={idx} className="relative group">
                <input 
                  type="date" 
                  value={date}
                  onChange={e => updateDateInList('gestante', 'consultas', idx, e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg p-2 text-xs"
                />
                <button 
                  type="button"
                  onClick={() => removeDateFromList('gestante', 'consultas', idx)}
                  className="absolute -top-2 -right-2 bg-red-100 text-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-[10px] font-bold uppercase text-slate-400">Visitas Domiciliares ACS (Mín. 3)</label>
            <button 
              type="button" 
              onClick={() => addDateToList('gestante', 'visitasAcs')}
              className="text-xs font-bold text-primary flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Adicionar Data
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {formData.clinicalData?.gestante?.visitasAcs?.map((date, idx) => (
              <div key={idx} className="relative group">
                <input 
                  type="date" 
                  value={date}
                  onChange={e => updateDateInList('gestante', 'visitasAcs', idx, e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg p-2 text-xs"
                />
                <button 
                  type="button"
                  onClick={() => removeDateFromList('gestante', 'visitasAcs', idx)}
                  className="absolute -top-2 -right-2 bg-red-100 text-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-2 border-t border-slate-100 pt-6 mt-4">
          <h4 className="text-xs font-bold uppercase text-slate-400 mb-4 flex items-center gap-2">
            <Stethoscope className="w-4 h-4" />
            Testes Rápidos
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-2">Sífilis</label>
              <select 
                value={formData.clinicalData?.gestante?.sifilis || 'NÃO REALIZADO'}
                onChange={e => setFormData(prev => ({
                  ...prev, 
                  clinicalData: { 
                    ...prev.clinicalData, 
                    gestante: { ...(prev.clinicalData?.gestante || {}), sifilis: e.target.value } 
                  }
                }))}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm"
              >
                <option>NÃO REALIZADO</option>
                <option>REALIZADO</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-2">HIV</label>
              <select 
                value={formData.clinicalData?.gestante?.hiv || 'NÃO REALIZADO'}
                onChange={e => setFormData(prev => ({
                  ...prev, 
                  clinicalData: { 
                    ...prev.clinicalData, 
                    gestante: { ...(prev.clinicalData?.gestante || {}), hiv: e.target.value } 
                  }
                }))}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm"
              >
                <option>NÃO REALIZADO</option>
                <option>REALIZADO</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-2">Hepatite B</label>
              <select 
                value={formData.clinicalData?.gestante?.hepatiteB || 'NÃO REALIZADO'}
                onChange={e => setFormData(prev => ({
                  ...prev, 
                  clinicalData: { 
                    ...prev.clinicalData, 
                    gestante: { ...(prev.clinicalData?.gestante || {}), hepatiteB: e.target.value } 
                  }
                }))}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm"
              >
                <option>NÃO REALIZADO</option>
                <option>REALIZADO</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-2">Hepatite C</label>
              <select 
                value={formData.clinicalData?.gestante?.hepatiteC || 'NÃO REALIZADO'}
                onChange={e => setFormData(prev => ({
                  ...prev, 
                  clinicalData: { 
                    ...prev.clinicalData, 
                    gestante: { ...(prev.clinicalData?.gestante || {}), hepatiteC: e.target.value } 
                  }
                }))}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm"
              >
                <option>NÃO REALIZADO</option>
                <option>REALIZADO</option>
              </select>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 border-t border-slate-100 pt-6 mt-4">
          <h4 className="text-xs font-bold uppercase text-slate-400 mb-4 flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Vacinas
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-2">dTpa Aplicada?</label>
              <select 
                value={formData.clinicalData?.gestante?.dtpa || 'Não'}
                onChange={e => setFormData(prev => ({
                  ...prev, 
                  clinicalData: { 
                    ...prev.clinicalData, 
                    gestante: { ...(prev.clinicalData?.gestante || {}), dtpa: e.target.value } 
                  }
                }))}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm"
              >
                <option>Não</option>
                <option>Sim</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:col-span-2">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 mb-2">Consulta Puerpério</label>
            <input 
              type="date" 
              value={formData.clinicalData?.gestante?.puerperioConsulta || ''}
              onChange={e => setFormData(prev => ({
                ...prev, 
                clinicalData: { 
                  ...prev.clinicalData, 
                  gestante: { ...(prev.clinicalData?.gestante || {}), puerperioConsulta: e.target.value } 
                }
              }))}
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm text-on-surface"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 mb-2">Visita ACS Puerpério</label>
            <input 
              type="date" 
              value={formData.clinicalData?.gestante?.puerperioVisita || ''}
              onChange={e => setFormData(prev => ({
                ...prev, 
                clinicalData: { 
                  ...prev.clinicalData, 
                  gestante: { ...(prev.clinicalData?.gestante || {}), puerperioVisita: e.target.value } 
                }
              }))}
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm text-on-surface"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 mb-2">Saúde Bucal</label>
            <input 
              type="date" 
              value={formData.clinicalData?.gestante?.saudeBucal || ''}
              onChange={e => setFormData(prev => ({
                ...prev, 
                clinicalData: { 
                  ...prev.clinicalData, 
                  gestante: { ...(prev.clinicalData?.gestante || {}), saudeBucal: e.target.value } 
                }
              }))}
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm text-on-surface"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
