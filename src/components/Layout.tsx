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
import { getAgeInMonths } from '../lib/dateUtils';
import { syncService } from '../lib/syncService';
import { motion, AnimatePresence } from 'motion/react';

export function Layout({ 
  user, 
  onProfileUpdate, 
  theme, 
  toggleTheme 
}: { 
  user: any, 
  onProfileUpdate?: () => void,
  theme: 'light' | 'dark',
  toggleTheme: () => void
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [criticalAlerts, setCriticalAlerts] = React.useState<any[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
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
    const fetchAlerts = async () => {
      if (!user) return;
      let alertQuery = supabase.from('patients').select('*');
      if (user.role === 'Gestor') {
        alertQuery = alertQuery.eq('area_color', user.color);
      } else if (user.role !== 'Administrador') {
        alertQuery = alertQuery.eq('agent_id', user.id);
      }
      const { data } = await alertQuery;
      if (data) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const pending = data.filter(p => {
          if (!p.categories?.includes('Criança') || !p.birth_date) return false;
          const age = getAgeInMonths(p.birth_date);
          if (age > 6) return false;
          const lastVisit = p.last_visit_at ? new Date(p.last_visit_at) : null;
          return !lastVisit || lastVisit < thirtyDaysAgo;
        });
        setCriticalAlerts(pending);
      }
    };
    fetchAlerts();
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const menuItems = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard, path: '/' },
    { id: 'pacientes', label: 'Pacientes', icon: Users, path: '/pacientes' },
    { id: 'gestantes', label: 'Gestantes', icon: Heart, path: '/pacientes?filter=gestantes' },
    { id: 'criancas', label: 'Crianças', icon: Baby, path: '/pacientes?filter=criancas' },
    { id: 'idosos', label: 'Idosos', icon: User, path: '/pacientes?filter=idosos' },
    { id: 'acamados', label: 'Acamados', icon: Activity, path: '/pacientes?filter=acamados' },
    { id: 'domicilios', label: 'Domicílios', icon: Home, path: '/domicilios' },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-bg-secondary border-r border-border">
      {/* Brand */}
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-teal-500/30 shrink-0">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-text-primary tracking-tight leading-none truncate">Gestão ACS</h1>
            <p className="text-[10px] text-text-muted font-semibold mt-1 uppercase tracking-widest truncate">Prontuário Digital</p>
          </div>
        </div>
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
        {/* Topbar */}
        <header className="h-[80px] bg-bg-secondary/80 backdrop-blur-md border-b border-border flex items-center justify-between px-8 sticky top-0 z-30">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 text-text-secondary rounded-xl hover:bg-bg-primary transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden sm:block">
              <h2 className="text-2xl font-bold text-text-primary tracking-tight leading-none">
                {(() => {
                  const h = new Date().getHours();
                  const greeting = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
                  return `${greeting}, ${user?.name?.split(' ')[0] || 'Victor'}! 👋`;
                })()}
              </h2>
              <p className="text-[14px] text-text-muted font-semibold mt-1.5 uppercase tracking-tight">Aqui está o resumo da sua microárea hoje.</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Connection / Sync Pill */}
            <div className={`flex items-center gap-1.5 md:gap-2 px-2.5 py-1.5 md:px-3.5 md:py-2 rounded-2xl text-[10px] md:text-[11px] font-extrabold uppercase tracking-wider transition-all duration-300 border shadow-sm ${
              !isOnline 
                ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30 text-amber-600 dark:text-amber-400' 
                : isSyncing 
                  ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/30 text-blue-600 dark:text-blue-400 animate-pulse' 
                  : syncQueueLength > 0 
                    ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900/30 text-orange-600 dark:text-orange-400'
                    : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400'
            }`}>
              {!isOnline ? (
                <>
                  <WifiOff className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-500 shrink-0" />
                  <span className="hidden sm:inline">Modo Offline</span>
                </>
              ) : isSyncing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-500 animate-spin shrink-0" />
                  <span className="hidden sm:inline">Sincronizando</span>
                </>
              ) : syncQueueLength > 0 ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 md:w-4 md:h-4 text-orange-500 animate-bounce shrink-0" />
                  <span className="hidden sm:inline">Fila: {syncQueueLength}</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-500 shrink-0" />
                  <span className="hidden sm:inline">
                    {lastSyncedAt
                      ? `Sinc. ${lastSyncedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                      : 'Online'
                    }
                  </span>
                </>
              )}
            </div>

            <button 
              onClick={toggleTheme}
              className="p-2.5 text-text-secondary hover:text-text-primary hover:bg-bg-primary rounded-xl transition-all border border-border shadow-sm"
              title={theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>

            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-bg-primary border border-border rounded-2xl text-[13px] font-semibold text-text-secondary">
              <CalendarDays className="w-4 h-4 text-teal-600" />
              {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>

            <div className="flex items-center gap-2 pl-4 border-l border-border relative">
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-2.5 text-text-muted hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-xl transition-all relative"
              >
                <Bell className="w-5.5 h-5.5" />
                {criticalAlerts.length > 0 && (
                  <span className="absolute top-2 right-2 w-3.5 h-3.5 bg-red-500 border-2 border-bg-secondary rounded-full flex items-center justify-center">
                    <span className="text-[8px] font-bold text-white">{criticalAlerts.length}</span>
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute top-[120%] right-0 mt-2 w-80 bg-bg-secondary border border-border rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-4 border-b border-border bg-bg-primary flex items-center justify-between">
                    <h3 className="font-semibold text-text-primary text-sm">Notificações</h3>
                    {criticalAlerts.length > 0 && (
                      <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                        {criticalAlerts.length} Pendentes
                      </span>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto custom-scrollbar">
                    {criticalAlerts.length > 0 ? (
                      criticalAlerts.map(alert => (
                        <div 
                          key={alert.id} 
                          className="p-4 border-b border-border hover:bg-bg-primary transition-colors cursor-pointer group"
                          onClick={() => { setIsNotificationsOpen(false); navigate(`/editar-paciente/${alert.id}`); }}
                        >
                          <p className="text-sm font-semibold text-text-primary group-hover:text-primary transition-colors">{alert.name}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="text-[10px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded font-semibold uppercase">
                              Bebê (Até 6m)
                            </span>
                            <span className="text-[10px] text-text-muted font-semibold uppercase">
                              Pendente
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center">
                        <div className="w-12 h-12 bg-bg-primary rounded-full flex items-center justify-center mx-auto mb-3">
                          <Bell className="w-5 h-5 text-text-muted opacity-50" />
                        </div>
                        <p className="text-text-secondary text-sm font-medium">Tudo certo por aqui!</p>
                        <p className="text-text-muted text-xs mt-1">Nenhuma notificação no momento.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button 
                onClick={() => syncService.sync()}
                className={`p-2.5 rounded-xl transition-all relative ${syncQueueLength > 0 ? 'text-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'text-text-muted hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20'}`}
                title={syncQueueLength > 0 ? `${syncQueueLength} itens pendentes para sincronização` : 'Sincronizado'}
              >
                <RefreshCw className={`w-5.5 h-5.5 ${syncQueueLength > 0 ? 'animate-spin-slow' : ''}`} />
                {syncQueueLength > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 border-2 border-bg-secondary rounded-full flex items-center justify-center">
                    <span className="text-[9px] font-bold text-white">{syncQueueLength}</span>
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Page Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8 pb-[100px] lg:pb-8">
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
        {[
          { id: 'dashboard', label: 'Geral', icon: LayoutDashboard, path: '/' },
          { id: 'pacientes', label: 'Pacientes', icon: Users, path: '/pacientes' },
          { id: 'domicilios', label: 'Casas', icon: Home, path: '/domicilios' },
          { id: 'configuracoes', label: 'Ajustes', icon: Settings, path: '/configuracoes' }
        ].map((item) => {
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
    </div>
  );
}

