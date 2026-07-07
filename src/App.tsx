import { useState, useEffect, lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from './lib/supabase';
import { Layout } from './components/Layout';
import { ToastProvider } from './components/Toast';
import { syncService } from './lib/syncService';
import { encryptionService } from './lib/encryption';
import { safeStorage } from './lib/safeStorage';
import { AppUser } from './types';
import { User } from '@supabase/supabase-js';

const Login = lazy(() => import('./components/Login').then(module => ({ default: module.Login })));
const Dashboard = lazy(() => import('./components/Dashboard').then(module => ({ default: module.Dashboard })));
const PatientForm = lazy(() => import('./components/PatientForm').then(module => ({ default: module.PatientForm })));
const HouseholdView = lazy(() => import('./components/HouseholdView').then(module => ({ default: module.HouseholdView })));
const PatientList = lazy(() => import('./components/PatientList').then(module => ({ default: module.PatientList })));
const HouseholdList = lazy(() => import('./components/HouseholdList').then(module => ({ default: module.HouseholdList })));
const Settings = lazy(() => import('./components/Settings').then(module => ({ default: module.Settings })));
const Reports = lazy(() => import('./components/Reports').then(module => ({ default: module.Reports })));
const UserManagement = lazy(() => import('./components/UserManagement').then(module => ({ default: module.UserManagement })));
const VisitHistory = lazy(() => import('./components/VisitHistory').then(module => ({ default: module.VisitHistory })));
const ExportTool = lazy(() => import('./components/ExportTool').then(module => ({ default: module.ExportTool })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes of cache lifetime
    },
  },
});

export default function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = safeStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    try {
      if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
    } catch (e) {
      console.warn('Failed to access matchMedia:', e);
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    safeStorage.setItem('theme', theme);
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
    }).catch(err => {
      console.warn('Silent fallback for missing/unconfigured Supabase keys:', err);
      setLoading(false);
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

  const fetchProfile = async (supabaseUser: User | AppUser) => {
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
        const name = data.name || supabaseUser.user_metadata?.name || supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'Usuário';
        
        // Update last_login in the background for audit/dashboard tracking
        (async () => {
          try {
            const { error: updateErr } = await supabase.from('profiles')
              .update({ last_login: new Date().toISOString() })
              .eq('id', supabaseUser.id);
            if (updateErr) console.warn('Failed to update last_login:', updateErr);
          } catch (err) {
            console.warn('Failed to update last_login in background:', err);
          }
        })();

        setUser({ ...supabaseUser, ...data, name });
      } else {
        console.error("Profile not found in database, trying to auto-create:", error);
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (token) {
          try {
            const response = await fetch('/api/profile/ensure', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              }
            });
            if (response.ok) {
              const resData = await response.json();
              if (resData.profile) {
                const name = resData.profile.name || supabaseUser.user_metadata?.name || supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'Usuário';
                setUser({ ...supabaseUser, ...resData.profile, name });
                return;
              }
            }
          } catch (ensureErr) {
            console.error("Failed to auto-create profile via /api/profile/ensure:", ensureErr);
          }
        }
        const name = supabaseUser.user_metadata?.name || supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'Usuário';
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
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <Router>
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-surface">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          }>
            <Routes>
              <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
              
              {user ? (
                <Route element={<Layout user={user} theme={theme} toggleTheme={toggleTheme} onProfileUpdate={() => user && fetchProfile(user)} />}>
                  <Route path="/" element={<Dashboard user={user} />} />
                  <Route path="/pacientes" element={<PatientList user={user} />} />
                  <Route path="/domicilios" element={<HouseholdList user={user} />} />
                  <Route path="/configuracoes" element={<Settings user={user} onProfileUpdate={() => user && fetchProfile(user)} />} />
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
          </Suspense>
        </Router>
      </ToastProvider>
    </QueryClientProvider>
  );
}
