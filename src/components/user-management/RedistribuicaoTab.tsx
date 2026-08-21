import React, { useState } from 'react';
import { 
  Activity, 
  Loader2, 
  ArrowRight, 
  Search, 
  Sliders, 
  RefreshCw, 
  Home, 
  Users, 
  CheckSquare, 
  Square, 
  MapPin, 
  AlertCircle,
  HeartPulse,
  Baby,
  Stethoscope,
  Info
} from 'lucide-react';
import { UserProfile, Patient, Household } from '../../types';
import { useConfirm } from '../ui/ConfirmDialog';

interface RedistribuicaoTabProps {
  users: UserProfile[];
  patients: Patient[];
  households: Household[];
  fromAgentId: string;
  setFromAgentId: (id: string) => void;
  toAgentId: string;
  setToAgentId: (id: string) => void;
  transferScope: 'households' | 'patients';
  setTransferScope: (scope: 'households' | 'patients') => void;
  transferType: 'all' | 'microarea' | 'selected';
  setTransferType: (t: 'all' | 'microarea' | 'selected') => void;
  selectedMicroarea: string;
  setSelectedMicroarea: (m: string) => void;
  selectedHouseholds: string[];
  setSelectedHouseholds: React.Dispatch<React.SetStateAction<string[]>>;
  selectedPatients: string[];
  setSelectedPatients: React.Dispatch<React.SetStateAction<string[]>>;
  householdSearch: string;
  setHouseholdSearch: (s: string) => void;
  patientSearch: string;
  setPatientSearch: (s: string) => void;
  transferHouseholdsWithPatients: boolean;
  setTransferHouseholdsWithPatients: (val: boolean) => void;
  transferring: boolean;
  handleTransfer: () => Promise<void>;
  sourceAgentHouseholds: Household[];
  sourceAgentPatients: Patient[];
  sourceAgentMicroareas: string[];
  filteredHouseholds: Household[];
  filteredPatients: Patient[];
  handleRenameMicroarea: (agentId: string, oldMa: string, newMa: string) => Promise<boolean>;
}

function formatPatientAge(birthDateStr?: string) {
  if (!birthDateStr) return '';
  const birth = new Date(birthDateStr);
  if (isNaN(birth.getTime())) return '';
  const today = new Date();
  let years = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    years--;
  }
  return years >= 0 ? `${years} anos` : '';
}

function formatBirthDate(birthDateStr?: string) {
  if (!birthDateStr) return '';
  const parts = birthDateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return birthDateStr;
}

