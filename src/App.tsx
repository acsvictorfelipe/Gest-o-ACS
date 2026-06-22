import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { PatientForm } from './components/PatientForm';
import { HouseholdView } from './components/HouseholdView';
import { PatientList } from './components/PatientList';
import { HouseholdList } from './components/HouseholdList';
import { Settings } from './components/Settings';
import { Reports } from './components/Reports';
import { UserManagement } from './components/UserManagement';
import { VisitHistory } from './components/VisitHistory';
import { ExportTool } from './components/ExportTool';
import { syncService } from './lib/syncService';
import { encryptionService } from './lib/encryption';

// NOTE: In production, replace this with an env var or Supabase RLS policy.
// Never rely solely on client-side role checks for access control.
const getAdminEmails = () => {
  const isBrowser = typeof window !== 'undefined';
  const config = isBrowser && (window as any).__SUPABASE_CONFIG__ ? (window as any).__SUPABASE_CONFIG__ : {};
  const emailsStr = config.VITE_ADMIN_EMAILS || import.meta.env.VITE_ADMIN_EMAILS || 'victorfelipe2012@gmail.com,acsvictorfelipe@gmail.com';
  return emailsStr.split(',').map((email: string) => email.trim());
};

const ADMIN_EMAILS = getAdminEmails();

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  useEffect(() => {
    // 1. Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchProfile(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      console.log('App is online. Triggering sync...');
      syncService.sync();
    };

    window.addEventListener('online', handleOnline);
    
    // Initial sync check
    if (navigator.onLine) {
      syncService.sync();
    }

    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const fetchProfile = async (supabaseUser: any) => {
    try {
      if (supabaseUser?.id) {
        encryptionService.setKey(supabaseUser.id);
      }
      const { data, error } = await supabase

        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (data) {
        let updatedProfile = data;
        // Bootstrap: Promote specific emails to Administrador
        if (supabaseUser.email && ADMIN_EMAILS.includes(supabaseUser.email) && data.role !== 'Administrador') {
          const { data: promotedData, error: promoError } = await supabase
            .from('profiles')
            .update({ role: 'Administrador' })
            .eq('id', supabaseUser.id)
            .select()
            .single();
          
          if (!promoError && promotedData) {
            updatedProfile = promotedData;
          }
        }
        
        // Ensure name fallback from metadata
        const name = updatedProfile.name || supabaseUser.user_metadata?.name || supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'Usuário';
        setUser({ ...supabaseUser, ...updatedProfile, name });
      } else {
        // Profile doesn't exist, check if it's a super admin to create it
        const name = supabaseUser.user_metadata?.name || supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'Usuário';
        
        if (supabaseUser.email && ADMIN_EMAILS.includes(supabaseUser.email)) {
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: supabaseUser.id,
              email: supabaseUser.email,
              name: name,
              role: 'Administrador',
              color: '#64748b'
            })
            .select()
            .single();
          
          if (!createError && newProfile) {
            setUser({ ...supabaseUser, ...newProfile });
            return;
          }
        }

        console.error("Profile fetch error or not found:", error);
        setUser({ ...supabaseUser, name });
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
      setUser(supabaseUser);
    } finally {
      setLoading(false);
    }
  };

  // Migration block removed — was a one-time operation that no longer needs to run.

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        
        {user ? (
          <Route element={<Layout user={user} theme={theme} toggleTheme={toggleTheme} onProfileUpdate={() => fetchProfile(user)} />}>
            <Route path="/" element={<Dashboard user={user} />} />
            <Route path="/pacientes" element={<PatientList user={user} />} />
            <Route path="/domicilios" element={<HouseholdList user={user} />} />
            <Route path="/configuracoes" element={<Settings user={user} onProfileUpdate={() => fetchProfile(user)} />} />
            <Route path="/relatorios" element={<Reports user={user} />} />
            <Route path="/historico" element={<VisitHistory user={user} />} />
            <Route path="/novo-cadastro" element={<PatientForm user={user} />} />
            <Route path="/editar-paciente/:id" element={<PatientForm user={user} />} />
            <Route path="/domicilio/:id" element={<HouseholdView user={user} />} />
            <Route path="/usuarios" element={<UserManagement currentUser={user} />} />
            <Route path="/exportar" element={<ExportTool user={user} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/login" />} />
        )}
      </Routes>
    </Router>
  );
}
