import React from 'react';
import { Activity, MapPin, Users, Search } from 'lucide-react';
import { Patient } from '../../types';
import { calculateAge } from '../../lib/dateUtils';

export interface IndicatorConfig {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  filterFn: (p: Patient) => boolean;
  bgClass: string;
  activeBgClass: string;
}

export interface MicroareaStat {
  key: string;
  microarea: string;
  agentName: string;
  agentColor: string;
  count: number;
}

interface HealthIndicatorsProps {
  patients: Patient[];
  selectedIndicator: string;
  setSelectedIndicator: (id: string) => void;
  indicatorSearch: string;
  setIndicatorSearch: (term: string) => void;
  indicatorsConfig: IndicatorConfig[];
  microareaStats: MicroareaStat[];
  filteredIndicatorPatients: Patient[];
  onNavigatePatient: (name: string) => void;
}

export function HealthIndicators({
  patients,
  selectedIndicator,
  setSelectedIndicator,
  indicatorSearch,
  setIndicatorSearch,
  indicatorsConfig,
  microareaStats,
  filteredIndicatorPatients,
  onNavigatePatient,
}: HealthIndicatorsProps) {
  const selectedConfig = indicatorsConfig.find(ind => ind.id === selectedIndicator);
  const totalSelectedCount = selectedConfig ? patients.filter(selectedConfig.filterFn).length : 0;

  return (
    <div className="bg-bg-secondary rounded-[32px] p-6 border border-border shadow-sm space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-black text-text-primary uppercase tracking-tight">Indicadores de Saúde Ativos</h3>
            <p className="text-xs text-text-muted font-medium">Selecione um indicador para visualizar a quantidade de cidadãos assistidos por área/microárea</p>
          </div>
        </div>
      </div>

      {/* Indicator Selection Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {indicatorsConfig.map(indicator => {
          const IconComponent = indicator.icon;
          const isSelected = selectedIndicator === indicator.id;
          const totalCount = patients.filter(indicator.filterFn).length;
          
          return (
            <button
              key={indicator.id}
              onClick={() => {
                setSelectedIndicator(indicator.id);
                setIndicatorSearch('');
              }}
              className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between h-32 active:scale-98 cursor-pointer ${
                isSelected
                  ? indicator.activeBgClass + ' shadow-md scale-102 font-black ring-1 ring-teal-500/40'
                  : 'bg-bg-primary hover:bg-bg-primary/80 text-text-secondary border-border/80'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className={`p-2 rounded-xl ${isSelected ? 'bg-white/20 text-white' : indicator.bgClass.split(' ')[0] + ' ' + indicator.bgClass.split(' ')[1]}`}>
                  <IconComponent className="w-4 h-4" />
                </div>
                <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-text-muted'
                }`}>
                  Ativos
                </span>
              </div>
              
              <div className="mt-2 space-y-1">
                <span className={`text-2xl font-black block leading-none ${isSelected ? 'text-white' : 'text-text-primary'}`}>
                  {totalCount}
                </span>
                <span className={`text-[10.5px] font-extrabold uppercase tracking-tight block truncate ${isSelected ? 'text-white/90' : 'text-text-muted'}`}>
                  {indicator.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Indicator Breakdown Panel */}
      <div className="grid grid-cols-12 gap-6 pt-6 border-t border-border/60">
        
        {/* Microarea distribution */}
        <div className="col-span-12 lg:col-span-5 space-y-3">
          <div>
            <h4 className="text-xs font-black text-text-primary uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-teal-600" />
              Casos por Microárea (Área)
            </h4>
            <p className="text-[10px] text-text-muted font-medium">Distribuição geográfica do indicador selecionado</p>
          </div>

          <div className="bg-bg-primary/40 border border-border/55 rounded-2xl p-4 divide-y divide-border/30 max-h-[300px] overflow-y-auto custom-scrollbar">
            {microareaStats.map(stat => (
              <div key={stat.key} className="py-2.5 flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0"
                    style={{ backgroundColor: stat.agentColor }}
                  />
                  <div>
                    <p className="font-extrabold text-text-primary uppercase tracking-tight">
                      Microárea {stat.microarea}
                    </p>
                    <p className="text-[9px] text-text-muted font-semibold">
                      ACS: {stat.agentName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-text-secondary pr-1">
                    {totalSelectedCount > 0
                      ? `${Math.round((stat.count / totalSelectedCount) * 100)}%`
                      : '0%'
                    }
                  </span>
                  <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-text-primary border border-border/60 rounded-xl font-black">
                    {stat.count}
                  </span>
                </div>
              </div>
            ))}
            {microareaStats.length === 0 && (
              <p className="text-center py-6 text-xs font-medium text-text-muted italic">Nenhuma microárea com casos ativos.</p>
            )}
          </div>
        </div>

        {/* Patient Details list */}
        <div className="col-span-12 lg:col-span-7 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-black text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                Relação de Cidadãos ({filteredIndicatorPatients.length})
              </h4>
              <p className="text-[10px] text-text-muted font-medium">Identificação dos casos ativos neste indicador</p>
            </div>

            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
              <input
                type="text"
                placeholder="Pesquisar nesta listagem..."
                value={indicatorSearch}
                onChange={(e) => setIndicatorSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-bg-primary border border-border rounded-xl text-[11px] font-semibold focus:outline-none focus:border-teal-500 transition-colors"
              />
            </div>
          </div>

          <div className="border border-border/60 rounded-2xl overflow-hidden bg-bg-primary/20 max-h-[300px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-bg-primary/60 border-b border-border/40 text-[9px] font-bold text-text-muted uppercase tracking-wider">
                  <th className="py-2.5 px-3">Nome do Cidadão</th>
                  <th className="py-2.5 px-3">CNS</th>
                  <th className="py-2.5 px-3 text-center">Idade</th>
                  <th className="py-2.5 px-3">Microárea</th>
                  <th className="py-2.5 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 font-medium text-text-secondary">
                {filteredIndicatorPatients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-text-muted italic">
                      Nenhum cidadão correspondente aos termos de pesquisa.
                    </td>
                  </tr>
                ) : (
                  filteredIndicatorPatients.map(p => {
                    const age = p.birth_date ? calculateAge(p.birth_date) : '--';
                    return (
                      <tr key={p.id} className="hover:bg-bg-primary/40 transition-colors">
                        <td className="py-3 px-3 uppercase tracking-tight font-extrabold text-xs text-text-primary">
                          {p.name}
                        </td>
                        <td className="py-3 px-3 font-mono text-[10px]">
                          {p.cns || 'NÃO INFORMADO'}
                        </td>
                        <td className="py-3 px-3 text-center font-bold">
                          {age}
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1.5 font-bold uppercase text-[10px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                            M-{p.microarea || 'S/A'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => onNavigatePatient(p.name)}
                            className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-border/80 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors hover:text-teal-600 hover:border-teal-500/20 shadow-sm"
                          >
                            Ver Detalhes
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
