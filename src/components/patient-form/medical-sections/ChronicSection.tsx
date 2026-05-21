import React from 'react';
import { Activity, HeartPulse } from 'lucide-react';
import { parseDate } from '../../../lib/dateUtils';

interface ChronicSectionProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  isReadOnly?: boolean;
}

export function ChronicSection({ formData, setFormData, isReadOnly }: ChronicSectionProps) {
  const hasChronicCategory = formData.categories.some((c: string) => 
    ['AcamadoDomiciliado', 'Gestante', 'Adulto', 'Idoso', 'Hipertenso', 'Diabético'].includes(c)
  );

  if (!hasChronicCategory) return null;

  const calculateNextVisit = (dateStr: string, days: number) => {
    if (!dateStr) return '';
    const date = parseDate(dateStr);
    if (!date) return '';
    const year = date.getFullYear();
    date.setDate(date.getDate() + days);
    
    if (date.getFullYear() > year) {
      return `${year}-12-31`;
    }
    
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getVisitAlert = (nextDateStr: string) => {
    if (!nextDateStr) return null;
    const nextDate = parseDate(nextDateStr);
    if (!nextDate) return null;
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    
    const diffTime = nextDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { type: 'error', message: `Atrasada há ${Math.abs(diffDays)} dias!` };
    if (diffDays <= 15) return { type: 'warning', message: `Próxima visita em ${diffDays} dias.` };
    return null;
  };

  const renderAcsVisits = (subKey: 'diabetesData' | 'hipertensaoData') => {
    const data = formData.clinicalData?.chronic?.[subKey] || {};
    const nextVisit = calculateNextVisit(data.visitaAcs1, 180);
    const alert = getVisitAlert(nextVisit);

    const updateVisits = (v1: string, v2: string) => {
      setFormData((prev: any) => ({
        ...prev,
        clinicalData: {
          ...prev.clinicalData,
          chronic: {
            ...(prev.clinicalData?.chronic || {}),
            [subKey]: { ...(prev.clinicalData?.chronic?.[subKey] || {}), visitaAcs1: v1, visitaAcs2: v2 }
          }
        }
      }));
    };

    return (
      <div className="col-span-full space-y-4 mt-2">
        <label className="block text-[10px] font-semibold uppercase text-text-muted">Visita ACS (Mín. 2/ano)</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[8px] font-semibold text-text-muted uppercase mb-1">1ª Visita</label>
            <input 
              type="date" 
              value={data.visitaAcs1 || ''}
              onChange={e => {
                const v1 = e.target.value;
                const v2 = calculateNextVisit(v1, 180);
                updateVisits(v1, v2);
              }}
              className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-700 rounded-xl p-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-[8px] font-semibold text-text-muted uppercase mb-1">2ª Visita (Auto +180 dias)</label>
            <input 
              type="date" 
              value={data.visitaAcs2 || ''}
              onChange={e => updateVisits(data.visitaAcs1, e.target.value)}
              className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-700 rounded-xl p-3 text-sm"
            />
          </div>
        </div>
        {alert && (
          <div className={`p-3 rounded-xl flex items-center gap-3 text-[10px] font-semibold uppercase ${
            alert.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
          }`}>
            <Activity className="w-4 h-4" />
            {alert.message}
          </div>
        )}
      </div>
    );
  };

  const renderDiabetesFields = () => {
    const data = formData.clinicalData?.chronic || {};
    if (data.diabetes !== 'Sim') return null;

    return (
      <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 animate-in fade-in slide-in-from-top-2">
        <h4 className="col-span-full text-xs font-semibold uppercase text-blue-600 dark:text-blue-400 flex items-center gap-2">
          <Activity className="w-3 h-3" />
          Submenu: Diabetes
        </h4>
        <div>
          <label className="block text-[10px] font-semibold uppercase text-text-muted mb-2">Avaliação dos Pés</label>
          <select 
            value={data.diabetesData?.avaliacaoPes || 'Não'}
            onChange={e => setFormData((prev: any) => ({
              ...prev, 
              clinicalData: { 
                ...prev.clinicalData, 
                chronic: { 
                  ...(prev.clinicalData?.chronic || {}), 
                  diabetesData: { ...(prev.clinicalData?.chronic?.diabetesData || {}), avaliacaoPes: e.target.value } 
                } 
              }
            }))}
            className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-700 rounded-xl p-3 text-sm"
          >
            <option>Não</option>
            <option>Sim</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase text-text-muted mb-2">Hemoglobina Glicada</label>
          <select 
            value={data.diabetesData?.hemoglobinaGlicada || 'Não'}
            onChange={e => setFormData((prev: any) => ({
              ...prev, 
              clinicalData: { 
                ...prev.clinicalData, 
                chronic: { 
                  ...(prev.clinicalData?.chronic || {}), 
                  diabetesData: { ...(prev.clinicalData?.chronic?.diabetesData || {}), hemoglobinaGlicada: e.target.value } 
                } 
              }
            }))}
            className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-700 rounded-xl p-3 text-sm"
          >
            <option>Não</option>
            <option>Sim</option>
          </select>
        </div>
        {renderAcsVisits('diabetesData')}
      </div>
    );
  };

  const renderHipertensaoFields = () => {
    const data = formData.clinicalData?.chronic || {};
    if (data.hipertensao !== 'Sim') return null;

    return (
      <div className="col-span-full grid grid-cols-1 md:grid-cols-1 gap-4 mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800 animate-in fade-in slide-in-from-top-2">
        <h4 className="col-span-full text-xs font-semibold uppercase text-red-600 dark:text-red-400 flex items-center gap-2">
          <HeartPulse className="w-3 h-3" />
          Submenu: Hipertensão
        </h4>
        <div>
          <label className="block text-[10px] font-semibold uppercase text-text-muted mb-2">Consultas nos últimos 6 meses?</label>
          <select 
            value={data.hipertensaoData?.consultas6Meses || 'Não'}
            onChange={e => setFormData((prev: any) => ({
              ...prev, 
              clinicalData: { 
                ...prev.clinicalData, 
                chronic: { 
                  ...(prev.clinicalData?.chronic || {}), 
                  hipertensaoData: { ...(prev.clinicalData?.chronic?.hipertensaoData || {}), consultas6Meses: e.target.value } 
                } 
              }
            }))}
            className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-700 rounded-xl p-3 text-sm"
          >
            <option>Não</option>
            <option>Sim</option>
          </select>
        </div>
        {renderAcsVisits('hipertensaoData')}
      </div>
    );
  };

  return (
    <section className="bg-bg-secondary dark:bg-slate-900 rounded-2xl p-8 shadow-sm border-l-4 border-indigo-500 mb-8 animate-in fade-in slide-in-from-top-2">
      <h3 className="text-xl font-semibold text-indigo-600 dark:text-indigo-400 mb-8 font-headline flex items-center gap-2">
        <Activity className="w-6 h-6" />
        Condições Crônicas
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-[10px] font-semibold uppercase text-text-muted mb-2">Diabetes?</label>
          <select 
            value={formData.clinicalData?.chronic?.diabetes || 'Não'}
            onChange={e => setFormData((prev: any) => ({
              ...prev, 
              clinicalData: { 
                ...prev.clinicalData, 
                chronic: { ...(prev.clinicalData?.chronic || {}), diabetes: e.target.value } 
              }
            }))}
            className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-700 rounded-xl p-3 text-sm"
          >
            <option>Não</option>
            <option>Sim</option>
          </select>
        </div>
        {renderDiabetesFields()}
        <div>
          <label className="block text-[10px] font-semibold uppercase text-text-muted mb-2">Hipertensão?</label>
          <select 
            value={formData.clinicalData?.chronic?.hipertensao || 'Não'}
            onChange={e => setFormData((prev: any) => ({
              ...prev, 
              clinicalData: { 
                ...prev.clinicalData, 
                chronic: { ...(prev.clinicalData?.chronic || {}), hipertensao: e.target.value } 
              }
            }))}
            className="w-full bg-bg-primary dark:bg-slate-800 border border-border dark:border-slate-700 rounded-xl p-3 text-sm"
          >
            <option>Não</option>
            <option>Sim</option>
          </select>
        </div>
        {renderHipertensaoFields()}
      </div>
    </section>
  );
}

