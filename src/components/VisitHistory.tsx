import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  History, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  ChevronRight,
  CheckCircle2,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export function VisitHistory({ user }: { user: any }) {
  const navigate = useNavigate();
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('Todas');

  useEffect(() => {
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
    fetchVisits();
  }, [user.id, user.role, user.color]);

  const filteredVisits = visits.filter(v => {
    const patientName = v.patients?.name || '';
    const matchesSearch = patientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         v.patients?.cns?.includes(searchTerm);
    const matchesType = filterType === 'Todas' || v.type === filterType;
    return matchesSearch && matchesType;
  });

  const visitTypes = ['Todas', 'Rotina', 'Acompanhamento', 'Urgência', 'Pós-Parto', 'Recém-Nascido'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-slate-500" />
          </button>
          <div>
            <h2 className="text-3xl font-extrabold text-primary tracking-tight font-headline">Histórico de Visitas</h2>
            <p className="text-slate-500 mt-1 font-medium">Visualize todas as visitas realizadas no seu território.</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-6">
        <div className="flex items-center gap-2 text-primary mb-2">
          <Filter className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-widest">Filtros de Busca</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar por paciente ou CNS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {visitTypes.map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  filterType === type 
                    ? 'bg-primary text-white shadow-md' 
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-10 h-10 animate-spin mb-4" />
          <p className="font-medium">Carregando histórico...</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Data / Tipo</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Paciente</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Resumo da Visita</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {filteredVisits.length > 0 ? (
                  filteredVisits.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600 dark:text-green-400 shrink-0">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-on-surface">
                              {new Date(v.date).toLocaleDateString('pt-BR')}
                            </p>
                            <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500 dark:text-slate-400 uppercase">
                              {v.type}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                            {v.patients?.name?.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-on-surface">{v.patients?.name}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500">CNS: {v.patients?.cns}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 italic">
                          {v.summary || 'Sem observações registradas.'}
                        </p>
                      </td>
                      <td className="px-8 py-5">
                        <Link 
                          to={`/editar-paciente/${v.patient_id}`}
                          className="p-2 text-slate-300 dark:text-slate-600 hover:text-primary transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
                        >
                          Ver Prontuário
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center text-slate-400 dark:text-slate-500 font-medium">
                      Nenhuma visita encontrada com os filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
