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

  // Middleware to require Administrador or Gestor role
  async function requireAdminOrGestor(req: express.Request, res: express.Response, next: express.NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('Authentication failed: missing or invalid authorization header');
      return res.status(401).json({ error: 'Acesso negado: Token de autenticação ausente ou inválido' });
    }

    const token = authHeader.substring(7);

    try {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !user) {
        console.warn('Authentication failed: invalid token or expired session', error);
        return res.status(401).json({ error: 'Acesso negado: Sessão inválida ou expirada' });
      }

      // Check metadata role first
      const metadataRole = user.user_metadata?.role;
      
      // Also query the profile from public.profiles database to make sure it's up-to-date and valid
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const role = profile?.role || metadataRole;

      if (role !== 'Administrador' && role !== 'Gestor') {
        console.warn(`User ${user.email} with role "${role}" tried to access admin route.`);
        return res.status(403).json({ error: 'Acesso negado: Apenas Administradores ou Gestores podem realizar esta ação' });
      }

      (req as any).user = user;
      (req as any).userRole = role;
      next();
    } catch (err: any) {
      console.error('Authentication middleware error:', err);
      return res.status(500).json({ error: 'Erro interno ao validar autenticação' });
    }
  }

  // API Route for creating users
  console.log('Registering POST /api/admin/create-user with security protection');
  app.post('/api/admin/create-user', requireAdminOrGestor, async (req, res) => {
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

  // API Route for forcing profile update (migration)
  app.post('/api/admin/force-profile-update', async (req, res) => {
    const { email, role, color, microarea } = req.body;
    const targetEmail = process.env.VITE_MIGRATION_EMAIL;
    
    if (!targetEmail) {
      return res.status(403).json({ error: 'Acesso negado: VITE_MIGRATION_EMAIL não configurado no servidor' });
    }
    
    if (!email || email.toLowerCase() !== targetEmail.toLowerCase()) {
      return res.status(403).json({ error: 'Acesso negado: e-mail de destino incorreto' });
    }

    // Validate Authorization header containing the Supabase user session token (JWT)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Acesso negado: token de login ausente' });
    }

    const token = authHeader.substring(7);

    try {
      // Validate token with Supabase Authenticator
      const { data: { user: authUser }, error: jwtVerifyError } = await supabaseAdmin.auth.getUser(token);
      if (jwtVerifyError || !authUser) {
        return res.status(401).json({ error: 'Acesso negado: sessão expirada ou inválida' });
      }

      if (authUser.email?.toLowerCase() !== targetEmail.toLowerCase()) {
        return res.status(403).json({ error: 'Acesso negado: seu usuário não tem permissão para esta ação' });
      }

      console.log('Forcing profile update for authenticated user:', email);
      
      // 1. Find the user ID by email
      const { data: profiles, error: findError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', email);

      if (findError || !profiles || profiles.length === 0) {
        throw new Error('Perfil não encontrado para este e-mail');
      }

      const userId = profiles[0].id;

      // Use env variables or request body parameter or default values
      const targetRole = role || process.env.MIGRATION_ROLE || 'Agente';
      const targetColor = color || '#64748b'; // Default gray
      const targetMicroarea = microarea !== undefined ? microarea : (process.env.MIGRATION_MICROAREA || '3');

      // 2. Update the profile using admin client (bypasses RLS)
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          role: targetRole,
          color: targetColor,
          microarea: targetMicroarea
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      // 3. Update Auth Metadata as well
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: { 
          role: targetRole,
          color: targetColor,
          microarea: targetMicroarea
        }
      });

      if (authError) console.warn('Auth metadata update failed, but profile was updated:', authError);

      res.status(200).json({ success: true, message: 'Perfil atualizado com sucesso via Admin' });
    } catch (error: any) {
      console.error('Migration error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Route for deleting users with security protection
  app.delete('/api/admin/delete-user/:id', requireAdminOrGestor, async (req, res) => {
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

  // API Route to ensure a profile exists for an authenticated user
  app.post('/api/profile/ensure', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Acesso negado: Token de autenticação ausente' });
    }

    const token = authHeader.substring(7);

    try {
      // 1. Verify user's session with Supabase using supabaseAdmin.auth.getUser
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !user) {
        return res.status(401).json({ error: 'Acesso negado: Sessão inválida ou expirada' });
      }

      // 2. Check if profile exists
      const { data: profile, error: profileFetchError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        // Profile already exists, return it!
        return res.status(200).json({ profile });
      }

      // 3. Profile does not exist, let's create it with sensible defaults!
      const name = user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário';
      const email = user.email || '';
      const microarea = user.user_metadata?.microarea || '001';
      const role = user.user_metadata?.role || 'Agente';
      const color = user.user_metadata?.color || '#00488d';

      console.log(`Auto-creating missing profile for user ${user.id} (${email}) with role ${role}, microarea ${microarea}`);

      const { data: newProfile, error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: user.id,
          name,
          email,
          microarea,
          role,
          color,
          last_login: new Date().toISOString()
        })
        .select('*')
        .single();

      if (insertError) {
        console.error('Failed to auto-create profile:', insertError);
        throw insertError;
      }

      return res.status(200).json({ profile: newProfile });
    } catch (err: any) {
      console.error('Error in /api/profile/ensure:', err);
      return res.status(500).json({ error: 'Erro ao garantir existência de perfil', details: err.message });
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
      appType: 'custom',
    });
    app.use(vite.middlewares);

    // Explicit SPA routing fallback for development
    app.get('*', async (req, res, next) => {
      const url = req.originalUrl;
      const cleanPath = req.path;
      // Skip API requests and static resource/file requests
      // A resource is considered static if it has an extension and does not end with .html
      const isStaticAsset = path.extname(cleanPath) !== '' && !cleanPath.endsWith('.html');
      if (cleanPath.startsWith('/api') || isStaticAsset) {
        return next();
      }
      try {
        const fs = await import('fs');
        let template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);

        // Inject dynamic runtime properties in <head>
        const envScript = `
          <script>
            window.__SUPABASE_CONFIG__ = {
              VITE_SUPABASE_URL: ${JSON.stringify(process.env.VITE_SUPABASE_URL || '')},
              VITE_SUPABASE_ANON_KEY: ${JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || '')},
              VITE_ADMIN_EMAILS: ${JSON.stringify(process.env.VITE_ADMIN_EMAILS || '')}
            };
          </script>
        `;
        template = template.replace('<head>', `<head>${envScript}`);

        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { index: false }));
    app.get('*', async (req, res, next) => {
      const url = req.originalUrl;
      const cleanPath = req.path;
      // Skip API requests and static resource/file requests
      // A resource is considered static if it has an extension and does not end with .html
      const isStaticAsset = path.extname(cleanPath) !== '' && !cleanPath.endsWith('.html');
      if (cleanPath.startsWith('/api') || isStaticAsset) {
        return next();
      }
      try {
        const fs = await import('fs');
        let template = fs.readFileSync(path.join(distPath, 'index.html'), 'utf-8');

        // Inject dynamic runtime properties in <head>
        const envScript = `
          <script>
            window.__SUPABASE_CONFIG__ = {
              VITE_SUPABASE_URL: ${JSON.stringify(process.env.VITE_SUPABASE_URL || '')},
              VITE_SUPABASE_ANON_KEY: ${JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || '')},
              VITE_ADMIN_EMAILS: ${JSON.stringify(process.env.VITE_ADMIN_EMAILS || '')}
            };
          </script>
        `;
        template = template.replace('<head>', `<head>${envScript}`);

        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
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
