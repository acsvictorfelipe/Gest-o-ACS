import * as React from 'react';
import { supabase } from '../../lib/supabase';
import { visitRequestService } from '../../lib/visitRequests';
import { ClipboardCheck, Search, Send, Mail } from 'lucide-react';
import { motion } from 'motion/react';
import { formatDate } from '../../lib/dateUtils';

interface VisitRequestManagerProps {
  user: any;
  profiles: any[];
  patients: any[];
  visitRequests: any[];
  userMap: Record<string, any>;
  onRefresh: () => void;
  warning: (msg: string) => void;
  toastError: (msg: string) => void;
}

export function VisitRequestManager({
  user,
  profiles,
  patients,
  visitRequests,
  userMap,
  onRefresh,
  warning,
  toastError
}: VisitRequestManagerProps) {
  const [showNewRequestForm, setShowNewRequestForm] = React.useState(false);
  const [newRequestAgent, setNewRequestAgent] = React.useState('');
  const [newRequestPatient, setNewRequestPatient] = React.useState('');
  const [patientSearch, setPatientSearch] = React.useState('');
  const [showPatientDropdown, setShowPatientDropdown] = React.useState(false);
  const [newRequestPriority, setNewRequestPriority] = React.useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [newRequestReason, setNewRequestReason] = React.useState('');
  const [submittingRequest, setSubmittingRequest] = React.useState(false);

  const handleCreateVisitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequestAgent || !newRequestPatient || !newRequestReason.trim()) {
      warning('Por favor, preencha todos os campos.');
      return;
    }

    setSubmittingRequest(true);
    try {
      const selectedPatient = patients.find(p => p.id === newRequestPatient);
      const requestPayload = {
        agent_id: newRequestAgent,
        patient_id: newRequestPatient,
        patient_name: selectedPatient ? selectedPatient.name : 'Paciente',
        patient_address: selectedPatient ? selectedPatient.address : '',
        patient_cns: selectedPatient ? selectedPatient.cns : '',
        request_by: user.id,
        sender_name: user.name || user.email || 'Supervisor',
        priority: newRequestPriority,
        reason: newRequestReason.trim()
      };

      await visitRequestService.create(requestPayload);
      
      // Log event
      try {
        await supabase.from('system_logs').insert({
          user_id: user.id,
          action: 'solicitacao_visita_criada',
          details: `Solicitação de visita criada de ${user.name || user.email} para agente_id ${newRequestAgent} do paciente ${selectedPatient ? selectedPatient.name : ''}`,
          created_at: new Date().toISOString()
        });
      } catch (logErr) {
        console.warn("Log creation failed: ", logErr);
      }

      // Reset form
      setNewRequestAgent('');
      setNewRequestPatient('');
      setPatientSearch('');
      setNewRequestPriority('medium');
      setNewRequestReason('');
      setShowNewRequestForm(false);
      
      onRefresh();
    } catch (error) {
      console.error('Error creating visit request:', error);
      toastError('Erro ao criar solicitação de visita.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleCancelVisitRequest = async (requestId: string) => {
    if (!confirm('Deseja realmente cancelar esta solicitação de visita?')) return;
    try {
      await visitRequestService.updateStatus(requestId, 'dismissed');
      onRefresh();
    } catch (e) {
      console.error('Error cancelling visit request:', e);
    }
  };

  return (
    <div id="admin-visit-request-manager" className="bg-bg-secondary rounded-[32px] p-6 border border-border shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-text-primary uppercase tracking-tight">Solicitações de Visita Coordenadas</h3>
            <p className="text-xs text-text-muted font-medium">Delegue e coordene visitas de rotina ou prioritárias diretamente para os Agentes (ACS)</p>
          </div>
        </div>

        <button
          onClick={() => {
            setShowNewRequestForm(!showNewRequestForm);
            if (!showNewRequestForm && profiles.filter(p => p.role === 'Agente').length > 0) {
              setNewRequestAgent(profiles.filter(p => p.role === 'Agente')[0].id);
            }
            if (!showNewRequestForm) {
              setNewRequestPatient('');
              setPatientSearch('');
            }
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[12px] font-bold shadow-md transition-all active:scale-98 ${
            showNewRequestForm 
              ? 'bg-slate-800 dark:bg-slate-700 text-white hover:bg-slate-900 border border-slate-700' 
              : 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/10'
          }`}
        >
          {showNewRequestForm ? 'Fechar Formulário' : '+ Criar Solicitação'}
        </button>
      </div>

      {showNewRequestForm && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl bg-bg-primary/45 border border-border/85"
        >
          <form onSubmit={handleCreateVisitRequest} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Agent Select */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-text-muted mb-1.5">Atribuir ao Agente (ACS)</label>
                <select
                  value={newRequestAgent}
                  onChange={(e) => setNewRequestAgent(e.target.value)}
                  className="w-full bg-bg-secondary border border-border rounded-xl px-3.5 py-2.5 text-xs font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                >
                  {profiles.filter(p => p.role === 'Agente').length === 0 ? (
                    <option value="">Nenhum agente disponível</option>
                  ) : (
                    profiles
                      .filter(p => p.role === 'Agente')
                      .map(p => (
                        <option key={p.id} value={p.id}>{p.name} (Micro {p.microarea || 'S/N'})</option>
                      ))
                  )}
                </select>
              </div>

              {/* Patient Select */}
              <div className="relative">
                <label className="block text-[10px] font-black uppercase tracking-wider text-text-muted mb-1.5">Paciente Destino</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Pesquise pelo nome ou CNS..."
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value);
                      setShowPatientDropdown(true);
                      if (!e.target.value) {
                        setNewRequestPatient('');
                      }
                    }}
                    onFocus={() => setShowPatientDropdown(true)}
                    className="w-full bg-bg-secondary border border-border rounded-xl pl-3.5 pr-10 py-2.5 text-xs font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-teal-500/30 placeholder:text-text-muted/50"
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                    {newRequestPatient ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-500" title="Paciente selecionado" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" title="Selecione um paciente" />
                    )}
                    <Search className="w-3.5 h-3.5 text-text-muted/60" />
                  </div>
                </div>

                {/* Dropdown Menu */}
                {showPatientDropdown && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowPatientDropdown(false)} 
                    />
                    <div className="absolute z-20 w-full mt-1.5 bg-bg-secondary border border-border rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-border/30">
                      {(() => {
                        const query = patientSearch.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                        const filtered = patients.filter(p => {
                          const nameNorm = p.name ? p.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : '';
                          const cnsNorm = p.cns ? p.cns.toLowerCase() : '';
                          return nameNorm.includes(query) || cnsNorm.includes(query);
                        });

                        if (filtered.length === 0) {
                          return (
                            <div className="px-4 py-3 text-xs text-text-muted text-center font-semibold">
                              Nenhum paciente encontrado
                            </div>
                          );
                        }

                        return filtered.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setNewRequestPatient(p.id);
                              setPatientSearch(p.name);
                              setShowPatientDropdown(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-bg-primary/50 transition-colors flex flex-col gap-0.5 ${
                              newRequestPatient === p.id ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400' : 'text-text-primary'
                            }`}
                          >
                            <span className="font-extrabold">{p.name}</span>
                            <span className="text-[10px] text-text-muted font-medium">
                              CNS: {p.cns || 'S/N'} • Microárea: {p.microarea || 'S/N'}
                            </span>
                          </button>
                        ));
                      })()}
                    </div>
                  </>
                )}
              </div>

              {/* Priority Select */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-text-muted mb-1.5">Prioridade</label>
                <select
                  value={newRequestPriority}
                  onChange={(e) => setNewRequestPriority(e.target.value as any)}
                  className="w-full bg-bg-secondary border border-border rounded-xl px-3.5 py-2.5 text-xs font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                >
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente / Alerta Clínico</option>
                </select>
              </div>
            </div>

            {/* Reason Description */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-text-muted mb-1.5">Motivo / Instruções de Campo</label>
              <textarea
                value={newRequestReason}
                onChange={(e) => setNewRequestReason(e.target.value)}
                placeholder="Descreva detalhadamente o motivo da visita, ex: Gestante perdeu duas consultas de pré-natal seguidas; Realizar busca ativa e atualizar situação da vacinação infantil."
                rows={3}
                className="w-full bg-bg-secondary border border-border rounded-xl px-3.5 py-2.5 text-xs font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-teal-500/30 resize-none placeholder:text-text-muted/50"
                required
              />
            </div>

            <div className="flex justify-end gap-3.5 pt-1.5 border-t border-border/30">
              <button
                type="button"
                onClick={() => setShowNewRequestForm(false)}
                className="px-4 py-2 bg-transparent text-text-secondary hover:bg-bg-secondary/60 rounded-xl text-xs font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submittingRequest}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-teal-600/10 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {submittingRequest ? 'Enviando...' : 'Enviar Solicitação'}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {visitRequests.length === 0 ? (
          <div className="col-span-1 lg:col-span-2 py-8 text-center text-text-muted font-medium text-xs bg-bg-primary/25 border border-border/40 rounded-2xl flex flex-col items-center justify-center gap-2">
            <Mail className="w-5 h-5 text-text-muted/40" />
            Nenhuma solicitação de visita pendente ou coordenada registrada.
          </div>
        ) : (
          visitRequests.map((req) => {
            const responder = userMap[req.agent_id];
            const priorityColors = {
              low: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
              medium: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
              high: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
              urgent: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 animate-pulse'
            };
            const statusColors = {
              pending: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
              accepted: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
              done: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
              dismissed: 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20'
            };
            const statusLabels = {
              pending: 'Pendente',
              accepted: 'Em Progresso',
              done: 'Concluído',
              dismissed: 'Dispensada / Cancelada'
            };

            return (
              <div 
                key={req.id} 
                className="p-4 rounded-2xl border border-border/70 bg-bg-primary/30 flex flex-col justify-between space-y-3 hover:bg-bg-primary/60 transition-all group"
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div>
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${priorityColors[req.priority as 'low' | 'medium' | 'high' | 'urgent'] || priorityColors.medium}`}>
                      {req.priority === 'low' ? 'Baixa' : req.priority === 'medium' ? 'Média' : req.priority === 'high' ? 'Alta' : 'URGENTE'}
                    </span>
                    <h4 className="text-xs font-black uppercase text-text-primary tracking-tight mt-2 flex items-center gap-1.5">
                      {req.patient_name}
                    </h4>
                    {req.patient_address && (
                      <p className="text-[10px] text-text-muted font-bold uppercase mt-0.5 truncate max-w-[280px]" title={req.patient_address}>
                        {req.patient_address}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${statusColors[req.status as 'pending' | 'accepted' | 'done' | 'dismissed'] || statusColors.pending}`}>
                      {statusLabels[req.status as 'pending' | 'accepted' | 'done' | 'dismissed'] || req.status}
                    </span>
                    <span className="text-[9px] text-text-muted font-semibold">
                      {formatDate(req.created_at)}
                    </span>
                  </div>
                </div>

                <div className="bg-bg-secondary/40 border border-border/40 p-2.5 rounded-xl">
                  <p className="text-[11px] text-text-secondary leading-relaxed font-semibold">
                    {req.reason}
                  </p>
                  {req.notes && (
                    <div className="mt-2 pt-2 border-t border-border/20">
                      <p className="text-[10px] text-text-muted italic">
                        <strong className="text-text-secondary font-black uppercase text-[9px] non-italic tracking-wide block mb-0.5">Retorno do Agente:</strong>
                        "{req.notes}"
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] font-bold text-text-muted pt-2 border-t border-border/30">
                  <span className="flex items-center gap-1.5">
                    Agente: <strong className="text-text-primary uppercase">{responder?.name || 'Carregando...'}</strong>
                  </span>
                  {req.status === 'pending' && (
                    <button
                      onClick={() => handleCancelVisitRequest(req.id)}
                      className="text-[9px] text-red-500 hover:text-red-600 font-extrabold uppercase tracking-wider transition-colors"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
