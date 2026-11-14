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
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = React.useState(false);
  const settingsMenuRef = React.useRef<HTMLDivElement>(null);
  const [patientsData, setPatientsData] = React.useState<any[]>([]);
  const [syncQueueLength, setSyncQueueLength] = React.useState(syncService.getQueueLength());
  const [isOnline, setIsOnline] = React.useState(syncService.isOnline());
  const [isSyncing, setIsSyncing] = React.useState(syncService.isSyncing());
  const [lastSyncedAt, setLastSyncedAt] = React.useState<Date | null>(syncService.getLastSyncedAt());

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setIsSettingsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const primaryNavItems = [
    { id: 'dashboard', label: 'Painel', icon: LayoutDashboard, path: '/' },
    { id: 'pacientes', label: 'Pacientes', icon: Users, path: '/pacientes', hideForAdmin: true },
    { id: 'domicilios', label: 'Domicílios', icon: Home, path: '/domicilios', hideForAdmin: true },
  ].filter(item => !((user?.role === 'Administrador' || user?.role === 'Gestor') && item.hideForAdmin));

  return (
    <div className="flex flex-col h-screen bg-bg-primary text-text-primary overflow-hidden">
      {/* 1. Slim Topbar Header (Full Width Desktop & Mobile) */}
      <header className="h-[60px] shrink-0 bg-bg-secondary/95 backdrop-blur-md border-b border-border flex items-center justify-between px-4 sm:px-6 z-40 relative">
        {/* Left: Brand + ACS Badge */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden p-2 text-text-secondary rounded-xl hover:bg-bg-primary transition-colors cursor-pointer"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div 
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-md shadow-teal-500/25 shrink-0 transition-transform group-hover:scale-105">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-base font-extrabold text-text-primary tracking-tight leading-none">Gestão ACS</h1>
              <p className="text-[9px] text-teal-600 dark:text-teal-400 font-bold uppercase tracking-wider mt-0.5">Prontuário Digital</p>
            </div>
          </div>

          {/* Microárea & Equipe Badge */}
          {user && (
            <div className="hidden md:flex items-center gap-2 pl-3 border-l border-border/80 text-xs">
              <span className="font-bold text-text-secondary bg-bg-primary px-2.5 py-1 rounded-lg border border-border">
                Microárea: <strong className="text-teal-600 dark:text-teal-400">{user.microarea || '00'}</strong>
              </span>
              {user.color && (
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-text-muted">
                  <span className="w-2.5 h-2.5 rounded-full border border-black/10 shadow-2xs" style={{ backgroundColor: user.color }} />
                  Área
                </span>
              )}
            </div>
          )}
        </div>

        {/* Center: Primary Navigation Pills (Desktop) */}
        <nav className="hidden lg:flex items-center gap-1.5 bg-bg-primary/90 p-1 rounded-2xl border border-border">
          {primaryNavItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/30'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: Actions, Sync, Notifications & Settings Gear Dropdown */}
        <div className="flex items-center gap-2">
          {/* Sync status */}
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-bg-primary text-[11px] font-medium text-text-muted border border-border" title={isOnline ? 'Online - Sincronizado' : 'Offline - Trabalhando localmente'}>
            {isOnline ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-amber-500" />
            )}
            <span className="text-[10px] hidden md:inline">{isSyncing ? 'Sincronizando...' : isOnline ? 'Online' : 'Offline'}</span>
          </div>

          {/* Notifications Bell */}
          <button
            onClick={() => setIsNotificationsOpen(true)}
            className="relative p-2 rounded-xl text-text-muted hover:text-teal-600 hover:bg-bg-primary transition-colors cursor-pointer"
            title="Central de Notificações"
          >
            <Bell className="w-5 h-5" />
            {counts.total > 0 && (
              <span className={`absolute top-1 right-1 min-w-[17px] h-[17px] px-1 rounded-full text-[8px] font-black text-white flex items-center justify-center border border-bg-secondary ${
                counts.critical > 0 ? 'bg-red-500 animate-pulse' : counts.high > 0 ? 'bg-orange-500' : 'bg-amber-500'
              }`}>
                {counts.total > 99 ? '99+' : counts.total}
              </span>
            )}
          </button>

          {/* Theme quick toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-text-muted hover:text-teal-600 hover:bg-bg-primary transition-colors cursor-pointer"
            title={`Mudar para modo ${theme === 'dark' ? 'claro' : 'escuro'}`}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Settings Gear with Sleek Dropdown Popover */}
          <div className="relative" ref={settingsMenuRef}>
            <button
              onClick={() => setIsSettingsMenuOpen(prev => !prev)}
              className={`flex items-center gap-2 p-2 sm:px-3 sm:py-1.5 rounded-xl transition-all cursor-pointer border ${
                isSettingsMenuOpen 
                  ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-600 border-teal-300 dark:border-teal-800' 
                  : 'bg-bg-primary text-text-secondary hover:text-text-primary border-border hover:border-text-muted/30'
              }`}
              title="Configurações e Menu do Sistema"
            >
              <div className="w-6 h-6 rounded-lg bg-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {user?.name?.charAt(0).toUpperCase() || 'A'}
              </div>
              <span className="text-xs font-bold hidden md:inline truncate max-w-[110px]">
                {user?.name?.split(' ')[0] || 'Usuário'}
              </span>
              <Settings className={`w-4 h-4 text-text-muted transition-transform duration-200 ${isSettingsMenuOpen ? 'rotate-90 text-teal-600' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {isSettingsMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-64 bg-bg-secondary rounded-2xl shadow-xl border border-border p-2 z-50 text-text-primary backdrop-blur-lg"
                >
                  {/* User Header Info in Dropdown */}
                  <div className="px-3 py-2.5 mb-1.5 border-b border-border/70 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {user?.name?.charAt(0).toUpperCase() || 'A'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-text-primary truncate">{user?.name || 'Agente'}</p>
                      <p className="text-[10px] text-text-muted truncate">Microárea {user?.microarea || '00'} • {user?.role || 'Agente'}</p>
                    </div>
                  </div>

                  {/* Navigation Links inside Gear */}
                  <div className="space-y-0.5 text-xs">
                    {(user?.role !== 'Administrador' && user?.role !== 'Gestor') && (
                      <>
                        <button
                          onClick={() => { navigate('/relatorios'); setIsSettingsMenuOpen(false); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-primary transition-colors text-left"
                        >
                          <PieChart className="w-4 h-4 text-teal-600" />
                          <span>Relatórios & Indicadores</span>
                        </button>
                        <button
                          onClick={() => { navigate('/historico'); setIsSettingsMenuOpen(false); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-primary transition-colors text-left"
                        >
                          <History className="w-4 h-4 text-teal-600" />
                          <span>Histórico de Visitas</span>
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => { navigate('/exportar'); setIsSettingsMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-primary transition-colors text-left"
                    >
                      <FileText className="w-4 h-4 text-teal-600" />
                      <span>Exportar Dados (Excel)</span>
                    </button>

                    {(user?.role === 'Administrador' || user?.role === 'Gestor') && (
                      <button
                        onClick={() => { navigate('/usuarios'); setIsSettingsMenuOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-primary transition-colors text-left"
                      >
                        <ShieldCheck className="w-4 h-4 text-amber-500" />
                        <span>Painel Administrativo</span>
                      </button>
                    )}

                    <button
                      onClick={() => { navigate('/configuracoes'); setIsSettingsMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-primary transition-colors text-left"
                    >
                      <Settings className="w-4 h-4 text-slate-500" />
                      <span>Configurações do Perfil</span>
                    </button>
                  </div>

                  {/* Sign Out */}
                  <div className="mt-2 pt-1.5 border-t border-border/70">
                    <button
                      onClick={() => { signOut(); setIsSettingsMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-xs font-semibold text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sair do Sistema</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* 2. Main Full-Width Content Container */}
      <main className="flex-1 flex flex-col h-[calc(100vh-60px)] overflow-hidden">
        {/* Page Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-5 lg:p-6 pb-[88px] sm:pb-[100px] lg:pb-6 space-y-4">
          <div className="w-full max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </div>
      </main>

      {/* 3. Animated Mobile Sidebar Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" 
              onClick={() => setIsMobileMenuOpen(false)} 
            />
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

      {/* 4. Mobile Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 h-[64px] bg-bg-secondary/95 backdrop-blur-lg border-t border-border flex items-center justify-around px-4 pb-safe-bottom z-40 shadow-lg">
        {primaryNavItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-2xl relative transition-all shrink-0"
            >
              <item.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-teal-600 dark:text-teal-400' : 'text-text-muted'}`} />
              <span className={`text-[10px] font-extrabold uppercase tracking-wider ${isActive ? 'text-teal-700 dark:text-teal-400' : 'text-text-muted'}`}>
                {item.label}
              </span>
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

