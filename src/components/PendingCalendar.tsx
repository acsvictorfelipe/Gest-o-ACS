import * as React from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, X, CreditCard, Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UI_CONFIG, CATEGORY_PALETTE } from '../constants';
import { motion, AnimatePresence } from 'motion/react';

interface PendingCalendarProps {
  visits: any[];
  patients: any[];
}

export const PendingCalendar: React.FC<PendingCalendarProps> = ({ visits, patients }) => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [activeStartDate, setActiveStartDate] = React.useState(new Date());
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [modalVisits, setModalVisits] = React.useState<any[]>([]);

  // Filter ONLY completed visits
  const completedVisits = React.useMemo(() => {
    if (!Array.isArray(visits)) return [];
    return visits.filter(v => {
      if (!v || !v.date) return false;
      if (v.status && !['completed', 'done', 'realizada'].includes(v.status.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [visits]);

  const getVisitsForDate = (date: Date) => {
    return completedVisits.filter(v => {
      if (!v.date) return false;
      const cleanDateStr = v.date.includes('T') ? v.date.split('T')[0] : v.date;
      const parts = cleanDateStr.split('-');
      if (parts.length !== 3) return false;

      const visitDate = new Date(
        parseInt(parts[0]),
        parseInt(parts[1]) - 1,
        parseInt(parts[2]),
        12, 0, 0
      );

      return isSameDay(date, visitDate);
    });
  };

  const getTilesContent = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return null;

    const visitsOnDay = getVisitsForDate(date);
    if (visitsOnDay.length === 0) return null;

    const categories: string[] = Array.from(new Set<string>(
      visitsOnDay.flatMap(v => {
        const p = patients.find(p => p.id === v.patient_id);
        return (p?.categories || []) as string[];
      })
    ));

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
      <div className="flex justify-center items-center gap-0.5 mt-auto pb-1">
        {activeDots.slice(0, 4).map((dot, i) => (
          <span key={i} className="w-1.5 h-1.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: dot.color }} />
        ))}
        {visitsOnDay.length > 0 && activeDots.length === 0 && (
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0 shadow-sm" />
        )}
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
    const dayVisits = getVisitsForDate(date);
    if (dayVisits.length > 0) {
      setModalVisits(dayVisits);
      setSelectedDate(date);
      setIsModalOpen(true);
    } else {
      setSelectedDate(date);
    }
  };

  return (
    <div className="w-full flex flex-col relative h-full font-sans">
      <style>{`
        .react-calendar {
          width: 100% !important;
          border: 1px solid var(--color-border) !important;
          border-radius: 20px !important;
          background: var(--color-bg-secondary) !important;
          font-family: inherit !important;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }
        .react-calendar__viewContainer {
          padding: 0 !important;
        }
        .react-calendar__month-view__weekdays {
          background: var(--color-bg-primary) !important;
          padding: 6px 0 !important;
          border-bottom: 1px solid var(--color-border) !important;
        }
        .react-calendar__month-view__weekdays__weekday {
          text-decoration: none !important;
          font-size: 10px !important;
          font-weight: 800 !important;
          color: var(--color-text-muted) !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em;
        }
        .react-calendar__month-view__weekdays__weekday abbr {
          text-decoration: none !important;
        }
        .react-calendar__tile {
          min-height: 38px !important;
          height: 38px !important;
          padding: 2px 1px !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: space-between !important;
          border: 0.5px solid var(--color-border) !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          color: var(--color-text-primary) !important;
          background: var(--color-bg-secondary) !important;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .react-calendar__tile:enabled:hover, .react-calendar__tile:enabled:focus {
          background: var(--color-bg-primary) !important;
        }
        .react-calendar__tile--now {
          background: var(--color-bg-primary) !important;
          color: var(--color-primary) !important;
          font-weight: 900 !important;
        }
        .react-calendar__tile--active {
          background: var(--color-bg-secondary) !important;
          color: var(--color-text-primary) !important;
          border: 2px solid #0d9488 !important;
          border-radius: 10px !important;
          z-index: 10;
        }
        .react-calendar__tile--active:enabled:hover, .react-calendar__tile--active:enabled:focus {
          background: var(--color-bg-secondary) !important;
        }
        .react-calendar__month-view__days__day--neighboringMonth {
          color: var(--color-text-muted) !important;
          opacity: 0.25;
        }
        .react-calendar__navigation {
          display: none !important;
        }
        @media (min-width: 1024px) {
          .react-calendar {
            height: 100% !important;
            display: flex !important;
            flex-direction: column !important;
          }
          .react-calendar__viewContainer {
            flex: 1 !important;
            display: flex !important;
            flex-direction: column !important;
          }
          .react-calendar__month-view {
            flex: 1 !important;
            display: flex !important;
            flex-direction: column !important;
          }
          .react-calendar__month-view > div {
            flex: 1 !important;
            display: flex !important;
            flex-direction: column !important;
          }
          .react-calendar__month-view__days {
            flex: 1 !important;
            display: grid !important;
            grid-template-columns: repeat(7, 1fr) !important;
            grid-auto-rows: 1fr !important;
          }
          .react-calendar__tile {
            height: 100% !important;
            min-height: 48px !important;
            padding: 4px 2px !important;
          }
        }
      `}</style>

      {/* Custom Header Navigation */}
      <div className="flex items-center justify-between mb-3 shrink-0 px-1 gap-2 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-text-primary uppercase tracking-tight truncate">Visitas Realizadas</h3>
            <p className="text-[9px] text-text-muted font-bold">Histórico de atendimento presencial</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <div className="flex items-center gap-1 bg-bg-primary dark:bg-slate-800/40 rounded-xl p-1 border border-border shrink-0">
            <button onClick={handlePrevMonth} className="p-1 text-text-muted hover:text-text-primary hover:bg-bg-secondary rounded-lg transition-colors cursor-pointer">
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-[11px] font-black text-text-primary capitalize px-2 min-w-[80px] text-center">
              {format(activeStartDate, 'MMMM yyyy', { locale: ptBR })}
            </span>

            <button onClick={handleNextMonth} className="p-1 text-text-muted hover:text-text-primary hover:bg-bg-secondary rounded-lg transition-colors cursor-pointer">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleToday}
            className="px-2.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/60 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 text-[10px] font-extrabold transition-colors shrink-0 cursor-pointer shadow-sm"
          >
            Hoje
          </button>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="flex-1 min-h-[260px] sm:min-h-[300px]">
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

      {/* Category Legend Bar */}
      <div className="mt-3 flex flex-wrap justify-center items-center gap-x-3 gap-y-1 px-1 shrink-0 pt-2 border-t border-border/40">
        {Object.values(CATEGORY_PALETTE).slice(0, 6).map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: item.primary }} />
            <span className="text-[9px] font-extrabold text-text-muted uppercase tracking-wider">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Day Details Popup Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <div className="absolute inset-0" onClick={() => setIsModalOpen(false)} />
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="bg-bg-secondary w-full max-w-md rounded-3xl shadow-2xl border border-border flex flex-col relative z-10 overflow-hidden max-h-[85vh]"
            >
              <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-bg-primary/50">
                <div className="flex items-center gap-2.5 text-teal-600 dark:text-teal-400">
                  <CheckCircle2 className="w-5 h-5" />
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-tight text-text-primary">Visitas Realizadas</h4>
                    <p className="text-[10px] text-text-muted font-bold">
                      {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 hover:bg-bg-primary rounded-xl text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {modalVisits.map((v, idx) => {
                  const p = patients.find(pat => pat.id === v.patient_id);
                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl border border-border bg-bg-primary/40 dark:bg-slate-800/20 hover:bg-bg-primary transition-all space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        {p ? (
                          <button
                            onClick={() => {
                              navigate(`/editar-paciente/${p.id}`);
                              setIsModalOpen(false);
                            }}
                            className="text-xs font-black text-teal-600 dark:text-teal-400 hover:underline transition-colors text-left truncate max-w-[200px]"
                            title="Acessar perfil do paciente"
                          >
                            {p.name}
                          </button>
                        ) : (
                          <span className="text-xs font-black text-text-muted">Cidadão Excluído</span>
                        )}
                        <div className="flex gap-1 shrink-0 flex-wrap justify-end">
                          <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-200 dark:border-teal-900/40">
                            {v.type || 'Visita'}
                          </span>
                        </div>
                      </div>

                      {v.summary && (
                        <p className="text-xs font-medium text-text-secondary bg-bg-secondary p-2.5 rounded-xl border border-border/50 leading-relaxed">
                          "{v.summary}"
                        </p>
                      )}

                      <div className="flex items-center gap-1.5 text-text-muted pt-1">
                        <CreditCard className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                        <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300 truncate">
                          {p?.cns ? `CNS: ${p.cns}` : 'CNS não informado'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3.5 bg-bg-primary border-t border-border text-center">
                <p className="text-[11px] font-extrabold text-teal-700 dark:text-teal-300">
                  {modalVisits.length} visita(s) realizada(s) nesta data
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
