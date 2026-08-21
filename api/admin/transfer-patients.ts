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
      error: 'Configuração ausente: VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas.'
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
      return res.status(403).json({ error: 'Acesso negado: Apenas Administradores ou Gestores podem realizar transferências' });
    }

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

    if ((!targetHouseholdIds || targetHouseholdIds.length === 0) && (!targetPatientIds || targetPatientIds.length === 0)) {
      return res.status(400).json({ error: 'Nenhum domicílio ou cidadão foi selecionado para a transferência.' });
    }

    // Fetch target agent details to copy color and microarea
    const { data: targetAgent, error: targetErr } = await supabaseAdmin
      .from('profiles')
      .select('id, name, color, microarea')
      .eq('id', toAgentId)
      .maybeSingle();

    if (targetErr || !targetAgent) {
      return res.status(404).json({ error: 'Agente de destino não encontrado no banco de dados.' });
    }

    // Fetch source agent details for activity log
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

    // 1. Update households in chunks
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

    // 2. Update patients in chunks
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

      // 3. Update visits under those patients
      for (const chunk of patientChunks) {
        const { error: vErr } = await supabaseAdmin
          .from('visits')
          .update({
            agent_id: toAgentId,
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
    let logDetail = '';
    if (targetHouseholdIds.length > 0 && targetPatientIds.length > 0) {
      logDetail = `Transferiu ${targetHouseholdIds.length} domicílios e ${targetPatientIds.length} cidadãos do ACS ${sourceName} para o ACS ${targetName}.`;
    } else if (targetPatientIds.length > 0) {
      logDetail = `Transferiu ${targetPatientIds.length} cidadão(s) do ACS ${sourceName} para o ACS ${targetName}.`;
    } else {
      logDetail = `Transferiu ${targetHouseholdIds.length} domicílio(s) do ACS ${sourceName} para o ACS ${targetName}.`;
    }

    await supabaseAdmin.from('system_logs').insert({
      user_id: user.id,
      action: 'Redistribuição de Microárea',
      details: logDetail
    });

    return res.status(200).json({
      success: true,
      transferredHouseholds: targetHouseholdIds.length,
      transferredPatients: targetPatientIds.length,
      targetAgentName: targetName
    });
  } catch (error: any) {
    console.error('Error in /api/admin/transfer-patients:', error);
    return res.status(500).json({ error: error.message || 'Erro ao realizar transferência de pacientes' });
  }
}
