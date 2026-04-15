import React from 'react';
import { Activity, HeartPulse } from 'lucide-react';
import { PatientFormData } from '../../types/patient';
import { calculateNextVisit, getVisitAlert } from '../../lib/dateUtils';

interface Props {
  formData: PatientFormData;
  setFormData: React.Dispatch<React.SetStateAction<PatientFormData>>;
}

export function ChronicSection({ formData, setFormData }: Props) {
  // Funções extraídas do hook para cálculo local das visitas ACS
  const renderAcsVisits = (subKey: 'diabetesData' | 'hipertensaoData') => {
    const data = formData.clinicalData?.chronic?.[subKey] || {};
    
    const nextVisit = calculateNextVisit(data.visitaAcs1, 180);
    const alert = getVisitAlert(nextVisit);

    const updateVisits = (v1: string, v2: string) => {
      setFormData(prev => ({
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
        <label className="block text-[10px] font-bold uppercase text-slate-400">Visita ACS (Mín. 2/ano)</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[8px] font-bold text-slate-500 uppercase mb-1">1ª Visita</label>
            <input 
              type="date" 
              value={data.visitaAcs1 || ''}
              onChange={e => {
                const v1 = e.target.value;
                const v2 = calculateNextVisit(v1, 180);
                updateVisits(v1, v2);
              }}
              className="w-full bg-white dark:bg-slate-800 border-none rounded-xl p-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-[8px] font-bold text-slate-500 uppercase mb-1">2ª Visita (Auto +180 dias)</label>
            <input 
              type="date" 
              value={data.visitaAcs2 || ''}
              onChange={e => updateVisits(data.visitaAcs1, e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border-none rounded-xl p-3 text-sm"
            />
          </div>
        </div>
        {alert && (
          <div className={`p-3 rounded-xl flex items-center gap-3 text-[10px] font-bold uppercase ${
            alert.type === 'error' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'
          }`}>
            <Activity className="w-4 h-4" />
            {alert.message}
          </div>
        )}
      </div>
    );
  };

  const data = formData.clinicalData?.chronic || {};

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-slate-800">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-1.5 h-8 bg-primary rounded-full"></div>
        <h3 className="text-xl font-bold text-primary font-headline">Doenças Crônicas</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Possui Diabetes?</label>
          <select 
            value={data.diabetes || 'Não'}
            onChange={e => setFormData(prev => ({
              ...prev,
              clinicalData: {
                ...prev.clinicalData,
                chronic: { ...(prev.clinicalData?.chronic || {}), diabetes: e.target.value }
              }
            }))}
            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20"
          >
            <option>Não</option>
            <option>Sim</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Possui Hipertensão?</label>
          <select 
            value={data.hipertensao || 'Não'}
            onChange={e => setFormData(prev => ({
              ...prev,
              clinicalData: {
                ...prev.clinicalData,
                chronic: { ...(prev.clinicalData?.chronic || {}), hipertensao: e.target.value }
              }
            }))}
            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20"
          >
            <option>Não</option>
            <option>Sim</option>
          </select>
        </div>
      </div>

      {data.diabetes === 'Sim' && (
        <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 animate-in fade-in slide-in-from-top-2">
          <h4 className="col-span-full text-xs font-bold uppercase text-blue-600 dark:text-blue-400 flex items-center gap-2">
            <Activity className="w-3 h-3" />
            Submenu: Diabetes
          </h4>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Avaliação dos Pés</label>
            <select 
              value={data.diabetesData?.avaliacaoPes || 'Não'}
              onChange={e => setFormData(prev => ({
                ...prev, 
                clinicalData: { 
                  ...prev.clinicalData, 
                  chronic: { 
                    ...(prev.clinicalData?.chronic || {}), 
                    diabetesData: { ...(prev.clinicalData?.chronic?.diabetesData || {}), avaliacaoPes: e.target.value } 
                  } 
                }
              }))}
              className="w-full bg-white dark:bg-slate-800 border-none rounded-xl p-3 text-sm"
            >
              <option>Não</option>
              <option>Sim</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Hemoglobina Glicada</label>
            <select 
              value={data.diabetesData?.hemoglobinaGlicada || 'Não'}
              onChange={e => setFormData(prev => ({
                ...prev, 
                clinicalData: { 
                  ...prev.clinicalData, 
                  chronic: { 
                    ...(prev.clinicalData?.chronic || {}), 
                    diabetesData: { ...(prev.clinicalData?.chronic?.diabetesData || {}), hemoglobinaGlicada: e.target.value } 
                  } 
                }
              }))}
              className="w-full bg-white dark:bg-slate-800 border-none rounded-xl p-3 text-sm"
            >
              <option>Não</option>
              <option>Sim</option>
            </select>
          </div>
          {renderAcsVisits('diabetesData')}
        </div>
      )}

      {data.hipertensao === 'Sim' && (
        <div className="col-span-full grid grid-cols-1 md:grid-cols-1 gap-4 mt-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800 animate-in fade-in slide-in-from-top-2">
          <h4 className="col-span-full text-xs font-bold uppercase text-red-600 dark:text-red-400 flex items-center gap-2">
            <HeartPulse className="w-3 h-3" />
            Submenu: Hipertensão
          </h4>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-2">Consultas nos últimos 6 meses?</label>
            <select 
              value={data.hipertensaoData?.consultas6Meses || 'Não'}
              onChange={e => setFormData(prev => ({
                ...prev, 
                clinicalData: { 
                  ...prev.clinicalData, 
                  chronic: { 
                    ...(prev.clinicalData?.chronic || {}), 
                    hipertensaoData: { ...(prev.clinicalData?.chronic?.hipertensaoData || {}), consultas6Meses: e.target.value } 
                  } 
                }
              }))}
              className="w-full bg-white dark:bg-slate-800 border-none rounded-xl p-3 text-sm"
            >
              <option>Não</option>
              <option>Sim</option>
            </select>
          </div>
          {renderAcsVisits('hipertensaoData')}
        </div>
      )}
    </section>
  );
}
