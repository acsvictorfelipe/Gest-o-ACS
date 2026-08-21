import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({
      error: 'Configuração ausente: VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.'
    });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acesso negado: Token de autenticação ausente' });
  }

  const token = authHeader.substring(7);

  try {
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Acesso negado: Sessão inválida ou expirada' });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (profile) {
      return res.status(200).json({ profile });
    }

    const name = user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário';
    const email = user.email || '';
    const microarea = user.user_metadata?.microarea || '001';
    const role = 'Agente';
    const color = user.user_metadata?.color || '#00488d';

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
      throw insertError;
    }

    return res.status(200).json({ profile: newProfile });
  } catch (err: any) {
    console.error('Error in /api/profile/ensure:', err);
    return res.status(500).json({ error: 'Erro ao garantir existência de perfil' });
  }
}
