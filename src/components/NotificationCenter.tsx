import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Bell,
  Clock,
  AlertTriangle,
  Syringe,
  Pill,
  Baby,
  Heart,
  ChevronRight,
  Filter,
  CheckCircle2,
  Timer
} from 'lucide-react';
import { AppNotification, NotificationType, NotificationPriority } from '../hooks/useNotifications';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  counts: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    byType: Record<NotificationType, number>;
  };
}

type FilterTab = 'all' | 'visits' | 'vaccines' | 'prescriptions' | 'gestantes';

const PRIORITY_CONFIG: Record<NotificationPriority, { label: string; bgClass: string; borderClass: string; textClass: string; dotClass: string }> = {
  critical: {
    label: 'Crítico',
    bgClass: 'bg-red-50 dark:bg-red-950/30',
    borderClass: 'border-red-200 dark:border-red-900/50',
    textClass: 'text-red-700 dark:text-red-400',
    dotClass: 'bg-red-500',
  },
  high: {
    label: 'Alta',
    bgClass: 'bg-orange-50 dark:bg-orange-950/30',
    borderClass: 'border-orange-200 dark:border-orange-900/50',
    textClass: 'text-orange-700 dark:text-orange-400',
    dotClass: 'bg-orange-500',
  },
  medium: {
    label: 'Atenção',
    bgClass: 'bg-amber-50 dark:bg-amber-950/30',
    borderClass: 'border-amber-200 dark:border-amber-900/50',
    textClass: 'text-amber-700 dark:text-amber-400',
    dotClass: 'bg-amber-500',
  },
  low: {
    label: 'Baixa',
    bgClass: 'bg-blue-50 dark:bg-blue-950/30',
    borderClass: 'border-blue-200 dark:border-blue-900/50',
    textClass: 'text-blue-700 dark:text-blue-400',
    dotClass: 'bg-blue-500',
  },
};

const TYPE_ICON: Record<NotificationType, React.ElementType> = {
  visit_overdue: AlertTriangle,
  visit_expiring: Timer,
  vaccine_late: Syringe,
  prescription_expiring: Pill,
  gestante_pending: Heart,
  baby_no_visit: Baby,
};

const FILTER_TABS: { key: FilterTab; label: string; types: NotificationType[] }[] = [
  { key: 'all', label: 'Todas', types: [] },
  { key: 'visits', label: 'Visitas', types: ['visit_overdue', 'visit_expiring', 'baby_no_visit'] },
  { key: 'vaccines', label: 'Vacinas', types: ['vaccine_late'] },
  { key: 'prescriptions', label: 'Receitas', types: ['prescription_expiring'] },
  { key: 'gestantes', label: 'Gestantes', types: ['gestante_pending'] },
];

export function NotificationCenter({ isOpen, onClose, notifications, counts }: NotificationCenterProps) {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return notifications;
    const tab = FILTER_TABS.find((t) => t.key === activeFilter);
    if (!tab) return notifications;
    return notifications.filter((n) => tab.types.includes(n.type));
  }, [notifications, activeFilter]);

  const groupedByPriority = useMemo(() => {
    const groups: Record<NotificationPriority, AppNotification[]> = {
      critical: [],
      high: [],
      medium: [],
      low: [],
    };
    filtered.forEach((n) => groups[n.priority].push(n));
    return groups;
  }, [filtered]);

  const handleItemClick = (n: AppNotification) => {
    navigate(n.actionRoute);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 z-[61] h-full w-full max-w-md bg-bg-secondary dark:bg-slate-900 shadow-2xl border-l border-border dark:border-slate-800 animate-in slide-in-from-right duration-300 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-text-primary font-headline tracking-tight">Notificações</h2>
              <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">
                {counts.total} pendência{counts.total !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-bg-primary rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Priority Summary */}
        {counts.total > 0 && (
          <div className="flex items-center gap-2 px-5 py-2.5 border-b border-border dark:border-slate-800 shrink-0">
            {counts.critical > 0 && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-900/50">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                {counts.critical} crítico{counts.critical !== 1 ? 's' : ''}
              </span>
            )}
            {counts.high > 0 && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 px-2.5 py-1 rounded-lg border border-orange-200 dark:border-orange-900/50">
                {counts.high} alta
              </span>
            )}
            {counts.medium > 0 && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-900/50">
                {counts.medium} atenção
              </span>
            )}
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 px-5 py-2.5 border-b border-border dark:border-slate-800 overflow-x-auto scrollbar-hide shrink-0">
          {FILTER_TABS.map((tab) => {
            const tabCount =
              tab.key === 'all'
                ? counts.total
                : tab.types.reduce((acc, t) => acc + (counts.byType[t] || 0), 0);
            return (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap shrink-0 ${
                  activeFilter === tab.key
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-bg-primary dark:bg-slate-800 text-text-secondary hover:text-text-primary'
                }`}
              >
                {tab.label}
                {tabCount > 0 && (
                  <span className={`ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full font-black ${
                    activeFilter === tab.key
                      ? 'bg-white/20 text-white'
                      : 'bg-primary/10 text-primary'
                  }`}>
                    {tabCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-950/30 text-green-500 dark:text-green-400 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-text-primary mb-1">Tudo em dia! 🎉</h3>
              <p className="text-xs text-text-muted max-w-[220px]">
                Nenhuma pendência encontrada nesta categoria. Continue o ótimo trabalho!
              </p>
            </div>
          ) : (
            (['critical', 'high', 'medium', 'low'] as NotificationPriority[]).map((priority) => {
              const group = groupedByPriority[priority];
              if (group.length === 0) return null;
              const config = PRIORITY_CONFIG[priority];

              return (
                <div key={priority}>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span className={`w-2 h-2 rounded-full ${config.dotClass} ${priority === 'critical' ? 'animate-pulse' : ''}`} />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${config.textClass}`}>
                      {config.label} ({group.length})
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {group.map((n) => {
                      const Icon = TYPE_ICON[n.type];
                      return (
                        <button
                          key={n.id}
                          onClick={() => handleItemClick(n)}
                          className={`w-full text-left p-3 rounded-xl border ${config.borderClass} ${config.bgClass} hover:shadow-sm transition-all group active:scale-[0.98]`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-lg ${config.bgClass} border ${config.borderClass} ${config.textClass} flex items-center justify-center shrink-0 mt-0.5`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-bold text-text-primary truncate">{n.patientName}</p>
                                <ChevronRight className="w-3.5 h-3.5 text-text-muted shrink-0 group-hover:translate-x-0.5 transition-transform" />
                              </div>
                              <p className={`text-[11px] font-bold mt-0.5 ${config.textClass}`}>{n.message}</p>
                              <p className="text-[10px] text-text-muted mt-0.5 truncate">{n.detail}</p>
                              <span className="inline-block mt-1 text-[9px] font-bold px-2 py-0.5 rounded bg-white/60 dark:bg-slate-800/60 text-text-secondary border border-border/50 dark:border-slate-700/50">
                                {n.category}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
