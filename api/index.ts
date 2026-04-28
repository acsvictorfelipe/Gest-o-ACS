import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Tipos flexíveis para evitar erros no IDE local quando @vercel/node não está instalado
type VercelRequest = any;
type VercelResponse = any;

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
  const { method } = req;
  // No Vercel, o path pode vir de diferentes formas dependendo do rewrite
  const url = req.url || '';
  
  console.log(`[API] ${method} ${url}`);

  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('ERRO: Variáveis de ambiente do Supabase não configuradas no Vercel.');
      return res.status(500).json({ 
        error: 'Configuração do servidor incompleta (URL ou Service Key ausentes).' 
      });
    }

    // 1. CREATE USER
    if (method === 'POST' && url.includes('create-user')) {
      const { email, password, name, role, color, microarea } = req.body;
      console.log(`[API] Tentando criar usuário: ${email}`);

      if (!email || !password || !name || !role) {
        return res.status(400).json({ error: 'Campos obrigatórios ausentes: e-mail, senha, nome e cargo são necessários.' });
      }

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role, color, microarea }
      });

      if (error) {
        console.error('[API] Erro Supabase Auth:', error.message);
        return res.status(400).json({ error: `Erro no Supabase: ${error.message}` });
      }

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
        if (profileError) console.error('[API] Erro ao criar perfil:', profileError);
      }

      return res.status(200).json({ user: data.user });
    }

    // 2. DELETE USER
    if (method === 'DELETE' && url.includes('delete-user')) {
      const id = url.split('/').pop();
      console.log(`[API] Tentando excluir usuário ID: ${id}`);

      if (!id || id === 'delete-user') {
        return res.status(400).json({ error: 'ID do usuário não fornecido ou inválido na URL.' });
      }

      // Deletar dados dependentes primeiro
      await supabaseAdmin.from('visits').delete().eq('agent_id', id);
      await supabaseAdmin.from('patients').delete().eq('agent_id', id);
      await supabaseAdmin.from('households').delete().eq('agent_id', id);
      await supabaseAdmin.from('profiles').delete().eq('id', id);
      
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
      if (authError) {
        console.error('[API] Erro ao excluir Auth:', authError.message);
        return res.status(400).json({ error: authError.message });
      }

      return res.status(200).json({ message: 'Usuário e dados vinculados excluídos com sucesso.' });
    }

    // 3. FORCE PROFILE UPDATE (Apenas para o administrador principal)
    if (method === 'POST' && url.includes('force-profile-update')) {
      const { email } = req.body;
      const adminEmail = 'victorfelipe2012@gmail.com';
      
      if (email !== adminEmail) {
        return res.status(403).json({ error: 'Acesso negado: apenas o administrador principal pode forçar atualizações.' });
      }

      const { data: profiles } = await supabaseAdmin.from('profiles').select('id').eq('email', email);
      if (!profiles || profiles.length === 0) {
        return res.status(404).json({ error: 'Perfil não encontrado para o e-mail fornecido.' });
      }

      const userId = profiles[0].id;
      await supabaseAdmin.from('profiles').update({ role: 'Administrador' }).eq('id', userId);
      
      return res.status(200).json({ success: true, message: 'Perfil promovido a Administrador com sucesso.' });
    }

    return res.status(404).json({ error: `Rota não encontrada: ${method} ${url}` });

  } catch (error: any) {
    console.error('[API] Erro Crítico:', error);
    return res.status(500).json({ error: error.message || 'Erro interno no servidor.' });
  }
}
