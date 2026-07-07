import React, { useState } from 'react';
import { Activity, Loader2, ArrowRight, Search, Sliders, RefreshCw } from 'lucide-react';
import { UserProfile, Patient, Household } from '../../types';

interface RedistribuicaoTabProps {
  users: UserProfile[];
  patients: Patient[];
  fromAgentId: string;
  setFromAgentId: (id: string) => void;
  toAgentId: string;
  setToAgentId: (id: string) => void;
  transferType: 'all' | 'microarea' | 'selected';
  setTransferType: (t: 'all' | 'microarea' | 'selected') => void;
  selectedMicroarea: string;
  setSelectedMicroarea: (m: string) => void;
  selectedHouseholds: string[];
  setSelectedHouseholds: React.Dispatch<React.SetStateAction<string[]>>;
  householdSearch: string;
  setHouseholdSearch: (s: string) => void;
  transferring: boolean;
  handleTransfer: () => Promise<void>;
  sourceAgentHouseholds: Household[];
  sourceAgentMicroareas: string[];
  filteredHouseholds: Household[];
  handleRenameMicroarea: (agentId: string, oldMa: string, newMa: string) => Promise<boolean>;
}

export function RedistribuicaoTab({
  users,
  patients,
  fromAgentId,
  setFromAgentId,
  toAgentId,
  setToAgentId,
  transferType,
  setTransferType,
  selectedMicroarea,
  setSelectedMicroarea,
  selectedHouseholds,
  setSelectedHouseholds,
  householdSearch,
  setHouseholdSearch,
  transferring,
  handleTransfer,
  sourceAgentHouseholds,
  sourceAgentMicroareas,
  filteredHouseholds,
  handleRenameMicroarea
}: RedistribuicaoTabProps) {
  const [renameAgentId, setRenameAgentId] = useState('all');
  const [oldMicroareaInput, setOldMicroareaInput] = useState('');
  const [newMicroareaInput, setNewMicroareaInput] = useState('');
  const [renaming, setRenaming] = useState(false);

  const onRenameSubmit = async () => {
    setRenaming(true);
    const success = await handleRenameMicroarea(renameAgentId, oldMicroareaInput, newMicroareaInput);
    if (success) {
      setOldMicroareaInput('');
      setNewMicroareaInput('');
    }
    setRenaming(false);
  };

  return (
    <div className="space-y-6">
      {/* CARD 1: REDISTRIBUIÇÃO DE MICROÁREAS */}
      <div className="bg-bg-secondary rounded-[32px] p-6 border border-border shadow-sm max-w-4xl mx-auto space-y-6">
        <div>
          <h3 className="text-sm font-black text-text-primary uppercase tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal-600" />
            Redistribuição de Microáreas
          </h3>
          <p className="text-[10px] text-text-secondary font-medium mt-1 leading-relaxed">
            Transfira domicílios e pacientes entre agentes de saúde comunitária de forma simples.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-border/60">
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase tracking-wider text-text-muted">Agente de Origem (ACS)</label>
            <select 
              value={fromAgentId} 
              onChange={e => {
                setFromAgentId(e.target.value);
                setSelectedHouseholds([]);
                setHouseholdSearch('');
              }}
              className="w-full bg-bg-primary dark:bg-slate-800 border-none rounded-xl py-3 px-3.5 text-xs font-bold focus:ring-2 focus:ring-teal-600/20"
            >
              <option value="">Selecione o ACS de origem</option>
              {users.filter(u => u.role === 'Agente').map(u => (
                <option key={u.id} value={u.id}>ACS {u.name} (Microárea {u.microarea})</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase tracking-wider text-text-muted">Agente de Destino (ACS)</label>
            <select 
              value={toAgentId} 
              onChange={e => setToAgentId(e.target.value)}
              className="w-full bg-bg-primary dark:bg-slate-800 border-none rounded-xl py-3 px-3.5 text-xs font-bold focus:ring-2 focus:ring-teal-600/20"
            >
              <option value="">Selecione o ACS de destino</option>
              {users.filter(u => u.role === 'Agente' && u.id !== fromAgentId).map(u => (
                <option key={u.id} value={u.id}>ACS {u.name} (Microárea {u.microarea})</option>
              ))}
            </select>
          </div>
        </div>

        {fromAgentId && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="bg-bg-primary/20 p-4 border border-border/60 rounded-2xl flex flex-col sm:flex-row gap-4 items-center justify-between text-[11px] font-bold text-text-secondary">
              <div>
                Estatísticas do Agente de Origem:
                <span className="text-text-primary font-black ml-1.5">{sourceAgentHouseholds.length} Domicílios</span> • 
                <span className="text-text-primary font-black ml-1.5">{patients.filter(p => p.agent_id === fromAgentId).length} Pacientes</span>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => setTransferType('all')} 
                  className={`px-3 py-1.5 rounded-xl uppercase text-[9px] font-black border transition-all ${
                    transferType === 'all' ? 'bg-teal-600 text-white border-teal-600' : 'bg-bg-secondary border-border hover:bg-bg-primary'
                  }`}
                >
                  Tudo
                </button>
                {sourceAgentMicroareas.length > 0 && (
                  <button 
                    onClick={() => {
                      setTransferType('microarea');
                      setSelectedMicroarea(sourceAgentMicroareas[0]);
                    }} 
                    className={`px-3 py-1.5 rounded-xl uppercase text-[9px] font-black border transition-all ${
                      transferType === 'microarea' ? 'bg-teal-600 text-white border-teal-600' : 'bg-bg-secondary border-border hover:bg-bg-primary'
                    }`}
                  >
                    Por Microárea
                  </button>
                )}
                <button 
                  onClick={() => setTransferType('selected')} 
                  className={`px-3 py-1.5 rounded-xl uppercase text-[9px] font-black border transition-all ${
                    transferType === 'selected' ? 'bg-teal-600 text-white border-teal-600' : 'bg-bg-secondary border-border hover:bg-bg-primary'
                  }`}
                >
                  Selecionados
                </button>
              </div>
            </div>

            {/* TRANSFER TYPE OPTION PANEL */}
            {transferType === 'microarea' && (
              <div className="bg-bg-secondary p-4 border border-border rounded-2xl flex items-center gap-3 space-y-1">
                <label className="text-[10px] font-black uppercase text-text-muted shrink-0">Selecione a Microárea:</label>
                <select 
                  value={selectedMicroarea} 
                  onChange={e => setSelectedMicroarea(e.target.value)}
                  className="bg-bg-primary dark:bg-slate-800 border-none rounded-xl py-2 px-3 text-xs font-bold focus:ring-2 focus:ring-teal-600/20 shrink-0"
                >
                  {sourceAgentMicroareas.map((m: any) => (
                    <option key={m} value={m}>Microárea {m}</option>
                  ))}
                </select>
              </div>
            )}

            {transferType === 'selected' && (
              <div className="bg-bg-secondary border border-border rounded-2xl overflow-hidden flex flex-col">
                <div className="p-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-bg-primary/10">
                  <span className="text-[9px] font-black uppercase tracking-wider text-text-muted">
                    Selecione os Domicílios para Transferência ({selectedHouseholds.length} selecionados)
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const filteredIds = filteredHouseholds.map(h => h.id);
                        setSelectedHouseholds(prev => {
                          const newSelection = new Set([...prev, ...filteredIds]);
                          return Array.from(newSelection);
                        });
                      }}
                      className="px-2 py-1 bg-bg-secondary border border-border hover:bg-bg-primary text-[9px] font-black uppercase rounded-lg text-text-secondary hover:text-text-primary transition-all"
                    >
                      Selecionar Todos Filtrados
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedHouseholds([]);
                      }}
                      className="px-2 py-1 bg-bg-secondary border border-border hover:bg-red-50 dark:hover:bg-red-950/20 text-[9px] font-black uppercase rounded-lg text-text-muted hover:text-red-500 transition-all"
                    >
                      Limpar Seleção
                    </button>
                  </div>
                </div>

                {/* Campo de Pesquisa Rápida */}
                <div className="p-3 border-b border-border bg-bg-primary/5 flex items-center gap-2">
                  <Search className="w-4 h-4 text-text-muted shrink-0" />
                  <input
                    type="text"
                    placeholder="Pesquisar por responsável, rua, número ou microárea..."
                    value={householdSearch}
                    onChange={e => setHouseholdSearch(e.target.value)}
                    className="w-full bg-transparent border-none p-0 text-xs font-semibold placeholder:text-text-muted/65 focus:ring-0"
                  />
                  {householdSearch && (
                    <button
                      type="button"
                      onClick={() => setHouseholdSearch('')}
                      className="text-[10px] text-text-muted hover:text-text-primary font-bold px-1.5 py-0.5 rounded hover:bg-bg-primary"
                    >
                      Limpar
                    </button>
                  )}
                </div>

                <div className="max-h-[260px] overflow-y-auto divide-y divide-border/60 custom-scrollbar">
                  {filteredHouseholds.map(h => {
                    const isChecked = selectedHouseholds.includes(h.id);
                    return (
                      <div 
                        key={h.id} 
                        onClick={() => {
                          setSelectedHouseholds(prev => 
                            prev.includes(h.id) ? prev.filter(id => id !== h.id) : [...prev, h.id]
                          );
                        }}
                        className="flex items-center gap-3 p-3 text-[12px] font-semibold text-text-secondary hover:bg-bg-primary/20 transition-colors cursor-pointer select-none"
                      >
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => {}} // Controlled by outer div click
                          className="w-4 h-4 rounded text-teal-600 border-slate-300 dark:border-slate-700 focus:ring-teal-500 shrink-0" 
                        />
                        <div className="min-w-0">
                          <span className="text-text-primary font-bold uppercase">{h.responsible_name || 'Responsável não cadastrado'}</span>
                          <span className="text-text-muted ml-2">{h.address}, {h.number} (Microárea {h.microarea})</span>
                        </div>
                      </div>
                    );
                  })}
                  {filteredHouseholds.length === 0 && (
                    <div className="p-6 text-center text-text-muted text-xs font-semibold uppercase">
                      Nenhum domicílio encontrado para a pesquisa.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TRANSFER ACTION BUTTON */}
            <div className="flex justify-end pt-4">
              <button
                onClick={handleTransfer}
                disabled={transferring || !toAgentId}
                className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shadow-teal-600/10 flex items-center gap-2 active:scale-98 transition-all disabled:opacity-50"
              >
                {transferring ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Realizar Transferência
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CARD 2: CORREÇÃO & PADRONIZAÇÃO DE MICROÁREAS (ex: "3" -> "03") */}
      <div className="bg-bg-secondary rounded-[32px] p-6 border border-border shadow-sm max-w-4xl mx-auto space-y-6">
        <div>
          <h3 className="text-sm font-black text-text-primary uppercase tracking-tight flex items-center gap-2">
            <Sliders className="w-5 h-5 text-teal-600" />
            Correção & Padronização de Nome de Microárea
          </h3>
          <p className="text-[10px] text-text-secondary font-medium mt-1 leading-relaxed">
            Corrija ou padronize a escrita das microáreas em massa (ex: alterar de "3" para "03"). Isso atualizará todos os cadastros de agentes, domicílios, cidadãos e visitas de uma só vez.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase tracking-wider text-text-muted">Filtrar por Agente</label>
            <select 
              value={renameAgentId} 
              onChange={e => setRenameAgentId(e.target.value)}
              className="w-full bg-bg-primary dark:bg-slate-800 border-none rounded-xl py-3 px-3.5 text-xs font-bold focus:ring-2 focus:ring-teal-600/20"
            >
              <option value="all">Todos os Agentes (Sistema Completo)</option>
              {users.filter(u => u.role === 'Agente').map(u => (
                <option key={u.id} value={u.id}>ACS {u.name} (Microárea {u.microarea || 'S/N'})</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase tracking-wider text-text-muted">Nome Atual (Ex: "3")</label>
            <input 
              type="text"
              placeholder="Digite o nome incorreto"
              value={oldMicroareaInput}
              onChange={e => setOldMicroareaInput(e.target.value)}
              className="w-full bg-bg-primary dark:bg-slate-800 border-none rounded-xl py-3 px-3.5 text-xs font-bold focus:ring-2 focus:ring-teal-600/20 placeholder:text-text-muted/50 uppercase"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase tracking-wider text-text-muted">Novo Nome Corrigido (Ex: "03")</label>
            <input 
              type="text"
              placeholder="Digite o nome corrigido"
              value={newMicroareaInput}
              onChange={e => setNewMicroareaInput(e.target.value)}
              className="w-full bg-bg-primary dark:bg-slate-800 border-none rounded-xl py-3 px-3.5 text-xs font-bold focus:ring-2 focus:ring-teal-600/20 placeholder:text-text-muted/50 uppercase"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center pt-2">
          <p className="text-[9px] text-text-muted font-bold uppercase italic max-w-md">
            ⚠️ Atenção: Esta operação altera diretamente os registros do banco de dados (perfis, domicílios, cidadãos e visitas) e não pode ser desfeita.
          </p>
          <button
            onClick={onRenameSubmit}
            disabled={renaming || !oldMicroareaInput.trim() || !newMicroareaInput.trim()}
            className="px-5 py-3 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md flex items-center gap-2 active:scale-98 transition-all disabled:opacity-50 cursor-pointer self-end"
          >
            {renaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Aplicar Correção
          </button>
        </div>
      </div>
    </div>
  );
}
