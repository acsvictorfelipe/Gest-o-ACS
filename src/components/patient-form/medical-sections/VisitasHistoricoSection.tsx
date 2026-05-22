import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../../../lib/dateUtils';
import { 
  Calendar, 
  Trash2, 
  Plus, 
  Search, 
  History, 
  Home, 
  UserPlus, 
  AlertCircle, 
  UserX, 
  Stethoscope, 
  Sparkles,
  Edit2, 
  Save, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Baby, 
  Heart,
  Loader2,
  Syringe,
  AlertTriangle,
  FileText
} from 'lucide-react';

interface VisitasHistoricoSectionProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  id: string | undefined;
  addDateToList: (category: string, list: string) => void;
  removeDateFromList: (category: string, list: string, index: number) => void;
  updateDateInList: (category: string, list: string, index: number, value: any) => void;
  isReadOnly?: boolean;
}

interface TimelineItem {
  id: string;
  date: string;
  type: 'cadastro' | 'visita_db' | 'visita_local' | 'consulta_puericultura' | 'consulta_prenatal' | 'puerperio' | 'marco_gestacional' | 'consulta_geral';
  title: string;
  summary?: string;
  status?: 'Realizada' | 'Ausente' | 'Pendente';
  originalData?: any;
  index?: number;
}

