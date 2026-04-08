import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.env ? new URL(import.meta.url) : import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check route
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Supabase Admin Client
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.');
  }

  const supabaseAdmin = createClient(supabaseUrl || '', supabaseServiceKey || '', {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // API Route for creating users
  app.post('/api/admin/create-user', async (req, res) => {
    console.log('Received request to create user:', req.body.email);
    const { email, password, name, role, color, microarea } = req.body;

    // Basic validation
    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      // Create user with admin privileges
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          role,
          color,
          microarea
        }
      });

      if (error) throw error;

      // Also ensure profile exists (trigger should handle it, but we can be explicit)
      if (data.user) {
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .upsert({
            id: data.user.id,
            name,
            role,
            color,
            microarea,
            email
          });
        
        if (profileError) console.error('Profile upsert error:', profileError);
      }

      res.status(200).json({ user: data.user });
    } catch (error: any) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Route for deleting users
  app.delete('/api/admin/delete-user/:id', async (req, res) => {
    const { id } = req.params;
    console.log('Received request to delete user ID:', id);
    
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ 
        error: 'Configuração ausente: SUPABASE_SERVICE_ROLE_KEY não encontrada. Por favor, adicione-a em Settings > Secrets.' 
      });
    }

    try {
      // 1. Delete dependent data first to satisfy foreign key constraints
      // We check for errors and throw to ensure the process stops if something fails
      
      console.log('Deleting visits for agent:', id);
      const { error: vError } = await supabaseAdmin
        .from('visits')
        .delete()
        .eq('agent_id', id);
      if (vError) throw new Error(`Erro ao excluir visitas: ${vError.message}`);

      console.log('Deleting patients for agent:', id);
      const { error: pError } = await supabaseAdmin
        .from('patients')
        .delete()
        .eq('agent_id', id);
      if (pError) throw new Error(`Erro ao excluir pacientes: ${pError.message}`);

      console.log('Deleting households for agent:', id);
      const { error: hError } = await supabaseAdmin
        .from('households')
        .delete()
        .eq('agent_id', id);
      if (hError) throw new Error(`Erro ao excluir domicílios: ${hError.message}`);

      // 2. Delete from profiles table
      console.log('Deleting profile:', id);
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', id);
      
      if (profileError) throw new Error(`Erro ao excluir perfil: ${profileError.message}`);

      // 3. Delete from Auth - This is the final step
      console.log('Deleting Auth user:', id);
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
      
      if (authError) {
        console.error('Error deleting Auth user:', authError);
        throw new Error(`Erro ao excluir conta de acesso: ${authError.message}`);
      }
      
      console.log('User and all associated data deleted successfully:', id);
      res.status(200).json({ message: 'User deleted successfully' });
    } catch (error: any) {
      console.error('Error in delete-user endpoint:', error);
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
