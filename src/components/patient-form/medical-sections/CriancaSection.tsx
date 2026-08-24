import React, { useState } from 'react';
import { 
  Smile, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Baby, 
  Clock, 
  XCircle,
  Syringe,
  ShieldCheck,
  Check,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { calculateAge, VACCINE_SCHEDULE } from '../../../lib/dateUtils';

interface CriancaSectionProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  visibleSchedule: any[];
  addDateToList: (category: string, list: string) => void;
  removeDateFromList: (category: string, list: string, index: number) => void;
  updateDateInList: (category: string, list: string, index: number, value: any) => void;
  isReadOnly?: boolean;
}

export function CriancaSection({ 
  formData, 
  setFormData, 
  visibleSchedule, 
  addDateToList, 
  removeDateFromList, 
  updateDateInList,
  isReadOnly
}: CriancaSectionProps) {
  if (!formData.categories.includes('Criança')) return null;

  const data = formData.clinicalData?.crianca || {};
  const [viewMode, setViewMode] = useState<'recommended' | 'all'>('recommended');

  const ageInMonths = formData.birthDate
    ? (() => {
        const birth = new Date(formData.birthDate);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - birth.getTime());
        return Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30.44));
      })()
    : 999;

  // Schedule to display based on toggle
  const scheduleToDisplay = viewMode === 'recommended' && visibleSchedule?.length > 0
    ? visibleSchedule
    : VACCINE_SCHEDULE;

  // Vaccine Statistics Calculation
  const totalRecommended = (visibleSchedule || []).reduce((acc, g) => acc + g.vaccines.length, 0);
  const takenRecommended = (visibleSchedule || []).reduce(
    (acc, g) => acc + g.vaccines.filter((v: any) => data.vacinas?.[v.id] === 'Sim').length,
    0
  );
  const pendingCount = Math.max(0, totalRecommended - takenRecommended);
  const percentComplete = totalRecommended > 0 
    ? Math.min(100, Math.round((takenRecommended / totalRecommended) * 100)) 
    : 100;

  const handleToggleVaccine = (vaccineId: string) => {
    if (isReadOnly) return;
    const isCurrentlyTaken = data.vacinas?.[vaccineId] === 'Sim';
    setFormData((prev: any) => ({
      ...prev,
      clinicalData: {
        ...prev.clinicalData,
        crianca: {
          ...(prev.clinicalData?.crianca || {}),
          vacinas: {
            ...(prev.clinicalData?.crianca?.vacinas || {}),
            [vaccineId]: isCurrentlyTaken ? 'Não' : 'Sim'
          }
        }
      }
    }));
  };

  const handleToggleGroup = (groupVaccines: { id: string }[]) => {
    if (isReadOnly) return;
    const allGroupTaken = groupVaccines.every(v => data.vacinas?.[v.id] === 'Sim');
    const newValues: Record<string, string> = {};
    groupVaccines.forEach(v => {
      newValues[v.id] = allGroupTaken ? 'Não' : 'Sim';
    });

    setFormData((prev: any) => ({
      ...prev,
      clinicalData: {
        ...prev.clinicalData,
        crianca: {
          ...(prev.clinicalData?.crianca || {}),
          vacinas: {
            ...(prev.clinicalData?.crianca?.vacinas || {}),
            ...newValues
          }
        }
      }
    }));
  };

  const handleMarkAllCurrentAge = () => {
    if (isReadOnly) return;
    const newValues: Record<string, string> = {};
    (visibleSchedule || []).forEach(group => {
      group.vaccines.forEach((v: any) => {
        newValues[v.id] = 'Sim';
      });
    });

    setFormData((prev: any) => ({
      ...prev,
      clinicalData: {
        ...prev.clinicalData,
        crianca: {
          ...(prev.clinicalData?.crianca || {}),
          vacinas: {
            ...(prev.clinicalData?.crianca?.vacinas || {}),
            ...newValues
          }
        }
      }
    }));
  };

  return (
    <section className="bg-bg-secondary dark:bg-slate-900 rounded-2xl p-4 sm:p-6 shadow-sm border-l-4 border-emerald-500 space-y-8 animate-in fade-in slide-in-from-top-2">
      
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-headline flex items-center gap-2">
          <Smile className="w-5 h-5" />
          Acompanhamento da Criança
        </h3>
      </div>
      
      {/* 1. Monitoring Section (Top) */}
      <div className="space-y-6">
        {/* Puericultura */}
        <div className="space-y-4">
          <div className="flex flex-col bg-bg-primary dark:bg-slate-800/40 p-4 rounded-xl border border-border dark:border-slate-800/80 gap-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Progresso de Puericultura</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-medium">
                  Meta mínima recomendada: 9 consultas até completar 24 meses de idade
                </span>
              </div>
              <span className="text-sm font-black text-emerald-500 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1 rounded-lg border border-emerald-100 dark:border-emerald-900/35">
                {Math.min(9, data.consultas?.filter((c: string) => c && c.trim() !== '').length || 0)} / 9
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-350"
                style={{ width: `${Math.min(100, ((data.consultas?.filter((c: string) => c && c.trim() !== '').length || 0) / 9) * 100)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between mt-2">
            <label className="block text-[10px] font-semibold uppercase text-text-muted">Consultas de Puericultura</label>
            {!isReadOnly && (
              <button 
                type="button"
                onClick={() => addDateToList('crianca', 'consultas')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar Consulta
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {data.consultas?.map((date: string, index: number) => (
              <div key={index} className="flex items-center gap-2 bg-bg-primary dark:bg-slate-800 p-2.5 rounded-xl border border-border dark:border-slate-700">
                <input 
                  type="date" 
                  disabled={isReadOnly}
                  value={date || ''}
                  onChange={e => updateDateInList('crianca', 'consultas', index, e.target.value)}
                  className="bg-transparent border-none text-[11px] font-bold text-text-primary dark:text-white w-full outline-none focus:ring-0" 
                />
                {!isReadOnly && (
                  <button 
                    type="button"
                    onClick={() => removeDateFromList('crianca', 'consultas', index)}
                    className="text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
            {(!data.consultas || data.consultas.length === 0) && (
              <p className="col-span-full text-[10px] text-text-muted italic py-2">Nenhuma consulta registrada.</p>
            )}
          </div>
        </div>

        {/* Visitas ACS */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between mt-2">
            <label className="block text-[10px] font-semibold uppercase text-text-muted">Visitas ACS (Crescimento & Desenvolvimento)</label>
            {!isReadOnly && (
              <button 
                type="button"
                onClick={() => addDateToList('crianca', 'visitasAcs')}
                className="px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar Visita
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {data.visitasAcs?.map((date: string, index: number) => (
              <div key={index} className="flex items-center gap-2 bg-bg-primary dark:bg-slate-800 p-2.5 rounded-xl border border-border dark:border-slate-700">
                <input 
                  type="date" 
                  disabled={isReadOnly}
                  value={date || ''}
                  onChange={e => updateDateInList('crianca', 'visitasAcs', index, e.target.value)}
                  className="bg-transparent border-none text-[11px] font-bold text-text-primary dark:text-white w-full outline-none focus:ring-0" 
                />
                {!isReadOnly && (
                  <button 
                    type="button"
                    onClick={() => removeDateFromList('crianca', 'visitasAcs', index)}
                    className="text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
            {(!data.visitasAcs || data.visitasAcs.length === 0) && (
              <p className="col-span-full text-[10px] text-text-muted italic py-2">Nenhuma visita de crescimento registrada.</p>
            )}
          </div>
        </div>
      </div>

      {/* Visitas Especiais de Bebê */}
      <div className="bg-amber-50/70 dark:bg-amber-950/20 rounded-2xl p-4 sm:p-5 border border-amber-200/80 dark:border-amber-900/40 space-y-3.5">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <Baby className="w-4 h-4" />
          <h4 className="text-[11px] font-black uppercase tracking-wider">Visitas de Acompanhamento do Bebê</h4>
        </div>
        <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 font-medium">
          Registre as datas das visitas nos primeiros 6 meses de vida ou marque como não realizada caso o período tenha decorrido sem visita.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Visita do 1º Mês */}
          <div className="space-y-2 bg-white dark:bg-slate-800/90 p-3.5 rounded-xl border border-border dark:border-slate-700/70 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {data.visita30diasNaoRealizada ? (
                  <XCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                ) : data.visita30dias ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                )}
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Visita do 1º Mês (30 dias)
                </label>
              </div>

              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => setFormData((prev: any) => {
                    const isCurrentlyNaoRealizada = Boolean(prev.clinicalData?.crianca?.visita30diasNaoRealizada);
                    return {
                      ...prev,
                      clinicalData: {
                        ...prev.clinicalData,
                        crianca: {
                          ...(prev.clinicalData?.crianca || {}),
                          visita30diasNaoRealizada: !isCurrentlyNaoRealizada,
                          ...(isCurrentlyNaoRealizada ? {} : { visita30dias: '' })
                        }
                      }
                    };
                  })}
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                    data.visita30diasNaoRealizada
                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                      : 'bg-amber-100/80 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-200/80 border border-amber-300/60 dark:border-amber-800/50'
                  }`}
                  title="Marcar que a visita não foi realizada para não alertar como atraso"
                >
                  {data.visita30diasNaoRealizada ? 'Desmarcar' : 'Não Realizada?'}
                </button>
              )}
            </div>

            {data.visita30diasNaoRealizada ? (
              <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800/60 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 italic">
                  Visita não realizada no período (Justificada)
                </span>
              </div>
            ) : (
              <div className={`flex items-center gap-2 rounded-lg px-3 py-2 border ${
                data.visita30dias
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40'
                  : 'bg-white dark:bg-slate-800 border-border dark:border-slate-700'
              }`}>
                <input
                  type="date"
                  disabled={isReadOnly}
                  value={data.visita30dias || ''}
                  onChange={e => setFormData((prev: any) => ({
                    ...prev,
                    clinicalData: {
                      ...prev.clinicalData,
                      crianca: {
                        ...(prev.clinicalData?.crianca || {}),
                        visita30dias: e.target.value,
                        visita30diasNaoRealizada: false
                      }
                    }
                  }))}
                  className="bg-transparent border-none text-xs font-bold text-text-primary dark:text-white w-full outline-none focus:ring-0 disabled:opacity-50"
                />
                {data.visita30dias && !isReadOnly && (
                  <button
                    type="button"
                    onClick={() => setFormData((prev: any) => ({
                      ...prev,
                      clinicalData: {
                        ...prev.clinicalData,
                        crianca: { ...(prev.clinicalData?.crianca || {}), visita30dias: '' }
                      }
                    }))}
                    className="text-slate-300 hover:text-red-500 transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Visita do 6º Mês */}
          <div className="space-y-2 bg-white dark:bg-slate-800/90 p-3.5 rounded-xl border border-border dark:border-slate-700/70 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {data.visita6mesesNaoRealizada ? (
                  <XCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                ) : data.visita6meses ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                )}
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Visita do 6º Mês
                </label>
              </div>

              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => setFormData((prev: any) => {
                    const isCurrentlyNaoRealizada = Boolean(prev.clinicalData?.crianca?.visita6mesesNaoRealizada);
                    return {
                      ...prev,
                      clinicalData: {
                        ...prev.clinicalData,
                        crianca: {
                          ...(prev.clinicalData?.crianca || {}),
                          visita6mesesNaoRealizada: !isCurrentlyNaoRealizada,
                          ...(isCurrentlyNaoRealizada ? {} : { visita6meses: '' })
                        }
                      }
                    };
                  })}
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                    data.visita6mesesNaoRealizada
                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                      : 'bg-amber-100/80 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-200/80 border border-amber-300/60 dark:border-amber-800/50'
                  }`}
                  title="Marcar que a visita não foi realizada para não alertar como atraso"
                >
                  {data.visita6mesesNaoRealizada ? 'Desmarcar' : 'Não Realizada?'}
                </button>
              )}
            </div>

            {data.visita6mesesNaoRealizada ? (
              <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800/60 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 italic">
                  Visita não realizada no período (Justificada)
                </span>
              </div>
            ) : (
              <div className={`flex items-center gap-2 rounded-lg px-3 py-2 border ${
                data.visita6meses
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40'
                  : 'bg-white dark:bg-slate-800 border-border dark:border-slate-700'
              }`}>
                <input
                  type="date"
                  disabled={isReadOnly}
                  value={data.visita6meses || ''}
                  onChange={e => setFormData((prev: any) => ({
                    ...prev,
                    clinicalData: {
                      ...prev.clinicalData,
                      crianca: {
                        ...(prev.clinicalData?.crianca || {}),
                        visita6meses: e.target.value,
                        visita6mesesNaoRealizada: false
                      }
                    }
                  }))}
                  className="bg-transparent border-none text-xs font-bold text-text-primary dark:text-white w-full outline-none focus:ring-0 disabled:opacity-50"
                />
                {data.visita6meses && !isReadOnly && (
                  <button
                    type="button"
                    onClick={() => setFormData((prev: any) => ({
                      ...prev,
                      clinicalData: {
                        ...prev.clinicalData,
                        crianca: { ...(prev.clinicalData?.crianca || {}), visita6meses: '' }
                      }
                    }))}
                    className="text-slate-300 hover:text-red-500 transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Vaccine Section: CARTEIRINHA DE VACINAÇÃO INFANTIL */}
      <div className="space-y-4 pt-2">
        {/* Carteirinha Card Banner */}
        <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 rounded-2xl p-4 sm:p-5 text-white shadow-md space-y-4 border border-teal-500/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-inner">
                <Syringe className="w-5 h-5 text-teal-100" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm sm:text-base font-black tracking-tight uppercase font-headline">
                    Carteirinha de Vacinação
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-teal-100 text-[9px] font-black uppercase tracking-wider">
                    SUS
                  </span>
                </div>
                <p className="text-[11px] text-teal-100/90 font-medium">
                  {formData.birthDate ? `Criança com ${calculateAge(formData.birthDate)}` : 'Calendário Básico Infantil'}
                </p>
              </div>
            </div>

            {/* View Mode Pills & Quick Action */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="bg-black/20 backdrop-blur-md p-1 rounded-xl flex items-center gap-1 border border-white/15 text-[10px] font-extrabold">
                <button
                  type="button"
                  onClick={() => setViewMode('recommended')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'recommended'
                      ? 'bg-white text-teal-900 shadow-xs'
                      : 'text-teal-100 hover:text-white'
                  }`}
                >
                  Idade Atual
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'all'
                      ? 'bg-white text-teal-900 shadow-xs'
                      : 'text-teal-100 hover:text-white'
                  }`}
                >
                  Completa (0-15m)
                </button>
              </div>

              {!isReadOnly && totalRecommended > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllCurrentAge}
                  className="px-3 py-1.5 bg-white/15 hover:bg-white/25 active:scale-95 text-white rounded-xl text-[10px] font-black uppercase tracking-wider border border-white/25 transition-all cursor-pointer flex items-center gap-1"
                  title="Marcar todas as vacinas da idade atual como aplicadas"
                >
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  Marcar Todas
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar & Status Pill */}
          <div className="bg-black/15 backdrop-blur-sm p-3 rounded-xl border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs font-extrabold text-teal-100">
              <span className="flex items-center gap-1.5">
                {percentComplete === 100 ? (
                  <span className="inline-flex items-center gap-1 text-emerald-300 text-[11px] font-black uppercase">
                    <ShieldCheck className="w-4 h-4" />
                    Vacinação 100% em dia
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-200 text-[11px] font-black uppercase">
                    <AlertCircle className="w-4 h-4" />
                    {pendingCount} dose{pendingCount !== 1 ? 's' : ''} pendente{pendingCount !== 1 ? 's' : ''} até a idade
                  </span>
                )}
              </span>
              <span className="font-mono text-white text-[11px] font-black">
                {takenRecommended} / {totalRecommended} doses ({percentComplete}%)
              </span>
            </div>
            
            <div className="w-full bg-black/30 h-2 rounded-full overflow-hidden p-0.5">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  percentComplete === 100 ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-amber-300 shadow-sm shadow-amber-300/50'
                }`}
                style={{ width: `${percentComplete}%` }}
              />
            </div>
          </div>
        </div>

        {/* Vaccine Groups Grid */}
        <div className="space-y-4">
          {scheduleToDisplay?.length > 0 ? (
            scheduleToDisplay.map((group, groupIdx) => {
              const allTaken = group.vaccines.every((v: any) => data.vacinas?.[v.id] === 'Sim');
              const groupTakenCount = group.vaccines.filter((v: any) => data.vacinas?.[v.id] === 'Sim').length;

              return (
                <div 
                  key={groupIdx} 
                  className="bg-bg-primary dark:bg-slate-800/50 rounded-2xl border border-border dark:border-slate-800 overflow-hidden shadow-xs space-y-3 p-4"
                >
                  {/* Group Header */}
                  <div className="flex items-center justify-between border-b border-border/60 dark:border-slate-700/60 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                      <h5 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                        {group.label}
                      </h5>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                        allTaken 
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' 
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        {groupTakenCount}/{group.vaccines.length} aplicadas
                      </span>
                    </div>

                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => handleToggleGroup(group.vaccines)}
                        className="text-[10px] font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                      >
                        {allTaken ? 'Desmarcar grupo' : 'Marcar grupo'}
                      </button>
                    )}
                  </div>

                  {/* Cards de Vacina estilo Selo de Carteirinha */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {group.vaccines.map((v: any) => {
                      const isTaken = data.vacinas?.[v.id] === 'Sim';

                      return (
                        <div
                          key={v.id}
                          onClick={() => handleToggleVaccine(v.id)}
                          className={`relative p-3 rounded-xl border transition-all select-none flex flex-col justify-between gap-2.5 ${
                            isReadOnly ? 'cursor-default' : 'cursor-pointer hover:scale-[1.01] active:scale-[0.99]'
                          } ${
                            isTaken
                              ? 'bg-gradient-to-br from-emerald-50 to-teal-50/70 dark:from-emerald-950/40 dark:to-teal-950/20 border-emerald-300 dark:border-emerald-800/80 shadow-xs ring-1 ring-emerald-400/20'
                              : 'bg-white dark:bg-slate-800/90 border-border dark:border-slate-700/80 hover:border-teal-400/60 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[11px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight leading-tight line-clamp-2">
                              {v.label}
                            </span>
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-transform ${
                              isTaken 
                                ? 'bg-emerald-600 text-white shadow-xs' 
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                            }`}>
                              {isTaken ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Syringe className="w-3 h-3" />}
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1.5 border-t border-border/40 text-[9px] font-extrabold">
                            <span className="text-text-muted">{group.label}</span>
                            <span className={`uppercase tracking-wider px-1.5 py-0.5 rounded ${
                              isTaken
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                : 'bg-slate-100 dark:bg-slate-700/70 text-slate-500 dark:text-slate-400'
                            }`}>
                              {isTaken ? '✓ Aplicada' : 'Pendente'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-bg-primary dark:bg-slate-800/30 rounded-2xl p-8 border border-dashed border-border dark:border-slate-800 text-center space-y-2">
              <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="text-xs font-bold text-text-primary">
                Nenhum grupo de vacinas pendente para esta idade ({formData.birthDate ? calculateAge(formData.birthDate) : 'N/A'}).
              </p>
              <button
                type="button"
                onClick={() => setViewMode('all')}
                className="text-xs font-extrabold text-teal-600 dark:text-teal-400 hover:underline"
              >
                Clique aqui para ver a Carteirinha Completa (0 a 15 meses)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Anotações Gerais */}
      <div className="space-y-2 pt-4 border-t border-border dark:border-slate-800">
        <label className="block text-[10px] font-bold uppercase text-text-muted tracking-wider">Anotações Gerais da Criança</label>
        <textarea 
          disabled={isReadOnly}
          value={data.notes || ''}
          onChange={e => setFormData((prev: any) => ({
            ...prev,
            clinicalData: {
              ...prev.clinicalData,
              crianca: { ...(prev.clinicalData?.crianca || {}), notes: e.target.value }
            }
          }))}
          rows={3}
          className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-700 rounded-xl p-3.5 text-xs text-text-primary font-medium min-h-[90px] disabled:opacity-50 shadow-inner"
          placeholder="Descreva observações de desenvolvimento, alergias ou condutas específicas..."
        />
      </div>
    </section>
  );
}
