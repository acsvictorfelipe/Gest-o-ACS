import * as React from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useSync } from '../lib/useSync';
import { 
  LayoutDashboard, 
  Users, 
  BarChart3, 
  Settings, 
  RefreshCw, 
  Calendar as CalendarIcon,
  Bell, 
  LogOut,
  Home,
  Menu,
  UserCog,
  FileUp,
  AlertCircle,
  Baby,
  UserCheck,
  ClipboardList,
  Syringe,
  Download,
  Map as MapIcon,
  Bed,
  ChevronRight
} from 'lucide-react';
import { SetupProfile } from './SetupProfile';
import { parseDate, getAgeInMonths, VACCINE_SCHEDULE } from '../lib/dateUtils';
import { motion, AnimatePresence } from 'motion/react';

interface LayoutProps {
  user: any;
  onProfileUpdate?: () => void;
}

export function Layout({ user, onProfileUpdate }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [criticalAlerts, setCriticalAlerts] = React.useState<any[]>([]);
  const { isSyncing, sync } = useSync();
  const [showSetup, setShowSetup] = React.useState(false);
  const [stats, setStats] = React.useState({ pendingVisits: 0, lateVaccines: 0 });

  const handleSetupComplete = () => {
    setShowSetup(false);
    if (onProfileUpdate) onProfileUpdate();
  };

  React.useEffect(() => {
    if (user.role === 'Agente' && (!user.microarea || !user.color)) {
      setShowSetup(true);
    } else if (user.role === 'Gestor' && !user.color) {
      setShowSetup(true);
    } else {
      setShowSetup(false);
    }
  }, [user]);

  React.useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const { data: patients, error } = await supabase
          .from('patients')
          .select('*');
        
        if (error) throw error;

        const alerts: any[] = [];
        const now = new Date();
        let pendingV = 0;
        let lateV = 0;

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        patients?.forEach(p => {
          // Calculate pending visits
          const lastVisit = p.last_visit_at ? new Date(p.last_visit_at) : null;
          if (!lastVisit || lastVisit < thirtyDaysAgo) {
            pendingV++;
          }

          // Calculate late vaccines
          if (p.categories?.includes('Criança') && !p.categories?.includes('Adulto') && !p.categories?.includes('Idoso')) {
            const vaccines = p.clinical_data?.crianca?.vacinas || {};
            const ageInMonths = p.birth_date ? getAgeInMonths(p.birth_date) : 99;
            const dueVaccines = VACCINE_SCHEDULE
              .filter(group => group.age <= ageInMonths)
              .flatMap(group => group.vaccines);
            
            let hasLate = false;
            dueVaccines.forEach(v => {
              if (vaccines[v.id] !== 'Sim') {
                hasLate = true;
              }
            });
            if (hasLate) lateV++;
          }

          if (p.categories?.includes('Criança') && p.birth_date) {
            const birth = parseDate(p.birth_date);
            if (!birth) return;
            
            const diffMonths = now.getMonth() - birth.getMonth() + (12 * (now.getFullYear() - birth.getFullYear()));
            const alreadyVisited = !!p.clinical_data?.crianca?.visita6meses;
            
            if (diffMonths >= 5 && diffMonths <= 9 && !alreadyVisited) {
              const sixMonthsDate = new Date(birth);
              sixMonthsDate.setMonth(birth.getMonth() + 6);
              const formattedDate = `${sixMonthsDate.getDate().toString().padStart(2, '0')}/${(sixMonthsDate.getMonth() + 1).toString().padStart(2, '0')}/${sixMonthsDate.getFullYear()}`;
              alerts.push({
                id: p.id,
                name: p.name,
                type: 'Visita 6 Meses',
                message: `Próxima da visita de 6 meses (${formattedDate})`,
                icon: Baby,
                color: 'text-orange-500'
              });
            }

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
        setStats({ pendingVisits: pendingV, lateVaccines: lateV });
      } catch (error) {
        console.error("Error fetching alerts:", error);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const sections = [
    {
      title: 'VISÃO GERAL',
      items: [
        { path: '/', icon: LayoutDashboard, label: 'Visão Geral' },
      ]
    },
    {
      title: 'CADASTROS',
      items: [
        { path: '/pacientes', icon: Users, label: 'Pacientes' },
        { path: '/pacientes?filter=gestantes', icon: UserCheck, label: 'Gestantes' },
        { path: '/pacientes?filter=criancas', icon: Baby, label: 'Crianças' },
        { path: '/pacientes?filter=idosos', icon: UserCog, label: 'Idosos' },
        { path: '/pacientes?filter=acamados', icon: Bed, label: 'Acamados' },
        { path: '/domicilios', icon: Home, label: 'Visitas Domiciliares' },
      ]
    },
    {
      title: 'ACOMPANHAMENTO',
      items: [
        { path: '/pacientes?filter=visitas_atrasadas', icon: AlertCircle, label: 'Visitas Pendentes', badge: stats.pendingVisits.toString() },
        { path: '/pacientes?filter=vaccine', icon: Syringe, label: 'Vacinas em Atraso', badge: stats.lateVaccines.toString() },
        { path: '/relatorios?tab=indicadores', icon: ClipboardList, label: 'Condicionantes' },
      ]
    },
    {
      title: 'RELATÓRIOS',
      items: [
        { path: '/indicadores', icon: BarChart3, label: 'Indicadores' },
        { path: '/relatorios', icon: FileUp, label: 'Relatórios' },
        { path: '/exportacao', icon: Download, label: 'Exportações' },
      ]
    },
    {
      title: 'CONFIGURAÇÕES',
      items: [
        { path: '/usuarios', icon: Users, label: 'Usuários', adminOnly: true },
        { path: '/microareas', icon: MapIcon, label: 'Microáreas', adminOnly: true },
        { path: '/configuracoes', icon: Settings, label: 'Configurações' },
      ]
    }
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-100 relative overflow-hidden">
      {/* Brand */}
      <div className="px-6 h-[100px] flex items-center shrink-0 border-b border-slate-50 relative z-10">
        <div className="flex items-center gap-3.5 group cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-11 h-11 bg-teal-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-teal-500/20 transition-transform group-hover:rotate-3">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tighter leading-none">Gestão ACS</h1>
            <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-tight">Prontuário Digital</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-8 space-y-8 overflow-y-auto custom-scrollbar relative z-10">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-2">
            <h3 className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 opacity-80">
              {section.title}
            </h3>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                if (item.adminOnly && user.role !== 'Administrador') return null;
                const isActive = location.pathname === item.path || (item.path !== '/' && location.search.includes(item.path.split('?')[1] || '____'));
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 group relative ${
                      isActive 
                        ? 'bg-teal-50 text-teal-600' 
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 relative z-10">
                      <item.icon className={`w-[18px] h-[18px] transition-transform duration-200 ${isActive ? 'text-teal-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                      <span className="tracking-tight">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`relative z-10 text-[10px] font-bold min-w-[20px] h-[20px] px-1.5 rounded-full flex items-center justify-center ${
                        isActive ? 'bg-teal-600 text-white' : 'bg-red-500 text-white shadow-sm shadow-red-500/20'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                    {isActive && (
                      <motion.div 
                        layoutId="nav-pill"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/5 bg-teal-600 rounded-r-full"
                        initial={false}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Area */}
      <div className="p-4 border-t border-slate-50 relative z-10 bg-white">
        <div className="flex items-center gap-3 px-4 py-4 bg-slate-50 rounded-2xl border border-transparent hover:border-slate-100 transition-all group">
          <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center text-white font-black text-xs shadow-md shadow-teal-600/20">
            {user.name?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-slate-900 truncate leading-tight">{user.name || 'Agente'}</p>
            <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">ACS • Microárea {user.microarea || '02'}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F1F4F9] flex flex-col lg:flex-row selection:bg-teal-600/30">
      {showSetup && (
        <SetupProfile 
          user={user} 
          onComplete={handleSetupComplete} 
        />
      )}
      
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-[260px] fixed left-0 top-0 h-full z-50">
        {sidebarContent}
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-[260px] min-h-screen flex flex-col relative overflow-x-hidden">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white border-b border-slate-100 h-[80px] px-8 lg:px-10 flex justify-between items-center shadow-sm shadow-slate-100/50">
          <div className="flex items-center gap-4 flex-1">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button 
              className="p-2 text-slate-400 hover:text-teal-600 transition-all relative group"
              onClick={() => {
                // Here we could open a dropdown with criticalAlerts
              }}
            >
              <Bell className="w-6 h-6" />
              {criticalAlerts.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
              )}
            </button>
          </div>
        </header>

        {/* Content with Animation */}
        <div className="p-8 lg:p-12 flex-1 max-w-[1800px] w-full mx-auto relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname + location.search}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 z-[100] lg:hidden backdrop-blur-sm" 
              onClick={() => setIsMobileMenuOpen(false)} 
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-[280px] z-[110] lg:hidden shadow-3xl"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
