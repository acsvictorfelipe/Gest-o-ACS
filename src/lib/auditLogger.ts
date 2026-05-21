import { supabase } from './supabase';

/**
 * Logs a user activity/action into the system_logs table for audit purposes.
 * @param userId UUID of the user performing the action
 * @param action Description of the action (e.g. 'Cadastro de Paciente', 'Exclusão de Domicílio')
 * @param details JSON or text details of the action for deeper inspection
 */
export async function logActivity(userId: string, action: string, details?: string) {
  if (!userId) return;
  try {
    const { error } = await supabase.from('system_logs').insert({
      user_id: userId,
      action,
      details: details || null
    });
    if (error) {
      console.warn('System logging policy or connection error:', error.message);
    }
  } catch (err) {
    console.error('System log execution failure:', err);
  }
}
