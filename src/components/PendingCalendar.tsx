import * as React from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, User, X, MapPin, Calendar as CalendarIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UI_CONFIG, CATEGORY_PALETTE } from '../constants';
import { motion, AnimatePresence } from 'motion/react';

interface PendingCalendarProps {
  patients: any[];
}

export const PendingCalendar: React.FC<PendingCalendarProps> = ({ patients }) => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [activeStartDate, setActiveStartDate] = React.useState(new Date());
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [modalPatients, setModalPatients] = React.useState<any[]>([]);
  
  const getPendingForDate = (date: Date) => {
    return patients.filter(p => {
      const lastVisit = p.last_visit_at ? new Date(p.last_visit_at) : null;
      if (!lastVisit) return false;
      
      const dueDate = new Date(lastVisit);
      dueDate.setDate(dueDate.getDate() + 30);
      
      return isSameDay(date, dueDate);
    });
  };

  const getTilesContent = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return null;

    const pendingOnDay = getPendingForDate(date);
    if (pendingOnDay.length === 0) return null;

    const categories: string[] = Array.from(new Set<string>(pendingOnDay.flatMap(p => (p.categories || []) as string[])));
    
    const dots = [
      { key: 'Criança', color: CATEGORY_PALETTE.crianca.primary },
      { key: 'Gestante', color: CATEGORY_PALETTE.gestante.primary },
      { key: 'Idoso', color: CATEGORY_PALETTE.idoso.primary },
      { key: 'Hipertenso', color: CATEGORY_PALETTE.hipertenso.primary },
      { key: 'Diabético', color: CATEGORY_PALETTE.diabetico.primary },
      { key: 'Outros', color: CATEGORY_PALETTE.outros.primary }
    ];

    const activeDots = dots.filter(d => {
      if (d.key === 'Outros') {
        return categories.some(c => !['Criança', 'Gestante', 'Idoso', 'Hipertenso', 'Diabético', 'Diabetico'].includes(c));
      }
      if (d.key === 'Diabético') return categories.includes('Diabético') || categories.includes('Diabetico');
      return categories.includes(d.key);
    });

    return (
      <div className="flex justify-center gap-0.5 mt-auto pb-1">
        {activeDots.slice(0, 4).map((dot, i) => (
          <div key={i} className="w-1 h-1 rounded-full" style={{ backgroundColor: dot.color }} />
        ))}
      </div>
    );
  };

  const handlePrevMonth = () => setActiveStartDate(subMonths(activeStartDate, 1));
  const handleNextMonth = () => setActiveStartDate(addMonths(activeStartDate, 1));
  const handleToday = () => {
    const today = new Date();
    setActiveStartDate(today);
    setSelectedDate(today);
  };

  const handleDateClick = (date: Date) => {
    const pending = getPendingForDate(date);
    if (pending.length > 0) {
      setModalPatients(pending);
      setSelectedDate(date);
      setIsModalOpen(true);
    } else {
      setSelectedDate(date);
    }
  };

  return (
    <div className="w-full flex flex-col relative h-full">
      <style>{`
        .react-calendar {
          width: 100% !important;
          border: 1px solid var(--color-border) !important;
          border-radius: 16px !important;
          background: var(--color-bg-secondary) !important;
          font-family: inherit !important;
          overflow: hidden;
        }
        .react-calendar__viewContainer {
          padding: 0 !important;
        }
        .react-calendar__month-view__weekdays {
          background: var(--color-bg-secondary) !important;
          padding: 2px 0 !important;
          border-bottom: 1px solid var(--color-border) !important;
        }
        .react-calendar__month-view__weekdays__weekday {
          text-decoration: none !important;
          font-size: 9px !important;
          font-weight: 700 !important;
          color: var(--color-text-muted) !important;
          text-transform: capitalize !important;
        }
        .react-calendar__month-view__weekdays__weekday abbr {
          text-decoration: none !important;
        }
        .react-calendar__tile {
          height: 32px !important;
          padding: 1px !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          border: 0.25px solid var(--color-bg-primary) !important;
          font-size: 10px !important;
          font-weight: 700 !important;
          color: var(--color-text-primary) !important;
          background: var(--color-bg-secondary) !important;
          cursor: pointer;
        }
        .react-calendar__tile:enabled:hover, .react-calendar__tile:enabled:focus {
          background: var(--color-bg-primary) !important;
        }
        .react-calendar__tile--now {
          background: var(--color-bg-secondary) !important;
          color: var(--color-primary) !important;
          font-weight: 900 !important;
        }
        .react-calendar__tile--active {
          background: var(--color-bg-secondary) !important;
          color: var(--color-text-primary) !important;
          border: 1.5px solid var(--color-primary) !important;
          border-radius: 8px !important;
          z-index: 10;
        }
        .react-calendar__tile--active:enabled:hover, .react-calendar__tile--active:enabled:focus {
          background: var(--color-bg-secondary) !important;
        }
        .react-calendar__month-view__days__day--neighboringMonth {
          color: var(--color-text-muted) !important;
          opacity: 0.3;
        }
        .react-calendar__navigation {
          display: none !important;
        }
      `}</style>
      
      {/* Custom Header - Highly Compact Single Row */}
      <div className="flex items-center justify-between mb-2.5 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-black text-text-primary uppercase tracking-tight truncate">Pendências</h3>
        </div>
        
        <div className="flex items-center gap-1 bg-bg-primary/50 dark:bg-slate-800/20 rounded-xl p-0.5 border border-border/60 shrink-0">
          <button onClick={handlePrevMonth} className="p-0.5 text-text-muted hover:text-text-primary hover:bg-bg-primary rounded-lg transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          
          <span className="text-[10px] font-black text-text-secondary capitalize px-1 min-w-[70px] text-center">
            {format(activeStartDate, 'MMM yy', { locale: ptBR })}
          </span>

          <button onClick={handleNextMonth} className="p-0.5 text-text-muted hover:text-text-primary hover:bg-bg-primary rounded-lg transition-colors">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <button 
          onClick={handleToday}
          className="px-2 py-0.5 rounded-lg border border-teal-200 dark:border-teal-900/30 text-teal-600 dark:text-teal-400 text-[9px] font-bold hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors shrink-0"
        >
          Hoje
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 min-h-0">
        <Calendar 
          onClickDay={handleDateClick}
          activeStartDate={activeStartDate}
          onActiveStartDateChange={({ activeStartDate: newDate }) => newDate && setActiveStartDate(newDate)}
          value={selectedDate}
          locale="pt-BR"
          tileContent={getTilesContent}
          showNavigation={false}
        />
      </div>

      {/* Legend */}
      <div className="mt-2.5 flex flex-wrap justify-center gap-x-2.5 gap-y-1 px-1 shrink-0">
        {Object.values(CATEGORY_PALETTE).slice(0, 6).map(item => (
          <div key={item.label} className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.primary }} />
            <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Day Details Popup */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] flex items-center justify-center p-2"
          >
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] rounded-2xl" onClick={() => setIsModalOpen(false)} />
            <motion.div 
              initial={{ scale: 0.9, y: 10, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 10, opacity: 0 }}
              className="bg-bg-secondary w-full max-h-[90%] rounded-2xl shadow-2xl border border-border flex flex-col relative z-10 overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-bg-primary/50">
                <div className="flex items-center gap-2 text-teal-600">
                  <CalendarIcon className="w-4 h-4" />
                  <span className="text-[13px] font-black uppercase tracking-tight">
                    {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                  </span>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-bg-primary rounded-lg transition-colors">
                  <X className="w-4 h-4 text-text-muted" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                {modalPatients.map((p, idx) => (
                  <div 
                    key={idx}
                    onClick={() => {
                      navigate(`/pacientes?search=${p.name}`);
                      setIsModalOpen(false);
                    }}
                    className="p-3 rounded-xl border border-border hover:border-teal-100 dark:hover:border-teal-900/30 hover:bg-teal-50/30 dark:hover:bg-teal-900/10 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[13px] font-black text-text-primary group-hover:text-teal-600 truncate max-w-[150px]">{p.name}</span>
                      <div className="flex gap-1">
                        {p.categories?.slice(0, 1).map((cat: string) => {
                          const categoryKey = cat.toLowerCase().includes('criança') ? 'criancas' :
                                             cat.toLowerCase().includes('gestante') ? 'gestantes' :
                                             cat.toLowerCase().includes('idoso') ? 'idosos' :
                                             cat.toLowerCase().includes('hipertenso') ? 'hipertensos' :
                                             cat.toLowerCase().includes('diabético') || cat.toLowerCase().includes('diabetico') ? 'diabeticos' :
                                             'outros';
                          const config = (UI_CONFIG.categorias as any)[categoryKey] || UI_CONFIG.categorias.outros;
                          return (
                            <span key={cat} className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase" style={{ backgroundColor: config.primary, color: '#fff' }}>
                              {cat}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-text-muted">
                      <MapPin className="w-3 h-3" />
                      <span className="text-[10px] font-bold">{p.address || 'Endereço não informado'}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-bg-primary border-t border-border text-center">
                 <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                   {modalPatients.length} visitas previstas
                 </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
