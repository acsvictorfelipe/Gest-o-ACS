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
import { ImportTool } from './components/ImportTool';
import { Toaster } from 'sonner';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const root = window.document.documentElement;
    
    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches) root.classList.add('dark');
      else root.classList.remove('dark');
    };
    
    if (mediaQuery.matches) root.classList.add('dark');
    else root.classList.remove('dark');
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

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

  const fetchProfile = async (supabaseUser: any) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      const initialAdminEmail = import.meta.env.VITE_INITIAL_ADMIN_EMAIL;

      if (data) {
        let updatedProfile = data;
        // Permite promoção estrita apenas se a variável de admin foi configurada
        if (initialAdminEmail && supabaseUser.email === initialAdminEmail && data.role !== 'Administrador') {
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
        // Profile doesn't exist, check if it's the environment super admin to create it
        const name = supabaseUser.user_metadata?.name || supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'Usuário';
        
        if (initialAdminEmail && supabaseUser.email === initialAdminEmail) {
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Router>
      <Toaster position="top-right" richColors theme="system" />
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        
        {user ? (
          <Route element={<Layout user={user} onProfileUpdate={() => fetchProfile(user)} />}>
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
            <Route path="/importar" element={<ImportTool user={user} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/login" />} />
        )}
      </Routes>
    </Router>
  );
}