export function VisitasHistoricoSection({ 
  formData, 
  setFormData, 
  id, 
  addDateToList, 
  removeDateFromList, 
  updateDateInList,
  isReadOnly
}: VisitasHistoricoSectionProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'timeline' | 'vacinas'>('timeline');
  const [dbVisits, setDbVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<'todos' | 'visitas' | 'consultas'>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Expanded state for long notes
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  
  // Inline editing state for local visits/consultations
  const [editingLocalIndex, setEditingLocalIndex] = useState<number | null>(null);
  const [editingLocalType, setEditingLocalType] = useState<'visitasGerais' | 'consultasGerais' | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editType, setEditType] = useState('Rotina');

  // Fetch real visits from Supabase visits table
  useEffect(() => {
    if (!id) return;
    const fetchDbVisits = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('visits')
          .select('*')
          .eq('patient_id', id)
          .order('date', { ascending: false });
        if (error) throw error;
        setDbVisits(data || []);
      } catch (error) {
        console.error('Error fetching patient visits:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDbVisits();
  }, [id]);

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const handleStartEdit = (type: 'visitasGerais' | 'consultasGerais', index: number, currentItem: any) => {
    setEditingLocalType(type);
    setEditingLocalIndex(index);
    setEditDate(currentItem.date || '');
    setEditSummary(currentItem.summary || '');
    setEditType(currentItem.type || 'Rotina');
  };

  const handleSaveEdit = (type: 'visitasGerais' | 'consultasGerais', index: number) => {
    if (!editDate) {
      alert('Por favor, selecione uma data para salvar o registro.');
      return;
    }
    updateDateInList('root', type, index, {
      date: editDate,
      summary: editSummary,
      ...(type === 'visitasGerais' ? { type: editType } : {})
    });
    setEditingLocalIndex(null);
    setEditingLocalType(null);
  };

  const handleCancelEdit = (type: 'visitasGerais' | 'consultasGerais', index: number) => {
    const currentList = formData.clinicalData[type] || [];
    const item = currentList[index];
    if (item && !item.date) {
      removeDateFromList('root', type, index);
    }
    setEditingLocalIndex(null);
    setEditingLocalType(null);
  };

  // Efeito para ativar automaticamente o modo de edição ao adicionar um item sem data
  useEffect(() => {
    if (formData.clinicalData.consultasGerais) {
      const emptyIdx = formData.clinicalData.consultasGerais.findIndex((c: any) => c && c.date === '');
      if (emptyIdx !== -1) {
        setEditingLocalType('consultasGerais');
        setEditingLocalIndex(emptyIdx);
        setEditDate('');
        setEditSummary('');
        return;
      }
    }
    if (formData.clinicalData.visitasGerais) {
      const emptyIdx = formData.clinicalData.visitasGerais.findIndex((v: any) => v && v.date === '');
      if (emptyIdx !== -1) {
        const item = formData.clinicalData.visitasGerais[emptyIdx];
        setEditingLocalType('visitasGerais');
        setEditingLocalIndex(emptyIdx);
        setEditDate('');
        setEditSummary('');
        setEditType(item?.type || 'Rotina');
        return;
      }
    }
  }, [formData.clinicalData.consultasGerais, formData.clinicalData.visitasGerais]);

  // Compile clinical milestones from different sources
  const getTimelineItems = (): TimelineItem[] => {
    const items: TimelineItem[] = [];

    // 1. Patient Registration Milestone
    if (formData.createdAt) {
      items.push({
        id: 'cadastro',
        date: formData.createdAt.split('T')[0],
        type: 'cadastro',
        title: 'Cadastro do Cidadão',
        summary: 'Ficha individual e prontuário clínico inicializados no sistema.'
      });
    } else if (id && dbVisits.length > 0) {
      // Fallback in case createdAt is somehow empty but we have visits
      const oldestVisit = dbVisits[dbVisits.length - 1];
      const oldestDate = oldestVisit.date ? oldestVisit.date.split('T')[0] : '';
      if (oldestDate) {
        items.push({
          id: 'cadastro-fallback',
          date: oldestDate,
          type: 'cadastro',
          title: 'Histórico Inicializado',
          summary: 'Acompanhamento clínico iniciado no território da microárea.'
        });
      }
    }

    // 2. Visits from database table
    dbVisits.forEach((v) => {
      const visitDate = v.date ? v.date.split('T')[0] : '';
      items.push({
        id: `db-${v.id}`,
        date: visitDate,
        type: 'visita_db',
        title: `Visita Domiciliar (${v.type || 'Rotina'})`,
        summary: v.summary || 'Sem observações adicionais.',
        status: v.type === 'Ausente' ? 'Ausente' : 'Realizada',
        originalData: v
      });
    });

    // 3. Local visits (visitasGerais)
    if (formData.clinicalData.visitasGerais) {
      formData.clinicalData.visitasGerais.forEach((v: any, index: number) => {
        if (v.date === undefined) return;
        
        // Evitar duplicar se já existir na lista do banco de dados na mesma data
        const isDup = v.date ? dbVisits.some(dbV => dbV.date?.split('T')[0] === v.date && dbV.summary === v.summary) : false;
        if (!isDup) {
          items.push({
            id: `local-${index}`,
            date: v.date || '',
            type: 'visita_local',
            title: `Visita Registrada (${v.type || 'Rotina'})`,
            summary: v.summary || '',
            status: v.type === 'Ausente' ? 'Ausente' : 'Realizada',
            originalData: v,
            index
          });
        }
      });
    }

    // 4. Criança Section Milestones
    if (formData.categories.includes('Criança') && formData.clinicalData.crianca) {
      const kid = formData.clinicalData.crianca;
      
      if (kid.consultas) {
        kid.consultas.forEach((cDate: string, idx: number) => {
          if (cDate) {
            items.push({
              id: `kid-consulta-${idx}`,
              date: cDate,
              type: 'consulta_puericultura',
              title: 'Consulta de Puericultura',
              summary: 'Acompanhamento sistemático de crescimento e desenvolvimento infantil.'
            });
          }
        });
      }

      if (kid.visita30dias) {
        items.push({
          id: 'kid-v30d',
          date: kid.visita30dias,
          type: 'consulta_puericultura',
          title: 'Acompanhamento do 1º Mês (30 dias)',
          summary: 'Primeira avaliação pós-natal de saúde e amamentação da criança.'
        });
      }

      if (kid.visita6meses) {
        items.push({
          id: 'kid-v6m',
          date: kid.visita6meses,
          type: 'consulta_puericultura',
          title: 'Acompanhamento do 6º Mês',
          summary: 'Avaliação de crescimento, desenvolvimento e introdução alimentar.'
        });
      }
    }

    // 5. Gestante Section Milestones
    if (formData.categories.includes('Gestante') && formData.clinicalData.gestante) {
      const gest = formData.clinicalData.gestante;
      
      if (gest.consultas) {
        gest.consultas.forEach((cDate: string, idx: number) => {
          if (cDate) {
            items.push({
              id: `gest-consulta-${idx}`,
              date: cDate,
              type: 'consulta_prenatal',
              title: 'Consulta de Pré-Natal',
              summary: 'Consulta médica ou de enfermagem de acompanhamento da gravidez.'
            });
          }
        });
      }

      if (gest.dum) {
        items.push({
          id: 'gest-dum',
          date: gest.dum,
          type: 'marco_gestacional',
          title: 'DUM - Início do Ciclo Gestacional',
          summary: 'Data da Última Menstruação informada.'
        });
      }

      if (gest.dpp) {
        items.push({
          id: 'gest-dpp',
          date: gest.dpp,
          type: 'marco_gestacional',
          title: 'DPP - Previsão do Parto',
          summary: 'Data Provável do Parto calculada.'
        });
      }

      if (gest.puerperioConsulta) {
        items.push({
          id: 'gest-puerp-con',
          date: gest.puerperioConsulta,
          type: 'puerperio',
          title: 'Consulta de Puerpério (Mãe)',
          summary: 'Consulta de avaliação pós-parto realizada na UBS.'
        });
      }

      if (gest.puerperioVisita) {
        items.push({
          id: 'gest-puerp-vis',
          date: gest.puerperioVisita,
          type: 'puerperio',
          title: 'Visita Pós-Parto (ACS)',
          summary: 'Visita domiciliar nos primeiros dias após a alta da maternidade.'
        });
      }
    }

    // 6. Idoso Section Milestones
    if (formData.categories.includes('Idoso') && formData.clinicalData.idoso?.consultaMedicaAnualData) {
      items.push({
        id: 'idoso-consulta',
        date: formData.clinicalData.idoso.consultaMedicaAnualData,
        type: 'consulta_puericultura',
        title: 'Consulta Médica Anual do Idoso',
        summary: 'Acompanhamento preventivo sistemático do paciente na terceira idade.'
      });
    }

    // 7. General Patient Consultations (consultasGerais)
    if (formData.clinicalData.consultasGerais) {
      formData.clinicalData.consultasGerais.forEach((c: any, index: number) => {
        if (c.date === undefined) return;
        items.push({
          id: `consulta-local-${index}`,
          date: c.date || '',
          type: 'consulta_geral',
          title: 'Consulta Médica / Enfermagem',
          summary: c.summary || '',
          status: 'Realizada',
          index
        });
      });
    }

    // Sort: items with no date first, then most recent date first
    return items.sort((a, b) => {
      if (!a.date && b.date) return -1;
      if (a.date && !b.date) return 1;
      if (!a.date && !b.date) return 0;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  };

  const allItems = getTimelineItems();

  // Apply Search and Tab Filters
  const filteredItems = allItems.filter(item => {
    // 1. Tab Filters
    if (filterType === 'visitas' && item.type !== 'visita_db' && item.type !== 'visita_local') return false;
    if (filterType === 'consultas' && item.type !== 'consulta_puericultura' && item.type !== 'consulta_prenatal' && item.type !== 'puerperio' && item.type !== 'consulta_geral') return false;
    
    // 2. Text Search
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      const titleMatches = item.title.toLowerCase().includes(term);
      const summaryMatches = item.summary?.toLowerCase().includes(term) || false;
      const dateMatches = formatDate(item.date).includes(term);
      return titleMatches || summaryMatches || dateMatches;
    }
    
    return true;
  });

  // Calculate count metrics for pills
  const counts = {
    todos: allItems.length,
    visitas: allItems.filter(i => i.type === 'visita_db' || i.type === 'visita_local').length,
    consultas: allItems.filter(i => i.type === 'consulta_puericultura' || i.type === 'consulta_prenatal' || i.type === 'puerperio' || i.type === 'consulta_geral').length
  };

  // Helper for type-specific styling
  const getTypeStyling = (type: string, status?: string) => {
    switch (type) {
      case 'cadastro':
        return {
          bg: 'bg-blue-50 dark:bg-blue-950/30',
          border: 'border-blue-100 dark:border-blue-900/50',
          iconBg: 'bg-blue-500 text-white',
          text: 'text-blue-700 dark:text-blue-400',
          icon: UserPlus
        };
      case 'visita_db':
      case 'visita_local':
        if (status === 'Ausente') {
          return {
            bg: 'bg-amber-50 dark:bg-amber-950/20',
            border: 'border-amber-100 dark:border-amber-900/40',
            iconBg: 'bg-amber-500 text-white',
            text: 'text-amber-700 dark:text-amber-400',
            icon: UserX
          };
        }
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-950/20',
          border: 'border-emerald-100 dark:border-emerald-900/40',
          iconBg: 'bg-emerald-500 text-white',
          text: 'text-emerald-700 dark:text-emerald-400',
          icon: Home
        };
      case 'consulta_puericultura':
        return {
          bg: 'bg-purple-50 dark:bg-purple-950/20',
          border: 'border-purple-100 dark:border-purple-900/40',
          iconBg: 'bg-purple-500 text-white',
          text: 'text-purple-700 dark:text-purple-400',
          icon: Baby
        };
      case 'consulta_prenatal':
        return {
          bg: 'bg-pink-50 dark:bg-pink-950/20',
          border: 'border-pink-100 dark:border-pink-900/40',
          iconBg: 'bg-pink-500 text-white',
          text: 'text-pink-700 dark:text-pink-400',
          icon: Heart
        };
      case 'puerperio':
        return {
          bg: 'bg-teal-50 dark:bg-teal-950/20',
          border: 'border-teal-100 dark:border-teal-900/40',
          iconBg: 'bg-teal-500 text-white',
          text: 'text-teal-700 dark:text-teal-400',
          icon: Stethoscope
        };
      case 'consulta_geral':
        return {
          bg: 'bg-indigo-50 dark:bg-indigo-950/20',
          border: 'border-indigo-100 dark:border-indigo-900/40',
          iconBg: 'bg-indigo-500 text-white',
          text: 'text-indigo-700 dark:text-indigo-400',
          icon: Stethoscope
        };
      case 'marco_gestacional':
        return {
          bg: 'bg-sky-50 dark:bg-sky-950/20',
          border: 'border-sky-100 dark:border-sky-900/40',
          iconBg: 'bg-sky-500 text-white',
          text: 'text-sky-700 dark:text-sky-400',
          icon: FileText
        };
      default:
        return {
          bg: 'bg-slate-50 dark:bg-slate-900',
          border: 'border-slate-100 dark:border-slate-800',
          iconBg: 'bg-slate-400 text-white',
          text: 'text-slate-600 dark:text-slate-400',
          icon: History
        };
    }
  };

  const handleStartTodayVisit = () => {
    setFormData((prev: any) => ({
      ...prev,
      visitDate: new Date().toISOString().split('T')[0],
      visitType: 'Rotina',
      visitSummary: ''
    }));
  };

  const handleCancelTodayVisit = () => {
    setFormData((prev: any) => ({
      ...prev,
      visitDate: '',
      visitType: 'Rotina',
      visitSummary: ''
    }));
  };

  // Compile child vaccine counts if child
  const getVaccineStats = () => {
    if (!formData.categories.includes('Criança')) return { total: 0, checked: 0 };
    const vacinas = formData.clinicalData?.crianca?.vacinas || {};
    const total = 24; // standard child schedule in dateUtils has ~24 items
    const checked = Object.values(vacinas).filter(v => v === 'Sim').length;
    return { total, checked };
  };

  const vacStats = getVaccineStats();

  return (
    <section 
      id="secao-visita"
      className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-border dark:border-slate-800 shadow-sm space-y-6"
    >
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white uppercase tracking-tight">Linha do Tempo Clínica</h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Histórico clínico de cuidados e interações ordenadas</p>
          </div>
        </div>

        {/* Tab Switcher for Children (Timeline vs Vaccine Card) */}
        <div className="flex items-center gap-2">
          {formData.categories.includes('Criança') && (
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveTab('timeline')}
                className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all tracking-tight ${
                  activeTab === 'timeline'
                    ? 'bg-white dark:bg-slate-950 text-primary shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                Linha do Tempo
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('vacinas')}
                className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all tracking-tight flex items-center gap-1.5 ${
                  activeTab === 'vacinas'
                    ? 'bg-white dark:bg-slate-950 text-green-600 dark:text-green-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <Syringe className="w-3 h-3" />
                Vacinas ({vacStats.checked}/{vacStats.total})
              </button>
            </div>
          )}

          {!isReadOnly && !formData.visitDate && (
            <button 
              type="button"
              onClick={handleStartTodayVisit}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-[10px] font-bold uppercase transition-all tracking-tight shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Nova Visita Hoje
            </button>
          )}

          {!isReadOnly && (
            <button 
              type="button"
              onClick={() => addDateToList('root', 'consultasGerais')}
              className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-bold uppercase transition-all tracking-tight flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              + Registrar Consulta
            </button>
          )}

          {!isReadOnly && (
            <button 
              type="button"
              onClick={() => addDateToList('root', 'visitasGerais')}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 rounded-lg text-[10px] font-bold uppercase transition-all tracking-tight"
            >
              + Visita Antiga
            </button>
          )}
        </div>
      </div>

      {activeTab === 'timeline' ? (
        <>
          {/* Box de Visita Ativa */}
          {formData.visitDate && (
            <div className="p-5 bg-primary/5 dark:bg-primary/10 rounded-xl border border-primary/20 space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Registrar Nova Visita Domiciliar</h4>
                </div>
                <button
                  type="button"
                  onClick={handleCancelTodayVisit}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Data da Visita</label>
                  <input
                    type="date"
                    disabled={isReadOnly}
                    value={formData.visitDate}
                    onChange={e => setFormData({ ...formData, visitDate: e.target.value })}
                    className="w-full bg-white dark:bg-slate-800 border border-border dark:border-slate-800 rounded-lg px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Tipo de Visita</label>
                  <select
                    disabled={isReadOnly}
                    value={formData.visitType}
                    onChange={e => setFormData({ ...formData, visitType: e.target.value })}
                    className="w-full bg-white dark:bg-slate-800 border border-border dark:border-slate-800 rounded-lg px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-primary/20 text-slate-800 dark:text-white"
                  >
                    <option value="Rotina">Rotina</option>
                    <option value="Acompanhamento">Acompanhamento</option>
                    <option value="Urgência">Urgência</option>
                    <option value="Pós-Parto">Pós-Parto</option>
                    <option value="Recém-Nascido">Recém-Nascido</option>
                    <option value="Ausente">Ausente (Cidadão Ausente)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Anotações da Visita / Conduta Clínica</label>
                <textarea 
                  value={formData.visitSummary || ''}
                  onChange={e => setFormData({...formData, visitSummary: e.target.value})}
                  className="w-full bg-white dark:bg-slate-800 border border-border dark:border-slate-800 rounded-lg p-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 min-h-[100px] shadow-inner" 
                  placeholder="Descreva brevemente o estado de saúde do cidadão, queixas, vacinas aplicadas ou orientações fornecidas."
                />
              </div>
            </div>
          )}

          {/* Filtros e Busca */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl">
            {/* Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setFilterType('todos')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all tracking-tight flex items-center gap-1.5 whitespace-nowrap ${
                  filterType === 'todos'
                    ? 'bg-slate-900 dark:bg-slate-850 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                Todos
                <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-black">
                  {counts.todos}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterType('visitas')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all tracking-tight flex items-center gap-1.5 whitespace-nowrap ${
                  filterType === 'visitas'
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                Visitas ACS
                <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-primary/10 text-primary font-black">
                  {counts.visitas}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterType('consultas')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all tracking-tight flex items-center gap-1.5 whitespace-nowrap ${
                  filterType === 'consultas'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                Consultas UBS
                <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-black">
                  {counts.consultas}
                </span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 max-w-xs self-stretch sm:self-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar notas..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 pl-9 pr-4 text-xs font-semibold focus:ring-2 focus:ring-primary/20 shadow-sm"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary" />
              <p className="text-xs font-semibold">Buscando histórico...</p>
            </div>
          ) : filteredItems.length > 0 ? (
            /* Timeline Vertical */
            <div className="relative pl-8 md:pl-10 space-y-6">
              {/* Vertical line connector */}
              <div className="absolute left-[17px] md:left-[19px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-slate-150 via-slate-200 to-slate-100 dark:from-slate-850 dark:via-slate-800 dark:to-slate-900" />

              {filteredItems.map((item, idx) => {
                const style = getTypeStyling(item.type, item.status);
                const IconComponent = style.icon;
                const isFirst = idx === 0;
                const isExpanded = !!expandedItems[item.id];
                const limit = 160;
                const isLong = item.summary && item.summary.length > limit;
                const displayText = isLong && !isExpanded 
                  ? `${item.summary?.substring(0, limit)}...` 
                  : item.summary;

                return (
                  <div key={item.id} className="relative group animate-in fade-in slide-in-from-left-2 duration-300">
                    {/* Bullet circle */}
                    <div className={`absolute -left-[30px] md:-left-[32px] top-1 w-6.5 h-6.5 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-sm transition-all group-hover:scale-110 z-10 ${style.iconBg} ${
                      isFirst && !formData.visitDate ? 'ring-4 ring-primary/10' : ''
                    }`}>
                      <IconComponent className="w-3 h-3" />
                    </div>

                    {/* Timeline card content */}
                    <div className={`bg-slate-50 dark:bg-slate-900 border ${style.border} rounded-xl p-4.5 shadow-sm hover:shadow-md hover:translate-x-0.5 transition-all duration-300 ${
                      isFirst && !formData.visitDate ? 'ring-2 ring-primary/5 dark:ring-primary/10' : ''
                    }`}>
                      {/* Editing panel if it is a local visit/consultation in edit mode */}
                      {editingLocalIndex === item.index && editingLocalType === (item.type === 'visita_local' ? 'visitasGerais' : 'consultasGerais') ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                              {item.type === 'visita_local' ? 'Editando Visita Antiga' : 'Editando Consulta Registrada'}
                            </h5>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(item.type === 'visita_local' ? 'visitasGerais' : 'consultasGerais', item.index!)}
                                className="p-1.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-md hover:scale-105 transition-all"
                              >
                                <Save className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCancelEdit(item.type === 'visita_local' ? 'visitasGerais' : 'consultasGerais', item.index!)}
                                className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md hover:scale-105 transition-all"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Data da Ocorrência</label>
                            <input
                              type="date"
                              value={editDate}
                              onChange={e => setEditDate(e.target.value)}
                              className="bg-white dark:bg-slate-800 border border-border dark:border-slate-800 rounded px-2 py-1 text-xs font-bold w-full focus:ring-2 focus:ring-primary/20"
                            />
                          </div>
                          {item.type === 'visita_local' && (
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Tipo de Visita</label>
                              <select
                                value={editType}
                                onChange={e => setEditType(e.target.value)}
                                className="bg-white dark:bg-slate-800 border border-border dark:border-slate-800 rounded px-2 py-1 text-xs font-semibold w-full focus:ring-2 focus:ring-primary/20 text-slate-800 dark:text-white"
                              >
                                <option value="Rotina">Rotina</option>
                                <option value="Acompanhamento">Acompanhamento</option>
                                <option value="Urgência">Urgência</option>
                                <option value="Pós-Parto">Pós-Parto</option>
                                <option value="Recém-Nascido">Recém-Nascido</option>
                                <option value="Ausente">Ausente (Cidadão Ausente)</option>
                              </select>
                            </div>
                          )}
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Descrição Clínica</label>
                            <textarea
                              value={editSummary}
                              onChange={e => setEditSummary(e.target.value)}
                              className="bg-white dark:bg-slate-800 border border-border dark:border-slate-800 rounded p-2 text-xs font-medium w-full min-h-[60px] focus:ring-2 focus:ring-primary/20"
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Card Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs font-bold text-slate-850 dark:text-slate-100 uppercase tracking-tight leading-none">
                                {item.title}
                              </h4>
                              {item.status && (
                                <span className={`text-[8.5px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                                  item.status === 'Ausente' 
                                    ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400' 
                                    : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                                }`}>
                                  {item.status}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 px-2 py-0.5 rounded-lg shadow-sm">
                                {formatDate(item.date)}
                              </span>
 
                              {/* Action buttons for Local Visits/Consultations */}
                              {(item.type === 'visita_local' || item.type === 'consulta_geral') && !isReadOnly && (
                                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={() => handleStartEdit(
                                      item.type === 'visita_local' ? 'visitasGerais' : 'consultasGerais', 
                                      item.index!, 
                                      item.originalData || { date: item.date, summary: item.summary }
                                    )}
                                    className="p-1 hover:text-primary transition-colors text-slate-400"
                                    title="Editar"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeDateFromList(
                                      'root', 
                                      item.type === 'visita_local' ? 'visitasGerais' : 'consultasGerais', 
                                      item.index!
                                    )}
                                    className="p-1 hover:text-red-500 transition-colors text-slate-400"
                                    title="Excluir"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Card Body */}
                          {item.summary && (
                            <div className="mt-2.5">
                              <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-medium">
                                {displayText}
                              </p>
                              {isLong && (
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(item.id)}
                                  className="mt-1.5 text-[9.5px] font-black uppercase text-primary tracking-widest flex items-center gap-0.5 hover:text-primary/80"
                                >
                                  {isExpanded ? (
                                    <>
                                      Ocultar Nota <ChevronUp className="w-3 h-3" />
                                    </>
                                  ) : (
                                    <>
                                      Ver Nota Completa <ChevronDown className="w-3 h-3" />
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Estado Vazio de Linha do Tempo */
            <div className="flex flex-col items-center justify-center py-20 text-center bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-border dark:border-slate-800">
              <History className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-3 animate-pulse" />
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Histórico clínico em branco</h4>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 max-w-xs mt-1 leading-relaxed">
                Nenhum evento corresponde ao filtro atual. Adicione visitas antigas ou registre um contato para preencher a linha do tempo.
              </p>
            </div>
          )}
        </>
      ) : (
        /* Cartão Vacinal Tab Content (Apenas Crianças) */
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/40 rounded-xl p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-black uppercase text-green-700 dark:text-green-400 tracking-wider flex items-center gap-2">
                <Syringe className="w-4 h-4" />
                Quadro Nacional de Imunização Infantil
              </h4>
              <p className="text-[10px] text-green-600 dark:text-green-500 font-semibold mt-1 leading-relaxed">
                Acompanhamento vacinal completo da criança. Marque as doses aplicadas na ficha "Acompanhamento da Criança" para preencher este cartão automaticamente.
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 px-4 py-2 border border-green-200 dark:border-green-900 rounded-lg text-center shrink-0 shadow-sm">
              <span className="text-[18px] font-black text-green-600 dark:text-green-400 leading-none">
                {Math.round((vacStats.checked / vacStats.total) * 100)}%
              </span>
              <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mt-0.5">Doses Aplicadas</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* List applied vaccines */}
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl p-4 space-y-3">
              <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Vacinas Aplicadas ({vacStats.checked})
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
                {Object.entries(formData.clinicalData?.crianca?.vacinas || {})
                  .filter(([_, status]) => status === 'Sim')
                  .map(([vId]) => (
                    <div key={vId} className="flex items-center gap-2 bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-100 dark:border-slate-850 shadow-xs">
                      <div className="w-4.5 h-4.5 rounded bg-green-100 dark:bg-green-950 flex items-center justify-center text-green-600">
                        ✓
                      </div>
                      <span className="text-[9.5px] font-extrabold uppercase text-slate-700 dark:text-slate-300 truncate">
                        {vId.replace('_nascer', ' (Ao Nascer)').replace(/([a-zA-Z]+)(\d+)/g, '$1 $2').toUpperCase()}
                      </span>
                    </div>
                  ))}
                {vacStats.checked === 0 && (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 italic py-4">Nenhuma dose registrada como aplicada ainda.</p>
                )}
              </div>
            </div>

            {/* List remaining vaccines */}
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl p-4 space-y-3">
              <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                Doses Pendentes / Não Informadas ({vacStats.total - vacStats.checked})
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
                {/* Find all remaining from standard schedule */}
                {['bcg', 'hepB_nascer', 'penta1', 'vip1', 'pneumo10_1', 'rotavirus1', 'menC1', 'penta2', 'vip2', 'pneumo10_2', 'rotavirus2', 'menC2', 'penta3', 'vip3', 'fa', 'scr1', 'pneumo10_3', 'menC3', 'dtp', 'vipR', 'hepA', 'scrv']
                  .filter(vId => formData.clinicalData?.crianca?.vacinas?.[vId] !== 'Sim')
                  .map(vId => (
                    <div key={vId} className="flex items-center gap-2 bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-100 dark:border-slate-850 shadow-xs opacity-75">
                      <div className="w-4.5 h-4.5 rounded bg-slate-100 dark:bg-slate-850 flex items-center justify-center text-slate-400">
                        •
                      </div>
                      <span className="text-[9.5px] font-extrabold uppercase text-slate-650 dark:text-slate-450 truncate">
                        {vId.replace('_nascer', ' (Ao Nascer)').replace(/([a-zA-Z]+)(\d+)/g, '$1 $2').toUpperCase()}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
