import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'DELETE' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({
      error: 'Configuração ausente: SUPABASE_SERVICE_ROLE_KEY não encontrada. Adicione-a nas variáveis de ambiente da hospedagem (ex: Vercel).'
    });
  }

  const id = req.query?.id || req.body?.id || (req.url ? req.url.split('/').pop()?.split('?')[0] : null);
  if (!id) {
    return res.status(400).json({ error: 'ID do usuário ausente' });
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
      return res.status(403).json({ error: 'Acesso negado: Apenas Administradores ou Gestores podem realizar esta ação' });
    }

    const { error: rpcError } = await supabaseAdmin.rpc('delete_user_cascade', { target_user_id: id });
    if (rpcError) {
      await supabaseAdmin.from('visits').delete().eq('agent_id', id);
      await supabaseAdmin.from('patients').delete().eq('agent_id', id);
      await supabaseAdmin.from('households').delete().eq('agent_id', id);
      await supabaseAdmin.from('profiles').delete().eq('id', id);
    }

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (authError) {
      throw new Error(`Erro ao excluir conta de acesso: ${authError.message}`);
    }

    return res.status(200).json({ message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Error in delete user:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
