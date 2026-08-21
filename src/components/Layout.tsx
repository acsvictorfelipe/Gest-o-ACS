import * as React from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Baby, 
  Calendar, 
  Settings, 
  Bell, 
  LogOut, 
  Menu,
  X,
  ChevronDown,
  RefreshCw,
  History,
  Heart,
  Stethoscope,
  Activity,
  Home,
  User,
  ShieldCheck,
  CalendarDays,
  FileText,
  PieChart,
  Moon,
  Sun,
  Wifi,
  WifiOff
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { isAdminRole, isGestorRole } from '../lib/roleUtils';
import { getAgeInMonths, getPatientLastVisitAt } from '../lib/dateUtils';
import { syncService } from '../lib/syncService';
import { motion, AnimatePresence } from 'motion/react';
import { AppUser } from '../types';

import { useNotifications } from '../hooks/useNotifications';
import { NotificationCenter } from './NotificationCenter';

export function Layout({ 
  user, 
  onProfileUpdate, 
  theme, 
  toggleTheme 
}: { 
  user: AppUser | null, 
  onProfileUpdate?: () => void,
  theme: 'light' | 'dark',
  toggleTheme: () => void
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
  const [patientsData, setPatientsData] = React.useState<any[]>([]);
  const [syncQueueLength, setSyncQueueLength] = React.useState(syncService.getQueueLength());
  const [isOnline, setIsOnline] = React.useState(syncService.isOnline());
  const [isSyncing, setIsSyncing] = React.useState(syncService.isSyncing());
  const [lastSyncedAt, setLastSyncedAt] = React.useState<Date | null>(syncService.getLastSyncedAt());

  React.useEffect(() => {
    // Inscreve no syncService para atualizar em tempo real
    const unsubscribe = syncService.subscribe(() => {
      setSyncQueueLength(syncService.getQueueLength());
      setIsSyncing(syncService.isSyncing());
      setIsOnline(syncService.isOnline());
      setLastSyncedAt(syncService.getLastSyncedAt());
    });

    const handleConnectionChange = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener('online', handleConnectionChange);
    window.addEventListener('offline', handleConnectionChange);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleConnectionChange);
      window.removeEventListener('offline', handleConnectionChange);
    };
  }, []);

  React.useEffect(() => {
    const fetchPatients = async () => {
      if (!user) return;
      try {
        let alertQuery = supabase.from('patients').select('*');
        let visitsQuery = supabase.from('visits').select('patient_id, date');
        if (isGestorRole(user.role)) {
          alertQuery = alertQuery.eq('area_color', user.color);
          visitsQuery = visitsQuery.eq('area_color', user.color);
        } else if (!isAdminRole(user.role)) {
          alertQuery = alertQuery.eq('agent_id', user.id);
          visitsQuery = visitsQuery.eq('agent_id', user.id);
        }

        const [patientsRes, visitsRes] = await Promise.all([alertQuery, visitsQuery]);
        if (patientsRes.data) {
          const visitsMap: Record<string, string> = {};
          if (visitsRes.data) {
            visitsRes.data.forEach((v: any) => {
              if (v.patient_id && v.date) {
                const cleanDate = v.date.split('T')[0];
                const current = visitsMap[v.patient_id];
                if (!current || cleanDate > current) {
                  visitsMap[v.patient_id] = cleanDate;
                }
              }
            });
          }

          const reconciledPatients = patientsRes.data.map(p => {
            const dbVisitMax = visitsMap[p.id] || null;
            const currentLastVisit = p.last_visit_at ? p.last_visit_at.split('T')[0] : null;
            if (dbVisitMax && (!currentLastVisit || dbVisitMax > currentLastVisit)) {
              return { ...p, last_visit_at: dbVisitMax };
            }
            return p;
          });

          setPatientsData(reconciledPatients);
        }
      } catch (err) {
        console.warn('Silent fallback for patients fetch in layout:', err);
      }
    };
    fetchPatients();
  }, [user, location.pathname]);

  const { notifications, counts } = useNotifications(patientsData);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const menuItems = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard, path: '/' },
    { id: 'pacientes', label: 'Pacientes', icon: Users, path: '/pacientes', hideForAdmin: true },
    { id: 'gestantes', label: 'Gestantes', icon: Heart, path: '/pacientes?filter=gestantes', hideForAdmin: true },
    { id: 'criancas', label: 'Crianças', icon: Baby, path: '/pacientes?filter=criancas', hideForAdmin: true },
    { id: 'idosos', label: 'Idosos', icon: User, path: '/pacientes?filter=idosos', hideForAdmin: true },
    { id: 'acamados', label: 'Acamados', icon: Activity, path: '/pacientes?filter=acamados', hideForAdmin: true },
    { id: 'domicilios', label: 'Domicílios', icon: Home, path: '/domicilios', hideForAdmin: true },
  ].filter(item => !((user?.role === 'Administrador' || user?.role === 'Gestor') && item.hideForAdmin));

  const sidebarContent = (
    <div className="flex flex-col h-full bg-bg-secondary border-r border-border">
      {/* Brand & Notifications Bell */}
      <div className="p-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-teal-500/30 shrink-0">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-text-primary tracking-tight leading-none truncate">Gestão ACS</h1>
            <p className="text-[10px] text-text-muted font-semibold mt-1 uppercase tracking-widest truncate">Prontuário Digital</p>
          </div>
        </div>
        <button
          onClick={() => setIsNotificationsOpen(true)}
          className="relative p-2.5 rounded-xl hover:bg-bg-primary text-text-muted hover:text-teal-600 dark:hover:text-teal-400 transition-all cursor-pointer"
          title="Central de Notificações"
        >
          <Bell className="w-5 h-5" />
          {counts.total > 0 && (
            <span className={`absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-black text-white flex items-center justify-center border-2 border-bg-secondary ${
              counts.critical > 0 ? 'bg-red-500 animate-pulse' : counts.high > 0 ? 'bg-orange-500' : 'bg-amber-500'
            }`}>
              {counts.total > 99 ? '99+' : counts.total}
            </span>
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
        <div className="mb-4 px-4 text-[11px] font-bold text-text-muted uppercase tracking-widest">Visão Geral</div>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <button
              key={item.id}
              onClick={() => {
                navigate(item.path);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group ${
                isActive 
                  ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 shadow-sm shadow-teal-100/50 dark:shadow-none' 
                  : 'text-text-secondary hover:bg-bg-primary hover:text-text-primary'
              }`}
            >
              <item.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-teal-600' : 'text-text-muted group-hover:text-text-secondary'}`} />
              <span className={`text-[14px] font-semibold truncate ${isActive ? 'text-teal-700 dark:text-teal-400' : 'text-text-secondary group-hover:text-text-primary'}`}>{item.label}</span>
              {isActive && (
                <motion.div 
                  layoutId="active-pill"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-teal-500"
                />
              )}
            </button>
          );
        })}

        {(user?.role !== 'Administrador' && user?.role !== 'Gestor') ? (
          <>
            <div className="mt-8 mb-4 px-4 text-[11px] font-bold text-text-muted uppercase tracking-widest">Relatórios & Exportação</div>
            <button 
              onClick={() => navigate('/relatorios')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all group ${
                location.pathname === '/relatorios' ? 'bg-primary/10 text-primary shadow-sm' : 'text-text-secondary hover:bg-bg-primary hover:text-text-primary'
              }`}
            >
              <PieChart className={`w-5 h-5 transition-colors ${location.pathname === '/relatorios' ? 'text-primary' : 'text-text-muted group-hover:text-text-secondary'}`} />
              <span className={`text-[14px] font-semibold ${location.pathname === '/relatorios' ? 'text-primary' : 'text-text-secondary group-hover:text-text-primary'}`}>Indicadores</span>
            </button>
            <button 
              onClick={() => navigate('/historico')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all group ${
                location.pathname === '/historico' ? 'bg-primary/10 text-primary shadow-sm' : 'text-text-secondary hover:bg-bg-primary hover:text-text-primary'
              }`}
            >
              <History className={`w-5 h-5 transition-colors ${location.pathname === '/historico' ? 'text-primary' : 'text-text-muted group-hover:text-text-secondary'}`} />
              <span className={`text-[14px] font-semibold ${location.pathname === '/historico' ? 'text-primary' : 'text-text-secondary group-hover:text-text-primary'}`}>Histórico de Visitas</span>
            </button>
            <button 
              onClick={() => navigate('/exportar')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all group ${
                location.pathname === '/exportar' ? 'bg-primary/10 text-primary shadow-sm' : 'text-text-secondary hover:bg-bg-primary hover:text-text-primary'
              }`}
            >
              <FileText className={`w-5 h-5 transition-colors ${location.pathname === '/exportar' ? 'text-primary' : 'text-text-muted group-hover:text-text-secondary'}`} />
              <span className={`text-[14px] font-semibold ${location.pathname === '/exportar' ? 'text-primary' : 'text-text-secondary group-hover:text-text-primary'}`}>Exportar Dados</span>
            </button>
          </>
        ) : (
          <>
            <div className="mt-8 mb-4 px-4 text-[11px] font-bold text-text-muted uppercase tracking-widest">Ações & Exportação</div>
            <button 
              onClick={() => navigate('/exportar')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all group ${
                location.pathname === '/exportar' ? 'bg-primary/10 text-primary shadow-sm' : 'text-text-secondary hover:bg-bg-primary hover:text-text-primary'
              }`}
            >
              <FileText className={`w-5 h-5 transition-colors ${location.pathname === '/exportar' ? 'text-primary' : 'text-text-muted group-hover:text-text-secondary'}`} />
              <span className={`text-[14px] font-semibold ${location.pathname === '/exportar' ? 'text-primary' : 'text-text-secondary group-hover:text-text-primary'}`}>Exportar Dados</span>
            </button>
          </>
        )}

        <div className="mt-8 mb-4 px-4 text-[11px] font-bold text-text-muted uppercase tracking-widest">Configurações</div>
        {(user?.role === 'Administrador' || user?.role === 'Gestor') && (
          <button 
            onClick={() => navigate('/usuarios')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all group mb-1 ${
              location.pathname === '/usuarios' ? 'bg-primary/10 text-primary shadow-sm' : 'text-text-secondary hover:bg-bg-primary hover:text-text-primary'
            }`}
          >
            <ShieldCheck className={`w-5 h-5 transition-colors ${location.pathname === '/usuarios' ? 'text-primary' : 'text-text-muted group-hover:text-text-secondary'}`} />
            <span className={`text-[14px] font-semibold ${location.pathname === '/usuarios' ? 'text-primary' : 'text-text-secondary group-hover:text-text-primary'}`}>Painel Administrativo</span>
          </button>
        )}
        <button 
          onClick={() => navigate('/configuracoes')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all group ${
            location.pathname === '/configuracoes' ? 'bg-primary/10 text-primary shadow-sm' : 'text-text-secondary hover:bg-bg-primary hover:text-text-primary'
          }`}
        >
          <Settings className={`w-5 h-5 transition-colors ${location.pathname === '/configuracoes' ? 'text-primary' : 'text-text-muted group-hover:text-text-secondary'}`} />
          <span className={`text-[14px] font-semibold ${location.pathname === '/configuracoes' ? 'text-primary' : 'text-text-secondary group-hover:text-text-primary'}`}>Sistema</span>
        </button>
      </nav>

      {/* User Footer */}
      <div className="p-4 mt-auto">
        <div className="bg-bg-primary rounded-3xl p-4 flex items-center gap-3 border border-border">
           <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center text-white font-bold shadow-lg shadow-teal-500/20 shrink-0">
             {user?.name?.charAt(0).toUpperCase() || 'A'}
           </div>
           <div className="min-w-0">
             <p className="text-[13px] font-bold text-text-primary truncate uppercase leading-none">{user?.name?.split(' ')[0] || 'Agente'}</p>
             <p className="text-[10px] text-text-muted font-semibold mt-1">ACS • Micro {user?.microarea || '00'}</p>
           </div>
           <button 
             onClick={signOut}
             className="ml-auto p-2 text-text-muted hover:text-red-500 transition-colors"
           >
             <LogOut className="w-4 h-4" />
           </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-bg-primary text-text-primary">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-[240px] shrink-0 h-full fixed left-0 top-0 z-40 border-r border-border">
        {sidebarContent}
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-[240px] flex flex-col h-full overflow-hidden">
        {/* Topbar (Mobile Only) */}
        <header className="lg:hidden h-[58px] bg-bg-secondary/90 backdrop-blur-md border-b border-border flex items-center justify-between px-3 sm:px-4 sticky top-0 z-30">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 text-text-secondary rounded-xl hover:bg-bg-primary transition-colors cursor-pointer"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <Stethoscope className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-sm text-text-primary tracking-tight font-headline truncate">
              Gestão ACS
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button 
              onClick={() => setIsNotificationsOpen(true)}
              className="p-2 text-text-muted hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-xl transition-all relative cursor-pointer"
              title="Central de Notificações"
            >
              <Bell className="w-5.5 h-5.5" />
              {counts.total > 0 && (
                <span className={`absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-black text-white flex items-center justify-center border-2 border-bg-secondary ${
                  counts.critical > 0 ? 'bg-red-500 animate-pulse' : counts.high > 0 ? 'bg-orange-500' : 'bg-amber-500'
                }`}>
                  {counts.total > 99 ? '99+' : counts.total}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Page Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-6 lg:p-8 pb-[88px] sm:pb-[100px] lg:pb-8 space-y-4">
          <div className="w-full">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Animated Mobile Sidebar Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" 
              onClick={() => setIsMobileMenuOpen(false)} 
            />
            {/* Drawer */}
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed inset-y-0 left-0 w-80 bg-bg-secondary shadow-2xl z-50 flex flex-col h-full overflow-hidden"
            >
              {sidebarContent}
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="absolute top-4 right-4 p-2 text-text-muted hover:bg-bg-primary rounded-xl"
              >
                <X className="w-6 h-6" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Premium Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 h-[68px] bg-bg-secondary/90 backdrop-blur-lg border-t border-border flex items-center justify-around px-4 pb-safe-bottom z-40 shadow-[0_-8px_24px_rgba(0,0,0,0.04)] dark:shadow-none">
        {(user?.role === 'Administrador'
          ? [
              { id: 'dashboard', label: 'Geral', icon: LayoutDashboard, path: '/' },
              { id: 'usuarios', label: 'Painel', icon: ShieldCheck, path: '/usuarios' },
              { id: 'configuracoes', label: 'Ajustes', icon: Settings, path: '/configuracoes' }
            ]
          : [
              { id: 'dashboard', label: 'Geral', icon: LayoutDashboard, path: '/' },
              { id: 'pacientes', label: 'Pacientes', icon: Users, path: '/pacientes' },
              { id: 'domicilios', label: 'Casas', icon: Home, path: '/domicilios' },
              { id: 'configuracoes', label: 'Ajustes', icon: Settings, path: '/configuracoes' }
            ]
        ).map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-2xl relative transition-all duration-300 shrink-0"
            >
              <item.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-teal-600 dark:text-teal-400' : 'text-text-muted'}`} />
              <span className={`text-[10px] font-extrabold uppercase tracking-wider transition-colors ${isActive ? 'text-teal-700 dark:text-teal-400' : 'text-text-muted'}`}>
                {item.label}
              </span>
              {isActive && (
                <motion.div 
                  layoutId="mobile-active-dot"
                  className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-teal-500"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Floating Offline UX Toast Banner */}
      {!isOnline && (
        <div className="fixed bottom-24 sm:bottom-6 right-6 z-[9999] max-w-sm bg-amber-500 dark:bg-amber-600 text-white rounded-3xl p-5 shadow-2xl border border-amber-400 flex gap-4 items-start animate-in slide-in-from-bottom-5 duration-300">
          <WifiOff className="w-6 h-6 shrink-0 text-amber-100" />
          <div className="min-w-0">
            <h4 className="font-extrabold text-sm uppercase tracking-wider text-amber-50">Modo Offline Ativo</h4>
            <p className="text-[12px] font-medium text-amber-100/90 mt-1 leading-relaxed">
              Você está sem conexão de rede. Suas alterações serão guardadas localmente com segurança e sincronizadas automaticamente quando o sinal retornar!
            </p>
          </div>
        </div>
      )}

      {/* Central de Notificações Inteligente */}
      <NotificationCenter
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        counts={counts}
      />
    </div>
  );
}

