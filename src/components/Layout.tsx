import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
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
  FileUp
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  user: any;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export function Layout({ children, user, theme, toggleTheme }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
        <button className="w-full py-3 bg-primary text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20">
          <RefreshCw className="w-4 h-4" />
          Sincronizar
        </button>

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
              {user.color && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: user.color }}></div>
                  <span className="text-[10px] font-bold" style={{ color: user.color }}>
                    {user.color === '#00488d' ? 'AZUL' : 
                     user.color === '#eab308' ? 'AMARELO' : 
                     user.color === '#64748b' ? 'CINZA' : 
                     user.color === '#db2777' ? 'ROSA' : 'MARROM'}
                  </span>
                </div>
              )}
            </div>
          </div>
          <button onClick={handleLogout} className="text-slate-400 hover:text-error transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
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
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 lg:gap-6">
            <div className="flex gap-2 lg:gap-4 text-slate-400">
              <button 
                onClick={toggleTheme}
                className="p-2 hover:text-primary transition-colors"
                title={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
              >
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>
              <button className="p-2 hover:text-primary transition-colors"><Bell className="w-5 h-5" /></button>
            </div>
            <div className="h-8 w-[1px] bg-slate-100 dark:bg-slate-800 hidden sm:block"></div>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-black text-primary uppercase tracking-widest">Portal ACS</p>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Unidade Central</p>
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-8 flex-1">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
