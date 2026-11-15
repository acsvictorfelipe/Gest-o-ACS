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
    <div className="w-full flex flex-col relative h-full font-sans justify-between">
      <style>{`
        .react-calendar {
          width: 100% !important;
          border: none !important;
          background: transparent !important;
          font-family: inherit !important;
          overflow: hidden;
        }
        .react-calendar__viewContainer {
          padding: 0 !important;
        }
        .react-calendar__month-view__weekdays {
          background: transparent !important;
          padding: 6px 0 !important;
          margin-bottom: 3px !important;
          border-bottom: 1px solid var(--color-border) !important;
        }
        .react-calendar__month-view__weekdays__weekday {
          text-decoration: none !important;
          font-size: 10px !important;
          font-weight: 700 !important;
          color: var(--color-text-muted) !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em;
        }
        .react-calendar__month-view__weekdays__weekday abbr {
          text-decoration: none !important;
        }
        .react-calendar__tile {
          min-height: 38px !important;
          height: 39px !important;
          padding: 2px 1px !important;
          margin-bottom: 2px !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: space-between !important;
          border-radius: 8px !important;
          border: 0.5px solid var(--color-border) !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          color: var(--color-text-primary) !important;
          background: var(--color-bg-primary) !important;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .react-calendar__tile:enabled:hover, .react-calendar__tile:enabled:focus {
          background: var(--color-bg-secondary) !important;
        }
        .react-calendar__tile--now {
          background: #f0fdfa !important;
          color: #0f766e !important;
          border-color: #2dd4bf !important;
          font-weight: 800 !important;
        }
        .dark .react-calendar__tile--now {
          background: rgba(19, 78, 74, 0.4) !important;
          color: #5eead4 !important;
          border-color: #14b8a6 !important;
        }
        .react-calendar__tile--active {
          background: #0d9488 !important;
          color: #ffffff !important;
          border-color: #0d9488 !important;
          font-weight: 800 !important;
          box-shadow: 0 1px 2px rgba(0,0,0,0.1) !important;
        }
        .react-calendar__tile--active:enabled:hover, .react-calendar__tile--active:enabled:focus {
          background: #0f766e !important;
        }
        .react-calendar__month-view__days__day--neighboringMonth {
          color: var(--color-text-muted) !important;
          opacity: 0.3;
        }
        .react-calendar__navigation {
          display: none !important;
        }
      `}</style>

      {/* Unified Card Header */}
      <div className="shrink-0 px-3.5 py-2.5 border-b border-border/80 flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
            <CalendarIcon className="w-3.5 h-3.5" />
          </div>
          <div className="truncate">
            <h2 className="font-bold text-xs uppercase tracking-wide text-text-primary truncate">Visitas Realizadas</h2>
            <p className="text-[10px] text-text-muted truncate">Histórico presencial</p>
          </div>
        </div>
        <button
          onClick={handleToday}
          className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 border border-teal-200/70 dark:border-teal-800 hover:bg-teal-100 transition-colors cursor-pointer"
        >
          Hoje
        </button>
      </div>

      {/* Calendar Body */}
      <div className="flex-1 min-h-0 p-3 flex flex-col justify-between overflow-y-auto custom-scrollbar">
        <div className="w-full select-none">
          {/* Month Selector Bar */}
          <div className="flex items-center justify-between bg-bg-primary/90 dark:bg-slate-800 rounded-xl p-1 mb-2.5 border border-border/70">
            <button
              onClick={handlePrevMonth}
              className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-secondary transition-colors cursor-pointer"
              title="Mês anterior"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-bold text-text-primary capitalize">
              {format(activeStartDate, 'MMMM yyyy', { locale: ptBR })}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-secondary transition-colors cursor-pointer"
              title="Próximo mês"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

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

        {/* Bottom Selected Day Status & Compact Legend */}
        <div className="pt-2.5 mt-auto border-t border-border/60 flex flex-col gap-1.5">
          <div className="flex items-center justify-between bg-bg-primary/60 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-xl text-[11px] border border-border/50">
            <span className="text-text-muted truncate">
              <strong className="text-text-primary">
                Dia {format(selectedDate, 'dd')}{isSameDay(selectedDate, new Date()) ? ' (Hoje)' : ''}:
              </strong>{' '}
              {getVisitsForDate(selectedDate).length > 0 
                ? `${getVisitsForDate(selectedDate).length} visita(s) presencial(is)`
                : 'Sem registros'}
            </span>
            <button
              onClick={() => navigate('/pacientes')}
              className="font-semibold text-teal-600 dark:text-teal-400 hover:underline shrink-0 ml-1.5 cursor-pointer text-[10px]"
            >
              + Visita
            </button>
          </div>

          <div className="grid grid-cols-3 gap-x-2 gap-y-0.5 text-[9px] font-medium text-text-muted px-0.5">
            {Object.values(CATEGORY_PALETTE).slice(0, 6).map(item => (
              <span key={item.label} className="inline-flex items-center gap-1 truncate">
                <span className="w-1.5 h-1.5 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: item.primary }} />
                <span className="truncate">{item.label}</span>
              </span>
            ))}
          </div>
        </div>
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
