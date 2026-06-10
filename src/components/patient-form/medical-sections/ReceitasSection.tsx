import React from 'react';
import { Pill, Trash2, Plus, Calendar } from 'lucide-react';
import { formatDate } from '../../../lib/dateUtils';

interface ReceitasSectionProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  addDateToList: (category: string, list: string) => void;
  removeDateFromList: (category: string, list: string, index: number) => void;
  updateDateInList: (category: string, list: string, index: number, value: any) => void;
}

export function ReceitasSection({
  formData,
  setFormData,
  addDateToList,
  removeDateFromList,
  updateDateInList
}: ReceitasSectionProps) {
  const receitas = formData.clinicalData?.receitas || [];

  return (
    <section className="bg-bg-secondary dark:bg-slate-900 rounded-xl p-6 border border-border dark:border-slate-800 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary">
          <Pill className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <h3 className="text-sm font-bold uppercase tracking-tight">Receitas e Medicamentos de Uso Contínuo</h3>
        </div>
        <button
          type="button"
          onClick={() => addDateToList('root', 'receitas')}
          className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[10px] font-bold uppercase transition-all tracking-tight flex items-center gap-1 shadow-sm"
        >
          <Plus className="w-3 h-3" />
          Adicionar Receita
        </button>
      </div>

      {receitas.length === 0 ? (
        <div className="text-center py-6 text-text-muted text-xs border border-dashed border-border dark:border-slate-850 rounded-xl">
          Nenhuma receita ou medicamento cadastrado para este cidadão.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {receitas.map((rec: any, index: number) => {
            const isExpired = rec.dataVencimento ? new Date(rec.dataVencimento) < new Date() : false;

            return (
              <div 
                key={index} 
                className={`p-4 rounded-xl border relative transition-all duration-200 group ${
                  isExpired 
                    ? 'bg-red-50/50 dark:bg-red-950/10 border-red-200 dark:border-red-900/40' 
                    : 'bg-bg-primary dark:bg-slate-800/50 border-border dark:border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${isExpired ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400'}`}>
                      <Pill className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Receita #{index + 1}</span>
                    {isExpired && (
                      <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 text-[8px] font-bold uppercase rounded-full">
                        Vencida
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDateFromList('root', 'receitas', index)}
                    className="p-1 text-slate-350 hover:text-red-500 rounded transition-colors"
                    title="Excluir receita"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold uppercase tracking-wider text-text-muted">Data da Receita</label>
                      <input
                        type="date"
                        value={rec.dataEmissao || ''}
                        onChange={e => {
                          const newEmissao = e.target.value;
                          const days = rec.validade || '30';
                          const calculateVencimento = (emissao: string, dias: string | number) => {
                            if (!emissao || !dias) return '';
                            const d = new Date(emissao + 'T00:00:00');
                            if (isNaN(d.getTime())) return '';
                            d.setDate(d.getDate() + Number(dias));
                            return d.toISOString().split('T')[0];
                          };
                          const newVencimento = calculateVencimento(newEmissao, days);
                          updateDateInList('root', 'receitas', index, { 
                            ...rec, 
                            dataEmissao: newEmissao, 
                            validade: days,
                            dataVencimento: newVencimento 
                          });
                        }}
                        className="w-full bg-bg-secondary dark:bg-slate-900 border border-border dark:border-slate-800 rounded-lg py-1.5 px-3 text-xs font-semibold focus:ring-2 focus:ring-primary/20 text-text-primary dark:text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold uppercase tracking-wider text-text-muted">Validade</label>
                      <select
                        value={rec.validade || '30'}
                        onChange={e => {
                          const newDays = e.target.value;
                          const calculateVencimento = (emissao: string, dias: string | number) => {
                            if (!emissao || !dias) return '';
                            const d = new Date(emissao + 'T00:00:00');
                            if (isNaN(d.getTime())) return '';
                            d.setDate(d.getDate() + Number(dias));
                            return d.toISOString().split('T')[0];
                          };
                          const newVencimento = calculateVencimento(rec.dataEmissao || '', newDays);
                          updateDateInList('root', 'receitas', index, { 
                            ...rec, 
                            validade: newDays,
                            dataVencimento: newVencimento 
                          });
                        }}
                        className="w-full bg-bg-secondary dark:bg-slate-900 border border-border dark:border-slate-800 rounded-lg py-1.5 px-3 text-xs font-bold uppercase focus:ring-2 focus:ring-primary/20 text-text-primary dark:text-white"
                      >
                        <option value="30">30 Dias</option>
                        <option value="60">60 Dias</option>
                        <option value="90">90 Dias</option>
                        <option value="180">180 Dias</option>
                      </select>
                    </div>
                  </div>

                  {rec.dataVencimento && (
                    <div className={`p-2.5 rounded-lg text-center flex items-center justify-center gap-2 border ${
                      isExpired 
                        ? 'bg-red-100/40 dark:bg-red-950/20 border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400' 
                        : 'bg-teal-50/50 dark:bg-teal-905/10 border-teal-100/80 dark:border-teal-900/35 text-teal-700 dark:text-teal-400'
                    }`}>
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-wide">
                        Vencimento: {formatDate(rec.dataVencimento)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
