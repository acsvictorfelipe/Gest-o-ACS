import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const currentDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

async function startServer() {
  console.log('Starting server...');
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Set explicit JSON body limit to protect against oversized payload attacks
  app.use(express.json({ limit: '2mb' }));

  // Request logging middleware - sanitized (no request body, PII, or tokens logged)
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
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
  // Strictly authorizes based on validated public.profiles role (user_metadata is ignored)
  async function requireAdminOrGestor(req: express.Request, res: express.Response, next: express.NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Acesso negado: Token de autenticação ausente ou inválido' });
    }

    const token = authHeader.substring(7);

    try {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !user) {
        return res.status(401).json({ error: 'Acesso negado: Sessão inválida ou expirada' });
      }

      // Query the profile directly from public.profiles table
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const role = profile?.role;

      if (!role || (role !== 'Administrador' && role !== 'Gestor')) {
        console.warn(`Access denied: User ID ${user.id} with role "${role || 'none'}" attempted admin action.`);
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

  // API Route for creating users with strict input validation and server-defined role
  console.log('Registering POST /api/admin/create-user with security protection');
  app.post('/api/admin/create-user', requireAdminOrGestor, async (req, res) => {
    const { email, password, name, role, color, microarea } = req.body;

    const allowedRoles = ['Agente', 'Gestor', 'Administrador'];

    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'Campos obrigatórios ausentes: email, senha, nome e papel' });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'Papel de usuário inválido' });
    }

    try {
      // Create user in Supabase Auth
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

      // Ensure profile is created/updated in profiles table
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

  // API Route for deleting users transactionally
  app.delete('/api/admin/delete-user/:id', requireAdminOrGestor, async (req, res) => {
    const { id } = req.params;
    
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ 
        error: 'Configuração ausente: SUPABASE_SERVICE_ROLE_KEY não encontrada. Por favor, adicione-a em Settings > Secrets.' 
      });
    }

    try {
      // 1. Perform transactional database cleanup via RPC if available, or sequential delete
      const { error: rpcError } = await supabaseAdmin.rpc('delete_user_cascade', { target_user_id: id });

      if (rpcError) {
        // Fallback to explicit sequential deletion if RPC function is not yet created in remote DB
        console.warn('RPC delete_user_cascade unavailable, executing sequential fallback deletion:', rpcError.message);
        await supabaseAdmin.from('visits').delete().eq('agent_id', id);
        await supabaseAdmin.from('patients').delete().eq('agent_id', id);
        await supabaseAdmin.from('households').delete().eq('agent_id', id);
        const { error: pErr } = await supabaseAdmin.from('profiles').delete().eq('id', id);
        if (pErr) throw new Error(`Erro ao excluir perfil: ${pErr.message}`);
      }

      // 2. Delete user account from Supabase Auth
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
      
      if (authError) {
        console.error('Error deleting Auth user:', authError);
        throw new Error(`Erro ao excluir conta de acesso: ${authError.message}`);
      }
      
      res.status(200).json({ message: 'User deleted successfully' });
    } catch (error: any) {
      console.error('Error in delete-user endpoint:', error);
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  });

  // API Route for transferring patients and households
  app.post('/api/admin/transfer-patients', requireAdminOrGestor, async (req, res) => {
    const { 
      fromAgentId, 
      toAgentId, 
      targetHouseholdIds = [], 
      targetPatientIds = [] 
    } = req.body || {};

    if (!fromAgentId || !toAgentId) {
      return res.status(400).json({ error: 'Agente de origem e agente de destino são obrigatórios.' });
    }

    if (fromAgentId === toAgentId) {
      return res.status(400).json({ error: 'O agente de origem e destino devem ser diferentes.' });
    }

    try {
      const { data: targetAgent, error: targetErr } = await supabaseAdmin
        .from('profiles')
        .select('id, name, color, microarea')
        .eq('id', toAgentId)
        .maybeSingle();

      if (targetErr || !targetAgent) {
        return res.status(404).json({ error: 'Agente de destino não encontrado no banco de dados.' });
      }

      const { data: sourceAgent } = await supabaseAdmin
        .from('profiles')
        .select('id, name')
        .eq('id', fromAgentId)
        .maybeSingle();

      const chunkArray = <T>(arr: T[], size: number): T[][] => {
        const chunks: T[][] = [];
        for (let i = 0; i < arr.length; i += size) {
          chunks.push(arr.slice(i, i + size));
        }
        return chunks;
      };

      // 1. Update households
      if (targetHouseholdIds.length > 0) {
        const householdChunks = chunkArray(targetHouseholdIds, 100);
        for (const chunk of householdChunks) {
          const { error: hErr } = await supabaseAdmin
            .from('households')
            .update({
              agent_id: toAgentId,
              area_color: targetAgent.color,
              microarea: targetAgent.microarea
            })
            .in('id', chunk);

          if (hErr) {
            throw new Error(`Erro ao atualizar domicílios: ${hErr.message}`);
          }
        }
      }

      // 2. Update patients
      if (targetPatientIds.length > 0) {
        const patientChunks = chunkArray(targetPatientIds, 100);
        for (const chunk of patientChunks) {
          const { error: pErr } = await supabaseAdmin
            .from('patients')
            .update({
              agent_id: toAgentId,
              area_color: targetAgent.color,
              microarea: targetAgent.microarea
            })
            .in('id', chunk);

          if (pErr) {
            throw new Error(`Erro ao atualizar pacientes: ${pErr.message}`);
          }
        }

        // 3. Update visits
        for (const chunk of patientChunks) {
          const { error: vErr } = await supabaseAdmin
            .from('visits')
            .update({
              area_color: targetAgent.color,
              microarea: targetAgent.microarea
            })
            .in('patient_id', chunk);

          if (vErr) {
            console.warn('Warning updating visits for transferred patients:', vErr.message);
          }
        }
      }

      // 4. Log the activity
      const sourceName = sourceAgent?.name || 'Agente';
      const targetName = targetAgent.name || 'Agente';
      const authUser = (req as any).user;
      if (authUser?.id) {
        await supabaseAdmin.from('system_logs').insert({
          user_id: authUser.id,
          action: 'Redistribuição de Microárea',
          details: `Transferiu ${targetHouseholdIds.length} domicílios e ${targetPatientIds.length} cidadãos do ACS ${sourceName} para o ACS ${targetName}.`
        });
      }

      return res.status(200).json({
        success: true,
        transferredHouseholds: targetHouseholdIds.length,
        transferredPatients: targetPatientIds.length,
        targetAgentName: targetName
      });
    } catch (error: any) {
      console.error('Error in transfer-patients route:', error);
      return res.status(500).json({ error: error.message || 'Erro ao realizar transferência' });
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
        return res.status(200).json({ profile });
      }

      // 3. Auto-create profile with safe server-enforced minimal privileges
      const name = user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário';
      const email = user.email || '';
      const microarea = user.user_metadata?.microarea || '001';
      const role = 'Agente'; // Always enforce minimal privilege 'Agente' on auto-creation
      const color = user.user_metadata?.color || '#00488d';

      console.log(`Auto-creating missing profile for user ID ${user.id} with minimal role 'Agente'`);

      const { data: newProfile, error: insertError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: user.id,
          name,
          email,
          microarea,
          role,
          color,
          last_login: new Date().toISOString()
        })
        .select('*')
        .maybeSingle();

      if (insertError) {
        console.error('Failed to auto-create profile:', insertError);
        throw insertError;
      }

      return res.status(200).json({ profile: newProfile });
    } catch (err: any) {
      console.error('Error in /api/profile/ensure:', err);
      return res.status(500).json({ error: 'Erro ao garantir existência de perfil' });
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
      message: process.env.NODE_ENV === 'development' ? err.message : 'Ocorreu um erro interno no servidor.'
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
