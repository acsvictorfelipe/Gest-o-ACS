import React from 'react';
import { Sparkles, X, Plus } from 'lucide-react';

interface VisitaSectionProps {
  formData: any;
  setFormData: (updater: any) => void;
  isReadOnly?: boolean;
}

export function VisitaSection({ formData, setFormData, isReadOnly }: VisitaSectionProps) {
  const handleStartTodayVisit = () => {
    setFormData((prev: any) => ({
      ...prev,
      visitDate: new Date().toISOString().split('T')[0],
      visitType: 'Rotina'
    }));
  };

  const handleCancelTodayVisit = () => {
    setFormData((prev: any) => ({
      ...prev,
      visitDate: '',
      visitType: 'Rotina',
      visitSummary: ''
    }));
  };

  return (
    <div className="space-y-4">
      {!isReadOnly && !formData.visitDate && (
        <div className="flex justify-end">
          <button 
            type="button"
            onClick={handleStartTodayVisit}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-bold uppercase transition-all tracking-tight shadow-sm"
          >
            <Plus className="w-4 h-4" />
            + Registrar Visita ACS Realizada Hoje
          </button>
        </div>
      )}

      {formData.visitDate && (
        <div className="p-5 bg-primary/5 dark:bg-primary/10 rounded-xl border border-primary/20 space-y-4 animate-in fade-in duration-300" id="secao-visita">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Registrar Visita ACS</h4>
            </div>
            <button
              type="button"
              onClick={handleCancelTodayVisit}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Data da Visita</label>
              <input
                type="date"
                disabled={isReadOnly}
                value={formData.visitDate}
                onChange={e => setFormData((prev: any) => ({ ...prev, visitDate: e.target.value }))}
                className="w-full bg-white dark:bg-slate-800 border border-border dark:border-slate-800 rounded-lg px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-primary/20 text-slate-800 dark:text-white mt-1"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Tipo de Visita</label>
              <select
                disabled={isReadOnly}
                value={formData.visitType}
                onChange={e => setFormData((prev: any) => ({ ...prev, visitType: e.target.value }))}
                className="w-full bg-white dark:bg-slate-800 border border-border dark:border-slate-800 rounded-lg px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-primary/20 text-slate-800 dark:text-white mt-1"
              >
                <option value="Rotina">Rotina</option>
                <option value="Acompanhamento">Acompanhamento</option>
                <option value="Urgência">Urgência</option>
                <option value="Pós-Parto">Pós-Parto</option>
                <option value="Recém-Nascido">Recém-Nascido</option>
                <option value="Ausente">Ausente (Cidadão Ausente)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Anotações da Visita / Conduta Clínica</label>
            <textarea 
              value={formData.visitSummary || ''}
              onChange={e => setFormData((prev: any) => ({ ...prev, visitSummary: e.target.value }))}
              className="w-full bg-white dark:bg-slate-800 border border-border dark:border-slate-800 rounded-lg p-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 min-h-[100px] shadow-inner mt-1" 
              placeholder="Descreva brevemente o estado de saúde do cidadão, queixas, vacinas aplicadas ou orientações fornecidas."
            />
          </div>
        </div>
      )}
    </div>
  );
}
