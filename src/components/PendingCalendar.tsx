import * as React from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronRight, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PendingCalendarProps {
  patients: any[];
}

export const PendingCalendar: React.FC<PendingCalendarProps> = ({ patients }) => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  
  const getPendingForDate = (date: Date) => {
    return patients.filter(p => {
      const lastVisit = p.last_visit_at ? new Date(p.last_visit_at) : null;
      if (!lastVisit) return false;
      
      const dueDate = new Date(lastVisit);
      dueDate.setDate(dueDate.getDate() + 30);
      
      return isSameDay(date, dueDate);
    });
  };

  const selectedDayPatients = React.useMemo(() => getPendingForDate(selectedDate), [selectedDate, patients]);

  const getTilesContent = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return null;

    const pendingOnDay = getPendingForDate(date);
    if (pendingOnDay.length === 0) return null;

    const categories = Array.from(new Set(pendingOnDay.flatMap(p => p.categories || [])));
    const count = pendingOnDay.length;

    return (
      <div className="flex flex-col items-center mt-1 w-full">
        <div className="flex flex-wrap justify-center gap-0.5">
          {categories.includes('Criança') && <div className="w-1 h-1 rounded-full bg-blue-500" />}
          {categories.includes('Gestante') && <div className="w-1 h-1 rounded-full bg-pink-500" />}
          {categories.includes('Idoso') && <div className="w-1 h-1 rounded-full bg-amber-500" />}
          {categories.includes('Hipertenso') && <div className="w-1 h-1 rounded-full bg-red-500" />}
          {(categories.includes('Diabético') || categories.includes('Diabetico')) && <div className="w-1 h-1 rounded-full bg-purple-500" />}
        </div>
        {count > 3 && (
          <span className="text-[8px] font-black text-slate-400 mt-0.5">+{count - 3}</span>
        )}
      </div>
    );
  };

  return (
    <div className="w-full space-y-6">
      <style>{`
        .react-calendar {
          width: 100% !important;
          border: none !important;
          background: transparent !important;
          font-family: inherit !important;
        }
        .react-calendar__tile {
          padding: 0.5rem 0.25rem !important;
          height: 60px !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: flex-start !important;
          border-radius: 12px !important;
          font-size: 0.75rem !important;
          font-weight: 800 !important;
          color: #94a3b8 !important;
          transition: all 0.2s;
        }
        .react-calendar__tile:hover {
          background: #f1f5f9 !important;
          transform: translateY(-2px);
          color: #14b8a6 !important;
        }
        .react-calendar__tile--now {
          background: rgba(20, 184, 166, 0.1) !important;
          color: #14b8a6 !important;
        }
        .react-calendar__tile--active {
          background: #14b8a6 !important;
          color: white !important;
          box-shadow: 0 4px 12px rgba(20, 184, 166, 0.3) !important;
        }
        .react-calendar__tile--active:enabled:hover, .react-calendar__tile--active:enabled:focus {
          background: #14b8a6 !important;
        }
        .react-calendar__navigation button {
          font-weight: 900 !important;
          text-transform: capitalize !important;
          color: #0f172a !important;
          font-size: 14px !important;
        }
        .react-calendar__navigation button:hover {
          background: #f1f5f9 !important;
        }
        .react-calendar__month-view__weekdays__weekday {
          text-decoration: none !important;
          font-size: 0.6rem !important;
          font-weight: 900 !important;
          text-transform: uppercase !important;
          color: #64748b !important;
          padding-bottom: 0.5rem !important;
        }
        .react-calendar__month-view__days__day--neighboringMonth {
          opacity: 0.2;
        }
      `}</style>
      
      <div className="bg-slate-50 p-2 rounded-2xl border border-slate-200">
        <Calendar 
          onChange={(val) => {
            const date = val as Date;
            setSelectedDate(date);
          }} 
          value={selectedDate}
          locale="pt-BR"
          tileContent={getTilesContent}
        />
      </div>

      {selectedDayPatients.length > 0 ? (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <h6 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 flex justify-between items-center tracking-widest">
            <span>Pendências em {format(selectedDate, 'dd/MM', { locale: ptBR })}</span>
            <span className="bg-[#14B8A6]/20 text-[#14B8A6] px-2 py-0.5 rounded-full">{selectedDayPatients.length}</span>
          </h6>
          <div className="max-h-[200px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
            {selectedDayPatients.map(p => (
              <div 
                key={p.id}
                onClick={() => navigate(`/editar-paciente/${p.id}`)}
                className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-[#14B8A6]/50 cursor-pointer group transition-all shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-[#14B8A6]/20 group-hover:text-[#14B8A6] transition-colors">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-slate-900 truncate">{p.name}</p>
                    <div className="flex gap-1 mt-0.5">
                      {p.categories?.slice(0, 1).map((c: string) => (
                        <span key={c} className="text-[8px] font-black uppercase text-slate-400">{c}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#14B8A6] transition-colors" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-tight italic opacity-50">Nenhuma pendência prevista para este dia</p>
        </div>
      )}
      
      <div className="grid grid-cols-3 gap-2 px-1">
        {[
          { color: 'bg-blue-500', label: 'Criança' },
          { color: 'bg-pink-500', label: 'Gestante' },
          { color: 'bg-amber-500', label: 'Idoso' },
          { color: 'bg-red-500', label: 'Hipertenso' },
          { color: 'bg-purple-500', label: 'Diabético' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${item.color}`} />
            <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter truncate">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
