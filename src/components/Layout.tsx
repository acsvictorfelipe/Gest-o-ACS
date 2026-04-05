import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useSync } from '../lib/useSync';
import { useSecurity } from './SecurityLock';
import { 
  LayoutDashboard, 
  Users, 
  UserPlus, 
  BarChart3, 
  Settings, 
  RefreshCw, 
  Search, 
  Bell, 
  HelpCircle,
  LogOut,
  Home,
  Menu,
  X,
  Sun,
  Moon,
  UserCog,
  FileUp,
  AlertCircle,
  Baby,
  Lock,
  Wifi,
  WifiOff
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  user: any;
}

export function Layout({ children, user }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [criticalAlerts, setCriticalAlerts] = useState<any[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { isOnline, pendingCount, isSyncing, sync } = useSync();
  const { lock } = useSecurity();

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const { data: patients, error } = await supabase
          .from('patients')
          .select('*');
        
        if (error) throw error;

        const alerts: any[] = [];
        const now = new Date();

        patients?.forEach(p => {
          if (p.categories?.includes('Criança') && p.birth_date) {
            const birth = new Date(p.birth_date);
            const sixMonthsDate = new Date(birth);
            sixMonthsDate.setMonth(birth.getMonth() + 6);
            const diffDays = Math.ceil((sixMonthsDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            
            if (diffDays <= 15 && diffDays >= -15) {
              alerts.push({
                id: p.id,
                name: p.name,
                type: 'Visita 6 Meses',
                message: `Próxima da visita de 6 meses (${sixMonthsDate.toLocaleDateString('pt-BR')})`,
                icon: Baby,
                color: 'text-orange-500'
              });
            }

            // Check for late vaccines
            const vaccines = p.clinical_data?.crianca?.vacinas || {};
            const hasEmptyVaccine = Object.values(vaccines).some(v => !v);
            if (hasEmptyVaccine) {
              alerts.push({
                id: `${p.id}-vacina`,
                patientId: p.id,
                name: p.name,
                type: 'Vacina Atrasada',
                message: 'Possui vacinas pendentes no calendário.',
                icon: AlertCircle,
                color: 'text-red-500'
              });
            }
          }
        });

        setCriticalAlerts(alerts);
      } catch (error) {
        console.error("Error fetching alerts:", error);
      }
    };

    fetchAlerts();
    // Refresh alerts every 5 minutes
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/pacientes', icon: Users, label: 'Pacientes' },
    { path: '/domicilios', icon: Home, label: 'Domicílios' },
    { path: '/historico', icon: RefreshCw, label: 'Histórico' },
    { path: '/novo-cadastro', icon: UserPlus, label: 'Novo Cadastro' },
    { path: '/importar', icon: FileUp, label: 'Importar' },
    { path: '/relatorios', icon: BarChart3, label: 'Relatórios' },
    { path: '/configuracoes', icon: Settings, label: 'Configurações' },
  ];

  if (user.role === 'Administrador') {
    navItems.splice(5, 0, { path: '/usuarios', icon: UserCog, label: 'Usuários' });
  }

  const SidebarContent = () => (
    <>
      <div className="px-6 mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-primary font-headline">Gestão ACS</h1>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(false)}
          className="lg:hidden p-2 text-slate-400 hover:text-primary transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center px-6 py-3 transition-all ${
                isActive 
                  ? 'text-primary font-bold border-r-4 border-primary bg-primary/5' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-primary' : 'text-slate-400 dark:text-slate-500'}`} />
              <span className="text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-6 mt-auto space-y-6">
        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</span>
            {isOnline ? (
              <div className="flex items-center gap-1 text-green-500">
                <Wifi className="w-3 h-3" />
                <span className="text-[10px] font-bold">Online</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-orange-500">
                <WifiOff className="w-3 h-3" />
                <span className="text-[10px] font-bold">Offline</span>
              </div>
            )}
          </div>
          
          {pendingCount > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pendentes</span>
              <span className="text-[10px] font-bold text-orange-500">{pendingCount} itens</span>
            </div>
          )}

          <button 
            onClick={sync}
            disabled={!isOnline || isSyncing}
            className={`w-full py-3 ${isOnline ? 'bg-primary' : 'bg-slate-300'} text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50`}
          >
            {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        </div>

        <div className="flex items-center gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
          <img 
            src={user.photoURL || `https://ui-avatars.com/api/?name=${user.name || user.email}&background=${(user.color || '#00488d').replace('#', '')}&color=fff`} 
            alt="Profile" 
            className="w-10 h-10 rounded-full object-cover border-2 border-primary/10"
            referrerPolicy="no-referrer"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-on-surface truncate">{user.name || 'Agente'}</p>
            <div className="flex flex-col">
              <p className="text-[10px] text-on-surface-variant uppercase tracking-tighter truncate">
                {user.role || 'Agente'} • {user.microarea ? `MA ${user.microarea}` : 'Sem MA'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={lock} className="p-2 text-slate-400 hover:text-primary transition-colors" title="Bloquear Tela">
              <Lock className="w-4 h-4" />
            </button>
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-error transition-colors" title="Sair">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-surface flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 fixed left-0 top-0 h-full bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 flex-col py-6 z-50">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[60] lg:hidden backdrop-blur-sm transition-all"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={`
        fixed left-0 top-0 h-full bg-white dark:bg-slate-900 w-72 z-[70] lg:hidden flex flex-col py-6 transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 min-h-screen flex flex-col">
        {/* Top Bar */}
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 px-4 lg:px-8 py-3 lg:py-4 flex justify-between items-center">
          <div className="flex items-center gap-3 lg:gap-4 flex-1">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <Menu className="w-5 h-5 lg:w-6 lg:h-6" />
            </button>
            
            <div className="hidden md:block flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Buscar paciente..." 
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-full text-sm focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const value = (e.target as HTMLInputElement).value;
                      navigate(`/pacientes?search=${encodeURIComponent(value)}`);
                    }
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 lg:gap-6">
            <div className="flex gap-2 lg:gap-4 text-slate-400 relative">
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className={`p-2 hover:text-primary transition-colors relative ${criticalAlerts.length > 0 ? 'text-red-500' : ''}`}
              >
                <Bell className="w-5 h-5" />
                {criticalAlerts.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></span>
                )}
              </button>

              {isNotificationsOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-[80]" 
                    onClick={() => setIsNotificationsOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 z-[90] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-4 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                      <h4 className="text-sm font-bold text-on-surface">Alertas Críticos</h4>
                      <span className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {criticalAlerts.length} Pendentes
                      </span>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {criticalAlerts.length > 0 ? (
                        criticalAlerts.map((alert) => (
                          <div 
                            key={alert.id} 
                            className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer border-b border-slate-50 dark:border-slate-800 last:border-none"
                            onClick={() => {
                              navigate(`/editar-paciente/${alert.patientId || alert.id}`);
                              setIsNotificationsOpen(false);
                            }}
                          >
                            <div className="flex gap-3">
                              <div className={`w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 ${alert.color}`}>
                                <alert.icon className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-on-surface">{alert.name}</p>
                                <p className="text-[10px] font-bold text-primary uppercase mt-0.5">{alert.type}</p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{alert.message}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center">
                          <Bell className="w-8 h-8 text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Nenhum alerta crítico no momento.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="h-8 w-[1px] bg-slate-100 dark:bg-slate-800 hidden sm:block"></div>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-black text-primary uppercase tracking-widest">Portal ACS</p>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Unidade Central</p>
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-8 flex-1 pb-24 lg:pb-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-6 py-3 flex justify-between items-center z-50 pb-safe">
          {navItems.slice(0, 5).map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 ${isActive ? 'text-primary' : 'text-slate-400'}`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-slate-400'}`} />
                <span className="text-[9px] font-bold uppercase tracking-tighter">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
