import React from 'react';
import { Award } from 'lucide-react';

interface PrevineTabProps {
  previneBrasilStats: any;
}

// Helper to determine indicator success color and tag
const getIndicatorStatus = (percentage: number, target: number) => {
  if (percentage >= target) return { label: 'Meta Atingida', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20', fill: '#10b981' };
  if (percentage >= target - 15) return { label: 'Próximo da Meta', color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20', fill: '#f59e0b' };
  return { label: 'Abaixo da Meta', color: 'text-red-500 dark:text-red-400 bg-red-500/10 border-red-500/20', fill: '#ef4444' };
};

export function PrevineTab({ previneBrasilStats }: PrevineTabProps) {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-teal-500/10 to-indigo-500/10 p-5 rounded-3xl border border-teal-500/10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-600 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-text-primary uppercase tracking-tight">Monitor Previne Brasil</h3>
            <p className="text-[10px] text-text-secondary font-medium">Indicadores calculados em tempo real de acordo com as fichas de atendimento.</p>
          </div>
        </div>
        <span className="text-[9px] font-extrabold bg-teal-600 text-white px-3 py-1 rounded-full uppercase tracking-wider">Metas do Quadrimestre</span>
      </div>

      {/* Indicators Ring Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.keys(previneBrasilStats).map((key) => {
          const item = (previneBrasilStats as any)[key];
          const status = getIndicatorStatus(item.pct, item.target);
          const strokeDash = 2 * Math.PI * 34; // Radius is 34
          const strokeOffset = strokeDash - (item.pct / 100) * strokeDash;

          return (
            <div key={key} className="bg-bg-secondary border border-border rounded-3xl p-5 flex items-start gap-5 shadow-sm hover:shadow-md transition-shadow">
              {/* Ring SVG container */}
              <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="40" cy="40" r="34" className="stroke-slate-100 dark:stroke-slate-800" strokeWidth="6" fill="transparent" />
                  <circle 
                    cx="40" 
                    cy="40" 
                    r="34" 
                    stroke={status.fill} 
                    strokeWidth="6" 
                    fill="transparent" 
                    strokeDasharray={strokeDash}
                    strokeDashoffset={strokeOffset}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[14px] font-black text-text-primary">{item.pct}%</span>
                </div>
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h4 className="text-[13px] font-black text-text-primary uppercase tracking-tight truncate max-w-[200px]">{item.label}</h4>
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${status.color}`}>
                    {status.label}
                  </span>
                </div>
                <p className="text-[9px] text-text-secondary leading-normal">{item.desc}</p>
                
                <div className="flex justify-between items-center text-[9px] font-extrabold uppercase mt-2 pt-2 border-t border-border/40">
                  <span className="text-text-muted">Amostra: {item.num}/{item.den}</span>
                  <span className="text-teal-600 dark:text-teal-400">Meta: &gt;={item.target}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
