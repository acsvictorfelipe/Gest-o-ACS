import React from 'react';
import { Calendar, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../../../lib/dateUtils';

interface VisitasHistoricoSectionProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  id: string | undefined;
  addDateToList: (category: string, list: string) => void;
  removeDateFromList: (category: string, list: string, index: number) => void;
  updateDateInList: (category: string, list: string, index: number, value: any) => void;
}

export function VisitasHistoricoSection({ 
  formData, 
  setFormData, 
  id, 
  addDateToList, 
  removeDateFromList, 
  updateDateInList 
}: VisitasHistoricoSectionProps) {
  const navigate = useNavigate();

  return (
    <section className="bg-bg-secondary dark:bg-slate-900 rounded-xl p-6 border border-border dark:border-slate-800 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary">
          <Calendar className="w-4 h-4" />
          <h3 className="text-sm font-bold uppercase tracking-tight">Histórico de Visitas</h3>
        </div>
        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={() => addDateToList('root', 'visitasGerais')}
            className="px-3 py-1.5 bg-primary/5 text-primary rounded-lg text-[10px] font-bold uppercase transition-all tracking-tight"
          >
            + Visita Antiga
          </button>
          {id && (
            <button 
              type="button"
              onClick={() => navigate('/historico', { state: { search: formData.cns } })}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-[10px] font-bold uppercase transition-all tracking-tight"
            >
              Ver Tudo
            </button>
          )}
        </div>
      </div>

      {/* Resumo da Visita Atual */}
      {formData.visitDate && (
        <div className="p-4 bg-primary/5 rounded-lg border border-primary/10 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary">Anotações da Visita: {formatDate(formData.visitDate)}</h4>
          </div>
          <textarea 
            value={formData.visitSummary || ''}
            onChange={e => setFormData({...formData, visitSummary: e.target.value})}
            className="w-full bg-bg-secondary dark:bg-slate-800 border border-border dark:border-slate-800 rounded-lg p-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 min-h-[80px]" 
            placeholder="O que aconteceu hoje?"
          />
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {formData.clinicalData.visitasGerais?.map((visit: any, index: number) => (
          <div key={index} className="p-4 bg-bg-primary dark:bg-slate-800/50 rounded-lg border border-border dark:border-slate-800 relative group">
            <div className="flex items-center justify-between mb-3">
              <input 
                type="date" 
                value={visit.date || ''}
                onChange={e => updateDateInList('root', 'visitasGerais', index, { ...visit, date: e.target.value })}
                className="bg-bg-secondary dark:bg-slate-900 px-2 py-1 border border-border dark:border-slate-800 rounded text-xs font-bold text-text-primary dark:text-white" 
              />
              <button 
                type="button"
                onClick={() => removeDateFromList('root', 'visitasGerais', index)}
                className="text-slate-300 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <textarea 
              value={visit.summary || ''}
              onChange={e => updateDateInList('root', 'visitasGerais', index, { ...visit, summary: e.target.value })}
              className="w-full bg-bg-secondary dark:bg-slate-800 border border-border dark:border-slate-800 rounded-lg p-2 text-xs font-medium focus:ring-2 focus:ring-primary/20 min-h-[60px]" 
            />
          </div>
        ))}
      </div>
    </section>
  );
}

