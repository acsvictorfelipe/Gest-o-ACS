import React from 'react';
import { Calendar, Plus, Trash2 } from 'lucide-react';
import { PatientFormData } from '../../types/patient';
import { formatDate } from '../../lib/dateUtils';
import { useNavigate } from 'react-router-dom';

interface Props {
  id?: string;
  formData: PatientFormData;
  setFormData: React.Dispatch<React.SetStateAction<PatientFormData>>;
}

export function VisitSection({ id, formData, setFormData }: Props) {
  const navigate = useNavigate();

  const addDateToList = () => {
    setFormData(prev => ({
      ...prev,
      clinicalData: {
        ...prev.clinicalData,
        visitasGerais: [...(prev.clinicalData.visitasGerais || []), { date: '', summary: '' }]
      }
    }));
  };

  const removeDateFromList = (index: number) => {
    setFormData(prev => ({
      ...prev,
      clinicalData: {
        ...prev.clinicalData,
        visitasGerais: prev.clinicalData.visitasGerais.filter((_, i) => i !== index)
      }
    }));
  };

  const updateDateInList = (index: number, value: any) => {
    setFormData(prev => {
      const newList = [...prev.clinicalData.visitasGerais];
      newList[index] = value;
      return {
        ...prev,
        clinicalData: {
          ...prev.clinicalData,
          visitasGerais: newList
        }
      };
    });
  };

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-slate-800">
      {/* Dados Atuais de Visita (Isolados do form array pra facilitar UI atual) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
        <div id="secao-visita" className="md:col-span-4">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Data da Visita</label>
          <input 
            type="date" 
            value={formData.visitDate || ''}
            onChange={e => setFormData(prev => ({...prev, visitDate: e.target.value}))}
            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20" 
          />
        </div>
        <div className="md:col-span-4">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Tipo de Visita</label>
          <select 
            value={formData.visitType}
            onChange={e => setFormData(prev => ({...prev, visitType: e.target.value}))}
            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20"
          >
            <option>Rotina</option>
            <option>Acompanhamento</option>
            <option>Urgência</option>
            <option>Pós-Parto</option>
            <option>Recém-Nascido</option>
          </select>
        </div>
        <div className="md:col-span-12">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Benefícios Sociais</label>
          <div className="flex flex-wrap gap-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
            {['Bolsa Família', 'LOAS', 'BPC', 'Outros'].map(benefit => (
              <label key={benefit} className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center">
                  <input 
                    type="checkbox"
                    checked={formData.clinicalData?.socialBenefits?.includes(benefit)}
                    onChange={e => {
                      const current = formData.clinicalData?.socialBenefits || [];
                      const next = e.target.checked 
                        ? [...current, benefit]
                        : current.filter(b => b !== benefit);
                      setFormData(prev => ({
                        ...prev,
                        clinicalData: { ...prev.clinicalData, socialBenefits: next }
                      }));
                    }}
                    className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary/20 transition-all cursor-pointer"
                  />
                </div>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400 group-hover:text-primary transition-colors">{benefit}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 border-t border-slate-100 dark:border-slate-800 pt-8">
        <div>
          <h3 className="text-lg font-bold text-primary font-headline flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Visitas Realizadas
          </h3>
          <p className="text-[10px] text-slate-400 mt-1">Histórico de visitas e ocorrências registradas.</p>
        </div>
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <button 
            type="button"
            onClick={addDateToList}
            className="flex items-center gap-2 px-4 py-2 bg-primary/10 dark:bg-primary/20 text-primary rounded-xl text-xs font-bold hover:bg-primary/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Adicionar Visita Antiga
          </button>
          {id && (
            <button 
              type="button"
              onClick={() => navigate('/historico', { state: { search: formData.cns } })}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              <Calendar className="w-4 h-4" />
              Ver Histórico Completo
            </button>
          )}
        </div>
      </div>

      {formData.visitDate && (
        <div className="mb-8 p-6 bg-primary/5 dark:bg-primary/10 rounded-2xl border border-primary/10 dark:border-primary/20 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <h4 className="text-xs font-bold uppercase tracking-widest text-primary">Resumo da Visita Atual ({formatDate(formData.visitDate)})</h4>
          </div>
          <textarea 
            value={formData.visitSummary || ''}
            onChange={e => setFormData(prev => ({...prev, visitSummary: e.target.value}))}
            className="w-full bg-white dark:bg-slate-800 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 min-h-[100px]" 
            placeholder="Descreva o que ocorreu nesta visita..."
          />
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {formData.clinicalData.visitasGerais?.map((visit, index) => (
          <div key={index} className="relative p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 group">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <input 
                  type="date" 
                  value={visit.date || ''}
                  onChange={e => updateDateInList(index, { ...visit, date: e.target.value })}
                  className="bg-transparent border-none p-0 text-sm font-bold text-on-surface focus:ring-0" 
                />
              </div>
              <button 
                type="button"
                onClick={() => removeDateFromList(index)}
                className="text-slate-300 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <textarea 
              value={visit.summary || ''}
              onChange={e => updateDateInList(index, { ...visit, summary: e.target.value })}
              className="w-full bg-white dark:bg-slate-800 border-none rounded-xl p-3 text-xs focus:ring-2 focus:ring-primary/20 min-h-[80px]" 
              placeholder="Ocorrência desta visita..."
            />
          </div>
        ))}
        {(!formData.clinicalData.visitasGerais || formData.clinicalData.visitasGerais.length === 0) && !formData.visitDate && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2rem]">
            <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-sm text-slate-400 font-medium italic">Nenhuma visita registrada ainda.</p>
          </div>
        )}
      </div>
    </section>
  );
}
