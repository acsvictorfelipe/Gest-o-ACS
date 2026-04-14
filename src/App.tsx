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

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('dark');
    root.classList.add('light');
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

      if (data) {
        let updatedProfile = data;
        // Bootstrap: Promote specific emails to Administrador
        const adminEmails = ['victorfelipe2012@gmail.com'];
        if (supabaseUser.email && adminEmails.includes(supabaseUser.email) && data.role !== 'Administrador') {
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
        const adminEmails = ['victorfelipe2012@gmail.com'];
        const name = supabaseUser.user_metadata?.name || supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'Usuário';
        
        if (supabaseUser.email && adminEmails.includes(supabaseUser.email)) {
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

  useEffect(() => {
    // Temporary migration to update acsvictorfelipe@gmail.com profile as requested
    if (user && user.email === 'acsvictorfelipe@gmail.com' && (user.role !== 'Agente' || user.microarea !== '3')) {
      const performMigration = async () => {
        console.log('Performing requested profile migration for acsvictorfelipe@gmail.com');
        const { error } = await supabase
          .from('profiles')
          .update({
            role: 'Agente',
            color: '#64748b', // Cinza
            microarea: '3'
          })
          .eq('id', user.id);
        
        if (!error) {
          console.log('Migration successful, refreshing profile...');
          fetchProfile(user);
        } else {
          console.error('Migration failed:', error);
        }
      };
      performMigration();
    }
  }, [user]);

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
