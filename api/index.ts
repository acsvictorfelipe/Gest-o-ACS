import { createClient } from '@supabase/supabase-js';
import { VercelRequest, VercelResponse } from '@vercel/node';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(
  supabaseUrl || '', 
  supabaseServiceKey || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, url } = req;
  console.log(`${new Date().toISOString()} - ${method} ${url}`);

  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // 1. CREATE USER
    if (method === 'POST' && url?.includes('/api/admin/create-user')) {
      const { email, password, name, role, color, microarea } = req.body;
      if (!email || !password || !name || !role) {
        return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
      }

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role, color, microarea }
      });

      if (error) throw error;

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
        if (profileError) console.error('Erro ao criar perfil:', profileError);
      }

      return res.status(200).json({ user: data.user });
    }

    // 2. DELETE USER
    if (method === 'DELETE' && url?.includes('/api/admin/delete-user/')) {
      const id = url.split('/').pop();
      if (!id) return res.status(400).json({ error: 'ID não fornecido' });

      // Deletar dados dependentes
      await supabaseAdmin.from('visits').delete().eq('agent_id', id);
      await supabaseAdmin.from('patients').delete().eq('agent_id', id);
      await supabaseAdmin.from('households').delete().eq('agent_id', id);
      await supabaseAdmin.from('profiles').delete().eq('id', id);
      
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
      if (authError) throw authError;

      return res.status(200).json({ message: 'Usuário excluído com sucesso' });
    }

    // 3. FORCE PROFILE UPDATE
    if (method === 'POST' && url?.includes('/api/admin/force-profile-update')) {
      const { email } = req.body;
      if (email !== 'acsvictorfelipe@gmail.com') {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      const { data: profiles } = await supabaseAdmin.from('profiles').select('id').eq('email', email);
      if (!profiles || profiles.length === 0) throw new Error('Perfil não encontrado');

      const userId = profiles[0].id;
      await supabaseAdmin.from('profiles').update({ role: 'Agente', color: '#64748b', microarea: '3' }).eq('id', userId);
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: { role: 'Agente', color: '#64748b', microarea: '3' }
      });

      return res.status(200).json({ success: true });
    }

    return res.status(404).json({ error: 'Rota não encontrada' });

  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message || 'Erro interno no servidor' });
  }
}
