import { supabase } from './supabase';
import { syncService } from './syncService';
import { logActivity } from './auditLogger';

export interface TransferParams {
  fromAgentId: string;
  toAgentId: string;
  targetHouseholdIds?: string[];
  targetPatientIds?: string[];
  callerUserId?: string;
}

export interface TransferResult {
  success: boolean;
  transferredHouseholds: number;
  transferredPatients: number;
  targetAgentName: string;
  error?: string;
}

const chunkArray = <T>(arr: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

/**
 * Transfers patients and/or households from one ACS to another.
 * Tries server-side API first, falls back to direct client execution or offline queue if needed.
 */
export async function executeTransfer(params: TransferParams): Promise<TransferResult> {
  const {
    fromAgentId,
    toAgentId,
    targetHouseholdIds = [],
    targetPatientIds = [],
    callerUserId
  } = params;

  if (!fromAgentId || !toAgentId) {
    throw new Error('Agente de origem e agente de destino são obrigatórios.');
  }

  if (fromAgentId === toAgentId) {
    throw new Error('O agente de origem e destino devem ser diferentes.');
  }

  if (targetHouseholdIds.length === 0 && targetPatientIds.length === 0) {
    throw new Error('Nenhum paciente ou domicílio selecionado para a transferência.');
  }

  // 1. Try Backend API endpoint
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch('/api/transfer-patients', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fromAgentId,
        toAgentId,
        targetHouseholdIds,
        targetPatientIds
      })
    });

    if (response.ok) {
      const apiData = await response.json();
      return {
        success: true,
        transferredHouseholds: apiData.transferredHouseholds ?? targetHouseholdIds.length,
        transferredPatients: apiData.transferredPatients ?? targetPatientIds.length,
        targetAgentName: apiData.targetAgentName || 'Agente de Destino'
      };
    } else {
      const errData = await response.json().catch(() => ({}));
      console.warn('Backend transfer failed with status', response.status, errData);
      // If unauthorized due to route or session, proceed to client-side fallback
    }
  } catch (apiErr) {
    console.warn('Backend transfer route network error, attempting client-side fallback:', apiErr);
  }

  // 2. Fetch destination agent details for fallback execution
  const { data: targetAgent, error: targetErr } = await supabase
    .from('profiles')
    .select('id, name, color, microarea')
    .eq('id', toAgentId)
    .maybeSingle();

  if (targetErr || !targetAgent) {
    throw new Error('Agente de destino não encontrado no banco de dados.');
  }

  const { data: sourceAgent } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('id', fromAgentId)
    .maybeSingle();

  // If offline, queue changes via syncService
  if (!navigator.onLine) {
    for (const hId of targetHouseholdIds) {
      await syncService.addToQueue('households', 'UPDATE', {
        id: hId,
        agent_id: toAgentId,
        area_color: targetAgent.color,
        microarea: targetAgent.microarea
      });
    }

    for (const pId of targetPatientIds) {
      await syncService.addToQueue('patients', 'UPDATE', {
        id: pId,
        agent_id: toAgentId,
        area_color: targetAgent.color,
        microarea: targetAgent.microarea
      });
    }

    return {
      success: true,
      transferredHouseholds: targetHouseholdIds.length,
      transferredPatients: targetPatientIds.length,
      targetAgentName: targetAgent.name
    };
  }

  // Direct client-side updates (chunked)
  // A. Update households
  if (targetHouseholdIds.length > 0) {
    const householdChunks = chunkArray(targetHouseholdIds, 100);
    for (const chunk of householdChunks) {
      const { error: hError } = await supabase
        .from('households')
        .update({
          agent_id: toAgentId,
          area_color: targetAgent.color,
          microarea: targetAgent.microarea
        })
        .in('id', chunk);

      if (hError) throw new Error(`Falha ao atualizar domicílios: ${hError.message}`);
    }
  }

  // B. Update patients
  if (targetPatientIds.length > 0) {
    const patientChunks = chunkArray(targetPatientIds, 100);
    for (const chunk of patientChunks) {
      const { error: pError } = await supabase
        .from('patients')
        .update({
          agent_id: toAgentId,
          area_color: targetAgent.color,
          microarea: targetAgent.microarea
        })
        .in('id', chunk);

      if (pError) throw new Error(`Falha ao atualizar pacientes: ${pError.message}`);

      // C. Update visits
      await supabase
        .from('visits')
        .update({
          agent_id: toAgentId,
          area_color: targetAgent.color,
          microarea: targetAgent.microarea
        })
        .in('patient_id', chunk);
    }
  }

  // D. Log audit trail
  const sourceName = sourceAgent?.name || 'Agente';
  const targetName = targetAgent.name || 'Agente';
  const logUserId = callerUserId || fromAgentId;

  if (logUserId) {
    let logDetail = '';
    if (targetHouseholdIds.length > 0 && targetPatientIds.length > 0) {
      logDetail = `Transferiu ${targetHouseholdIds.length} domicílio(s) e ${targetPatientIds.length} cidadão(s) do ACS ${sourceName} para o ACS ${targetName}.`;
    } else if (targetPatientIds.length > 0) {
      logDetail = `Transferiu ${targetPatientIds.length} cidadão(s) do ACS ${sourceName} para o ACS ${targetName}.`;
    } else {
      logDetail = `Transferiu ${targetHouseholdIds.length} domicílio(s) do ACS ${sourceName} para o ACS ${targetName}.`;
    }

    try {
      await logActivity(logUserId, 'Transferência de Pacientes/Microárea', logDetail);
    } catch (e) {
      console.warn('Could not log transfer activity:', e);
    }
  }

  return {
    success: true,
    transferredHouseholds: targetHouseholdIds.length,
    transferredPatients: targetPatientIds.length,
    targetAgentName: targetName
  };
}
