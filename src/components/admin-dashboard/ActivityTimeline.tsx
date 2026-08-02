import * as React from 'react';
import { History, Search, Database } from 'lucide-react';

interface ActivityTimelineProps {
  compiledLogs: any[];
  selectedAgentFilter: string | null;
  onSelectAgentFilter: (agentId: string | null) => void;
}

export function ActivityTimeline({
  compiledLogs,
  selectedAgentFilter,
  onSelectAgentFilter
}: ActivityTimelineProps) {
  const [logSearch, setLogSearch] = React.useState('');
  const [logTypeFilter, setLogTypeFilter] = React.useState<string>('all');

  // Filter logs inside the timeline component to reduce code size in parent
  const filteredLogs = React.useMemo(() => {
    return compiledLogs.filter(log => {
      // 1. Search text filter
      if (logSearch) {
        const term = logSearch.toLowerCase();
        const matchesText = (
          (log.agentName || '').toLowerCase().includes(term) ||
          (log.action || '').toLowerCase().includes(term) ||
          (log.description || '').toLowerCase().includes(term)
        );
        if (!matchesText) return false;
      }
      
      // 2. Selected Agent click filter
      if (selectedAgentFilter && log.agentId !== selectedAgentFilter) {
        return false;
      }

      // 3. Log Type filter
      if (logTypeFilter !== 'all') {
        if (logTypeFilter === 'visits' && log.type !== 'visit') return false;
        if (logTypeFilter === 'cadastros' && !['cadastro_paciente', 'cadastro_domicilio'].includes(log.type)) return false;
        if (logTypeFilter === 'auth' && log.type !== 'auth') return false;
      }

      return true;
    }).slice(0, 100); // limit to 100 entries for smooth rendering
  }, [compiledLogs, logSearch, selectedAgentFilter, logTypeFilter]);

  return (
    <div id="admin-activity-timeline" className="bg-bg-secondary rounded-[32px] p-6 border border-border shadow-sm flex flex-col h-full min-h-[600px]">
      
      {/* Header */}
      <div className="space-y-4 border-b border-border pb-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-text-primary uppercase tracking-tight">Log de Auditoria</h3>
              <p className="text-[10px] text-text-secondary font-medium">Ações recentes registradas em tempo real</p>
            </div>
          </div>
          {selectedAgentFilter && (
            <button
              onClick={() => onSelectAgentFilter(null)}
              className="text-[9px] font-black uppercase text-red-500 bg-red-100 hover:bg-red-200 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/30 px-2 py-1 rounded"
            >
              Limpar Filtro
            </button>
          )}
        </div>

        {/* Log Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
          <input
            type="text"
            placeholder="Pesquisar ação, paciente, agente..."
            value={logSearch}
            onChange={(e) => setLogSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-bg-primary border border-border rounded-xl text-xs font-semibold focus:outline-none focus:border-teal-500 transition-colors placeholder:text-text-muted/60"
          />
        </div>

        {/* Log Quick filter tabs */}
        <div className="flex flex-wrap gap-1.5 text-[9px] font-black uppercase tracking-wider">
          {[
            { id: 'all', label: 'Tudo' },
            { id: 'visits', label: 'Visitas' },
            { id: 'cadastros', label: 'Cadastros' },
            { id: 'auth', label: 'Acesso' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setLogTypeFilter(tab.id)}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                logTypeFilter === tab.id
                  ? 'bg-slate-800 border-slate-800 text-white dark:bg-slate-700 dark:border-slate-700'
                  : 'bg-bg-primary text-text-muted border-border hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Timeline */}
      <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-4 custom-scrollbar max-h-[500px]">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-2">
            <Database className="w-10 h-10 text-text-muted/30" />
            <p className="text-xs font-bold text-text-muted uppercase">Nenhuma atividade logada</p>
            <p className="text-[10px] text-text-secondary max-w-[200px]">Altere os termos da busca ou limpe o filtro do agente selecionado.</p>
          </div>
        ) : (
          filteredLogs.map((log: any) => {
            const isVisit = log.type === 'visit';
            const isCadastro = ['cadastro_paciente', 'cadastro_domicilio'].includes(log.type);
            
            return (
              <div key={log.id} className="relative pl-6 pb-2 border-l border-slate-100 dark:border-slate-800/80 group">
                
                {/* Timeline Dot Indicator */}
                <span
                  className={`absolute -left-1.5 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-bg-secondary flex items-center justify-center shadow-sm ${
                    isVisit
                      ? 'bg-[#0d9488]'
                      : isCadastro
                        ? 'bg-[#6366f1]'
                        : 'bg-amber-500'
                  }`}
                />

                {/* Log Body */}
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <span 
                        className="w-1.5 h-1.5 rounded-full" 
                        style={{ backgroundColor: log.color }} 
                      />
                      <span className="text-[11px] font-black text-text-primary uppercase tracking-tight">
                        {log.agentName}
                      </span>
                      <span className="text-[8px] font-extrabold bg-slate-100 dark:bg-slate-800 text-text-secondary px-1.5 py-0.5 rounded uppercase">
                        Micro {log.microarea || '00'}
                      </span>
                    </div>
                    <span className="text-[9px] text-text-muted font-bold whitespace-nowrap">
                      {log.timestamp && !isNaN(log.timestamp.getTime()) 
                        ? log.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                        : '--:--'}
                    </span>
                  </div>

                  {/* Title of action */}
                  <p className="text-[11px] font-extrabold uppercase text-slate-700 dark:text-slate-300 tracking-wide">
                    {log.action}
                  </p>

                  {/* Detailed Description */}
                  <p className="text-[11px] text-text-secondary leading-normal font-medium bg-bg-primary/40 p-2 border border-border/40 rounded-xl">
                    {log.description}
                  </p>

                  <div className="text-[9px] font-bold text-text-muted pt-0.5">
                    {log.timestamp && !isNaN(log.timestamp.getTime())
                      ? log.timestamp.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
                      : 'Data recente'}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
