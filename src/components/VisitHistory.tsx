import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  History,
  Search,
  Calendar,
  ChevronRight,
  Loader2,
  Pencil,
  Trash2,
  X,
  ShieldAlert,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { formatDate } from '../lib/dateUtils';

type PeriodKey = 'hoje' | '7d' | '30d' | '90d' | 'todos';

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'hoje', label: 'Hoje' },
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: '90d', label: '90 dias' },
  { key: 'todos', label: 'Todos' },
];

function getPeriodStart(period: PeriodKey): string | null {
  const now = new Date();
  if (period === 'hoje') {
    return now.toISOString().split('T')[0];
  }
  if (period === '7d') {
    now.setDate(now.getDate() - 7);
    return now.toISOString().split('T')[0];
  }
  if (period === '30d') {
    now.setDate(now.getDate() - 30);
    return now.toISOString().split('T')[0];
  }
  if (period === '90d') {
    now.setDate(now.getDate() - 90);
    return now.toISOString().split('T')[0];
  }
  return null; // 'todos' — sem filtro
}

import type { UserProfile, Visit } from '../types';

export function VisitHistory({ user }: { user: UserProfile }) {
  const navigate = useNavigate();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('Todas');
  const [period, setPeriod] = useState<PeriodKey>('30d');

  // Edit/delete visit states
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editType, setEditType] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchVisits = async () => {
    if (!user.microarea && user.role !== 'Administrador') return;
    setLoading(true);
    try {
      let query = supabase
        .from('visits')
        .select(`
          *,
          patients (
            name,
            cns,
            birth_date,
            categories
          )
        `)
        .order('date', { ascending: false });

      if (user.role === 'Administrador') {
        // No filters for Admin
      } else if (user.role === 'Gestor') {
        query = query.eq('area_color', user.color);
      } else {
        query = query.eq('agent_id', user.id);
      }

      // Apply period filter server-side for performance
      const periodStart = getPeriodStart(period);
      if (periodStart) {
        query = query.gte('date', periodStart);
      }

      const { data, error } = await query;
      if (error) throw error;
      setVisits(data || []);

      // Handle search from state
      const locationState = window.history.state?.usr;
      if (locationState?.search) {
        setSearchTerm(locationState.search);
      }
    } catch (error) {
      console.error("Error fetching visits:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisits();
  }, [user.id, user.role, user.color, user.microarea, period]);

  const handleOpenEdit = (v: any) => {
    setEditingVisit(v);
    setEditDate(v.date || '');
    setEditType(v.type || 'Rotina');
    setEditSummary(v.summary || '');
  };

  const handleUpdateVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVisit) return;
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('visits')
        .update({
          date: editDate,
          type: editType,
          summary: editSummary
        })
        .eq('id', editingVisit.id);

      if (error) throw error;
      setEditingVisit(null);
      await fetchVisits();
    } catch (err) {
      console.error("Error updating visit:", err);
      alert("Erro ao salvar alterações da visita dadas.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVisit = async (visitId: string) => {
    try {
      const { error } = await supabase
        .from('visits')
        .delete()
        .eq('id', visitId);

      if (error) throw error;
      setDeleteConfirmId(null);
      await fetchVisits();
    } catch (err) {
      console.error("Error deleting visit:", err);
      alert("Erro ao excluir visita.");
    }
  };

  const filteredVisits = visits.filter(v => {
    const patientName = v.patients?.name || '';
    const matchesSearch = patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.patients?.cns?.includes(searchTerm);
    const matchesType = filterType === 'Todas' || v.type === filterType;
    return matchesSearch && matchesType;
  });

  const visitTypes = ['Todas', 'Rotina', 'Acompanhamento', 'Urgência', 'Pós-Parto', 'Recém-Nascido'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <header className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold tracking-tight text-text-primary dark:text-white">Histórico de Visitas</h2>
          <p className="text-sm text-text-secondary font-medium tracking-tight">Visualize o registro completo das visitas domiciliares.</p>
        </header>
        <div className="flex flex-col gap-2">
          {/* Period selector */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all tracking-tight whitespace-nowrap ${period === p.key
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-bg-secondary dark:bg-slate-900 border border-border dark:border-slate-800 text-text-secondary dark:text-text-muted hover:bg-bg-primary'
                  }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {/* Type selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {visitTypes.map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all tracking-tight whitespace-nowrap ${filterType === type
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-bg-secondary dark:bg-slate-900 border border-border dark:border-slate-800 text-text-secondary dark:text-text-muted hover:bg-bg-primary'
                  }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative group max-w-2xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-primary transition-colors" />
        <input
          type="text"
          placeholder="Pesquisar por paciente ou CNS..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-bg-secondary dark:bg-slate-900 border border-border dark:border-slate-800 rounded-lg py-2.5 pl-11 pr-6 shadow-sm focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium text-text-primary dark:text-white"
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-text-muted">
          <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary" />
          <p className="text-sm font-medium">Carregando dados...</p>
        </div>
      ) : (
        <div className="bg-bg-secondary dark:bg-slate-900 rounded-xl border border-border dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="px-6 py-3 border-b border-border dark:border-slate-800 flex items-center justify-between bg-bg-primary/50">
            <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest">
              {filteredVisits.length} {filteredVisits.length === 1 ? 'visita encontrada' : 'visitas encontradas'}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-bg-primary dark:bg-slate-800/30 border-b border-border dark:border-slate-800">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-text-muted">Data / Tipo</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-text-muted">Paciente</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-text-muted">Categoria</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-text-muted">Observações</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-text-muted text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredVisits.length > 0 ? (
                  filteredVisits.map((v) => (
                    <tr key={v.id} className="hover:bg-bg-primary/50 dark:hover:bg-slate-800/30 transition-colors group cursor-pointer" onClick={() => navigate(`/editar-paciente/${v.patient_id}`)}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 shrink-0">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-text-primary dark:text-white leading-tight">
                              {formatDate(v.date)}
                            </p>
                            <span className={`text-[10px] font-bold uppercase tracking-tighter px-1.5 py-0.5 rounded ${
                              v.type === 'Urgência' ? 'bg-red-100 text-red-600' :
                              v.type === 'Rotina' ? 'bg-teal-100 text-teal-700' :
                              'bg-slate-100 text-slate-500'
                            }`}>
                              {v.type}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-semibold text-text-primary dark:text-white leading-tight uppercase">{v.patients?.name}</p>
                          <p className="text-[10px] text-text-muted font-medium">
                            {v.patients?.birth_date ? `Nasc: ${formatDate(v.patients.birth_date)}` : `CNS: ${v.patients?.cns}`}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {(v.patients?.categories || []).slice(0, 3).map((cat: string) => {
                            const colors: Record<string, string> = {
                              'Gestante': 'bg-pink-100 text-pink-700',
                              'Criança': 'bg-blue-100 text-blue-700',
                              'Idoso': 'bg-orange-100 text-orange-700',
                              'Adulto': 'bg-emerald-100 text-emerald-700',
                              'AcamadoDomiciliado': 'bg-slate-100 text-slate-600',
                              'SaudeMental': 'bg-purple-100 text-purple-700',
                            };
                            return (
                              <span key={cat} className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${colors[cat] || 'bg-slate-100 text-slate-500'}`}>
                                {cat === 'AcamadoDomiciliado' ? 'Acamado' : cat}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <p className="text-sm text-text-secondary dark:text-text-muted line-clamp-1 italic font-medium">
                          {v.summary || 'Sem observações registradas.'}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(v)}
                            className="p-1.5 bg-slate-50 hover:bg-teal-50 dark:bg-slate-800 dark:hover:bg-slate-700 hover:text-teal-600 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-teal-200 transition-all text-slate-500"
                            title="Editar Visita"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(v.id)}
                            className="p-1.5 bg-slate-50 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-950/20 hover:text-red-600 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-red-200 transition-all text-slate-500"
                            title="Excluir Visita"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => navigate(`/editar-paciente/${v.patient_id}`)}
                            className="p-1.5 bg-teal-50 dark:bg-teal-950/20 text-teal-600 hover:bg-teal-600 hover:text-white rounded-lg border border-teal-100 dark:border-teal-900/30 hover:border-teal-600 transition-all flex items-center justify-center font-bold"
                            title="Ver Perfil"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-8 py-24 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <History className="w-8 h-8 text-border" />
                        <p className="text-sm font-medium text-text-muted">Nenhuma visita encontrada para o período selecionado.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Edição de Visita */}
      {editingVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-250">
            <header className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-850">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-800 dark:text-white">Editar Registro de Visita</h3>
              <button 
                type="button" 
                onClick={() => setEditingVisit(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </header>
            <form onSubmit={handleUpdateVisit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Data da Visita</label>
                <input
                  required
                  type="date"
                  value={editDate}
                  onChange={e => setEditDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tipo de Visita</label>
                <select
                  required
                  value={editType}
                  onChange={e => setEditType(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-2 px-3 text-sm font-bold uppercase focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white"
                >
                  <option value="Rotina">Rotina</option>
                  <option value="Acompanhamento">Acompanhamento</option>
                  <option value="Urgência">Urgência</option>
                  <option value="Pós-Parto">Pós-Parto</option>
                  <option value="Recém-Nascido">Recém-Nascido</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Texto / Observação da Visita</label>
                <textarea
                  value={editSummary}
                  onChange={e => setEditSummary(e.target.value)}
                  rows={4}
                  placeholder="Descreva o que foi observado ou realizado na visita domiciliar..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white italic resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingVisit(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-bold uppercase transition-all tracking-wider"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold uppercase transition-all tracking-wider flex items-center gap-1.5 shadow-sm"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-250">
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-950/40 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 mx-auto">
                <ShieldAlert className="w-6 h-6 animate-bounce" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-white">Excluir Registro de Visita?</h4>
                <p className="text-xs text-slate-500 font-medium">Tem certeza de que deseja apagar permanentemente este registro de visita? Esta ação é irreversível.</p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-bold uppercase transition-all tracking-wider"
                >
                  Não, Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteVisit(deleteConfirmId)}
                  className="px-4 py-2 bg-red-650 hover:bg-red-700 text-white rounded-lg text-xs font-bold uppercase transition-all tracking-wider shadow-sm"
                >
                  Sim, Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

