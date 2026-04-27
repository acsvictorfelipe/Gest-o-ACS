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

import { formatDate } from '../lib/dateUtils';

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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <header className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Histórico de Visitas</h2>
          <p className="text-sm text-slate-500 font-medium tracking-tight">Visualize o registro completo das visitas domiciliares.</p>
        </header>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar lg:pb-0">
          {visitTypes.map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all tracking-tight whitespace-nowrap ${
                filterType === type 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative group max-w-2xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
        <input 
          type="text" 
          placeholder="Pesquisar por paciente ou CNS..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg py-2.5 pl-11 pr-6 shadow-sm focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium text-slate-900 dark:text-white"
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary" />
          <p className="text-sm font-medium">Carregando dados...</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Data / Tipo</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Paciente</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Resumo</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredVisits.length > 0 ? (
                  filteredVisits.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group cursor-pointer" onClick={() => navigate(`/editar-paciente/${v.patient_id}`)}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 shrink-0">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">
                              {formatDate(v.date)}
                            </p>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                              {v.type}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px] shrink-0 uppercase">
                            {v.patients?.name?.substring(0, 2)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">{v.patients?.name}</p>
                            <p className="text-[10px] text-slate-500 font-medium">CNS: {v.patients?.cns}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1 italic font-medium">
                          {v.summary || 'Sem observações registradas.'}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end text-primary gap-1 group-hover:translate-x-1 transition-transform">
                          <span className="text-[10px] font-bold uppercase tracking-tight">Ver Perfil</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-8 py-24 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <History className="w-8 h-8 text-slate-200" />
                        <p className="text-sm font-medium text-slate-400">Nenhuma visita encontrada.</p>
                      </div>
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
