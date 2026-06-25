import React from 'react';
import { Users, User, Activity, TrendingUp } from 'lucide-react';
import { getPatientLastVisitAt } from '../../lib/dateUtils';

interface EquipeTabProps {
  users: any[];
  patients: any[];
  acsPerformance: any[];
}

export function EquipeTab({ users, patients, acsPerformance }: EquipeTabProps) {
  return (
    <div className="space-y-6">
      {/* Quick stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-bg-secondary border border-border p-4 rounded-3xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-[20px] font-black text-text-primary leading-none">
              {users.filter(u => u.role === 'Agente').length}
            </h4>
            <p className="text-[9px] text-text-muted font-black uppercase mt-1 tracking-wider">Agentes Ativos</p>
          </div>
        </div>

        <div className="bg-bg-secondary border border-border p-4 rounded-3xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-[20px] font-black text-text-primary leading-none">{patients.length}</h4>
            <p className="text-[9px] text-text-muted font-black uppercase mt-1 tracking-wider">Cidadãos Totais</p>
          </div>
        </div>

        <div className="bg-bg-secondary border border-border p-4 rounded-3xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-[20px] font-black text-text-primary leading-none">
              {users.filter(u => u.role === 'Agente').length > 0 
                ? Math.round(patients.length / users.filter(u => u.role === 'Agente').length)
                : 0}
            </h4>
            <p className="text-[9px] text-text-muted font-black uppercase mt-1 tracking-wider">Pacientes / Agente</p>
          </div>
        </div>

        <div className="bg-bg-secondary border border-border p-4 rounded-3xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-[20px] font-black text-text-primary leading-none">
              {patients.length > 0 
                ? Math.round(((patients.length - patients.filter(p => {
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                    const realLastVisitStr = getPatientLastVisitAt(p);
                    return !realLastVisitStr || new Date(realLastVisitStr) < thirtyDaysAgo;
                  }).length) / patients.length) * 100)
                : 100}%
            </h4>
            <p className="text-[9px] text-text-muted font-black uppercase mt-1 tracking-wider">Eficiência de Cobertura</p>
          </div>
        </div>
      </div>

      {/* Performance Table */}
      <div className="bg-bg-secondary border border-border rounded-3xl p-5 shadow-sm">
        <h3 className="text-xs font-black text-text-primary uppercase tracking-wider mb-4">Relatório de Produtividade dos Agentes</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/60 text-[9px] text-text-muted font-black uppercase tracking-wider">
                <th className="pb-3 pl-2">Agente</th>
                <th className="pb-3 text-center">Microárea</th>
                <th className="pb-3 text-center">Domicílios</th>
                <th className="pb-3 text-center">Cidadãos</th>
                <th className="pb-3 text-center">Visitas (Mês)</th>
                <th className="pb-3 text-center">Atrasados (+30d)</th>
                <th className="pb-3 text-right pr-2">Cobertura Ativa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {acsPerformance.map((agent) => (
                <tr key={agent.id} className="hover:bg-bg-primary/20 transition-colors text-[12px] font-semibold text-text-secondary">
                  <td className="py-3.5 pl-2 flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: agent.color }} />
                    <span className="font-bold text-text-primary uppercase tracking-tight">{agent.name}</span>
                  </td>
                  <td className="py-3.5 text-center font-bold">{agent.microarea || '--'}</td>
                  <td className="py-3.5 text-center font-black text-text-primary">{agent.totalDomicilios}</td>
                  <td className="py-3.5 text-center font-black text-text-primary">{agent.totalCidadaos}</td>
                  <td className="py-3.5 text-center font-black text-teal-600 dark:text-teal-400">{agent.visitsThisMonth}</td>
                  <td className="py-3.5 text-center font-bold text-red-500">{agent.lateVisits}</td>
                  <td className="py-3.5 text-right pr-2">
                    <div className="flex items-center justify-end gap-2">
                      <span className={`text-[10px] font-extrabold ${agent.coverageRatio >= 80 ? 'text-emerald-600' : agent.coverageRatio >= 60 ? 'text-amber-500' : 'text-red-500'}`}>{agent.coverageRatio}%</span>
                      <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shrink-0">
                        <div className={`h-full rounded-full ${agent.coverageRatio >= 80 ? 'bg-emerald-500' : agent.coverageRatio >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${agent.coverageRatio}%` }} />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {acsPerformance.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 font-bold text-text-muted">Nenhum agente cadastrado no sistema.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
