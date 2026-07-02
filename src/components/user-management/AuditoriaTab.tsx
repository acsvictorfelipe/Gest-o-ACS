import React from 'react';
import { Search } from 'lucide-react';
import { SystemLog, UserProfile } from '../../types';
import { formatDate } from '../../lib/dateUtils';

interface AuditoriaTabProps {
  systemLogs: SystemLog[];
  logSearch: string;
  setLogSearch: (s: string) => void;
  filteredLogs: SystemLog[];
  users: UserProfile[];
}

export function AuditoriaTab({
  systemLogs,
  logSearch,
  setLogSearch,
  filteredLogs,
  users
}: AuditoriaTabProps) {
  return (
    <div className="bg-bg-secondary rounded-[32px] p-6 border border-border shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-black text-text-primary uppercase tracking-tight">Registro de Auditoria do Sistema</h3>
          <p className="text-[10px] text-text-secondary font-medium mt-1">Histórico completo de ações, atualizações e modificações realizadas pelos usuários.</p>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 shrink-0" />
          <input 
            type="text" 
            placeholder="Filtrar logs..."
            value={logSearch} 
            onChange={e => setLogSearch(e.target.value)}
            className="w-full bg-bg-primary dark:bg-slate-800 border-none rounded-xl pl-9 pr-3.5 py-2.5 text-xs font-semibold placeholder:text-text-muted/65 focus:ring-2 focus:ring-teal-600/20"
          />
        </div>
      </div>

      <div className="border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-semibold">
            <thead>
              <tr className="border-b border-border bg-bg-primary/5 uppercase text-[9px] font-black text-text-muted">
                <th className="py-3 px-4">Data e Hora</th>
                <th className="py-3 px-4">Usuário</th>
                <th className="py-3 px-4">Ação</th>
                <th className="py-3 px-4">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredLogs.map(log => {
                const userProfile = users.find(u => u.id === log.user_id);
                const userName = userProfile?.name || 'Sistema';
                const userRole = userProfile?.role || 'Ação Automatizada';
                
                return (
                  <tr key={log.id} className="hover:bg-bg-primary/10 transition-colors">
                    <td className="py-3 px-4 text-text-muted font-mono">{formatDate(log.created_at || '')}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-text-primary">{userName}</div>
                      <div className="text-[9px] text-text-muted uppercase font-bold">{userRole}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 font-bold uppercase text-[9px] px-2 py-0.5 rounded">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-text-secondary leading-normal whitespace-normal break-words max-w-sm">{log.details}</td>
                  </tr>
                );
              })}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-text-muted uppercase font-bold text-xs">
                    Nenhum registro de auditoria encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
