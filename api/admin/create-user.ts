import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({
      error: 'Configuração ausente: VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas nas variáveis de ambiente da hospedagem (ex: Vercel).'
    });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acesso negado: Token de autenticação ausente ou inválido' });
  }

  const token = authHeader.substring(7);

  try {
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return res.status(401).json({ error: 'Acesso negado: Sessão inválida ou expirada' });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const role = profile?.role;
    if (!role || (role !== 'Administrador' && role !== 'Gestor')) {
      return res.status(403).json({ error: 'Acesso negado: Apenas Administradores ou Gestores podem cadastrar novos usuários' });
    }

    const { email, password, name, role: newRole, color, microarea } = req.body || {};
    const allowedRoles = ['Agente', 'Gestor', 'Administrador'];

    if (!email || !password || !name || !newRole) {
      return res.status(400).json({ error: 'Campos obrigatórios ausentes: email, senha, nome e papel' });
    }

    if (!allowedRoles.includes(newRole)) {
      return res.status(400).json({ error: 'Papel de usuário inválido' });
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role: newRole,
        color,
        microarea
      }
    });

    if (error) throw error;

    if (data.user) {
      const { error: pErr } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: data.user.id,
          name,
          role: newRole,
          color,
          microarea,
          email
        });
      
      if (pErr) console.error('Profile upsert error:', pErr);
    }

    return res.status(200).json({ user: data.user });
  } catch (error: any) {
    console.error('Error creating user:', error);
    const errorMessage = error.message || error.error_description || 'Erro desconhecido ao criar usuário';
    return res.status(500).json({ error: errorMessage });
  }
}
