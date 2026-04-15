import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  console.log('Starting server...');
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Request logging middleware
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // Health check route
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      config: {
        hasSupabaseUrl: !!process.env.VITE_SUPABASE_URL,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    });
  });

  // Supabase Admin Client
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('CRITICAL: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.');
  }

  const supabaseAdmin = createClient(
    supabaseUrl || 'https://placeholder.supabase.co', 
    supabaseServiceKey || 'placeholder-key', 
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  // Auth middleware to verify JWT and Admin Role
  const adminAuthMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticação não fornecido' });
    }

    const token = authHeader.split(' ')[1];

    try {
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      
      if (authError || !user) {
        return res.status(401).json({ error: 'Token inválido ou expirado' });
      }

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || profile.role !== 'Administrador') {
        return res.status(403).json({ error: 'Acesso negado: Requer privilégios de Administrador' });
      }

      next();
    } catch (err) {
      console.error('Auth middleware error:', err);
      res.status(500).json({ error: 'Erro ao validar autenticação' });
    }
  };

  // API Route for creating users
  console.log('Registering POST /api/admin/create-user');
  app.post('/api/admin/create-user', adminAuthMiddleware, async (req, res) => {
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
      const errorMessage = error.message || error.error_description || 'Erro desconhecido ao criar usuário';
      res.status(500).json({ error: errorMessage });
    }
  });
  // API Route for deleting users
  app.delete('/api/admin/delete-user/:id', adminAuthMiddleware, async (req, res) => {
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

  // Catch-all for /api routes to prevent SPA fallback
  app.all('/api/*', (req, res) => {
    console.warn(`404 - API route not found: ${req.method} ${req.url}`);
    res.status(404).json({ error: `Rota de API não encontrada: ${req.method} ${req.url}` });
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

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ 
      error: 'Erro interno no servidor', 
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