export function RedistribuicaoTab({
  users,
  patients,
  households,
  fromAgentId,
  setFromAgentId,
  toAgentId,
  setToAgentId,
  transferScope,
  setTransferScope,
  transferType,
  setTransferType,
  selectedMicroarea,
  setSelectedMicroarea,
  selectedHouseholds,
  setSelectedHouseholds,
  selectedPatients,
  setSelectedPatients,
  householdSearch,
  setHouseholdSearch,
  patientSearch,
  setPatientSearch,
  transferHouseholdsWithPatients,
  setTransferHouseholdsWithPatients,
  transferring,
  handleTransfer,
  sourceAgentHouseholds,
  sourceAgentPatients,
  sourceAgentMicroareas,
  filteredHouseholds,
  filteredPatients,
  handleRenameMicroarea
}: RedistribuicaoTabProps) {
  const confirm = useConfirm();
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

  // Helper map for fast lookup of household addresses for patients
  const householdMap = React.useMemo(() => {
    const map = new Map<string, Household>();
    households.forEach(h => map.set(h.id, h));
    return map;
  }, [households]);

  // Target agent name
  const targetAgent = users.find(u => u.id === toAgentId);

  // Dynamic button label calculation
  const getTransferButtonLabel = () => {
    if (transferScope === 'patients') {
      return `Transferir ${selectedPatients.length} Paciente${selectedPatients.length === 1 ? '' : 's'}`;
    }
    if (transferType === 'all') {
      return `Transferir Todos (${sourceAgentHouseholds.length} Domicílios, ${sourceAgentPatients.length} Pacientes)`;
    }
    if (transferType === 'microarea') {
      const hCount = sourceAgentHouseholds.filter(h => h.microarea === selectedMicroarea).length;
      const pCount = sourceAgentPatients.filter(p => p.microarea === selectedMicroarea).length;
      return `Transferir Microárea ${selectedMicroarea} (${hCount} Domicílios, ${pCount} Pacientes)`;
    }
    return `Transferir ${selectedHouseholds.length} Domicílio${selectedHouseholds.length === 1 ? '' : 's'}`;
  };

  const isTransferButtonDisabled = () => {
    if (transferring || !toAgentId || !fromAgentId) return true;
    if (transferScope === 'patients') {
      return selectedPatients.length === 0;
    }
    if (transferType === 'selected') {
      return selectedHouseholds.length === 0;
    }
    if (transferType === 'microarea') {
      return !selectedMicroarea;
    }
    if (transferType === 'all') {
      return sourceAgentHouseholds.length === 0 && sourceAgentPatients.length === 0;
    }
    return false;
  };

  return (
    <div className="space-y-6">
      {/* CARD 1: REDISTRIBUIÇÃO DE MICROÁREAS */}
      <div className="bg-bg-secondary rounded-[32px] p-6 border border-border shadow-sm max-w-4xl mx-auto space-y-6">
        <div>
          <h3 className="text-sm font-black text-text-primary uppercase tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal-600" />
            Redistribuição & Transferência de Microáreas
          </h3>
          <p className="text-[10px] text-text-secondary font-medium mt-1 leading-relaxed">
            Transfira domicílios inteiros ou selecione cidadãos/pacientes individualmente para redistribuir entre agentes de saúde comunitária (ACS).
          </p>
        </div>

        {/* SELECT AGENTS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-border/60">
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase tracking-wider text-text-muted">Agente de Origem (ACS)</label>
            <select 
              value={fromAgentId} 
              onChange={e => {
                setFromAgentId(e.target.value);
                setSelectedHouseholds([]);
                setSelectedPatients([]);
                setHouseholdSearch('');
                setPatientSearch('');
              }}
              className="w-full bg-bg-primary dark:bg-slate-800 border-none rounded-xl py-3 px-3.5 text-xs font-bold focus:ring-2 focus:ring-teal-600/20"
            >
              <option value="">Selecione o ACS de origem</option>
              {users.filter(u => u.role === 'Agente').map(u => (
                <option key={u.id} value={u.id}>ACS {u.name} (Microárea {u.microarea || 'S/N'})</option>
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
                <option key={u.id} value={u.id}>ACS {u.name} (Microárea {u.microarea || 'S/N'})</option>
              ))}
            </select>
          </div>
        </div>

        {fromAgentId && (
          <div className="space-y-5 animate-in fade-in duration-300">
            {/* STATS & SCOPE TOGGLE */}
            <div className="bg-bg-primary/20 p-4 border border-border/60 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between text-[11px] font-bold text-text-secondary">
              <div>
                Estatísticas do Agente de Origem:
                <span className="text-text-primary font-black ml-1.5">{sourceAgentHouseholds.length} Domicílios</span> • 
                <span className="text-text-primary font-black ml-1.5">{sourceAgentPatients.length} Pacientes</span>
              </div>

              {/* SCOPE SELECTOR: HOUSEHOLDS VS PATIENTS */}
              <div className="flex bg-bg-primary dark:bg-slate-800/80 p-1 rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => setTransferScope('households')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg uppercase text-[9px] font-black transition-all ${
                    transferScope === 'households'
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Home className="w-3.5 h-3.5" />
                  Por Domicílios (Famílias)
                </button>
                <button
                  type="button"
                  onClick={() => setTransferScope('patients')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg uppercase text-[9px] font-black transition-all ${
                    transferScope === 'patients'
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  Por Pacientes (Individual)
                </button>
              </div>
            </div>

            {/* IF TRANSFER SCOPE IS HOUSEHOLDS */}
            {transferScope === 'households' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex flex-wrap gap-2 items-center justify-between bg-bg-secondary p-3 border border-border rounded-2xl">
                  <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Modo de envio:</span>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => setTransferType('all')} 
                      className={`px-3 py-1.5 rounded-xl uppercase text-[9px] font-black border transition-all ${
                        transferType === 'all' ? 'bg-teal-600 text-white border-teal-600' : 'bg-bg-secondary border-border hover:bg-bg-primary'
                      }`}
                    >
                      Todos os Domicílios
                    </button>
                    {sourceAgentMicroareas.length > 0 && (
                      <button 
                        type="button"
                        onClick={() => {
                          setTransferType('microarea');
                          if (!selectedMicroarea) setSelectedMicroarea(sourceAgentMicroareas[0]);
                        }} 
                        className={`px-3 py-1.5 rounded-xl uppercase text-[9px] font-black border transition-all ${
                          transferType === 'microarea' ? 'bg-teal-600 text-white border-teal-600' : 'bg-bg-secondary border-border hover:bg-bg-primary'
                        }`}
                      >
                        Por Microárea
                      </button>
                    )}
                    <button 
                      type="button"
                      onClick={() => setTransferType('selected')} 
                      className={`px-3 py-1.5 rounded-xl uppercase text-[9px] font-black border transition-all ${
                        transferType === 'selected' ? 'bg-teal-600 text-white border-teal-600' : 'bg-bg-secondary border-border hover:bg-bg-primary'
                      }`}
                    >
                      Selecionar Domicílios
                    </button>
                  </div>
                </div>

                {/* TRANSFER TYPE: BY MICROAREA */}
                {transferType === 'microarea' && (
                  <div className="bg-bg-secondary p-4 border border-border rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <label className="text-[10px] font-black uppercase text-text-muted">Selecione a Microárea de Origem:</label>
                      <p className="text-[10px] text-text-secondary font-medium">Todos os domicílios e pacientes cadastrados nesta microárea serão transferidos.</p>
                    </div>
                    <select 
                      value={selectedMicroarea} 
                      onChange={e => setSelectedMicroarea(e.target.value)}
                      className="bg-bg-primary dark:bg-slate-800 border-none rounded-xl py-2 px-3 text-xs font-bold focus:ring-2 focus:ring-teal-600/20 shrink-0 min-w-[160px]"
                    >
                      {sourceAgentMicroareas.map((m: any) => (
                        <option key={m} value={m}>Microárea {m}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* TRANSFER TYPE: SELECTED HOUSEHOLDS */}
                {transferType === 'selected' && (
                  <div className="bg-bg-secondary border border-border rounded-2xl overflow-hidden flex flex-col">
                    <div className="p-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-bg-primary/10">
                      <span className="text-[9px] font-black uppercase tracking-wider text-text-muted">
                        Selecione os Domicílios ({selectedHouseholds.length} selecionados)
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
                          className="px-2.5 py-1 bg-bg-secondary border border-border hover:bg-bg-primary text-[9px] font-black uppercase rounded-lg text-text-secondary hover:text-text-primary transition-all cursor-pointer"
                        >
                          Selecionar Todos ({filteredHouseholds.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedHouseholds([])}
                          className="px-2.5 py-1 bg-bg-secondary border border-border hover:bg-red-50 dark:hover:bg-red-950/20 text-[9px] font-black uppercase rounded-lg text-text-muted hover:text-red-500 transition-all cursor-pointer"
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

                    <div className="max-h-[280px] overflow-y-auto divide-y divide-border/60 custom-scrollbar">
                      {filteredHouseholds.map(h => {
                        const isChecked = selectedHouseholds.includes(h.id);
                        const residentCount = patients.filter(p => p.household_id === h.id).length;
                        return (
                          <div 
                            key={h.id} 
                            onClick={() => {
                              setSelectedHouseholds(prev => 
                                prev.includes(h.id) ? prev.filter(id => id !== h.id) : [...prev, h.id]
                              );
                            }}
                            className="flex items-center justify-between gap-3 p-3 text-[12px] font-semibold text-text-secondary hover:bg-bg-primary/20 transition-colors cursor-pointer select-none"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <input 
                                type="checkbox" 
                                checked={isChecked}
                                onChange={() => {}} 
                                className="w-4 h-4 rounded text-teal-600 border-slate-300 dark:border-slate-700 focus:ring-teal-500 shrink-0 pointer-events-none" 
                              />
                              <div className="min-w-0">
                                <span className="text-text-primary font-bold uppercase">{h.responsible_name || 'Responsável não cadastrado'}</span>
                                <div className="text-text-muted text-[11px] flex items-center gap-1.5 mt-0.5">
                                  <MapPin className="w-3 h-3 text-teal-600 shrink-0" />
                                  <span>{h.address}, {h.number} • Microárea {h.microarea || 'S/N'}</span>
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-text-muted bg-bg-primary px-2 py-0.5 rounded-md shrink-0">
                              {residentCount} morador{residentCount === 1 ? '' : 'es'}
                            </span>
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
              </div>
            )}

            {/* IF TRANSFER SCOPE IS PATIENTS / CIDADÃOS */}
            {transferScope === 'patients' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="bg-bg-secondary border border-border rounded-2xl overflow-hidden flex flex-col">
                  {/* Header with count and selection buttons */}
                  <div className="p-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-bg-primary/10">
                    <span className="text-[9px] font-black uppercase tracking-wider text-text-muted">
                      Selecione os Pacientes para Transferência ({selectedPatients.length} selecionados de {sourceAgentPatients.length})
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const filteredIds = filteredPatients.map(p => p.id);
                          setSelectedPatients(prev => {
                            const newSelection = new Set([...prev, ...filteredIds]);
                            return Array.from(newSelection);
                          });
                        }}
                        className="px-2.5 py-1 bg-bg-secondary border border-border hover:bg-bg-primary text-[9px] font-black uppercase rounded-lg text-text-secondary hover:text-text-primary transition-all cursor-pointer"
                      >
                        Selecionar Todos ({filteredPatients.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedPatients([])}
                        className="px-2.5 py-1 bg-bg-secondary border border-border hover:bg-red-50 dark:hover:bg-red-950/20 text-[9px] font-black uppercase rounded-lg text-text-muted hover:text-red-500 transition-all cursor-pointer"
                      >
                        Limpar Seleção
                      </button>
                    </div>
                  </div>

                  {/* Campo de Pesquisa Rápida de Pacientes */}
                  <div className="p-3 border-b border-border bg-bg-primary/5 flex items-center gap-2">
                    <Search className="w-4 h-4 text-text-muted shrink-0" />
                    <input
                      type="text"
                      placeholder="Pesquisar por nome do paciente, CNS, data de nascimento, endereço, microárea..."
                      value={patientSearch}
                      onChange={e => setPatientSearch(e.target.value)}
                      className="w-full bg-transparent border-none p-0 text-xs font-semibold placeholder:text-text-muted/65 focus:ring-0"
                    />
                    {patientSearch && (
                      <button
                        type="button"
                        onClick={() => setPatientSearch('')}
                        className="text-[10px] text-text-muted hover:text-text-primary font-bold px-1.5 py-0.5 rounded hover:bg-bg-primary"
                      >
                        Limpar
                      </button>
                    )}
                  </div>

                  {/* Patient list */}
                  <div className="max-h-[340px] overflow-y-auto divide-y divide-border/60 custom-scrollbar">
                    {filteredPatients.map(p => {
                      const isChecked = selectedPatients.includes(p.id);
                      const linkedHousehold = p.household_id ? householdMap.get(p.household_id) : null;
                      const addressStr = linkedHousehold 
                        ? `${linkedHousehold.address}, ${linkedHousehold.number}` 
                        : (p.clinical_data?.address ? `${p.clinical_data.address}${p.clinical_data.address_number ? `, ${p.clinical_data.address_number}` : ''}` : 'Sem endereço vinculado');
                      const age = formatPatientAge(p.birth_date);
                      const bDate = formatBirthDate(p.birth_date);

                      return (
                        <div 
                          key={p.id} 
                          onClick={() => {
                            setSelectedPatients(prev => 
                              prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                            );
                          }}
                          className={`flex items-start justify-between gap-3 p-3 text-[12px] font-semibold text-text-secondary hover:bg-bg-primary/20 transition-colors cursor-pointer select-none ${
                            isChecked ? 'bg-teal-50/30 dark:bg-teal-950/20' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={() => {}} 
                              className="w-4 h-4 rounded text-teal-600 border-slate-300 dark:border-slate-700 focus:ring-teal-500 shrink-0 mt-0.5 pointer-events-none" 
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-text-primary font-black uppercase text-[12px]">{p.name}</span>
                                {p.is_family_responsible && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 rounded">
                                    Resp. Familiar
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-text-muted text-[11px] mt-1 font-medium">
                                {bDate && <span>Nasc: {bDate} {age ? `(${age})` : ''}</span>}
                                {p.cns && <span>CNS: {p.cns}</span>}
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-teal-600 shrink-0" />
                                  {addressStr} (Microárea {p.microarea || 'S/N'})
                                </span>
                              </div>

                              {/* Categories badges */}
                              {p.categories && p.categories.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {p.categories.map((cat, idx) => (
                                    <span key={idx} className="text-[9px] font-bold px-1.5 py-0.5 bg-bg-primary border border-border/80 text-text-secondary rounded-md">
                                      {cat}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {filteredPatients.length === 0 && (
                      <div className="p-8 text-center text-text-muted text-xs font-semibold uppercase">
                        Nenhum paciente encontrado para a pesquisa.
                      </div>
                    )}
                  </div>
                </div>

                {/* OPTION: Also transfer linked household */}
                <div 
                  onClick={() => setTransferHouseholdsWithPatients(!transferHouseholdsWithPatients)}
                  className="bg-bg-primary/30 p-3.5 border border-border rounded-2xl flex items-start gap-3 cursor-pointer select-none hover:bg-bg-primary/50 transition-colors"
                >
                  <input 
                    type="checkbox"
                    checked={transferHouseholdsWithPatients}
                    onChange={e => setTransferHouseholdsWithPatients(e.target.checked)}
                    className="w-4 h-4 rounded text-teal-600 border-slate-300 dark:border-slate-700 focus:ring-teal-500 shrink-0 mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-text-primary">
                      Também transferir o domicílio vinculado dos pacientes selecionados
                    </span>
                    <p className="text-[10px] text-text-muted font-medium">
                      Se ativado, os domicílios de residência cadastrados para estes pacientes também passarão para a responsabilidade do ACS de destino.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TRANSFER ACTION BUTTON */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/60">
              <div className="text-[11px] font-bold text-text-muted">
                {targetAgent ? (
                  <span>Destino: <strong className="text-teal-600">ACS {targetAgent.name}</strong> (Microárea {targetAgent.microarea || 'S/N'})</span>
                ) : (
                  <span className="text-amber-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Selecione o ACS de destino acima para habilitar o envio.
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleTransfer}
                disabled={isTransferButtonDisabled()}
                className="w-full sm:w-auto px-6 py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shadow-teal-600/10 flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
              >
                {transferring ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                {getTransferButtonLabel()}
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

        <div className="bg-teal-50/50 dark:bg-slate-800/50 border border-teal-100/50 dark:border-slate-700/50 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-teal-800 dark:text-teal-300">Auto-Padronização Rápida</h4>
            <p className="text-[10px] text-slate-500 font-medium">
              Corrige automaticamente microáreas de dígito único de todo o sistema (1, 2, 3... 9) para o formato de dois dígitos (01, 02, 03... 09).
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              const ok = await confirm({
                title: 'Padronizar Microáreas',
                message: 'Deseja padronizar automaticamente todas as microáreas de 1 a 9 para 01 a 09 no sistema?',
                variant: 'warning',
                confirmLabel: 'Padronizar',
                cancelLabel: 'Cancelar'
              });
              if (ok) {
                setRenaming(true);
                try {
                  for (let i = 1; i <= 9; i++) {
                    await handleRenameMicroarea('all', String(i), '0' + i);
                  }
                } catch (err) {
                  console.error(err);
                } finally {
                  setRenaming(false);
                }
              }
            }}
            disabled={renaming}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-2 transition-all disabled:opacity-50 shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${renaming ? 'animate-spin' : ''}`} />
            Padronizar (1-9 para 01-09)
          </button>
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
