import React from 'react';
import { TrendingUp, Filter, Clock } from 'lucide-react';
import { formatDate } from '../../lib/dateUtils';

export interface AgentData {
  id: string;
  name?: string;
  email?: string;
  microarea?: string;
  role?: string;
  color?: string;
  totalPatients: number;
  totalHouseholds: number;
  totalVisits: number;
  lastActive?: Date | null;
}

interface AgentMonitoringProps {
  agentsData: AgentData[];
  selectedAgentFilter: string | null;
  setSelectedAgentFilter: (id: string | null) => void;
}

export function AgentMonitoring({
  agentsData,
  selectedAgentFilter,
  setSelectedAgentFilter,
}: AgentMonitoringProps) {
  const activeAgents = agentsData.filter(
    a => a.role === 'Agente' && (a.totalPatients > 0 || a.totalHouseholds > 0 || a.totalVisits > 0)
  );

  return (
    <div className="bg-bg-secondary rounded-[32px] p-6 border border-border shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-black text-text-primary uppercase tracking-tight">Atividade de Campo dos ACS</h3>
            <p className="text-xs text-text-muted font-medium">Agentes de Saúde ativos com registros e contribuições de pacientes e domicílios no sistema</p>
          </div>
        </div>
        <span className="text-[10px] bg-teal-500/10 text-teal-600 dark:text-teal-400 px-3 py-1 rounded-full font-black uppercase tracking-wider border border-teal-500/20">
          Acompanhamento em Tempo Real
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {activeAgents.map((agent) => {
          const isSelected = selectedAgentFilter === agent.id;
          return (
            <div 
              key={agent.id}
              className={`p-4 rounded-2xl border transition-all relative flex flex-col justify-between space-y-3 bg-bg-primary/40 hover:bg-bg-primary/80 ${
                isSelected ? 'ring-2 ring-teal-500 border-teal-500/40 bg-teal-500/5' : 'border-border/60'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div 
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white font-extrabold text-[13px] shadow-inner shrink-0"
                    style={{ backgroundColor: agent.color || '#64748b' }}
                  >
                    {(agent.name || 'Agente').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-extrabold text-text-primary uppercase tracking-tight truncate" title={agent.name || 'Agente'}>
                      {agent.name}
                    </h4>
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-text-muted mt-0.5 uppercase">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: agent.color || '#64748b' }} />
                      Micro {agent.microarea || 'S/N'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedAgentFilter(isSelected ? null : agent.id)}
                  className={`px-2 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider transition-all hover:scale-102 flex items-center gap-1 shrink-0 ${
                    isSelected 
                      ? 'bg-teal-600 border-teal-600 text-white shadow-sm'
                      : 'bg-bg-secondary text-text-secondary border-border hover:border-teal-500/40'
                  }`}
                >
                  <Filter className="w-2.5 h-2.5" />
                  {isSelected ? 'Filtrado' : 'Logs'}
                </button>
              </div>

              {/* Quick counts */}
              <div className="grid grid-cols-2 gap-2 bg-bg-primary/65 dark:bg-slate-900/40 p-2.5 rounded-xl border border-border/40">
                <div className="text-center">
                  <p className="text-[9px] text-text-muted font-black uppercase tracking-tight">Domicílios</p>
                  <p className="text-sm font-black text-text-primary mt-0.5">{agent.totalHouseholds}</p>
                </div>
                <div className="text-center border-l border-border/40">
                  <p className="text-[9px] text-text-muted font-black uppercase tracking-tight">Pacientes</p>
                  <p className="text-sm font-black text-text-primary mt-0.5">{agent.totalPatients}</p>
                </div>
              </div>

              {/* Visitas & Última ação status */}
              <div className="flex items-center justify-between text-[10px] font-extrabold text-text-muted pt-1.5 border-t border-border/20">
                <span>Visitas: <strong className="text-teal-600 dark:text-teal-400 font-extrabold">{agent.totalVisits}</strong></span>
                {agent.lastActive ? (
                  <span className="flex items-center gap-1 text-[9px] text-text-muted uppercase">
                    <Clock className="w-2.5 h-2.5 text-teal-600" />
                    {formatDate(agent.lastActive.toISOString()).split(' às ')[0]}
                  </span>
                ) : (
                  <span className="text-[9px] text-text-muted/40 italic uppercase">Inativo</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
