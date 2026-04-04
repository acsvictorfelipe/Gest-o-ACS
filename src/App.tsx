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

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

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

      if (data) {
        let updatedProfile = data;
        // Bootstrap: Promote specific email to Administrador
        if (supabaseUser.email === 'acsvictorfelipe@gmail.com' && data.role !== 'Administrador') {
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
        setUser({ ...supabaseUser, ...updatedProfile });
      } else if (error) {
        console.error("Error fetching profile:", error);
        setUser(supabaseUser);
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
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route
          path="/*"
          element={
            user ? (
              <Layout user={user} theme={theme} toggleTheme={toggleTheme}>
                <Routes>
                  <Route path="/" element={<Dashboard user={user} />} />
                  <Route path="/pacientes" element={<PatientList user={user} />} />
                  <Route path="/domicilios" element={<HouseholdList user={user} />} />
                  <Route path="/configuracoes" element={<Settings user={user} />} />
                  <Route path="/relatorios" element={<Reports user={user} />} />
                  <Route path="/historico" element={<VisitHistory user={user} />} />
                  <Route path="/novo-cadastro" element={<PatientForm user={user} />} />
                  <Route path="/editar-paciente/:id" element={<PatientForm user={user} />} />
                  <Route path="/domicilio/:id" element={<HouseholdView user={user} />} />
                  <Route path="/usuarios" element={<UserManagement currentUser={user} />} />
                  <Route path="/importar" element={<ImportTool user={user} />} />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
      </Routes>
    </Router>
  );
}
